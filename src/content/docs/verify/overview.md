---
title: סולם האימות
description: בדיקה מלמטה למעלה, מ-render ועד נתונים שורדים, עם פקודה ו"איך נראה טוב" לכל שלב.
sidebar:
  order: 1
---

:::note[בקצרה]
בודקים שכבה אחרי שכבה ולא קופצים לדפדפן. אם שכבה נכשלת, עוצרים וחוזרים ל-[debugging](../../debugging/overview/).
`Synced` + `Healthy` לא אומר "עובד": רק שלבים 5–7 מוכיחים התנהגות.
:::

## הסולם

### 1. Render

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> -f <FILE>
```

**איך נראה טוב:** YAML תקין, נתיב image אמיתי עם tag אמיתי, אין hosts ריקים. הצורה המלאה: [helm/overview](../../helm/overview/).

### 2. Pipeline

GitLab, Pipelines: כל ה-jobs ירוקים. ה-registry מכיל image לכל service עם ה-candidate. ב-gitops:

```bash title="runs on: any shell"
git log --oneline -3
```

**איך נראה טוב:** commit `promote(<ENV>): <CANDIDATE>`. פירוט: [ci/overview](../../ci/overview/).

### 3. Argo

```bash title="runs on: VM"
kubectl get applications -n argocd
kubectl get application <APP> -n argocd -o jsonpath='{.status.sync.status}/{.status.health.status}'
kubectl get application <APP> -n argocd -o jsonpath='{.status.conditions}'
```

**איך נראה טוב:** `Synced/Healthy` ו-conditions ריק. `Unknown` = לא רונדר. `Failed` ב-`operationState.phase`: להשוות `finishedAt` ל-`date -u` לפני שקוראים את ההודעה. פירוט: [argocd/operate](../../argocd/operate/).

### 4. Objects

```bash title="runs on: VM"
kubectl get pods,svc,ingress,pvc,secret -n <NS>
```

**איך נראה טוב:** Pods `Running` ו-`Ready`, PVC `Bound`, Secrets קיימים בכל namespace.

### 5. Behaviour: `/info`

```bash title="runs on: VM"
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info
# TRIDENT: curl -k --resolve dev.trident.test:31651:192.168.242.130 https://dev.trident.test:31651/info
```

`<PORT>` הוא ה-NodePort של HTTPS ב-ingress controller, מספר שונה בכל cluster. מגלים אותו: `kubectl -n ingress-nginx get svc` והמספר אחרי `443:` ([kubernetes/networking](../../kubernetes/networking/#curl---resolve-אל-ה-nodeport)).

| שדה | איך קוראים |
|---|---|
| `version` | = ה-candidate שקידמת. אחר = ה-env עדיין על גרסה ישנה |
| `environment` | = ה-env ששאלת |
| counters (`accepted`) | **עולים בין שתי קריאות** = נתונים זורמים. קבוע = שום דבר לא נכנס |
| `queue_depth` | לא גדל ללא גבול (צרכן חי) |
| detections | `0` **צפוי** בים שקט, לא תקלה |

להוכיח את הנתיב עד ה-DB: להריץ את התרחיש `quick-transit` בסימולטור (פורט ops `9101`). ב-image יש python ואין curl:

```bash title="runs on: VM"
kubectl -n <NS> exec deploy/acoustic-simulator -- python -c "import urllib.request as u; u.urlopen(u.Request('http://127.0.0.1:9101/scenarios/quick-transit', method='POST'))"
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info
```

**איך נראה טוב:** אחרי התרחיש ה-detections כבר לא `0`; אם לא, לקרוא `logs` של signal-processor.

לולאה על כל ה-envs (מניחה host בצורה `<ENV>.<DOMAIN>`):

```bash title="runs on: VM"
for e in dev staging prod; do
  curl -ks --resolve "$e.<DOMAIN>:<PORT>:<VM_IP>" "https://$e.<DOMAIN>:<PORT>/info"; echo
done
```

**איך נראה טוב:** `version` ו-`environment` נכונים לכל env.

### 6. תכונות GitOps

```bash title="runs on: VM"
kubectl scale deploy/<SERVICE> -n <NS> --replicas=0
kubectl get deploy <SERVICE> -n <NS> -w
```

**איך נראה טוב:** Argo מחזיר את ה-replicas (selfHeal). בדיקת prune: מסירים קובץ משאב מ-Git, והמשאב נמחק מה-cluster. אל תנסה זאת על משהו שאתה צריך.

### 7. נתונים שורדים

```bash title="runs on: VM"
kubectl delete pod -n <NS> -l trident.dev/service=postgres
kubectl get pods -n <NS> -w
```

**איך נראה טוב:** ה-Pod חוזר ושאילתה על הטבלה מחזירה את אותן שורות (PVC על `course-local-path`).

## בדיקת promotion מקצה לקצה

| שלב | פעולה | `versions/<ENV>.yaml` |
|---|---|---|
| 1 | push ל-`dev` | `dev` = `dev-...` (ה-candidate של `dev`) |
| 2 | merge ל-`main` + push | `staging` = `main-...` (ה-candidate של `main`) |
| 3 | בדוק STAGING (שלבים 3–5), ואז לחץ `promote:prod` | `prod` = אותו candidate של ה-pipeline |

מצב יציב תקין: `DEV = dev-C`, `STAGING = main-B`, `PROD = main-A`. ה-PROD מקבל את ה-candidate של ה-pipeline שאושר, לא מה ש-STAGING מחזיק עכשיו.

```bash title="runs on: any shell"
git pull --ff-only
cat apps/trident/versions/dev.yaml apps/trident/versions/staging.yaml apps/trident/versions/prod.yaml
```

**איך מוודאים:** שלושה ערכי `defaultImageTag` שונים כמצופה, ו-`/info` של כל env מראה את אותו ערך.

:::caution[מלכודת]
אל תלחץ `promote:prod` לפני שה-STAGING אומת. הלחיצה כותבת `versions/prod.yaml` ו-prod עולה `Synced/Healthy` בלי למחוק כלום. וודא ב-`CANDIDATE` שאתה על ה-pipeline הנכון.
:::

## מצב סופי: הבדיקה האחרונה

```bash title="runs on: VM"
kubectl -n argocd get applications
for e in dev staging prod; do kubectl -n <NS_PREFIX>-$e get pods; done
```

**איך נראה טוב:** כל ה-Applications `Synced` + `Healthy`; כל ה-Pods `1/1 Running` בכל namespace. אחר כך `/info` לכל env (לולאה למעלה).

המשך: [cleanup וצ'קליסט](../cleanup/).
