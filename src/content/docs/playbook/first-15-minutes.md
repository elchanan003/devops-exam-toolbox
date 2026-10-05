---
title: 15 הדקות הראשונות
description: לקרוא את הפרויקט בלי לשנות דבר, למפות אותו בפקודות grep ו-find, ולמלא טבלת ערכים שחייבים להתאים.
sidebar:
  order: 2
---

:::note[בקצרה]
לפני שמקלידים שינוי אחד, ממפים: מה לא גמור, מה קיים, ואילו ערכים חייבים להיות זהים בכמה קבצים.
כל הפקודות כאן **קוראות בלבד**, ורצות על ה-tree של הפרויקט אחרי clone. התוצר: טבלת ערכים מלאה, רשימת קבצים לעריכה, וציור של הזרימה.
:::

## מה פותחים וקוראים

פותחים בסדר הזה ולא מדלגים. מחפשים בכל קובץ שלוש מילים: `MUST`, `TODO`, `exit 1`.

| # | קובץ | מה שואבים ממנו |
|---|---|---|
| 1 | `README.md` בשורש | החוזה: רשימת ה-MUST, ה-SHOULD וה-STRETCH; חלוקת ה-repos |
| 2 | `CONTRACT.md` / `reference.md` | שמות קבועים, משתנים אוטומטיים, איך נראה credential |
| 3 | `README.md` בכל repo | מה ה-repo הזה מקבל, מי כותב אליו |
| 4 | כותרת (10 השורות הראשונות) של כל `*.sh` | `Outcome` שהסקריפט חייב לספק, ומאילו קבצים הוא קורא |
| 5 | קבצי ה-CI: `.gitlab-ci.yml` ו-`pipelines/*.yml` | אילו variables הם מצפים לקבל מ-GitLab |

דוגמה: ב-TRIDENT יש 8 קבצי קריאה: `README.md` ×6 (שורש, `ci`, `gitops`, `source`, `source/secrets`, `templates`), `reference.md` ו-`source/CONTRACT.md`.

**איך מוודאים:** אתה יכול לומר במשפט אחד מה הזרימה (מי כותב ל-Git, מי מושך, מי מריץ) ולרשום את ה-MUST על דף.

## מיפוי: מה לא גמור

`TODO` הוא החלטה שנשארה לך; `exit 1` בשורה עם `TODO` הוא stub שנעצר בכוונה. `exit 1` רגיל בסקריפט גמור הוא רק יציאת שגיאה, ולכן הוא רעש.

```bash title="runs on: VM"
cd <DIR>                                                                    # the checked-out project, all repos side by side
grep -rnE 'TODO|FIXME|exit 1' --include=*.sh --include=*.yaml --include=*.yml .
grep -rlE 'TODO|FIXME' --include=*.sh --include=*.yaml --include=*.yml . | sort
grep -rnE 'TODO.*exit 1' --include=*.sh --include=*.yaml --include=*.yml .
grep -rnE '^\s*(- )?repoURL: ""' --include=*.yaml .
grep -rnoIE '<[A-Z_]+>' .
```

השורות: הכול, הקבצים שתערוך, ה-stubs, repoURL ריקים, ו-placeholders באותיות גדולות בסוגריים זוויתיים.

:::caution[מלכודת]
`grep TODO` לבדו מפספס. ב-TRIDENT ה-Applications של staging ו-prod לא מכילים `TODO` אבל כוללים `repoURL: ""`, ולכן הפקודה הרביעית נחוצה. ובכל קובץ שמעתיקים שורה בתוכו: קרא את שאר ה-block, לא רק את השורה שמעליו.
:::

**איך מוודאים:** יש לך רשימה של קבצים לעריכה. ב-TRIDENT:

| פקודה | מה נספר | תוצאה ב-TRIDENT |
|---|---|---|
| `grep -rnE 'TODO\|FIXME\|exit 1' …` | שורות | 51 (רובן `exit 1` רגיל) |
| `grep -rnE 'TODO\|FIXME' …` | שורות | 31, ב-14 קבצים |
| `grep -rnE 'TODO.*exit 1' …` | stubs | 6: `prepare-environment.sh`, `prepare-observability.sh`, `cleanup.sh`, `promote.sh`, ו-build ו-publish ב-`pipelines/source.yml` |
| `grep -rnE '^\s*(- )?repoURL: ""' …` | שורות פעילות | 17, ב-5 קבצים (root: 1, כל אחד מ-4 ה-Applications: 4) |
| `grep -rn 'repoURL: ""' .` (בלי עוגנים) | שורות | 21: כולל 3 שורות בהערה ובדיקת `bootstrap.sh` |
| `grep -rnoIE '<[A-Z_]+>' .` | התאמות | 8, כמעט כולן `<YYYYMMDD>` בתיעוד: אות חלשה |

## מיפוי: מה יש

```bash title="runs on: VM"
find . -maxdepth 3 \( -iname 'README*' -o -iname 'CONTRACT*' -o -iname 'reference*' \) -type f | sort
grep -rnE 'MUST|SHOULD|STRETCH' --include=*.md .
find . -name Chart.yaml
find . -name '*.sh' | sort
find . -name '*.y*ml' -not -path './.git/*' | sort
ls -d */
git branch -a
git tag
git remote -v
```

שלוש האחרונות רצות **בתוך כל repo** (`git -C <DIR>/<REPO> branch -a`). אם ה-tree הוא תיקייה אחת בלי `.git` משלה, ה-repos הם תיקיות המשנה.

**איך מוודאים:** ב-TRIDENT: 11 שורות `MUST|SHOULD|STRETCH` בקבצי `.md`, 16 קבצי `.sh`, 35 קבצי YAML, ו-4 תיקיות (`ci`, `gitops`, `source`, `templates`) שהן 4 ה-repos. `find . -name Chart.yaml` מחזיר **0**: ה-charts לא בתוך ה-tree, `templates/import-charts.sh` מייבא אותם בהמשך. תוצאה ריקה היא מידע, לא שגיאה.

## מיפוי: איפה הערכים שחייבים להתאים

```bash title="runs on: VM"
grep -rnE 'ingresses|hostname|hosts:' --include=*.yaml --include=*.md .
grep -rniE 'storageClass|className' --include=*.yaml --include=*.md .
grep -rnE '_HOST|_URL' --include=*.env --include=*.conf .
docker compose -f <FILE> config --services
grep -rnE 'IMAGE_REPO|imageRepository|CI_REGISTRY_IMAGE' --include=*.yaml --include=*.yml --include=*.sh .
grep -rnE 'secretName|ImagePullSecrets|create secret' --include=*.yaml --include=*.sh --include=*.md .
grep -rnE 'versions/|defaultImageTag' --include=*.yaml --include=*.yml --include=*.sh .
grep -rn 'targetRevision' --include=*.yaml .
grep -rnE 'mountPath|/run/secrets' --include=*.yaml --include=*.md .
```

בסדר: hosts של ה-Ingress, StorageClass, משתני `*_HOST`/`*_URL` מול שמות ה-services ב-compose, נתיב ה-image ב-GitLab Container Registry, שמות Secrets, מקור ה-tag, tag או branch ב-Argo, ונתיבי mount של Secrets.
(`<FILE>` כאן: קובץ ה-compose של הפרויקט, ב-TRIDENT `source/compose.yaml`.)

**איך מוודאים:** ב-TRIDENT: 8 שורות על hosts, 8 על StorageClass, 3 משתני `*_HOST`/`*_URL` ב-`source/config/*.env` (`POSTGRES_HOST=postgres`, `REDIS_HOST=redis`, `INGEST_URL=http://ingest-api:8080`), 10 services ב-compose (`docker compose … config --services`), 8 שורות על נתיב ה-image, 6 על Secrets, 14 על ה-tag, 20 על `targetRevision`.

:::caution[מלכודת · קרה בתרגול]
`storage.className` נשמט ב-`postgres/base.yaml` למרות שהערת הכותרת של אותו קובץ **מונה אותו**; ה-PVC נשאר `Pending`. לפני שממלאים קובץ values: קרא את כותרתו, וכל שדה שמופיע בה עובר לטבלה למטה.
:::

## טבלת "ערכים שחייבים להתאים"

ממלאים אותה תוך 15 הדקות. כל שורה היא ערך שמופיע ביותר ממקום אחד, וטעות בו היא כשל שקט. העמודה האחרונה היא הדוגמה מ-TRIDENT; את הטבלה שלך מעתיקים לקובץ `NOTES.md` מחוץ ל-repo ומשאירים את העמודה האחרונה ריקה.

| מה | איפה מוצאים | פקודה | ערך ב-TRIDENT |
|---|---|---|---|
| group **path** (לא display name) | כתובת ה-group ב-UI, `git remote -v` | `git remote -v` | `trident-lab00` (שם תצוגה: `trident-lab`) |
| שמות ה-repos | README בשורש, "repo split" | `ls -d */` | `trident-source`, `trident-ci`, `trident-templates`, `trident-gitops` |
| `repoURL` בכל Application | `argocd/root.yaml`, `argocd/apps/*.yaml` | `grep -rn 'repoURL' --include=*.yaml .` | `https://gitlab.com/<GROUP>/trident-gitops.git` (5 קבצים, 17 שורות) |
| `targetRevision` | אותם קבצים | `grep -rn targetRevision --include=*.yaml .` | templates: tag `v1.0.0`; gitops: `main` |
| שם ה-repo Secret של Argo | `bootstrap/register-repository.sh` | `grep -n 'SECRET=' <FILE>` | `trident-gitops`, `trident-templates` ב-namespace `argocd`; ה-`url` שלהם זהה byte-for-byte ל-`repoURL` |
| משתנים ש**הסקריפטים** דורשים ב-shell | כותרות הסקריפטים, `${VAR:?}` | `grep -rnE ':\?\|URL_VAR\|export ' --include=*.sh .` | `TRIDENT_GITOPS_URL`, `TRIDENT_TEMPLATES_URL` (מוגדרים ב-`env.sh`, לא ב-GitLab) |
| namespaces | README של ה-gitops, `destination` | `grep -rnE 'namespace:\|destination' --include=*.yaml .` | `trident-dev`, `trident-staging`, `trident-prod`, `trident-observability` |
| שמות Secrets ומפתחות | כותרת `prepare-environment.sh` | `sed -n 1,15p <FILE>` | `trident-postgres` (`postgres_password`), `trident-registry`, `trident-tls`, `trident-grafana-admin` |
| service names מול `*_HOST` | `config/*.env`, compose | `grep -rnE '_HOST\|_URL' --include=*.env .` | `postgres`, `redis`, `ingest-api` (אחרי `fullnameOverride`) |
| נתיב ה-image ב-GitLab Container Registry | `IMAGE_REPO` ב-CI, `imageRepository` ב-values | `grep -rnE 'IMAGE_REPO\|imageRepository' …` | `registry.gitlab.com/<GROUP>/trident-source/<SERVICE>` |
| מקור ה-tag | `versions/<ENV>.yaml`, `promote.sh` | `grep -rn 'defaultImageTag' …` | `<branch>-<YYYYMMDD>-<sha>`, נכתב רק ל-`apps/trident/versions/<ENV>.yaml` |
| hosts ו-ports | values של ה-Ingress; ה-NodePort מגלים **בקלאסטר** | `grep -rn 'hostname' --include=*.yaml .` | `<ENV>.trident.test` (פעמיים: `hosts[].hostname` ו-`extraTls[].hosts`); ה-README אומר NodePort `31024`, ב-VM בזמן הכתיבה `31731`: [environment-setup](../environment-setup/) |
| StorageClass | README, כותרת `postgres/base.yaml` | `grep -rniE 'className' …` | `course-local-path` |
| נתיב mount של Secret | `CONTRACT.md` ו-ה-`*_FILE` ב-values | `grep -rn '/run/secrets' …` | `/run/secrets/<APP_DIR>/postgres_password` (לא `/run/secrets` עצמו) |
| tag של ה-runner | `.gitlab-ci.yml` | `grep -rn 'tags' …` | `trident` |

שני המקומות שנשברו בתרגול, ולכן שורות מודגשות: ה-group **path** והנתיב של ה-Secret. ב-TRIDENT הערך שסופק ב-`apps/trident/base.yaml` הוא `/run/secrets/postgres_password`: ה-mount והמשתנה `*_FILE` חייבים לעבור **יחד** לתת-תיקייה.

:::caution[מלכודת · קרה בתרגול]
`Include project /trident-ci not found` (נטוי מוביל ובלי group): `TRIDENT_GROUP` ריק. ה-clone עם display name במקום path נכשל באותו אופן. קח את ה-path מ-`git remote -v` או מכתובת ה-group, והגדר אותו כ-variable רגיל (לא Masked). [gitlab/variables](../../gitlab/variables/)
:::

**איך מוודאים:** אין שורה ריקה בעמודה "ערך" שלך, וכל ערך שמופיע בשני קבצים או יותר זהה בשניהם.

## delta-on-copy: טבלת החלפה ו-grep

הדבקה מ-env אחד לאחר (או מפרויקט אחר) מעבירה איתה את השמות הישנים. לפני ההדבקה כותבים טבלה, ואחרי ההדבקה מחפשים כל ערך ישן.

| ערך ישן | ערך חדש | קבצים שמושפעים |
|---|---|---|
| `<ENV>` = `dev` | `<ENV>` = `staging` | שם ה-Application, `destination.namespace`, `versions/<ENV>.yaml` |
| `<NS>` = `trident-dev` | `<NS>` = `trident-staging` | `destination`, ה-Secrets שנוצרים |
| `<HOST>` = `dev.trident.test` | `<HOST>` = `staging.trident.test` | `hostname` ו-`extraTls` |
| `<PORT>` | `<PORT>` | נתיבי health, `servicePort` |

```bash title="runs on: VM"
grep -rnE '<old value 1>|<old value 2>|<old value 3>' --include=*.yaml --include=*.yml --include=*.sh --include=*.md .
```

אחרי העתקת `dev.yaml` ל-`staging.yaml`, כל ערך ישן שנשאר בקובץ החדש הוא באג. ב-TRIDENT מחפשים `'trident-dev|dev\.trident\.test'` ומקבלים 16 שורות: כולן צריכות להיות בקבצי dev או בתיעוד, ואף אחת בקובץ staging או prod.

**איך מוודאים:** ה-grep על הערכים הישנים מחזיר שורות **רק** בקבצים שמיועדים לסביבה הישנה.

## מה יוצא מ-15 הדקות

| תוצר | איפה |
|---|---|
| טבלת הערכים, מלאה | `NOTES.md` מחוץ ל-repo |
| רשימת קבצים לעריכה (פלט `grep -rlE 'TODO\|FIXME'`) | אותו קובץ |
| ציור זרימה של שורה אחת: source → CI → gitops → Argo → cluster | דף נייר |
| טבלת credentials: מי צריך מה | [architecture/credentials](../../architecture/credentials/) |
| רשימת MUST / SHOULD | אותו דף |

אחר כך: [environment-setup](../environment-setup/), ובסיום [order-of-work](../order-of-work/). מה שנשאר פתוח מהמיפוי הוא רשימת ה-gates שלך.

**איך מוודאים:** אם אתה לא יודע מאיפה יבוא ה-tag של ה-image או איזה נתיב ירשם ב-values, חזור לטבלה: השורה הזו עוד ריקה.
