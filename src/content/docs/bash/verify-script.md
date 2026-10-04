---
title: Verify script גנרי
description: שלד של script בדיקה עם ספירת PASS/FAIL ו-verdict, בדיקות שליליות, ובדיקת ערכים שהוזרקו ל-helm template עם grep.
sidebar:
  order: 4
---

:::note[בקצרה]
שלד אחד ל-`verify.sh`: כל בדיקה מדפיסה PASS או FAIL, ובסוף verdict ו-exit code. מוסיפים בדיקות על ידי שורה אחת לכל בדיקה.
החלק השני: איך מוודאים שערך שהוזרק (`--set` או `-f`) באמת הגיע ל-render. הצד של Helm: [helm/testing](../../helm/testing/).
:::

## השלד: PASS/FAIL, verdict ו-`need`

שלושה כללים שמבדילים script בדיקה מ-script רגיל:

- **בלי `-e`**: `set -uo pipefail`. בדיקה שנכשלה לא עוצרת את הריצה, כי רוצים לראות את **כל** הכישלונות.
- **מונה**: כל `fail` מגדיל `FAILURES`, וה-exit code בסוף נגזר ממנו.
- **`need`**: בודק שהכלים קיימים לפני שמתחילים. כלי חסר נותן exit 2 (לא "FAIL"), כדי להבדיל בין "המערכת שגויה" ל-"אין לי איך לבדוק".

```bash title="file: scripts/verify.sh"
#!/usr/bin/env bash
# verify.sh [<ENV>]
#
# Contract
#   effect   runs every check, prints PASS/FAIL per check, then a verdict
#   exit     0 = every check passed, 1 = at least one failed, 2 = a required tool is missing
#   never    changes anything (read-only)
# NOTE: strict mode WITHOUT -e on purpose: one failed check must not stop the run.
set -uo pipefail

# ---- variables: edit only this block ------------------------------------
ENV="${1:-<ENV>}"                       # TRIDENT: dev
NS="<NS>"                               # TRIDENT: trident-$ENV
CHART_DIR="<CHART_DIR>"                 # TRIDENT: charts/nxs-universal-chart
RELEASE="<RELEASE>"                     # TRIDENT: trident
VALUES_FILES="<FILE> <FILE>"            # TRIDENT: apps/trident/base.yaml apps/trident/versions/dev.yaml
CANDIDATE="<CANDIDATE>"                 # TRIDENT: dev-20261001-78e24670
DELIVERABLES="<FILE> <FILE>"            # files that must exist and be non-empty
PULL_SECRET="<SECRET>"                  # TRIDENT: trident-registry
SERVICE="<SERVICE>"                     # TRIDENT: ingest-api
# -------------------------------------------------------------------------

FAILURES=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
need() { command -v "$1" >/dev/null || { echo "missing required tool: $1" >&2; exit 2; }; }

check()     { local label="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$label"; else fail "$label"; fi; }
check_not() { local label="$1"; shift; if "$@" >/dev/null 2>&1; then fail "$label (must NOT hold)"; else pass "$label"; fi; }
has()       { grep -q -- "$2" <<<"$1"; }          # has "<text>" "<regex>"
verdict() {
  printf '\n'
  if [ "$FAILURES" -eq 0 ]; then printf '\033[32m%s: PASS\033[0m\n' "$1"; exit 0; fi
  printf '\033[31m%s: %d failure(s)\033[0m\n' "$1" "$FAILURES"; exit 1
}

need kubectl
need helm
need grep

step "1. deliverables exist and are non-empty"
for f in $DELIVERABLES; do check "file $f" test -s "$f"; done
check_not "no leftover TODO in deliverables" grep -rq 'TODO' $DELIVERABLES

step "2. rendering (what Argo would render)"
args=(); for f in $VALUES_FILES; do args+=(-f "$f"); done
out="$(helm template "$RELEASE" "$CHART_DIR" -n "$NS" "${args[@]}" 2>&1)"   # capture first, grep after
render_rc=$?
check "helm template succeeds"            test "$render_rc" -eq 0
check "candidate tag is injected"         has "$out" ":$CANDIDATE"
check_not "no 'latest' tag anywhere"      has "$out" 'image: .*:latest'

step "3. live state"
check "namespace $NS exists"              kubectl get namespace "$NS"
check "pull Secret exists in $NS"         kubectl -n "$NS" get secret "$PULL_SECRET"
pods="$(kubectl -n "$NS" get pods 2>&1)"; pods_rc=$?
check "Pods can be listed in $NS"         test "$pods_rc" -eq 0     # guard: a negative check passes when the command itself broke
check_not "no Pod in ImagePullBackOff"    has "$pods" 'ImagePullBackOff'
check "Deployment $SERVICE is available"  kubectl -n "$NS" wait --for=condition=Available "deploy/$SERVICE" --timeout=5s

step "4. negative controls (prove the checks CAN fail)"
check_not "self-test: a wrong tag is not matched" has "$out" ":definitely-not-this-tag"

verdict "$ENV"
```

**איך מריצים ומוודאים:**

```bash title="runs on: VM"
bash scripts/verify.sh dev
echo "exit code: $?"          # 0 = all PASS, 1 = some FAIL, 2 = a tool is missing
```

הציפייה: כל שורה `PASS`, ובסוף `<ENV>: PASS` ו-exit 0. אחרת רשימת ה-`FAIL` וה-verdict עם מספר הכישלונות.

## `check` ו-`check_not`: בדיקה חיובית ושלילית

`check "label" <command…>` עובר אם הפקודה מחזירה 0. `check_not` עובר אם היא **נכשלת**: משתמשים בו לדברים שאסור שיהיו (`latest`, `ImagePullBackOff`, Secret בתוך ה-repo).

```bash title="file: scripts/verify.sh (excerpt)"
check "file exists"            test -s "$FILE"
check_not "no latest tag"      has "$out" 'image: .*:latest'
```

:::caution[מלכודת]
בדיקה שלילית **עוברת גם כשהפקודה עצמה נשברה**: אם `kubectl` לא מצליח להתחבר, "אין Pod ב-ImagePullBackOff" נראה PASS. לכן ב-script יש בדיקה חיובית שמקדימה אותה (`Pods can be listed`), וה-`has` רץ על הפלט שנשמר. בדיקה שלילית בלי בדיקת-שפיות לפניה היא PASS שקרי.
:::

## בדיקת ערכים שהוזרקו: `helm template … | grep -q`

הרעיון: מרנדרים עם הערכים שהזרקת, ובודקים שהערך מופיע בפלט במקום שהוא אמור להופיע. אותה פקודה ש-Argo היה מריץ, בלי cluster.

```bash title="runs on: any shell"
out="$(helm template <RELEASE> <CHART_DIR> -f <FILE> -f <FILE>)"   # capture first
grep -q ":<CANDIDATE>" <<<"$out" && echo "tag injected"
```

למה לשמור למשתנה ולא `helm template … | grep -q`: `grep -q` יוצא ברגע שמצא, וה-`helm` שכותב לצינור מקבל SIGPIPE. עם `pipefail` ה-pipeline כולו נחשב ככישלון:

```bash title="runs on: any shell"
set -o pipefail
yes | grep -q y; echo "rc=$?"     # rc=141: grep succeeded, but the writer was killed by SIGPIPE
```

## בדיקה עצמית שלילית: להוכיח שהבדיקה *יכולה* להיכשל

`grep` שתמיד עובר לא בודק כלום. מרנדרים פעם נוספת עם ערך **שגוי** בכוונה, ומוודאים שה-assertion נכשל עליו.

```bash title="file: scripts/test-injected.sh"
#!/usr/bin/env bash
set -uo pipefail

CHART_DIR="<CHART_DIR>"      # TRIDENT: charts/nxs-universal-chart
RELEASE="<RELEASE>"          # TRIDENT: trident
VALUES="<FILE>"              # TRIDENT: apps/trident/versions/dev.yaml
CANDIDATE="<CANDIDATE>"      # TRIDENT: dev-20261001-78e24670
PATTERN="image: .*:$CANDIDATE"

FAILURES=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
has()  { grep -q -- "$2" <<<"$1"; }

good="$(helm template "$RELEASE" "$CHART_DIR" -f "$VALUES" 2>&1)" || { echo "render failed:"; echo "$good"; exit 1; }
bad="$(helm template "$RELEASE" "$CHART_DIR" -f "$VALUES" --set <KEY>=WRONG-TAG 2>&1)"
# TRIDENT: --set generic.defaultImageTag=WRONG-TAG   (use the real key from your values file)

if has "$good" "$PATTERN"; then pass "candidate is injected"; else fail "candidate missing from render"; fi
if has "$bad"  "$PATTERN"; then fail "self-test: wrong tag still matches (the check is blind)"; else pass "self-test: wrong tag is rejected"; fi

[ "$FAILURES" -eq 0 ] && { echo "OK"; exit 0; }
echo "$FAILURES failure(s)"; exit 1
```

**איך מוודאים:** שתי שורות `PASS`. אם השורה השנייה היא `FAIL`, ה-`PATTERN` רחב מדי (למשל תופס כל `image:`), או שה-`--set` מכוון ל-key שלא קיים ולכן לא שינה כלום. תקן את ה-pattern עד שהבדיקה השלילית עוברת.

מה בודקים עוד בדרך הזו, תמיד עם `has "$out" '<regex>'` ועם בדיקה שלילית נגדית:

| בדיקה | חיובית | שלילית |
|---|---|---|
| ערך הוזרק | `has "$out" 'tag: dev-1'` | render עם ערך אחר לא מתאים |
| שדה חובה (`required`) | render בלי הערך נכשל | render עם הערך מצליח |
| אין `latest` | `! has "$out" ':latest'` | render שמכיל `:latest` בכוונה נתפס |

הכלים של Helm עצמם (`required`, `values.schema.json`, `lint` מול `template`, job ב-CI שמריץ את הבדיקות): [helm/testing](../../helm/testing/). אחרי שה-script עובד מקומית, מריצים אותו ב-pipeline: [ci/patterns](../../ci/patterns/). סולם אימות מלא של המערכת: [verify/overview](../../verify/overview/).
