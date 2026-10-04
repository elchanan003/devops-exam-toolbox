---
title: Observability — Prometheus ו-Grafana משותפים
description: Prometheus אחד ו-Grafana אחד שסורקים שלוש סביבות, label ה-namespace, Secret ה-admin, ingress, dashboard ב-kustomize ותקלות נפוצות.
sidebar:
  order: 1
---

:::note[בקצרה]
Prometheus אחד ו-Grafana אחד (ב-namespace נפרד) סורקים את ה-Pods של כל שלוש הסביבות. מה שמבדיל בין הסביבות הוא ה-label `namespace` על כל series.
ה-stack עולה כ-Application נפרד (`observability`) אחרי שה-dev/staging/prod כבר פועלים. עד שה-namespace וה-Secrets קיימים, האפליקציה הזו אדומה, וזה צפוי.
:::

## Prometheus: גילוי Pods ו-relabel ל-namespace

ה-Pods של האפליקציה חושפים פורט metrics אבל אין להם Service לפורט הזה, ולכן Prometheus מגלה אותם ישירות דרך ה-API (`role: pod`).

```yaml title="file: gitops/observability/prometheus/values.yaml (scrapeConfigs excerpt)"
scrapeConfigs:
  trident:
    enabled: true
    kubernetes_sd_configs:
      - role: pod
        namespaces: {names: [<NS>]}   # list every environment namespace
    relabel_configs:
      - {source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_part_of], regex: trident, action: keep}
      - {source_labels: [__meta_kubernetes_pod_container_port_name], regex: ops|http, action: keep}
      - {source_labels: [__meta_kubernetes_namespace], target_label: namespace}
      - {source_labels: [__meta_kubernetes_pod_label_trident_dev_service], target_label: service}
      - {source_labels: [__meta_kubernetes_pod_name], target_label: pod}
# TRIDENT: namespaces trident-dev, trident-staging, trident-prod
```

- שתי פעולות `keep`: רק Pods עם label `app.kubernetes.io/part-of=trident`, ורק container port ששמו `ops` או `http`. כל השאר נזרק.
- השורה `__meta_kubernetes_namespace → namespace` היא מה שמאפשר ל-dashboard לבחור סביבה. בלעדיה אין הבדל בין dev ל-prod.
- נקודות בשם label הופכות ל-`_` ב-`__meta_kubernetes_pod_label_*` (`trident.dev/service` הופך ל-`trident_dev_service`).
- גילוי דורש RBAC: `rbac: {create: true}` ו-`serviceAccounts: {server: {create: true}}` ב-values של ה-chart.

## לוודא שה-label קיים

```bash title="runs on: VM"
kubectl -n <NS> get svc                                   # find the Prometheus Service name
kubectl -n <NS> port-forward svc/prometheus 9090:9090
```

בטרמינל שני (או בדפדפן, `http://localhost:9090`, שאילתה `count by (namespace) (up)`):

```bash title="runs on: VM"
curl -s 'http://localhost:9090/api/v1/query' --data-urlencode 'query=count by (namespace) (up)'
```

**איך מוודאים:** `data.result` מכיל רשומה לכל `namespace` של סביבה, כל אחת עם ערך גדול מ-0. חסרה סביבה = היא לא נסרקת (label, פורט, RBAC או Pods לא רצים). ה-`<NS>` בפקודה הראשונה הוא ה-namespace של ה-stack (ב-TRIDENT: `trident-observability`).

אותו דבר ב-UI של Prometheus: `Status → Targets` (כל target ו-`State`), ו-Graph לשאילתה.

## Grafana: admin מ-Secret קיים

ה-chart לא יוצר סיסמה. הוא קורא Secret שה-bootstrap יוצר מראש (`prepare-observability.sh`: namespace + Secret ה-admin + Secret ה-TLS).

```yaml title="file: gitops/observability/grafana/values.yaml (excerpt)"
admin:
  existingSecret: <SECRET>
  userKey: admin-user
  passwordKey: admin-password
ingress:
  enabled: true
  ingressClassName: nginx
  path: /
  pathType: Prefix
  hosts: [<HOST>]
  tls: [{secretName: <SECRET>, hosts: [<HOST>]}]
# TRIDENT: admin Secret trident-grafana-admin; TLS Secret trident-tls; host grafana.trident.test
```

- ב-Secret ה-keys חייבים להיות בדיוק `userKey`/`passwordKey`. הערכים באים מקבצי `credentials/` מקומיים, לא מ-Git.
- ה-`<HOST>` מופיע פעמיים (`hosts` ו-`tls.hosts`): שנה את שניהם. הוסף אותו ל-`/etc/hosts` על `<VM_IP>`.
- ה-Secret של ה-TLS צריך להיות באותו namespace כמו ה-Ingress.
- ראה [kubernetes/networking](../../kubernetes/networking/) ו-[kubernetes/secrets](../../kubernetes/secrets/).

```bash title="runs on: VM"
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data.admin-user}' | base64 -d; echo
kubectl -n <NS> get ingress
```

**איך מוודאים:** שם המשתמש מודפס, וה-Ingress מציג את ה-`<HOST>`. הרצת ה-script היא [bash/templates](../../bash/templates/).

## `$${...}` ב-datasources שמוגדרים ב-values

Grafana ו-Helm כל אחד מפרש `${...}`. בתוך `datasources`, ערך כמו `${__value.raw}` שייך ל-Grafana (לא למשתנה סביבה), ולכן כותבים אותו כפול-דולר כדי שיישאר מילולי:

```yaml title="file: gitops/observability/grafana/values.yaml (excerpt)"
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        uid: prometheus
        type: prometheus
        access: proxy
        url: http://prometheus:9090
        isDefault: true
      - name: Loki
        uid: loki
        type: loki
        url: http://loki:3100
        jsonData:
          derivedFields:
            - {name: TraceID, datasourceUid: tempo, url: '$${__value.raw}'}
```

**איך מוודאים:** ב-Grafana, `Connections → Data sources → Prometheus → Save & test`. מופיע `Successful`. אם ה-URL של trace ריק, בדוק שה-`$$` לא נשאר `$`.

## dashboard דרך kustomize

תיקייה ב-`gitops` עם `kustomization.yaml` שהופך את ה-JSON ל-ConfigMap; ה-Application מוסיף אותה כ-source (path בלבד, בלי מפתח `kustomize:`), ו-Grafana טוען אותה:

```yaml title="file: gitops/observability/grafana/dashboards/kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: <NS>
configMapGenerator:
  - name: trident-naval-picture
    files: [<FILE>]
    options: {disableNameSuffixHash: true}
# TRIDENT: <FILE> = trident-naval-picture.json (the dashboard JSON next to this file)
```

שם ה-ConfigMap (כאן `trident-naval-picture`) חייב להיות זהה למה ש-values של Grafana מצביעים עליו:

```yaml title="file: gitops/observability/grafana/values.yaml (excerpt)"
dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - {name: TRIDENT, orgId: 1, folder: TRIDENT, type: file, options: {path: /var/lib/grafana/dashboards/trident}}
dashboardsConfigMaps:
  trident: trident-naval-picture
```

- `disableNameSuffixHash: true` חיוני: בלי זה שם ה-ConfigMap מקבל hash, וה-`dashboardsConfigMaps` לא ימצא אותו.
- ה-source של התיקייה הוא ב-`gitops` ולא ב-`templates`: ראה [המלכודת](../../argocd/applications/#kustomize-directory-source).

```bash title="runs on: any shell"
kubectl kustomize <FILE>
```

**איך מוודאים:** כאן `<FILE>` הוא נתיב **התיקייה** שמכילה `kustomization.yaml`. הפלט הוא ConfigMap בשם הנכון ועם ה-JSON בתוכו.

## תקלות נפוצות

| סימפטום | סיבה | בדיקה |
|---|---|---|
| ה-dashboard ריק או מערבב סביבות | relabel הוריד את `namespace`, או השורה חסרה | `count by (namespace) (up)` |
| אין targets בכלל | typo ב-label (`part_of` במקום `part-of` ב-regex source) או בשם הפורט | `Status → Targets`; `kubectl -n <NS> get pods --show-labels` |
| רק חלק מהסביבות | `namespaces.names` חסר סביבה, או Pods לא רצים | אותה שאילתה |
| Targets ב-`403`/ריקים | אין RBAC לגילוי Pods | `rbac.create: true` ב-values |
| Application `observability` אדום | namespace או Secret חסרים | `kubectl get ns`; הרץ את `prepare-observability.sh` |
| Grafana לא עולה, `secret not found` | Secret ה-admin לא קיים באותו namespace | `kubectl -n <NS> get secret` |

סימפטומים כלליים: [debugging/symptoms](../../debugging/symptoms/).

## Loki, Tempo, Alloy (SHOULD)

לוגים (Loki), traces (Tempo) ואיסוף (Alloy) הם חלק מ-SHOULD. ה-sources שלהם נשארים מוערים ב-`observability.yaml` עד שמפעילים אותם: אותה צורה כמו Prometheus (chart מ-`templates` ב-`<TAG>`, values ב-`$values/observability/<SERVICE>/values.yaml`). ה-datasources שלהם ב-Grafana כבר מוגדרים ובלתי מזיקים עד שהם קיימים.
כלל label: מזהים ייחודיים (`trace_id`, `request_id`) לעולם לא הופכים ל-labels של Prometheus.
