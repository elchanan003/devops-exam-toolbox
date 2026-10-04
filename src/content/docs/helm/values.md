---
title: values — לקרוא chart ולמלא אותו
description: איך קוראים את ה-API של chart, גיליון עזר ל-nxs-universal-chart, ומפתחות החשובים של postgres ו-redis.
sidebar:
  order: 2
---

:::note[בקצרה]
ב-GitOps לא נוגעים ב-templates של ה-chart — כל ההתאמה היא ב-**values**. לכן הכישור המרכזי הוא לקרוא את ה-API של ה-chart ולמלא נכון מפתחות.
הדף נותן שיטה לקריאה, גיליון עזר ל-`nxs-universal-chart` (3.2.1), ורשימת המפתחות ל-`postgres` (1.6.8) ול-`redis` (2.4.7). הצורות נבדקו ב-render אמיתי.
:::

## לקרוא chart API

ה-`values.yaml` של ה-chart הוא רשימת כל מה שאפשר להגדיר, עם ברירות מחדל והערות. ה-`README` מסביר את הצורות.

```bash title="runs on: VM"
helm show values <CHART_DIR> | less            # inside less: /keyName  then  n
helm show readme <CHART_DIR> | less            # tables: key, example, default, meaning
helm show values <CHART_DIR> | grep -n -B2 -A12 '^storage:'
```

סדר עבודה:

1. מצא את המפתח ב-`show values` (חפש עם `/`).
2. קרא את ההערה מעליו — לפעמים היא אומרת את הצורה (`# -- ...`).
3. חפש דוגמה ב-`show readme` (העמודה "Example").
4. כתוב ב-values, הרץ [render](../overview/#pre-flight-render-אותו-render-ש-argo-יריץ), ובדוק עם `grep -c`.

:::caution[מלכודת · קרה בתרגול]
`storage.className` נשכח ב-`postgres/base.yaml` — אף על פי שההערה בראש הקובץ עצמו מונה אותו. כשיש רשימת מפתחות בהערות, עבור עליה מפתח אחרי מפתח מול הקובץ שלך.
:::

## nxs-universal-chart: גיליון עזר

מפתחות ברמה העליונה שאתה פוגש: `releasePrefix`, `defaultImageTag`, `generic`, `configMaps`, `deployments`, `services`, `ingresses`, `networkPolicies`.
`releasePrefix: "-"` גורם לאובייקטים לקבל בדיוק את השם של המפתח שלהם (`deployments.ingest-api` → Deployment בשם `ingest-api`).

### generic ו-imageRepository

```yaml title="file: <FILE> (base.yaml / <ENV>.yaml)"
generic:
  labels: {app.kubernetes.io/part-of: trident}
  podLabels: {app.kubernetes.io/part-of: trident}
  imageRepository: <REGISTRY>/<GROUP>/trident-source
  extraImagePullSecrets:
    - name: <SECRET>
# TRIDENT: imageRepository: registry.gitlab.com/trident-lab00/trident-source
# TRIDENT: extraImagePullSecrets: [{name: trident-registry}]
```

- הכל תחת `generic:` — ברמה אחת פנימה. ב-col 0 המפתח "מתאבד" בשקט.
- `<SECRET>` הוא ה-Secret מסוג `docker-registry`, ו**חייב להיות קיים ב-namespace של ה-Pod** ([secrets](../../kubernetes/secrets/)).

**איך מוודאים:** `grep -c 'image: /' /tmp/render.yaml` חייב להיות `0`, ו-`grep -c 'imagePullSecrets' /tmp/render.yaml` מצופה אחד לכל Deployment (3 ב-TRIDENT).

### tpl: image ו-imageTag נבנים מ-values אחרים

```yaml title="file: <FILE>"
defaultImageTag: ""          # only in versions/<ENV>.yaml, written by CI
deployments:
  <SERVICE>:
    containers:
      - name: <SERVICE>
        image: "{{ .Values.generic.imageRepository }}/<SERVICE>"
        imageTag: "{{ .Values.defaultImageTag }}"
```

מחרוזות ב-`image`, `imageTag`, ו-`configMaps.*.data` עוברות `tpl`: הביטוי `{{ ... }}` מוחלף בערך מ-values. לכן `TRIDENT_VERSION: "{{ .Values.defaultImageTag }}"` מקבל את ה-candidate.
**איך מוודאים:** `grep 'TRIDENT_VERSION' /tmp/render.yaml` מציג את ה-candidate. ביטוי `{{ }}` חייב להיות בתוך מרכאות ב-YAML.

### configMaps ו-envConfigmaps

```yaml title="file: <FILE>"
configMaps:
  trident-queue:
    data:
      REDIS_HOST: "redis"
      REDIS_PORT: "6379"
  trident-sensors:
    data:
      sensors.json: |
        {"hydrophones": []}
deployments:
  ingest-api:
    containers:
      - name: ingest-api
        envConfigmaps: [trident-app, trident-queue]
```

- `envConfigmaps` = רשימת ConfigMaps שנכנסים כ-`envFrom` ל-container. נותן רק מה שהשירות צריך (least knowledge — לפי ה-CONTRACT של הפרויקט).
- מפתח עם נקודה/שם קובץ (`sensors.json`) מיועד לעלות כ-**קובץ** דרך volume.
- `REDIS_HOST` חייב להיות שם ה-Service ([fullnameOverride](../overview/#fullnameoverride-איך-האפליקציה-מוצאת-את-ה-service)).

### volumes: extraVolumes מול volumeMounts

שני מקומות, שתי רמות הזחה. `extraVolumes` שייך ל-**Pod** (אחי `containers`), `volumeMounts` שייך ל-**container**.

```yaml title="file: <FILE>"
deployments:
  signal-processor:
    containers:
      - name: signal-processor
        volumeMounts:
          - {name: sensors, mountPath: /etc/trident, readOnly: true}
          - {name: pg, mountPath: /run/secrets, readOnly: true}
    extraVolumes:
      - {name: sensors, configMap: {name: trident-sensors}}
      - {name: pg, secret: {secretName: trident-postgres}}
```

| נושא | כלל |
|---|---|
| `name` של volume | שם **חופשי** — חייב להתאים בין `volumeMounts` ל-`extraVolumes` |
| שם ה-ConfigMap / Secret | **קבוע חיצוני** — כבר קיים (`trident-sensors`, `trident-postgres`) |
| `mountPath` | **קבוע חיצוני** — האפליקציה מחפשת שם קובץ (`SENSORS_FILE=/etc/trident/sensors.json`) |
| Secret | `secret: {secretName: ...}` — `secret` באות קטנה |
| ConfigMap | `configMap: {name: ...}` — `configMap` עם C גדולה באמצע |

מה שקורה: Secret שמוטען כ-volume נותן **קובץ לכל מפתח**. מפתח `postgres_password` + `mountPath: /run/secrets` = הקובץ `/run/secrets/postgres_password`, שהוא מה ש-`POSTGRES_PASSWORD_FILE` מצביע עליו.

:::caution[מלכודת · קרה בתרגול]
נפלו כאן כמה דברים: `Secret` באות גדולה במקום `secret`; `mountPath:/run/secrets` בלי רווח; ובלחץ — postgres הוכנס בטעות לבלוק של שירות אחר. אחרי כל עריכה: render, ו-`grep -A3 'secretName:' /tmp/render.yaml`.
:::

**איך מוודאים:** `grep -c 'mountPath: /run/secrets' /tmp/render.yaml` ו-`grep -c 'secretName: trident-postgres' /tmp/render.yaml` — שניהם 1 לשירות שמטעין.

### services

```yaml title="file: <FILE>"
services:
  ingest-api:
    type: ClusterIP
    extraSelectorLabels: {trident.dev/service: ingest-api}
    ports: [{name: http, port: 8080, targetPort: http, protocol: TCP}]
```

`extraSelectorLabels` חייב להתאים ל-`extraSelectorLabels` של ה-Deployment — כך ה-Service מוצא את ה-Pods. אל תשתמש ב-`app.kubernetes.io/name` כ-selector: ה-chart הוא הבעלים שלו.

### ingresses: ה-hostname מופיע פעמיים

```yaml title="file: <FILE>"
ingresses:
  ingest-api:
    ingressClassName: nginx
    hosts:
      - hostname: <HOST>
        paths:
          - {path: /, pathType: Prefix, serviceName: ingest-api, servicePort: 8080}
    extraTls:
      - hosts: [<HOST>]
        secretName: trident-tls
# TRIDENT: <HOST> = dev.trident.test
```

:::caution[מלכודת · קרה בתרגול]
ה-host מופיע **פעמיים**: ב-`hosts[].hostname` וב-`extraTls[].hosts`. מחליפים סביבה — מחליפים את שניהם. ה-`path: /` (לא `/info`) כדי ש-`/live`, `/ready`, `/metrics` יעברו גם.
:::

**איך מוודאים:** `grep -c '<HOST>' /tmp/render.yaml` — מצופה 2 (rule + tls). `grep 'secretName:' /tmp/render.yaml` מציג את `trident-tls`. שם ה-Secret חייב להיות קיים ב-namespace. המשך: [networking](../../kubernetes/networking/).

### networkPolicies

```yaml title="file: <FILE>"
networkPolicies:
  default-deny:
    podSelector: {}
    policyTypes: [Ingress]
  allow-ingest:
    podSelector:
      matchLabels: {trident.dev/service: ingest-api}
    policyTypes: [Ingress]
    ingress:
      - from:
          - podSelector:
              matchLabels: {trident.dev/service: acoustic-simulator}
        ports:
          - {protocol: TCP, port: 8080}
```

המפתח (`default-deny`) הופך לשם ה-NetworkPolicy. ההסבר על ה-CNI ועל בדיקה: [networking](../../kubernetes/networking/#networkpolicy-default-deny-ו-allow).

## postgres (groundhog2k 1.6.8)

```yaml title="file: <FILE> (postgres/base.yaml)"
fullnameOverride: postgres
image: {repository: postgres, tag: "16.4"}
env:
  - {name: POSTGRES_DB, value: trident}
  - {name: POSTGRES_PASSWORD_FILE, value: /run/secrets/postgres_password}
extraSecrets:
  - {name: trident-postgres, mountPath: /run/secrets}
customScripts:
  01-schema.sql: |
    CREATE TABLE detections (id serial);
storage:
  className: course-local-path
  requestedSize: 1Gi
```

| מפתח | משמעות |
|---|---|
| `fullnameOverride` | שם ה-Service. חייב להתאים ל-`POSTGRES_HOST` ב-ConfigMap של האפליקציה |
| `env` | רשימת `{name, value}` לסביבה של השרת. הסיסמה **כקובץ**: `POSTGRES_PASSWORD_FILE`, לא ערך |
| `extraSecrets` | `[{name: <Secret קיים>, mountPath: <dir>}]` — **כל** המפתחות של ה-Secret הופכים לקבצים בתיקייה |
| `customScripts` | קבצי SQL שרצים פעם אחת על data dir ריק |
| `storage.className` | ה-StorageClass של ה-PVC. **חובה** כשאין default |
| `storage.requestedSize` | גודל ה-PVC |

**איך מוודאים:** `grep -c 'storageClassName: course-local-path' /tmp/render.yaml` = 1 (אם `className` חסר — 0 וה-PVC ייתקע ב-Pending, ראו [storage-probes](../../kubernetes/storage-probes/#pod-pending-בגלל-pvc-סולם-האבחון)).
`grep -E '^kind: StatefulSet|secretName' /tmp/render.yaml` מראה StatefulSet ו-`secretName: trident-postgres`.

:::caution[מלכודת · קרה בתרגול]
`storage` מולא עם `requestedSize: 1Gi` בלבד, ללא `className`. ה-PVC נוצר בלי StorageClass ו-`postgres-0` נשאר Pending. התיקון הוא ב-**values** (ב-Git), לא ב-`kubectl edit`.
:::

## redis (groundhog2k 2.4.7)

```yaml title="file: <FILE> (redis/base.yaml)"
fullnameOverride: redis
image: {repository: redis, tag: "7.2.7-alpine"}
redisConfig: |
  protected-mode no
  appendonly no
  save ""
service:
  serverPort: 6379
storage: {}
```

| מפתח | משמעות |
|---|---|
| `fullnameOverride` | שם ה-Service, צריך להתאים ל-`REDIS_HOST` |
| `redisConfig` | תוכן `redis.conf` (בלוק טקסט) |
| `service.serverPort` | פורט ה-Service, ותואם ל-`REDIS_PORT` |
| `storage: {}` | בלי PVC — `emptyDir` זמני (data נעלם עם ה-Pod) |
| `haMode.enabled`, `metrics.enabled` | `false` במעבדה |

**איך מוודאים:** `helm template redis <CHART_DIR> -f base.yaml | grep -E '^  name:'` כולל `redis` ו-`redis-headless` (Service נוסף נוצר), וגם `redis-scripts`.
