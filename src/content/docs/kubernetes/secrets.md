---
title: Secrets ו-ConfigMaps
description: שלושת סוגי ה-Secret עם פקודות יצירה מדויקות, כלל ה-namespace, יצירה אידמפוטנטית, וקריאת ערך בבטחה.
sidebar:
  order: 2
---

:::note[בקצרה]
`Secret` הוא אובייקט **בתוך namespace**, ו-Pod יכול להשתמש רק ב-Secrets של ה-namespace שלו. Secrets לא נשמרים ב-Git — הם נוצרים בנפרד (script ה-bootstrap) **לפני** ש-Argo עושה sync.
יש שני סוגי Secrets: (A) כאלה ש-**Argo** קורא כדי לגשת ל-Git (ב-`argocd`), ו-(B) כאלה ש-**ה-Pods** של כל סביבה צריכים (registry, סיסמת DB, TLS). הדף עוסק ב-(B); על (A): [argocd/operate](../../argocd/operate/).
:::

## כלל ה-namespace

:::caution[מלכודת · קרה בתרגול]
פספוס חוזר (פעמיים, בלחץ): ב-staging `ImagePullBackOff`, וב-prod `secret ... not found` — בזמן ש-`kubectl get secret -A` הראה שה-Secret **קיים**. הוא היה קיים ב-namespace אחר.
כלל: "עובד ב-A ולא ב-B" פירושו לחפש מה **שונה**, וה-namespace הוא החשוד הראשון. "not found": שם או namespace שגויים. התיקון: ליצור את ה-Secret ב-namespace החסר (ב-TRIDENT: `bash bootstrap/prepare-environment.sh <ENV>`).
:::

```bash title="runs on: VM"
kubectl get secret -A | grep <SECRET>                  # which namespaces hold it
kubectl -n <NS> get secret <SECRET>                    # does THIS namespace hold it
```

**איך מוודאים:** לכל סביבה (`trident-dev`, `trident-staging`, `trident-prod`) יש את שלושת ה-Secrets. השם זהה, אבל **התוכן** יכול להיות שונה (למשל `trident-tls` — תעודה לכל host).

## generic: סיסמה כקובץ

```bash title="runs on: VM"
kubectl -n <NS> create secret generic <SECRET> --from-file=postgres_password=<FILE>
# TRIDENT: kubectl -n trident-dev create secret generic trident-postgres --from-file=postgres_password=$HOME/.local/share/trident/credentials/postgres/dev/password
```

- `--from-file=<KEY>=<FILE>`: שם **המפתח** ב-Secret (`postgres_password`) הוא מה שיהפוך לשם הקובץ במאונט. בלי `KEY=`, שם הקובץ המקורי הופך למפתח.
- הקובץ חייב להיות ללא newline בסוף (כתוב אותו עם `printf %s`, או `read -rs`). `echo` ו-here-string מוסיפים `\n` ל-Secret. כתיבה בטוחה: [bash/snippets](../../bash/snippets/).

**איך מוודאים:** `kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}' | jq 'keys'` מציג `["postgres_password"]`.

## docker-registry: למשיכת images

```bash title="runs on: VM"
kubectl -n <NS> create secret docker-registry <SECRET> \
  --docker-server=<REGISTRY> \
  --docker-username=<USER> \
  --docker-password="$(cat <TOKEN_FILE>)"
# TRIDENT: --docker-server=registry.gitlab.com  (never https://..., and not the web host name)
```

`--docker-server` הוא ה-registry (`registry.gitlab.com`), לא `gitlab.com`. ה-Secret מקבל type `kubernetes.io/dockerconfigjson`. ה-Pod משתמש בו דרך `extraImagePullSecrets` ב-values ([values](../../helm/values/#generic-ו-imagerepository)). איזה token מתאים: [gitlab/registry](../../gitlab/registry/).

**איך מוודאים:** `kubectl -n <NS> get secret <SECRET> -o jsonpath='{.type}'` מדפיס `kubernetes.io/dockerconfigjson`. אם Pod נתקע ב-`ImagePullBackOff`, `describe pod` מראה אם ה-Secret חסר, השרת שגוי או ה-token בלי scope.

## tls: תעודה ומפתח

```bash title="runs on: VM"
kubectl -n <NS> create secret tls <SECRET> --cert=<FILE>.crt --key=<FILE>.key
# TRIDENT: kubectl -n trident-dev create secret tls trident-tls --cert=tls/dev.trident.test.crt --key=tls/dev.trident.test.key
```

**איך מוודאים:** `get secret <SECRET> -o jsonpath='{.type}'` מדפיס `kubernetes.io/tls`; ו-`openssl x509 -in <FILE>.crt -noout -subject -dates` מראה ל-host הנכון. שם ה-Secret חייב להיות זה שב-`extraTls.secretName` של ה-Ingress ([networking](../networking/#ingress-ו-tls)).

## יצירה אידמפוטנטית: create | apply

`create` נכשל אם האובייקט קיים. כדי שאפשר יהיה להריץ שוב ושוב:

```bash title="runs on: VM"
kubectl -n <NS> create secret generic <SECRET> --from-file=postgres_password=<FILE> \
  --dry-run=client -o yaml | kubectl apply --server-side --force-conflicts -f -
```

`--dry-run=client -o yaml` מייצר את ה-YAML בלי לשלוח, ו-`apply` יוצר או מעדכן. עם `--server-side` ערך ה-Secret לא נשמר ב-annotation `last-applied-configuration` (ב-`apply` רגיל הוא נשמר שם; [פירוט](../../bash/snippets/#secret-apply---server-side-כדי-לא-להדליף-ל-annotation)). את ה-namespace עצמו: `kubectl create namespace <NS> --dry-run=client -o yaml | kubectl apply -f -`.
פונקציה מוכנה עם בדיקות קלט: [bash/snippets](../../bash/snippets/), וה-script המלא: [bash/templates](../../bash/templates/).

## מאונט כקובץ, לא כ-env

Secret כ-**קובץ** מוגן בהרשאות; משתנה סביבה דולף ל-child processes, ל-`kubectl describe` וללוגים. לכן `POSTGRES_PASSWORD_FILE=/run/secrets/<APP_DIR>/postgres_password` (TRIDENT: `<APP_DIR>` = `trident`) ולא ערך. ב-Compose, `secrets:` מתורגם ל-Secret **volume**, לא ל-`envFrom secretRef`. מיפוי: [architecture/compose-to-k8s](../../architecture/compose-to-k8s/).

```bash title="runs on: VM"
kubectl -n <NS> exec deploy/<SERVICE> -- ls -l /run/secrets/<APP_DIR>
```

:::caution[מלכודת · קרה בתרגול]
לא מאונטים Secret ב-`/run/secrets` עצמו: זה מתנגש עם ה-mount של ה-service-account token (`/var/run/secrets/kubernetes.io/…`) וה-Pod נופל ב-`StartError … read-only file system`. תמיד תת-תיקייה, וה-env מצביע על **הקובץ**, לא על התיקייה. פירוט: [overview](../overview/#אין-לוגים-ה-container-לא-התחיל).
:::

**איך מוודאים:** הקובץ קיים, בגודל > 0. אם התיקייה ריקה — `secretName` שגוי ב-values, או Secret חסר ב-namespace.

## ConfigMaps

ConfigMap מכיל הגדרות לא-רגישות. ב-TRIDENT הוא נוצר מה-values (`configMaps.<name>.data`), לא ידנית. לבדיקה:

```bash title="runs on: VM"
kubectl -n <NS> get cm
kubectl -n <NS> get cm trident-queue -o jsonpath='{.data}' | jq    # a ConfigMap name from get cm
kubectl -n <NS> exec deploy/<SERVICE> -- env | grep -E 'REDIS_HOST|POSTGRES_HOST'
```

**איך מוודאים:** הערכים תואמים לשמות ה-Services (`fullnameOverride`). ConfigMap כ-`envFrom` נקרא בזמן הפעלת ה-Pod: אחרי שינוי, ה-Pod מוחלף על ידי Argo, או `rollout restart`.
