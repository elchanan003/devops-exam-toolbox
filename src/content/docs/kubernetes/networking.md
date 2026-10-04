---
title: Networking — DNS, Ingress, TLS, NetworkPolicy
description: איך Pods מוצאים זה את זה, איך ניגשים מבחוץ עם curl --resolve ל-NodePort, ואיך כותבים NetworkPolicy ובודקים אותה.
sidebar:
  order: 3
---

:::note[בקצרה]
בתוך ה-cluster הכתובת של שירות היא **שם ה-Service** (DNS). מבחוץ הדרך היא **Ingress** דרך controller (`ingress-nginx`) שנחשף ב-NodePort על ה-VM.
שני חיצים שונים: client → Service לפי **שם**, Service → Pods לפי **selector**. הדף מכסה DNS, בדיקת Ingress + TLS, `curl --resolve`, ו-NetworkPolicy עם ההסתייגות על ה-CNI.
:::

## Service DNS: שם קצר מול FQDN

| מאיפה פונים | כתובת | דוגמה |
|---|---|---|
| אותו namespace | שם ה-Service | `redis`, `postgres:5432` |
| namespace אחר | `<SERVICE>.<NS>.svc.cluster.local` | `redis.trident-dev.svc.cluster.local` |

:::caution[מלכודת · קרה בתרגול]
שם קצר עובד **רק באותו namespace**. פנייה ממרחב אחר (למשל מ-`trident-observability` אל `trident-dev`) דורשת FQDN מלא. באותו namespace מספיק `REDIS_HOST: "redis"`; בין namespaces: `redis.trident-dev.svc.cluster.local`.
:::

```bash title="runs on: VM"
kubectl -n <NS> exec deploy/<SERVICE> -- python -c "import socket; print(socket.gethostbyname('redis'))"
kubectl -n <NS> exec deploy/<SERVICE> -- python -c "import socket; print(socket.gethostbyname('redis.<NS>.svc.cluster.local'))"
```

**איך מוודאים:** שתי הפקודות מדפיסות את אותה כתובת (`ClusterIP` של ה-Service). `gaierror` = השם לא קיים או שגוי.

### Service → Pods: למה אין endpoints

```bash title="runs on: VM"
kubectl -n <NS> get svc <SERVICE> -o jsonpath='{.spec.selector}{"\n"}'
kubectl -n <NS> get endpointslices -l kubernetes.io/service-name=<SERVICE>
kubectl -n <NS> get pods -l trident.dev/service=<SERVICE> --show-labels
```

**איך מוודאים:** ב-`endpointslices` העמודה `ENDPOINTS` מכילה כתובות Pod. ריקה = ה-selector של ה-Service לא תואם ל-labels של ה-Pods, או שה-Pods לא Ready ([probes](../storage-probes/#probes-live-ready-startup)). השוואה: `extraSelectorLabels` ב-Deployment מול ב-Service ([values](../../helm/values/#services)).

## Ingress ו-TLS

```bash title="runs on: VM"
kubectl -n <NS> get ingress
kubectl -n <NS> describe ingress <SERVICE>
kubectl get ingressclass
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.type}{"\n"}'   # the TLS Secret named in the Ingress
```

חמש נקודות לבדוק כש-Ingress לא עובד (404, תעודה שגויה, אין תגובה):

1. `ingressClassName: nginx` — מתאים ל-`get ingressclass`.
2. ה-host בכלל (rule) **ובתוך** `tls.hosts` — אותו ערך. ([values](../../helm/values/#ingresses-ה-hostname-מופיע-פעמיים))
3. `serviceName` ו-`servicePort` של ה-backend קיימים ב-namespace.
4. ה-Secret מסוג `kubernetes.io/tls` קיים **ב-namespace של ה-Ingress** ([secrets](../secrets/#tls-תעודה-ומפתח)).
5. ה-header `Host` בבקשה תואם ל-host. בלי זה controller מחזיר 404 משלו.

## `curl --resolve` אל ה-NodePort

ה-controller חשוף ב-NodePort על ה-VM. את המספר מגלים, לא מנחשים — הוא משתנה בין cluster-ים.

```bash title="runs on: VM"
kubectl -n ingress-nginx get svc
# PORT(S) column looks like 80:30593/TCP,443:31731/TCP -> <PORT> is the number after "443:"
```

```bash title="runs on: VM"
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info
# TRIDENT (port differs per cluster): curl -k --resolve dev.trident.test:31731:192.168.242.130 https://dev.trident.test:31731/info
```

- `--resolve <HOST>:<PORT>:<VM_IP>` אומר ל-`curl`: "ל-host הזה בפורט הזה, השתמש בכתובת הזאת" — בלי לשנות `/etc/hosts`. ה-URL ו-ה-`Host` header נשארים `<HOST>`, אז ה-Ingress מתאים לכלל.
- `-k` מדלג על אימות התעודה (תעודה self-signed).

```bash title="runs on: VM"
curl --cacert <FILE> --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info
# TRIDENT: curl --cacert ~/.local/share/trident/tls/ca.crt --resolve dev.trident.test:31731:192.168.242.130 https://dev.trident.test:31731/info
```

עם `--cacert` מוודאים גם שהתעודה נחתמה על ידי ה-CA הנכון — בדיקה אמיתית יותר מ-`-k`.

**איך מוודאים:** JSON עם `service`, `version` (שווה ל-`<CANDIDATE>`) ו-`environment` (שווה ל-`<ENV>`). `Could not resolve host` = שכחת `--resolve`. 404 מ-nginx = ה-Host/הכלל לא תואמים. `Connection refused` = פורט שגוי.

### `/etc/hosts` לדפדפן

לדפדפן אין `--resolve`; מוסיפים שורה לקובץ המארח (במחשב שממנו גולשים):

```text title="file: /etc/hosts"
<VM_IP> <HOST>
```

הדפדפן עדיין צריך את ה-NodePort ב-URL: `https://<HOST>:<PORT>/`.

## NetworkPolicy: default-deny ו-allow

ב-Kubernetes ברירת המחדל שטוחה: כל Pod מדבר עם כל Pod. NetworkPolicy הופכת את זה ל-**allowlist**: קודם חוסמים הכול, ואז פותחים רק את מסלול הנתונים.
מסלול הנתונים ב-TRIDENT: simulator → ingest-api → redis ← signal-processor → postgres.

```yaml title="file: networkpolicies.yaml (ingress rules, one namespace)"
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: <NS>
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-redis-from-api-and-processor
  namespace: <NS>
spec:
  podSelector:
    matchLabels: {trident.dev/service: redis}
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: {trident.dev/service: ingest-api}
        - podSelector:
            matchLabels: {trident.dev/service: signal-processor}
      ports:
        - {protocol: TCP, port: 6379}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingest-api
  namespace: <NS>
spec:
  podSelector:
    matchLabels: {trident.dev/service: ingest-api}
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: {trident.dev/service: acoustic-simulator}
        - namespaceSelector:
            matchLabels: {kubernetes.io/metadata.name: ingress-nginx}
      ports:
        - {protocol: TCP, port: 8080}
```

- `podSelector: {}` בלי `ingress:` = בוחר את **כל** ה-Pods וחוסם כל כניסה אליהם.
- כל allow בוחר את Pod ה**יעד** ב-`podSelector` העליון, ואת המקור ב-`from`. כלל דומה נדרש גם ל-postgres (מ-`signal-processor`, פורט 5432).
- ה-`namespaceSelector` מאפשר לתעבורה מה-ingress controller להגיע ל-ingest-api. בלעדיו ה-Ingress נחסם.
- אם Prometheus מגרד את פורטי `ops`/`http` מ-namespace אחר — צריך allow גם לו (SHOULD, תלוי ב-contract).
- ב-values של ה-chart אותה מדיניות נכתבת תחת `networkPolicies` ([values](../../helm/values/#networkpolicies)).

```bash title="runs on: VM"
kubectl create --dry-run=client -f networkpolicies.yaml -o name   # syntax check, no cluster change
kubectl -n <NS> get networkpolicy
kubectl -n <NS> describe networkpolicy allow-redis-from-api-and-processor
```

**איך מוודאים:** `dry-run` מדפיס `networkpolicy.networking.k8s.io/...` לכל מדיניות. בדיקה חיה: מ-Pod **אסור** (למשל simulator → redis) החיבור נכשל ב-timeout, ומ-Pod **מותר** (ingest-api → redis) הוא מצליח.

```bash title="runs on: VM"
kubectl -n <NS> exec deploy/acoustic-simulator -- python -c "import socket; socket.create_connection(('redis', 6379), 3)"   # must fail
kubectl -n <NS> exec deploy/ingest-api -- python -c "import socket; socket.create_connection(('redis', 6379), 3); print('ok')"   # must print ok
```

### CNI: האם המדיניות נאכפת בכלל?

:::caution[מלכודת]
NetworkPolicy נאכפת על ידי ה-CNI. עם `flannel` בלבד ה-API **מקבל** את האובייקט אבל **לא אוכף** — כל הבדיקות "עוברות" והחסימה לא קיימת (false pass). ה-CNI שמאפשר אכיפה כאן הוא `canal`.
:::

```bash title="runs on: VM"
cat /etc/k8s-manager/cni                              # TRIDENT lab: prints canal
kubectl -n kube-system get pods | grep -E 'canal|flannel|calico'
```

**איך מוודאים:** `canal` (או calico). אם רק flannel — בדיקת ה"אסור" **חייבת** להיכשל; אם היא מצליחה, המדיניות לא נאכפת.
