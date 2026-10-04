---
title: מפת ה-credentials
description: כל actor, מה הוא צריך, באיזה credential, באיזה scope ו-role, איפה הוא חי ומה נשבר כשהוא שגוי.
sidebar:
  order: 2
---

:::note[בקצרה]
המפה היחידה של מי ניגש למה. לפני שמקלידים משהו, ממלאים אותה על דף: לכל actor, איזה credential, ואיפה הוא שמור.
**איך יוצרים** כל credential: [gitlab/identities](../../gitlab/identities/). כאן: **מי צריך מה ולמה**.
:::

## שלושה כללים

1. **מי שכותב אינו מי שקורא.** CI כותב ל-gitops; Argo רק קורא. token דלוף של Argo לא יכול לשנות את המצב הרצוי.
2. **אותה group אינה הרשאה.** חברות ב-group לא נותנת גישה ל-repo; כל identity צריך להיות member בפרויקט.
3. **שתי שכבות בלתי-תלויות:** `role` (פר project, ב-Members) ו-`scope` (פר token, נבחר ביצירה). שניהם חייבים לאפשר.

## הטבלה

| # | Actor | צריך | Credential / identity | scope / role | איפה חי (לעולם לא ב-Git) | מה נשבר אם שגוי |
|---|---|---|---|---|---|---|
| 1 | job `publish` ב-CI | push של images | `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` (job token) | אוטומטי, מת עם ה-job | משתנה מוגדר-מראש, לא יוצרים כלום | `denied: access forbidden` (חסר `docker login`) |
| 2 | job `promote` ב-CI | לקרוא `trident-ci`, **לכתוב** `trident-gitops` | `TRIDENT_GIT_TOKEN` (service account / PAT; access token בתשלום) | `write_repository` (כולל קריאה) ל-gitops; role Developer על gitops, Reporter על `trident-ci` | משתנה group CI/CD, **Mask**, בלי **Protect** אם ה-job רץ על branch לא מוגן | push נכשל 403; מצב Protect על `dev`: token ריק |
| 3 | GitLab (`include:`) | לקרוא את YAML של `trident-ci` | הגישה של המשתמש שהפעיל | member ב-`trident-ci` | - | `/trident-ci not found` (חסר `TRIDENT_GROUP`) |
| 4 | Argo | לקרוא `trident-gitops` | identity לקריאה בלבד (deploy token / service account) | `read_repository`; Reporter | קבצי `username`/`token` ב-VM, Secret ב-namespace `argocd` | `repository not found`, `HTTP Basic: Access denied` |
| 5 | Argo | לקרוא `trident-templates` | identity לקריאה בלבד | `read_repository`; Reporter | Secret נפרד ב-`argocd` | `ComparisonError`, `Unknown` |
| 6 | **kubelet** בכל env | למשוך images | **deploy token** על `trident-source` | `read_registry` בלבד | Secret `kubernetes.io/dockerconfigjson` **בכל namespace** + `imagePullSecrets` | `ImagePullBackOff` |
| 7 | ה-runner | להריץ jobs | registration token `glrt-` | project runner (group runner אם הכפתור קיים; בתרגול ב-Free חסר); tag נכון | `/etc/gitlab-runner/config.toml` ב-VM | job תקוע, `no runner for tags` |
| 8 | Postgres + signal-processor | סיסמת DB | קובץ סיסמה לכל env | - | Secret generic, מפתח `postgres_password`, מותקן כקובץ בתת-תיקייה (`/run/secrets/<APP_DIR>`) | Pod ב-`CrashLoopBackOff` / `read-only file system` |
| 9 | Grafana | admin | קבצי credentials | - | Secret admin ב-`<NS>` של observability | Grafana לא עולה |
| 10 | Ingress | TLS | CA + cert לכל host | - | Secret `tls` **בכל namespace** | cert שגוי / 404 |

## נקודות שנשברות

- **Secret הוא per namespace.** Pod משתמש רק ב-Secrets של ה-namespace שלו. "עובד ב-dev ולא ב-staging" = חפש מה שונה (ה-namespace).
- **שני סוגי Secrets:** (A) ש-Argo קורא איתם Git (ב-`argocd`); (B) ש-Pods צריכים (pull, סיסמה, TLS), שחייבים להיות קיימים **לפני** ש-Argo עושה sync.
- **repo Secret: `url` חייב להיות כתובת ה-repo האמיתית**, זהה byte-ב-byte ל-`repoURL` ב-Application. שני repos = שני Secrets, גם אם ה-credential משותף.
- **kubelet, לא kubectl:** מי שמושך את ה-image הוא ה-kubelet של ה-node, עם deploy token.
- **ה-registry יושב על `trident-source`.** ל-gitops לא נדחפים images.
- **Mask ≠ Protect.** Mask מסתיר את הערך בלוגים; Protect מגביל את המשתנה ל-branches מוגנים.

:::caution[מלכודת · קרה בתרגול]
`HTTP Basic: Access denied` על `gitops` ו-OK על `templates` עם אותו credential: חברות per project חסרה (מוסיפים Reporter), לא scope ולא "Developer". האבחון המלא: [gitlab/permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo).
:::

:::caution[מלכודת · קרה בתרגול]
`promote:dev` קיבל `403` כש-`TRIDENT_GIT_TOKEN` היה עם Protect ו-`dev` אינו branch מוגן: המשתנה ריק. Mask דלוק, Protect כבוי. פירוט: [gitlab/variables](../../gitlab/variables/#mask-מול-protect).
:::

## איך מוודאים credential

```bash title="runs on: VM"
git ls-remote https://oauth2:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git HEAD
```

**איך מוודאים:** פלט עם `<SHA>` ו-`HEAD` = ה-token קורא. `HTTP Basic: Access denied` = identity לא member או scope חסר.

המשך: [הסימפטומים לפי שכבה](../../debugging/symptoms/) · [Argo operate](../../argocd/operate/).
