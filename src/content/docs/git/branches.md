---
title: Git — branches ו-tags
description: ליצור branch, לעבור בין branches, לדחוף כמה branches ו-tags, ולהבין tracking.
sidebar:
  label: "branches ו-tags"
  order: 2
---

:::note[בקצרה]
`branch` ו-`tag` הם שניהם מצביעים ל-commit. branch **זז** עם כל commit חדש, tag **נשאר**. בפרויקט GitOps זה ההבדל בין
`targetRevision: main` (עוקב) ל-`targetRevision: v1.0.0` (נעוץ). בדף הזה: יצירה, מעבר, דחיפה (כולל כמה בבת אחת), tags ו-tracking.
:::

## ליצור branch חדש ולעבור אליו

```bash title="runs on: any shell"
git switch -c <BRANCH>
```

יוצר branch מה-commit הנוכחי ועובר אליו. מתחילים מנקודה אחרת (commit, tag, branch אחר):

```bash title="runs on: any shell"
git switch -c <BRANCH> <SHA>
git switch -c <BRANCH> origin/main
git switch -c <BRANCH> origin/<BRANCH>
git branch <BRANCH> <SHA>
```

השורה לפני האחרונה יוצרת מקומי שעוקב אחרי branch שקיים ב-remote (אחרי `fetch`). האחרונה יוצרת branch **בלי** לעבור אליו.

**איך מוודאים:** `git branch --show-current` מדפיס את השם, `git branch -vv` מראה אותו.

## לעבור בין branches

```bash title="runs on: any shell"
git switch <BRANCH>
git switch -
```

`git switch -` חוזר ל-branch הקודם. אם יש שינויים לא שמורים שמתנגשים, git מסרב: או `commit`, או `git stash` ([undo](../undo/#לשים-שינויים-בצד-זמנית-stash)).

להביא branch שקיים רק ב-remote:

```bash title="runs on: any shell"
git fetch origin
git switch <BRANCH>
```

אם השם קיים רק ב-`origin`, `git switch` יוצר מקומי שעוקב אחריו אוטומטית.

**איך מוודאים:** `git status -sb` מציג `## <BRANCH>...origin/<BRANCH>`.

## לדחוף branch חדש ל-GitLab (push -u)

```bash title="runs on: any shell"
git push -u origin <BRANCH>
```

`-u` (`--set-upstream`) קושר את ה-branch המקומי לזה שב-remote, ומעכשיו `git push` ו-`git pull` פועלים בלי ארגומנטים.

**איך מוודאים:** ההודעה `Branch '<BRANCH>' set up to track remote branch '<BRANCH>' from 'origin'.` וב-GitLab ה-branch מופיע ברשימה.

## לדחוף כמה branches בבת אחת

:::caution[מלכודת · קרה בתרגול]
`git push` דוחף **רק את ה-branch שעומדים עליו**. יצרת `poc` ו-`dev`, דחפת פעם אחת, וה-branch השני לא הגיע ל-GitLab, כך ש-Argo ו-CI לא ראו אותו.
:::

```bash title="runs on: any shell"
git push -u origin poc dev
```

כל השמות אחרי `origin` נדחפים. כל ה-branches המקומיים: `git push --all origin` (בדוק קודם עם `git branch`, זה דוחף גם ניסויים).

**איך מוודאים:** `git ls-remote --heads origin` מציג את כל ה-branches שב-GitLab.

## לדחוף branch מקומי ל-branch אחר ב-remote

```bash title="runs on: any shell"
git push origin <BRANCH>:main
git push origin HEAD:<BRANCH>
```

מבנה: `<local>:<remote>`. `HEAD:<BRANCH>` דוחף את ה-commit הנוכחי ל-branch בשם הזה (ויוצר אותו אם אינו קיים).
דחיפה ל-`main` תיכשל אם `main` כבר התקדם: ראה [sync](../sync/#ה-push-נדחה-rejected-non-fast-forward).

## ליצור tag ולדחוף אותו

```bash title="runs on: any shell"
git tag <TAG>
git tag -a <TAG> -m "release message"
git tag <TAG> <SHA>
git push origin <TAG>
```

`git tag <TAG>` = tag **קל** (lightweight): רק שם על ה-commit הנוכחי. `-a` = tag **annotated**: אובייקט עם הודעה, מחבר ותאריך (`git show <TAG>` מציג אותם). שניהם נדחפים באותה פקודה. הוספת `<SHA>` מסמנת commit ישן.

:::caution[מלכודת · קרה בתרגול]
`git push` **לא** דוחף tags. בלי `git push origin <TAG>` ה-tag קיים רק אצלך, ו-Argo עם `targetRevision: <TAG>` לא ימצא אותו. כל ה-tags: `git push origin --tags`.
:::

**איך מוודאים:** `git ls-remote --heads --tags origin` מציג `refs/tags/<TAG>` (ל-annotated יופיע גם `<TAG>^{}` עם ה-commit עצמו) ואת כל ה-branches.

## לראות, למחוק ולעבור ל-tag

```bash title="runs on: any shell"
git tag -l
git tag -n
git show <TAG> --stat
git tag -d <TAG>
git push origin --delete <TAG>
```

`git tag -d` מוחק מקומית בלבד. `git push origin --delete <TAG>` מוחק מ-GitLab. לבדוק את הקוד כפי שהיה ב-tag: `git switch --detach <TAG>` (ראה [undo](../undo/#לבדוק-commit-ישן-detached-head)).

## להבין branch מול tag בשלוש שורות

| | branch | tag |
|---|---|---|
| זז עם commit חדש | כן | לא |
| שימוש ב-GitOps | `targetRevision: main` (values) | `targetRevision: <TAG>` (templates) |
| נדחף עם `git push` | רק הנוכחי | אף פעם (`git push origin <TAG>`) |

## לראות tracking: מי מקביל למי

```bash title="runs on: any shell"
git branch -vv
git branch -u origin/<BRANCH>
git remote show origin
```

`git branch -u origin/<BRANCH>` מקשר branch קיים (כשדחפת בלי `-u`). `git remote show origin` מציג גם branches שנמחקו ב-remote. לנקות הפניות מתות: `git fetch --prune`.

## למחוק ולשנות שם של branch

```bash title="runs on: any shell"
git branch -d <BRANCH>
git branch -D <BRANCH>
git branch -m <BRANCH> new-name
git push origin --delete <BRANCH>
```

`-d` מסרב אם ה-branch לא מוזג (`not fully merged`). `-D` מוחק בכוח: הקומיטים נשארים ב-`git reflog`. אי אפשר למחוק את ה-branch שעומדים עליו.

## למזג branch ל-main

```bash title="runs on: any shell"
git switch main
git pull
git merge --ff-only <BRANCH>
git push
```

`--ff-only` מתקדם רק אם `main` הוא אב קדמון ישיר של `<BRANCH>`, כלומר `main` מקבל בדיוק את ה-commits שנבדקו ב-`<BRANCH>`. אחרת נכשל (ראה [sync](../sync/#merge---ff-only-נכשל-diverged)).

**איך מוודאים:** `git log --oneline -3` על `main` מציג את אותו `<SHA>` כמו ב-`<BRANCH>`: `git rev-parse main <BRANCH>` מדפיס שורה זהה פעמיים.
