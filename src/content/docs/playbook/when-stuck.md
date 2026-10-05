---
title: כשנתקעים
description: פרוטוקול של שבעה צעדים לשגיאה, מה לא עושים ולמה, ושתי דוגמאות פירוק מאירועים אמיתיים.
sidebar:
  order: 6
---

:::note[בקצרה]
כשמשהו אדום פותחים את העמוד הזה במקום לנחש. הסדר קבוע: שעון, קריאת השגיאה מלמטה, סיווג, "איזה run", השוואה, בידוד, ורק אז חיפוש.
המטרה: לא להוסיף סיבות שהטקסט לא תומך בהן. טבלת התסמינים המלאה נמצאת ב-[debugging/symptoms](../../debugging/symptoms/), והשיטה ב-[debugging/overview](../../debugging/overview/).
:::

## הפרוטוקול

1. **שעון: 2 דקות להשערה אחת.** מתחילים טיימר. אחרי 2 דקות בלי התקדמות עוברים לצעד הבא במקום להישאר באותה השערה. כשהתחנה חורגת מהתקציב שלה: [time-and-triage](../time-and-triage/).

2. **קוראים את השגיאה המילולית, מלמטה למעלה.** שגיאה עוטפת שגיאה, והסיבה האמיתית היא השורה **האחרונה**. אחר כך בודקים אם הטקסט בכלל מזכיר הרשאה:

   ```bash title="runs on: VM"
   kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}' | grep -iE 'denied|403|unauthorized' || echo "no permission words in the message"
   ```

   **איך מוודאים:** `no permission words…` = זו לא בעיית credential, ואין להתחיל משם.

3. **מסווגים: קוד, סביבה, הרשאות, נתיב או מצב.** הסיווג קובע איפה מחפשים:

   | סוג | סימן בטקסט | בדיקה ראשונה |
   |---|---|---|
   | קוד | `AssertionError`, `YAML parse error`, Dockerfile חסר | `bash -n <FILE>`, render מקומי |
   | סביבה | `Cannot connect to the Docker daemon`, `Temporary failure in name resolution`, `blob unknown` | `docker info --format '{{.Driver}}'`, [env-cards](../../debugging/env-cards/) |
   | הרשאות | `403`, `denied`, `Access denied`, `unauthorized` | `git ls-remote` עם אותו credential ([permissions](../../gitlab/permissions/#אבחון-403--access-denied-בגישה-ל-repo)) |
   | נתיב | `no such file or directory`, `not found` | `ls <FILE>`; `kubectl -n <NS> get <RESOURCE>` (שם או namespace) |
   | מצב | `Forbidden: updates to statefulset spec`, `operationState.phase: Failed`, PVC `Pending` | `kubectl get` על האובייקט; מתקנים את ה-cluster ואז sync ידני |

4. **איזה run אני קורא?** הודעה ישנה אינה הכשל הנוכחי. משווים זמן, וב-CI בודקים ב-`CANDIDATE` את ה-branch והתאריך:

   ```bash title="runs on: VM"
   kubectl -n argocd get application <APP> -o jsonpath='{.status.operationState.phase}{"  "}{.status.operationState.finishedAt}{"\n"}{.status.operationState.message}{"\n"}'
   date -u
   ```

   **איך מוודאים:** `finishedAt` קרוב ל-`date -u`. הודעה בת 36 דקות היא היסטוריה.

5. **משווים עובד מול נכשל.** עובד ב-dev ולא ב-staging: הסיבה בדבר **שמבדיל** ביניהם (קובץ values, namespace, token, branch):

   ```bash title="runs on: VM"
   diff <(helm template <RELEASE> <CHART_DIR> -f base.yaml -f dev.yaml) <(helm template <RELEASE> <CHART_DIR> -f base.yaml -f staging.yaml)
   kubectl get secret -A | grep <SECRET>
   ```

   **איך מוודאים:** ה-`diff` מדפיס רק שורות שהשתנו; ה-`grep` מראה באילו namespaces ה-Secret קיים.

6. **מבודדים משתנה אחד.** משנים דבר אחד ורואים אם השגיאה זזה:

   ```bash title="runs on: VM"
   helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml -f <ENV>.yaml -f versions/<ENV>.yaml --set defaultImageTag=probe > /dev/null; echo "exit=$?"
   helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -s templates/networking/ingress.yml
   ```

   **איך מוודאים:** `exit=0` עם `probe` ו-`1` בלעדיו = הבעיה היא ה-tag הריק. `-s` מרנדר template אחד. לא מסתמכים על מספרי שורות של `--debug`.

7. **רק עכשיו מחפשים.** קודם Ctrl+K באתר ([symptoms](../../debugging/symptoms/)), ואחר כך באינטרנט: את שורת השגיאה המדויקת, בלי שמות ונתיבים שלך. חיפוש לפני צעדים 2 עד 3 מחזיר סיבות שלא קשורות.

8. **אחרי התיקון:** מריצים שוב את ה-gate של התחנה ([order-of-work](../order-of-work/)) וכותבים ליומן שורה: מה ראיתי, מה שיניתי, מה השתנה.

## לא עושים

| לא עושים | למה | במקום |
|---|---|---|
| מנחשים סיבה שהטקסט לא תומך בה (תרגול) | "אולי הרשאות, אולי syntax" מביא לתיקונים לא קשורים | `grep -iE` על ההודעה (צעד 2), ולהישאר בסיווג |
| `kubectl edit`, `scale` או `patch` על משאב ש-Argo מנהל (תרגול) | selfHeal מחזיר את השינוי | edit, commit, push ב-Git |
| `git push --force` (תרגול) | מוחק את ה-commit של ה-CI ומחזיר את ה-tag ל-`""` | `git pull` ואז push: [sync](../../git/sync/#למה-אסור---force-כאן-ומה-זה---force-with-lease) |
| `reset --hard <SHA>` של ה-commit שכבר עומדים עליו (תרגול) | ב-`reset` הארגומנט הוא ה**יעד**, והפקודה לא עושה כלום | `git status -sb` נקי ו-`git log --oneline --graph --all -10` לפני `--hard`: [undo](../../git/undo/) |
| נותנים role גבוה יותר, או "משנים scope ל-Reporter" (תרגול) | קריאה דורשת Reporter, ו-scope הוא של ה-token ולא של ה-role | לבדוק ב-Members אם ה-user חבר **ב-repo הזה** |
| הופכים StorageClass ל-default כדי לפתור PVC (תרגול) | ה-default לא ב-Git, ויקשור גם PVC לא קשורים | `storage.className` ב-values |
| `git push` כדי לתקן כשל שנוגע במצב ה-cluster (תרגול) | Argo קורא manifests ולא `bootstrap/`; `Failed` ×5 לא מנסה שוב | לתקן את ה-cluster ואז sync ידני: [operate](../../argocd/operate/#argo-ויתר-sync-ידני) |
| `delete` על Pod או StatefulSet בלי לשאול מי מחזיק את ה-data (תרגול) | Deployment מחליף לבד, StatefulSet לא מחליף Pod שבור | `kubectl -n <NS> get pvc`, ואז מוחקים את הנכון: [storage-probes](../../kubernetes/storage-probes/#statefulset-מול-deployment-מתי-מוחקים-pod-ומתי-statefulset) |
| קוראים run או הודעה ישנים (תרגול) | מתקנים כשל שכבר לא קיים | צעד 4: `finishedAt` מול `date -u`, ו-`CANDIDATE` |
| מגדירים משתני סקריפט של ה-VM כ-CI variables (תרגול) | CI variables קיימים רק בתוך job | `export` באותו shell |
| מריצים שוב את אותו דבר בלי לשנות כלום | אותה תוצאה, זמן אבוד | לשנות משתנה אחד (צעד 6) |
| `helm install` בקלאסטר של Argo `[COURSE]` | Argo ו-Helm יתחרו על אותם משאבים | Helm רק כ-renderer: `helm template` |

## דוגמה 1: ComparisonError

האירוע: `staging` ו-`prod` הוצגו `Unknown` עם `ComparisonError`, ו-`dev` עבד. המקרה המלא: [debugging/overview](../../debugging/overview/#דוגמה-פירוק-שגיאה-שכבתית).

| צעד | מה רואים ועושים | מה זה אומר |
|---|---|---|
| 2: קריאה מלמטה | `ComparisonError … source 1 of 4 … helm template … YAML parse error … line 47`; ה-`grep` מצעד 2 ריק | הסיבה היא השורה האחרונה: YAML לא תקין **ב-render** (שורה 47 היא ב-output). אין מילות הרשאה |
| 5: השוואה | dev עובד, staging ו-prod לא, אותו chart | הסיבה היא ב-values: `versions/<ENV>.yaml` |
| 6: בידוד | `helm template … --set defaultImageTag=probe` מצליח | `defaultImageTag` ריק: אף אחד לא עשה promote. התיקון הוא promote, לא עריכת chart |

## דוגמה 2: read-only file system

האירוע: `postgres-0` ב-`CrashLoopBackOff`, ו-`kubectl logs` ריק.

| צעד | מה רואים ועושים | מה זה אומר |
|---|---|---|
| 2: קריאה | `kubectl -n <NS> describe pod postgres-0`, ואז Events: `StartError … mounting … /var/run/secrets/kubernetes.io … read-only file system` | לוג ריק = ה-container לא התחיל. init container שיצא `0` תקין. הסיבה היא ב-Events |
| 3 ו-5: סיווג והשוואה | זה `mount`, לא הרשאה ולא data. גם `signal-processor` נופל באותה דרך | סיבה משותפת, לא "downstream של ה-DB". Secret ב-`/run/secrets` מתנגש עם ה-token של ה-service account (`/var/run` הוא `/run`) |
| 6 ו-8: תיקון ואימות | `mountPath: /run/secrets/<APP_DIR>` ו-`POSTGRES_PASSWORD_FILE=/run/secrets/<APP_DIR>/postgres_password` (הקובץ, לא התיקייה); render ו-grep; push; ל-StatefulSet: `kubectl -n <NS> delete pod postgres-0` | `template` מותר לשינוי, אז בלי מחיקת StatefulSet. Deployment מחליף Pods לבד: [storage-probes](../../kubernetes/storage-probes/#statefulset-מול-deployment-מתי-מוחקים-pod-ומתי-statefulset) |
