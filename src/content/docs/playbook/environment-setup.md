---
title: סביבה לפני כל pipeline
description: preflight בחמש עד עשר הדקות הראשונות, קובץ env.sh אחד, זהות git ו-SSH, tmux, והחלת daemon.json מראש כשהתסמינים אפשריים.
sidebar:
  order: 3
---

:::note[בקצרה]
בדקות 15 עד 25, לפני שמריצים pipeline אחד: מוודאים שהכלים, ה-SSH, ה-kubeconfig, ה-runner ו-Docker עובדים, ושכל המשתנים נמצאים בקובץ `env.sh` אחד.
כל כשל סביבה שמתגלה עכשיו עולה דקה; אותו כשל בתוך pipeline עולה עשרים. הכול רץ על ה-**VM**: `kubectl` ו-kubeconfig קיימים רק שם.
:::

## `env.sh`: כל ה-exports בקובץ אחד

קובץ אחד שאתה עושה לו `source` בכל terminal ובכל חלון tmux. הוא מחזיק **שמות ונתיבים בלבד**, לעולם לא ערך של token (ל-token יש `<TOKEN_FILE>`, ראה [bash/snippets](../../bash/snippets/#קובץ-קריאה-ולא-ריק)).
שמור אותו ב-`~/env.sh`, מחוץ לכל repo. השמות שהסקריפטים של הפרויקט דורשים (ב-TRIDENT `TRIDENT_GITOPS_URL`, `TRIDENT_TEMPLATES_URL`) מצא עם `grep -rnE ':\?|URL_VAR|export ' --include=*.sh .` והוסף אותם לבלוק העריכה.

```bash title="file: ~/env.sh"
# env.sh — every variable the exam scripts need, in ONE file.
# Use:  source env.sh      (NOT "bash env.sh": a child shell loses the exports)
# Repeat in EVERY new terminal and tmux window. Holds names and paths only, never a token value.
(return 0 2>/dev/null) || { echo "env.sh: run 'source env.sh', not 'bash env.sh'" >&2; exit 1; }

# ---- edit only this block ------------------------------------------------
export GROUP="<GROUP>"                   # TRIDENT: trident-lab00 (the group PATH, not the display name)
export GITLAB_HOST="<GITLAB_HOST>"       # TRIDENT: gitlab.com
export REGISTRY="<REGISTRY>"             # TRIDENT: registry.gitlab.com (GitLab Container Registry host)
export SOURCE_REPO="<REPO>"              # TRIDENT: trident-source
export CI_REPO="<REPO>"                  # TRIDENT: trident-ci
export TEMPLATES_REPO="<REPO>"           # TRIDENT: trident-templates
export GITOPS_REPO="<REPO>"              # TRIDENT: trident-gitops
export ENVS="dev staging prod"
export WORKDIR="<DIR>"                   # TRIDENT: ~/gitops-lab (parent of the local clones)
export TOKEN_DIR="<DIR>"                 # TRIDENT: ~/.local/share/trident (token files live here, outside every repo)
# ---------------------------------------------------------------------------

# Derived. SSH for your clones on the VM, HTTPS only where Argo or CI need it.
export SOURCE_URL="git@$GITLAB_HOST:$GROUP/$SOURCE_REPO.git"
export GITOPS_URL="git@$GITLAB_HOST:$GROUP/$GITOPS_REPO.git"
export IMAGE_BASE="$REGISTRY/$GROUP/$SOURCE_REPO"      # images belong to the SOURCE project

# Warn about every variable still holding a placeholder (works in bash and zsh).
for _v in GROUP GITLAB_HOST REGISTRY SOURCE_REPO CI_REPO TEMPLATES_REPO GITOPS_REPO WORKDIR TOKEN_DIR; do
  eval "_val=\${$_v}"
  case "$_val" in *"<"*">"*) echo "env.sh: $_v is still a placeholder" >&2 ;; esac
done
unset _v _val

# Aliases (interactive shells only; harmless elsewhere).
alias k='kubectl'
alias apps='kubectl -n argocd get applications'
alias pods='kubectl get pods -A --sort-by=.metadata.creationTimestamp'
alias events='kubectl get events -A --sort-by=.lastTimestamp'
alias gs='git status -sb'
alias ws="grep -rnP ' +\$' --include=*.sh --include=*.yaml --include=*.yml --exclude-dir=.git ."
```

```bash title="runs on: VM"
source ~/env.sh
echo "$GROUP"
echo "$IMAGE_BASE"
```

**איך מוודאים:** אין שורת `still a placeholder`, ו-`echo "$IMAGE_BASE"` מדפיס נתיב שלם מהצורה `<REGISTRY>/<GROUP>/<REPO>`. הקובץ נבדק עם `bash -n` ועם `source` ב-bash וב-zsh. הפעלה עם `bash env.sh` נכשלת בכוונה: child shell מאבד את ה-exports.

## למה variables של GitLab לא קיימים ב-shell

| איפה מוגדר | מי רואה אותו | דוגמה |
|---|---|---|
| CI/CD variable ב-GitLab | **רק** job שרץ ב-pipeline | `TRIDENT_GROUP`, `TRIDENT_GIT_TOKEN` |
| `export` ב-terminal | רק אותו terminal ו-processes שהוא מפעיל | `TRIDENT_GITOPS_URL` לסקריפט bootstrap |
| `env.sh` | כל terminal שעשה `source` | כל המשתנים לעבודה ידנית על ה-VM |

הכלל: **מי מריץ את הסקריפט ואיפה, זה קובע איפה המשתנה חי.** סקריפט ש-GitLab מריץ מקבל variables של GitLab; סקריפט שאתה מריץ ב-VM מקבל רק מה שעשית לו `export`, ושוב בכל terminal חדש.

:::caution[מלכודת · קרה בתרגול]
`bootstrap` נכשל ב-`line 22: !URL_VAR: export TRIDENT_GITOPS_URL=...` וה-`echo` והסביבה ריקים. המשתנים הוגדרו כ-CI/CD variables ב-GitLab, שקיימים רק בתוך jobs. תיקון: `export` (או `source ~/env.sh`) באותו terminal, ומחיקת ה-variables המיותרים ב-GitLab.
:::

**איך מוודאים:** `env | grep -c '^GROUP='` מחזיר `1` ב-terminal שעשית בו `source`, ו-`0` ב-terminal חדש שלא. [gitlab/variables](../../gitlab/variables/#variables-ב-ci-לא-נראים-בטרמינל)

## זהות git ו-SSH ל-GitLab

```bash title="runs on: VM"
git config --global user.name "<USER>"
git config --global user.email "<EMAIL>"
git config user.name
git config user.email
ssh -o BatchMode=yes -o ConnectTimeout=10 -T git@<GITLAB_HOST>
git ls-remote git@<GITLAB_HOST>:<GROUP>/<REPO>.git HEAD
```

שתי פקודות `git config` הראשונות כותבות ל-`~/.gitconfig`; `ssh -T` ו-`ls-remote` פונות ל-GitLab (קריאה בלבד: התחברות ושאילתה, בלי שינוי). `BatchMode=yes` מונע שאלת סיסמה שתתקע את הטרמינל, ו-`ConnectTimeout` מגביל את ההמתנה.

**איך מוודאים:** `ssh -T` מדפיס `Welcome to GitLab, @<USER>!`, ו-`ls-remote` מדפיס sha ו-`HEAD`.
`Welcome` הוא **אימות בלבד**: `ls-remote` הוא שמוכיח הרשאה על ה-project. אם הראשון עובד והשני לא: [ssh/overview](../../ssh/overview/#git-clone-נכשל-אבל-ssh--t-עובד) ו-`~/.ssh/config` עם `IdentitiesOnly` ([ssh/overview](../../ssh/overview/#ליצור-sshconfig-ו-identitiesonly)).

## tmux ו-aliases

ארבעה חלונות: עבודה, מעקב Argo, לוגים והערות. ה-aliases כבר בתוך `env.sh` (`k`, `apps`, `pods`, `events`, `gs`, `ws`).

```bash title="runs on: VM"
tmux has-session -t exam 2>/dev/null || {
  tmux new-session -d -s exam -n work -c "$WORKDIR"
  tmux new-window -t exam -n watch -c "$WORKDIR" "watch -n 5 'kubectl -n argocd get applications'"
  tmux new-window -t exam -n logs -c "$WORKDIR"
  tmux new-window -t exam -n notes -c "$WORKDIR"
  for w in work logs notes; do tmux send-keys -t "exam:$w" 'source ~/env.sh' Enter; done
  tmux select-window -t exam:work
}
tmux attach -t exam
```

חלון חדש לא יורש בהכרח את ה-exports מ-terminal אחר, ולכן הלולאה עושה `source` בכל חלון. מעבר בין חלונות: `Ctrl-b` ואז מספר החלון. ניתוק: `Ctrl-b d`; חזרה: `tmux attach -t exam`.

**איך מוודאים:** `tmux list-windows -t exam` מציג `work`, `watch`, `logs`, `notes`. בחלון `watch` רואים טבלת Applications שמתרעננת. (`tmux attach` עצמו דורש terminal אינטראקטיבי.)

## `preflight.sh`: PASS/FAIL לכל בדיקה

סקריפט קריאה בלבד שמריץ את כל בדיקות הסביבה ומסיים ב-verdict. לא מדפיס token, סיסמה או ערך של Secret: רק שמות ותוצאות. השלד (`pass`, `fail`, `verdict`) הוא של [bash/verify-script](../../bash/verify-script/); כאן נוספו `WARN` לבדיקות מייעצות ופרק על כל תחום.

```bash title="file: preflight.sh"
#!/usr/bin/env bash
# preflight.sh — read-only environment check, run BEFORE any pipeline work.
#
# Contract
#   effect   prints PASS / FAIL / WARN per check, then a verdict
#   exit     0 = no FAIL, 1 = at least one FAIL
#   never    changes anything; never prints a token, password or Secret value
#   network  the ssh check contacts GITLAB_HOST (a login probe, nothing is changed there)
#   run      source env.sh first, then: bash preflight.sh
# NOTE: no `set -e` on purpose: one failed check must not stop the run.
set -uo pipefail

# ---- variables: edit only this block ------------------------------------
GITLAB_HOST="${GITLAB_HOST:-<GITLAB_HOST>}"      # TRIDENT: gitlab.com
TOOLS="kubectl helm docker git jq ssh curl"
REPO_DIR="${REPO_DIR:-.}"                        # the checked-out tree to scan for CRLF / trailing spaces
ARGO_NS="argocd"
STORAGE_CLASS="course-local-path"                # TRIDENT: course-local-path (the name the contract gives)
INGRESS_NS="ingress-nginx"
INGRESS_SVC="ingress-nginx-controller"
REQUIRED_VARS="${REQUIRED_VARS:-GROUP GITLAB_HOST REGISTRY WORKDIR}"   # names from env.sh, plus any the contract needs (TRIDENT: TRIDENT_GROUP)
SKIP_SSH="${SKIP_SSH:-0}"                        # 1 = do not contact GITLAB_HOST
# -------------------------------------------------------------------------

FAILURES=0
WARNINGS=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; WARNINGS=$((WARNINGS + 1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
hint() { printf '        -> %s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }
check() { local label="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$label"; else fail "$label"; return 1; fi; }
is_placeholder() { case "$1" in *"<"*">"*) return 0 ;; *) return 1 ;; esac; }

step "1. tools on this machine"
for t in $TOOLS; do check "tool: $t" have "$t"; done
have tmux || warn "tool: tmux (optional, for the terminal layout)"

step "2. git identity"
[ -n "$(git config user.name 2>/dev/null)" ]  && pass "git user.name is set"  || { fail "git user.name is not set";  hint 'git config --global user.name "<USER>"'; }
[ -n "$(git config user.email 2>/dev/null)" ] && pass "git user.email is set" || { fail "git user.email is not set"; hint 'git config --global user.email "<EMAIL>"'; }

step "3. SSH to GitLab (contacts $GITLAB_HOST)"
if [ "$SKIP_SSH" = 1 ]; then
  warn "ssh check skipped (SKIP_SSH=1)"
elif is_placeholder "$GITLAB_HOST"; then
  fail "GITLAB_HOST is still a placeholder: edit the variables block or source env.sh"
elif have ssh; then
  ssh_out="$(timeout 20 ssh -o BatchMode=yes -o ConnectTimeout=10 -T "git@$GITLAB_HOST" 2>&1)"
  if grep -q 'Welcome to GitLab' <<<"$ssh_out"; then
    pass "ssh -T git@$GITLAB_HOST authenticates (authentication only, not project access)"
  else
    fail "ssh -T git@$GITLAB_HOST did not say 'Welcome to GitLab'"
    hint "last line: $(tail -n 1 <<<"$ssh_out")"
  fi
else
  fail "ssh is missing"
fi

step "4. kubeconfig and cluster (read-only)"
if have kubectl; then
  if kubectl get nodes --request-timeout=10s >/dev/null 2>&1; then
    pass "kubectl get nodes works"
    check "namespace $ARGO_NS is reachable"                    kubectl get namespace "$ARGO_NS" --request-timeout=10s
    check "Argo Applications can be listed in $ARGO_NS"        kubectl -n "$ARGO_NS" get applications --request-timeout=10s
    check "StorageClass $STORAGE_CLASS exists"                 kubectl get storageclass "$STORAGE_CLASS" --request-timeout=10s
    https_port="$(kubectl -n "$INGRESS_NS" get svc "$INGRESS_SVC" -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}' 2>/dev/null)"
    http_port="$(kubectl -n "$INGRESS_NS" get svc "$INGRESS_SVC" -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}' 2>/dev/null)"
    case "$https_port" in
      ''|*[!0-9]*) fail "ingress NodePort not found ($INGRESS_NS/$INGRESS_SVC)" ;;
      *)           pass "ingress NodePorts: https=$https_port http=${http_port:-?} (use these in curl --resolve)" ;;
    esac
  else
    fail "kubectl get nodes failed (kubeconfig exists only on the VM?)"
    hint "kubectl config current-context; echo \"\${KUBECONFIG:-~/.kube/config}\""
  fi
else
  fail "kubectl is missing, cluster checks skipped"
fi

step "5. GitLab runner (needs sudo to read /etc/gitlab-runner)"
if have systemctl && systemctl is-active --quiet gitlab-runner 2>/dev/null; then
  pass "gitlab-runner service is active"
else
  fail "gitlab-runner service is not active"
  hint "systemctl status gitlab-runner"
fi
if have gitlab-runner; then
  # Never echo the list: each line carries the runner token.
  if runners="$(sudo -n gitlab-runner list 2>&1)"; then
    n="$(sed -E 's/\x1b\[[0-9;]*m//g' <<<"$runners" | grep -c 'Executor=')"   # strip colour codes first
    if [ "$n" -gt 0 ]; then pass "gitlab-runner list: $n runner(s) registered"; else fail "gitlab-runner list: no runner registered"; fi
  else
    fail "could not run 'sudo -n gitlab-runner list' (sudo needs a password here?)"
    hint "run it yourself; plain 'gitlab-runner list' without sudo reads a different, empty config"
  fi
else
  fail "gitlab-runner binary is missing"
fi

step "6. docker daemon"
if have docker && driver="$(docker info --format '{{.Driver}}' 2>/dev/null)" && [ -n "$driver" ]; then
  pass "docker daemon answers (storage driver: $driver)"
  case "$driver" in
    overlay2) pass "classic image store (overlay2)" ;;
    *)        warn "storage driver is '$driver': Docker 29 containerd store may break push ('blob unknown')"
              hint "see the daemon.json cards in docker/overview" ;;
  esac
else
  fail "docker info failed (daemon down, or this user is not in the docker group)"
fi
if [ -f /etc/docker/daemon.json ]; then
  pass "/etc/docker/daemon.json exists"
else
  warn "/etc/docker/daemon.json does not exist (fine until a DNS or push symptom appears)"
fi
if grep -qE '^nameserver +127\.0\.0\.53' /etc/resolv.conf 2>/dev/null && [ ! -f /etc/docker/daemon.json ]; then
  warn "resolv.conf uses the systemd-resolved stub and daemon.json has no dns: 'docker build' may fail on name resolution"
fi

step "7. required variables from env.sh (names only, values are never printed)"
if is_placeholder "$REQUIRED_VARS"; then fail "REQUIRED_VARS still has a placeholder: edit the variables block"; REQUIRED_VARS=""; fi
for v in $REQUIRED_VARS; do
  eval "val=\"\${$v:-}\""
  if [ -n "$val" ]; then pass "variable $v is set"; else fail "variable $v is empty or unset (source env.sh in THIS terminal)"; fi
done

step "8. files in $REPO_DIR: no CRLF, no trailing whitespace"
if [ -d "$REPO_DIR" ]; then
  incl=(--include='*.sh' --include='*.yaml' --include='*.yml' --include='*.env' --include='*.json')
  excl=(--exclude-dir=.git --exclude-dir=node_modules)
  crlf="$(grep -rIlP '\r$' "${incl[@]}" "${excl[@]}" "$REPO_DIR" 2>/dev/null)"
  if [ -z "$crlf" ]; then pass "no CRLF line endings"; else fail "CRLF in: $(tr '\n' ' ' <<<"$crlf")"; hint "sed -i 's/\\r\$//' <FILE>"; fi
  trail="$(grep -rIlP ' +$' "${incl[@]}" "${excl[@]}" "$REPO_DIR" 2>/dev/null)"
  if [ -z "$trail" ]; then pass "no trailing whitespace"; else fail "trailing whitespace in: $(tr '\n' ' ' <<<"$trail")"; hint "grep -nP ' +\$' <FILE>"; fi
else
  fail "REPO_DIR '$REPO_DIR' is not a directory"
fi

printf '\n'
if [ "$FAILURES" -eq 0 ]; then
  printf '\033[32mpreflight: PASS\033[0m (%d warning(s))\n' "$WARNINGS"; exit 0
fi
printf '\033[31mpreflight: %d failure(s)\033[0m, %d warning(s)\n' "$FAILURES" "$WARNINGS"; exit 1
```

```bash title="runs on: VM"
source ~/env.sh
bash preflight.sh
echo "exit code: $?"
SKIP_SSH=1 REPO_DIR=<DIR> bash preflight.sh
```

השורה השנייה מריצה בלי לפנות ל-GitLab (`SKIP_SSH=1`) ועל tree אחר. `sudo` נדרש ל-`gitlab-runner list` כי הוא קורא את `/etc/gitlab-runner/config.toml`; בלי `sudo` הפקודה קוראת קובץ אחר וריק. אל תדביק את הפלט המלא של `gitlab-runner list`: כל שורה שלו מכילה את ה-token של ה-runner.

פלט מ-VM התרגול (בלי `ssh`, כשאין עדיין runner רשום, ואין זהות git):

```text title="example output"

1. tools on this machine
  PASS  tool: kubectl
  PASS  tool: helm
  PASS  tool: docker
  PASS  tool: git
  PASS  tool: jq
  PASS  tool: ssh
  PASS  tool: curl

2. git identity
  FAIL  git user.name is not set
        -> git config --global user.name "<USER>"
  FAIL  git user.email is not set
        -> git config --global user.email "<EMAIL>"

3. SSH to GitLab (contacts gitlab.com)
  WARN  ssh check skipped (SKIP_SSH=1)

4. kubeconfig and cluster (read-only)
  PASS  kubectl get nodes works
  PASS  namespace argocd is reachable
  PASS  Argo Applications can be listed in argocd
  PASS  StorageClass course-local-path exists
  PASS  ingress NodePorts: https=31731 http=30593 (use these in curl --resolve)

5. GitLab runner (needs sudo to read /etc/gitlab-runner)
  PASS  gitlab-runner service is active
  FAIL  gitlab-runner list: no runner registered

6. docker daemon
  PASS  docker daemon answers (storage driver: overlayfs)
  WARN  storage driver is 'overlayfs': Docker 29 containerd store may break push ('blob unknown')
        -> see the daemon.json cards in docker/overview
  WARN  /etc/docker/daemon.json does not exist (fine until a DNS or push symptom appears)
  WARN  resolv.conf uses the systemd-resolved stub and daemon.json has no dns: 'docker build' may fail on name resolution

7. required variables from env.sh (names only, values are never printed)
  PASS  variable GROUP is set
  PASS  variable GITLAB_HOST is set
  PASS  variable REGISTRY is set
  PASS  variable WORKDIR is set

8. files in .: no CRLF, no trailing whitespace
  PASS  no CRLF line endings
  PASS  no trailing whitespace

preflight: 3 failure(s), 4 warning(s)
```

**איך מוודאים:** הסקריפט נבדק עם `bash -n`, ורץ בפועל על ה-VM (קורא בלבד). נבדק גם שמסלול ה-`FAIL` עובד: tree עם CRLF ורווח בסוף שורה, GITLAB_HOST שלא נערך, ו-`ssh` לשרת שלא מחזיר `Welcome` (נבדק על `127.0.0.1`; מסלול ה-`PASS` מול GitLab עצמו לא נבדק). `shellcheck` לא מותקן על ה-VM, ולכן לא הורץ. מטרה: `preflight: PASS`, `WARN` מותרים אבל נקראים.

## כשל בבדיקה: מה עושים

| בדיקה שנכשלה | פעולה | עמוד |
|---|---|---|
| tool חסר | `command -v <tool>`; על ה-VM הכול מותקן, אם אתה לא על ה-VM עבור אליה | [debugging/env-cards](../../debugging/env-cards/#כלים-חסרים-ב-vm) |
| `kubectl get nodes` | הפקודה רצה על מכונה בלי kubeconfig: לעבור ל-VM | [debugging/env-cards](../../debugging/env-cards/#kubeconfig-רק-ב-vm) |
| `gitlab-runner list`: אין runner | ליצור ולרשום runner ב-UI | [gitlab/runners](../../gitlab/runners/#ליצור-runner-ב-ui) |
| `gitlab-runner` לא active | `systemctl status gitlab-runner`; לא `gitlab-runner run` ידני | [gitlab/runners](../../gitlab/runners/#אחרי-runner-shell-מה-לדעת) |
| CRLF או רווחים | ראה את הפרק על CRLF למטה | [git/hygiene](../../git/hygiene/) |
| `WARN` על Docker | הפרק על `daemon.json` למטה | [docker/overview](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build) |

## NodePorts של ה-Ingress ו-`/etc/hosts`

ה-NodePort **משתנה** בין סביבות: ה-README של TRIDENT אומר `31024`, בתרגולים קודמים היה `31651`, וב-VM בזמן הכתיבה `31731`. לכן מגלים, לא מעתיקים.

```bash title="runs on: VM"
kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}{"\n"}'
kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}{"\n"}'
getent hosts <HOST>
grep -q '<HOST>' /etc/hosts || echo "<VM_IP> <HOST>" | sudo tee -a /etc/hosts
```

השורות הראשונות מדפיסות את ה-NodePort של 443 ושל 80. `getent hosts` מראה אם השם כבר מתורגם; השורה האחרונה מוסיפה רשומה רק אם חסרה (היא כותבת ל-`/etc/hosts`, ולכן לא הורצה כאן; צורת ה-`grep -q ... ||` נבדקה על קובץ זמני). בלי רשומה אפשר `curl --resolve`: [kubernetes/networking](../../kubernetes/networking/#curl---resolve-אל-ה-nodeport).

**איך מוודאים:** שני מספרים (למשל `31731` ו-`30593`), ו-`getent hosts <HOST>` מחזיר `<VM_IP>`.

## CRLF ורווחים בסוף שורה

רווח אחרי `\` (המשך שורה) פגע שלוש פעמים באותה session, ו-CRLF שובר סקריפט שהגיע מ-Windows. בודקים לפני ה-commit הראשון ולפני כל push.

```bash title="runs on: VM"
cd <DIR>
grep -rIlP '\r$' --include=*.sh --include=*.yaml --include=*.yml --include=*.env --exclude-dir=.git .
grep -rInP ' +$' --include=*.sh --include=*.yaml --include=*.yml --include=*.env --exclude-dir=.git .
sed -i 's/\r$//' <FILE>
```

הראשונה מדפיסה שמות קבצים עם CRLF, השנייה מספרי שורות עם רווח בסוף, והשלישית מתקנת קובץ אחד (אחריה `chmod +x <FILE>` אם צריך). הוספת `.gitattributes` שמונעת CRLF קבוע: [git/hygiene](../../git/hygiene/#למנוע-crlf-קבוע-עם-gitattributes).

**איך מוודאים:** שתי הפקודות הראשונות לא מדפיסות כלום (נבדקו על tree נקי ועל קובץ עם שני הפגמים).

## `daemon.json`: מתי להחיל מראש

שני כרטיסי הסביבה קרו בתרגול ועלו שעה: DNS ב-`docker build`, ו-`blob unknown to registry` ב-push ל-GitLab Container Registry. כדאי להחיל **לפני ה-build הראשון** אם הבדיקה מראה שהתסמין אפשרי, כי אחר כך זה יקר: הפעלה מחדש של Docker עוצרת containers, ומעבר בין image stores מרוקן את ה-images הקיימים.

| תסמין אפשרי | בדיקה | אם כן |
|---|---|---|
| `Temporary failure in name resolution` ב-build | `grep nameserver /etc/resolv.conf` | `127.0.0.53` = stub של systemd-resolved, ו-containers של build לא משתמשים בו: להוסיף `dns` |
| `blob unknown to registry` ב-push (image שני ואילך) | `docker info --format '{{.Driver}}'` | `overlayfs` = containerd image store של Docker 29: להוסיף `features`; המטרה `overlay2` |

```bash title="runs on: VM"
grep nameserver /etc/resolv.conf
resolvectl status | grep -i 'DNS Servers'
docker info --format '{{.Driver}}'
sudo cat /etc/docker/daemon.json
```

ערכי ה-DNS **שונים בין VMs**: ב-VM הזה `resolvectl` מראה `169.254.169.254`, בתרגול קודם `192.168.242.2`. תמיד קח אותם מהפלט שלך. ה-JSON המדויק, המיזוג עם קובץ קיים והפעלה מחדש: [docker/overview, כרטיס 1](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build) ו-[כרטיס 2](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push).

:::caution[מלכודת · קרה בתרגול]
אחרי מעבר ל-`overlay2` ה-images שנבנו קודם נעלמים. מריצים מחדש את **כל** ה-pipeline (commit ריק ל-`dev`), לא רק retry ל-`publish`.
:::

**איך מוודאים:** אחרי ההחלה `docker info --format '{{.Driver}}'` מחזיר `overlay2`, ו-`docker run --rm --entrypoint getent <IMAGE>:<CANDIDATE> hosts registry.gitlab.com` מדפיס כתובת IP.
(ב-VM הזה כרגע הדרייבר `overlayfs` ואין `daemon.json`, כלומר שני התסמינים אפשריים; לא הוחל כאן דבר.)

:::tip[עיקרון]
בדיקה בסביבה היא החלטה של דקה. כשל סביבה בתוך pipeline נראה כמו באג בקוד, ובזבוז הזמן הוא בחיפוש הסיבה הלא נכונה.
:::

המשך: [order-of-work](../order-of-work/) · [prevent-known-problems](../prevent-known-problems/) · [debugging/env-cards](../../debugging/env-cards/).
