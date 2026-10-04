---
title: טבלת סימפטומים לפי שכבה
description: הטבלה הראשית של תקלות, מחרוזת השגיאה, סיבות לפי סדר, פקודת אימות ותיקון.
sidebar:
  order: 2
---

:::note[בקצרה]
חפש (Ctrl+K) את מחרוזת השגיאה המדויקת. כל שכבה בטבלה נפרדת. כל שורה: סימפטום, סיבות לפי סדר סבירות, פקודה לאישור, ותיקון עם קישור לעמוד הרלוונטי.
לפני הכול: [שיטת הקריאה](../overview/), כי הסיבה האמיתית היא בשורה האחרונה של השגיאה.
:::

## Pipeline

| סימפטום / שגיאה | סיבות (לפי סדר) | לאישור | תיקון |
|---|---|---|---|
| `/trident-ci not found` (נתיב בלי group) | `TRIDENT_GROUP` לא מוגדר | GitLab: Settings, CI/CD, Variables של ה-group | להגדיר `TRIDENT_GROUP=<GROUP>` (path, לא display name), בלי Mask. [variables](../../gitlab/variables/) |
| pipeline לא מתחיל | `include` לא מצליח; ה-branch לא `dev`/`main` (workflow rules); אין runner | GitLab: Pipelines, הודעת השגיאה | [ci/overview](../../ci/overview/) |
| job תקוע ב-pending, `no runner for tags` | runner כבוי; tag לא תואם; runner בהיקף של project אחר | `sudo gitlab-runner list`; GitLab: Settings, CI/CD, Runners | להפעיל את ה-runner ל-project, `tags: [<TAG>]` זהה. [runners](../../gitlab/runners/) |
| `docker build` לא מוצא את החבילה המשותפת | build context הוא `services/<SERVICE>` במקום ה-parent | log של `build` | context = התיקייה שמכילה את הקוד המשותף. [docker](../../docker/overview/) |
| `Temporary failure in name resolution` ב-`pip install` | DNS ב-build (resolv.conf מצביע ל-127.0.0.53) | `cat /etc/docker/daemon.json` | [env-cards](../env-cards/#docker-build-נופל-ב-dns) |
| `blob unknown to registry` ב-push | containerd image store (Docker 29) | `docker info --format '{{.Driver}}'` | [env-cards](../env-cards/#docker-push-נכשל-עם-blob-unknown) |
| `denied: access forbidden` ב-push | אין `docker login` ל-`$CI_REGISTRY` לפני push | log של `publish` | להוסיף login עם `--password-stdin`. [registry](../../gitlab/registry/) |
| promote: `403` | scope חסר; role נמוך על branch מוגן; **Protect על משתנה ב-branch לא מוגן (token ריק)**; token פג; token נוצר ב-project שגוי | log של `promote`; הגדרות המשתנה | [permissions](../../gitlab/permissions/), [variables](../../gitlab/variables/) |
| `!URL_VAR: export ...` | משתנה הוגדר ב-GitLab, אבל הסקריפט רץ ב-shell של ה-VM | `echo "$TRIDENT_GITOPS_URL"` | `export` באותו shell. [overview](../../architecture/overview/#איפה-זה-רץ-הטבלה-הקנונית) |
| `credential file is not readable and non-empty: <FILE>` | שם קובץ שגוי (`user` במקום `username`); קובץ ריק; token הוא העתק של ה-username | `ls -l <FILE>`; `wc -c <FILE>` | לקרוא את ה-header של הסקריפט לשמות המדויקים; `chmod 600`. [bash/snippets](../../bash/snippets/) |
| job הרץ run ישן | קוראים pipeline לא נכון | ה-`CANDIDATE` ב-log: branch + תאריך | לפתוח את ה-pipeline העדכני |
| job ידני `promote:prod` לא מתקדם | נלחץ על pipeline ישן; `needs` לא עבר | GitLab: Pipelines | ה-candidate הוא של ה-pipeline שלו, לפי תכנון. [ci/patterns](../../ci/patterns/) |

:::caution[מלכודת · קרה בתרגול]
`no runner for tags trident` ב-job של `trident-ci` הוא צפוי כשה-runner הוא project runner של `trident-source` בלבד. תיקון: להפעיל אותו גם ל-`trident-ci`.
:::

## Git ו-auth

| סימפטום / שגיאה | סיבות | לאישור | תיקון |
|---|---|---|---|
| `Welcome to GitLab` אבל `project could not be found` | `Welcome` מוכיח authentication בלבד; הוא לא בודק הרשאה על project. סיבות: URL/path שגוי; מפתח שגוי ב-`~/.ssh/config`; המשתמש לא member | `ssh -v -T git@<GITLAB_HOST>` (איזה מפתח הוצג); GitLab: Members | להעתיק URL מ-Code, לתקן `IdentityFile`. [ssh](../../ssh/overview/) |
| `Permission denied (publickey)` | `.pub` לא רשום; config מצביע למפתח אחר; הרשאות לא 700/600 | `ssh-keygen -lf <FILE>` מול ה-fingerprint ב-GitLab | [ssh](../../ssh/overview/) |
| `HTTP Basic: Access denied` | ה-identity לא member בפרויקט; scope חסר; token שגוי | `git ls-remote` עם אותו credential | להוסיף כ-Reporter (קריאה). לא לשדרג ל-Developer. [permissions](../../gitlab/permissions/) |
| `rejected (non-fast-forward)` | ה-remote התקדם (CI עשה commit) | `git fetch`, `git status`, `git log --oneline origin/main..HEAD` | `git pull` לפני עריכה; לא `--force`. [git/sync](../../git/sync/) |
| `merge --ff-only` נכשל, `fatal: Not possible to fast-forward` | main מקומי הקדים/סטה (commit מקומי שלא נדחף) | שורה 2 של הפלט; `git log --oneline --graph --all` | להבין מה ה-commit הזר; `reset` לפי **היעד**. [git/undo](../../git/undo/) |
| "שינוי של CI לא מופיע אצלי" | ה-clone המקומי ישן (GitLab הוא האמת) | `git fetch && git status` | `git pull` |
| שינוי מקומי לא מגיע ל-Argo | לא נדחף (Argo לא רואה את ה-clone) | `git status`, `git log origin/main..HEAD` | `git push` |
| `git push` מעלה רק branch אחד | push פשוט דוחף רק את ה-branch הנוכחי | `git branch -vv` | `git push -u origin <BRANCH>`; tags: `git push origin <TAG>`. [git/branches](../../git/branches/) |

## Render (Helm)

| סימפטום / שגיאה | סיבות | לאישור | תיקון |
|---|---|---|---|
| `YAML parse error ... line N` | `defaultImageTag` ריק (לא נעשה promote); הזחה שבורה; חסר רווח אחרי `:` | `helm template ... --set defaultImageTag=probe` | **N הוא שורה ב-output המרונדר, לא ב-template.** promote או תיקון ערך. [helm/testing](../../helm/testing/) |
| ערך ריק ב-render (`image: /ingest-api`) | מפתח הוצב מחוץ ל-`generic:` (עמודה 0) | `helm template ... \| grep -n 'image:'` | להזיז לבלוק הנכון. [helm/values](../../helm/values/) |
| `$values` ריק / `helm template` נכשל מקומית | `$values` הוא של Argo בלבד | - | להשתמש בנתיבים אמיתיים, `-f` חוזר. [helm/overview](../../helm/overview/) |
| lint עובר, `template` נכשל | `required` לא מסופק: lint לא מכשיל | `helm template ...; echo $?` | להשתמש ב-`template`. [helm/testing](../../helm/testing/) |
| רינדור עובר אבל ערך לא הוזרק | שם מפתח/רישיות שגויה (`secret` ו-`Secret`) | `helm template ... \| grep -n 'expected-key'` | לתקן מפתח; תמיד לרנדר אחרי עריכה |

## Argo

| סימפטום / שגיאה | סיבות | לאישור | תיקון |
|---|---|---|---|
| `Unknown` (וגם `Healthy` לידו) | Argo לא הצליח לרנדר, אין משאבים, ו-`Healthy` ריק | `kubectl get application <APP> -n argocd -o jsonpath='{.status.conditions}'` | לקרוא ה-condition מלמטה. `Healthy` ליד `Unknown` = דגל אדום. [argocd/operate](../../argocd/operate/) |
| `ComparisonError ... YAML parse error line N` | כמו בשכבת Render; גם credential, נתיב שגוי, `$values` בלי `ref: values` | `kubectl get application <APP> -n argocd -o jsonpath='{.status.conditions}'` | [overview](../overview/#דוגמה-פירוק-שגיאה-שכבתית) |
| `repository not found` / `authentication required` | repo Secret חסר; `url` לא זהה ל-`repoURL` | `kubectl get secret <SECRET> -n argocd -o jsonpath='{.data.url}' \| base64 -d` | `url` זהה byte-ב-byte (כולל `.git`). [argocd/operate](../../argocd/operate/) |
| `kubectl get applications -n argocd` ריק אחרי push | ה-root לא הוחל ידנית (bootstrap edge) | `kubectl get applications -n argocd` | להריץ את סקריפט ה-bootstrap. [argocd/overview](../../argocd/overview/) |
| `OutOfSync` לנצח | שדה שה-cluster מילא בברירת מחדל; שדה immutable שונה (selector) | diff ב-UI של Argo | להסיר/להתאים את השדה. [argocd/applications](../../argocd/applications/) |
| `Synced` + `Healthy` אבל לא עובד | אף אחד מהם לא מוכיח התנהגות | `curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info` | לבדוק `/info`, לוגים, ConfigMap |
| תיקון `kubectl edit` / `scale` נעלם | selfHeal | - | התיקון ב-Git. [argocd/operate](../../argocd/operate/) |
| `syncPolicy: {}`: אין sync אוטומטי | חסר `automated` | `kubectl get application <APP> -n argocd -o jsonpath='{.spec.syncPolicy}'` | `automated: {prune: true, selfHeal: true}` |
| ה-app לא נמחק | finalizer / root שמכיל את עצמו | `kubectl get application <APP> -n argocd -o jsonpath='{.metadata.finalizers}'` | [cleanup](../../verify/cleanup/) |

## Pods

| סימפטום / שגיאה | סיבות | לאישור | תיקון |
|---|---|---|---|
| `ImagePullBackOff` / `ErrImagePull` | Secret של pull חסר **ב-namespace הזה**; server שגוי; scope של token; `extraImagePullSecrets` לא הוגדר; נתיב/tag שגוי; `defaultImageTag` ריק | `kubectl describe pod -n <NS> -l trident.dev/service=<SERVICE>` ואז Events | `bash bootstrap/prepare-environment.sh <ENV>` ל-env החסר; לתקן values. [kubernetes/secrets](../../kubernetes/secrets/) |
| עובד ב-dev ולא ב-staging | משהו שונה: בדרך כלל Secret ב-namespace | `kubectl get secret -n <NS>` | `bash bootstrap/prepare-environment.sh <ENV>` |
| `CrashLoopBackOff` | משתנה ריק (`REDIS_HOST`); קובץ סיסמה לא מותקן; DB לא עלה | `kubectl logs -n <NS> -l trident.dev/service=<SERVICE> --previous` | לתקן values; ייתכן downstream של Pod אחר |
| Pod `Running` אבל לא `Ready` | תלות לא זמינה (503 בכוונה); host שגוי ב-ConfigMap | `kubectl describe pod -n <NS> -l trident.dev/service=<SERVICE>` (probe) | לתקן את התלות. [storage-probes](../../kubernetes/storage-probes/) |
| `pod has unbound immediate PersistentVolumeClaims` (Pod `Pending`) | `storage.className` חסר, אין default StorageClass | `kubectl get pvc -n <NS>` (עמודת STORAGECLASS ריקה); `kubectl get sc` | `storage.className: course-local-path` **ב-values**, ו-push |
| `Pending` בלי שגיאה, PVC `WaitForFirstConsumer` | תקין עד ש-Pod משתמש בו | `kubectl describe pvc -n <NS>` | אין. אם Pod לא קיים, תקן אותו |
| Pod לא נוצר | Secret/ConfigMap מופנה לא קיים | `kubectl get events -n <NS> --sort-by=.lastTimestamp` | ליצור את ה-Secret הנדרש |

:::caution[מלכודת · קרה בתרגול]
`postgres-0` נשאר `Pending` ו-signal-processor ב-`CrashLoopBackOff`: המפתח `className` חסר ב-values של postgres, אף על פי שה-header של הקובץ מזכיר אותו. ה-CrashLoop היה downstream של ה-DB. תיקון ב-values, לא חי.
:::

## Ingress ו-TLS

| סימפטום | סיבות | לאישור | תיקון |
|---|---|---|---|
| `404` מה-ingress | `ingressClassName` לא `nginx`; hostname שגוי; path | `kubectl get ingress -n <NS>` | לתקן values. [kubernetes/networking](../../kubernetes/networking/) |
| cert שגוי / שגיאת TLS | שם ה-Secret ב-`extraTls`; Secret לא קיים ב-namespace | `kubectl get secret <SECRET> -n <NS>` | hostname מופיע פעמיים (`hosts[].hostname` ו-`extraTls[].hosts`), שנה את שניהם |
| אין חיבור ל-host | חסר ב-`/etc/hosts`; NodePort שגוי | `curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info` | להוסיף ל-`/etc/hosts` או `--resolve` |

## Data

| סימפטום | סיבות | לאישור | תיקון |
|---|---|---|---|
| נתונים נעלמו אחרי מחיקת Pod של DB | `storage: {}` (ephemeral) | `kubectl get pvc -n <NS>` | `storage.className` + `requestedSize` |
| PVC נשאר אחרי cleanup | namespace לא נמחק | `kubectl get pvc -A` | [cleanup](../../verify/cleanup/) |

## Observability

| סימפטום | סיבות | לאישור | תיקון |
|---|---|---|---|
| ה-dashboard ריק או מערבב envs | `relabel_configs` מחק את `namespace`; label שגוי | Prometheus: Status, Targets; `up{namespace="<NS>"}` | [observability](../../observability/overview/) |
| Grafana לא עולה | Secret admin חסר ב-namespace של observability | `kubectl get secret -n <NS>` | להריץ את סקריפט ה-prepare של observability |
| ה-app של observability אדום לפני שהוכן | namespace לא קיים (תקין עד prepare) | `kubectl get ns` | להכין, אחר כך sync |

:::note
ה-observability עדיין לא נתקל בתרגול, והשורות כאן מבוססות על החוזה והקורס.
:::
