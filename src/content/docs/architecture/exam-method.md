---
title: שיטת עבודה בבחינה
description: איך קוראים את החוזה לפני שמקלידים, סדר העבודה, הוכחת כל שכבה ושיחת design review.
sidebar:
  order: 4
---

:::note[בקצרה]
הבחינה נכשלת בדרך כלל בתהליך, לא בידע. העמוד הזה הוא ההליך: קוראים הכול, בונים בסדר, מוכיחים כל שכבה, לא מתקנים חי, ומתעדים.
:::

## לקרוא את החוזה (20–30 דקות, בלי להקליד)

מחפשים ורושמים על דף:

```bash title="runs on: VM"
grep -rnE 'MUST|SHOULD|TODO|exit 1|STRETCH' <FILE>
grep -rn 'repoURL: ""' <FILE>
```

| מה רושמים | למה |
|---|---|
| כל `MUST` ו-`SHOULD` | הציון נגזר מהם; SHOULD אחרון |
| כל `TODO` / `exit 1` | אלה העבודה שלך: `TODO` = החלטה, `exit 1` = לא גמור בכוונה |
| כל ה-repos, branches, tags | מי קורא, מי כותב |
| כל credential | לפני הקלדה: [מפת credentials](../credentials/) |
| שמות קבועים (namespaces, Secrets, hosts, StorageClass) | טעות שם = כשל שקט |

**איך מוודאים:** יש לך דף עם זרימה ועם טבלת credentials, ורשימת כל ה-TODO.

## סדר העבודה

1. runner + variables
2. repos + branches
3. templates מיובאים ומתויגים
4. CI ירוק עד ה-commit ל-gitops
5. bootstrap של Secrets
6. values
7. Argo Applications
8. root
9. DEV עובד
10. שאר ה-envs
11. observability
12. SHOULD
13. cleanup

## כללים

- **להוכיח כל שכבה לפני שבונים עליה.** עולים לפי [סולם האימות](../../verify/overview/). תמיד `helm template` מקומי לפני push של values.
- **לא מתקנים חי.** אם התחלת להקליד `kubectl edit` על אובייקט ש-Argo מנהל, עצור: התיקון נעשה ב-Git.
- **יומן:** פקודה + ראיה (פלט) לכל שלב. אחרי כשל: מה ראית, מה שינית, מה השתנה.
- **design review:** תהיה מוכן להסביר *למה* כל repo, token ובחירה קיימים, לא רק להראות ירוק.
- **להיכנס ל-debugging עם פחות נעלמים:** דחוף שינויים מקומיים לפני bootstrap, כדי לא לזהם את האבחון. שיטת הקריאה: [debugging](../../debugging/overview/).

## כשלי תהליך נפוצים

| כשל | בדיקה |
|---|---|
| **Delta on copy**: הדבקת קוד ממקור אחר בלי להחליף שמות | טבלת החלפות (שמות, פורטים, hosts, namespace) ואז `grep -rn 'old-name' .` |
| **Placeholder שנשאר** (`TODO`, `repoURL: ""`) | `grep -rnE 'TODO\|repoURL: ""' <FILE>` לפני submit |
| **עצירה ב-PASS**: הסקריפט עבר, ההתנהגות לא נבדקה | `Synced + Healthy` לא מוכיח; בדוק `/info` |
| **תוצר לא הוגש** | רשימת deliverables מול הקבצים |
| **CRLF / רווח אחרי `\`** | `grep -nP ' +$' <FILE>`, `bash -n <FILE>` |

:::caution[מלכודת · קרה בתרגול]
רווח אחרי `\` (המשך שורה) פגע ב-3 פעמים באותה session. לפני commit: `grep -nP ' +$' <FILE>`.
:::

:::tip[עיקרון]
כשל נראה כמו "חוסר ידע" אבל הסיבה בדרך כלל היא היעדר הליך. הליך כתוב מנצח זיכרון בלחץ.
:::

המשך: [התמונה הגדולה](../overview/) · [סימפטומים](../../debugging/symptoms/) · [cleanup וצ'קליסט](../../verify/cleanup/).
