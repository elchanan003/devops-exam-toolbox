---
title: kubectl — גיליון לפי משימה
description: פקודות kubectl מסודרות לפי מה שרוצים לעשות, כולל describe, logs --previous, jsonpath ו-rollout.
sidebar:
  label: "גיליון לפי משימה"
  order: 1
---

:::note[בקצרה]
`kubectl` רץ על ה-VM, מול ה-cluster של המעבדה (kubeadm, צומת אחד). הדף מסודר לפי שאלות: מה רץ? למה זה לא עולה? מה כתוב בלוג? איך קוראים שדה?
Argo עושה self-heal: **תיקון חי עם `kubectl edit` יחזור אחורה** — תיקונים נכנסים ל-Git. `kubectl` כאן הוא כלי **קריאה ואבחון**, ובנוסף ליצירת Secrets שלא נמצאים ב-Git.
:::

## namespace ו-labels: `-n`, `-A`, `-l`

```bash title="runs on: VM"
kubectl get ns
kubectl -n <NS> get pods
kubectl get pods -A                                   # all namespaces
kubectl -n <NS> get pods -l app.kubernetes.io/part-of=trident --show-labels
kubectl config set-context --current --namespace=<NS> # default namespace for this shell
```

רוב טעויות "not found" הן namespace: בלי `-n` kubectl מסתכל ב-`default`. `get -A` מראה שהאובייקט **קיים** — אבל לא בהכרח ב-namespace שלך.

## מה רץ? `get`

```bash title="runs on: VM"
kubectl -n <NS> get pods -o wide                      # node, IP
kubectl -n <NS> get all                               # Pods, Services, Deployments, StatefulSets (not Ingress/PVC/Secret)
kubectl -n <NS> get deploy,sts,svc,ingress,pvc,cm,secret
kubectl -n argocd get applications
kubectl get sc                                        # StorageClasses (the default is marked)
```

מצבים לזהות: `Running` + `READY 1/1` — תקין. `Pending` — לא שובץ (בדוק PVC, משאבים). `ImagePullBackOff` — ה-image לא יורד. `CrashLoopBackOff` — מתרסק. `Running` אבל `0/1` — readiness נכשל ([probes](../storage-probes/#probes-live-ready-startup)).

## למה זה לא עולה? `describe` ו-events

```bash title="runs on: VM"
kubectl -n <NS> describe pod -l trident.dev/service=<SERVICE>   # read the Events section at the bottom
kubectl -n <NS> describe pod postgres-0                         # or one Pod by its exact name (from get pods)
kubectl -n <NS> get events --sort-by=.lastTimestamp   # newest last
kubectl -n <NS> get events --field-selector type=Warning
```

**איך מוודאים:** ב-`describe`, גלול ל-`Events:` — שם נמצא המשפט המדויק (`Failed to pull image`, `unbound immediate PersistentVolumeClaims`, `secret "..." not found`). קרא אותו מילה במילה במקום לנחש.

:::tip[עיקרון]
סדר אבחון: קודם `get` (מה המצב), אחר כך `describe` (למה), ואז `logs` (מה האפליקציה אומרת). טבלת symptom → cause מלאה: [debugging/symptoms](../../debugging/symptoms/).
:::

## אין לוגים? ה-container לא התחיל

```bash title="runs on: VM"
kubectl -n <NS> logs <POD> -c <CONTAINER>             # pick one container
kubectl -n <NS> logs <POD> --all-containers
kubectl -n <NS> logs <POD> -p                         # --previous: the last crashed container
kubectl -n <NS> logs deploy/<SERVICE> --tail=50 --since=10m
kubectl -n <NS> logs -l trident.dev/service=<SERVICE> --tail=20
kubectl -n <NS> get pod <POD> -o jsonpath='{.status.initContainerStatuses[*].state}{"\n"}'
kubectl -n <NS> get events --sort-by=.lastTimestamp | tail
```

- `kubectl logs` בלי `-c` על Pod עם כמה containers (או init) בוחר container אחד, לא בהכרח השבור.
- **לוג ריק = ה-container מעולם לא התחיל.** אל תחפש בלוג: `describe pod` ← `Events` (`StartError`, `FailedMount`, `ImagePullBackOff`).
- init container שיצא `exit 0` תקין: הוא לא הבעיה. ה-`jsonpath` למעלה מראה את מצבו.
- ב-`CrashLoopBackOff` הלוג הנוכחי קצר: `-p` מראה למה הקודם מת.

**איך מוודאים:** `Events` מכיל משפט שגיאה מדויק. קרא אותו מילה במילה.

:::caution[מלכודת · קרה בתרגול]
`postgres-0` ב-CrashLoop עם `StartError … mounting … /var/run/secrets/kubernetes.io … read-only file system`. סיבה: Secret/ConfigMap שמאונט ב-`/run/secrets` **ישירות** מתנגש עם ה-mount של ה-service-account token של Kubernetes (`/var/run` הוא `/run`). תיקון: מאונטים ל-**תת-תיקייה**, `mountPath: /run/secrets/<APP_DIR>`, וה-env מצביע על **הקובץ**:
`POSTGRES_PASSWORD_FILE=/run/secrets/<APP_DIR>/postgres_password` (TRIDENT: `<APP_DIR>` = `trident`). אותה התנגשות פגעה גם ב-`signal-processor` (ConfigMap path + volumeMount), לא "כי ה-DB למטה". ה-contract דורש נתיב קובץ, לא ערך; התיקייה בחירה שלך.
:::

## להיכנס ולבדוק: `exec`, `port-forward`

```bash title="runs on: VM"
kubectl -n <NS> exec -it deploy/<SERVICE> -- sh
kubectl -n <NS> exec deploy/<SERVICE> -- ls /run/secrets/<APP_DIR>
kubectl -n <NS> port-forward svc/<SERVICE> 8080:8080  # then: curl http://127.0.0.1:8080/info
```

- ל-image ייתכן שאין `sh` או כלים (`curl`, `ls`): אז `exec` נכשל, ואבחון הולך דרך `logs`/`describe`.
- תמונות Python של הפרויקט **אין בהן `curl`**: `exec deploy/<SERVICE> -- python -c "import urllib.request as u; print(u.urlopen('http://<SERVICE>:8080/live').read())"`.
- `port-forward` נשאר בחזית עד Ctrl+C. הרץ `curl` מטרמינל שני.

## rollout: `status`, `restart`, `history`

```bash title="runs on: VM"
kubectl -n <NS> rollout status deploy/<SERVICE>
kubectl -n <NS> rollout restart deploy/<SERVICE>
kubectl -n <NS> rollout history deploy/<SERVICE>
kubectl -n <NS> rollout undo deploy/<SERVICE>         # back one revision
```

`rollout restart` שימושי אחרי שינוי ב-Secret/ConfigMap שהאפליקציה קוראת רק בהפעלה. עם Argo: שינוי values ב-Git מחליף Pods בעצמו. `rollout undo` בקלאסטר ש-Argo מנהל יוחזר על ידי selfHeal: התיקון האמיתי הוא `git revert` ב-Git.

## לקרוא שדה: `-o jsonpath`

```bash title="runs on: VM"
kubectl -n <NS> get deploy <SERVICE> -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n <NS> get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}'
kubectl -n <NS> get svc <SERVICE> -o jsonpath='{.spec.selector}{"\n"}'
kubectl -n <NS> get deploy <SERVICE> -o jsonpath='{.metadata.labels.app\.kubernetes\.io/part-of}{"\n"}'
```

מפתח עם נקודות (כמו `app.kubernetes.io/part-of`) דורש `\.` לפני כל נקודה בתוך ה-jsonpath. בלי זה התוצאה ריקה.
פורמטים נוספים: `-o wide`, `-o yaml`, `-o name`, `-o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image`.

## לפענח ערך של Secret בלי להדפיס אותו בכל מקום

```bash title="runs on: VM"
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data.postgres_password}' | base64 -d | wc -c   # length only
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data.postgres_password}' | base64 -d           # prints the value
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}' | jq 'keys'                             # key names only
```

כשרק צריך לבדוק שהערך קיים ותקין — אורך (`wc -c`) או שם המפתחות מספיקים. שם מפתח עם נקודה: `{.data.a\.b}`.
`base64` של Secret **אינו הצפנה**, ולכן לא מדפיסים ערכים ל-screen share או ללוג.

## לבדוק הרשאות ולנקות

```bash title="runs on: VM"
kubectl auth can-i get secrets -n <NS>
kubectl -n <NS> delete pod -l trident.dev/service=<SERVICE>     # the Deployment recreates it
kubectl explain deployment.spec.strategy             # field documentation from the API server
```

## תיעוד offline בזמן המבחן: `explain`, `api-resources`, `wait`

```bash title="runs on: VM"
kubectl explain <RESOURCE>.spec --recursive | head -40   # TRIDENT: statefulset.spec
kubectl explain <RESOURCE>.spec.<FIELD>                  # one field, with its description
kubectl api-resources | grep -i <KIND>                   # exact kind/apiVersion/short name, e.g. ingress
kubectl -n <NS> wait --for=condition=Ready pod -l <LABEL> --timeout=120s
```

**איך מוודאים:** `explain` מדפיס את עץ השדות; `wait` מדפיס `pod/... condition met` או נכשל ב-timeout. (`kubectl top` לא זמין: אין metrics-server.)

:::danger[זהירות]
`kubectl delete` על Application, namespace או Secret הוא הרסני — ב-Argo עם finalizers ו-`prune` יש לזה השלכות. סדר ניקוי נכון: [verify/cleanup](../../verify/cleanup/).
:::

## הדפים הבאים

- [Secrets ו-ConfigMaps](../secrets/) — יצירה ל-namespace הנכון.
- [Networking](../networking/) — DNS, Ingress, `curl --resolve`, NetworkPolicy.
- [PVC ו-probes](../storage-probes/) — Pod שנתקע ב-Pending, ו-Running אבל לא Ready.
