---
title: Git — סנכרון מול GitLab
description: fetch מול pull, merge --ff-only, אבחון divergence, דחיפה ל-branch ספציפי, ומתי אסור force-push.
sidebar:
  order: 3
---

:::note[בקצרה]
ה-CI כותב ל-GitLab בזמן שאתה עורך מקומית, ולכן ה-clone שלך נעשה ישן והיסטוריות מתפצלות. כאן: איך לראות את המצב לפני שנוגעים, איך
למשוך, מה עושים כשה-`push` נדחה או כש-`merge --ff-only` נכשל, ולמה `--force` מסוכן בדיוק ב-repo שה-CI כותב אליו.
:::

## לבדוק אם ה-clone שלי ישן (fetch)

`git fetch` מוריד commits ומעדכן את `origin/*` **בלי לגעת בקבצים שלך**. בטוח תמיד.

```bash title="runs on: any shell"
git fetch
git status -sb
git log --oneline HEAD..origin/main
git rev-list --left-right --count HEAD...origin/main
```

הפלט של `rev-list`: שני מספרים, `<ahead> <behind>`. `0 1` = יש commit אחד ב-remote שאין אצלך. `1 1` = התפצלות.

**איך מוודאים:** `## main...origin/main [behind 1]` ב-`status -sb`, והשורה `HEAD..origin/main` מציגה את ה-commit של ה-CI.

:::note
`origin/main` הוא מצביע **מקומי** על מה ש-GitLab הכיר בפעם האחרונה. רק `fetch` (או `pull`) מעדכן אותו.
:::

## למשוך שינויים לפני עריכה: pull

```bash title="runs on: any shell"
git pull
```

:::caution[מלכודת · קרה בתרגול]
ה-CI דחף commit ל-gitops, והסטודנט אמר "השינויים של ה-CI לא מעודכנים בקלאסטר". הבעיה לא בקלאסטר: **ה-clone המקומי נשאר מאחור**. Argo קורא מ-GitLab. הרגל: `git pull` לפני כל עריכה.
:::

:::caution[מלכודת · קרה בתרגול]
"האם pull לא ידרוס לי שינויים מקומיים?" לא. `pull` = `fetch` + `merge`, וכשיש חפיפה git **מסרב** (`Your local changes ... would be overwritten by merge`, `Aborting`) במקום להרוס. בלי חפיפה (CI נגע ב-`versions/<ENV>.yaml`, אתה ב-values) ה-`pull` עובר גם עם שינויים לא שמורים.
:::

אם הוא מסרב: `git stash`, `git pull`, `git stash pop` (ראה [undo](../undo/#לשים-שינויים-בצד-זמנית-stash)).

## טבלה: fetch, pull ו-merge --ff-only

| פקודה | מה עושה | מתי |
|---|---|---|
| `git fetch` | מוריד, מעדכן `origin/*`, לא נוגע בקבצים | להסתכל לפני החלטה |
| `git pull` | `fetch` + merge לתוך ה-branch הנוכחי | ברירת מחדל כשהכול נקי |
| `git merge --ff-only origin/main` | מתקדם רק אם אפשר "להזיז מצביע"; אחרת נכשל | כשרוצים בדיקה שאין התפצלות |
| `git pull --rebase` | `fetch` + הצבת ה-commits המקומיים **מעל** ה-remote | כשיש commit מקומי ורוצים היסטוריה ישרה |

הגדרה קבועה שמונעת merge commits בטעות: `git config --global pull.ff only`.

## merge --ff-only נכשל (diverged)

הסימפטום: `fatal: Not possible to fast-forward, aborting.` או `Your branch and 'origin/main' have diverged`.

```bash title="runs on: any shell"
git fetch
git status -sb
git log --oneline --graph --all -10
git log --oneline origin/main..HEAD
git log --oneline HEAD..origin/main
```

`origin/main..HEAD` = commits **שלך** שלא נדחפו. `HEAD..origin/main` = commits **שלהם** שלא משכת. הסיבה כתובה בפלט של git עצמו (שורה 2 של `status`: `have 1 and 1 different commits each`).

:::caution[מלכודת · קרה בתרגול]
`merge --ff-only` נכשל כי `main` המקומי היה **לפני** `origin/main` ב-commit תועה אחד (`"check runner"`, קובץ `test.txt` מבדיקת ה-runner, שלא נדחף). בלי להסתכל ב-`git log --oneline origin/main..HEAD` נראה כאילו "משהו שבור".
:::

אפשרויות הטיפול, לפי מה שרואים ב-`origin/main..HEAD`:

| המצב | הפעולה |
|---|---|
| ה-commit התועה לא נחוץ | `git reset --hard origin/main` (ראה סכנה למטה) |
| ה-commit שלך נחוץ | `git pull --rebase`, ואז `git push` |
| רוצה לשמור אותו בצד | `git branch backup` לפני כל reset |

:::danger[זהירות]
`git reset --hard` זורק שינויים לא שמורים. לפני: `git status` נקי, ו-`git branch backup` לשמירת ה-commit. גם בלי backup ה-commit שורד ב-`git reflog` (ברירת המחדל: לפחות 30 יום) ([undo](../undo/#לשחזר-commit-שאבד-reflog)).
:::

```bash title="runs on: any shell"
git branch backup
git reset --hard origin/main
```

**איך מוודאים:** `git status -sb` מציג `## main...origin/main` נקי, `git log --oneline -3` זהה ל-GitLab.

:::tip[עיקרון]
הארגומנט של `reset` הוא **היעד** (לאן להעביר את ה-branch), לא ה-commit שרוצים "להיפטר" ממנו. `git reset --hard e5a39e5` כשאתה כבר על `e5a39e5` לא עושה כלום.
:::

## ה-push נדחה: rejected (non-fast-forward)

```text title="runs on: any shell"
 ! [rejected]        main -> main (non-fast-forward)
hint: Updates were rejected because the tip of your current branch is behind
```

פירוש: ב-GitLab יש commits שאין אצלך. **לא** לתקן עם `--force`. משוך, ואז דחוף:

```bash title="runs on: any shell"
git pull --rebase
git push
```

`--rebase` מניח את ה-commits שלך מעל מה ש-CI כתב. אם יש קונפליקט: תקן את הקבצים, `git add <FILE>`, `git rebase --continue`. לוותר: `git rebase --abort`.

**איך מוודאים:** `git push` מסתיים ב-`main -> main` ללא `rejected`, ו-`git status -sb` נקי.

## למה אסור --force כאן (ומה זה --force-with-lease)

:::danger[זהירות]
`git push --force` מחליף את ה-branch ב-GitLab בגרסה שלך. ב-gitops זה **מוחק את ה-commit של ה-CI**, מחזיר את ה-tag של ה-candidate לערך הישן (או `""`) והרינדור נשבר.
:::

:::caution[מלכודת · קרה בתרגול]
בדיוק זה היה קורה כאן: `--force` היה מוחק את commit ה-promote של ה-CI ומחזיר את `defaultImageTag` ל-`""`.
:::

אם באמת חייבים לשכתב branch **שלך** (למשל אחרי `commit --amend` על branch שדחפת):

```bash title="runs on: any shell"
git push --force-with-lease origin <BRANCH>
```

`--force-with-lease` נכשל אם מישהו (כמו ה-CI) דחף מאז ה-`fetch` האחרון שלך. שימוש: רק על branch פרטי, אף פעם על `main` של gitops. protected branch ב-GitLab ממילא חוסם force.

## לדחוף branch ספציפי או commit ספציפי (HEAD:main)

```bash title="runs on: any shell"
git push origin <BRANCH>
git push origin HEAD:<BRANCH>
git push origin <SHA>:refs/heads/<BRANCH>
```

השורה השלישית דוחפת commit נתון כ-branch חדש. מצב detached HEAD ([undo](../undo/#לבדוק-commit-ישן-detached-head)) דוחפים רק עם `HEAD:<BRANCH>`.

## לוודא ש-GitLab באמת קיבל (unpushed = invisible)

:::caution[מלכודת · קרה בתרגול]
בתחילת תחנה 5 שינויי Helm עדיין היו רק מקומיים. Argo קורא מ-GitLab בלבד, אז מבחינתו הם **לא קיימים**: אפליקציה אדומה בגלל קוד שלא נדחף.
:::

```bash title="runs on: any shell"
git fetch
git status -sb
git ls-remote origin <BRANCH>
git rev-parse HEAD
```

**איך מוודאים:** ה-sha מ-`ls-remote` זהה ל-`git rev-parse HEAD`, ואין `ahead` ב-status.

## כתובות: SSH מול HTTPS

| שימוש | כתובת |
|---|---|
| clone ידני עם key | `git@<GITLAB_HOST>:<GROUP>/<REPO>.git` |
| CI / Argo עם token | `https://oauth2:${TRIDENT_GIT_TOKEN}@<GITLAB_HOST>/<GROUP>/<REPO>.git` (ה-token ממשתנה CI, אף פעם לא ערך גלוי) |

פירוט ב-[ssh](../../ssh/overview/#clone-ב-https-עם-token-oauth2). לשנות כתובת של remote קיים: `git remote set-url origin git@<GITLAB_HOST>:<GROUP>/<REPO>.git`.
