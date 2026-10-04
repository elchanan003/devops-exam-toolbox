---
title: שיטת ה-debugging
description: איך קוראים שגיאה שכבתית, מגדירים כמה רחוק זה הגיע, ומפרידים בין קוד לסביבה, בלי לנחש.
sidebar:
  order: 1
---

:::note[בקצרה]
שיטת קריאה, לא רשימת תקלות. כשמופיעה שגיאה: קרא אותה מלמטה למעלה, קבע כמה רחוק התהליך הגיע, השווה למה שעובד, ושנה משתנה אחד.
טבלת תקלות לפי שכבה: [symptoms](../symptoms/). באגי סביבה ידועים: [env-cards](../env-cards/).
:::

## עקרונות

| עיקרון | מה עושים |
|---|---|
| **Onion: קוראים מלמטה** | שגיאה עוטפת שגיאה. הסיבה האמיתית היא **השורה האחרונה** |
| **כמה רחוק זה הגיע?** | איזה שלב עבר (clone, render, apply, pull) לפני הכשל |
| **לא מוסיפים סיבות שהטקסט לא תומך בהן** | `grep -iE 'denied\|403\|unauthorized'` על ההודעה. אין? זה לא credentials |
| **Differential** | עובד ב-A ולא ב-B: הסיבה במה שמבדיל ביניהם (namespace, קובץ values, token, branch) |
| **Isolation** | משנים משתנה אחד ורואים אם השגיאה נעלמת |
| **קוד או סביבה?** | ראה למטה |
| **איזה run אני קורא?** | בדוק את ה-candidate: branch + תאריך |
| **Timestamp לפני אמון בהודעה** | `finishedAt` מול `date -u`: הודעה בת 36 דקות אינה הכשל הנוכחי |
| **אין לוגים = לא התחיל** | `kubectl describe pod` ו-Events, לא `logs` |
| **לפני `delete`: מי מחזיק את הנתונים?** | והאם ה-controller כבר מטפל? (Deployment מחליף Pods לבד; StatefulSet לא מחליף Pod שבור) |
| **`Synced`/`Healthy` ≠ עובד** | בודקים `/info`: [verify](../../verify/overview/) |
| **הפלט של git עצמו** | `merge --ff-only` נכשל? הסיבה בשורה 2 של הפלט |
| **Pre-flight** | להריץ מקומית מה ש-Argo/CI ירוץ, ולדעת אילו פרמטרים השמטת |

## קוד או סביבה

| הודעה | סיווג | למה |
|---|---|---|
| `AssertionError` ב-unittest | קוד | הלוגיקה נכשלה |
| promote 403 **אחרי** commit מוצלח | credential / סביבה | העבודה עצמה הצליחה, ההרשאה לא |
| Dockerfile חסר | קוד | קובץ שלא קיים ב-repo |
| `Cannot connect to the Docker daemon` | סביבה | ה-daemon לא רץ / אין הרשאה |
| `Error: open <FILE>: no such file or directory` | נתיב | שגיאת נתיב, לא YAML |

באגי ה-DNS וה-`blob unknown` ב-build היו סביבה, לא קוד: [env-cards](../env-cards/).

## דוגמה: פירוק שגיאה שכבתית

```text title="error text (as Argo shows it)"
ComparisonError: Failed to load target state: failed to generate manifest for source 1 of 4:
rpc error: ... helm template . --name-template trident --namespace trident-staging
--values .../base.yaml --values .../staging.yaml --values .../versions/staging.yaml ...:
Error: YAML parse error on nxs-universal-chart/templates/...: error converting YAML to JSON:
yaml: line 47: ...
```

| שכבה (מבחוץ פנימה) | מה היא אומרת |
|---|---|
| `ComparisonError` | Argo לא הצליח להשוות |
| `source 1 of 4` | המקור הראשון (ה-chart הראשי) |
| `helm template ...` + קובצי values | זו הפקודה שנכשלה, ואלה הקבצים |
| `YAML parse error ... line 47` | **הסיבה:** ה-YAML **המרונדר** לא תקין (השורה היא ב-output, לא ב-template) |

אין כאן `denied`/`403`, אז זו לא בעיית הרשאה. הצעד הבא: differential. DEV עובד ו-staging לא, אותו chart, אז ההבדל בקבצי values. isolation:

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -f <FILE> -f <FILE> -f <FILE> --set defaultImageTag=probe
```

אם הרינדור עובר עם `probe`, הסיבה היא ש-`defaultImageTag` ריק: אף אחד לא עשה promote ל-staging. התיקון הוא promote, לא עריכת chart.

:::caution[מלכודת · קרה בתרגול]
`--debug` של `helm template` נתן מספרי שורות שלא תאמו את הפלט, ולא עזר. השתמש ב-differential וב-isolation.
:::

:::caution[מלכודת · קרה בתרגול]
קראנו את ה-job של ה-pipeline הלא נכון: `main-20260928` היה run ישן. תמיד בדוק ב-`CANDIDATE` את ה-branch והתאריך לפני שקוראים לוג.
:::

## Pre-flight: לדעת מה השמטת

מרנדרים מקומית מה ש-Argo ירנדר, עם tag אמיתי. מה שונה מ-Argo: `$values` לא קיים ב-bash (נתיבים אמיתיים), `-f` חוזר לכל קובץ וקורא את **המילה הבאה** (`-f charts/x` הופך את ה-chart לקובץ values), ו-`namespace` ב-render לא באג אם לא העברת `-n`.

:::caution[מלכודת · קרה בתרגול]
`operationState.message` של 36 דקות נקרא כאילו הוא עדכני. לפני שמגיבים להודעה של Argo: `finishedAt` מול `date -u`.
:::

:::tip[עיקרון]
קרא מה כתוב, לא מה שניחשת. אם ההודעה לא מזכירה הרשאה, אל תתחיל מהרשאות.
:::

המשך: [טבלת הסימפטומים](../symptoms/) · [סולם האימות](../../verify/overview/).
