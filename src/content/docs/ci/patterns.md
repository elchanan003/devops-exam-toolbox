---
title: תבניות pipeline
description: candidate עם dotenv, build ו-publish loops, משפחת promote, שער ידני ל-prod, include דק ו-self-test.
sidebar:
  order: 3
---

:::note[בקצרה]
תבניות jobs שלמות שחוזרות בכל pipeline של GitOps: זהות candidate, build, publish, promote, שער ידני. כל אחת עם placeholders ובדיקה.
המילים עצמן: [keywords](../keywords/). ה-script של promote במלואו: [bash/templates](../../bash/templates/).
:::

## candidate: תג אחד לכל ה-pipeline (dotenv)

job אחד מחשב את הזהות פעם אחת. כל job מאוחר מקבל אותה דרך `needs`, ואף אחד לא מחשב מחדש.

```yaml title="file: pipelines/source.yml"
candidate:
  stage: test
  script:
    - echo "CANDIDATE=${CI_COMMIT_BRANCH}-$(date -u +%Y%m%d)-${CI_COMMIT_SHORT_SHA}" | tee candidate.env
  artifacts:
    reports: {dotenv: candidate.env}
```

פורמט: `<BRANCH>-YYYYMMDD-<SHA קצר>`, למשל `dev-20261001-78e24670`.

**איך מוודאים:** ב-log של `candidate` מופיעה השורה `CANDIDATE=…`; ב-job מאוחר `echo "$CANDIDATE"` מדפיס אותה.

:::caution[מלכודת · קרה בתרגול]
"איזה run אני קורא?" שני ניסיונות חוזרים נעשו על pipeline ישן של `main` (`main-20260928…`). לפני שקוראים job: בדוק ב-CANDIDATE את ה-branch ואת התאריך, והשווה ל-pipeline שרצית.
:::

## build loop

```yaml title="file: pipelines/source.yml"
build:
  stage: build
  needs: [candidate, test]
  script:
    - |
      for svc in $SERVICES; do
        docker build -t "$IMAGE_REPO/$svc:$CANDIDATE" -f "services/$svc/Dockerfile" services/
      done
```

- ה-**context** הוא `services/`, לא `services/$svc`: ה-`Dockerfile` מעתיק `common/trident` (תיקיית אחות משותפת). ראה [docker/overview](../../docker/overview/).
- ה-`-t` נותן את השם המלא כולל ה-tag.

**איך מוודאים:** ב-log כל service מסתיים ב-`naming to …/<SERVICE>:<CANDIDATE>`. ואחר כך על ה-VM: `docker image ls --format '{{.Repository}}:{{.Tag}}'`.

## publish loop

```yaml title="file: pipelines/source.yml"
publish:
  stage: publish
  needs: [candidate, build]
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
    - |
      for svc in $SERVICES; do
        docker push "$IMAGE_REPO/$svc:$CANDIDATE"
      done
```

- `--password-stdin`: ה-token לא נכנס לשורת הפקודה.
- `docker push` מקבל **רק את שם ה-image**; בלי `-t`, `-f` או context.
- בלי `docker login` ה-push נכשל ב-`denied: access forbidden`.
- לעולם לא `latest`, ולא retag.

:::caution[מלכודת · קרה בתרגול]
בהעתקה מ-`docker build` נכנסו דגלי `-t -f context` לתוך `docker push`. `push` לוקח image בלבד: `docker push <IMAGE>:<CANDIDATE>`.
:::

:::caution[מלכודת · קרה בתרגול]
הניחוש הראשון היה ש-artifacts מעבירים את ה-images מ-build ל-publish. artifacts נושאים **קבצים**, לא images של ה-daemon. עם `--executor shell` יש daemon אחד על אותה מכונה, ולכן ה-image שנבנה ב-`build` פשוט קיים ב-`publish`. עם docker executor צריך build ו-push באותו job.
:::

**איך מוודאים:** `Project → Deploy → Container registry` מציג repository לכל service עם tag `<CANDIDATE>`. פרטים: [gitlab/registry](../../gitlab/registry/).

## multi-line: `- |` מול כמה פריטים

:::caution[מלכודת · קרה בתרגול]
`for` שנכתב על כמה פריטי `-` נפרדים נשבר: כל פריט רץ ב-shell משלו, ו-`for` לא שלם הוא שגיאת syntax. פתרון: בלוק אחד עם `- |`.
:::

```yaml title="file: .gitlab-ci.yml"
broken:
  script:
    - for s in $SERVICES; do
    -   echo "$s"
    - done

works:
  script:
    - |
      for s in $SERVICES; do
        echo "$s"
      done
```

**איך מוודאים:** `Pipeline editor → Validate`, והרצה: ה-job `works` מדפיס שורה לכל service.

## YAML quoting של `:`

פריט script עם `: ` (נקודתיים+רווח) חייב מרכאות סביב כולו. הכללים והדוגמה: [keywords](../keywords/#yaml-quoting-של-).

## promote family: extends + rules

`.promote` הוא תבנית אחת; שלושה jobs שונים רק ב-`TARGET_ENV` וב-`rules`.

```yaml title="file: pipelines/source.yml"
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

promote:staging:
  extends: .promote
  variables: {TARGET_ENV: staging}
  rules: [{if: '$CI_COMMIT_BRANCH == "main"'}]
```

- ה-`.with-ci-scripts` עושה `git clone` של `trident-ci` ל-`.ci` עם `oauth2:${TRIDENT_GIT_TOKEN}` (include מביא YAML, לא קבצים).
- `promote:dev` שמקבל `403`: ה-variable ריק? ראה [gitlab/variables](../../gitlab/variables/) (Protect ON ב-branch לא מוגן).
- ה-CI כותב **רק** `versions/<ENV>.yaml`, ו-Argo מסנכרן. אין שום פקודת cluster ב-job.

## שער ידני ל-prod: needs + environment + resource_group

```yaml title="file: pipelines/source.yml"
promote:prod:
  extends: .promote
  variables: {TARGET_ENV: prod}
  needs: [candidate, promote:staging]
  rules: [{if: '$CI_COMMIT_BRANCH == "main"', when: manual}]
  environment: {name: production}
  resource_group: production
```

- אותו `promote.sh`, אותו job-template; ההבדל הוא `when: manual`.
- `needs: [candidate, promote:staging]`: prod מקבל את ה-candidate **של ה-pipeline הזה**, לא "מה שנמצא עכשיו ב-staging". לכן לא מחשבים `$CANDIDATE` מחדש.
- כפתור ▶ ב-pipeline ישן מקדם את ה-candidate הישן. זה מכוון.
- לא לוחצים על `promote:prod` לפני שבדקת ש-staging תקין (`/info` מחזיר `version` ו-`environment` נכונים).

## promote:prod: למצוא וללחוץ

`promote:prod` הוא job ידני של **אותו pipeline של `main`** (לא pipeline נפרד). הוא כותב `versions/prod.yaml` ב-gitops, ו-Argo מסנכרן.

```text title="GitLab UI"
trident-source → Build → Pipelines → the main pipeline (the run whose candidate you validated)
  → stage promote → promote:prod → click ▶ (Run)
```

```bash title="runs on: any shell"
git -C <REPO> pull
git -C <REPO> log origin/main -1 --format='%h %an %s' -- <FILE>
# TRIDENT: git -C trident-gitops log origin/main -1 --format='%h %an %s' -- apps/trident/versions/prod.yaml
```

**איך מוודאים:** ה-job ירוק; ב-`trident-gitops` commit חדש (`promote(prod): <CANDIDATE>`) ב-`versions/prod.yaml`; ב-Argo האפליקציה של prod `Synced` + `Healthy` בלי למחוק כלום.

:::note
`push` ל-Git לא יתקן כשל של Argo שנוגע ל-**מצב cluster** (למשל sync שנכשל 5 פעמים): ראה [argocd/operate](../../argocd/operate/).
:::

## include דק

```yaml title="file: trident-source/.gitlab-ci.yml"
include:
  - project: "$TRIDENT_GROUP/trident-ci"
    ref: main
    file: pipelines/source.yml
```

ה-repo של הקוד מכיל רק את ה-include; הלוגיקה חיה ב-`trident-ci`. שינוי ב-pipeline = commit ל-`trident-ci`. `TRIDENT_GROUP` הוא group variable (path, ללא Mask).

## self-test job

repo ה-CI מוכיח שה-runner והקבצים עובדים:

```yaml title="file: trident-ci/.gitlab-ci.yml"
stages: [check]
check:
  stage: check
  tags: [trident]
  script:
    - docker info --format '{{.ServerVersion}}'
    - git --version
    - for f in pipelines/*.yml; do python3 -c "import sys,yaml; yaml.safe_load(open('$f'))" && echo "ok $f"; done
    - bash -n scripts/*.sh
```

**איך מוודאים:** כל הפקודות עוברות; `bash -n` הוא בדיקת syntax בלבד. אם ה-job נתקע ב-"no runner for tags trident": [gitlab/runners](../../gitlab/runners/) (scope).

## idempotent push (no-op כש-אין שינוי)

ה-push של promote חייב לעבור גם כשה-tag כבר כתוב: בלי שינוי אין commit.

```bash title="runs on: CI job"
git add <DIR>/<ENV>.yaml
# TRIDENT: git add apps/trident/versions/<ENV>.yaml
if ! git diff --cached --quiet; then
  git commit -q -m "promote(<ENV>): <CANDIDATE>"
  git push -q origin HEAD:<BRANCH>
fi
git rev-parse HEAD
```

`git diff --cached --quiet` יוצא `0` כשאין שינוי. פקודה בתנאי של `if` לא נחשבת ל-`set -e`, ולכן ה-script לא מת. ה-script המלא: [bash/templates](../../bash/templates/). הוסף `[skip ci]` להודעה אם ה-push מפעיל pipeline לולאתי ב-repo עם CI.
