---
title: CI/CD בסיס
description: אנטומיה של pipeline בפרויקט מרובה repos, מאיפה ה-variables מגיעים וטבלת predefined variables.
sidebar:
  order: 1
---

:::note[בקצרה]
ב-GitOps ה-CI **לא נוגע ב-cluster**: הוא בודק, בונה image, דוחף אותו ל-registry וכותב tag ל-`trident-gitops`. Argo CD מסנכרן משם.
הטאב: overview (דף זה), [keywords](../keywords/) (טבלת reference), [patterns](../patterns/) (תבניות jobs מלאות).
:::

## אנטומיה של pipeline בפרויקט מרובה repos

```text title="where each file lives"
trident-source/.gitlab-ci.yml        thin: only "include" of the real pipeline
trident-ci/pipelines/source.yml      the real pipeline (stages, jobs, promote family)
trident-ci/scripts/promote.sh        fetched by a job at runtime (include brings YAML only, not scripts)
trident-ci/.gitlab-ci.yml            self-test: proves the runner and the files
trident-gitops/apps/trident/versions/<ENV>.yaml   written by promote.sh (CI's only write)
```

הזרימה בכל pipeline של `dev` או `main`:

| stage | job | מה עושה |
|---|---|---|
| `test` | `candidate` | מחשב `CANDIDATE`, מייצא אותו ב-dotenv |
| `test` | `test` | `python3 -m unittest discover -s tests` |
| `build` | `build` | `docker build` לכל service |
| `publish` | `publish` | `docker login` + `docker push` |
| `promote` | `promote:dev` / `promote:staging` / `promote:prod` | commit ל-gitops עם ה-tag |

- `dev` branch: עד `promote:dev`. `main`: עד `promote:staging`, ואז `promote:prod` ידני.
- branch שאינו `dev` או `main` (למשל `poc`) לא מקבל pipeline כלל (`workflow:rules`).
- שער ידני במקום אחד: ה-CI שולט מה נכנס ל-Git; Argo תמיד אוטומטי.

## מאיפה ה-variables מגיעים

| מקור | דוגמה | הערה |
|---|---|---|
| predefined (GitLab) | `CI_COMMIT_BRANCH`, `CI_REGISTRY_IMAGE` | קיימים בכל job, אין מה ליצור |
| group / project CI/CD variables | `TRIDENT_GROUP`, `TRIDENT_GIT_TOKEN` | נוצרים ב-UI: [gitlab/variables](../../gitlab/variables/) |
| `variables:` ב-YAML | `SERVICES`, `IMAGE_REPO` | גלוי בקוד, לא ל-secrets |
| dotenv מ-job קודם | `CANDIDATE` | מגיע ל-jobs מאוחרים; עם `needs` רק מה-jobs שמופיעים בו |
| `variables:` ברמת job | `TARGET_ENV` | מחליף את הרמה הכללית |

עדיפות כשיש אותו שם בכמה מקומות: project variable גובר על group variable. אל תסתמך על שאר הסדר; השתמש בשמות ייחודיים.

:::caution[מלכודת · קרה בתרגול]
ה-variables של ה-CI קיימים רק בתוך jobs. הם לא ב-shell שלך על ה-VM, ולהפך: `export` ב-shell שלך לא מגיע ל-job. פרטים: [gitlab/variables](../../gitlab/variables/).
:::

## predefined variables שחוזרים בפרויקט

| variable | ערך | שימוש כאן |
|---|---|---|
| `CI_COMMIT_BRANCH` | שם ה-branch | `rules`, שם ה-candidate |
| `CI_COMMIT_SHORT_SHA` | 8 תווים ראשונים של ה-commit | ה-candidate |
| `CI_COMMIT_REF_PROTECTED` | `true` / `false` | אבחון variables עם Protect |
| `CI_PROJECT_DIR` | נתיב ה-checkout | תיקיית העבודה של ה-job |
| `CI_SERVER_HOST` | `gitlab.com` | `GITOPS_REPO` |
| `CI_REGISTRY` | `registry.gitlab.com` | `docker login` |
| `CI_REGISTRY_IMAGE` | `registry.gitlab.com/<GROUP>/<REPO>` | `IMAGE_REPO` |
| `CI_REGISTRY_USER` | `gitlab-ci-token` | `docker login -u` |
| `CI_REGISTRY_PASSWORD` | job token | `docker login --password-stdin` |
| `CI_JOB_TOKEN` | token קצר חיים | לא מיועד ל-push ל-repo אחר (`403`) |

מי שדוחף ל-gitops הוא service account, לא `CI_JOB_TOKEN`. גישה cross-project של ה-job token נשלטת ב-`Project → Settings → CI/CD → Job token permissions`.

**איך מוודאים** שמשתנה קיים: ב-job, `echo "$CI_COMMIT_BRANCH $CI_COMMIT_SHORT_SHA"` מדפיס ערכים. ה-log של job מציג גם בתחילתו את ה-runner ואת ה-tag שנבחר.

## איפה רואים ומריצים

```text title="GitLab UI"
Pipelines list:     Project → Build → Pipelines
A job's log:        click the job in the pipeline graph
Edit + validate:    Project → Build → Pipeline editor (Validate tab checks syntax)
Environments:       Project → Operate → Environments
Run manually:       Pipelines → Run pipeline (pick the branch)   or click ▶ on a manual job
```

ניסוחי תפריט משתנים בין גרסאות (`CI/CD → Pipelines` בגרסאות ישנות). אין pipeline בכלל? סיבות: branch שאינו מותר ב-`workflow:rules`, include לא נפתר, או אין runner עם ה-tag. טבלת תסמינים: [debugging/symptoms](../../debugging/symptoms/). runner שלא קולט: [gitlab/runners](../../gitlab/runners/).
