---
title: סדר העבודה ותחנות
description: תשע תחנות לפי הסדר, ולכל אחת מטרה, צעדים, פקודת gate, איך נראה טוב, והכשל הסביר עם הבדיקה הראשונה.
sidebar:
  order: 4
---

:::note[בקצרה]
העמוד שפותחים כל כמה דקות: "באיזו תחנה אני, ומה ה-gate שמוכיח שאפשר לעבור הלאה". לא עוברים תחנה לפני שה-gate שלה ירוק.
הפקודות כאן הן **אותן** פקודות מדויקות שבעמודי ה-reference (מקור אמת אחד); כל צעד הוא קישור.
**MUST** = בלי זה אין מה להגיש. **SHOULD** = רק אחרי שכל ה-MUST ירוקים ([time-and-triage](../time-and-triage/)).
:::

לפני התחנות: מיפוי הפרויקט ב-[first-15-minutes](../first-15-minutes/) ו-preflight ב-[environment-setup](../environment-setup/). לפני כל תחנה קרא את הבלוק שלה ב-[prevent-known-problems](../prevent-known-problems/). כשמשהו אדום: [when-stuck](../when-stuck/).

## סיכום התחנות

| # | תחנה | ה-gate בשורה אחת | |
|---|---|---|---|
| [1](#1-repos-tokens-variables-runner) | repos, tokens, variables, runner | `git ls-remote` עובד וה-runner `is valid` | MUST |
| [2](#2-build-ו-publish-ל-gitlab-container-registry) | build ו-publish ל-GitLab Container Registry | `docker manifest inspect <IMAGE>:<CANDIDATE>` מצליח | MUST |
| [3](#3-promote) | promote | commit `promote(<ENV>): <CANDIDATE>` ב-gitops | MUST |
| [4](#4-values-ו-render-של-ה-chart) | values ו-render | `helm template` עובר, `grep -c 'image: /'` = 0 | MUST |
| [5](#5-bootstrap-של-secrets) | bootstrap של Secrets | Secret בכל namespace + `jwt` מחזיר `200` | MUST |
| [6](#6-argo-applications) | Argo Applications | `Synced/Healthy` ו-conditions ריק | MUST |
| [7](#7-כל-environment-מאומת) | כל environment מאומת | Pods `1/1` ו-`/info` נכון | MUST |
| [8](#8-observability) | observability | `count by (namespace) (up)` מציג כל env | MUST + SHOULD |
| [9](#9-verify-cleanup-idempotency) | verify, cleanup, idempotency | הרצף האידמפוטנטי עובר | MUST |

## 1. repos, tokens, variables, runner

**MUST** · מטרה: pipeline שיכול לרוץ ולכתוב ל-gitops, עם credential נכון לכל actor.

1. [group ו-projects, עם ה-path ולא ה-display name](../../gitlab/overview/#group-path-מול-display-name)
2. [זהות ו-token לכל actor](../../gitlab/identities/) ואז [role מול scope](../../gitlab/permissions/)
3. [CI/CD variable: Mask ON, Protect OFF לכותב](../../gitlab/variables/#mask-מול-protect)
4. [project runner: tag + scope](../../gitlab/runners/)
5. [לדחוף את כל ה-branches ואת ה-tags](../../git/branches/#לדחוף-כמה-branches-בבת-אחת)

**Gate:**

```bash title="runs on: VM"
sudo gitlab-runner list
sudo gitlab-runner verify
git ls-remote "https://oauth2:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git"
```

**איך מוודאים:** ה-runner ברשימה ו-`is valid`; `git ls-remote` מדפיס refs (לכל repo שה-token צריך). ב-UI: ה-self-test `check` של repo ה-CI ירוק. `ls-remote` מוכיח זהות וקריאה בלבד; כתיבה מוכחת רק בתחנה 3.

**הכשל הסביר:** job תקוע ב-`pending` (scope או tag של ה-runner), או `include` נכשל עם `/trident-ci not found` (`TRIDENT_GROUP` ריק).
**בדיקה ראשונה:** `sudo gitlab-runner list` מול `Settings → CI/CD → Runners` של ה-project: [runners](../../gitlab/runners/#tags-ו-scope-חייבים-להתאים-pending--stuck). ל-include: ה-variable כ-group variable רגיל (לא Masked): [variables](../../gitlab/variables/#variable-חסר-גורם-ל-include-נכשל).

## 2. build ו-publish ל-GitLab Container Registry

**MUST** · מטרה: image לכל service ב-**GitLab Container Registry** של ה-repo של הקוד, עם tag = `<CANDIDATE>`, לא `latest`.

1. [`candidate` ב-dotenv](../../ci/patterns/#candidate-תג-אחד-לכל-ה-pipeline-dotenv)
2. [build loop, context = `services/`](../../ci/patterns/#build-loop)
3. [publish loop: login עם `CI_REGISTRY_*` ואז push](../../ci/patterns/#publish-loop)
4. [כרטיסי daemon.json (DNS ו-blob unknown) אם הסימפטומים אפשריים](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build)

**Gate:**

```bash title="runs on: VM"
cat <TOKEN_FILE> | docker login -u <USER> --password-stdin <REGISTRY>
docker manifest inspect <IMAGE>:<CANDIDATE>
docker logout <REGISTRY>
# TRIDENT: <IMAGE> = registry.gitlab.com/trident-lab00/trident-source/ingest-api
```

**איך מוודאים:** `docker manifest inspect` מדפיס manifest (ב-tag שלא קיים: `no such manifest`). ב-UI: `Deploy → Container registry` מציג repository לכל service עם tag `<CANDIDATE>`. ה-credential כאן הוא deploy token עם `read_registry` ([registry](../../gitlab/registry/#ליצור-deploy-token-למשיכה)).

**הכשל הסביר:** `blob unknown to registry` ב-push השני, `Temporary failure in name resolution` ב-build, או `denied: access forbidden`.
**בדיקה ראשונה:** `docker info --format '{{.Driver}}'` (מצופה `overlay2`): [כרטיס 2](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push). שגיאה בלי שינוי בקוד = סביבה, לא קוד.

## 3. promote

**MUST** · מטרה: ה-pipeline כותב `versions/<ENV>.yaml` ב-gitops ומסיים; ה-CI לא נוגע ב-cluster.

1. [`promote.sh` (clone, `cd`, כתיבה, commit רק אם השתנה)](../../bash/templates/#promotesh)
2. [משפחת jobs של promote](../../ci/patterns/#promote-family-extends--rules)
3. [push אידמפוטנטי](../../ci/patterns/#idempotent-push-no-op-כש-אין-שינוי)

**Gate:**

```bash title="runs on: any shell"
git -C <REPO> pull
git -C <REPO> log origin/main -1 --format='%h %an %s' -- <FILE>
# TRIDENT: git -C trident-gitops log origin/main -1 --format='%h %an %s' -- apps/trident/versions/dev.yaml
```

**איך מוודאים:** שורה אחת עם ההודעה `promote(<ENV>): <CANDIDATE>` ועם ה-`CANDIDATE` של ה-pipeline שרצית (branch ותאריך). הרצה שנייה ללא שינוי: אין commit חדש.

**הכשל הסביר:** `403` ב-push של promote, אחרי ש-commit נוצר מקומית ב-job.
**בדיקה ראשונה:** האם ה-token ריק ב-job (Protect ON על branch לא מוגן): ה-job `var-check` מ-[variables](../../gitlab/variables/#mask-מול-protect). אחר כך membership ו-scope: [permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo).

## 4. values ו-render של ה-chart

**MUST** · מטרה: לכל environment יש render מקומי תקין, עם tag אמיתי ובלי ערכים ריקים, **לפני** ש-push מגיע ל-Argo.

1. [render מקומי כמו ש-Argo מריץ](../../helm/overview/#pre-flight-render-אותו-render-ש-argo-יריץ)
2. [לקרוא את ה-API של ה-chart](../../helm/values/#לקרוא-chart-api) ולעבור על כל מפתח שבהערת הקובץ
3. [גיליון `nxs-universal-chart`](../../helm/values/#nxs-universal-chart-גיליון-עזר), [postgres](../../helm/values/#postgres-groundhog2k-168), [redis](../../helm/values/#redis-groundhog2k-247)
4. חוזרים על התחנה לכל `<ENV>`; `versions/<ENV>.yaml` ריק עד promote: [בידוד עם `probe`](../../helm/overview/#לבודד---set-defaultimagetagprobe)

**Gate:**

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> -f <FILE> > /tmp/render.yaml
# TRIDENT: helm template trident charts/nxs-universal-chart -n trident-dev -f base.yaml -f dev.yaml -f versions/dev.yaml
R=/tmp/render.yaml
grep -c 'image: /' "$R"
grep -c 'image: .*:<CANDIDATE>' "$R"
# TRIDENT, postgres render only: grep -c 'storageClassName: course-local-path' "$R"
```

**איך מוודאים:** exit code 0; `grep -c 'image: /'` = `0`; ספירת ה-images עם ה-tag = מספר ה-Deployments (3 ב-TRIDENT); בהרצת ה-postgres הספירה של `storageClassName` = `1`.

**הכשל הסביר:** `Error: open …: no such file or directory` (שגיאת **נתיב**: `-f` בלע את ה-chart, או values לא בתיקייה הזאת), או `YAML parse error … line N` (`defaultImageTag` ריק).
**בדיקה ראשונה:** `ls` על כל נתיב ב-`-f` ושה-chart הוא המילה הראשונה אחרי ה-release; ל-parse error: אותה פקודה עם `--set defaultImageTag=probe`. N הוא שורה ב-render, לא בקובץ שלך: [שגיאות נפוצות](../../helm/overview/#שגיאות-נפוצות-בפקודה-עצמה).

## 5. bootstrap של Secrets

**MUST** · מטרה: לפני ש-Argo עושה sync, בכל namespace של environment יש Secret לכל מה שה-Pods צריכים, ול-Argo יש credential קריאה לכל repo.

1. [credential files: שמות, הרשאות `600`, בלי newline](../../bash/templates/#credential-file-writer)
2. [deploy token עם `read_registry`](../../gitlab/registry/#ליצור-deploy-token-למשיכה) ובדיקה שהוא תקף (ה-gate)
3. [`prepare-environment.sh` בלולאה על כל ה-environments](../../bash/snippets/#לולאה-על-כמה-environments)
4. [repo Secret לכל repo ש-Argo קורא](../../argocd/operate/#repo-secrets)

ה-Secret למשיכת images נוצר עם `kubectl create secret docker-registry`, ונשמר ב-type `kubernetes.io/dockerconfigjson`. אלה רק **שמות של Kubernetes**: ה-registry הוא עדיין ה-GitLab Container Registry, ו-`--docker-server=registry.gitlab.com` (מארח בלבד): [secrets](../../kubernetes/secrets/#docker-registry-למשיכת-images).

**Gate:**

```bash title="runs on: VM"
curl -s -o /dev/null -w '%{http_code}\n' -u "<USER>:$(cat <TOKEN_FILE>)" \
  "https://<GITLAB_HOST>/jwt/auth?service=container_registry&scope=repository:<GROUP>/<REPO>:pull"
kubectl get secret -A | grep <SECRET>
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.type}{"\n"}'
kubectl -n argocd get secret -l argocd.argoproj.io/secret-type=repository
```

**איך מוודאים:** `200` (ב-`401` ה-credential שגוי או פג); ה-Secret מופיע **בכל** namespace של environment; ה-type הוא `kubernetes.io/dockerconfigjson`; ב-`argocd` Secret לכל repo. ללא הדפסת ערכים.

**הכשל הסביר:** `ImagePullBackOff` ב-environment אחד ולא באחר (Secret קיים ב-namespace אחר).
**בדיקה ראשונה:** `kubectl -n <NS> get secret <SECRET>` ב-namespace שנכשל, ו-`kubectl get secret -A | grep <SECRET>` לראות איפה הוא כן: [כלל ה-namespace](../../kubernetes/secrets/#כלל-ה-namespace). שגיאת `credential file is not readable and non-empty`: `ls -l <FILE>` ו-`wc -c <FILE>`.

## 6. Argo Applications

**MUST** · מטרה: root מוחל פעם אחת, וה-children הופכים `Synced` + `Healthy`, מתחילים מ-dev.

1. [`repoURL` ב-root וב-children, `ref: values`, tag מול `main`](../../argocd/applications/#child-application-עם-multi-source)
2. [`syncPolicy` automated + prune + selfHeal](../../argocd/applications/#syncpolicy-ו-finalizers)
3. [root הוא האובייקט היחיד שמחילים ידנית](../../argocd/overview/#ה-bootstrap-edge-root-הוא-האובייקט-היחיד-שמחילים-ידנית)
4. אחרי כל תיקון: `git push`, ולכשל במצב cluster: [sync ידני](../../argocd/operate/#argo-ויתר-sync-ידני)

**Gate:**

```bash title="runs on: VM"
grep -rn 'repoURL: ""' <FILE>
kubectl -n argocd get applications
kubectl -n argocd get application <APP> -o jsonpath='{.status.sync.status}/{.status.health.status}{"\n"}'
kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}'
```

**איך מוודאים:** ה-`grep` לא מדפיס כלום; ברשימה root ואחריו ה-children; `Synced/Healthy`; conditions ריק. `Healthy` לצד `Unknown` = דגל אדום ([operate](../../argocd/operate/#קריאת-הסטטוסים)).

**הכשל הסביר:** `ComparisonError` (השורה האחרונה היא הסיבה), או `operationState.phase: Failed` אחרי 5 ניסיונות.
**בדיקה ראשונה:** ה-conditions מלמטה למעלה: [ComparisonError](../../argocd/operate/#comparisonerror-קוראים-מלמטה-למעלה). ל-`Failed`: `finishedAt` מול `date -u` לפני שקוראים את ההודעה, ואז sync ידני; `refresh=hard` לא מתניע sync.

## 7. כל environment מאומת

**MUST** · מטרה: להוכיח התנהגות, לא רק סטטוס. dev ראשון; staging אחריו; ורק אז הכפתור הידני ל-prod.

1. [סולם האימות 3 עד 5](../../verify/overview/#3-argo)
2. [`curl --resolve` אל ה-NodePort](../../kubernetes/networking/#curl---resolve-אל-ה-nodeport)
3. [`/info` פעמיים, ו-`quick-transit` להוכיח את ה-DB](../../kubernetes/networking/#לקרוא-את-info-ולהוכיח-שה-db-מקבל-data)
4. [`promote:prod` ב-pipeline של `main`](../../ci/patterns/#promoteprod-למצוא-וללחוץ), רק אחרי ש-staging אומת

**Gate:**

```bash title="runs on: VM"
kubectl get pods,svc,ingress,pvc,secret -n <NS>
kubectl -n ingress-nginx get svc
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info
# TRIDENT: curl -k --resolve dev.trident.test:31651:192.168.242.130 https://dev.trident.test:31651/info
```

**איך מוודאים:** Pods `Running` ו-`1/1`, PVC `Bound`; `<PORT>` = המספר אחרי `443:`; ב-`/info` `version` = ה-candidate ו-`environment` = ה-env. `accepted` **עולה** בין שתי קריאות. `detections` = `0` צפוי בים שקט.

**הכשל הסביר:** Pod `Pending` (PVC בלי StorageClass), או `CrashLoopBackOff` עם `StartError … read-only file system`.
**בדיקה ראשונה:** `kubectl -n <NS> describe pod <POD>` ואז Events. לוג ריק = ה-container לא התחיל ([kubernetes/overview](../../kubernetes/overview/#אין-לוגים-ה-container-לא-התחיל)). PVC: [סולם האבחון](../../kubernetes/storage-probes/#pod-pending-בגלל-pvc-סולם-האבחון).

## 8. observability

**MUST** (Prometheus ו-Grafana, אם החוזה כך) · **SHOULD** (Loki, Tempo, Alloy) · מטרה: כל סדרה נושאת `namespace`, וה-dashboard מבחין בין environments. מה MUST ומה SHOULD נקבע לפי החוזה שקיבלת.

1. [`relabel_configs` שמשאיר את `namespace`](../../observability/overview/#prometheus-גילוי-pods-ו-relabel-ל-namespace)
2. [Grafana admin Secret ו-TLS](../../observability/overview/#grafana-admin-מ-secret-קיים)
3. [ה-App אדום עד שה-namespace וה-Secrets קיימים, ואז sync ידני](../../observability/overview/#application-observability-אדום-סדר-ההכנה)
4. [Loki, Tempo, Alloy](../../observability/overview/#loki-tempo-alloy-should), רק אחרי שה-MUST ירוקים

**Gate:**

```bash title="runs on: VM"
# other terminal first: kubectl -n <NS> port-forward svc/prometheus 9090:9090
curl -s 'http://localhost:9090/api/v1/query' --data-urlencode 'query=count by (namespace) (up)'
```

**איך מוודאים:** `data.result` מכיל רשומה לכל `namespace` של environment, כל אחת עם ערך גדול מ-0. env חסר = לא נסרק.

**הכשל הסביר:** ה-App `Failed` או `Missing` כי ה-namespace או ה-Secrets לא היו קיימים כש-Argo ניסה.
**בדיקה ראשונה:** `kubectl get ns <NS>` ו-`kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}' | jq 'keys'` (שמות בלבד); אחרי ההכנה, sync ידני. `bash -n` על ה-script לפני הרצה.

## 9. verify, cleanup, idempotency

**MUST** · מטרה: לסיים כשה-cluster ניתן לאימות, וש-`cleanup` ו-`verify-clean` עוברים גם בהרצה שנייה.

1. [צ'קליסט MUST לפני הגשה](../../verify/cleanup/#צקליסט-must-לפני-הגשה)
2. [סדר הניקוי: root קודם](../../verify/cleanup/#סדר-הניקוי)
3. [רצף האידמפוטנטיות](../../verify/cleanup/#רצף-האידמפוטנטיות)
4. העמוד המלא לסיום: [last-20-minutes](../last-20-minutes/)

**Gate:**

```bash title="runs on: VM"
bash -n <FILE>
grep -rnE 'TODO|repoURL: ""' <FILE>
grep -nP ' +$' <FILE>
```

:::danger[זהירות]
הרצף הבא **מוחק** את כל מה שהפרויקט הניח ב-cluster. מריצים אותו רק בסוף, אחרי שכל התחנות ירוקות וה-evidence נשמר.
:::

```bash title="runs on: VM"
# script paths as in your project (bash/templates uses scripts/ and bootstrap/)
bash verify.sh && bash cleanup.sh && bash verify-clean.sh && bash cleanup.sh && bash verify-clean.sh
```

**איך מוודאים:** שלוש הבדיקות הראשונות לא מדפיסות שגיאה או התאמה; כל חוליה ברצף מסתיימת ב-exit 0, כולל `cleanup.sh` השני שרץ על cluster נקי.

**הכשל הסביר:** `cleanup.sh` שנכשל בהרצה שנייה כי `exit 1` על "לא נמצא".
**בדיקה ראשונה:** `bash cleanup.sh; echo "exit=$?"` פעמיים. "כבר נעדר" הוא הצלחה: `--ignore-not-found` ובדיקת קיום לפני מחיקה: [רצף האידמפוטנטיות](../../verify/cleanup/#רצף-האידמפוטנטיות).
