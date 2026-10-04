---
title: runners
description: ליצור project runner ב-Free, לרשום עם glrt- token, tags ו-scope, שירות systemd ופתרון pending/stuck.
sidebar:
  order: 5
---

:::note[בקצרה]
ה-runner הוא התהליך שמריץ jobs. בתרגול (gitlab.com Free) לא הופיע כפתור group runner, לכן יוצרים **project runner** ורושמים אותו על ה-VM. התיעוד מציג group runners בכל ה-tiers: אם הכפתור קיים אצלך, group runner חוסך נעילה והפעלה ידנית פר project.
הזרימה המודרנית: יוצרים runner ב-UI, מקבלים token `glrt-…`, ורושמים עם `gitlab-runner register`. אחרי ההרשמה ה-service כבר רץ.
:::

## ליצור runner ב-UI

```text title="GitLab UI"
Project → Settings → CI/CD → Runners → Expand → New project runner
  Operating systems: Linux
  Tags: trident              (the exact tag the jobs request in "tags:")
  Run untagged jobs: leave OFF if you want tags to be required
  Runner description: trident
  → Create runner
Next page shows the runner authentication token  glrt-…  (copy it now) and a register command.
```

(אם יש לך Owner על ה-group, נסה גם `Group → Build → Runners → New group runner`. בתרגול ב-Free הכפתור חסר.) ניסוח התפריט עשוי להשתנות בין גרסאות.

## לרשום על ה-VM

```bash title="runs on: VM"
read -rs RUNNER_TOKEN        # paste the glrt- token (not echoed), then Enter
sudo gitlab-runner register --non-interactive --url https://<GITLAB_HOST> --token "$RUNNER_TOKEN" --executor shell --description trident
```

- `sudo` כי הפקודה כותבת את `/etc/gitlab-runner/config.toml` (שייך ל-root).
- הדגלים אומתו מול `gitlab-runner register --help`: `--non-interactive`, `--url`, `--token`, `--executor`, `--description`.
- **לא** מעבירים `--tag-list`, `--run-untagged`, `--locked`. עם `glrt-` token הפקודה נעצרת ב-`FATAL: Runner configuration other than name and executor configuration is reserved`. את אלה קובעים ב-UI.
- `--executor shell`: ה-jobs רצים כמשתמש `gitlab-runner` על אותה מכונה ואותו docker daemon.

```bash title="runs on: VM"
sudo gitlab-runner list
sudo gitlab-runner verify
systemctl status gitlab-runner --no-pager
```

**איך מוודאים:** `list` מציג את ה-runner, `verify` מדווח `is valid`, ו-`status` הוא `active (running)`. ב-UI: `Settings → CI/CD → Runners` מציג נקודה ירוקה (online).
בלי `sudo`, `gitlab-runner list` קורא את `~/.gitlab-runner/config.toml` האישי ולא את זה של ה-service.

:::caution[מלכודת · קרה בתרגול]
הורץ `sudo gitlab-runner run` ידנית, אחרי ההרשמה. זה מפעיל instance שני בחזית. ה-systemd service כבר מריץ את ה-runner; **רק רושמים**. בדיקה: `gitlab-runner list`.
:::

## tags ו-scope חייבים להתאים (pending / stuck)

job ב-`pending` עם "no runner for tags trident" / "stuck" אומר שאין runner שמתאים. שני תנאים בו-זמנית:

| תנאי | איפה | בדיקה |
|---|---|---|
| **scope**: ה-runner משויך ל-project של ה-pipeline | `Project → Settings → CI/CD → Runners` | ה-runner ברשימת ה-project |
| **tag**: ה-tag ב-job קיים ב-runner | `tags:` ב-YAML מול tags של ה-runner | מול Tags ב-UI |

:::caution[מלכודת · קרה בתרגול]
ה-self-test `check` ב-`trident-ci` נתקע ב-"no runner for tags trident". זה צפוי: ה-project runner נרשם רק ל-`trident-source`. אי אפשר "להוסיף tag" ל-runner מ-scope שגוי.
תיקון: לפתוח את הנעילה של ה-runner ולהפעיל אותו גם ל-`trident-ci`.
:::

```text title="GitLab UI"
Unlock + share between projects:
  Project A → Settings → CI/CD → Runners → (runner) → Edit (pencil)
    untick "Lock to current projects" → Save changes
Enable in project B:
  Project B → Settings → CI/CD → Runners → "Other available project runners" → Enable for this project
  (needs Maintainer in both projects)
Tags / untagged:
  same Edit page → Tags, "Run untagged jobs"
```

| תסמין | סיבה | תיקון |
|---|---|---|
| `pending` / `stuck`, "no runner for tags X" | tag לא תואם או scope שגוי | להתאים `tags:` ו-scope כנ"ל |
| job בלי `tags:` נתקע | ה-runner לא מקבל untagged | `default: tags:` ב-YAML, או `Run untagged jobs` ON |
| runner offline | ה-service לא רץ | `sudo systemctl restart gitlab-runner` |
| `pending` על runner שנרשם מחדש | ה-token הישן נמחק | להוציא runner חדש ב-UI ולרשום |

## אחרי runner shell: מה לדעת

- Images נשארים בין jobs (אותו daemon). artifacts מעבירים **קבצים**, לא images. פירוט ב-[docker/overview](../../docker/overview/).
- אין container שנזרק, לכן `rm -rf` ל-clones זמניים בתחילת וסוף job.
- למשתמש `gitlab-runner` לא אמור להיות kubeconfig (CI כותב רק ל-Git):

```bash title="runs on: VM"
sudo -u gitlab-runner bash -lc 'echo "KUBECONFIG=${KUBECONFIG:-unset}"; ls ~/.kube 2>&1'
```

**איך מוודאים:** `KUBECONFIG=unset` ו-`No such file or directory`.

## ל-runner צריכה להיות גישה ל-docker

jobs של build ו-publish מריצים `docker`. ה-user `gitlab-runner` חייב להיות מורשה ל-daemon.

```bash title="runs on: VM"
sudo -u gitlab-runner docker info --format '{{.ServerVersion}}'
```

**איך מוודאים:** מודפסת גרסה. `permission denied while trying to connect to the docker API` = המשתמש לא בקבוצת `docker`:

```bash title="runs on: VM"
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

:::caution[מלכודת]
על ה-VM הזה `gitlab-runner` לא היה בקבוצת `docker` (הסוקט `root:docker`, מצב `660`). job שמריץ `docker` נכשל ב-`permission denied`. זו בעיית סביבה, לא קוד: ראה [debugging/env-cards](../../debugging/env-cards/).
:::
