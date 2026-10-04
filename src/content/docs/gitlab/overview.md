---
title: GitLab בסיס
description: group מול project, יצירת project ו-branch ב-UI, וסט ה-repos של פרויקט בסגנון TRIDENT.
sidebar:
  order: 1
---

:::note[בקצרה]
GitLab הוא ה-source of truth: ה-CI רץ ממנו, Argo CD קורא ממנו, וה-clone המקומי הוא רק שולחן עבודה.
הטאב הזה מכסה את מה שיוצרים ב-UI (group, project, token, variable, runner, registry). דף זה הוא הבסיס; לכל נושא יש דף משלו.
המפה הגדולה של "מי צריך איזה credential" נמצאת ב[architecture/credentials](../../architecture/credentials/).
:::

## מפת הדפים בטאב

| צריך | דף |
|---|---|
| ליצור token / service account / deploy token ולבחור ביניהם | [identities](../identities/) |
| להבין למה `403` למרות שה-token "תקין" (role מול scope) | [permissions](../permissions/) |
| CI/CD variables, Mask מול Protect | [variables](../variables/) |
| runner שמריץ jobs | [runners](../runners/) |
| נתיבי image, deploy token למשיכה | [registry](../registry/) |

## group path מול display name

ל-group יש שני שמות. ה-URL, ה-clone וה-`repoURL` משתמשים תמיד ב-**path**, לא ב-display name.

```text title="GitLab UI"
Group → Settings → General → Naming, visibility
  Group name   = display name (can contain spaces, free text)   TRIDENT: trident-lab
  Group URL    = path (what goes in every URL and variable)     TRIDENT: trident-lab00
```

:::caution[מלכודת · קרה בתרגול]
ה-display name היה `trident-lab` וה-path היה `trident-lab00`. שימוש בשם התצוגה ב-`TRIDENT_GROUP` וב-`repoURL` שבר clone ו-include.
הדרך הבטוחה: העתק את ה-URL מהכפתור **Code** של ה-project, או מסרגל הכתובת של הדפדפן.
:::

**איך מוודאים:** `git ls-remote git@<GITLAB_HOST>:<GROUP>/<REPO>.git` מדפיס רשימת refs ולא `not found`.

## ליצור group ו-project

```text title="GitLab UI"
Create group:
  left sidebar → Groups → View all groups → New group → Create group
  fill: Group name, Group URL (this is the path), Visibility = Private → Create group

Create project inside the group:
  open the group → New project/repository → Create blank project
  fill: Project name, Project URL (pick the group in the dropdown),
        Project slug (= the repo path), Visibility = Private
  untick "Initialize repository with a README" if you will push an existing repo, otherwise tick it
  → Create project
```

ניסוחי התפריט משתנים קצת בין גרסאות (Groups מול Your work, "New project/repository" מול "New project"). המבנה הקבוע: group → New project → Create blank project.

**איך מוודאים:** כפתור **Code** בדף ה-project מציג את כתובות ה-clone עם ה-path הנכון.

## ליצור branch ב-UI

```text title="GitLab UI"
Project → Code → Branches → New branch
  Branch name: <BRANCH>        Create from: main
```

או מה-clone: `git switch -c <BRANCH>` ואז `git push -u origin <BRANCH>` (ראה [git/branches](../../git/branches/)).
ה-default branch משתנה ב-`Project → Settings → Repository → Branch defaults`.

## סט ה-repos של פרויקט בסגנון TRIDENT

הפרויקט מחולק למספר repos כי לכל אחד יש כותב וקורא אחרים. חשוב לדעת מי **כותב** (זה קובע role ו-scope).

| repo | תוכן | מי כותב | מי קורא |
|---|---|---|---|
| `trident-source` | קוד, `Dockerfile`, `.gitlab-ci.yml` דק, ה-registry של ה-images | אתה | ה-runner (CI), kubelet (registry) |
| `trident-ci` | `pipelines/source.yml`, `scripts/promote.sh` | אתה | ה-pipeline של source (include + clone) |
| `trident-gitops` | values לכל environment, `versions/<ENV>.yaml`, `argocd/` | אתה + CI (רק `versions/`) | Argo CD |
| `trident-templates` | ה-charts (pinned ב-tag) | אתה | Argo CD |

- ה-images נדחפים ל-registry של **source**, לא של gitops. ל-gitops מגיעה רק מחרוזת ה-tag.
- Argo קורא רק את `gitops` ו-`templates`. הוא לא קורא את `source`.
- ה-CI לא נוגע ב-cluster; הוא כותב ל-Git ו-Argo מסנכרן. פירוט ב-[architecture/overview](../../architecture/overview/).
