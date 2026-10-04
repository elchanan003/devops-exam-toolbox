---
title: Git — לבטל, לחזור אחורה ולשחזר
description: restore, amend, reset soft/mixed/hard, revert, reflog, חזרה ל-commit ישן, cherry-pick ו-stash.
sidebar:
  order: 4
---

:::note[בקצרה]
כמעט כל טעות ב-Git ניתנת לתיקון, אם בוחרים את הכלי לפי **איפה** הטעות: בקובץ שלא נשמר (`restore`), ב-commit האחרון (`amend`), ב-commit מקומי (`reset`),
או ב-commit שכבר נדחף (`revert`). ואם הכול נראה אבוד: `reflog`. התחל מהחירום.
:::

## חירום: שלוש פקודות הצלה

| המצב | פקודה |
|---|---|
| "הרסתי משהו, איפה ה-commit שהיה?" | `git reflog` ואז `git reset --hard <SHA>` |
| "ביצעתי `reset` או `commit` לא נכון (מקומי)" | `git reset --hard 'HEAD@{1}'` |
| "ה-commit כבר נדחף ומקלקל" | `git revert --no-edit <SHA>` ואז `git push` |

```bash title="runs on: any shell"
git reflog
git reset --hard 'HEAD@{1}'
git revert --no-edit <SHA>
git push
```

הרגל לפני כל `--hard`: `git status` נקי. מי שכבר דחף: **רק `revert`**, אף פעם לא `reset` + `--force` ([sync](../sync/#למה-אסור-force-כאן-ומה-זה-force-with-lease)).

## להחזיר קובץ למצב של ה-commit האחרון (restore)

```bash title="runs on: any shell"
git restore <FILE>
```

זורק את השינויים הלא-שמורים בקובץ. אין חזרה: הם לא היו ב-commit.

**איך מוודאים:** `git status -s` לא מציג את הקובץ.

## להוציא קובץ מ-staging (unstage)

```bash title="runs on: any shell"
git restore --staged <FILE>
```

הקובץ נשאר ערוך בדיסק, רק לא ייכנס ל-commit. (הצורה הישנה: `git reset HEAD <FILE>`.)

**איך מוודאים:** `git status -s` עובר מ-`M ` ל-` M`.

## להחזיר קובץ לגרסה של commit ישן

```bash title="runs on: any shell"
git restore --source=<SHA> <FILE>
git restore --source=<SHA> --staged --worktree <FILE>
git checkout <SHA> -- <FILE>
```

הראשונה משנה רק את הקובץ בדיסק. השנייה גם את ה-staging. השלישית (הצורה הישנה) עושה את שניהם. אחר כך `git commit` כרגיל.

**איך מוודאים:** `git diff <SHA> -- <FILE>` ריק.

## לתקן את ההודעה או התוכן של ה-commit האחרון (amend)

```bash title="runs on: any shell"
git commit --amend -m "better message"
git add <FILE>
git commit --amend --no-edit
```

השורה השנייה והשלישית מוסיפות קובץ שנשכח ל-commit האחרון בלי לשנות הודעה. **amend יוצר commit חדש עם `<SHA>` חדש.**

:::danger[זהירות]
אל תעשה `amend` על commit שכבר נדחף: ה-push הבא יידחה (`non-fast-forward`) ותתפתה ל-`--force`. אם כבר נדחף, צור commit תיקון חדש.
:::

**איך מוודאים:** `git log --oneline -2` מציג את ההודעה החדשה ו-`git show --stat` את הקבצים.

## לתקן commit ישן יותר (fixup + rebase -i)

```bash title="runs on: any shell"
git add <FILE>
git commit --fixup=<SHA>
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash <SHA>~1
```

`--fixup` יוצר commit שמסומן "לצרף ל-`<SHA>`", ו-`rebase -i --autosquash` מצרף אותו אוטומטית. ה-`GIT_SEQUENCE_EDITOR=true` מדלג על העורך. בלי המשתנה ייפתח עורך: שמור וסגור.
לשנות הודעה של commit ישן: `git rebase -i <SHA>~1`, ושנה `pick` ל-`reword`. אם הסתבכת: `git rebase --abort`.
זה משכתב היסטוריה: **רק על commits שלא נדחפו**.

**איך מוודאים:** `git log --oneline` מציג commit אחד פחות, ו-`git show --stat <SHA>` (ה-`<SHA>` החדש) כולל את התיקון.

## טבלה: reset מול revert מול restore

| פקודה | מה זז | מה קורה לשינויים | נדחף כבר? |
|---|---|---|---|
| `git reset --soft <SHA>` | רק מצביע ה-branch | נשארים ב-staging | לא |
| `git reset --mixed <SHA>` (ברירת מחדל) | branch + staging | נשארים בקבצים, לא ב-staging | לא |
| `git reset --hard <SHA>` | branch + staging + קבצים | **נמחקים** | לא |
| `git revert <SHA>` | מוסיף commit חדש שמבטל | היסטוריה נשמרת | **כן** |
| `git restore <FILE>` | רק קובץ | לא נוגע ב-branch | לא רלוונטי |

שלוש השכבות: `--soft` מזיז את ה-branch, `--mixed` גם מאפס את ה-staging, `--hard` גם את הקבצים.

## לחזור commit אחד אחורה ולשמור את העבודה (reset --soft / --mixed)

```bash title="runs on: any shell"
git reset --soft HEAD~1
git reset HEAD~1
```

הראשונה: ה-commit "מתבטל" והשינויים נשארים מוכנים ב-staging (טוב לצרף commits). השנייה (`--mixed`): השינויים בקבצים אבל לא ב-staging. `HEAD~1` = ה-commit שלפני האחרון.

**איך מוודאים:** `git status -s` מציג את הקבצים, `git log --oneline` קצר ב-commit אחד.

## לחזור ל-commit ישן ולזרוק את כל מה שאחריו (reset --hard)

:::danger[זהירות]
`--hard` מוחק שינויים לא שמורים בקבצים. קודם `git status`, ו-`git branch backup` אם יש ספק.
:::

```bash title="runs on: any shell"
git status
git branch backup
git reset --hard <SHA>
```

:::caution[מלכודת · קרה בתרגול]
הארגומנט הוא **היעד**: לאן ה-branch יעבור. `git reset --hard e5a39e5` כשכבר עומדים על `e5a39e5` הוא no-op (לא עושה כלום). רוצה להיפטר מהתועה, ציין את ה-commit **שלפניו** (`HEAD~1`) או את `origin/main`.
:::

**איך מוודאים:** `git log --oneline -1` מציג את `<SHA>`, ו-`git status -s` נקי.

## לבטל commit שכבר נדחף (revert)

`revert` לא משכתב היסטוריה: הוא מוסיף commit חדש שהפוך לישן, ולכן בטוח גם ב-`main` ששותף עם ה-CI.

```bash title="runs on: any shell"
git revert --no-edit <SHA>
git push
```

לבטל את ה-commit האחרון: `git revert --no-edit HEAD`. טווח: `git revert --no-edit <SHA>~1..HEAD` (מבטל כל אחד בנפרד). על merge commit צריך לבחור הורה: `git revert -m 1 <SHA>`.

**איך מוודאים:** `git log --oneline -2` מציג `Revert "..."`, והקובץ חזר לתוכן הקודם (`git show --stat HEAD`).

:::tip[עיקרון]
Rollback ב-GitOps הוא `git revert` + `push`, לא תיקון חי בקלאסטר: Argo עם selfHeal יחזיר את מה שב-Git.
:::

## לשחזר commit שאבד (reflog)

`reflog` הוא יומן של כל מקום ש-HEAD ביקר בו, כולל אחרי `reset --hard`. commit "אבוד" שורד בו לפחות 30 יום (ברירת המחדל של git).

```bash title="runs on: any shell"
git reflog
git branch rescue <SHA>
git reset --hard <SHA>
```

השורה השנייה יוצרת branch ב-commit האבוד בלי לשנות כלום (הדרך הבטוחה). השלישית מחזירה את ה-branch הנוכחי אליו. מקצר: `'HEAD@{1}'` = המקום הקודם. כל שורה ביומן נראית `<SHA> HEAD@{n}: <פעולה>`.

**איך מוודאים:** `git log --oneline -3` על `rescue` מציג את ה-commit שחיפשת.

למצוא commit שאפילו אין עליו הפניה: `git fsck --lost-found`.

## לבדוק commit ישן (detached HEAD)

```bash title="runs on: any shell"
git switch --detach <SHA>
git switch --detach <TAG>
git switch -
```

מצב `detached HEAD` = אתה על commit בלי branch. מסתכלים, מריצים, ו-`git switch -` חוזר. **אם עשית שם commits שרוצים לשמור**, צור branch לפני שיוצאים:

```bash title="runs on: any shell"
git switch -c <BRANCH>
```

**איך מוודאים:** `git status` אומר `HEAD detached at <SHA>`. אחרי יציאה ללא branch, ה-commits נשארים רק ב-`reflog`.

:::note
`git checkout <SHA>` עושה אותו דבר, אבל `switch` / `restore` ברורים יותר: `switch` זז, `restore` משנה קבצים.
:::

## להעביר commit בודד מ-branch אחד לאחר (cherry-pick)

```bash title="runs on: any shell"
git switch <BRANCH>
git cherry-pick <SHA>
```

מעתיק את השינוי של `<SHA>` כ-commit **חדש** (עם `<SHA>` אחר) מעל ה-branch הנוכחי. קונפליקט: תקן, `git add <FILE>`, `git cherry-pick --continue`; לוותר: `git cherry-pick --abort`.

**איך מוודאים:** `git log --oneline -2` מציג את ההודעה של ה-commit שהועתק.

## לשים שינויים בצד זמנית (stash)

```bash title="runs on: any shell"
git stash
git stash push -m "wip" -- <FILE>
git stash list
git stash pop
git stash drop
```

`stash` שומר שינויים לא-commited ומחזיר את העבודה למצב נקי (אפשר אז `pull`, `switch`). `pop` מחזיר ומוחק את ה-stash, `drop` מוחק בלי להחזיר. קבצים חדשים (`??`) דורשים `git stash -u`.

**איך מוודאים:** `git status -s` נקי אחרי `stash`, והשינויים חוזרים אחרי `pop`.

## למחוק קבצים לא-עוקבים (clean)

```bash title="runs on: any shell"
git clean -nd
git clean -fd
```

`-n` מראה מה יימחק ("dry run") ו-`-f` מוחק בפועל. תמיד `-n` קודם: מה שנמחק כאן אין לו reflog.
