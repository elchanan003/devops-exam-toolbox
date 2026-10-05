---
title: יצירתיות בטוחה
description: מה מוסיפים אחרי שכל ה-MUST ירוקים, איך מוכיחים שזה עובד, מה מסוכן, איך מציגים החלטה ותפריט תוספות לפי סדר עדיפויות.
sidebar:
  order: 9
---

:::note[בקצרה]
בוחנים מחפשים שיקול דעת עצמאי, לא עוד features. תוספת טובה היא קטנה, ניתנת להוכחה בפקודה אחת, ומסבירה **למה**. מגיעים לכאן **רק** כשהסולם ירוק ו-[last-20-minutes](../last-20-minutes/) עבר. כל הזמנים בדף הם **הערכות**, לא מדידות.
:::

## כלל הסדר: קודם MUST, אחר כך תוספות

| כלל | פירוט |
|---|---|
| שער כניסה | סולם האימות ירוק ב-[verify/overview](../../verify/overview/), `finish-check.sh` עובר, הרצף האידמפוטנטי עבר |
| תקציב | עד 15-20% מהזמן הכולל ([time-and-triage](../time-and-triage/)) |
| commit נפרד לכל תוספת | כך אפשר לבטל אותה בלי לגעת בשאר: `git revert --no-edit <SHA>` |
| stop-loss | תוספת שלא ירוקה אחרי פי 1.5 מההערכה: מבטלים ועוברים לבאה |
| אחרי כל תוספת | מריצים שוב `verify` והמבחן הסטטי; אם משהו אדום, התוספת מתבטלת |

**איך מוודאים:** `git log --oneline` מראה כל תוספת כ-commit נפרד, ו-`bash finish-check.sh` ממשיך להחזיר `exit=0`.

## תוספות בטוחות

לכל תוספת: מה, למה בוחן מעריך, snippet, איך מוודאים, דקות (הערכה), סיכון. סדר העדיפויות המלא בטבלה בסוף הדף.

### DECISIONS.md: החלטות וויתורים

**מה:** קובץ קצר: החלטה, האלטרנטיבה שנדחתה, למה, ופקודת הוכחה. **למה מעריכים:** מראה שהבנת, לא רק העתקת. קפסטון AirWing בקורס נבחן ב-design review של מערכת רצה, לא בסקריפט. **סיכון:** אפסי, אבל קובץ שנשאר תבנית הוא כמו ריק (ראה [last-20-minutes](../last-20-minutes/#deliverables)). **זמן:** 8-12 דקות (הערכה).

התבנית המלאה בהמשך הדף: [איך מראים החלטה](#איך-מראים-החלטה).

### evidence לפני ואחרי

**מה:** תיקיית `evidence/` עם פלט אמיתי לפני ואחרי פעולה (rollback, self-heal, תיקון). **למה מעריכים:** ראיה שאפשר לבדוק ללא אמון בדברי הסטודנט. **סיכון:** נמוך; הסקריפט קורא בלבד. **זמן:** 5 דקות (הערכה).

```bash title="file: capture-evidence.sh"
#!/usr/bin/env bash
# capture-evidence.sh <label>   e.g. before-rollback / after-rollback — read-only commands only
set -euo pipefail
LABEL="${1:?usage: capture-evidence.sh <label>}"
OUT="evidence/$LABEL"
mkdir -p "$OUT"
{ date -u +%FT%TZ; git log --oneline -5; }                      > "$OUT/git.txt"
kubectl -n argocd get applications                               > "$OUT/argo-apps.txt"
kubectl -n argocd get applications \
  -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.sync.status}{"/"}{.status.health.status}{" rev="}{.status.sync.revision}{"\n"}{end}' \
                                                                 > "$OUT/argo-status.txt"
for f in "$OUT"/*.txt; do [ -s "$f" ] || { echo "EMPTY evidence file: $f" >&2; exit 1; }; done
echo "saved: $OUT"
```

```bash title="runs on: VM"
bash capture-evidence.sh before-rollback
# ... the change ...
bash capture-evidence.sh after-rollback
```

**איך מוודאים:** `saved: evidence/<label>` וקבצים לא ריקים. הסקריפט נבדק עם `bash -n`; בדיקת כשל (אין Applications ב-cluster הזה) הניבה `EMPTY evidence file` ו-exit 1, ובדיקת הצלחה רצה עם `kubectl get namespaces` במקום Applications. עם Applications אמיתיים הוא **לא רץ** כאן.

### hook ב-pre-push: לא דוחפים שאריות

**מה:** hook שחוסם `git push` כשיש TODO, `repoURL: ""`, תג ריק או token. **למה מעריכים:** מונע בדיוק את הכשלים הנפוצים בהגשות, אוטומטית. **סיכון:** חוסם גם דחיפה לגיטימית (ראה הערה); עוקפים בכוונה עם `git push --no-verify`. **זמן:** 6-8 דקות (הערכה).

```bash title="file: .git/hooks/pre-push"
#!/usr/bin/env bash
# .git/hooks/pre-push — blocks a push when the tracked tree still has leftovers or secret-like text
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0
scan() {  # scan <label> <extended-regex> [pathspec...]; label "token..." prints file names only
  local label="$1" re="$2" mode="-nIE"; shift 2
  case "$label" in token*) mode="-lIE" ;; esac   # never echo a matching secret line
  if git grep "$mode" -e "$re" -- . "$@"; then
    echo "pre-push BLOCKED: $label" >&2
    fail=1
  fi
}
scan "TODO/FIXME left"        'TODO|FIXME'                     ':!*.md'
scan "empty repoURL"          'repoURL: ""'
scan "empty image tag"        'defaultImageTag: ""'            ':!*/versions/*'
scan "token-like text"        '(glpat|gldt|glrt|glcbt)-[0-9A-Za-z_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY'
if [ "$fail" -ne 0 ]; then
  echo "fix the lines above, commit, push again (bypass only on purpose: git push --no-verify)" >&2
  exit 1
fi
echo "pre-push: clean"
```

```bash title="runs on: any shell"
chmod +x .git/hooks/pre-push
bash -n .git/hooks/pre-push && echo syntax-ok
git push
```

**איך מוודאים:** repo נקי: `pre-push: clean` והדחיפה עוברת. עם TODO מושתל: `pre-push BLOCKED` והדחיפה נדחית (`error: failed to push some refs`). נבדק כך ב-repo מבודד, עם remote מקומי.

:::caution[מלכודת]
ה-hook בודק את **העץ הנוכחי**, לא את ההיסטוריה: token שנמחק ב-commit מאוחר עדיין עובר. את ההיסטוריה בודקים ב-`git log -G` ([last-20-minutes](../last-20-minutes/#secrets-ב-git-עץ-והיסטוריה)). וה-hook נמצא ב-`.git/hooks`, ולכן לא נדחף ל-GitLab.
:::

### בדיקות עצמיות שליליות ו-`verify.sh` אחד

**מה:** `verify.sh` אחד שעובר על הסולם עם PASS/FAIL, ולכל בדיקה חיובית זוג שלילי (להשחית, לראות `FAIL`, להחזיר). **למה מעריכים:** "בדיקה שלא יכולה להיכשל גרועה מהיעדר בדיקה". זה ה-rung הגבוה בסולם: התנהגות ובדיקה שלילית קשות לזיוף. **סיכון:** נמוך אם הסקריפט קורא בלבד. **זמן:** 15-25 דקות (הערכה).

השלד והבדיקה השלילית: [bash/verify-script](../../bash/verify-script/#בדיקה-עצמית-שלילית-להוכיח-שהבדיקה-יכולה-להיכשל). בדיקות values: [helm/testing](../../helm/testing/#בדיקה-בסיסית-helm-template--grep--q).

**איך מוודאים:** `bash verify.sh; echo $?` נותן `0` על מצב תקין; אחרי השחתה מכוונת של ערך אחד: `FAIL` ו-exit שונה מ-0; אחרי שחזור: שוב `0`.

### Rollback דמו: `git revert` ו-Argo מתכנס

**מה:** מבטלים promote שגוי על ידי `git revert` (לא תיקון חי) ומראים ש-Argo מחזיר את ה-env. **למה מעריכים:** זה ה-GitOps operating model: rollback הוא commit קדימה. **סיכון:** בינוני: נוגע ב-gitops של env אמיתי. עושים על `dev`, אף פעם לא על `prod`. **זמן:** 8-12 דקות (הערכה).

```bash title="runs on: any shell"
git pull --ff-only
git log --oneline -3
git revert --no-edit <SHA>
git push
cat apps/trident/versions/dev.yaml
```

```bash title="runs on: VM"
bash capture-evidence.sh before-rollback
kubectl -n argocd get application <APP> -w
```

`<SHA>` הוא ה-commit `promote(<ENV>): <CANDIDATE>` שרוצים לבטל. אחרי ההתכנסות: `bash capture-evidence.sh after-rollback` ובדיקת `/info` ([verify/overview](../../verify/overview/)). פרטי revert: [git/undo](../../git/undo/#לבטל-commit-שכבר-נדחף-revert).

**איך מוודאים:** `git log` מציג `Revert "promote(<ENV>): …"`, הקובץ חזר לתג הקודם, והאפליקציה מגיעה ל-`Synced`/`Healthy` עם `version` ב-`/info` של התג הקודם. החלק של Git נבדק ב-repo מבודד (קובץ חזר לתג הקודם). החלק של Argo (`-w`, התכנסות) **לא רץ** כאן: אין Applications ב-cluster הזה.

:::caution[מלכודת]
ה-pipeline של `source` יקדם שוב בדחיפה הבאה ל-`dev`. תעד ב-evidence לפני שדוחפים עוד משהו, והראה את ההתכנסות בזמן, לא אחרי.
:::

### Self-heal דמו

**מה:** משנים משהו ב-live ומראים ש-Argo מחזיר. **למה מעריכים:** מוכיח `selfHeal` בפועל ולא רק בהגדרה. **סיכון:** בינוני: לעולם לא על postgres או על משהו עם נתונים; רק Deployment חסר-מצב כמו `ingest-api`. **זמן:** 5 דקות (הערכה).

הפקודות המלאות: [argocd/operate](../../argocd/operate/#בדיקת-self-heal-ו-prune) (`kubectl scale … --replicas=0` ואז `get deployment -w`). שומרים לפני ואחרי עם `capture-evidence.sh`.

**איך מוודאים:** `READY` חוזר ל-`1/1` בלי שנגעת ב-Git. הפקודות לקוחות מדף קיים ו-**לא הורצו** על ה-cluster החי.

### CI job של ולידציה: lint, template, kubeconform

**מה:** job שמריץ `helm lint`, `helm template` לכל env, ו-`kubeconform` על ה-render. **למה מעריכים:** ה-pipeline תופס טעות לפני Argo: `replicas: "abc"` עובר lint ו-template ונתפס רק ב-kubeconform. **סיכון:** בינוני: דורש כלי ב-runner, ו-job אדום חוסם promote אם מחברים אותו ל-`needs`. **זמן:** 15-20 דקות (הערכה).

```yaml title="file: .gitlab-ci.yml (excerpt)"
validate-values:
  stage: test
  tags: [trident]   # your runner tag
  script:
    - helm lint <CHART_DIR> -f base.yaml
    - |
      for ENV in dev staging prod; do
        helm template <RELEASE> <CHART_DIR> -n "<NS_PREFIX>-$ENV" \
          -f base.yaml -f "$ENV.yaml" -f "versions/$ENV.yaml" \
          --set-string defaultImageTag=ci > "render-$ENV.yaml" || exit 1
        kubeconform -strict -summary -ignore-missing-schemas "render-$ENV.yaml" || exit 1
        if grep -nE 'image: *(/|:|"")|:latest' "render-$ENV.yaml"; then echo "FAIL $ENV: bad image ref"; exit 1; fi
      done
  artifacts:
    paths: ["render-*.yaml"]
    expire_in: 1 week
```

התקנה על ה-runner (לפי מדריך ה-CI של הקורס; שמות הקבצים אומתו בדף ה-releases של הפרויקט):

```bash title="runs on: VM"
uname -m
curl -sSL -o /tmp/kc.tgz https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz
sudo tar xzf /tmp/kc.tgz -C /usr/local/bin kubeconform
kubeconform -v
```

ה-`sed` ממפה `aarch64` ל-`arm64` ו-`x86_64` ל-`amd64` (`exec format error` = ארכיטקטורה שגויה). שימוש ב-pipe, לפי התיעוד הרשמי: `helm template <RELEASE> <CHART_DIR> | kubeconform -summary -ignore-missing-schemas`.

**איך מוודאים:** ה-YAML נטען ב-Python (`yaml.safe_load`). ב-scratch הורדתי kubeconform v0.8.0 והרצתי: chart תקין נתן `Valid: 1, Invalid: 0`, ו-Deployment עם `replicas: "abc"` נתן `got string, want null or integer` ו-exit 1. ה-job עצמו **לא רץ** ב-GitLab. kubeconform מושך schemas מהאינטרנט (`raw.githubusercontent.com`): ל-runner בלי גישה הוא ייכשל. `-ignore-missing-schemas` מדלג על CRDs כמו `Application`.

### NetworkPolicy: default-deny ו-allow (SHOULD)

**מה:** חוסמים כניסה ופותחים רק את מסלול הנתונים. **למה מעריכים:** isolation שמוכח (מותר עובר, אסור נכשל) הוא מה שחוזה הנתונים מבקש. **סיכון:** גבוה יחסית: `default-deny` בלי allow ל-ingress controller שובר את `/info` (MUST). **זמן:** 15-20 דקות (הערכה).

הקובץ המלא של TRIDENT (redis, ingest-api, ingress-nginx): [kubernetes/networking](../../kubernetes/networking/#networkpolicy-default-deny-ו-allow). הדפוס המינימלי:

```yaml title="file: networkpolicies.yaml (pattern: one deny, one allow)"
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: <NS>
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-postgres-from-processor
  namespace: <NS>
spec:
  podSelector:
    matchLabels: {trident.dev/service: postgres}
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: {trident.dev/service: signal-processor}
      ports:
        - {protocol: TCP, port: 5432}
```

```bash title="runs on: VM"
cat /etc/k8s-manager/cni
kubectl apply --dry-run=server -f networkpolicies.yaml
```

מוסיפים ל-values של ה-chart תחת `networkPolicies` (לא `kubectl apply` ידני: Argo יחזיר). **קודם allow ל-ingress ול-Prometheus, ורק אז deny.** אחרי הדחיפה: `/info` של כל env וגם בדיקת "אסור" (`simulator → redis` נכשל).

**איך מוודאים:** `canal` (או calico) מ-`cat`; `dry-run=server` מדפיס `created (server dry run)` לשתי המדיניות (נבדק על ה-cluster החי: לא משנה כלום). בדיקה חיה של חסימה **לא רצה**: אין namespace של TRIDENT ב-cluster הזה. אם ה-CNI הוא flannel בלבד, המדיניות מתקבלת ולא נאכפת: בדיקת ה"אסור" חייבת להיכשל, ואם היא מצליחה אין אכיפה.

### `values.schema.json`: רק ל-chart שלך

**מה:** סכימה שחוסמת values שגויים (`tag` ריק, `latest`, registry לא צפוי) ב-`helm template` וב-`lint`. **למה מעריכים:** בדיקת ערכים מוזרקים שנכשלת בשער, לא ב-Argo. **סיכון:** **שובר חוזה** אם ה-chart מיובא מ-upstream ב-tag קבוע ("לעולם לא נערך", כמו ב-TRIDENT): לא מוסיפים קובץ ל-chart כזה. מתאים רק ל-chart שאתה כותב. **זמן:** 10 דקות (הערכה).

```json title="file: <CHART_DIR>/values.schema.json"
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["defaultImageTag", "imageRepository"],
  "properties": {
    "defaultImageTag": { "type": "string", "minLength": 1, "not": { "enum": ["latest"] } },
    "imageRepository": { "type": "string", "pattern": "^registry\\.gitlab\\.com/.+" },
    "replicas": { "type": "integer", "minimum": 1 }
  }
}
```

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> --set-string defaultImageTag=latest --set-string imageRepository=<REGISTRY>/<GROUP>/<REPO>
helm template <RELEASE> <CHART_DIR> --set-string defaultImageTag=<CANDIDATE> --set-string imageRepository=<REGISTRY>/<GROUP>/<REPO>
```

הערה: ה-`pattern` מניח `registry.gitlab.com`; התאם ל-host של המבחן. פרטים ומלכודת `--set` מול `--set-string`: [helm/testing](../../helm/testing/#valuesschemajson).

**איך מוודאים:** הראשונה: `values don't meet the specifications of the schema(s)` ו-exit 1; השנייה: render תקין ו-exit 0. נבדק ב-chart scratch (גם עם tag ריק, עם registry זר ועם `helm lint`).

### בדיקת requests, limits ו-probes

**מה:** מוודאים שכל Deployment מגדיר `resources` ו-probes. **למה מעריכים:** SHOULD שזול, ומראה שחשבת על הרצה אמיתית. ב-TRIDENT הם כבר ב-`base.yaml`: צריך **לבדוק**, לא לכתוב. **סיכון:** נמוך. **זמן:** 3 דקות לבדיקה (הערכה).

```bash title="runs on: VM"
kubectl get deploy -n <NS> -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.containers[*].resources}{"\n"}{end}'
```

**איך מוודאים:** לכל Deployment מודפס אובייקט עם `requests`/`limits`; `{}` = לא הוגדר. (הפקודה נבדקה על ה-cluster החי: Deployments של Argo מציגים `{}`.)

### QoL: סקריפט שמסביר את עצמו

**מה:** `--help`, הודעת שגיאה שאומרת מה חסר, exit code נכון (0 הצלחה, 2 שימוש שגוי). **למה מעריכים:** סקריפט שאדם אחר יכול להריץ בלי לקרוא את הקוד. **סיכון:** אפסי. **זמן:** 3 דקות לסקריפט (הערכה).

```bash title="file: promote-check.sh"
#!/usr/bin/env bash
# promote-check.sh <env> — a script that explains itself
set -euo pipefail
usage() { printf 'usage: %s <env>   (env: dev|staging|prod)\n' "${0##*/}" >&2; exit "${1:-2}"; }
case "${1:-}" in
  -h|--help) usage 0 ;;
  dev|staging|prod) ;;
  *) echo "unknown or missing env '${1:-}'" >&2; usage 2 ;;
esac
echo "checking $1"
```

**איך מוודאים:** `bash promote-check.sh -h` מדפיס usage ו-exit 0; בלי ארגומנט: שגיאה ו-exit 2; `prod`: `checking prod`. (נבדק.) באותו רוח: labels עקביים (`app.kubernetes.io/part-of`, `trident.dev/service`) כפי שהחוזה דורש, בלי להמציא חדשים.

### Loki, Tempo, Alloy (SHOULD)

**מה:** logs ו-traces לכל env באותו dashboard. **למה מעריכים:** שלוש האותות. **סיכון:** גבוה: charts ו-sources נוספים, ו-Application אדום אם משהו חסר. **זמן:** 30-45 דקות (הערכה). הצעדים: [observability/overview](../../observability/overview/#loki-tempo-alloy-should). רק אחרי ש-Prometheus ו-Grafana ירוקים ב-3 ה-envs.

**איך מוודאים:** ה-Application `Synced`/`Healthy` ו-dashboard מציג logs של env אחד בכל בחירה. **לא נבדק כאן.**

### הסבר הרשאות מינימליות

**מה:** שורה ב-`DECISIONS.md` על כל credential: מי, איזה role, איזה scope, ולמה לא יותר. **למה מעריכים:** least privilege הוא נושא ביקורת קבוע. ה-reader של Argo הוא Reporter על ה-repos, ה-writer של CI הוא `write_repository` בלבד. **סיכון:** אפסי. **זמן:** 5 דקות (הערכה). המפה: [architecture/credentials](../../architecture/credentials/), role מול scope: [gitlab/permissions](../../gitlab/permissions/).

:::caution[מלכודת · קרה בתרגול]
"Access denied" ל-reader של Argo נענה ב"אולי לתת Developer": הכיוון שגוי. קריאה דורשת Reporter, ו-Developer שובר least privilege. הסיבה הייתה שה-reader לא היה member של ה-repo. ROLE הוא לכל project, SCOPE הוא לכל token, ושניהם חייבים לאפשר.
:::

**איך מוודאים:** הטענה "ה-reader קורא ולא כותב" מוכחת ב-Argo UI (Settings, Repositories, CONNECTION STATUS) ובטבלת ה-Members; ראה [argocd/operate](../../argocd/operate/#לבדוק-שה-credential-באמת-עובד). **לא הורץ** מול GitLab.

## יצירתיות מסוכנת

**המבחן:** *האם זה שומר על כל MUST, והאם אני יכול להוכיח את זה בפקודה אחת?* אם התשובה לאחת היא "לא", לא עושים.

| רעיון | למה מסוכן | חלופה בטוחה |
|---|---|---|
| לשנות שם, פורט, host, שם Secret או label שהחוזה דורש | ה-verifier של הבוחן מחפש אותם בדיוק | להוסיף label נוסף, לא לשנות קיים |
| לערוך את ה-chart המיובא או להעתיק אותו | חוזה Templates: tag קבוע, "לעולם לא נערך" | values בלבד, או chart נפרד משלך |
| תלות חדשה (operator, chart נוסף, image לא נדרש) | כל תלות היא עוד דבר שיכול ליפול ושאין זמן לאמת | להשתמש במה שכבר ב-cluster |
| non-determinism ב-pipeline או ב-Argo (`latest`, התקנה בזמן ריצה, שעה בתוך render) | אותו commit לא נותן אותו מצב | candidate קבוע, `--set-string` |
| "תיקון חכם" שעוקף GitOps: `kubectl edit`, `helm install`, `kubectl apply` ידני | selfHeal יחזיר, והחוזה אוסר | commit ל-Git |
| משהו שלא אספיק לאמת | תוספת לא מאומתת היא חוב, לא ערך | לרשום ב-`DECISIONS.md` כ"לא נעשה, ולמה" |

**איך מוודאים:** לפני כל תוספת: הפקודה שמוכיחה שה-MUST עדיין נכון (`bash verify.sh` ו-`bash finish-check.sh`). אם אין פקודה כזו, התוספת לא נכנסת.

## איך מראים החלטה

כל החלטה: **שם**, **האלטרנטיבה שנדחתה**, **למה** (שורה או שתיים), ו**פקודת הוכחה** עם הפלט. בלי הוכחה זו דעה.

```text title="file: DECISIONS.md"
# Decisions

## D1 — ____ (the decision, in 6 words)
- Chosen:     ____
- Rejected:   ____   because ____
- Why:        ____ (1-2 lines; the trade-off, not a description)
- Proof:      `____` -> ____ (paste the real output into evidence/<file>)
- Risk left:  ____

## D2 — ____

## Not done, on purpose
- ____ : skipped because ____ ; would verify with `____`
```

דוגמה מלאה, מאירוע אמיתי בתרגול:

```text title="file: DECISIONS.md (example entry)"
## D1 — Writer token variable is not Protected
- Chosen:     TRIDENT_GIT_TOKEN as Masked, Protect OFF
- Rejected:   Protect ON, because promote:dev runs on the unprotected dev branch,
              so the variable arrives empty there and the push returns 403
- Why:        the job must run on dev and main; Mask still hides the value in logs
- Proof:      `git log --oneline -3` in gitops shows promote(dev): <CANDIDATE> written by the pipeline
- Risk left:  any pipeline on any branch of the project can read the token
```

החלטות נוספות שכדאי לרשום (כולן מהמבחן הזה): למה templates ננעלים ב-tag וה-values עוקבים אחרי `main`; למה השער הידני נמצא רק ב-CI ו-Argo נשאר אוטומטי גם ב-prod; למה ה-reader של Argo הוא Reporter ו-token נפרד ל-registry; למה `storage.className` בערכים ולא StorageClass ברירת מחדל על ה-cluster.

**איך מוודאים:** `grep -c '^## D' DECISIONS.md` מחזיר לפחות 3, אין `____` שנשאר (`grep -n '____' DECISIONS.md` ריק), וכל `Proof` מצביע על קובץ ב-`evidence/` שאינו ריק.

## תפריט תוספות לפי עדיפות

הזמנים הם **הערכות**. "תנאי מוקדם" הוא ה-MUST שחייב להיות ירוק לפני שמתחילים.

| # | תוספת | דקות (הערכה) | ערך לבוחן | סיכון | תנאי מוקדם (MUST) |
|---|---|---|---|---|---|
| 1 | `DECISIONS.md` + הסבר הרשאות | 10-15 | גבוה: שיקול דעת מוצג | אפסי | כל ה-MUST ירוקים |
| 2 | `evidence/` לפני ואחרי | 5 | גבוה: הוכחה | נמוך | סולם אימות ירוק |
| 3 | hook ב-pre-push | 6-8 | בינוני: מונע כשלים | נמוך | `finish-check.sh` עובר |
| 4 | `verify.sh` אחד + בדיקות שליליות | 15-25 | גבוה: rung התנהגות | נמוך | סולם ירוק |
| 5 | rollback דמו | 8-12 | גבוה: GitOps אמיתי | בינוני | promote chain עובד, `dev` ירוק |
| 6 | self-heal דמו | 5 | בינוני | בינוני | automated + selfHeal מוגדרים |
| 7 | CI job של ולידציה | 15-20 | גבוה: ערכים מוזרקים נבדקים | בינוני | pipeline ירוק ל-`dev` |
| 8 | NetworkPolicies (SHOULD) | 15-20 | גבוה: isolation | גבוה | `/info` עובד בכל env, CNI אוכף |
| 9 | `values.schema.json` | 10 | בינוני | גבוה אם ה-chart מיובא | render ירוק, ה-chart שלך |
| 10 | בדיקת resources ו-probes | 3 | נמוך-בינוני | נמוך | Pods `Running` |
| 11 | QoL בסקריפטים | 3 לכל סקריפט | נמוך | אפסי | הסקריפט עובד |
| 12 | Loki / Tempo / Alloy (SHOULD) | 30-45 | בינוני | גבוה | Prometheus + Grafana ירוקים ב-3 envs |

**איך מוודאים:** אחרי כל שורה: `bash verify.sh && bash finish-check.sh`. אדום: `git revert --no-edit <SHA>` של אותה תוספת וממשיכים.
