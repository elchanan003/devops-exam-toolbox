---
title: Git — הכנה וסדר עבודה בסיסי
description: הגדרת זהות, clone, status/add/commit, log/diff ו-remotes, ומה Git עושה בפרויקט עם כמה repos.
sidebar:
  label: "הכנה וסדר עבודה בסיסי"
  order: 1
---

:::note[בקצרה]
Git הוא הדרך היחידה להכניס שינוי ל-GitOps: **GitLab הוא האמת**, Argo CD קורא משם, וה-clone המקומי הוא רק "סדנה" לעריכה.
בדף הזה: הגדרה חד-פעמית, clone, מחזור `status → add → commit → push`, וצפייה בהיסטוריה. המשימות המתקדמות בדפים
[branches](../branches/), [sync](../sync/), [undo](../undo/) ו-[hygiene](../hygiene/). אימות מול GitLab: [SSH](../../ssh/overview/).
:::

## מה Git עושה בפרויקט כמו TRIDENT, ואיפה מריצים אותו

בפרויקט יש כמה repos נפרדים, וכל אחד נכתב על ידי גורם אחר:

| repo | מי כותב | מי קורא |
|---|---|---|
| `trident-source` | אתה (קוד, Dockerfile, בדיקות) | ה-runner (CI) |
| `trident-ci` | אתה (YAML של ה-pipeline + `promote.sh`) | `include` מתוך source |
| `trident-gitops` | אתה (values, Applications) **וגם** ה-CI (קובץ `versions/<ENV>.yaml`) | Argo CD |
| `trident-templates` | אתה (charts) | Argo CD |

שלושה עותקים של כל repo: העותק ב-GitLab (האמת), העותק של Argo (קורא משם בלבד), והעותק המקומי שלך (נעשה ישן מהר).
**push שלא קרה = לא קיים בשביל Argo.**

ביום המבחן סביר שהכול קורה **על ה-VM עצמה**: `git`, `kubectl` ו-`helm` באותו shell. תכין שם זהות ו-SSH key (ראה [ssh](../../ssh/overview/)) ולא תסתמך על Mac.

## להגדיר זהות פעם אחת (user.name / user.email)

בלי זהות `git commit` נכשל או חותם בשם לא רצוי. ההגדרה נשמרת ב-`~/.gitconfig`.

```bash title="runs on: any shell"
git config --global user.name "<USER>"
git config --global user.email "student@example.com"
git config --global init.defaultBranch main
git config --global pull.ff only
```

`pull.ff only` גורם ל-`git pull` להיכשל בקול במקום ליצור merge commit מיותר (ראה [sync](../sync/)).

**איך מוודאים:** `git config --global --list` מציג את ארבע השורות.

## לשכפל repo (clone) מ-GitLab

השתמש ב-**path** של ה-group, לא בשם התצוגה. הכתובת המדויקת: ב-GitLab לחץ Code ← Clone with SSH.

```bash title="runs on: any shell"
git clone git@<GITLAB_HOST>:<GROUP>/<REPO>.git
# TRIDENT: git clone git@gitlab.com:trident-lab00/trident-gitops.git
cd <REPO>
```

:::caution[מלכודת · קרה בתרגול]
שם התצוגה של ה-group היה `trident-lab` וה-path היה `trident-lab00`. כתובת עם השם הלא נכון נותנת
"project could not be found or you don't have permission". תמיד העתק את הכתובת מכפתור Clone, או קח את ה-path מה-URL בדפדפן.
:::

**איך מוודאים:** `git remote -v` מציג את אותה כתובת פעמיים (fetch ו-push), ו-`git log --oneline -3` מראה commits.

למשוך branch או tag ספציפיים כבר בשלב ה-clone:

```bash title="runs on: any shell"
git clone --branch <BRANCH> git@<GITLAB_HOST>:<GROUP>/<REPO>.git
```

## לראות איפה אני: status, branch, remotes

```bash title="runs on: any shell"
git status -sb
git branch --show-current
git remote -v
git branch -vv
```

`git status -sb` נותן שורה ראשונה כמו `## main...origin/main [behind 1]` ואחריה קבצים ששונו. `git branch -vv` מראה לכל branch מול איזה remote branch הוא עוקב ואם הוא `ahead`/`behind`.

| פלט | משמעות |
|---|---|
| ` M file` | שונה, לא ב-staging |
| `M  file` | שונה וב-staging (יכנס ל-commit) |
| `??  file` | קובץ חדש שגיט לא עוקב אחריו |
| `[ahead 1]` | יש commit מקומי שלא נדחף |
| `[behind 1]` | יש commit ב-remote שלא משכת |

## לשמור שינוי: add, commit, push

```bash title="runs on: any shell"
git add <FILE>
git commit -m "describe the change"
git push
```

`git add -A` מוסיף הכול (כולל קבצי זבל). עדיף קבצים בשמם, או `git add -p` כדי לבחור חלקים. `git commit -am "msg"` מדלג על `add`, אבל **רק לקבצים שכבר במעקב**.

**איך מוודאים:** `git status -sb` ללא `ahead`, ו-`git log --oneline -1` מראה את ההודעה. ב-GitLab ה-commit מופיע ב-repo.

:::caution[מלכודת]
`git push` ללא ארגומנטים דוחף **רק את ה-branch הנוכחי**. כמה branches או tag: ראה [branches](../branches/).
:::

## לראות מה השתנה: log ו-diff

```bash title="runs on: any shell"
git log --oneline --graph --decorate --all -15
git diff
git diff --staged
git diff origin/main
git show <SHA> --stat
git log -p -- <FILE>
```

| פקודה | מראה |
|---|---|
| `git diff` | שינויים שעוד לא ב-staging |
| `git diff --staged` | מה ייכנס ל-commit הבא |
| `git diff origin/main` | הפער בין העבודה שלך לבין מה שה-remote הכיר בפעם האחרונה |
| `git log --oneline HEAD..origin/main` | commits שיש ב-remote ואין אצלך |
| `git show <SHA> --stat` | commit אחד: הודעה + קבצים |

## לבדוק מה קרה ל-repo לפני שאני עורך

לפני כל עריכה ב-repo שה-CI כותב אליו (כמו gitops):

```bash title="runs on: any shell"
git pull
git status -sb
```

**איך מוודאים:** `## main...origin/main` בלי `ahead` או `behind`. אם `git pull` נכשל, עבור ל-[sync](../sync/).

:::tip[עיקרון]
ה-clone המקומי הוא עותק ישן עד שמשכת. "השינוי של ה-CI לא מופיע אצלי" פירושו כמעט תמיד: לא עשית `git pull`.
:::
