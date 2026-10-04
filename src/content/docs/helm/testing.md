---
title: בדיקות ל-values ול-chart
description: איך בודקים שערכים מוזרקים נכנסים ל-render, עם grep, required, values.schema.json ו-job ב-CI, ואיך בונים chart מינימלי מאפס.
sidebar:
  order: 3
---

:::note[בקצרה]
"בדיקות שמאמתות values שמוזרקים" בדרך כלל אומר: מריצים `helm template` עם values נתונים, ובודקים בקוד (exit code) שהתוצאה מכילה את מה שצריך — ושכשחסר ערך חובה הכלי נכשל.
אין harness מוכן בחומרי הקורס, ולכן כאן שיטה כללית שנבדקה על helm v3.21: grep, negative self-test, `required`, `values.schema.json`, בדיקה מבנית עם `jq`, ו-job ב-CI.
אם בבחינה מוגדר פורמט מסוים — שאל את המנחה. אחרת השיטה הזאת מכסה את הצורך.
:::

## chart מינימלי מאפס

שלושה קבצים מספיקים לתרגל הכול בלי להיגע ב-chart של הפרויקט.

```yaml title="file: mini/Chart.yaml"
apiVersion: v2
name: mini
version: 0.1.0
appVersion: "1.0.0"
```

```yaml title="file: mini/values.yaml"
message: hello
replicas: 1
image:
  repository: nginx
  tag: ""
```

```yaml title="file: mini/templates/configmap.yaml"
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-cfg
data:
  message: {{ .Values.message | quote }}
  image: {{ printf "%s:%s" .Values.image.repository .Values.image.tag | quote }}
```

- `apiVersion: v2` הוא פורמט ה-`Chart.yaml` של Helm 3 (לא "גרסת Helm").
- `version` = גרסת ה-chart עצמו. `appVersion` = גרסת האפליקציה שהוא מתקין (מידע בלבד).
- `Chart.yaml` הוא mapping. שורה שמתחילה ב-`- name:` שוברת אותו: `cannot load Chart.yaml`.

```bash title="runs on: VM"
helm lint mini
helm template r mini --set-string image.tag=1.2
```

**איך מוודאים:** ה-render מציג ConfigMap בשם `r-cfg` עם `message: "hello"` ו-`image: "nginx:1.2"`.
ב-templates של Argo לא משתמשים ב-`.Release.Name` בשמות שהאפליקציה תלויה בהם — שם ה-release ב-Argo שונה מזה שבהרצה מקומית. כאן זה רק דוגמת תרגול.

## בדיקה בסיסית: `helm template | grep -q`

```bash title="runs on: VM"
helm template r mini --set-string image.tag=1.2 | grep -q 'message: "hello"' && echo PASS || echo FAIL
helm template r mini --set-string image.tag=1.2 | grep -q 'image: "nginx:1.2"' && echo PASS || echo FAIL
```

**איך מוודאים:** `PASS` פעמיים. הבדיקה הזאת היא מה ש"בדיקת values" אומרת: ערך הוזרק, ולכן הוא מופיע ב-render.

### negative self-test: להשחית, לראות FAIL, להחזיר

בדיקה שלא יכולה להיכשל גרועה מהיעדר בדיקה.

```bash title="runs on: VM"
cp mini/values.yaml /tmp/values.bak
sed -i 's/^message: hello/message: bye/' mini/values.yaml
helm template r mini --set-string image.tag=1.2 | grep -q 'message: "hello"' && echo PASS || echo FAIL   # must print FAIL
cp /tmp/values.bak mini/values.yaml
helm template r mini --set-string image.tag=1.2 | grep -q 'message: "hello"' && echo PASS || echo FAIL   # must print PASS
```

**איך מוודאים:** FAIL אחרי ההשחתה, PASS אחרי השחזור. רק אז סומכים על הבדיקה.

:::caution[מלכודת · קרה בתרגול]
`required` בודק **נוכחות** ערך; `grep` בודק **תוכן**. אלה שתי בדיקות שונות — ערך יכול להיות נוכח ושגוי. צריך את שתיהן.
:::

### לרנדר לקובץ פעם אחת

כש-`helm template | grep -q` נכשל, אי אפשר לדעת אם ה-render נכשל או שהערך חסר. לכן ב-script רינדור לקובץ עם הודעה, ואז כמה `grep`:

```bash title="runs on: VM"
helm template r mini --set-string image.tag=1.2 > /tmp/render.yaml || { echo "render failed"; exit 1; }
grep -q 'message: "hello"' /tmp/render.yaml && echo PASS || echo FAIL
```

**איך מוודאים:** render שנכשל נעצר עם `render failed`; render תקין ממשיך לבדיקות.

## `grep -c` ו-`-F`: ספירות ומחרוזות מדויקות

```bash title="runs on: VM"
[ "$(grep -c 'kind: ConfigMap' /tmp/render.yaml)" -eq 1 ] && echo PASS || echo FAIL
grep -qF 'image: "nginx:1.2"' /tmp/render.yaml && echo PASS || echo FAIL
```

`-F` מתייחס למחרוזת כטקסט רגיל (נקודות לא הופכות ל-regex). צרור פונקציות לשימוש חוזר: [bash/verify-script](../../bash/verify-script/).

## `required`: להכשיל render כשערך חסר

```yaml title="file: mini/templates/configmap.yaml (changed line)"
  image: {{ printf "%s:%s" .Values.image.repository (required "image.tag is required" .Values.image.tag) | quote }}
```

```bash title="runs on: VM"
helm template r mini ; echo "exit=$?"
helm lint mini ; echo "exit=$?"
```

הפלט שנבדק:

```text title="example: actual output"
Error: execution error at (mini/templates/configmap.yaml:7:53): image.tag is required
exit=1

engine.go:214: [INFO] Missing required value: image.tag is required
==> Linting mini
1 chart(s) linted, 0 chart(s) failed
exit=0
```

## lint ≠ template

`helm lint` מדווח על ערך חובה חסר רק כ-`[INFO]` ומסיים עם exit 0. `helm template` נכשל עם exit 1.

| בדיקה | `required` חסר | `}}` חסר / YAML שבור | טיפוס שגוי (`replicas: "abc"`) |
|---|---|---|---|
| `helm lint` | `[INFO]`, exit 0 | נכשל | עובר |
| `helm template` | exit 1 | נכשל | עובר |
| `values.schema.json` | נכשל בשניהם | — | נכשל בשניהם |

:::tip[עיקרון]
ב-CI אל תסתפק ב-`helm lint`. הרץ `helm template` על ה-values האמיתיים של כל סביבה — זה מה ש-Argo יריץ.
:::

## values.schema.json

קובץ ב-root של ה-chart. Helm בודק אליו את ה-values (המשולבים) ב-`template`, `lint` ו-`install`.

```json title="file: mini/values.schema.json"
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["message", "image"],
  "properties": {
    "message": { "type": "string", "minLength": 1 },
    "replicas": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["tag"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

```bash title="runs on: VM"
helm template r mini ; echo "exit=$?"
helm lint mini ; echo "exit=$?"
helm template r mini --set-string image.tag=1.2 > /dev/null ; echo "exit=$?"
```

**איך מוודאים:** בלי tag: `values don't meet the specifications of the schema(s)`, `at '/image/tag': minLength: got 0, want 1`, exit 1 בשתי הפקודות (גם `lint`). עם tag: exit 0.

:::caution[מלכודת]
`--set image.tag=1` (מספר שלם) או `=true` הופכים למספר/boolean, ו-schema עם `"type": "string"` ייכשל: `got number, want string` (נבדק; `1.20` נשאר מחרוזת, כי Helm ממיר רק מספרים שלמים, `true`/`false` ו-`null`). לתגיות השתמש תמיד ב-`--set-string`, או בקובץ values עם מרכאות.
:::

## בדיקה מבנית: `kubectl create --dry-run=client` + `jq`

אין `yq` ב-VM. כדי לבדוק **מבנה** (שדה בתוך אובייקט) ולא רק טקסט:

```bash title="runs on: VM"
helm template r mini --set-string image.tag=1.2 \
  | kubectl create --dry-run=client -f - -o json \
  | jq -e '.data.image == "nginx:1.2"'
echo "exit=$?"
```

**איך מוודאים:** מדפיס `true` ו-`exit=0`; אם הערך שונה — `false` ו-`exit=1` (`-e` קובע את ה-exit לפי התוצאה). ל-render עם כמה אובייקטים, `kubectl` מדפיס כמה אובייקטי JSON ברצף; `jq -s` אוסף אותם:

```bash title="runs on: VM"
helm template trident <CHART_DIR> -n <NS> -f base.yaml -f <ENV>.yaml -f versions/<ENV>.yaml \
  | kubectl create --dry-run=client -f - -o json \
  | jq -s -r '.[] | select(.kind=="Deployment") | .metadata.name + " " + .spec.template.spec.containers[0].image'
```

פלט: שורה לכל Deployment עם ה-image המלא, כולל ה-`<CANDIDATE>`. ללא גישה ל-cluster זה עובד כי `--dry-run=client` לא פונה לשרת.

## job ב-CI: lint + template + assertions

```yaml title="file: .gitlab-ci.yml (excerpt)"
test-values:
  stage: test
  script:
    - helm lint <CHART_DIR> -f base.yaml
    - |
      for ENV in dev staging prod; do
        helm template trident <CHART_DIR> -n "trident-$ENV" \
          -f base.yaml -f "$ENV.yaml" -f "versions/$ENV.yaml" --set-string defaultImageTag=ci > "render-$ENV.yaml" || exit 1
        grep -qF "TRIDENT_ENV: \"$ENV\"" "render-$ENV.yaml" || { echo "FAIL $ENV: TRIDENT_ENV"; exit 1; }
        [ "$(grep -c 'image: /' "render-$ENV.yaml")" -eq 0 ] || { echo "FAIL $ENV: empty imageRepository"; exit 1; }
      done
  artifacts:
    paths: ["render-*.yaml"]
```

- ב-GitLab, `- |` פותח block scalar; בתוכו bash רגיל. ה-job נכשל ברגע ש-`exit 1` רץ.
- `--set-string defaultImageTag=ci` כי ב-`versions/<ENV>.yaml` התג ריק עד שה-CI כותב אותו.
- מבנה job ו-`rules`: [ci/patterns](../../ci/patterns/).

## מי נכשל ראשון? תרגול של 10 דקות

1. שבור `}}` ב-template: מי נכשל, `lint` או `template`?
2. מחק את `tag` מ-values עם `required` בלבד: `lint` ירוק, `template` אדום.
3. הוסף `values.schema.json` — עכשיו שניהם אדומים.
4. `replicas: "abc"` בלי schema: שניהם ירוקים (רק `kubectl --dry-run` או schema תופסים).

כל טעות כזאת מתגלה רק אם מריצים `helm template` — לא מסתפקים בעין.
