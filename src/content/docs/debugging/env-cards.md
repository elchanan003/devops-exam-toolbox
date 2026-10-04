---
title: כרטיסי באגי סביבה
description: באגי סביבה ידועים ב-VM וב-CI, כל אחד עם סימפטום, סיבה ותיקון, וקישור לפירוט.
sidebar:
  order: 3
---

:::note[בקצרה]
באגי **סביבה** הם לא באגי קוד: ה-pipeline נכון והמכונה לא. מכירים אותם לפי הטקסט. סיכום להחלטה מהירה; פירוט הפקודות של Docker ב-[docker/overview](../../docker/overview/).
:::

## Docker build נופל ב-DNS

- **סימפטום:** `Temporary failure in name resolution` ב-`pip install` בתוך `docker build`.
- **סיבה:** `/etc/resolv.conf` מצביע ל-stub של systemd-resolved (`127.0.0.53`), שלא נגיש מתוך container של build.
- **תיקון:** להגדיר `dns` ב-`/etc/docker/daemon.json` ולהפעיל מחדש את Docker (דורש sudo). הפקודות המדויקות, כולל איך מוצאים את כתובת ה-DNS: [docker/overview](../../docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build).

## docker push נכשל עם blob unknown

- **סימפטום:** ה-image הראשון נדחף, השני נכשל: `blob unknown to registry`.
- **סיבה:** ב-Docker 29 ברירת המחדל היא containerd image store, ו-cross-repo mount שלו שבור מול registry של gitlab.com.
- **תיקון:** לכבות את `containerd-snapshotter` ב-`daemon.json` (קוד ה-pipeline לא משתנה). **מזגו** את המפתח לקובץ הקיים ואל תדרסו אותו; ואז מריצים את ה-pipeline המלא מחדש, כי המעבר מרוקן את ה-images. פירוט: [docker/overview](../../docker/overview/#כרטיס-סביבה-2-blob-unknown-to-registry-ב-push).

:::caution[מלכודת]
שני הבאגים האלה הם הכרטיסים הסבירים ביותר על VM עם Docker 29 ו-systemd-resolved. שניהם סביבה: אל תשנה את ה-Dockerfile.
:::

## CRLF בסקריפטים

- **סימפטום:** `bad interpreter`, `\r: command not found`.
- **סיבה:** סיומות שורה של Windows בקובץ `.sh`.
- **תיקון והרשאה:**

```bash title="runs on: any shell"
sed -i 's/\r$//' <FILE>
chmod +x <FILE>
```

**איך מוודאים:** `bash -n <FILE>` בלי פלט; `grep -c $'\r' <FILE>` מחזיר 0. עוד: [git/hygiene](../../git/hygiene/).

## runner: scope ו-tag

- **סימפטום:** job תקוע ב-pending או `no runner for tags`.
- **סיבה:** ה-runner צריך **גם** scope תואם **וגם** tag תואם. בתרגול ב-Free לא היה group runner, ה-runner היה של project אחד.
- **תיקון:** להפעיל את ה-runner ל-project הנוסף; לא להריץ `gitlab-runner run` (ה-service כבר רץ; רק `register`).

```bash title="runs on: VM"
sudo gitlab-runner list
```

**איך מוודאים:** ה-runner מופיע; ה-job מתחיל. פירוט: [gitlab/runners](../../gitlab/runners/).

## כלים חסרים ב-VM

- **סימפטום:** `argocd: command not found`, `glab`, `yq`.
- **סיבה:** לא מותקנים. זה לא באג.
- **תיקון:** Argo דרך `kubectl` ו-UI; GitLab דרך ה-UI; לקריאת YAML `jq` + `kubectl ... -o json`.

**איך מוודאים:** `command -v kubectl helm jq git docker` מדפיס נתיבים.

## kubeconfig רק ב-VM

- **סימפטום:** `kubectl` ב-Mac לא מתחבר; ה-runner לא יכול `kubectl`.
- **סיבה:** kubeconfig קיים רק ב-VM, ולמשתמש של ה-runner אין אחד בכוונה (CI לא נוגע ב-cluster).
- **תיקון:** `kubectl`/`helm` ב-VM; `git` ב-Mac או ב-VM (חייבים לדעת auth גם ב-VM).

```bash title="runs on: VM"
sudo -u gitlab-runner bash -lc 'echo $KUBECONFIG; ls ~/.kube 2>&1'
```

**איך מוודאים:** אין kubeconfig למשתמש ה-runner.

:::caution[מלכודת]
אל תריץ `docker system prune` ואל תשנה `COMPOSE_PROJECT_NAME` ב-VM משותף; כלים ו-cleanup מסתמכים על שם ה-project.
:::
