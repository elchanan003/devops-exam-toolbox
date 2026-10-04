---
title: CI/CD variables
description: group מול project, Mask מול Protect והמלכודת של promote:dev, סוגי variables והרחבה.
sidebar:
  order: 4
---

:::note[בקצרה]
CI/CD variables הם ערכים ש-GitLab מזריק ל-**jobs** בזמן ריצה (token, שם ה-group). הם קיימים רק בתוך job של pipeline, לא בטרמינל שלך.
שני דגלים שונים לגמרי: **Mask** מסתיר ב-log; **Protect** מגביל ל-branches מוגנים.
:::

## ליצור variable

```text title="GitLab UI"
Project (or Group) → Settings → CI/CD → Variables → Expand → Add variable
  Type:        Variable | File
  Environments: All (default)
  Visibility:  Visible | Masked | Masked and hidden        (older UI: a "Mask variable" checkbox)
  Flags:       Protect variable    Expand variable reference
  Key:         TRIDENT_GIT_TOKEN
  Value:       <paste>
  → Add variable
```

ניסוח הדגלים משתנה בין גרסאות (checkboxes ישנים מול Visibility חדש). המשמעות זהה.

## group מול project

| | group variable | project variable |
|---|---|---|
| איפה | `Group → Settings → CI/CD → Variables` | `Project → Settings → CI/CD → Variables` |
| נראה ל | כל ה-projects ב-group (וב-subgroups) | project אחד |
| מתאים ל | `TRIDENT_GROUP`, `TRIDENT_GIT_TOKEN` (משותף ל-source ול-ci) | ערך ששייך ל-repo אחד |
| ניגוד שמות | project גובר על group | |

הרשאה: Maintainer ומעלה (group variables: לפעמים Owner, תלוי גרסה).

## Mask מול Protect

| | Mask | Protect |
|---|---|---|
| מה עושה | מחליף את הערך ב-`[MASKED]` ב-job log | ה-variable קיים **רק** ב-pipelines של branch/tag מוגנים |
| מה לא עושה | לא חוסם גישה, לא מצפין | לא מסתיר ב-log |
| מגבלות | ערך ≥ 8 תווים, שורה אחת, תווים מוגבלים (base64-like) | תלוי בהגדרת protected branches |
| מתאים ל | כל secret | secret ש-רק `main` (פרסום) צריך |

:::caution[מלכודת · קרה בתרגול]
`TRIDENT_GIT_TOKEN` עם **Protect ON** ו-`dev` שאינו branch מוגן: ה-variable **ריק** ב-job של `dev`, וה-push של `promote:dev` מחזיר `403`.
ההחלטה: Mask ON, Protect **OFF**. מדריך אחר השתמש ב-Protect ON כי פרסם רק מ-`main`; הבחירה תלויה ב-branch שבו ה-job רץ.
בנוסף, בהתחלה הובן ש-Mask הוא "הפניה לשם". Mask מסתיר ערך ב-log.
:::

**איך מוודאים** (בלי להדפיס את הסוד), בתוך job:

```yaml title="file: .gitlab-ci.yml"
var-check:
  script:
    - 'test -n "$TRIDENT_GIT_TOKEN" && echo "token: set" || echo "token: EMPTY"'
    - 'echo "protected branch: $CI_COMMIT_REF_PROTECTED"'
```

`token: EMPTY` + `protected branch: false` = ה-variable מוגן וה-branch לא. תיקון: לכבות Protect, או להגן על ה-branch.

## variables ב-CI לא נראים בטרמינל

:::caution[מלכודת · קרה בתרגול]
משתנים של סקריפט bootstrap (כמו `TRIDENT_GITOPS_URL`) הוגדרו כ-CI/CD variables. הסקריפט על ה-VM נכשל (`line 22: !URL_VAR: export TRIDENT_GITOPS_URL=...`), ו-`echo` ו-`env` החזירו ריק.
CI variables קיימים רק בתוך jobs. סקריפט שרץ ב-shell שלך צריך `export`, ושוב בכל טרמינל חדש. מי מריץ את הסקריפט ואיפה, קובע איפה ה-variable חי. את ה-variables המיותרים מוחקים.
:::

```bash title="runs on: VM"
export TRIDENT_GITOPS_URL="https://<GITLAB_HOST>/<GROUP>/<REPO>.git"
echo "${TRIDENT_GITOPS_URL:-EMPTY}"
env | grep -c '^TRIDENT_GITOPS_URL='
```

**איך מוודאים:** `echo` מדפיס את ה-URL ו-`grep -c` מחזיר `1`.

## variable חסר גורם ל-include נכשל

:::caution[מלכודת · קרה בתרגול]
`include` נכשל עם נתיב כמו `/trident-ci not found` (שים לב לקו הנטוי בתחילה, בלי group). הסיבה: `TRIDENT_GROUP` לא הוגדר, ומורחב למחרוזת ריקה.
תיקון: `TRIDENT_GROUP=<GROUP>` (ה-path) כ-group variable רגיל, **לא** Masked.
:::

## שמות, הרחבה וסוגים

- שם: אותיות, ספרות, `_`; לא מתחיל בספרה. מקובל UPPER_SNAKE.
- שימוש ב-YAML וב-script: `$NAME` או `${NAME}`. בתוך מחרוזת עם תווים סמוכים השתמש ב-`${NAME}`.
- **Expand variable reference** (ON כברירת מחדל): `$X` בתוך הערך מורחב. אם הערך עצמו מכיל `$` (סיסמה), כבה את הדגל.
- **Type = File**: הערך נכתב לקובץ זמני ו-`$NAME` הוא **הנתיב** לקובץ (מתאים לתעודות, kubeconfig).
- variable שמוגדר בקובץ ה-YAML (`variables:`) לא מסתיר ערכים. secrets רק ב-UI.
- predefined (אוטומטיים): טבלה ב-[ci/overview](../../ci/overview/).

:::tip[עיקרון]
שאל תמיד "איפה רץ הקוד שקורא את המשתנה": job של GitLab (CI variable), או shell שלך (`export`).
:::
