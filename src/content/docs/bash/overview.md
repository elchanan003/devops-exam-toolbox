---
title: Bash בסיסי
description: מה צריך לדעת ב-bash כדי לכתוב ולתקן scripts של bootstrap ו-promotion, כל מושג עם דוגמה קצרה והמלכודת שלו.
sidebar:
  order: 1
---

:::note[בקצרה]
הדף מלמד את ה-bash שה-scripts של הפרויקט משתמשים בו, לפי דוגמאות. כל כותרת היא מושג אחד: דוגמה של 2–5 שורות והמלכודת שלו.
Scripts מוכנים להעתקה: [templates](../templates/). חלקים קטנים לשימוש חוזר: [snippets](../snippets/).
:::

## shebang ו-`set -euo pipefail`

כל script מתחיל בשתי שורות, ומשם ממשיכים לכתוב.

```bash title="file: scripts/example.sh"
#!/usr/bin/env bash
set -euo pipefail
```

| דגל | משמעות | בלעדיו |
|---|---|---|
| `-e` | ה-script נעצר בפקודה הראשונה שנכשלה (exit code שונה מ-0) | ה-script ממשיך אחרי כישלון |
| `-u` | משתנה לא מוגדר הוא שגיאה | משתנה לא מוגדר הופך למחרוזת ריקה בשקט |
| `-o pipefail` | pipeline נכשל אם **כל** שלב בו נכשל | נבחר רק ה-exit code של השלב האחרון |

```bash title="runs on: any shell"
set -o pipefail; false | true; echo "rc=$?"   # rc=1 (without pipefail: rc=0)
bash -c 'set -u; echo "$UNSET_VAR"'            # bash: UNSET_VAR: unbound variable
```

:::note
Scripts שסופרים כישלונות (verify) משתמשים ב-`set -uo pipefail` **בלי** `-e`, כדי שכישלון אחד לא יעצור את הריצה. ראה [verify-script](../verify-script/).
:::

## exit codes: 0 = הצלחה

כל פקודה מחזירה מספר. `0` אומר "הצליח" (או "אין מה לשנות"), כל מספר אחר אומר "נכשל" או "מצאתי הבדל". אחרי הפקודה, `$?` מחזיק את המספר.

```bash title="runs on: any shell"
git diff --cached --quiet; echo "rc=$?"   # rc=0: nothing staged, no difference
echo x > f; git add f
git diff --cached --quiet; echo "rc=$?"   # rc=1: there IS a staged change
```

:::caution[מלכודת · קרה בתרגול]
הסימון של 0 ו-1 התהפך: "1 = הצליח". ב-`git diff --quiet` זה מבלבל במיוחד: **0 = אין הבדל, 1 = יש הבדל**. כלל לזכור: `0` הוא תמיד "בסדר", גם כש"בסדר" אומר "אין שינוי".
:::

## `if ! cmd` ופטור `set -e` בתנאי

פקודה שנמצאת **בתוך התנאי** של `if` (או לפני `&&` / `||`) פטורה מ-`set -e`: כישלון שלה הוא תשובה, לא תקלה.

```bash title="file: scripts/promote.sh (excerpt)"
git add "$FILE"
if ! git diff --cached --quiet; then      # exit 1 = there is a change
  git commit -q -m "promote($ENV): $CANDIDATE"
  git push -q origin main
fi
git rev-parse HEAD                        # outside the if: always runs
```

```bash title="runs on: any shell"
# WRONG under set -e: a bare diff exits 1 exactly when there IS a change, so the script dies right there
set -e
git diff --cached --quiet
git commit -m "never reached when there is something to commit"
```

:::caution[מלכודת · קרה בתרגול]
בניסוח הראשון נשארה שורה חשופה `git diff --cached --quiet` בלי ה-`if`. התלמיד ניבא נכון: ה-script מת **בדיוק כשיש שינוי**, כלומר כשצריך לעשות commit. אותו פטור עובד גם ב-`grep -q … && { …; }`.
:::

## `&&` ו-`||`

`a && b` מריץ את `b` רק אם `a` הצליחה. `a || b` מריץ את `b` רק אם `a` נכשלה.

```bash title="runs on: any shell"
command -v kubectl >/dev/null || { echo "kubectl not found" >&2; exit 1; }
[ -s "$FILE" ] && echo "non-empty"
```

מלכודת: `a && b || c` אינו `if/else`. אם `b` נכשלה, `c` רצה גם כש-`a` הצליחה. כשצריך שני ענפים, כתוב `if … then … else … fi`.

## pipe ו-`$(...)`

`|` מעביר את הפלט של פקודה לקלט של הבאה. `$(...)` מחליף את עצמו בפלט של הפקודה.

```bash title="runs on: VM"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -
COUNT="$(kubectl get pods -n "$NS" --no-headers | wc -l)"
```

הרעיון בשורה הראשונה: הפקודה השמאלית **מייצרת** YAML, הימנית **מחילה** אותו. ה-`-f -` אומר "קרא מ-stdin".

## `${1:?msg}` — ארגומנט חובה

`$1`, `$2` הם הארגומנטים של ה-script. `${1:?msg}` עוצר עם `msg` אם הארגומנט חסר או ריק.

```bash title="file: scripts/promote.sh (excerpt)"
ENV="${1:?usage: promote.sh <ENV> <CANDIDATE>}"
CANDIDATE="${2:?usage: promote.sh <ENV> <CANDIDATE>}"
```

```text title="output when the 2nd argument is missing"
promote.sh: line 33: 2: usage: promote.sh <ENV> <CANDIDATE>
```

ההודעה היא ה"usage" של ה-script, אז כתוב בה מה חסר. אותו דבר למשתנים מהסביבה: `: "${GITOPS_REPO:?export GITOPS_REPO first}"`.

## `${VAR:-default}` — ערך ברירת מחדל

אם `VAR` לא מוגדר או ריק, מקבלים את ה-default. כך מאפשרים override בלי לערוך את הקובץ.

```bash title="runs on: any shell"
DIR="${TRIDENT_LOCAL_DIR:-$HOME/.local/share/trident}"
bash -c 'echo "${FOO:-dev}"'     # dev
```

`:-` מחליף רק בתוך הביטוי ולא מגדיר את המשתנה.

## `${!NAME}` — משתנה לפי שם

כשהשם של המשתנה עצמו נמצא במשתנה אחר.

```bash title="file: gitops/bootstrap/register-repository.sh (pattern)"
NAME="gitops"
URL_VAR="TRIDENT_$(printf %s "$NAME" | tr a-z A-Z)_URL"   # TRIDENT_GITOPS_URL
REPO_URL="${!URL_VAR:?export $URL_VAR=<your repo URL>}"
```

כשהמשתנה ריק ההודעה נראית כך, והיא מציגה את **שם הפרמטר** (`!URL_VAR`) ואחריו את הטקסט שלך:

```text title="output"
line 22: !URL_VAR: export TRIDENT_GITOPS_URL=<your repo URL>
```

מה שאחרי `export` בהודעה הוא המשתנה שחסר. ראה גם [export מול CI variables](#export-משתנה-רגיל-ו-ci-variable).

## מרכאות: `"$VAR"` תמיד

בלי מרכאות, bash מפצל את הערך על רווחים ומרחיב `*`. עם מרכאות כפולות הערך נשאר מחרוזת אחת.

```bash title="runs on: any shell"
FILE="my file.txt"
ls $FILE      # two arguments: "my" and "file.txt"
ls "$FILE"    # one argument
echo 'single quotes: $FILE stays literal'
```

כלל: `"..."` כשיש משתנה בפנים, `'...'` כשרוצים טקסט מילולי (למשל jsonpath: `-o 'jsonpath={.data.key}'`).

## `export`, משתנה רגיל, ו-CI variable

שלושה מקומות שונים, שלושה כללים. השאלה הקובעת: **איפה ה-script רץ, ומי מגדיר לו את המשתנים**.

| ה-script רץ… | המשתנים מגיעים מ… |
|---|---|
| ב-terminal ב-VM (`bash bootstrap/x.sh`) | `export NAME=value` באותו terminal (וצריך שוב בכל terminal חדש) |
| בתוך job של pipeline | GitLab CI/CD variables ([gitlab/variables](../../gitlab/variables/)) |
| בתוך script אחר שהרצת | רק משתנים שעברו `export` לפני כן (משתנה רגיל לא עובר ל-child process) |

```bash title="runs on: VM"
FOO=1;        bash -c 'echo "plain: [${FOO:-empty}]"'      # plain: [empty]
export FOO;   bash -c 'echo "exported: [${FOO:-empty}]"'   # exported: [1]
echo "[$TRIDENT_GITOPS_URL]"; env | grep TRIDENT_          # is it set in THIS shell?
```

:::caution[מלכודת · קרה בתרגול]
`--install` נכשל עם `!URL_VAR: export TRIDENT_GITOPS_URL=...`, וגם `echo` וגם `env` החזירו ריק. המשתנים הוגדרו כ-GitLab CI/CD variables, והם קיימים **רק בתוך jobs**. הרצה ידנית ב-VM צריכה `export`. התיקון: `export` ב-terminal, ומחיקת ה-variables המיותרים מ-GitLab.
:::

## `read -rs` — קריאת סוד בלי להציג אותו

`-s` שקט (לא מציג מה שמקלידים), `-r` raw (לא מפרש `\` כתו בריחה).

```bash title="runs on: any shell"
read -rs TOKEN          # type the value, press Enter; nothing is shown
printf '\n'
echo 'a\b' | bash -c 'read T;    echo "$T"'   # ab    (backslash eaten)
echo 'a\b' | bash -c 'read -r T; echo "$T"'   # a\b
```

:::caution[מלכודת · קרה בתרגול]
ב-zsh (ברירת המחדל ב-Mac) `read -p "prompt: " VAR` **לא עובד**: `zsh:read:1: -p: no coprocess`, והמשתנה נשאר ריק. ב-bash `-p` הוא prompt. הצורה שעובדת בשניהם: `read -rs VAR` בלי `-p`, והודעה נפרדת עם `printf`. ב-zsh `%` בסוף הפלט אומר "אין newline בסוף".
:::

## `umask 077`, `chmod 600`, `printf '%s'` — קובץ סוד

שלושה דברים נכונים לקובץ שמחזיק token: הרשאות קובץ, הרשאות תיקייה, ותוכן בלי שורה חדשה.

```bash title="runs on: any shell"
umask 077                              # new files 600, new dirs 700
install -d -m 700 "$HOME/.local/share/x"
printf '%s' "$TOKEN" > "$HOME/.local/share/x/token"
chmod 600 "$HOME/.local/share/x/token" # in case the file already existed
```

| ביטוי | תוצאה |
|---|---|
| `echo x > f` | 2 בייטים: `x` + newline |
| `echo -n x > f` | 1 בייט (אבל `-n` לא זהה בכל shell) |
| `printf '%s' x > f` | 1 בייט, בכל shell |

`install -d -m 700 a/b/c` קובע 700 **רק** לתיקייה האחרונה: `a` ו-`a/b` נוצרות 755 אם לא הפעלת `umask 077` ו-`mkdir -p` קודם. ה-script המלא: [credential writer](../templates/#credential-file-writer).

:::caution[מלכודת · קרה בתרגול]
שלוש תקלות בקבצי credential: הקובץ נקרא `user` במקום `username` (ה-script ביקש `username`), הרשאות 664 במקום 600, וקובץ ה-token היה זהה בייט-לבייט לקובץ ה-username (הודבק שם הערך הלא נכון). בדיקה בלי להדפיס תוכן: `stat -c '%a %s %n' <FILE>` ו-`cmp -s <FILE> <FILE>`. וקרא את ה-comment שבראש ה-script כדי לדעת **איך הקובץ צריך להיקרא**.
:::

## רווח אחרי `\` בסוף שורה

`\` בסוף שורה אומר "הפקודה ממשיכה". אם יש אחריו **רווח**, ה-`\` מבריח את הרווח, והשורה נגמרת. השורה הבאה רצה כפקודה נפרדת.

```bash title="runs on: any shell"
printf 'echo a \\ \n  b\n' > t.sh     # a line ending with "\ " (backslash + space)
cat -A t.sh                           # shows:  echo a \ $   <- the space before the $
grep -nE '\\ +$' t.sh                 # finds a backslash followed by spaces at end of line
grep -nE ' +$' t.sh                   # any trailing whitespace
```

:::caution[מלכודת · קרה בתרגול]
רווח אחרי `\` פגע באותו תלמיד שלוש פעמים ב-session אחד. הרגל: לפני ריצה ולפני commit, `grep -nE ' +$' scripts/*.sh` חייב להחזיר ריק.
:::

## `bash -n` — בדיקת syntax בלי להריץ

מפרש את הקובץ ולא מריץ. תופס `if` בלי `fi`, מרכאה פתוחה, סוגריים. לא תופס שם משתנה שגוי או שם פקודה שגוי.

```bash title="runs on: any shell"
bash -n scripts/promote.sh && echo "syntax ok"
bash -n scripts/*.sh                  # all of them; no output = fine
```

```text title="output for a broken file"
bad.sh: line 3: syntax error: unexpected end of file
```

## `sed -i 's/\r$//'` — תיקון CRLF

קובץ שנוצר או הועתק מ-Windows מסיים שורות ב-`\r\n`, ו-bash קורא את ה-`\r` כחלק מהפקודה (שגיאות מוזרות על פקודה תקינה).

```bash title="runs on: any shell"
grep -c $'\r' scripts/example.sh      # > 0 means CRLF is present
sed -i 's/\r$//' scripts/example.sh   # strip the carriage returns in place
chmod +x scripts/example.sh
```

עוד: [git/hygiene](../../git/hygiene/) (`.gitattributes`) ו-[debugging/env-cards](../../debugging/env-cards/).

## להריץ script שאינו executable: `bash script.sh`

קובץ חדש לא מקבל הרשאת הרצה. `./script.sh` נכשל, ו-`bash script.sh` עובד תמיד.

```bash title="runs on: any shell"
./promote.sh dev x          # bash: ./promote.sh: Permission denied  (exit 126)
bash promote.sh dev x       # works; the file does not need +x
chmod +x promote.sh         # or make it executable once
```

## `cd` בתוך script

כל פקודה רצה בתיקייה הנוכחית של התהליך. אחרי `git clone` אתה עדיין **מחוץ** ל-clone.

```bash title="file: scripts/promote.sh (excerpt)"
git clone -q "$CLONE_URL" "$WORK/gitops"
cd "$WORK/gitops"                       # without this, git add/commit run in the WRONG directory
printf 'defaultImageTag: "%s"\n' "$CANDIDATE" > "apps/trident/versions/$ENV.yaml"
```

:::caution[מלכודת · קרה בתרגול]
בהרכבה הראשונה של `promote.sh` נשכח `cd .gitops`. שאלת הבדיקה: "באיזו תיקייה הפקודה הזו רצה?". זו אותה שאלה כמו "איפה זה רץ: Mac, VM או CI". ראה גם [debugging/symptoms](../../debugging/symptoms/).
:::

## function, `for`, `case`

שלושה מבנים שמספיקים לכמעט כל script.

```bash title="runs on: any shell"
log() { printf '[INFO] %s\n' "$*"; }                  # function: "$*" = all arguments

for env in dev staging prod; do log "env $env"; done  # loop over words

case "${1:-}" in                                      # choose by pattern
  dev|staging) log "non-prod" ;;
  prod)        log "production" ;;
  *)           log "unknown: ${1:-}" >&2; exit 1 ;;
esac
```

מלכודת: ב-`case` כל ענף נגמר ב-`;;`, ו-`*)` תופס את כל השאר. ב-function, `local x=...` שומר משתנה בתוך הפונקציה בלבד.

## here-doc — כתיבת קובץ מרובה שורות

`<<'EOF'` מעביר בלוק טקסט ל-stdin של פקודה. עם מרכאות סביב `EOF` ה-shell **לא** מרחיב משתנים בפנים.

```bash title="runs on: any shell"
cat > values.yaml <<'EOF'
image:
  tag: dev-1
EOF
cat > note.txt <<EOF
without quotes the shell expands: $HOME
EOF
```

מלכודת: שורת הסיום חייבת להיות `EOF` לבד, בלי רווחים לפניה או אחריה.
