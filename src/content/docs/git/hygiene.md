---
title: Git — היגיינה לפני commit
description: .gitattributes ו-CRLF, רווחים בסוף שורה, בדיקת status לפני --hard, .gitignore ו-[skip ci].
sidebar:
  order: 5
---

:::note[בקצרה]
רוב הכשלים ה"טיפשיים" נובעים מרווח בסוף שורה (במיוחד אחרי `\`), מסיומות שורה של Windows (CRLF) בסקריפטים, או מקובץ זבל שנכנס ל-commit.
הדף הזה הוא רשימת בדיקות קצרה לפני `git commit` ולפני `git push`.
:::

## לבדוק רווחים בסוף שורה ו-CRLF לפני commit

הרווח שאחרי `\` בשורת המשך שבר סקריפטים שלוש פעמים באותה ישיבה. `git diff --check` מוצא אותם לפני שהם נכנסים.

```bash title="runs on: any shell"
git diff --check
git diff --cached --check
grep -rnP ' +$' <FILE>
cat -A <FILE> | grep -n ' \$$'
```

`--check` בודק שינויים לא-staged, `--cached --check` את מה שב-staging. קובץ עם CRLF יסומן גם הוא כ-trailing whitespace. ב-`cat -A` סוף שורה הוא `$`, ו-` $` (רווח לפניו) הוא הבעיה.

**איך מוודאים:** הפקודה לא מדפיסה כלום ו-exit code 0 (`echo $?`).

לתקן רווחים בסוף שורה בקובץ:

```bash title="runs on: any shell"
sed -i 's/[ \t]*$//' <FILE>
```

## קובץ עם CRLF (^M) שובר סקריפט

הסימפטום ב-`bash`: `\r: command not found` או `bad interpreter: /bin/bash^M`. הסיבה: הקובץ נשמר עם `\r\n`.

```bash title="runs on: any shell"
git ls-files --eol
grep -rlP '\r$' . --include='*.sh' --exclude-dir=.git
sed -i 's/\r$//' <FILE>
```

ב-`git ls-files --eol` העמודה `w/crlf` מראה שהעותק בדיסק CRLF. `sed` מסיר את `\r`.

**איך מוודאים:** `cat -A <FILE>` מציג `$` ללא `^M`, ו-`bash -n <FILE>` שותק. קישור: [debugging env-cards](../../debugging/env-cards/).

## למנוע CRLF קבוע עם .gitattributes

```text title="file: .gitattributes"
* text=auto
*.sh text eol=lf
*.yaml text eol=lf
*.yml text eol=lf
```

אחרי יצירת הקובץ, לנרמל קבצים קיימים:

```bash title="runs on: any shell"
git add --renormalize .
git status -s
git commit -m "normalize line endings"
```

אפשר גם הגדרה ברמת המכונה: `git config --global core.autocrlf input` (ממיר CRLF ל-LF ב-commit, לא נוגע בהמשך).

**איך מוודאים:** `git ls-files --eol` מציג `i/lf` לכל הקבצים, ו-`attr/text eol=lf` בקבצים שהוגדרו.

## לבדוק git status לפני reset --hard או clean

:::danger[זהירות]
`git reset --hard` ו-`git clean -fd` מוחקים קבצים לא-שמורים **בלי reflog** (ל-`clean` אין שחזור בכלל).
:::

```bash title="runs on: any shell"
git status
git stash
git clean -nd
```

המצב הבטוח: `git status` נקי, או `git stash` (ואפשר לשחזר), ו-`clean -n` לפני `-f`.

**איך מוודאים:** `git status` מציג `nothing to commit, working tree clean`.

## לא לכלול קבצי זבל: .gitignore

```text title="file: .gitignore"
*.tmp
*.log
.env
*.key
```

קובץ שכבר נכנס ל-commit לא נעלם מ-`.gitignore`. להוציא מהמעקב (בלי למחוק מהדיסק):

```bash title="runs on: any shell"
git rm --cached <FILE>
git commit -m "stop tracking <FILE>"
git check-ignore -v <FILE>
```

:::danger[זהירות]
token, מפתח פרטי ו-`.env` לעולם לא נכנסים ל-commit. אם נכנס: לבטל ולהחליף אותו (revoke ב-GitLab), כי הערך נשאר בהיסטוריה גם אחרי מחיקה.
:::

**איך מוודאים:** `git check-ignore -v <FILE>` מדפיס את הכלל שמתאים.

## להוסיף [skip ci] להודעת commit

```bash title="runs on: any shell"
git commit -m "update docs [skip ci]"
```

GitLab לא מריץ pipeline ל-commit שבהודעה שלו `[skip ci]`. שימושי בעיקר ל-commit שנכתב **על ידי אוטומציה** שדוחפת ל-repo שה-CI עצמו מאזין לו, כדי למנוע לולאה (CI דוחף, מפעיל CI, דוחף...).

**איך מוודאים:** `git log -1 --format=%s` מציג את ההודעה עם התג, ובעמוד Pipelines ב-GitLab לא נוצר pipeline חדש ל-commit הזה.

## לבדוק שהזהות נכונה על ה-commit

```bash title="runs on: any shell"
git config user.name
git config user.email
git log -1 --format='%an <%ae>'
git commit --amend --reset-author --no-edit
```

השורה האחרונה מתקנת את המחבר ב-commit האחרון (אם עוד לא נדחף).

## צ'קליסט לפני push

```bash title="runs on: any shell"
git status -sb
git diff --cached --check
git log --oneline origin/main..HEAD
git push
```

שורה 1: אין קבצים לא צפויים. שורה 2: אין רווחים או CRLF. שורה 3: בדיוק ה-commits שאתה מתכוון לדחוף. אם ה-push נדחה: `git pull --rebase` ושוב `git push` ([sync](../sync/#ה-push-נדחה-rejected-non-fast-forward)).

**איך מוודאים:** אחרי `push`, `git status -sb` ללא `ahead`.
