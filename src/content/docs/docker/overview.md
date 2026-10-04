---
title: Docker בסיס
description: build מול run, build context, שמות image, login ו-push, ושני כרטיסי daemon.json (DNS ו-containerd snapshotter).
sidebar:
  order: 1
---

:::note[בקצרה]
ב-pipeline של GitOps ה-runner בונה image ודוחף אותו ל-registry. Docker כאן הוא כלי build ו-push, לא מה שמריץ את האפליקציה.
דף זה: build context, מבנה שם image, login ו-push, ושתי תקלות סביבה (DNS, `blob unknown`) שחוזרות על VM עם Docker 29 ו-systemd-resolved.
:::

## build מול run

- `docker build` על ה-**runner** יוצר **image**: אין Pod, אין cluster.
- ה-kubelet מושך את ה-image ומריץ אותו כ-container בזמן ריצה.
- "service" בהקשר ה-build = תיקיית microservice עם `Dockerfile`, לא Kubernetes Service.

:::caution[מלכודת · קרה בתרגול]
בלבול בין שני השלבים: ה-CI בונה ודוחף; מי שמריץ הוא kubelet בצומת. ה-pipeline אף פעם לא מריץ container של האפליקציה ולא נוגע ב-cluster.
:::

## build context ו-COPY paths

`docker build -f DOCKERFILE CONTEXT`: כל `COPY` מתייחס ל-**context**, לא למיקום ה-`Dockerfile`.

```text title="file tree (TRIDENT source)"
services/
  common/trident/          shared package
  ingest-api/
    Dockerfile             COPY ingest-api/requirements.txt ./  /  COPY common/trident ./trident
    app/
```

```bash title="runs on: any shell"
docker build -t <IMAGE>:<CANDIDATE> -f services/<SERVICE>/Dockerfile services/
```

ה-context הוא `services/` (לא `services/<SERVICE>`) כי ה-`Dockerfile` מעתיק `common/trident`, תיקיית אחות. נתיבי ה-`COPY` נכתבים יחסית ל-`services/`.

:::caution[מלכודת · קרה בתרגול]
context שגוי (`services/<SERVICE>`) נכשל: `COPY` לא מוצא את `common/trident`, ושגיאת build מסוג
`failed to compute cache key: … "/common/trident": not found`. בגלל זה גם רואים "can't find trident package".
כלל: ה-context חייב להכיל כל מה ש-`COPY` מזכיר.
:::

**איך מוודאים:** הפקודה מסתיימת ב-`naming to …`, ו-`docker image ls <IMAGE>` מציג את ה-tag.

## מבנה שם image

```text title="anatomy"
registry.gitlab.com / trident-lab00/trident-source/ingest-api : dev-20261001-78e24670
└── server (before FIRST "/") └── repository path (everything in between) └── tag (after the LAST ":")
```

| חלק | איך מזהים | דוגמה | placeholder |
|---|---|---|---|
| server | עד ה-`/` **הראשון** | `registry.gitlab.com` | `<REGISTRY>` |
| repository path | בין ה-`/` הראשון ל-`:` האחרון | `trident-lab00/trident-source/ingest-api` | חלק מ-`<IMAGE>` |
| tag | אחרי ה-`:` **האחרון** | `dev-20261001-78e24670` | `<CANDIDATE>` |

- `<IMAGE>:<CANDIDATE>` = `registry.gitlab.com/trident-lab00/trident-source/ingest-api:dev-20261001-78e24670`.
- שם ה-service (`ingest-api`) הוא **חלק מה-path**, לא מה-tag.
- אם ל-server יש port (`host:5000/...`), ה-`:` של ה-port לפני ה-`/` ולא נחשב tag. ה-tag הוא ה-`:` האחרון שאחרי ה-`/` האחרון.
- בלי tag Docker מניח `latest`. ב-GitOps לא משתמשים בו.

:::caution[מלכודת · קרה בתרגול]
נכתב `api:8f3a2c1` עם `api` כ-tag. נכון: `<SERVICE>:<CANDIDATE>`, כלומר `signal-processor:v1.2.0` מתפרק ל-path `signal-processor` ול-tag `v1.2.0`.
:::

## login ו-push

```bash title="runs on: CI job"
echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
docker push "<IMAGE>:<CANDIDATE>"
```

```bash title="runs on: VM"
cat <TOKEN_FILE> | docker login -u <USER> --password-stdin <REGISTRY>
docker push <IMAGE>:<CANDIDATE>
docker logout <REGISTRY>
```

- `--password-stdin` מוציא את ה-token משורת הפקודה וה-history.
- `docker push` מקבל **רק** `NAME[:TAG]`. דגלי build (`-t`, `-f`, context) שייכים ל-`docker build`.
- אין login = `denied: access forbidden` ב-push.
- ה-loop של שלושת ה-services: [ci/patterns](../../ci/patterns/). credentials ל-push ול-pull: [gitlab/registry](../../gitlab/registry/).

:::caution[מלכודת · קרה בתרגול]
דגלי `docker build` (`-t -f context`) הודבקו בטעות לפקודת `docker push`. `push` לוקח image בלבד.
:::

**איך מוודאים:** `docker push` מסיים ב-`digest: sha256:… size: …`, והתג מופיע ב-`Project → Deploy → Container registry`.

## לראות מה יש מקומית

```bash title="runs on: VM"
docker image ls --format '{{.Repository}}:{{.Tag}}'
docker info --format '{{.Driver}}'
```

ב-shell executor ה-images נשארים על המכונה בין jobs (אותו daemon), ולכן build ו-publish יכולים להיות jobs נפרדים. עם docker executor לא. אל תריץ `docker system prune` על ה-VM של הקורס: הוא מוחק גם images ו-cache של שאר המערכת.

## כרטיס סביבה 1: DNS ב-`docker build`

**תסמין:** `docker build` נכשל ב-`pip install` עם `Temporary failure in name resolution`.

**סיבה:** `/etc/resolv.conf` מצביע על ה-stub של systemd-resolved (`nameserver 127.0.0.53`, loopback) וקונטיינרים של build לא יכולים להשתמש בו.

```bash title="runs on: VM"
readlink -f /etc/resolv.conf
cat /etc/resolv.conf
resolvectl status | grep -i 'DNS Servers'
```

הפקודה האחרונה מציגה את שרתי ה-DNS האמיתיים של ה-uplink. ב-VM של התרגול: `192.168.242.2` (ועוד `8.8.8.8`). על מכונה אחרת הערכים שונים: **קח אותם מהפלט**.

```bash title="runs on: VM"
sudo cat /etc/docker/daemon.json
```

אם הקובץ קיים, **מזגו** את המפתח בלי למחוק אחרים (ראה כרטיס 2). אם לא קיים:

```bash title="runs on: VM"
echo '{"dns":["192.168.242.2","8.8.8.8"]}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

(`192.168.242.2` הוא ה-uplink של ה-VM בתרגול; החלף בערך שמצאת ב-`resolvectl`.)

**איך מוודאים:** ה-build עובר את שלב `pip install`, או בדיקה ישירה:

```bash title="runs on: VM"
docker run --rm --entrypoint getent <IMAGE>:<CANDIDATE> hosts registry.gitlab.com
```

מודפסת כתובת IP. לאחר `systemctl restart docker`, containers רצים עלולים להיעצר (אלא אם `live-restore` מוגדר).

## כרטיס סביבה 2: `blob unknown to registry` ב-push

**תסמין:** ה-image הראשון נדחף, השני נכשל: `blob unknown to registry - sha256:…` (blob של ה-config, שדולג עליו כ-cross-repo mount).

**סיבה:** Docker 29 משתמש כברירת מחדל ב-**containerd image store**. ה-pusher שלו מנסה mount בין repositories, ו-registry של gitlab.com לא מתמודד עם זה.

```bash title="runs on: VM"
docker info --format '{{.Driver}}'
docker info --format '{{json .DriverStatus}}'
```

`driver-type` = `io.containerd.snapshotter.v1` (והדרייבר `overlayfs`) = containerd store. המטרה: store קלאסי, `overlay2`.

**תיקון:** קוד ה-pipeline לא משתנה. מוסיפים ל-`daemon.json` את `features`:

```json title="file: /etc/docker/daemon.json"
{
  "dns": ["192.168.242.2", "8.8.8.8"],
  "features": { "containerd-snapshotter": false }
}
```

```bash title="runs on: VM"
sudo jq . /etc/docker/daemon.json
sudo systemctl restart docker
docker info --format '{{.Driver}}'
```

**איך מוודאים:** `jq` מדפיס את ה-JSON (תקין), ו-`.Driver` הוא `overlay2`.

:::danger[זהירות]
מעבר בין stores **מרוקן** את ה-images הקיימים (לכל store יש אחסון נפרד). אחרי הוספת `containerd-snapshotter: false` ה-images שנבנו קודם לא נראים. מריצים מחדש את **כל** ה-pipeline (למשל commit ריק ל-`dev`), לא רק retry ל-`publish`.
:::

אם Docker דחה את ההגדרה: `docker buildx build --push` מאחד build ו-push (דגל `--push` אומת). התקציר של שני הכרטיסים (לצד כרטיסי סביבה אחרים): [debugging/env-cards](../../debugging/env-cards/).

:::tip[עיקרון]
כשל ב-`docker build` / `push` בלי שינוי בקוד: קודם שאל "קוד או סביבה". DNS, `Cannot connect to the Docker daemon` ו-`blob unknown` הם סביבה. מתודה: [debugging/overview](../../debugging/overview/).
:::
