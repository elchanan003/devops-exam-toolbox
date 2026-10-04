---
title: מ-Compose ל-Kubernetes ו-Helm
description: טבלת התרגום של כל מושג ב-Compose למושג ב-Kubernetes, ולמפתח ב-chart שבו הוא נוחת.
sidebar:
  order: 3
---

:::note[בקצרה]
בבחינה מקבלים POC שרץ ב-Compose ומעבירים אותו ל-Helm values. העמוד הזה הוא טבלת התרגום, וכלל אחד: **כל שירות מקבל רק את ה-config של ה-audience שלו.**
המפתחות המדויקים של ה-charts: [helm/values](../../helm/values/).
:::

## הטבלה

| ב-Compose | ב-Kubernetes | איפה זה נוחת ב-values (TRIDENT) |
|---|---|---|
| `env_file: ./config/app.env` | ConfigMap + `envFrom` | `configMaps.my-config.data` ו-`containers[].envConfigmaps: [...]` |
| `environment:` / `x-identity` (anchor) | ConfigMap של identity | `configMaps.trident-identity.data` (`TRIDENT_ENV` ב-`<ENV>.yaml`, `TRIDENT_VERSION: "{{ .Values.defaultImageTag }}"`) |
| `secrets:` | Secret **כ-volume** (קובץ) | `extraVolumes: [{name, secret: {secretName}}]` + `volumeMounts` ; ב-postgres: `extraSecrets: [{name, mountPath}]` |
| קובץ config ב-mount (`sensors.json`) | ConfigMap כ-volume | `configMaps.trident-sensors.data."sensors.json"` + `extraVolumes` (configMap) + `volumeMounts` עם `readOnly: true` |
| `redis.conf` / `initdb` ב-mount | key ב-values של ה-chart | `redisConfig: \|` ; `customScripts: {"01-schema.sql": \|}` |
| named volume (`postgres_data`) | PVC | postgres `storage: {className: course-local-path, requestedSize: ...}` |
| `tmpfs` | `emptyDir` | redis `storage: {}` |
| `healthcheck` | probes | `startupProbe` + `livenessProbe` על `/live`, `readinessProbe` על `/ready` |
| `depends_on` | **אין מקביל** | readiness + retries; סדר עלייה אינו readiness |
| `networks` | NetworkPolicy (SHOULD) | `networkPolicies.my-policy`; דורש CNI שאוכף (Canal) |
| `ports:` | Service + Ingress | `services.<SERVICE>`; `ingresses.<SERVICE>` (רק השירות החיצוני) |
| `mem_limit` | `resources.limits.memory` | בכל container |
| `image: x:${VERSION}` | image + tag | `image: "{{ .Values.generic.imageRepository }}/<SERVICE>"`, `imageTag: "{{ .Values.defaultImageTag }}"` |
| `command:` | `command` | `containers[].command` |
| `restart: unless-stopped` | ברירת המחדל של Deployment | - |

## כלל ה-config לפי audience (least knowledge)

כל שירות קורא רק את ה-ConfigMaps שחוזה (`CONTRACT.md`) מגדיר לו. שירות שרק **מקבל** לא צריך את ה-config של השולח.

| שירות | `envConfigmaps` |
|---|---|
| simulator | app, ingest, telemetry, identity |
| ingest-api (מקבל) | app, queue, telemetry, identity |
| signal-processor | app, queue, database, telemetry, identity |

:::caution[מלכודת · קרה בתרגול]
ה-simulator קיבל `trident-queue` בטעות. החוזה הוא מקור האמת, ושדות שכבר מולאו בלי TODO אפשר לסמוך עליהם. לפני מילוי: קרא את `CONTRACT.md` ובדוק מי קורא מה.
:::

## למה Secret כקובץ

קובץ מוגן בהרשאות; משתנה סביבה דולף ל-child processes, ל-`kubectl describe` ולוגים. שרת ה-postgres קורא `POSTGRES_PASSWORD_FILE`. `extraSecrets` מותקן עם **כל** המפתחות כקבצים, אז `mountPath: /run/secrets` + מפתח `postgres_password` נותן `/run/secrets/postgres_password`.

## בדיקה אחרי התרגום

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> | grep -n 'envFrom\|configMapRef\|secretName'
```

**איך מוודאים:** לכל container מופיעים בדיוק ה-ConfigMaps מהטבלה; ה-Secret מופיע ב-volume ולא ב-`env`. הצורה המלאה של `helm template`: [helm/overview](../../helm/overview/).
