---
title: Scripts מלאים להעתקה
description: חמישה scripts עובדים (prepare-environment, prepare-observability, cleanup, promote, credential writer), כל אחד עם בלוק משתנים, strict mode, אידמפוטנטיות ושלבי הרצה ואימות.
sidebar:
  order: 3
---

:::note[בקצרה]
חמישה scripts מלאים וגנריים. עורכים **רק את בלוק המשתנים בראש הקובץ** (ה-placeholders בסוגריים זוויתיים, ובכל שורה ה-comment `# TRIDENT:` עם הערך מהפרויקט). כל script מסרב לרוץ כל עוד נשאר placeholder.
כולם נבדקו: `bash -n`, הרצה שנייה (אידמפוטנטיות), ו-`kubectl create … --dry-run=client` מול קבצי דמה. ההסבר על התחביר: [overview](../overview/), חלקים קטנים: [snippets](../snippets/).
:::

כל ה-scripts רצים עם `bash script.sh` (בלי צורך ב-`chmod +x`). שמור אותם ב-repo שאתה עובד בו (בדרך כלל `bootstrap/` או `scripts/`), **אבל לא את קבצי ה-token**: אלה נשארים מחוץ לכל repo.

## prepare-environment.sh

מכין environment אחד: namespace ושלושה Secrets (generic מקובץ, docker-registry, tls). רץ ב-VM, פעם אחת לכל `<ENV>`, **לפני** ש-Argo עושה sync.

חשוב: Secret שייך ל-namespace אחד. `trident-dev` ו-`trident-staging` צריכים כל אחד את הסט שלו, ו-Pod לא יכול להשתמש ב-Secret מ-namespace אחר.

```bash title="file: bootstrap/prepare-environment.sh"
#!/usr/bin/env bash
# prepare-environment.sh <ENV>
#
# Contract
#   input    one environment name (one of $ENVS)
#   effect   namespace <NS_PREFIX>-<ENV> exists and holds three Secrets:
#              $PG_SECRET   generic          key $PG_KEY       <- file
#              $REG_SECRET  docker-registry  server $REGISTRY  <- username + token files
#              $TLS_SECRET  tls              cert + key        <- files
#   idempotent  yes: run it twice, the second run changes nothing
#   never       prints a secret value; reads any file from inside a git repo
#   environment kubectl pointing at the cluster (run on the VM)
set -euo pipefail

# ---- variables: edit only this block ------------------------------------
NS_PREFIX="<NS_PREFIX>"                 # TRIDENT: trident     (namespace = trident-dev ...)
ENVS="dev staging prod"                 # TRIDENT: dev staging prod
REGISTRY="<REGISTRY>"                   # TRIDENT: registry.gitlab.com
DIR="<DIR>"                             # TRIDENT: /home/student/.local/share/trident
PG_SECRET="<SECRET>"                    # TRIDENT: trident-postgres
PG_KEY="<KEY>"                          # TRIDENT: postgres_password
REG_SECRET="<SECRET>"                   # TRIDENT: trident-registry
TLS_SECRET="<SECRET>"                   # TRIDENT: trident-tls
TLS_HOST_SUFFIX="<DOMAIN>"              # TRIDENT: trident.test  (cert file = <ENV>.trident.test.crt)
MANAGER="prepare-environment"           # field manager name for server-side apply
# -------------------------------------------------------------------------

die() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }
log() { printf '[INFO] %s\n' "$*"; }

# refuse to run while a placeholder is still in the variables block
for v in NS_PREFIX REGISTRY DIR PG_SECRET PG_KEY REG_SECRET TLS_SECRET TLS_HOST_SUFFIX; do
  case "${!v}" in *\<*\>*) die "edit the variables block: $v still contains a placeholder" ;; esac
done

ENV="${1:?usage: prepare-environment.sh <ENV: $ENVS>}"
case " $ENVS " in *" $ENV "*) ;; *) die "unknown environment '$ENV' (want: $ENVS)" ;; esac
NS="$NS_PREFIX-$ENV"

# input files: all under $DIR, mode 600, outside every git repo
PG_FILE="$DIR/credentials/postgres/$ENV/password"
REG_USER_FILE="$DIR/credentials/registry/username"
REG_TOKEN_FILE="$DIR/credentials/registry/token"
TLS_CRT="$DIR/tls/$ENV.$TLS_HOST_SUFFIX.crt"
TLS_KEY="$DIR/tls/$ENV.$TLS_HOST_SUFFIX.key"

command -v kubectl >/dev/null || die "kubectl not found; run this on the VM"
for f in "$PG_FILE" "$REG_USER_FILE" "$REG_TOKEN_FILE" "$TLS_CRT" "$TLS_KEY"; do
  if [ ! -r "$f" ] || [ ! -s "$f" ]; then
    die "file is not readable and non-empty: $f"
  fi
done

# Server-side apply: a client-side apply would store the secret value in the
# last-applied-configuration annotation.
apply_stdin() {
  kubectl apply --server-side --force-conflicts --field-manager="$MANAGER" -f - >/dev/null
}

log "namespace $NS"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

log "secret $PG_SECRET (generic)"
kubectl -n "$NS" create secret generic "$PG_SECRET" \
  --from-file="$PG_KEY=$PG_FILE" \
  --dry-run=client -o yaml | apply_stdin

log "secret $REG_SECRET (docker-registry)"
kubectl -n "$NS" create secret docker-registry "$REG_SECRET" \
  --docker-server="$REGISTRY" \
  --docker-username="$(cat "$REG_USER_FILE")" \
  --docker-password="$(cat "$REG_TOKEN_FILE")" \
  --dry-run=client -o yaml | apply_stdin

log "secret $TLS_SECRET (tls)"
kubectl -n "$NS" create secret tls "$TLS_SECRET" \
  --cert="$TLS_CRT" --key="$TLS_KEY" \
  --dry-run=client -o yaml | apply_stdin

log "done: $NS"
```

**איך מריצים:**

```bash title="runs on: VM"
# 1) put the input files in place first (see "credential file writer" below), then:
bash bootstrap/prepare-environment.sh dev
bash bootstrap/prepare-environment.sh staging
bash bootstrap/prepare-environment.sh prod
```

**איך מוודאים** (מציג שמות וסוגים, לא ערכים):

```bash title="runs on: VM"
kubectl get namespace <NS>
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.type}{"\n"}'   # kubernetes.io/dockerconfigjson
kubectl -n <NS> get secrets                                        # all three names exist
bash bootstrap/prepare-environment.sh <ENV>                        # 2nd run: same lines, no error
```

הציפייה: הרצה שנייה מסתיימת ב-`done: <NS>` בלי שגיאה. בדיקת ההדלפה ל-annotation: [snippets](../snippets/#secret-apply---server-side-כדי-לא-להדליף-ל-annotation).

:::caution[מלכודת]
`--docker-password="$(cat …)"` מעביר את ה-token כארגומנט, וארגומנטים של תהליך נראים ל-`ps` באותה מכונה לזמן קצר. זה מה שהפרויקט עצמו עושה, וה-token כאן הוא read-only. אל תדפיס אותו, ואל תריץ עם `bash -x`.
:::

### בדיקה בלי cluster

כדי לוודא שה-YAML נוצר גם בלי cluster: `kubectl` מזויף ב-`PATH` שמדפיס מה ש-`apply` היה מקבל, ו-`create --dry-run=client` רץ אמיתי.

```bash title="runs on: any shell"
mkdir -p /tmp/shim && cat > /tmp/shim/kubectl <<'EOF'
#!/usr/bin/env bash
if [ "$1" = apply ]; then echo "# kubectl $*"; cat; echo '---'; exit 0; fi
exec /usr/bin/kubectl "$@"
EOF
chmod +x /tmp/shim/kubectl
PATH=/tmp/shim:$PATH bash bootstrap/prepare-environment.sh dev | grep -E '^(kind|  name|type|# kubectl)'
```

הפלט צריך להראות `kind: Namespace` ואז שלוש פעמים `kind: Secret` עם `type: kubernetes.io/dockerconfigjson`, `kubernetes.io/tls`, ו-Secret אחד בלי type (generic).

## prepare-observability.sh

namespace של ה-observability, Secret של admin ל-Grafana (שני keys משני קבצים), ו-Secret מסוג tls. בלי ארגומנטים.

```bash title="file: bootstrap/prepare-observability.sh"
#!/usr/bin/env bash
# prepare-observability.sh
#
# Contract
#   input    none (everything comes from the variables block)
#   effect   namespace $NS exists and holds two Secrets:
#              $GRAFANA_SECRET  generic  keys $USER_KEY + $PASS_KEY  <- files
#              $TLS_SECRET      tls      cert + key                  <- files
#   idempotent  yes
#   never       prints a secret value
#   environment kubectl pointing at the cluster (run on the VM)
set -euo pipefail

# ---- variables: edit only this block ------------------------------------
NS="<NS>"                               # TRIDENT: trident-observability
DIR="<DIR>"                             # TRIDENT: /home/student/.local/share/trident
GRAFANA_SECRET="<SECRET>"               # TRIDENT: trident-grafana-admin
USER_KEY="<KEY>"                        # TRIDENT: admin-user
PASS_KEY="<KEY>"                        # TRIDENT: admin-password
USER_FILE="$DIR/credentials/grafana/admin-user"
PASS_FILE="$DIR/credentials/grafana/admin-password"
TLS_SECRET="<SECRET>"                   # TRIDENT: trident-tls
TLS_CRT="$DIR/tls/<HOST>.crt"           # TRIDENT: $DIR/tls/grafana.trident.test.crt
TLS_KEY="$DIR/tls/<HOST>.key"           # TRIDENT: $DIR/tls/grafana.trident.test.key
MANAGER="prepare-observability"
# -------------------------------------------------------------------------

die() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }
log() { printf '[INFO] %s\n' "$*"; }

for v in NS DIR GRAFANA_SECRET USER_KEY PASS_KEY TLS_SECRET TLS_CRT TLS_KEY; do
  case "${!v}" in *\<*\>*) die "edit the variables block: $v still contains a placeholder" ;; esac
done

command -v kubectl >/dev/null || die "kubectl not found; run this on the VM"
for f in "$USER_FILE" "$PASS_FILE" "$TLS_CRT" "$TLS_KEY"; do
  if [ ! -r "$f" ] || [ ! -s "$f" ]; then
    die "file is not readable and non-empty: $f"
  fi
done

apply_stdin() {
  kubectl apply --server-side --force-conflicts --field-manager="$MANAGER" -f - >/dev/null
}

log "namespace $NS"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

log "secret $GRAFANA_SECRET (generic, two keys)"
kubectl -n "$NS" create secret generic "$GRAFANA_SECRET" \
  --from-file="$USER_KEY=$USER_FILE" \
  --from-file="$PASS_KEY=$PASS_FILE" \
  --dry-run=client -o yaml | apply_stdin

log "secret $TLS_SECRET (tls)"
kubectl -n "$NS" create secret tls "$TLS_SECRET" \
  --cert="$TLS_CRT" --key="$TLS_KEY" \
  --dry-run=client -o yaml | apply_stdin

log "done: $NS"
```

**איך מריצים ומוודאים:**

```bash title="runs on: VM"
bash bootstrap/prepare-observability.sh
kubectl -n <NS> get secrets                                       # both names exist
kubectl -n <NS> get secret <SECRET> -o go-template='{{range $k, $v := .data}}{{$k}}{{"\n"}}{{end}}'   # key NAMES only
bash bootstrap/prepare-observability.sh                           # 2nd run: no error
```

הציפייה: שני שמות ה-keys (`admin-user`, `admin-password` ב-TRIDENT) מופיעים. הערכים לא.

:::caution[מלכודת · קרה בתרגול]
ה-stub של ה-script הגיע עם 3 באגים: (1) בלוק postgres שהועתק כמו שהוא; (2) `$ENV` שלא הוגדר ב-script בלי ארגומנט, ו-`set -u` הפיל אותו (`unbound variable`); (3) נתיב ה-TLS שגוי (`$DIR/tls/<HOST>.crt`). ה-Secret `trident-grafana-admin` נבנה משני `--from-file` (`admin-user`, `admin-password`). הגרסה כאן נבדקה: `bash -n`, שתי הרצות ברצף עם `kubectl` מדומה, בלי `$ENV`.
:::

## cleanup.sh

מוחק את מה ש-bootstrap יצר, **בסדר**: קודם ה-Applications (ה-root קודם), אחר כך ה-namespaces, ובסוף ה-Secrets של ה-repos. מה שכבר לא קיים הוא לא שגיאה.

למה בסדר הזה: ל-Application יש finalizer שגורם ל-Argo למחוק את המשאבים שלו לפני שה-Application נעלם. ה-root מוחק את הילדים שלו. מחיקת namespace לפני כן, עם `selfHeal` פעיל, גורמת ל-Argo ליצור אותו מחדש.

```bash title="file: bootstrap/cleanup.sh"
#!/usr/bin/env bash
# cleanup.sh
#
# Contract
#   effect   nothing this project put on the cluster remains:
#            1. the root Application (its finalizer cascades to the children)
#            2. the child Applications (explicitly, in case the cascade was skipped)
#            3. the environment namespaces (Pods, PVCs and Secrets go with them)
#            4. the Argo repository Secrets
#   idempotent  yes: anything already absent is fine, a second run exits 0
#   order    Applications FIRST, namespaces after. Deleting a namespace first
#            lets Argo (selfHeal) recreate it.
#   environment kubectl pointing at the cluster (run on the VM)
set -euo pipefail

# ---- variables: edit only this block ------------------------------------
ARGO_NS="<NS>"                          # TRIDENT: argocd
ROOT_APP="<APP>"                        # TRIDENT: trident-root
CHILD_APPS="<APP> <APP>"                # TRIDENT: trident-dev trident-staging trident-prod trident-observability
NAMESPACES="<NS> <NS>"                  # TRIDENT: trident-dev trident-staging trident-prod trident-observability
REPO_SECRETS="<SECRET> <SECRET>"        # TRIDENT: trident-gitops trident-templates
WAIT_SECONDS=180
# -------------------------------------------------------------------------

log() { printf '[INFO] %s\n' "$*"; }
die() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

wait_for() { # wait_for <seconds> <command...>
  local deadline=$((SECONDS + $1)); shift
  until "$@"; do [ "$SECONDS" -ge "$deadline" ] && return 1; sleep 2; done
  return 0
}
app_gone() { ! kubectl -n "$ARGO_NS" get application "$1" >/dev/null 2>&1; }
ns_gone()  { ! kubectl get namespace "$1" >/dev/null 2>&1; }

for v in ARGO_NS ROOT_APP CHILD_APPS NAMESPACES REPO_SECRETS; do
  case "${!v}" in *\<*\>*) die "edit the variables block: $v still contains a placeholder" ;; esac
done
command -v kubectl >/dev/null || die "kubectl not found; run this on the VM"

log "1/4 root Application: $ROOT_APP"
kubectl -n "$ARGO_NS" delete application "$ROOT_APP" --ignore-not-found --wait=false

log "2/4 child Applications"
for app in $CHILD_APPS; do
  kubectl -n "$ARGO_NS" delete application "$app" --ignore-not-found --wait=false
done
for app in $ROOT_APP $CHILD_APPS; do
  wait_for "$WAIT_SECONDS" app_gone "$app" \
    || die "Application $app still exists (stuck finalizer? see 'how to verify' below)"
done

log "3/4 namespaces"
for ns in $NAMESPACES; do
  kubectl delete namespace "$ns" --ignore-not-found --wait=false
done
for ns in $NAMESPACES; do
  wait_for "$WAIT_SECONDS" ns_gone "$ns" || die "namespace $ns is still Terminating"
done

log "4/4 repository Secrets in $ARGO_NS"
for s in $REPO_SECRETS; do
  kubectl -n "$ARGO_NS" delete secret "$s" --ignore-not-found
done

log "cleanup finished"
```

**איך מריצים ומוודאים:**

```bash title="runs on: VM"
bash bootstrap/cleanup.sh          # takes up to a few minutes
bash bootstrap/cleanup.sh          # idempotent: 2nd run must finish at once, exit 0
kubectl -n <NS> get applications   # <NS> = Argo's namespace: no project Applications left
kubectl get namespaces             # none of the project namespaces
kubectl -n <NS> get secrets        # the repository Secrets are gone
```

```bash title="runs on: VM"
# the graded idempotency sequence, if your verify scripts exist:
bash scripts/verify.sh && bash bootstrap/cleanup.sh && bash scripts/verify-clean.sh && bash bootstrap/cleanup.sh && bash scripts/verify-clean.sh
```

:::danger[זהירות]
הסקריפט מוחק namespaces, ועם הם גם PVC ונתונים. הרץ אותו רק על ה-cluster של התרגיל, וקרא את `ARGO_NS`, `NAMESPACES` ו-`REPO_SECRETS` לפני ההרצה.
:::

אם Application נתקע ב-`Terminating` (ה-script נכשל עם "stuck finalizer"), בדוק למה (`kubectl -n <NS> describe application <APP>`), ורק כמוצא אחרון הסר את ה-finalizer. זה מדלג על מחיקת המשאבים שלו.

```bash title="runs on: VM"
kubectl -n <NS> patch application <APP> --type merge -p '{"metadata":{"finalizers":null}}'
```

עוד על סדר הניקוי: [verify/cleanup](../../verify/cleanup/).

## promote.sh

מקדם candidate ל-environment: שכפול של ה-gitops repo, כתיבת `versions/<ENV>.yaml`, commit ו-push. רץ ב-job של CI, ולא נוגע ב-cluster.

```bash title="file: scripts/promote.sh"
#!/usr/bin/env bash
# promote.sh <ENV> <CANDIDATE>
#
# Contract
#   input    an environment ($ENVS) and a candidate id (the image tag)
#   effect   $BRANCH of the gitops repo: $VERSIONS_DIR/<ENV>.yaml pins the candidate,
#            committed with message "promote(<ENV>): <CANDIDATE>"; no commit when
#            nothing changes (re-run = no-op)
#   output   the resulting commit SHA on stdout (everything else goes to stderr)
#   never    a rebuild, a retag, a cluster command
#   environment  GITOPS_REPO (host/path, NO scheme) and the token variable named
#            in $TOKEN_VAR. In CI both come from GitLab CI/CD variables.
set -euo pipefail

# ---- variables: edit only this block ------------------------------------
ENVS="dev staging prod"                 # TRIDENT: dev staging prod
BRANCH="<BRANCH>"                       # TRIDENT: main
VERSIONS_DIR="<DIR>"                    # TRIDENT: apps/trident/versions
TAG_KEY="<KEY>"                         # TRIDENT: defaultImageTag
TOKEN_VAR="<VAR_NAME>"                  # TRIDENT: TRIDENT_GIT_TOKEN  (NAME of the variable, not the token)
GIT_NAME="<USER>"                       # TRIDENT: trident-ci
GIT_EMAIL="<EMAIL>"                     # TRIDENT: trident-ci@users.noreply.example
# -------------------------------------------------------------------------

log() { printf '[INFO] %s\n' "$*" >&2; }
die() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

for v in BRANCH VERSIONS_DIR TAG_KEY TOKEN_VAR GIT_NAME GIT_EMAIL; do
  case "${!v}" in *\<*\>*) die "edit the variables block: $v still contains a placeholder" ;; esac
done

ENV="${1:?usage: promote.sh <ENV: $ENVS> <CANDIDATE>}"
CANDIDATE="${2:?usage: promote.sh <ENV: $ENVS> <CANDIDATE>}"
case " $ENVS " in *" $ENV "*) ;; *) die "unknown environment '$ENV' (want: $ENVS)" ;; esac

: "${GITOPS_REPO:?export GITOPS_REPO=<host/path of the gitops repo, no scheme>}"
TOKEN="${!TOKEN_VAR:?variable $TOKEN_VAR is empty or unset}"

# TEST HOOK: a local test points this at a file:// URL. Never set it in CI.
CLONE_URL="${CLONE_URL_OVERRIDE:-https://oauth2:${TOKEN}@${GITOPS_REPO}}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

log "clone $BRANCH"
git clone -q --depth 1 --branch "$BRANCH" "$CLONE_URL" "$WORK/gitops"
cd "$WORK/gitops"                       # every git command below runs in the clone

mkdir -p "$VERSIONS_DIR"
printf '%s: "%s"\n' "$TAG_KEY" "$CANDIDATE" > "$VERSIONS_DIR/$ENV.yaml"

git config user.name  "$GIT_NAME"       # CI has no git identity
git config user.email "$GIT_EMAIL"

git add "$VERSIONS_DIR/$ENV.yaml"
if ! git diff --cached --quiet; then    # exit 1 here means "there IS a change"
  git commit -q -m "promote($ENV): $CANDIDATE"
  git push -q origin "HEAD:$BRANCH"
  log "pushed promote($ENV): $CANDIDATE"
else
  log "no change: $ENV already pins $CANDIDATE"
fi

git rev-parse HEAD                      # runs outside the if: always prints
```

**איך משתמשים ב-CI:** ב-job (המשתנים מגיעים מ-GitLab, לא מ-`export`; ראה [ci/patterns](../../ci/patterns/)):

```bash title="runs on: CI job"
bash .ci/scripts/promote.sh "$TARGET_ENV" "$CANDIDATE"
```

**בדיקה מקומית מול repo זמני** (`CLONE_URL_OVERRIDE` קיים רק לזה):

```bash title="runs on: any shell"
git init -q --bare -b main /tmp/gitops-test.git
git clone -q /tmp/gitops-test.git /tmp/gitops-seed
( cd /tmp/gitops-seed && git config user.name t && git config user.email t@t \
  && mkdir -p <DIR> && printf 'defaultImageTag: ""\n' > <DIR>/dev.yaml \
  && git add . && git commit -qm init && git push -q origin HEAD:main )

export GITOPS_REPO=example.invalid/x.git <VAR_NAME>=dummy   # TRIDENT: TRIDENT_GIT_TOKEN
export CLONE_URL_OVERRIDE=file:///tmp/gitops-test.git
bash scripts/promote.sh dev <CANDIDATE>
bash scripts/promote.sh dev <CANDIDATE>          # 2nd run: "no change", same SHA
```

**איך מוודאים:**

```bash title="runs on: any shell"
git -C /tmp/gitops-test.git log --oneline main                     # exactly ONE promote commit, after "init"
git -C /tmp/gitops-test.git show main:<DIR>/dev.yaml               # defaultImageTag: "<candidate>"
git -C /tmp/gitops-test.git log -1 --format='%an <%ae> %s'         # the bot identity + promote(dev): <candidate>
```

הציפייה: הרצה ראשונה מדפיסה SHA (בלבד ב-stdout), הרצה שנייה מדפיסה אותו SHA ו-`no change` ב-stderr, ו-`log` מראה commit אחד. ב-stdout יש **רק** ה-SHA, כדי שאפשר יהיה לתפוס אותו: `SHA="$(bash scripts/promote.sh dev <CANDIDATE>)"`.

:::caution[מלכודת · קרה בתרגול]
שתי טעויות מהניסוח הראשון: נשכח `cd` לתוך ה-clone (כל ה-git אחר כך רץ בתיקייה הלא נכונה), ונשארה שורה חשופה `git diff --cached --quiet` שהורגת את ה-script כשיש שינוי. הפתרון נמצא ב-script: `cd "$WORK/gitops"` ואחריו `if ! git diff --cached --quiet`. ראה [overview](../overview/#if--cmd-ופטור-set--e-בתנאי).
:::

אם ה-push נכשל עם 403: הבעיה היא ה-token, ה-scope שלו או הגנת ה-branch, לא ה-script. ראה [gitlab/permissions](../../gitlab/permissions/).

## credential file writer

כותב קובץ credential נכון: הערך נקרא בלי הד, נשמר בלי newline, הקובץ 600 והתיקייה 700. אפשר להעביר כמה נתיבים בבת אחת.

```bash title="file: scripts/write-credential.sh"
#!/usr/bin/env bash
# write-credential.sh <FILE> [<FILE> ...]
#
# Contract
#   effect   for each path: asks for the value (hidden), writes it with NO trailing
#            newline, mode 600; parent directories are created with mode 700
#   never    echoes the value, puts it in shell history, or leaves a looser mode
#   idempotent  re-running overwrites the file with the new value
#   environment bash (also works when your login shell is zsh: run it as 'bash write-credential.sh ...')
set -euo pipefail
umask 077                               # everything created below is private

[ "$#" -ge 1 ] || { echo "usage: write-credential.sh <FILE> [<FILE> ...]" >&2; exit 1; }

for file in "$@"; do
  dir="$(dirname "$file")"
  mkdir -p "$dir"                       # new parent dirs get mode 700 from the umask
  install -d -m 700 "$dir"              # install -d sets the mode of the LAST dir only
  printf 'value for %s: ' "$file" >&2
  IFS= read -rs value                   # -r keep backslashes as typed, -s do not echo
  printf '\n' >&2
  [ -n "$value" ] || { echo "[ERROR] empty value, nothing written: $file" >&2; exit 1; }
  printf '%s' "$value" > "$file"        # %s and no \n: the file is exactly the value
  chmod 600 "$file"                     # in case the file already existed with a looser mode
  value=
  printf '[INFO] wrote %s (%s bytes)\n' "$file" "$(wc -c < "$file")" >&2
done
```

**איך מריצים:**

```bash title="runs on: VM"
bash scripts/write-credential.sh <TOKEN_FILE>
# TRIDENT: bash scripts/write-credential.sh ~/.local/share/trident/credentials/registry/username \
#                 ~/.local/share/trident/credentials/registry/token
```

(`~` מתרחב לפני שה-script רץ, אז נתיב עם `~` עובד.) לכל נתיב ה-script מבקש ערך בנפרד ואתה מקליד אותו (לא מוצג) ולוחץ Enter.

**איך מוודאים** (בלי להדפיס את הערך):

```bash title="runs on: VM"
stat -c '%a %s %n' <TOKEN_FILE>        # 600 <size> <path>; size = number of characters, no +1 for a newline
stat -c '%a %n' "$(dirname <TOKEN_FILE>)"   # 700
tail -c1 <TOKEN_FILE> | xxd            # the last byte must NOT be 0a (that would be a newline)
cmp -s <TOKEN_FILE> <FILE> && echo "IDENTICAL - suspicious if these should differ"
```

:::caution[מלכודת · קרה בתרגול]
הבדיקה האחרונה תפסה בעיה אמיתית: קובץ ה-token היה זהה בייט-לבייט לקובץ ה-username. וה-script מצפה לשם קובץ מדויק (`username`, לא `user`): קרא את ה-comment שבראש ה-script שצורך את הקובץ. ראה גם [overview](../overview/#umask-077-chmod-600-printf-s--קובץ-credential).
:::

אם ה-shell שלך הוא zsh: הרץ תמיד `bash scripts/write-credential.sh …`. בתוך ה-script `read -rs` עובד, אבל `read -p` ב-zsh נכשל.
