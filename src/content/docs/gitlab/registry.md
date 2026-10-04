---
title: Container registry
description: נתיבי registry ושמות image, deploy token למשיכה, ואימות credentials לפני שמשתמשים בהם.
sidebar:
  order: 6
---

:::note[בקצרה]
ה-registry של GitLab שייך ל-**project** (כאן `trident-source`) ושומר את ה-images שה-CI בנה. ה-CI דוחף עם credential אוטומטי; kubelet מושך עם deploy token.
דף זה: איך נראה נתיב, איך נוצר credential למשיכה, ואיך בודקים אותו.
:::

## איפה ה-registry ומה הנתיב

```text title="GitLab UI"
Project → Deploy → Container registry
  shows the repositories and tags, and the exact "docker login" / "docker push" commands
  (older UI: Packages & registries → Container Registry)
```

| חלק | ערך | מקור |
|---|---|---|
| server | `registry.gitlab.com` | `$CI_REGISTRY` |
| נתיב ה-project | `<GROUP>/<REPO>` | `$CI_REGISTRY_IMAGE` = `<REGISTRY>/<GROUP>/<REPO>` |
| image לכל service | `<IMAGE>` = `$CI_REGISTRY_IMAGE/<SERVICE>` | |
| tag | `<CANDIDATE>` | נקבע ב-CI, ראה [ci/patterns](../../ci/patterns/) |

דוגמה מלאה: `registry.gitlab.com/trident-lab00/trident-source/ingest-api:dev-20261001-78e24670`. פירוק ה-ref: [docker/overview](../../docker/overview/).

- ה-images ב-registry של **source**. ל-gitops מגיעה רק מחרוזת ה-tag.
- לא `latest`; תמיד ה-candidate.
- ב-Secret של `docker-registry` ה-server הוא **רק המארח**: `--docker-server=registry.gitlab.com`, בלי נתיב.

## credentials: מי דוחף ומי מושך

| מי | credential | איפה |
|---|---|---|
| ה-CI, push | `CI_REGISTRY_USER` + `CI_REGISTRY_PASSWORD` (אוטומטיים, קצרי חיים) | job של CI, מוגדר אוטומטית |
| kubelet, pull | deploy token עם `read_registry` | `docker-registry` Secret בכל namespace |
| אתה, בדיקה ידנית | deploy token או PAT עם `read_registry` | `docker login` |

:::caution[מלכודת · קרה בתרגול]
הניסוח "ה-CI דוחף images ל-gitops" שגוי: images הולכים ל-registry של `trident-source`. ו-`TRIDENT_GIT_TOKEN` הוא לא credential של registry.
:::

## ליצור deploy token למשיכה

```text title="GitLab UI"
trident-source → Settings → Repository → Deploy tokens → Expand → Add token
  Name: registry-pull      Scopes: read_registry (only)
  → Create deploy token → copy username (gitlab+deploy-token-N) and token
```

פירוט מלא: [identities](../identities/). את ה-Secret ב-cluster יוצרים כך (פרטים ב-[kubernetes/secrets](../../kubernetes/secrets/)):

```bash title="runs on: VM"
kubectl create secret docker-registry <SECRET> -n <NS> \
  --docker-server=<REGISTRY> \
  --docker-username=<USER> \
  --docker-password="$(cat <TOKEN_FILE>)" \
  --dry-run=client -o yaml | kubectl apply --server-side --force-conflicts -f -
```

הקשר: Secret לכל namespace של environment (Pod מושך רק עם Secret מה-namespace שלו), והשם נרשם ב-`extraImagePullSecrets` ב-values.

## לאמת credentials למשיכה

בדיקה בלי docker, מול ה-endpoint של ה-token:

```bash title="runs on: VM"
curl -s -o /dev/null -w '%{http_code}\n' -u "<USER>:$(cat <TOKEN_FILE>)" \
  "https://<GITLAB_HOST>/jwt/auth?service=container_registry&scope=repository:<GROUP>/<REPO>:pull"
```

**איך מוודאים:** `200` = ה-credential תקף למשיכה מה-repository הזה. `401` = שם משתמש / token שגוי (או פג).

בדיקה עם docker:

```bash title="runs on: VM"
cat <TOKEN_FILE> | docker login -u <USER> --password-stdin <REGISTRY>
docker pull <IMAGE>:<CANDIDATE>
docker logout <REGISTRY>
```

**איך מוודאים:** `Login Succeeded` ואז `Downloaded newer image` / `Image is up to date`. `unauthorized` = credential שגוי; `manifest unknown` = ה-tag לא קיים (בדוק ב-UI שה-candidate פורסם).

:::tip[עיקרון]
ImagePullBackOff: בדוק לפי הסדר: Secret קיים ב-namespace הנכון, server `registry.gitlab.com`, scope `read_registry`, `extraImagePullSecrets` מוגדר, נתיב ו-tag נכונים, `defaultImageTag` לא ריק. תרשים התסמינים: [debugging/symptoms](../../debugging/symptoms/).
:::
