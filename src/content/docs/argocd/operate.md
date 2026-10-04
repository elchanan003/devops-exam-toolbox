---
title: תפעול Argo CD — repo Secrets, סטטוסים, kubectl
description: איך רושמים repo ל-Argo, קוראים Synced/Healthy/Unknown, מפענחים ComparisonError, ובודקים self-heal ו-prune רק עם kubectl.
sidebar:
  label: "repo Secrets, סטטוסים, kubectl"
  order: 3
---

:::note[בקצרה]
הדף ל-"Argo לא עושה מה שציפיתי". סדר: credentials של ה-repo, אחר כך סטטוס (קרא SYNC לפני HEALTH), אחר כך ההודעה המלאה (קרא מלמטה למעלה).
אין `argocd` CLI: הכול `kubectl` + ה-UI ([overview](../overview/#גישה-ל-ui-ולסיסמת-admin)). טבלת symptoms הכללית: [debugging/symptoms](../../debugging/symptoms/).
:::

## repo Secrets

Argo צריך credential לכל repo פרטי: Secret ב-namespace `argocd` עם label מיוחד. **שני repos = שני Secrets**, גם אם ה-credential משותף; ה-`url` לא.

```yaml title="file: repo-secret.yaml (shape only, never commit real values)"
apiVersion: v1
kind: Secret
metadata:
  name: <SECRET>
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://<GITLAB_HOST>/<GROUP>/<REPO>.git
  username: <USER>
  password: <TOKEN_FILE>   # the file's contents, not its path
```

הערה: ה-password נקרא מקובץ ה-token (ראה `register-repository.sh` ב-TRIDENT, או [bash/templates](../../bash/templates/)). ה-token לא נכנס ל-Git.

### url חייב להיות זהה ל-repoURL בייט-לבייט

:::caution[מלכודת · קרה בתרגול]
הנחה שגויה: ה-`url` ב-Secret הוא שם חופשי. הוא כתובת ה-repo האמיתית וחייב להיות שווה ל-`repoURL` ב-Application, כולל סיומת `.git` באופן עקבי ובלי רווח בסוף.
:::

```bash title="runs on: VM"
kubectl -n argocd get secret <SECRET> -o jsonpath='{.data.url}' | base64 -d; echo
kubectl -n argocd get secret -l argocd.argoproj.io/secret-type=repository
```

**איך מוודאים:** הכתובת המודפסת זהה לתו לתו ל-`repoURL`; הרשימה השנייה מציגה Secret לכל repo.

### לבדוק שה-credential באמת עובד

ה-flag `--verify` של `register-repository.sh` בודק רק את **צורת** ה-Secret (שדות, label), לא ש-GitLab מקבל אותו.

```bash title="runs on: VM"
git ls-remote https://<USER>:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git
```

**איך מוודאים:** רשימת refs (`HEAD`, `refs/heads/main`, tags). שגיאת `Access denied` = הבעיה בצד GitLab.

:::caution[מלכודת · קרה בתרגול]
`Access denied` על repo אחד בלבד עם אותו credential = ה-bot לא member באותו repo. הוספה כ-Reporter ב-GitLab, בלי להריץ מחדש script. פירוט: [gitlab/permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo).
:::

ב-UI: `Settings → Repositories`, עמודת Connection Status (`Successful` / `Failed`).

## קריאת הסטטוסים

```bash title="runs on: VM"
kubectl -n argocd get applications
kubectl -n argocd get application <APP> -o jsonpath='{.status.sync.status}/{.status.health.status}{"\n"}'
```

| SYNC | HEALTH | משמעות | מה עושים |
|---|---|---|---|
| `Synced` | `Healthy` | המצב החי = Git, והמשאבים בריאים | עדיין לא הוכחה שהאפליקציה עובדת: `curl` ל-`/info` |
| `Synced` | `Progressing` | rollout באמצע | המתן, בדוק `kubectl get pods` |
| `Synced` | `Degraded` | הוחל, אבל Pod לא תקין | `describe`/`logs` ב-`<NS>` (בעיה בצד Pods, לא Argo) |
| `OutOfSync` | `Healthy`/`Progressing` | Git שונה מהחי; sync יתחיל (או ממתין אם ידני) | בדוק `syncPolicy`; חכה לפולינג או refresh |
| `OutOfSync` | `Missing` | משאבים לא קיימים (למשל namespace חסר) | `kubectl get ns`, הרץ את script ההכנה |
| `Unknown` | `Healthy` | Argo לא הצליח **לרנדר**: אין משאבים, ולכן "Healthy" ריק | קרא `.status.conditions` |

:::caution[מלכודת · קרה בתרגול]
`prod` ו-`staging` הוצגו `Unknown / Healthy` והוא נראה תקין. `Unknown` = Argo לא הצליח לרנדר, אין אפילו משאב אחד, ו-`Healthy` הוא ריק לחלוטין.
כלל: קרא SYNC קודם. `Healthy` לצד `Unknown`/`Missing` הוא דגל אדום. ואף אחד משניהם לא מוכיח שהאפליקציה עובדת.
:::

אל תבדוק מצבים זמניים (`OutOfSync` בזמן self-heal, `Progressing` באמצע rollout) כ"כישלון".

## ComparisonError: קוראים מלמטה למעלה

```bash title="runs on: VM"
kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}'
```

ההודעה היא בצל: כל שכבה עוטפת את זו שמתחתיה, והסיבה האמיתית היא **השורה האחרונה**.

פירוק מלא של הודעה כזאת, שכבה אחר שכבה: [debugging/overview](../../debugging/overview/#דוגמה-פירוק-שגיאה-שכבתית). בקיצור: `ComparisonError`, אחר כך איזה source, אחר כך `helm template` שנכשל, ובשורה האחרונה הסיבה.

- חפש בטקסט `denied`/`403`/`unauthorized`. אם אין, אל תוסיף סיבות שהטקסט לא תומך בהן.

:::caution[מלכודת · קרה בתרגול]
`staging`/`prod` נתנו `ComparisonError` עם `YAML parse error ... line 47`, כי `versions/<ENV>.yaml` היה `""`: אף אחד לא הריץ promote אליהם. התיקון: promote, לא עריכת ה-chart. השוואה: `dev` עבד עם אותו chart, אז הסיבה בדבר שמבדיל ביניהם.
:::

סיבות נפוצות ל-`Unknown`/`ComparisonError`: credential ל-repo, path שגוי, `$values` בלי `ref: values`, YAML פגום ב-values, תיקיית chart חסרה ב-`templates`.

## פעולות עם kubectl בלבד

```bash title="runs on: VM"
# all apps with sync + health columns
kubectl -n argocd get applications -o custom-columns=NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REV:.status.sync.revision
# last operation message (sync result or error)
kubectl -n argocd get application <APP> -o jsonpath='{.status.operationState.message}{"\n"}'
# sync history (revisions applied)
kubectl -n argocd get application <APP> -o jsonpath='{.status.history}{"\n"}'
```

**רענון מיידי** במקום לחכות לפולינג, באמצעות annotation:

```bash title="runs on: VM"
kubectl -n argocd annotate application <APP> argocd.argoproj.io/refresh=hard --overwrite
```

`hard` גם מנקה cache של manifests. Argo מסיר את ה-annotation לבד אחרי הרענון. **איך מוודאים:** `.status.sync.revision` מתעדכן ל-commit האחרון.

:::danger[זהירות]
מחיקת Application עם finalizer מוחקת (cascade) את כל המשאבים שלו, כולל PVC ונתונים. מחיקת root מוחקת את כל ה-children. זה מה שרוצים ב-cleanup ולא באמצע עבודה.
:::

```bash title="runs on: VM"
kubectl -n argocd delete application <APP>
```

## בדיקת self-heal ו-prune

**selfHeal:** שינוי חי מוחזר.

```bash title="runs on: VM"
kubectl -n <NS> scale deployment <SERVICE> --replicas=0
kubectl -n <NS> get deployment <SERVICE> -w
```

**איך מוודאים:** תוך פולינג/שניות ה-`READY` חוזר ל-`1/1` בלי שנגעת ב-Git. (אם לא: `selfHeal` חסר, בדוק `syncPolicy`.)

**prune:** מחיקה ב-Git מוחקת בקלאסטר. הסר משאב מהרינדור (למשל Deployment מה-values, או קובץ מה-path), `commit` + `push`, וחכה.

```bash title="runs on: VM"
kubectl -n <NS> get deployment <SERVICE>
```

**איך מוודאים:** `NotFound` אחרי ה-sync. בלי `prune: true` המשאב נשאר ו-Application נשאר `OutOfSync`.

## לעולם לא מתקנים live: מתקנים ב-Git

:::tip[עיקרון]
`kubectl edit`/`scale`/`patch` על משאב ש-Argo מנהל יוחזרו על ידי selfHeal. כל תיקון עובר ב-Git: edit, `commit`, `push`, ואז Argo מחיל. ב-live רק קוראים.
:::

## prod לא צריך syncPolicy אחר

שני gates שונים: **CI שולט במה שנכנס ל-Git** (job ה-promote של prod הוא `when: manual`), ו-**Argo תמיד אוטומטי**. אז `prod.yaml` זהה ל-`dev.yaml` ב-`syncPolicy`. ה-promote עדיין מריץ `promote.sh`, והלחיצה היא על ה-job ב-CI. ראה [ci/patterns](../../ci/patterns/).
