---
title: התמונה הגדולה
description: חלוקת ה-repos, הזרימה מקצה לקצה, סביבות מול branches, סולם ה-promotion והטבלה "איפה זה רץ".
sidebar:
  order: 1
---

:::note[בקצרה]
עמוד אחד שמחזיק את כל המודל: למה כמה repos, איך קוד הופך ל-Pod, איך מעלים גרסה מ-DEV ל-PROD, ואיפה כל פקודה רצה.
חוזרים לכאן כשמשהו "לא מתחבר", כי כמעט כל תקלה היא ערבוב בין שכבות או בין מקומות הרצה.
ה-credentials המלאים בעמוד [credentials](../credentials/).
:::

## משפט אחד שמסביר הכול

> **Git הוא הדרך היחידה לשנות את ה-cluster.**
> CI כותב **images** ו-**commits**. Argo הוא היחיד שמחיל (applies) משהו על ה-cluster.

מכאן נגזר: אף אחד לא מריץ `kubectl apply`/`helm install` על אובייקט מנוהל, CI לא נוגע ב-cluster, ו-`kubectl edit` מתבטל (selfHeal).

## איך מחלקים repos: מי קורא, מי כותב, באיזה קצב משתנה

השאלה לכל repo: **מי קורא אותו, מי כותב אותו, ומה האירוע שגורם לו להשתנות.** התשובה נותנת לו token, pipeline ומקום בזרימה.

| חלק במערכת | משתנה כל כמה זמן | נקרא על ידי | נכתב על ידי | לכן repo נפרד |
|---|---|---|---|---|
| קוד האפליקציה + Dockerfiles + tests | כל הזמן | CI | המפתח | ה-registry של ה-images יושב עליו |
| לוגיקת ה-pipeline + סקריפט promote | לעיתים רחוקות | GitLab (`include`), jobs (clone) | הפלטפורמה | נבדק בנפרד, משותף למספר repos |
| charts מאושרים | פעם אחת, אחר כך `<TAG>` | Argo | נוצר פעם אחת | tag לא זז: בלוק בנייה בלתי-משתנה |
| המצב הרצוי (values, Applications, versions) | בכל promotion | Argo | אתה + CI (רק קבצי versions) | זה מה ש-Argo צופה בו |

ב-TRIDENT:

| Repo | תוכן | קורא | כותב |
|---|---|---|---|
| `trident-source` | קוד, Dockerfiles, tests, `.gitlab-ci.yml` דק | GitLab CI | המפתח |
| `trident-ci` | `pipelines/source.yml` + `scripts/promote.sh` | GitLab (`include`) + jobs | הפלטפורמה |
| `trident-templates` | charts מיובאים, tag `v1.0.0` | Argo | פעם אחת |
| `trident-gitops` | values לכל env, `versions/<ENV>.yaml`, Applications, bootstrap | Argo | אתה + `promote.sh` |

:::tip[עיקרון]
אם בבחינה מופיע repo שלא הכרת (למשל repo של tests), שאל את אותן שלוש שאלות: מי קורא, מי כותב, מה משנה אותו. מכאן יוצאים ה-token וה-job.
:::

## הזרימה מקצה לקצה

```text title="flow: code to Pod"
git push (branch dev or main) to trident-source
   |  .gitlab-ci.yml: include project trident-ci / pipelines/source.yml
   v
candidate  -> CANDIDATE=<branch>-<date>-<sha>  (dotenv artifact, every later job gets $CANDIDATE)
test       -> unit tests
build      -> docker build, one image per service (context = shared parent dir)
publish    -> docker login (job token) -> docker push <IMAGE>:<CANDIDATE>
promote    -> clone trident-ci -> promote.sh <ENV> <CANDIDATE>
              -> clone trident-gitops -> write versions/<ENV>.yaml -> commit -> push main
   v
Argo notices the new commit in trident-gitops
   root app -> child Applications (dev / staging / prod / observability)
   child = charts @ trident-templates tag  +  values @ trident-gitops main
   render (helm template) -> diff vs cluster -> apply -> selfHeal / prune
   v
kubelet pulls the image with Secret (deploy token, read_registry) -> Pod runs
```

שים לב: ה-**image** נכנס ל-registry של `trident-source`; ל-gitops נכנסת רק **מחרוזת ה-tag**.

## סביבות אינן branches

`dev`, `staging`, `prod` הם **namespaces** (`<NS>`) עם values משלהם. `dev` ו-`main` הם **branches** של repo ה-source. הקישור ביניהם הוא רק כלל ב-pipeline.

## סולם ה-promotion

| אירוע | מה קורה | לאן |
|---|---|---|
| push ל-branch `dev` | `promote:dev` אוטומטי | DEV |
| push ל-`main` | `promote:staging` אוטומטי | STAGING |
| לחיצה על `promote:prod` (כפתור ב-pipeline של `main`) | אותו pipeline, אותו `$CANDIDATE`, בלי build מחדש; נכתב `versions/prod.yaml` | PROD |

- ה-candidate הוא מחרוזת `<BRANCH>-YYYYMMDD-<SHA>`, מחושבת **פעם אחת** ב-job `candidate` ועוברת ב-dotenv ל-jobs הבאים (`needs`).
- ה-job הידני מקדם את ה-candidate של ה-pipeline שלו, לא "מה שנמצא עכשיו ב-STAGING".
- שני שערים: **CI** שולט במה שנכנס ל-Git (הכפתור הידני); **Argo** תמיד אוטומטי. אין syncPolicy שונה ל-prod.
- מצב יציב תקין: `DEV = dev-C`, `STAGING = main-B`, `PROD = main-A`.

## איפה זה רץ? (הטבלה הקנונית)

החולשה הכי חוזרת: לא לדעת **איפה** פקודה רצה ומי מגדיר לה משתנים.

| הקשר | מה רץ שם | מאיפה מגיעים משתנים ו-credentials |
|---|---|---|
| Mac / laptop | `git` (SSH), עריכת קבצים; אין kubeconfig | מפתח SSH ב-`~/.ssh`, `~/.ssh/config` |
| shell ב-VM | `kubectl`, `helm`, `docker`, סקריפטי bootstrap, `git` | kubeconfig על ה-VM; משתנים רק מ-`export` באותו shell (ובכל טרמינל חדש); קבצי credentials תחת `~/.local/share/trident/` |
| CI job על ה-runner | `docker build/push`, `promote.sh`, clone של `trident-ci` | משתני GitLab CI/CD (group/project) + משתנים מוגדרים-מראש (`CI_REGISTRY_USER`...). **לא** `export` שלך |
| GitLab UI | יצירת projects, tokens, variables, runners, הכפתור הידני | אתה, מחובר כמשתמש |
| Argo בתוך ה-cluster | `helm template`, diff, apply; קורא **manifests ו-values בלבד**, לא את `bootstrap/` | repo Secrets ב-namespace `argocd`; ה-`$values` קיים רק כאן |

:::caution[מלכודת · קרה בתרגול]
הסקריפט נפל עם `!URL_VAR: export TRIDENT_GITOPS_URL=...` והמשתנה היה ריק. הוא הוגדר כמשתנה GitLab CI/CD, אבל הסקריפט רץ ב-shell של ה-VM. משתני CI קיימים רק בתוך job. תיקון: `export` באותו shell, ובדיקה עם `echo "$TRIDENT_GITOPS_URL"`.
:::

:::caution[מלכודת · קרה בתרגול]
`helm template ... -f $values/apps/...` ב-shell נכשל: `$values` הוא שם של Argo בלבד וריק ב-bash. הצורה המקומית: `-f` חוזר לכל קובץ עם נתיב אמיתי, ו-`-f` קורא את המילה הבאה (לא לשים אותו לפני ה-chart).
:::

**`git push` לא מתקן כשל שנובע ממצב ה-cluster** (Secret חסר, או `Failed` אחרי 5 ניסיונות sync): סקריפטי `bootstrap/` רצים ידנית ב-VM ו-Argo לא קורא אותם. אחרי התיקון: sync ידני, [argocd/operate](../../argocd/operate/).

## מה הלאה

- מי צריך איזו הרשאה: [credentials](../credentials/)
- תרגום Compose ל-Helm: [compose-to-k8s](../compose-to-k8s/)
- סדר העבודה במבחן: [exam-method](../exam-method/)
- בדיקה שכל שכבה עובדת: [verify](../../verify/overview/)
