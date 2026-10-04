---
title: PVC, StorageClass ו-probes
description: איך PVC מקבל storage, סולם האבחון ל-Pod שנתקע ב-Pending, ומה ההבדל בין probes של live, ready ו-startup.
sidebar:
  order: 4
---

:::note[בקצרה]
data שצריך לשרוד החלפת Pod (postgres) חי ב-`PVC`. ה-PVC נבנה על ידי `StorageClass`. אם אין StorageClass מתאים — ה-Pod נשאר `Pending`.
בנוסף, `Running` לא אומר "מוכן": ה-probes קובעים אם ה-Pod מקבל תעבורה. הדף מכסה את שני המקרים שבדרך כלל נראים כמו "משהו תקוע".
:::

## PVC ו-StorageClass: default מול בשם

`PVC` מבקש גודל ו-StorageClass. ה-`StorageClass` יודע ליצור את ה-`PV`. אם ב-PVC **לא** כתוב `storageClassName`, Kubernetes משתמש ב-StorageClass שמסומן כ-**default** — ואם אין כזה, ה-PVC נשאר בלי class ולא נקשר.

```bash title="runs on: VM"
kubectl get sc
```

```text title="example: kubectl get sc (lab VM)"
NAME                PROVISIONER                    RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
course-hostpath     kubernetes.io/no-provisioner   Retain          WaitForFirstConsumer   false                  26d
course-local-path   rancher.io/local-path          Delete          WaitForFirstConsumer   false                  26d
```

- ב-class שמסומן default מופיע `(default)` ליד השם. **כאן אין** — לכן חייבים לציין class בשם ב-values: `storage.className: course-local-path`.
- `course-local-path`: יוצר PV דינמית (provisioner). `course-hostpath`: `no-provisioner` — צריך PV שנוצר ידנית.
- `RECLAIMPOLICY`: `Delete` — מחיקת ה-PVC מוחקת את ה-data; `Retain` — ה-PV נשאר.

### `WaitForFirstConsumer`

עם `VOLUMEBINDINGMODE: WaitForFirstConsumer` ה-PVC נשאר `Pending` **עד שמופיע Pod שמשתמש בו**. זה **נורמלי**, לא תקלה. אם ה-PVC Pending וגם ה-Pod שלו Pending, הבעיה היא במקום אחר — בדרך כלל ב-class.

## Pod Pending בגלל PVC: סולם האבחון

המקרה האמיתי: App `Degraded`, `postgres-0` ב-`Pending`, ו-`signal-processor` ב-`CrashLoopBackOff` (כי אין DB).

```bash title="runs on: VM"
kubectl -n argocd get applications                    # 1. which App is Degraded
kubectl -n <NS> get pods                              # 2. which Pod is stuck
kubectl -n <NS> describe pod postgres-0               # 3. read Events
kubectl -n <NS> get pvc                               # 4. PVC state, STORAGECLASS column
kubectl get sc                                        # 5. does the class exist, is it default
```

מה רואים בכל שלב:

| שלב | מה רואים | משמעות |
|---|---|---|
| 1 | App `Degraded` | משהו ברמת האובייקטים, לא ב-render |
| 2 | `postgres-0  0/1  Pending` | ה-Pod לא שובץ |
| 3 | `pod has unbound immediate PersistentVolumeClaims` | ה-PVC לא נקשר |
| 4 | `postgres-data-postgres-0  Pending`, עמודת `STORAGECLASS` **ריקה** | ל-PVC אין class |
| 5 | `course-local-path` קיים, **לא** default | אף אחד לא נותן class אוטומטית |

:::caution[מלכודת · קרה בתרגול]
`storage:` ב-`postgres/base.yaml` מולא עם `requestedSize: 1Gi` בלבד. בלי `className` ה-PVC נוצר ללא class, ובלי default ב-cluster הוא לא נקשר. התיקון הוא ב-**values** (ב-Git), לא `kubectl edit pvc` — Argo יחזיר, ו-PVC הוא בעל spec שלא ניתן לשנות.
:::

```yaml title="file: gitops/apps/postgres/base.yaml (storage block)"
storage:
  className: course-local-path
  requestedSize: 1Gi
```

אחרי push, Argo מסנכרן. ה-PVC כבר נוצר בלי class, ושדה `storageClassName` של PVC קיים לא ניתן לשינוי; גם ה-`volumeClaimTemplates` של StatefulSet קיים נעול. אם ה-sync נכשל על כך, או שה-PVC נשאר Pending, צריך שה-PVC (ואם צריך גם ה-StatefulSet) ייווצרו מחדש מה-values החדשים. הנוהל לא נבדק מול cluster חי כאן — בדוק את הודעת השגיאה ב-Argo לפני שמוחקים:

```bash title="runs on: VM"
kubectl -n <NS> describe pvc postgres-data-postgres-0   # Pending, no Volume: nothing bound yet
kubectl -n <NS> delete pvc postgres-data-postgres-0     # recreated by the StatefulSet
kubectl -n <NS> get pvc,pods -w                         # Ctrl+C when Bound / Running
```

אם ה-PVC החדש שוב נוצר בלי class, ה-StatefulSet הקיים עדיין נושא את ה-`volumeClaimTemplates` הישן: מחק גם את ה-StatefulSet (`kubectl -n <NS> delete statefulset <SERVICE>`; Argo יוצר אותו מחדש מה-values) ואז את ה-PVC. הצעד הזה לא נבדק כאן מול cluster חי.

:::danger[זהירות]
מחיקת PVC עם data אמיתי מוחקת אותו (`RECLAIMPOLICY: Delete`). כאן זה בטוח רק כי ה-PVC מעולם לא נקשר. קודם `describe pvc` ובדוק שהוא Pending ללא `Volume`.
:::

**איך מוודאים:** `get pvc` — `Bound` ו-`STORAGECLASS` מלא; `postgres-0` — `1/1 Running`; App חוזר ל-`Synced`/`Healthy`. בדיקת הישרדות: מחק את ה-Pod וודא שה-data נשאר ([verify/overview](../../verify/overview/)).

הערה: `storage: {}` (כמו ב-redis) משאיר volume זמני — ה-data נעלם עם ה-Pod. לפי ה-contract, postgres דורש storage מתמשך.

## probes: live, ready, startup

ל-Kubernetes שלושה סוגי בדיקות. ב-TRIDENT כל השירותים חושפים `/live` ו-`/ready` (`ops` או `http`).

| probe | שואל | כשנכשל | נתיב ב-TRIDENT |
|---|---|---|---|
| `startupProbe` | האם האפליקציה סיימה לעלות? | ה-container נהרג ומופעל מחדש (אחרי `failureThreshold`); עד שעוברת, live ו-ready מושהים | `/live` |
| `livenessProbe` | האם התהליך חי ולא תקוע? | ה-container נהרג ומופעל מחדש | `/live` |
| `readinessProbe` | האם מוכן לקבל בקשות? | ה-Pod מוסר מה-endpoints של ה-Service; **לא** נהרג | `/ready` |

```yaml title="file: gitops/apps/trident/base.yaml (probes of one container)"
startupProbe:   {httpGet: {path: /live,  port: ops}, periodSeconds: 5,  failureThreshold: 12}
livenessProbe:  {httpGet: {path: /live,  port: ops}, periodSeconds: 10, failureThreshold: 6}
readinessProbe: {httpGet: {path: /ready, port: ops}, periodSeconds: 10, failureThreshold: 6}
```

- `port` מתייחס ל**שם** הפורט שב-`ports:` של ה-container (`ops`/`http`). שם שגוי — ה-probe נכשל תמיד.
- זמן הסבלנות של ה-startup: `periodSeconds × failureThreshold` = 5 × 12 = 60 שניות.

### Running אבל לא Ready

`READY 0/1` עם `STATUS Running` אומר שה-readiness נכשל. ב-TRIDENT, `/ready` מחזיר `503` כשתלות (redis/postgres) לא זמינה — **by design**: ה-Pod חי, אבל לא ראוי לתעבורה.

```bash title="runs on: VM"
kubectl -n <NS> get pods
kubectl -n <NS> describe pod -l trident.dev/service=<SERVICE>   # Events: "Readiness probe failed: HTTP probe failed with statuscode: 503"
kubectl -n <NS> logs deploy/<SERVICE> --tail=30                 # which dependency is down
kubectl -n <NS> get endpointslices -l kubernetes.io/service-name=<SERVICE>   # empty while not Ready
```

**איך מוודאים:** הלוג אומר איזו תלות חסרה (`REDIS_HOST` שגוי, postgres לא עלה). אחרי שהתלות חוזרת, ה-Pod הופך `1/1` בלי הפעלה מחדש.

:::tip[עיקרון]
ל-Kubernetes אין `depends_on`. סדר העלייה אינו readiness: האפליקציה מנסה שוב, וה-readiness אומר מתי היא מוכנה. `Running` ≠ `Ready`.
:::

| מצב | סיבה סבירה | בדיקה |
|---|---|---|
| `Running`, `0/1` | readiness נכשל (תלות למטה) | `describe` Events + `logs` |
| `CrashLoopBackOff` | liveness נכשל / האפליקציה מתרסקת | `logs --previous` |
| restarts עולים בלי קריסה | startup/liveness איטיים מדי | `describe` — `Liveness probe failed` |

טבלת symptom → cause מלאה: [debugging/symptoms](../../debugging/symptoms/).
