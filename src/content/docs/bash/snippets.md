---
title: Snippets לשימוש חוזר
description: בלוקים קצרים של bash מתוך ה-scripts של הפרויקט, להעתקה ולהתאמה, כל אחד עם בדיקה.
sidebar:
  order: 2
---

:::note[בקצרה]
חלקים קטנים להרכבת script: ארגומנטים, בדיקות קלט, kubectl אידמפוטנטי, קריאת ערכי Secret בלי להדפיס, polling, helpers, ניקוי.
Script שלם ומוכן: [templates](../templates/). הסבר על כל תחביר: [overview](../overview/).
:::

## helpers: `log` / `ok` / `bad` / `die`

ארבע פונקציות בראש כל script. ההודעות הולכות ל-stdout, והשגיאות ל-stderr.

```bash title="file: scripts/example.sh (top)"
log() { printf '[INFO] %s\n' "$*"; }
ok()  { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; }
die() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }
```

**איך מוודאים:** `die "boom"; echo after` מדפיס `[ERROR] boom` ויוצא, ו-`after` לא מודפס.

## ארגומנטים: חובה, ו-flags עם usage

ארגומנט מיקום חובה: `${1:?...}`. כמה flags: לולאת `while` + `case`, ו-usage שנקרא מה-comment שבראש הקובץ.

```bash title="file: scripts/example.sh (args)"
ENV="${1:?usage: example.sh <ENV>}"

usage() { sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 1; }
mode=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install|--verify|--remove) mode="${1#--}"; shift ;;
    --dir) [ "$#" -ge 2 ] || die "--dir requires a path"; DIR="$2"; shift 2 ;;
    *) usage ;;
  esac
done
[ -n "$mode" ] || usage
```

`${1#--}` מסיר את `--` מההתחלה: `--verify` הופך ל-`verify`. `shift` זורק ארגומנט אחד, `shift 2` שניים.

**איך מוודאים:** `bash example.sh --nope` מדפיס את שורות 2–12 של ה-script (ה-usage) ויוצא עם 1.

:::caution[מלכודת]
`usage` מדפיס את ה-comment שבראש הקובץ. אם הוספת שורות לפני ה-comment, מספרי השורות ב-`sed -n '2,12p'` זזים.
:::

## בדיקת משתני סביבה נדרשים

נכשלים מוקדם עם הודעה ברורה, לפני שה-script עושה משהו.

```bash title="file: scripts/example.sh (required env)"
: "${GITOPS_REPO:?export GITOPS_REPO=<host/path>}" "${GIT_TOKEN:?export GIT_TOKEN first}"

for v in GITOPS_REPO GIT_TOKEN; do        # same check, one message of your own
  [ -n "${!v:-}" ] || die "export $v first"
done

command -v kubectl >/dev/null || die "kubectl not found; run this on the VM"
```

ה-`:` בתחילת השורה הראשונה היא פקודה ריקה: היא קיימת רק כדי שההרחבה `${...:?}` תרוץ.

**איך מוודאים:** `env -u GIT_TOKEN bash example.sh` נעצר עם `GIT_TOKEN: export GIT_TOKEN first`.

## קובץ קריאה ולא ריק

לפני שמשתמשים בקובץ credential או בקובץ TLS.

```bash title="file: scripts/example.sh (file checks)"
for f in "$USER_FILE" "$TOKEN_FILE"; do
  if [ ! -r "$f" ] || [ ! -s "$f" ]; then
    die "file is not readable and non-empty: $f"
  fi
done
```

`-r` קריא, `-s` קיים **ולא ריק**. (`-e` או `-f` לא מספיקים: קובץ ריק עובר אותם.)

**איך מוודאים:** `: > /tmp/empty; [ -s /tmp/empty ] || echo "empty is caught"`.

## `kubectl create … --dry-run=client -o yaml | kubectl apply -f -`

הדרך להפוך `create` (שנכשל כשהאובייקט קיים) לפעולה שאפשר להריץ שוב ושוב.

```bash title="runs on: VM"
kubectl create namespace <NS> --dry-run=client -o yaml | kubectl apply -f -
kubectl -n <NS> create secret generic <SECRET> \
  --from-file=<KEY>=<TOKEN_FILE> \
  --dry-run=client -o yaml | kubectl apply --server-side --force-conflicts -f -
```

`--dry-run=client -o yaml` מדפיס את ה-YAML שהיה נוצר ולא יוצר כלום. `kubectl apply -f -` מחיל אותו, ויוצר או מעדכן. ל-Secret משתמשים ב-`--server-side` (הסיבה בסעיף הבא); ל-namespace `apply` רגיל מספיק.

**איך מוודאים:** מריצים את אותה שורה פעמיים. פעם ראשונה: `created`. שנייה: `unchanged` (או `configured`), בלי שגיאה. את שני הסוגים, `docker-registry` ו-`tls`, ראה ב-[kubernetes/secrets](../../kubernetes/secrets/).

## Secret: `apply --server-side` כדי לא להדליף ל-annotation

`kubectl apply` רגיל שומר את כל האובייקט, כולל ערכי ה-Secret ב-base64, ב-annotation בשם `kubectl.kubernetes.io/last-applied-configuration`. כל מי שיכול לקרוא את ה-Secret רואה אותו פעמיים.

```bash title="runs on: VM"
kubectl -n <NS> create secret generic <SECRET> \
  --from-file=<KEY>=<TOKEN_FILE> \
  --dry-run=client -o yaml \
  | kubectl apply --server-side --force-conflicts --field-manager=bootstrap -f - >/dev/null
```

```bash title="runs on: VM"
# detect the leak: prints "LEAK" if the annotation exists
kubectl -n <NS> get secret <SECRET> \
  -o 'jsonpath={.metadata.annotations.kubectl\.kubernetes\.io/last-applied-configuration}' \
  | grep -q . && echo "LEAK" || echo "clean"
```

`--field-manager=bootstrap` הוא שם שרירותי של מי שמנהל את השדות (אפשר כל שם). הנקודות בשם ה-annotation מוברחות ב-`\.` בתוך jsonpath. `--force-conflicts` מאפשר להחליף ערך שנכתב קודם בדרך אחרת.

**איך מוודאים:** הפקודה השנייה מדפיסה `clean`. אם הדפיסה `LEAK`, ה-Secret נוצר בעבר ב-apply רגיל. הסרה: `kubectl -n <NS> annotate secret <SECRET> kubectl.kubernetes.io/last-applied-configuration-` (ה-`-` בסוף מוחק).

## label ו-annotate

```bash title="runs on: VM"
kubectl -n <NS> label secret <SECRET> app.kubernetes.io/part-of=<RELEASE> --overwrite
kubectl -n <NS> annotate secret <SECRET> note="managed by bootstrap" --overwrite
kubectl -n <NS> get secret <SECRET> --show-labels
```

`--overwrite` נדרש כדי שהרצה שנייה לא תיכשל על label שכבר קיים.

**איך מוודאים:** `--show-labels` מציג את ה-label בעמודה האחרונה.

## קריאת שדה ב-jsonpath ופענוח base64 בלי להדפיס

הערך נשמר במשתנה ולא מודפס. בודקים שהוא קיים, או שהוא שווה לקובץ.

```bash title="runs on: VM"
b64="$(kubectl -n <NS> get secret <SECRET> -o 'jsonpath={.data.<KEY>}')"
val="$(printf '%s' "$b64" | base64 -d)"

[ -n "$val" ] && echo "key has a value (${#val} chars)"
printf '%s' "$val" | cmp -s - <TOKEN_FILE> && echo "matches the file"
val=
```

`${#val}` הוא אורך המחרוזת. `cmp -s` משווה בלי פלט, וה-`-` אומר "קרא מ-stdin". בסוף `val=` מנקה את המשתנה.

**איך מוודאים:** שתי השורות `key has a value` ו-`matches the file` מודפסות. אם השנייה חסרה, ה-Secret מכיל ערך אחר מהקובץ (למשל newline בסוף).

:::caution[מלכודת]
`echo "$val"`, `kubectl get secret -o yaml` (מציג base64, שהוא לא הצפנה), ו-`set -x` כולם מציגים את הערך ב-terminal וב-logs של CI. אל תשתמש בהם כדי "לבדוק".
:::

## `wait_for` — המתנה עם timeout

מריץ פקודה שוב ושוב עד שהיא מצליחה, או עד שנגמר הזמן.

```bash title="file: scripts/example.sh (wait_for)"
wait_for() { # wait_for <seconds> <command...>
  local deadline=$((SECONDS + $1)); shift
  until "$@"; do [ "$SECONDS" -ge "$deadline" ] && return 1; sleep 2; done
  return 0
}

wait_for 120 kubectl -n <NS> get secret <SECRET> >/dev/null 2>&1 \
  || die "secret <SECRET> did not appear in 120s"
```

`SECONDS` הוא משתנה של bash שסופר שניות מתחילת ה-shell. תנאי של `until` פטור מ-`set -e`.

**איך מוודאים:** `wait_for 3 false; echo "rc=$?"` מדפיס `rc=1` אחרי כ-4 שניות. `wait_for 3 true; echo "rc=$?"` מדפיס `rc=0` מיד.

## `mktemp` + `trap` לניקוי

תיקיית עבודה זמנית שנמחקת תמיד, גם אם ה-script נכשל באמצע.

```bash title="file: scripts/example.sh (temp dir)"
WORK="$(mktemp -d)"
cleanup() { [ -z "${WORK:-}" ] || rm -rf -- "$WORK"; }
trap cleanup EXIT

cd "$WORK"          # work here; everything is deleted on exit
# … after a successful mv of $WORK to its final place:  WORK=
```

`trap cleanup EXIT` מריץ את `cleanup` בכל יציאה: סיום תקין, `exit 1`, או כישלון של `set -e`. `WORK=` (ריק) מנטרל את המחיקה אחרי שהתיקייה הועברה למקום קבוע.

**איך מוודאים:** `W="$(bash -c 'WORK=$(mktemp -d); trap "rm -rf $WORK" EXIT; echo $WORK')"; ls "$W"` מחזיר `No such file or directory`: התיקייה נמחקה ביציאה.

## לולאה על כמה environments

```bash title="runs on: VM"
for env in dev staging prod; do
  bash bootstrap/prepare-environment.sh "$env"
done
```

```bash title="file: scripts/example.sh (list in a variable)"
ENVS="dev staging prod"          # TRIDENT: dev staging prod
for env in $ENVS; do             # no quotes on purpose: split into words
  log "env $env"
done
```

מלכודת: `"$ENVS"` בתוך מרכאות הופך לערך אחד ולולאה אחת. זה המקרה היחיד שבו משתנה נשאר **בלי** מרכאות. ובלולאה הראשונה: אם ריצה אחת נכשלת, `set -e` עוצר את כל הלולאה.

**איך מוודאים:** `for env in dev staging prod; do echo "env $env"; done` מדפיס שלוש שורות.

## `case` — הפעלת פונקציה לפי מצב

```bash title="file: scripts/example.sh (dispatch)"
install_registration() { log "install"; }
verify_registration()  { log "verify"; }
remove_registration()  { log "remove"; }

case "$mode" in
  install) install_registration ;;
  verify)  verify_registration ;;
  remove)  remove_registration ;;
  *)       die "unknown mode: $mode" ;;
esac
```

שים את ה-`case` **בסוף** הקובץ: הפונקציות חייבות להיות מוגדרות לפני הקריאה.

**איך מוודאים:** `mode=verify` ואז ה-`case` מדפיס `[INFO] verify`. `mode=zzz` יוצא עם `[ERROR] unknown mode: zzz`.

## `cd` לשורש ה-repo ובדיקות לפני הרצה

```bash title="file: scripts/example.sh (top)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # absolute path of the parent of scripts/
cd "$HERE"                                                # relative paths now work from anywhere
```

```bash title="runs on: any shell"
bash -n scripts/example.sh && echo "syntax ok"
grep -nE ' +$' scripts/example.sh || echo "no trailing whitespace"
```

**איך מוודאים:** `bash /abs/path/scripts/example.sh` ו-`cd /tmp && bash /abs/path/scripts/example.sh` נותנים אותה תוצאה.
