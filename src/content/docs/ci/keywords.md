---
title: מילות מפתח של .gitlab-ci.yml
description: טבלת reference צפופה ודוגמה מינימלית לכל מילה, עם source.yml של TRIDENT כדוגמה עובדת.
sidebar:
  order: 2
---

:::note[בקצרה]
reference למילות המפתח שמופיעות ב-pipeline של TRIDENT. קודם הטבלה לחיפוש מהיר, אחר כך דוגמה מינימלית לכל מילה.
תבניות מלאות שמשלבות אותן: [patterns](../patterns/). בסיס ה-CI: [overview](../overview/).
:::

## טבלה: מילה → מה עושה

| מילה | רמה | מה עושה | מלכודת |
|---|---|---|---|
| `workflow: rules` | גלובלי | מחליט אם pipeline קיים בכלל | האחרון `- when: never` חוסם את כל השאר |
| `default: tags` | גלובלי | ברירת מחדל לכל job | job עם `tags:` משלו מחליף |
| `stages` | גלובלי | סדר ה-stages | job בלי `stage` הוא `test` |
| `variables` | גלובלי / job | משתנים | secrets לא כאן, רק ב-UI |
| `include: project` | גלובלי | מביא YAML מ-repo אחר | YAML בלבד, לא scripts |
| `.name` (hidden) | job | תבנית שלא רצה | לא מופיע ב-pipeline |
| `extends` | job | ירושה מ-job / hidden | הילד גובר, מיזוג עמוק של maps, `script` מוחלף |
| `before_script` | job / default | רץ לפני `script` באותו shell | כשל = ה-job נכשל |
| `script` | job | הפקודות | כל פריט `-` הוא פקודה נפרדת |
| `needs` | job | גרף תלות + קבלת artifacts | בלי `needs` ה-job מחכה לכל ה-stage הקודם |
| `artifacts: reports: dotenv` | job | מייצא variables ל-jobs מאוחרים | רק ל-jobs ב-`needs` |
| `rules` | job | תנאי הרצה | `if` על משתנה; ללא match = ה-job לא נוצר |
| `when: manual` | job / rules | נדרש click | ה-pipeline לא נחסם בגללו |
| `environment` | job | רושם deployment | מופיע ב-Operate → Environments |
| `resource_group` | job | מונע ריצה במקביל | jobs ברמה זו ירוצו בטור |
| `tags` | job | בוחר runner | חייב להתאים ל-runner |

## workflow: rules

מגדיר אילו pipelines נוצרים. כאן רק `dev` ו-`main`.

```yaml title="file: pipelines/source.yml"
workflow:
  rules:
    - if: '$CI_COMMIT_BRANCH == "dev"'
    - if: '$CI_COMMIT_BRANCH == "main"'
    - when: never
```

**איך מוודאים:** push ל-`poc` לא יוצר pipeline; push ל-`dev` כן.

## default, tags, stages, variables

```yaml title="file: pipelines/source.yml"
default:
  tags: [trident]

stages: [test, build, publish, promote]

variables:
  SERVICES: "acoustic-simulator ingest-api signal-processor"
  IMAGE_REPO: "$CI_REGISTRY_IMAGE"
  GITOPS_REPO: "$CI_SERVER_HOST/$TRIDENT_GROUP/trident-gitops.git"
```

`tags` חייב להתאים ל-runner (ראה [gitlab/runners](../../gitlab/runners/)). `variables` יכול להפנות למשתנים אחרים עם `$`.

## include: project

```yaml title="file: trident-source/.gitlab-ci.yml"
include:
  - project: "$TRIDENT_GROUP/trident-ci"
    ref: main
    file: pipelines/source.yml
```

`project` הוא `<GROUP>/<REPO>` (path). חייב להיות קריא ל-user שמריץ. `project not found` / `/trident-ci not found` = `TRIDENT_GROUP` ריק או חסר הרשאה. include מביא **YAML בלבד**; script מ-repo אחר חייב לעבור clone ב-job.

## hidden job + extends + before_script

```yaml title="file: pipelines/source.yml"
.with-ci-scripts:
  before_script:
    - git clone -q --depth 1 "https://oauth2:${TRIDENT_GIT_TOKEN}@${CI_REPO}" .ci

.promote:
  extends: .with-ci-scripts
  stage: promote
  needs: [candidate, publish]
  script:
    - bash .ci/scripts/promote.sh "$TARGET_ENV" "$CANDIDATE"

promote:dev:
  extends: .promote
  variables: {TARGET_ENV: dev}
  rules: [{if: '$CI_COMMIT_BRANCH == "dev"'}]
```

`extends` מעביר גם שרשרת (`.promote` יורש מ-`.with-ci-scripts`). מבדיקה: `Pipeline editor → Full configuration` (או `Visualize`) מציג את ה-YAML אחרי מיזוג.

## artifacts: reports: dotenv

```yaml title="file: pipelines/source.yml"
candidate:
  stage: test
  script:
    - echo "CANDIDATE=${CI_COMMIT_BRANCH}-$(date -u +%Y%m%d)-${CI_COMMIT_SHORT_SHA}" | tee candidate.env
  artifacts:
    reports: {dotenv: candidate.env}
```

`tee` מדפיס וגם כותב לקובץ. כל job שיש לו את `candidate` ב-`needs` מקבל `$CANDIDATE`. פורמט הקובץ: שורות `KEY=value`.

## needs

```yaml title="file: pipelines/source.yml"
build:
  stage: build
  needs: [candidate, test]

promote:prod:
  needs: [candidate, promote:staging]
```

`needs` יוצר DAG: ה-job מתחיל ברגע שה-jobs שלו הסתיימו, גם אם stage קודם עוד רץ. הוא גם קובע מאיזה jobs מגיעים artifacts ו-dotenv.

## rules ו-when: manual

```yaml title="file: pipelines/source.yml"
promote:staging:
  rules: [{if: '$CI_COMMIT_BRANCH == "main"'}]

promote:prod:
  rules: [{if: '$CI_COMMIT_BRANCH == "main"', when: manual}]
```

`rules` ברמת job: ה-job נוצר רק אם יש התאמה. `when: manual` יוצר כפתור ▶; הוא לא רץ לבד.

## environment ו-resource_group

```yaml title="file: pipelines/source.yml"
promote:prod:
  environment: {name: production}
  resource_group: production
```

`environment` רושם את ה-deployment ב-`Operate → Environments`. `resource_group` מבטיח ש-promote אחד ל-prod רץ בכל רגע.

## `- |` בלוק מרובה שורות

```yaml title="file: .gitlab-ci.yml"
build:
  script:
    - |
      for s in $SERVICES; do
        docker build -t "$IMAGE_REPO/$s:$CANDIDATE" -f "services/$s/Dockerfile" services/
      done
```

`- |` = פריט script אחד מרובה שורות (block scalar). שורות נפרדות עם `-` רצות כל אחת ב-shell משלה, אז `for` שבור על כמה פריטים נכשל. ראה [patterns](../patterns/).

## YAML quoting של `:`

```yaml title="file: .gitlab-ci.yml"
job:
  script:
    - 'echo "step: build"'
    - echo "no colon-space here"
```

פריט script שמכיל `: ` (נקודתיים ורווח) חייב להיות במרכאות סביב כל הפריט. בלי זה YAML קורא אותו כ-map, והמבנה לא תקין (השגיאה בדרך כלל `script config should be a string or a nested array of strings`). אותו כלל חל על `#` אחרי רווח, ועל פריט שמתחיל ב-`{`, `[`, `*`, `&`, `!`, `%`, `@`, או `"`.

**איך מוודאים:** `Pipeline editor → Validate`, או מקומית: `python3 -c "import yaml,sys; print(yaml.safe_load(open('.gitlab-ci.yml')))"` ובדיקה שכל `script` הוא רשימת מחרוזות.

:::tip[עיקרון]
כל מילה כאן נבחרת לפי שאלה: *מתי* ה-job קיים (`workflow`, `rules`), *איפה* הוא רץ (`tags`), *אחרי מי* (`needs`), *מה הוא מקבל* (dotenv, variables).
:::
