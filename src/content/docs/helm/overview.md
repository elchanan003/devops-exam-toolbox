---
title: Helm — פקודות ו-values
description: להריץ helm template מקומי בדיוק כמו ש-Argo מריץ, לקרוא chart, ולהבין איך קבצי values נערמים זה על זה.
sidebar:
  label: "פקודות ו-values"
  order: 1
---

:::note[בקצרה]
`helm` רץ על ה-VM ושם בלבד, וגם שם רק כ-renderer: `helm template`. אתה אף פעם לא מריץ `helm install` — Argo מריץ `helm template` בעצמו.
ההרגל שחוסך הכי הרבה זמן: **לפני שדוחפים**, להריץ מקומית את אותו render ש-Argo יריץ, ולבדוק אותו עם `grep -c`.
דפים קרובים: [values וה-chart API](../values/) · [בדיקות ל-values](../testing/) · [Argo applications](../../argocd/applications/).
:::

## Pre-flight render: אותו render ש-Argo יריץ

ב-Argo ה-Application מגדיר: chart, רשימת `valueFiles` לפי סדר, ו-namespace. אצלך בשורת הפקודה צריך לכתוב את כל זה ידנית.

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> -f <FILE> > /tmp/render.yaml
# TRIDENT: helm template trident charts/nxs-universal-chart -n trident-dev -f base.yaml -f dev.yaml -f versions/dev.yaml
```

**כלל: `-f` תמיד לוקח את המילה שאחריו.** סדר הארגומנטים: release, chart, ואז flags. כל קובץ values מקבל `-f` משלו, בסדר של `valueFiles` ב-Argo.
`<RELEASE>` = שם ה-Application/release (`trident`, `postgres`, `redis`). `<CHART_DIR>` = תיקיית ה-chart. ה-values יושבים ב-clone של repo ה-gitops (לא ב-repo ה-templates): הרץ מתוך תיקיית ה-values או כתוב נתיבים מלאים.

**איך מוודאים:** exit code 0 והקובץ `/tmp/render.yaml` לא ריק. אחר כך `grep -c` (ראו למטה).

:::caution[מלכודת · קרה בתרגול]
`helm template trident -f charts/x …` נכשל 3 פעמים: `-f` בלע את נתיב ה-chart והתייחס אליו כאל קובץ values. וה-values חיפשו בתיקייה הלא נכונה.
`Error: open …: no such file or directory` = **שגיאת נתיב**, לא YAML. בדוק `ls` על כל נתיב ב-`-f`, ושה-chart הוא המילה הראשונה אחרי ה-release.
בגרסה אחרת של אותה טעות: `Error: non-absolute URLs should be in form of repo_name/path_to_chart, got: trident` = ה-chart נבלע.
עוד שני באגים מאותו ניסיון: `-f $values/...` (`$values` קיים רק ב-Argo, ב-bash הוא ריק) ו-`.` תועה שהפך לשם ה-release.
:::

### שגיאות נפוצות בפקודה עצמה

| מה כתבת | מה Helm אומר |
|---|---|
| `helm template trident <CHART_DIR> .` | `expected at most two arguments, unexpected arguments: .` |
| `helm template . <CHART_DIR>` | `release name ".": invalid release name` |
| `helm template trident .` בתיקייה בלי chart | `Chart.yaml file is missing` |
| `-f` לפני ה-chart (`helm template trident -f <CHART_DIR>`) | `non-absolute URLs should be in form of repo_name/path_to_chart, got: trident` |
| נתיב values שגוי | `Error: open <FILE>: no such file or directory` |
| בלי `-n <NS>` | עובד, אבל `namespace: "default"` ב-render |

:::tip[עיקרון]
`namespace: "default"` ב-render מקומי בלי `-n` הוא **לא באג**. ב-Argo ה-namespace מגיע מ-`destination.namespace`. הוסף `-n <NS>` כדי שה-render ידמה את האמת.
:::

## לבודד: `--set defaultImageTag=probe`

ב-TRIDENT הקובץ `versions/<ENV>.yaml` מכיל `defaultImageTag: ""` עד שה-CI כותב בו את ה-candidate. תג ריק גורם ל-`YAML parse error` ב-render.
כדי לדעת אם הבעיה היא התג או משהו אחר, הוסף ערך זמני בשורת הפקודה:

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml -f <ENV>.yaml -f versions/<ENV>.yaml \
  --set defaultImageTag=probe > /dev/null; echo "exit=$?"
```

אם עם `probe` ה-exit הוא 0 ובלי — 1: הבעיה היא התג הריק (במקרה כזה זה צפוי, ה-CI ימלא אותו). אחרת הבעיה במקום אחר.
זו שיטת **isolation**: משנים דבר אחד ורואים מה זז. למספרי גרסה כמו `1.20` השתמש ב-`--set-string`, אחרת Helm הופך אותם למספר.

## `-s` — לרנדר template אחד, ולמצוא בתוך ה-render

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> -s templates/networking/ingress.yml
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> | grep '# Source:' | sort -u
helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> | grep -n -A3 'kind: StatefulSet'
```

`-s` = `--show-only`, והנתיב יחסי ל-chart. השורה השנייה מראה אילו template files קיימים (אז יודעים מה לתת ל-`-s`). השלישית מראה את תחילת האובייקט עם מספרי שורות.

**איך מוודאים:** יוצא רק המסמך שביקשת; ללא `# Source:` ריק.

## `grep -c` במקום להסתכל על 400 שורות

```bash title="runs on: VM"
R=/tmp/render.yaml
grep -c 'kind: Deployment' "$R"                 # TRIDENT: 3
grep -c 'image: .*:<CANDIDATE>' "$R"            # every image carries the tag
grep -c 'image: /' "$R"                         # must be 0 (empty imageRepository)
grep -n 'host: <HOST>' "$R"                     # the Ingress host
```

**איך מוודאים:** כל ספירה מתאימה למספר שציפית לו. זה הופך "נראה בסדר" לתוצאה שאפשר לבדוק. לסקריפט מלא של בדיקות: [בדיקות ל-values](../testing/) ו-[verify-script](../../bash/verify-script/).

## לקרוא chart: show values, readme, pull

```bash title="runs on: VM"
helm show values <CHART_DIR> | less              # every settable key, with comments
helm show readme <CHART_DIR> | less              # the chart's documentation
helm pull redis --repo https://groundhog2k.github.io/helm-charts/ --version 2.4.7 --untar --untardir charts
# OCI chart: helm pull oci://registry.nixys.ru/nuc/nxs-universal-chart --version 3.2.1 --untar --untardir charts
helm lint <CHART_DIR> -f base.yaml
```

ב-`less`: `/` ואז שם מפתח מחפש; `n` הבא; `q` יציאה. עוד על קריאת ה-API: [values](../values/#לקרוא-chart-api).
`helm lint` בודק מבנה בסיסי בלבד ולא תמיד נכשל כשצריך — ראו [lint ≠ template](../testing/#lint--template).

## ארגז כלים: `--set-string`, `dependency list`, `diff` בין סביבות

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -f <FILE> --set-string image.tag=1.20      # stays a string, not the number 1.2
helm show values <CHART_DIR> | grep -n -A5 storage                             # find a key and its comment
helm lint <CHART_DIR> -f <FILE> -f <FILE>                                      # structure only, see testing page
helm dependency list <CHART_DIR>                                               # sub-charts (WARNING: no dependencies = none)
diff <(helm template <RELEASE> <CHART_DIR> -f base.yaml -f dev.yaml) <(helm template <RELEASE> <CHART_DIR> -f base.yaml -f staging.yaml)
```

ה-`diff` בין שני render-ים הוא הדרך המהירה לראות מה באמת שונה בין סביבות. שורה ריקה = אין הבדל.

**איך מוודאים:** `diff` מדפיס רק את השורות שהשתנו (למשל `storage: 1Gi` מול `2Gi`).

## values layering: מי מנצח

Argo (וגם `-f` מקומי) ממזג את הקבצים לפי הסדר. ל-TRIDENT: `base.yaml → <ENV>.yaml → versions/<ENV>.yaml`.

| סוג ערך | התנהגות | דוגמה |
|---|---|---|
| scalar (טקסט/מספר) | הקובץ המאוחר **מחליף** | `TRIDENT_ENV: ""` ב-base, `"dev"` ב-dev |
| map | **מתמזג** מפתח אחרי מפתח | `podLabels`: 2 מפתחות ב-base + 1 ב-dev = 3 |
| list | **מוחלף** כולו | `containers: [...]` ב-dev מוחק את כל ה-containers של base |

```bash title="runs on: VM"
# the list trap, measured: signal-processor overridden in dev.yaml without probes
grep -c 'livenessProbe' /tmp/render.yaml          # 2 instead of 3
```

כשאתה דורס רשימה (`containers`, `extraVolumes`, `hosts`), חייב להעתיק את **כל** האיברים, כולל probes ו-resources. מי שרוצה רק להוסיף לרשימה — לא יכול; צריך להגדיר אותה מחדש.

:::caution[מלכודת · קרה בתרגול]
בדיקת ה-layering עברה: ב-redis, `podLabels` ב-dev הוסיף מפתח אחד לשניים של base והתוצאה הייתה 3 מפתחות. זה הסימן ש-map מתמזג.
:::

## fullnameOverride: איך האפליקציה מוצאת את ה-Service

שם ה-Service ב-chart רגיל הוא **release + שם ה-chart**, אלא אם כן `fullnameOverride` קבוע. ה-ConfigMap של האפליקציה מכיל שם קבוע (`REDIS_HOST=redis`, `POSTGRES_HOST=postgres`), אז השם חייב להתאים.

```bash title="runs on: VM"
helm template redis <CHART_DIR> --set fullnameOverride=redis | grep -E '^  name:'
helm template cache <CHART_DIR> | grep -E '^  name:'
# first: redis, redis-headless. second: cache-redis-...
# without the override, release "redis" also gives "redis" (release name already contains the chart name)
```

שני חיצים שלא מערבבים: **client → Service** לפי **שם** (DNS). **Service → Pods** לפי **selector/labels**.

## YAML ב-values: מלכודות

כל אלה קרו, וכולן נתפסות בהרצת render אחרי כל עריכה:

| טעות | מה קורה |
|---|---|
| `mountPath:/run/secrets/trident` (בלי רווח אחרי `:`) | scalar אחד במקום key/value. השגיאה לפעמים מופיעה בשורה **הבאה** |
| `Secret:` במקום `secret:` (או `ConfigMap`) | המפתח נשאר בלי משמעות; ה-chart מתעלם או נכשל |
| `imageRepository` ב-col 0 במקום תחת `generic:` | render עובר, אבל `image: /ingest-api:...` — `.Values.generic.imageRepository` ריק |
| `- name:` ב-`Chart.yaml` | `cannot load Chart.yaml` |

הבדיקה של הטעות השלישית היא `grep -c 'image: /' "$R"` — חייב להיות 0.

### `YAML parse error ... line N`

המספר הוא שורה ב-**הטקסט המרונדר**, לא ב-template ולא ב-values שלך. Helm עובד בשני שלבים: (1) החלפת טקסט, (2) parse של ה-YAML שהתקבל. השגיאה מגיעה משלב 2.

```text title="example: render error"
Error: YAML parse error on nxs-universal-chart/templates/workloads/deployment.yml: error converting YAML to JSON: yaml: line 44: mapping values are not allowed in this context
```

- אל תסמוך על מספרי שורות מ-`--debug` — בפועל הם לא תאמו את הפלט.
- שיטה אמינה: **differential** (מה השתנה מאז ה-render האחרון שעבד?) ו-**isolation** (`--set defaultImageTag=probe`, `-s` על template אחד, הורדת קובץ values אחד).
- המקרה האמיתי שחזר פעמיים (שורה 44, ואחר כך 47 ב-staging/prod): `defaultImageTag` ריק. עם `--set defaultImageTag=probe` השגיאה נעלמה.
- טבלת סימפטומים מלאה: [debugging/symptoms](../../debugging/symptoms/).

## מחוץ ל-Helm: `$values`

`$values/apps/...` ב-`valueFiles` של Application הוא שם שמוגדר על ידי source עם `ref: values`. בצד Argo זה נכון, ב-bash זה ריק. ראו [argocd/applications](../../argocd/applications/).
