---
title: זהויות ו-tokens
description: איך יוצרים PAT, service account ו-deploy token, מה אין ב-Free, ואיזו זהות מתאימה לכל actor.
sidebar:
  order: 2
---

:::note[בקצרה]
Token הוא "ייפוי כוח" של זהות. בוחרים זהות לפי **מי** צריך את הגישה, ואז scope ו-role מינימליים.
דף זה עוסק ב**איך יוצרים** ובבחירה. מי צריך מה בכל התמונה: [architecture/credentials](../../architecture/credentials/). role מול scope: [permissions](../permissions/).
:::

## טבלת החלטה: actor → זהות

| actor | סוג זהות | scope | role | איפה נשמר |
|---|---|---|---|---|
| CI promote writer (כותב `versions/<ENV>.yaml` ל-gitops, קורא את trident-ci) | service account token (fallback: PAT) | `write_repository` | Developer על gitops, Reporter על trident-ci | group CI/CD variable `TRIDENT_GIT_TOKEN` (Mask ON, Protect OFF) |
| Argo reader, repo אחד | deploy token של אותו repo | `read_repository` | אין (deploy token לא member) | Secret ב-ns `argocd`, אחד לכל repo |
| Argo reader, N repos עם credential אחד | service account read-only (Reporter על כל repo) | `read_repository` | Reporter על כל repo | אותו credential בשני Secrets (ה-`url` שונה בכל Secret) |
| kubelet pull של images | deploy token של `trident-source` | `read_registry` | אין | `docker-registry` Secret בכל namespace של environment |
| CI registry push | אוטומטי: `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` | (job token) | role של מי שהריץ את ה-pipeline | לא נשמר. נוצר לכל job |
| runner | runner authentication token `glrt-…` | (לא scope של API) | - | `/etc/gitlab-runner/config.toml` (root) |
| אתה, מה-VM / Mac | SSH key (ראה [ssh](../../ssh/overview/)) | - | role שלך ב-project | `~/.ssh/` |

:::caution[מלכודת · קרה בתרגול]
בתחילה נבחר `TRIDENT_GIT_TOKEN` גם בתור credential ל-registry. זה שגוי: ה-token של ה-CI כותב git; המשיכה של kubelet היא deploy token נפרד עם `read_registry` בלבד.
ושמות: מי שמושך image הוא **kubelet** (ה-agent בצומת), לא `kubectl`.
:::

## מה זמין ב-Free ומה דורש Premium

| סוג | gitlab.com Free | Premium / Ultimate |
|---|---|---|
| Personal access token (PAT) | כן | כן |
| Service account (+ token) | כן | כן |
| Deploy token (project / group) | כן | כן |
| Project access token / Group access token | **לא** | כן |
| Group runner | **לא** | כן |

אומת מול התיעוד ב-2026-09-28. ה-GitLab של המבחן עשוי להיות שונה (self-managed או tier אחר), לכן הכר את שני המסלולים: ב-Premium אפשר project access token במקום service account.

:::caution[מלכודת · קרה בתרגול]
חומרי הקורס מניחים project/group access tokens. ב-Free הכפתור לא קיים. המסלול שנבחר: service account שהוא member רק ב-`trident-ci` וב-`trident-gitops`, ו-PAT כ-fallback.
:::

## ליצור service account + token

דרוש Owner על ה-group (top-level). הכי נקי: bot אחד לכל תפקיד, ולא החשבון האישי שלך.

```text title="GitLab UI"
Group (top-level) → Settings → Service accounts → Add service account
  Name: ci-promote-bot       (username is generated, e.g. service_account_…)
  → Create

On the new service account row → Manage access tokens (or the "⋮" menu) → Add new token
  Token name: promote
  Expiration date: set one (exam period)
  Scopes: write_repository
  → Create personal access token → COPY the value now (shown once)

Add it as a member of each repo it needs:
  Project → Manage → Members → Invite members
  Username: the service account's username   Role: Developer (gitops) / Reporter (trident-ci)
  → Invite
```

מיקום התפריט משתנה בין גרסאות (Settings → Service accounts, או Manage → Service accounts). אם אינך רואה: חפש "Service accounts" בסרגל הצד של ה-group.

**איך מוודאים:** `git ls-remote` עם ה-token מצליח על שני ה-repos (ראה למטה). לא לשמור את הערך בהיסטוריה: `read -rs` לתוך קובץ (ראה [bash/snippets](../../bash/snippets/)).

## ליצור PAT (fallback)

PAT הוא הזהות שלך עצמך. הכוח שלו הוא ה-role **שלך** מצומצם ל-scope. פחות נקי כי הוא מייצג אדם.

```text title="GitLab UI"
Avatar (top-left) → Edit profile → Access tokens → Add new token
  Token name: <ENV>-writer     Expiration date: set one
  Scopes: write_repository      (add read_registry only if the same token must pull images)
  → Create personal access token → COPY the value now
```

## ליצור deploy token (קריאה בלבד ל-Argo או ל-kubelet)

:::caution[מלכודת · קרה בתרגול]
Deploy tokens נמצאים תחת **Repository**, לא תחת Access tokens: `Project → Settings → Repository → Deploy tokens`. לטעות בתפריט = "אין לי אפשרות ליצור".
:::

```text title="GitLab UI"
Project → Settings → Repository → Deploy tokens → Expand → Add token
  Name: argo-read          (or registry-pull)
  Expiration date: optional but recommended
  Username: leave empty (GitLab generates gitlab+deploy-token-N)   TRIDENT: gitlab+deploy-token-1
  Scopes:
    Argo reads git       → read_repository
    kubelet pulls images → read_registry
  → Create deploy token → COPY username AND token now (shown once)
```

- deploy token שייך ל-project אחד. ל-Argo שקורא 2 repos יש 2 deploy tokens, או service account אחד.
- אין scope `write_repository` ל-deploy token (יש `write_registry`). לכתיבה ל-git צריך service account / PAT.
- יש גם group deploy token (`Group → Settings → Repository → Deploy tokens`) שתקף לכל projects ב-group.

## project / group access token (Premium בלבד)

```text title="GitLab UI"
Project → Settings → Access tokens → Add new token
  Token name: ci-publisher   Role: Developer   Scopes: write_repository   → Create
```

אם הכפתור חסר, זה tier Free: עבור ל-service account.

## לאמת token לפני שמשתמשים בו

```bash title="runs on: VM"
# git read/write access with a token stored in a file (username "oauth2" works for PAT / service account tokens)
git ls-remote "https://oauth2:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git"
# deploy token: use its own username
git ls-remote "https://<USER>:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git"
```

**איך מוודאים:** רשימת refs. `HTTP Basic: Access denied` / `403` / `not found` = ראה [permissions](../permissions/) (membership או scope). אימות registry: [registry](../registry/).

:::tip[עיקרון]
credential = הוכחת זהות; token = הרשאה מוגבלת של זהות. הוסף לכל actor בדיוק מה שהוא צריך: קורא = Reporter או deploy token קריאה, כותב = Developer בלבד.
:::
