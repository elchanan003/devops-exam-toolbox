---
title: למנוע תקלות ידועות מראש
description: טבלת pre-mortem לכל תחנה, מלכודת, מניעה זולה, מתי עושים אותה, התסמין אם מדלגים, וקישור לעמוד הבעלים.
sidebar:
  order: 5
---

:::note[בקצרה]
קוראים את הבלוק של התחנה **לפני** שמתחילים אותה ([order-of-work](../order-of-work/)), לא את כל הטבלאות. כל שורה היא אירוע שקרה בפועל בתרגול (`(תרגול)`), אלא אם סומנה `[COURSE]` = מתועד בקורס ולא נתקלת בו.
המניעה היא פעולה של שניות עד דקה, ורוב הפקודות הן בדיקות. הפירוט והתיקון נמצאים בעמוד שבעמודת הקישור.
:::

## בדיקת grep לפני כל push של values

```bash title="runs on: VM"
grep -rn 'repoURL: ""' <FILE>
grep -rnE 'mountPath: *"?/run/secrets/?"?([^A-Za-z0-9_/-]|$)' <DIR>
grep -nP ' +$' <FILE>
```

**איך מוודאים:** כל שלוש הפקודות לא מדפיסות כלום. השנייה תופסת `mountPath` שהוא `/run/secrets` עצמו (חייב להיות `/run/secrets/<APP_DIR>`).

## תחנה 1: repos, tokens, variables, runner

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| group: display name במקום path (תרגול) | להעתיק את ה-URL מכפתור **Code**; `git ls-remote git@<GITLAB_HOST>:<GROUP>/<REPO>.git` | ביצירת repos, לפני ה-variable הראשון | clone ו-include נשברים | [overview](../../gitlab/overview/#group-path-מול-display-name) |
| `TRIDENT_GROUP` ריק או Masked (תרגול) | group variable רגיל עם ה-path | לפני ה-pipeline הראשון | `/trident-ci not found` | [variables](../../gitlab/variables/#variable-חסר-גורם-ל-include-נכשל) |
| Protect ON על variable של ה-token הכותב, ו-`dev` לא מוגן (תרגול) | Mask ON, Protect OFF; להריץ job `var-check` | ביצירת ה-variable | `promote:dev` מקבל `403`, ה-token ריק | [variables](../../gitlab/variables/#mask-מול-protect) |
| מניחים project/group access tokens (תרגול) | service account; PAT כ-fallback | לפני יצירת tokens | אין כפתור ב-Free | [identities](../../gitlab/identities/#מה-זמין-ב-free-ומה-דורש-premium) |
| role ו-scope מתערבבים (תרגול) | לרשום לכל token: role (Members) ו-scope (יצירה) בנפרד | ביצירת כל token | `403` למרות token תקין; "נשנה scope ל-Reporter" | [permissions](../../gitlab/permissions/#role-מול-scope) |
| bot לא member ב-repo אחד (תרגול) | `git ls-remote` עם ה-credential של כל bot, על **כל** repo | מיד אחרי ההזמנה | `HTTP Basic: Access denied` על repo אחד; "ניתן Developer" הוא הכיוון הלא נכון | [permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo) |
| deploy token מחפשים ב-Access tokens (תרגול) | `Settings → Repository → Deploy tokens` | ביצירת token למשיכה | "אין לי איפה ליצור" | [identities](../../gitlab/identities/#ליצור-deploy-token-קריאה-בלבד-ל-argo-או-ל-kubelet) |
| `Welcome to GitLab` נחשב הרשאה (תרגול) | אחרי `ssh -T`, גם `git ls-remote` על ה-repo | ב-VM חדשה | `project could not be found or you don't have permission` | [ssh](../../ssh/overview/#git-clone-נכשל-אבל-ssh--t-עובד) |
| runner: אין group runner ב-Free; scope ו-tag (תרגול) | project runner; לפתוח נעילה ולהפעיל לכל project שמריץ jobs | לפני ה-pipeline הראשון בכל repo | `pending`, `no runner for tags trident` | [runners](../../gitlab/runners/#tags-ו-scope-חייבים-להתאים-pending--stuck) |
| `sudo gitlab-runner run` אחרי register (תרגול) | רק register; `sudo gitlab-runner list` | ביצירת ה-runner | instance שני בחזית | [runners](../../gitlab/runners/#לרשום-על-ה-vm) |
| `git push` דוחף branch אחד, ו-tags בכלל לא (תרגול) | `git push -u origin poc dev` ו-`git push origin <TAG>`; `git ls-remote --heads origin` | אחרי יצירת branches ו-tags | CI ו-Argo לא רואים branch; `targetRevision: <TAG>` לא נמצא | [branches](../../git/branches/#לדחוף-כמה-branches-בבת-אחת) |
| משתני bootstrap הוגדרו כ-CI variables (תרגול) | `export` באותו shell ובכל טרמינל חדש; `echo "${VAR_NAME:-EMPTY}"` | לפני script bootstrap | `!URL_VAR: export …`, הערך ריק | [variables](../../gitlab/variables/#variables-ב-ci-לא-נראים-בטרמינל) |
| `gitlab-runner` לא בקבוצת docker `[COURSE]` | `sudo -u gitlab-runner docker info --format '{{.ServerVersion}}'` | אחרי register | `permission denied while trying to connect to the docker API` | [runners](../../gitlab/runners/#ל-runner-צריכה-להיות-גישה-ל-docker) |

## תחנה 2: build ו-publish ל-GitLab Container Registry

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| build context הוא `services/<SERVICE>` (תרגול) | `-f services/<SERVICE>/Dockerfile services/`: ה-context מכיל כל `COPY` | בכתיבת ה-build | `"/common/trident": not found` | [docker](../../docker/overview/#build-context-ו-copy-paths) |
| דגלי build בתוך `docker push` (תרגול) | `docker push <IMAGE>:<CANDIDATE>` בלבד | בהעתקה מ-build | push נכשל | [ci/patterns](../../ci/patterns/#publish-loop) |
| `for` על כמה פריטי `-` (תרגול) | בלוק אחד עם `- \|`; `Pipeline editor → Validate` | בכתיבת jobs | syntax error, כל פריט ב-shell משלו | [ci/patterns](../../ci/patterns/#multi-line----מול-כמה-פריטים) |
| הנחה ש-artifacts מעבירים images (תרגול) | shell executor = daemon אחד; artifacts = קבצים | בחלוקה ל-build ו-publish | עם docker executor ה-image חסר ב-job הבא | [ci/patterns](../../ci/patterns/#publish-loop) |
| "ה-CI דוחף images ל-gitops" (תרגול) | `<IMAGE>` = `$CI_REGISTRY_IMAGE/<SERVICE>`; ל-gitops מגיע רק ה-tag | בהגדרת `IMAGE_REPO` | path שגוי, image לא נמצא | [registry](../../gitlab/registry/#איפה-ה-registry-ומה-הנתיב) |
| פירוק שגוי של שם image, `api:8f3a2c1` (תרגול) | server עד ה-`/` הראשון, tag אחרי ה-`:` האחרון, שם ה-service ב-path | בכתיבת ה-ref | `manifest unknown` | [docker](../../docker/overview/#מבנה-שם-image) |
| DNS ב-build (תרגול) | `cat /etc/docker/daemon.json` ו-`cat /etc/resolv.conf`; להחיל מראש אם יש `127.0.0.53` | לפני ה-build הראשון | `Temporary failure in name resolution` | [docker](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build) |
| containerd snapshotter של Docker 29 (תרגול) | `docker info --format '{{.Driver}}'` מצופה `overlay2` | לפני ה-push הראשון | `blob unknown to registry` ב-push השני | [docker](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push) |
| החלפת store מרוקנת את ה-images (תרגול) | אחרי שינוי `daemon.json`: להריץ את **כל** ה-pipeline (commit ריק), לא retry | אחרי `systemctl restart docker` | publish לא מוצא image | [docker](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push) |
| אין `docker login` לפני push `[COURSE]` | `--password-stdin` עם `CI_REGISTRY_*`, לפני ה-push | בכתיבת publish | `denied: access forbidden` | [ci/patterns](../../ci/patterns/#publish-loop) |
| `latest` או retag `[COURSE]` | תמיד `<CANDIDATE>` | תמיד | אי אפשר להוכיח איזו גרסה רצה | [registry](../../gitlab/registry/#איפה-ה-registry-ומה-הנתיב) |

## תחנה 3: promote

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| clone מקומי של gitops מאחור (תרגול) | `git pull` לפני כל עריכה | לפני כל עריכה | "שינוי ה-CI לא אצלי"; `rejected (non-fast-forward)` | [sync](../../git/sync/#למשוך-שינויים-לפני-עריכה-pull) |
| `--force` כדי לעקוף דחייה (תרגול) | `git pull`, ואז push; אף פעם לא `--force` | כשנדחה push | נמחק ה-commit של ה-CI, ה-tag חוזר ל-`""`, ה-render נשבר | [sync](../../git/sync/#למה-אסור---force-כאן-ומה-זה---force-with-lease) |
| commit מקומי תועה שלא נדחף (תרגול) | `git status -sb` לפני merge; ב-`reset` הארגומנט הוא **היעד** | לפני merge ל-`main` | `fatal: Not possible to fast-forward` | [sync](../../git/sync/#merge---ff-only-נכשל-diverged) |
| `promote.sh` בלי `cd` ל-clone (תרגול) | לקרוא את הסקריפט שורה-שורה: מי רץ ואיפה | בהרכבת הסקריפט | commit ו-push בתיקייה הלא נכונה | [templates](../../bash/templates/#promotesh) |
| `git diff --cached --quiet` ו-`set -e` (תרגול) | `if ! git diff --cached --quiet; then …; fi`; exit `0` = אין שינוי | בכתיבת ה-push | הסקריפט מת בדיוק כשיש שינוי | [ci/patterns](../../ci/patterns/#idempotent-push-no-op-כש-אין-שינוי) |
| קוראים run ישן, `main-20260928…` (תרגול) | לבדוק ב-`CANDIDATE` את ה-branch והתאריך | לפני קריאת log | מתקנים את ה-pipeline הלא נכון | [ci/overview](../../ci/overview/#איזה-candidate-ה-job-השתמש) |
| `promote:prod` ב-pipeline ישן (תרגול) | ללחוץ רק ב-pipeline ש-staging שלו אומת | לפני prod | prod מקבל candidate ישן | [ci/patterns](../../ci/patterns/#promoteprod-למצוא-וללחוץ) |
| `403` מוסבר בסיבה אחת (תרגול) | להרחיב: token פג או בוטל, Protect עם token ריק, URL, token ב-project שגוי | כשיש `403` | נשארים בקטגוריה אחת | [permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo) |
| `[skip ci]` ב-repo עם CI `[COURSE]` | להוסיף להודעת ה-commit של ה-promote | בכתיבת ה-push | לולאת pipelines | [ci/patterns](../../ci/patterns/#idempotent-push-no-op-כש-אין-שינוי) |
| `CI_JOB_TOKEN` דוחף ל-repo אחר `[COURSE]` | service account token | בבחירת ה-credential | `403` | [ci/overview](../../ci/overview/#predefined-variables-שחוזרים-בפרויקט) |

## תחנה 4: values ו-render של ה-chart

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| `-f` לוקח את המילה הבאה (תרגול) | `helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> …`: chart ראשון, `-f` לכל קובץ | בכל render | `Error: open …` או `non-absolute URLs should be in form of repo_name/path_to_chart` | [helm/overview](../../helm/overview/#pre-flight-render-אותו-render-ש-argo-יריץ) |
| values בתיקייה הלא נכונה (תרגול) | `ls` על כל נתיב ב-`-f`; ה-values ב-clone של gitops | בכל render | `no such file or directory` = נתיב, לא YAML | [helm/overview](../../helm/overview/#שגיאות-נפוצות-בפקודה-עצמה) |
| `$values` ב-bash, ו-`.` תועה (תרגול) | נתיבים אמיתיים; `$values` קיים רק ב-Application | בכל render מקומי | `$values` ריק; `invalid release name` | [helm/overview](../../helm/overview/#מחוץ-ל-helm-values) |
| `defaultImageTag` ריק (תרגול) | `--set defaultImageTag=probe` לבידוד; לעשות promote ל-env | ב-render של env שלא קודם | `YAML parse error … line N`, השורה ב-render | [helm/overview](../../helm/overview/#לבודד---set-defaultimagetagprobe) |
| רווח חסר אחרי `:` (תרגול) | render אחרי **כל** עריכה | בכל עריכת values | `mountPath:/run/secrets/<APP_DIR>` הוא scalar; השגיאה בשורה הבאה | [helm/overview](../../helm/overview/#yaml-ב-values-מלכודות) |
| מפתח מחוץ ל-`generic:` ב-col 0, או `Secret` במקום `secret` (תרגול) | `grep -c 'image: /' "$R"` מצופה 0 | אחרי כל render | `image: /ingest-api:…` או מפתח שמתעלמים ממנו | [helm/values](../../helm/values/#generic-ו-imagerepository) |
| `storage.className` נשכח, אף שהערת הקובץ מונה אותו (תרגול) | לעבור על רשימת המפתחות מההערה, מפתח-מפתח; `grep -c 'storageClassName: course-local-path' "$R"` מצופה 1 | בכתיבה הראשונה של postgres | `postgres-0` `Pending`, `unbound immediate PersistentVolumeClaims` | [values](../../helm/values/#postgres-groundhog2k-168) |
| StorageClass default בקלאסטר כתיקון (תרגול) | ה-class נקבע ב-values, ב-Git | כשה-PVC `Pending` | לא ב-Git, ויקשור גם PVC לא קשורים | [storage-probes](../../kubernetes/storage-probes/#pod-pending-בגלל-pvc-סולם-האבחון) |
| `volumeClaimTemplates` של StatefulSet immutable (תרגול) | לתקן ב-Git **לפני** ה-sync הראשון: render, grep ורק אז push | לפני ה-create הראשון של postgres | `StatefulSet.apps "postgres" is invalid … Forbidden` | [storage-probes](../../kubernetes/storage-probes/#אחרי-הוספת-classname-sync-נכשל-על-volumeclaimtemplates) |
| Secret מאונט ב-`/run/secrets` עצמו (תרגול) | `mountPath: /run/secrets/<APP_DIR>`, ו-env מצביע על **הקובץ**; ה-grep שבראש העמוד | לפני push | `StartError … read-only file system` | [secrets](../../kubernetes/secrets/#מאונט-כקובץ-לא-כ-env) |
| `hostname` ב-Ingress מופיע פעמיים (תרגול) | לשנות גם `hosts[].hostname` וגם `extraTls[].hosts` | בכל env | cert שגוי או 404 | [values](../../helm/values/#ingresses-ה-hostname-מופיע-פעמיים) |
| `envConfigmaps` לא לפי ה-CONTRACT (תרגול) | לכל service: טבלת audience מול הרשימה | בכתיבת base.yaml | service מקבל config שלא מיועד לו | [compose-to-k8s](../../architecture/compose-to-k8s/#כלל-ה-config-לפי-audience-least-knowledge) |
| `required` לא נתפס ב-lint (תרגול) | `helm template` על ה-values של כל env, לא `helm lint` | בבדיקת CI | lint ירוק, render נכשל | [testing](../../helm/testing/#lint--template) |
| רשימה מוחלפת ולא ממוזגת `[COURSE]` | בדריסת list להעתיק את כל האיברים; `grep -c livenessProbe "$R"` | בדריסת `containers` או `extraVolumes` | probes נעלמים | [helm/overview](../../helm/overview/#values-layering-מי-מנצח) |

## תחנה 5: bootstrap של Secrets

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| Secret רק ב-namespace אחד (תרגול, פעמיים) | לולאה על **כל** ה-environments, ואז `kubectl -n <NS> get secret <SECRET>` לכל `<NS>` | אחרי כל הרצת `prepare-environment.sh` | `ImagePullBackOff` ב-staging, `not found` ב-prod | [snippets](../../bash/snippets/#לולאה-על-כמה-environments) |
| `--docker-server` עם `https://` או נתיב (תרגול) | `--docker-server=registry.gitlab.com`: מארח בלבד | ביצירת ה-Secret | pull נכשל | [secrets](../../kubernetes/secrets/#docker-registry-למשיכת-images) |
| deploy token לא נבדק (תרגול) | `jwt/auth` מחזיר `200` לפני שיוצרים Secret | אחרי יצירת ה-token | `ImagePullBackOff`, ו-`401` בבדיקה | [registry](../../gitlab/registry/#לאמת-credentials-למשיכה) |
| קובץ credential: שם שגוי, `664`, token = username (תרגול) | לקרוא את ה-header של הסקריפט; `ls -l <FILE>`, `wc -c <FILE>`, `cmp -s <FILE> <FILE>`; תיקיות `700` | לפני הרצת script | `credential file is not readable and non-empty` | [templates](../../bash/templates/#credential-file-writer) |
| newline בסוף ה-token (תרגול) | `printf %s`, `read -rs`, `umask 077` | בכתיבת קבצי credential | סיסמה שגויה בלי הודעה | [secrets](../../kubernetes/secrets/#generic-סיסמה-כקובץ) |
| סיסמה כ-env ולא כקובץ (תרגול) | `POSTGRES_PASSWORD_FILE=/run/secrets/<APP_DIR>/postgres_password` | בכתיבת values | דליפה ל-`describe` וללוגים | [secrets](../../kubernetes/secrets/#מאונט-כקובץ-לא-כ-env) |
| `create` נכשל בהרצה שנייה (תרגול) | `create … --dry-run=client -o yaml`, ואז `apply --server-side` | בכתיבת script | `AlreadyExists` | [secrets](../../kubernetes/secrets/#יצירה-אידמפוטנטית-create--apply) |
| `url` ב-repo Secret שונה מ-`repoURL` (תרגול) | `kubectl -n argocd get secret <SECRET> -o jsonpath='{.data.url}'`, מפוענח base64, זהה בייט-לבייט | אחרי יצירת repo Secret | `repository not found` | [operate](../../argocd/operate/#url-חייב-להיות-זהה-ל-repourl-בייט-לבייט) |
| `register-repository.sh --verify` בודק צורה בלבד (תרגול) | `git ls-remote` עם אותו credential | אחרי register | Argo מקבל `Access denied` | [operate](../../argocd/operate/#לבדוק-שה-credential-באמת-עובד) |
| scripts בלי `+x`, או CRLF (תרגול / `[COURSE]`) | `bash <FILE>`; `sed -i 's/\r$//' <FILE>` | לפני ההרצה הראשונה | `Permission denied` או `\r: command not found` | [env-cards](../../debugging/env-cards/#crlf-בסקריפטים) |
| Secrets אחרי ה-sync, וסקריפט `bootstrap/` כאילו Argo קורא אותו (תרגול) | להכין namespace ו-Secrets **לפני** root | לפני ה-bootstrap של root | `Failed` אחרי 5 ניסיונות | [operate](../../argocd/operate/#argo-ויתר-sync-ידני) |

## תחנה 6: Argo Applications

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| `repoURL: ""` נשאר (תרגול) | `grep -rn 'repoURL: ""' <FILE>` | לפני ה-bootstrap | הסקריפט מסרב, או `repository not found` | [applications](../../argocd/applications/#child-application-עם-multi-source) |
| source שלישי מצביע על templates במקום gitops, בגלל העתקת שורה קודמת (תרגול) | לקרוא את כל הבלוק: path לא מתחיל ב-`charts/`, וה-revision הוא `main` | בכתיבת Application | observability ריק | [applications](../../argocd/applications/#kustomize-directory-source) |
| tag על gitops (תרגול) | templates על `<TAG>`; values, root ו-kustomize על `main` | בכתיבת `targetRevision` | שום env לא מתעדכן אחרי promote | [applications](../../argocd/applications/#tag-מול-branch-ב-targetrevision) |
| `syncPolicy: {}` נשאר (תרגול) | `automated: {prune: true, selfHeal: true}` | בכתיבת Application | נשאר `OutOfSync`, בלי self-heal | [applications](../../argocd/applications/#syncpolicy-ו-finalizers) |
| אחרי push `kubectl get applications` ריק (תרגול) | `kubectl apply -f <FILE>` של root, פעם אחת | אחרי ההכנה | `No resources found` | [argocd/overview](../../argocd/overview/#ה-bootstrap-edge-root-הוא-האובייקט-היחיד-שמחילים-ידנית) |
| שינוי מקומי שלא נדחף (תרגול) | `git log origin/main..HEAD` ריק | לפני שמסיקים מסקנה על Argo | Argo לא רואה את ה-clone | [sync](../../git/sync/#לוודא-ש-gitlab-באמת-קיבל-unpushed--invisible) |
| `Unknown` + `Healthy` נראה תקין (תרגול) | לקרוא SYNC קודם, ואז `.status.conditions` | בכל בדיקת סטטוס | staging ו-prod "תקינים" בלי משאב אחד | [operate](../../argocd/operate/#קריאת-הסטטוסים) |
| `ComparisonError` ב-env שלא קודם (תרגול) | לעשות promote; לא לערוך את ה-chart | לפני render של env | `YAML parse error … line 47` | [operate](../../argocd/operate/#comparisonerror-קוראים-מלמטה-למעלה) |
| Argo ויתר אחרי 5 ניסיונות (תרגול) | לתקן את ה-cluster, ואז sync ידני; `finishedAt` מול `date -u` | אחרי כל `Failed` | `operationState.phase: Failed`; `refresh=hard` לא מתניע; push לא עוזר | [operate](../../argocd/operate/#argo-ויתר-sync-ידני) |
| `kubectl edit` או `scale` על משאב של Argo (תרגול) | לתקן ב-Git: edit, commit, push | לפני כל תיקון | selfHeal מחזיר את השינוי | [operate](../../argocd/operate/#לעולם-לא-מתקנים-live-מתקנים-ב-git) |
| ה-path של root מכיל את root עצמו `[COURSE]` | root מצביע על `argocd/apps`, לא על קובץ ה-root | בכתיבת root | נעילה עצמית במחיקה | [applications](../../argocd/applications/#root-application) |

## תחנה 7: כל environment מאומת

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| `Synced` + `Healthy` נחשב "עובד" (תרגול) | `/info` פעמיים; `accepted` עולה | בכל env | env שלא עובד נראה ירוק | [networking](../../kubernetes/networking/#לקרוא-את-info-ולהוכיח-שה-db-מקבל-data) |
| `detections=0` נקרא כתקלה (תרגול) | להפעיל `quick-transit` בסימולטור ולבדוק `count` ב-DB | בהוכחת מסלול ה-DB | חיפוש באג שלא קיים | [networking](../../kubernetes/networking/#לקרוא-את-info-ולהוכיח-שה-db-מקבל-data) |
| אין לוגים, ומחפשים ב-init container (תרגול) | `kubectl -n <NS> describe pod <POD>` ו-Events; `-c <CONTAINER>`, `--previous` | כש-`logs` ריק | לא רואים `StartError` | [kubernetes/overview](../../kubernetes/overview/#אין-לוגים-ה-container-לא-התחיל) |
| אותה התנגשות mount גם ב-signal-processor, ומניחים "downstream של ה-DB" (תרגול) | Events של **כל** Pod שנופל | לפני שמסיקים שהסיבה משותפת | מתקנים רק חצי | [symptoms](../../debugging/symptoms/#pods) |
| תיקון template ב-StatefulSet, ומחכים שה-Pod יוחלף (תרגול) | `kubectl -n <NS> delete pod <POD>` (רק StatefulSet; Deployment מחליף לבד) | אחרי push של תיקון | ה-Pod השבור נשאר, כי ה-rolling update מחכה ל-Ready | [storage-probes](../../kubernetes/storage-probes/#statefulset-מול-deployment-מתי-מוחקים-pod-ומתי-statefulset) |
| מחיקה בלי לשאול מי מחזיק את ה-data (תרגול) | `kubectl -n <NS> get pvc`; ה-controller כבר מטפל? | לפני כל `delete` | אובדן data או מחיקה מיותרת | [storage-probes](../../kubernetes/storage-probes/#אחרי-הוספת-classname-sync-נכשל-על-volumeclaimtemplates) |
| `promote:prod` לפני שאומת staging (תרגול) | `/info` של staging נכון, ורק אז הכפתור | לפני prod | prod עולה עם גרסה לא מאומתת | [ci/patterns](../../ci/patterns/#promoteprod-למצוא-וללחוץ) |
| תיקון ב-Git לפני ה-create הראשון של prod (תרגול) | להכניס את `className` וה-mount ל-`base.yaml` לפני שמקדמים ל-prod | לפני `promote:prod` | אחרת צריך למחוק StatefulSet ו-PVC גם ב-prod | [storage-probes](../../kubernetes/storage-probes/#אחרי-הוספת-classname-sync-נכשל-על-volumeclaimtemplates) |
| עובד ב-dev ולא ב-staging (תרגול) | לחפש את מה **שמבדיל**: namespace, קובץ values, tag | בכל כשל חלקי | ניחושים במקום differential | [debugging/overview](../../debugging/overview/#עקרונות) |
| `/ready` מחזיר 503 `[COURSE]` | `kubectl -n <NS> logs deploy/<SERVICE> --tail=30`: איזו תלות חסרה | כש-Pod `Running` ולא `Ready` | חיפוש בעיה ב-probe במקום בתלות | [storage-probes](../../kubernetes/storage-probes/#running-אבל-לא-ready) |

## תחנה 8: observability

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| ב-`prepare-observability.sh`: בלוק postgres מועתק, `$ENV` לא מוגדר ב-`set -u`, נתיב TLS שגוי (תרגול) | `bash -n <FILE>`; לקרוא כל שורה מול ה-header; להריץ פעמיים | לפני הרצה | `unbound variable`, Secret לא נוצר | [templates](../../bash/templates/#prepare-observabilitysh) |
| `trident-grafana-admin` בלי שני המפתחות (תרגול) | `--from-file` לכל מפתח; `kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}'`, מפוענח ל-`keys` | אחרי ההרצה | Grafana לא עולה | [observability](../../observability/overview/#grafana-admin-מ-secret-קיים) |
| ה-App אדום כי ה-namespace וה-Secrets הוכנו אחרי הניסיון (תרגול) | להכין, ואז sync ידני; push של `bootstrap/` לא עוזר | אחרי ההכנה | `Failed` אחרי 5 ניסיונות | [observability](../../observability/overview/#application-observability-אדום-סדר-ההכנה) |
| source של ה-dashboards על templates (תרגול) | path לא מתחיל ב-`charts/` ו-revision הוא `main` | בכתיבת ה-Application | dashboard ריק | [applications](../../argocd/applications/#kustomize-directory-source) |
| שם Service קצר בין namespaces (תרגול) | FQDN: `<SERVICE>.<NS>.svc.cluster.local` | בהגדרת target מ-namespace אחר | שם לא נפתר | [networking](../../kubernetes/networking/#service-dns-שם-קצר-מול-fqdn) |
| `relabel_configs` מוחק את `namespace` `[COURSE]` | `count by (namespace) (up)` | אחרי עליית Prometheus | dashboard ריק או מערבב env-ים | [observability](../../observability/overview/#לוודא-שה-label-קיים) |

## תחנה 9: verify, cleanup, idempotency

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| exit codes הפוכים (תרגול) | `0` = הצלחה או אין שינוי; `echo "exit=$?"` | בכתיבת כל בדיקה | תנאי הפוך, סקריפט שמת | [ci/patterns](../../ci/patterns/#idempotent-push-no-op-כש-אין-שינוי) |
| `cleanup.sh` נכשל בהרצה שנייה `[COURSE]` | `--ignore-not-found` ובדיקת קיום; "כבר נעדר" = הצלחה | בכתיבת cleanup | הרצף האידמפוטנטי נשבר | [cleanup](../../verify/cleanup/#רצף-האידמפוטנטיות) |
| מוחקים namespace לפני root, או את `argocd` `[COURSE]` | root קודם; רק namespaces של הפרויקט | בניקוי | Argo מייצר מחדש; נמחקים PVC ו-data | [cleanup](../../verify/cleanup/#סדר-הניקוי) |
| דלתא בהעתקה, חצי זוג חוקים, placeholder שנשאר, תוצר לא הוגש, מונים לא נבדקו, עצירה ב-PASS `[COURSE]` | `grep -rnE 'TODO\|repoURL: ""' <FILE>`; רשימת deliverables מול הקבצים; `/info` אחרי PASS | לפני הגשה | נכשלים בתהליך, לא בידע | [exam-method](../../architecture/exam-method/#כשלי-תהליך-נפוצים) |
| `docker system prune` או שינוי שם project של compose `[COURSE]` | לא להריץ על ה-VM של הקורס | בניקוי | נמחקים images ו-cache של שאר המערכת | [docker](../../docker/overview/#לראות-מה-יש-מקומית) |
| token או סיסמה ב-Git `[COURSE]` | grep לפני הגשה: [last-20-minutes](../last-20-minutes/) | לפני הגשה | credential ב-history | [last-20-minutes](../last-20-minutes/) |

## בכל התחנות

| מלכודת | מניעה זולה | מתי | תסמין אם מדלגים | קישור |
|---|---|---|---|---|
| רווח אחרי `\` בהמשך שורה (תרגול, 3 פעמים) | `grep -nP ' +$' <FILE>` ו-`bash -n <FILE>` | לפני כל commit וכל הרצה | הפקודה נשברת באמצע | [exam-method](../../architecture/exam-method/#כשלי-תהליך-נפוצים) |
| לא יודעים איפה הפקודה רצה (תרגול) | `kubectl`, `helm`, `docker` על ה-VM; CI variables רק ב-job | בכל פקודה חדשה | משתנה ריק, או kubeconfig חסר | [architecture/overview](../../architecture/overview/#איפה-זה-רץ-הטבלה-הקנונית) |
| מנחשים סיבה שהטקסט לא תומך בה (תרגול) | `grep -iE 'denied\|403\|unauthorized'` על ההודעה | בכל שגיאה | תיקונים לא קשורים | [when-stuck](../when-stuck/) |
| תסמין בלי סיווג: קוד או סביבה (תרגול) | `AssertionError` = קוד; `Cannot connect to the Docker daemon` = סביבה | בכל שגיאה | מתקנים קוד שלא שבור | [debugging/overview](../../debugging/overview/#קוד-או-סביבה) |
