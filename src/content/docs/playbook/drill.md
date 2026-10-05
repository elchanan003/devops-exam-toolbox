---
title: תרגול שגיאות
description: הודעות שגיאה מאירועים אמיתיים, ולכל אחת התשובה מוסתרת, סיבה ובדיקה ראשונה, מקובצות לפי תחנה.
sidebar:
  order: 10
---

:::note[בקצרה]
תרגול עצמי ערב המבחן. קוראים את ההודעה, מכסים את התשובה, ואומרים בקול שלושה דברים: מאיזו שכבה (קוד, סביבה, הרשאות, נתיב, מצב), הסיבה הסבירה, והפקודה הראשונה. ואז פותחים.
כל ההודעות קרו בפועל בתרגול. התיקון המלא נמצא בעמוד שבקישור, ושיטת הקריאה ב-[when-stuck](../when-stuck/). הסדר הוא לפי התחנות ב-[order-of-work](../order-of-work/).
:::

## תחנה 1: repos, tokens, variables, runner

**1.** `include` נכשל, והנתיב מתחיל ב-`/` בלי group:

```text title="error text"
/trident-ci not found
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `TRIDENT_GROUP` לא הוגדר, ולכן הורחב למחרוזת ריקה.
**בדיקה ראשונה:** `Group → Settings → CI/CD → Variables`: המשתנה קיים, הערך הוא ה-**path** של ה-group, ו-Mask כבוי.
**עמוד:** [variables](../../gitlab/variables/#variable-חסר-גורם-ל-include-נכשל)

</details>

**2.** `promote:dev` יצר commit בתוך ה-job, וה-push נכשל עם `403`.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Protect ON על `TRIDENT_GIT_TOKEN`, ו-`dev` אינו branch מוגן, ולכן ה-token **ריק** ב-job הזה.
**בדיקה ראשונה:** job `var-check`: `token: EMPTY` ו-`protected branch: false`. תיקון: Protect OFF (Mask נשאר ON).
**עמוד:** [variables](../../gitlab/variables/#mask-מול-protect)

</details>

**3.** `git ls-remote` עם credentials של ה-Argo reader: repo ה-templates עובד, repo ה-gitops נכשל:

```text title="error text"
HTTP Basic: Access denied
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ה-reader לא member ב-gitops. ה-scope זהה בשני ה-repos (הוא של ה-token), לכן ההבדל הוא membership לכל project.
**בדיקה ראשונה:** `Project → Manage → Members` של gitops. התיקון: להוסיף כ-**Reporter** (לא Developer), בלי להריץ סקריפט מחדש.
**עמוד:** [permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo)

</details>

**4.** job תקוע ב-`pending`:

```text title="error text"
no runner for tags trident
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ה-runner לא תואם בשני תנאים בו-זמנית: **scope** (ה-project runner משויך ל-repo אחר) או **tag**. אי אפשר "להוסיף tag" ל-runner מ-scope שגוי.
**בדיקה ראשונה:** `sudo gitlab-runner list`, ו-`Settings → CI/CD → Runners` של ה-project. תיקון: לפתוח את הנעילה ולהפעיל את ה-runner גם ל-project הזה.
**עמוד:** [runners](../../gitlab/runners/#tags-ו-scope-חייבים-להתאים-pending--stuck)

</details>

**5.** `ssh -T git@<GITLAB_HOST>` מדפיס `Welcome to GitLab`, אבל `git clone` נכשל:

```text title="error text"
project could not be found or you don't have permission
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `Welcome` מוכיח **זהות** בלבד, לא הרשאה על project. סיבות: URL או path שגוי, מפתח שגוי ב-`~/.ssh/config` (זהות אחרת), או שה-user לא member.
**בדיקה ראשונה:** `ssh -v -T git@<GITLAB_HOST>` מראה איזה מפתח הוצע; ואז Members.
**עמוד:** [ssh](../../ssh/overview/#git-clone-נכשל-אבל-ssh--t-עובד)

</details>

## תחנה 2: build ו-publish

**6.** `docker build` נכשל ב-`pip install`:

```text title="error text"
Temporary failure in name resolution
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `/etc/resolv.conf` מצביע על ה-stub של systemd-resolved (`127.0.0.53`, loopback), ובנייה בתוך container לא יכולה להשתמש בו. זו סביבה, לא קוד.
**בדיקה ראשונה:** `cat /etc/docker/daemon.json` ו-`resolvectl status | grep -i 'DNS Servers'`. תיקון: `dns` ב-`daemon.json` ו-`systemctl restart docker`.
**עמוד:** [docker](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build)

</details>

**7.** ה-image הראשון נדחף, והשני נכשל:

```text title="error text"
blob unknown to registry - sha256:…
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Docker 29 משתמש ב-containerd image store, ו-pusher שלו מנסה cross-repo mount ש-GitLab Container Registry לא מתמודד איתו. קוד ה-pipeline לא משתנה.
**בדיקה ראשונה:** `docker info --format '{{.Driver}}'`. אם זה לא `overlay2`: `"features":{"containerd-snapshotter":false}` ב-`daemon.json`, restart, ו-**כל** ה-pipeline מחדש (המעבר מרוקן את ה-images).
**עמוד:** [docker](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push)

</details>

**8.** `docker build` נכשל ב-`COPY`:

```text title="error text"
failed to compute cache key: … "/common/trident": not found
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ה-build context הוא `services/<SERVICE>` במקום `services/`. ה-`Dockerfile` מעתיק `common/trident`, תיקיית אחות, וה-context חייב להכיל כל מה ש-`COPY` מזכיר.
**בדיקה ראשונה:** שורת ה-build ב-job: `docker build -t "$IMAGE_REPO/$svc:$CANDIDATE" -f "services/$svc/Dockerfile" services/`. האחרון הוא ה-context.
**עמוד:** [docker](../../docker/overview/#build-context-ו-copy-paths)

</details>

## תחנה 3: promote ו-git

**9.** `git merge --ff-only origin/main` נכשל:

```text title="error text"
fatal: Not possible to fast-forward, aborting.
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ל-`main` המקומי יש commit שאין ב-remote (בתרגול: `check runner`, קובץ בדיקה שלא נדחף). הסיבה כתובה בשורה 2 של הפלט של git.
**בדיקה ראשונה:** `git fetch`, `git status -sb`, `git log --oneline origin/main..HEAD`. אסור `reset --hard` לפני `git status` נקי, וה-commit ב-`reset` הוא ה**יעד**.
**עמוד:** [sync](../../git/sync/#merge---ff-only-נכשל-diverged)

</details>

**10.** ה-CI עשה commit ל-gitops, ואצלך `versions/<ENV>.yaml` ישן ו-`git push` נדחה (`rejected (non-fast-forward)`). מישהו מציע `--force`.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ה-clone המקומי מאחור. GitLab הוא האמת, Argo קורא ממנו, וה-clone הוא רק שולחן עבודה.
**בדיקה ראשונה:** `git fetch && git status -sb`, ואז `git pull`. לא `--force`: הוא מוחק את ה-commit של ה-CI, מחזיר את ה-tag ל-`""` ושובר את ה-render.
**עמוד:** [sync](../../git/sync/#למשוך-שינויים-לפני-עריכה-pull)

</details>

## תחנה 4: values ו-render

**11.** `helm template trident -f charts/x -f …` נכשל:

```text title="error text"
Error: open charts/x: no such file or directory
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `-f` לוקח את המילה שאחריו, ולכן ה-chart הפך לקובץ values. זו שגיאת **נתיב**, לא YAML.
**בדיקה ראשונה:** הסדר: release, chart, ואז flags: `helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE>`. `ls` על כל נתיב ב-`-f` (ה-values בתיקיית ה-gitops, לא ב-templates).
**עמוד:** [helm/overview](../../helm/overview/#pre-flight-render-אותו-render-ש-argo-יריץ)

</details>

**12.** אותה פקודה, הודעה אחרת:

```text title="error text"
Error: non-absolute URLs should be in form of repo_name/path_to_chart, got: trident
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `-f` הופיע לפני ה-chart ובלע אותו, ו-Helm נשאר עם `trident` בלבד, בלי נתיב chart.
**בדיקה ראשונה:** לוודא שה-chart הוא המילה הראשונה אחרי שם ה-release. עוד שני באגים מאותו ניסיון: `$values` ב-bash (ריק) ו-`.` תועה שהפך לשם ה-release.
**עמוד:** [helm/overview](../../helm/overview/#שגיאות-נפוצות-בפקודה-עצמה)

</details>

**13.** render של staging נכשל:

```text title="error text"
Error: YAML parse error on nxs-universal-chart/templates/workloads/deployment.yml: error converting YAML to JSON: yaml: line 47: mapping values are not allowed in this context
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `defaultImageTag` ריק, כי `versions/<ENV>.yaml` הוא `""`: אף אחד לא עשה promote ל-env הזה. שורה 47 היא ב-**render**, לא בקובץ שלך.
**בדיקה ראשונה:** אותה פקודה עם `--set defaultImageTag=probe`. אם היא עוברת, התיקון הוא promote ולא עריכת chart.
**עמוד:** [helm/overview](../../helm/overview/#לבודד---set-defaultimagetagprobe)

</details>

## תחנה 5: bootstrap של Secrets

**14.** ב-dev הכול עובד, ו-Pod ב-staging נתקע ב-`ImagePullBackOff`.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Secret של משיכת images קיים רק ב-namespace של dev. Pod יכול להשתמש רק ב-Secrets של ה-namespace שלו.
**בדיקה ראשונה:** `kubectl -n <NS> get secret <SECRET>` ב-namespace שנכשל, ו-`kubectl get secret -A | grep <SECRET>` לראות איפה הוא כן. תיקון: `bash bootstrap/prepare-environment.sh <ENV>`.
**עמוד:** [secrets](../../kubernetes/secrets/#כלל-ה-namespace)

</details>

**15.** סקריפט ה-bootstrap נעצר:

```text title="error text"
credential file is not readable and non-empty: …/gitops/username
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** שלושה באגים אפשריים: שם הקובץ לא כמו שה-header של הסקריפט דורש (`user` במקום `username`), הרשאות `664` במקום `600`, או שה-token הוא העתק של ה-username.
**בדיקה ראשונה:** `ls -l <FILE>` ו-`wc -c <FILE>`, בלי להדפיס תוכן. תיקיות צריכות `700`.
**עמוד:** [templates](../../bash/templates/#credential-file-writer)

</details>

**16.** סקריפט על ה-VM נכשל, והמשתנה ריק גם ב-`echo`:

```text title="error text"
line 22: !URL_VAR: export TRIDENT_GITOPS_URL=...
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** המשתנה הוגדר כ-CI/CD variable ב-GitLab, אבל הסקריפט רץ ב-shell של ה-VM. CI variables קיימים רק בתוך job.
**בדיקה ראשונה:** `echo "${VAR_NAME:-EMPTY}"` ו-`env | grep <VAR_NAME>`. תיקון: `export` באותו shell, ושוב בכל טרמינל חדש.
**עמוד:** [variables](../../gitlab/variables/#variables-ב-ci-לא-נראים-בטרמינל)

</details>

## תחנה 6: Argo Applications

**17.** דחפת ל-gitops, ו-Argo לא הגיב:

```text title="error text"
No resources found in argocd namespace.
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Argo הוא controller על אובייקטי Application. אם אין אובייקט root, אין על מה להגיב, ו-push ל-Git לא יוצר אותו.
**בדיקה ראשונה:** `grep -rn 'repoURL: ""' <FILE>`, ואז `kubectl apply -f <FILE>` של root, פעם אחת (ב-TRIDENT: `bash bootstrap/bootstrap.sh`).
**עמוד:** [argocd/overview](../../argocd/overview/#ה-bootstrap-edge-root-הוא-האובייקט-היחיד-שמחילים-ידנית)

</details>

**18.** staging מראה `Unknown` ו-`Healthy`, והכול נראה בסדר.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `Unknown` אומר ש-Argo לא הצליח **לרנדר**: אין אפילו משאב אחד, ו-`Healthy` ריק. קוראים SYNC קודם.
**בדיקה ראשונה:** `kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}'`, ולקרוא מלמטה. בתרגול: `versions/<ENV>.yaml` היה `""`.
**עמוד:** [operate](../../argocd/operate/#קריאת-הסטטוסים)

</details>

**19.** אחרי שהוספת `storage.className` ל-values, ה-sync נכשל:

```text title="error text"
StatefulSet.apps "postgres" is invalid: spec: Forbidden: updates to statefulset spec for fields other than 'replicas', 'ordinals', 'template', 'updateStrategy', 'persistentVolumeClaimRetentionPolicy' and 'minReadySeconds' are forbidden
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `volumeClaimTemplates` של StatefulSet הוא immutable, וה-StatefulSet כבר קיים עם הגרסה הישנה.
**בדיקה ראשונה:** לפני מחיקה: מי מחזיק את ה-data? `kubectl -n <NS> get pvc`. אם אין data, מוחקים StatefulSet **ו-PVC** (Argo יוצר מחדש מ-Git), אף פעם לא את ה-StorageClass. אם התיקון ב-Git נכנס לפני ה-create הראשון, אין מה למחוק.
**עמוד:** [storage-probes](../../kubernetes/storage-probes/#אחרי-הוספת-classname-sync-נכשל-על-volumeclaimtemplates)

</details>

**20.** `operationState.phase: Failed`, ובהודעה שגיאה. תיקנת ודחפת, ושום דבר לא זז.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** ל-sync האוטומטי יש 5 ניסיונות, ואחרי `Failed` Argo לא מנסה שוב את אותו revision. `refresh=hard` קורא Git מחדש ולא מתניע sync. push לא עוזר כשהכשל במצב ה-cluster, ו-Argo לא קורא `bootstrap/`.
**בדיקה ראשונה:** `finishedAt` מול `date -u`: ההודעה אולי בת 36 דקות. ואז **sync ידני** (כפתור Sync ב-UI).
**עמוד:** [operate](../../argocd/operate/#argo-ויתר-sync-ידני)

</details>

## תחנה 7: כל environment מאומת

**21.** `postgres-0` נשאר `Pending`, ו-`describe pod` אומר:

```text title="error text"
pod has unbound immediate PersistentVolumeClaims
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** `storage.className` חסר ב-values, ואין StorageClass default ב-cluster, ולכן ה-PVC נוצר בלי class. התיקון ב-**values** (Git), לא בהפיכת class ל-default.
**בדיקה ראשונה:** `kubectl -n <NS> get pvc` (עמודת STORAGECLASS ריקה) ו-`kubectl get sc`.
**עמוד:** [storage-probes](../../kubernetes/storage-probes/#pod-pending-בגלל-pvc-סולם-האבחון)

</details>

**22.** `postgres-0` ב-`CrashLoopBackOff`:

```text title="error text"
StartError … mounting … /var/run/secrets/kubernetes.io … read-only file system
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Secret מאונט ב-`/run/secrets` עצמו מתנגש עם ה-mount של ה-token של ה-service account (`/var/run` הוא `/run`). אותה התנגשות פגעה גם ב-`signal-processor`, לא "כי ה-DB למטה".
**בדיקה ראשונה:** `kubectl -n <NS> describe pod <POD>` ו-Events של **כל** Pod שנופל. תיקון: `mountPath: /run/secrets/<APP_DIR>`, ו-env מצביע על הקובץ `/run/secrets/<APP_DIR>/postgres_password`, לא על התיקייה.
**עמוד:** [secrets](../../kubernetes/secrets/#מאונט-כקובץ-לא-כ-env)

</details>

**23.** ל-Pod שנופל אין לוגים, ו-`kubectl logs` על ה-init container נקי.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** לוג ריק = ה-container **מעולם לא התחיל**. init container שיצא `0` תקין, והוא לא הבעיה. `kubectl logs` בלי `-c` בוחר container אחד.
**בדיקה ראשונה:** `kubectl -n <NS> describe pod <POD>` ו-Events. ל-container שהתרסק: `kubectl -n <NS> logs <POD> -c <CONTAINER> --previous`.
**עמוד:** [kubernetes/overview](../../kubernetes/overview/#אין-לוגים-ה-container-לא-התחיל)

</details>

**24.** תיקנת את ה-`mountPath` ב-Git, ו-`postgres-0` נשאר שבור. מה שונה מ-StatefulSet לעומת Deployment?

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** rolling update של StatefulSet מחכה שה-Pod הישן יהיה Ready, ולכן Pod שבור לא מוחלף לעולם. זה שונה מ-immutable: כאן ה-`template` מותר לשינוי.
**בדיקה ראשונה:** `kubectl -n <NS> delete pod postgres-0` (רק Pod), ואז `kubectl -n <NS> rollout status sts/<SERVICE>`. ב-Deployment לא מוחקים: הוא מסיר את ה-Pod הישן אחרי שהחדש Ready.
**עמוד:** [storage-probes](../../kubernetes/storage-probes/#statefulset-מול-deployment-מתי-מוחקים-pod-ומתי-statefulset)

</details>

**25.** `/info` של dev מחזיר `version` נכון, אבל `detections` הוא `0`. תקלה?

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** לא. ב"ים שקט" אין זיהוי, לפי החוזה. `accepted` שעולה בין שתי קריאות מראה שה-data זורם; מסלול ה-DB לא הוכח עד שמפעילים תרחיש.
**בדיקה ראשונה:** `POST /scenarios/quick-transit` בסימולטור (פורט ops `9101`, דרך `kubectl exec`, ל-image יש python ואין curl), ואחרי כדקה `count` ב-`detections` גדול מ-0.
**עמוד:** [networking](../../kubernetes/networking/#לקרוא-את-info-ולהוכיח-שה-db-מקבל-data)

</details>

## תחנה 8: observability

**26.** סקריפט `prepare-observability.sh` נעצר:

```text title="error text"
prepare-observability.sh: line N: ENV: unbound variable
```

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** עם `set -u` משתנה שלא הוגדר עוצר את הסקריפט. בתרגול ה-stub גם הכיל בלוק postgres שהועתק, ונתיב TLS שגוי.
**בדיקה ראשונה:** `bash -n <FILE>`, ולקרוא כל שורה מול ה-header של הסקריפט. הסקריפט חייב לרוץ פעמיים בלי שגיאה (אידמפוטנטי).
**עמוד:** [templates](../../bash/templates/#prepare-observabilitysh)

</details>

**27.** ה-Application `observability` נשאר אדום גם אחרי שהכנת את ה-namespace ואת ה-Secrets, ודחפת את הסקריפט ל-Git.

<details>
<summary>סיבה ובדיקה ראשונה</summary>

**סיבה:** Argo ניסה כשה-namespace וה-Secrets לא היו קיימים, והגיע ל-`Failed` אחרי 5 ניסיונות. הוא לא קורא `bootstrap/`, ולכן push לא משנה כלום.
**בדיקה ראשונה:** `kubectl get ns <NS>` ו-`kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}' | jq 'keys'` (שמות בלבד), ואז **sync ידני**.
**עמוד:** [observability](../../observability/overview/#application-observability-אדום-סדר-ההכנה)

</details>
