---
title: גישה למבחן — התמונה המלאה
description: כל גישת העבודה במבחן במסך אחד, עם שלבים, תקציב זמן מוצע, חמשת הכללים ומפת העמודים בטאב.
sidebar:
  order: 1
  label: סקירה
---

:::note[בקצרה]
הטאב הזה הוא **הליך**, לא חומר עזר: מה לקרוא קודם, באיזה סדר לבנות, מה מוודאים בכל שלב, ומה עושים כשנתקעים או כשהזמן נגמר.
חומר העזר (פקודות, YAML, טבלאות) נמצא בטאבים האחרים, וכאן יש רק לינקים אליו.
פרויקט המבחן אינו TRIDENT אלא דומה לו בשמות אחרים: הכול כאן כתוב עם placeholders, ו-TRIDENT הוא הדוגמה.
:::

## אם לא קוראים כלום אחר

העשר שורות שמצילות מבחן. כל השאר בעמוד הוא הרחבה שלהן.

1. קרא הכול **לפני שמקלידים** (15 דקות): `grep` ל-`TODO`, `exit 1`, `repoURL: ""`, ומלא את טבלת הערכים. [first-15-minutes](../first-15-minutes/)
2. `bash preflight.sh` בלי `FAIL`, ו-`source env.sh` **בכל terminal חדש**. [environment-setup](../environment-setup/)
3. Git הוא הדרך היחידה לשנות את הקלאסטר: לא `kubectl edit`, לא `helm install`.
4. הוכח כל שכבה לפני הבאה: runner, CI, image ב-GitLab Container Registry, commit ב-gitops, render, Argo, `/info`.
5. `helm template` מקומי לפני כל push של values (אחרי `git pull`).
6. שגיאה: קרא את **השורה האחרונה**, שתי דקות, ושאל "קוד או סביבה". לא מוסיפים סיבות שהטקסט לא תומך בהן.
7. Secret לכל namespace, mount ב-`/run/secrets/<APP_DIR>` ולא ב-`/run/secrets`, ו-tag אף פעם לא `latest`.
8. דחוף את כל ה-branches **וגם** את ה-tags. מה שלא נדחף לא קיים עבור Argo.
9. קודם כל ה-MUST ירוקים, אחר כך SHOULD, ורק אז יצירתיות (עד 15% מהזמן).
10. 20 דקות אחרונות: אין `TODO`, `exit 1` או secret ב-Git, ו-`verify.sh && cleanup.sh && verify-clean.sh && cleanup.sh && verify-clean.sh`.

**איך מוודאים:** אתה יכול להקריא את עשר השורות בלי להסתכל, ולהצביע על העמוד שמרחיב כל אחת.

## השלבים ותקציב הזמן

תקציב **מוצע** (הערכה, לא מדידה): האחוזים הם מזמן המבחן הכולל, כך שאין צורך לדעת כמה שעות יש. אחרי חזרה מתוזמנת מחליפים אותם במספרים שלך ([time-and-triage](../time-and-triage/)).

| # | שלב | % מוצע | הוא נגמר כש… | עמוד |
|---|---|---|---|---|
| 1 | קריאה ומיפוי | 6% | טבלת הערכים מלאה ויש רשימת TODO לפי קובץ | [first-15-minutes](../first-15-minutes/) |
| 2 | סביבה: `preflight.sh`, `env.sh` | 4% | `preflight: PASS` | [environment-setup](../environment-setup/) |
| 3 | repos, tokens, variables, runner | 8% | job בדיקה ירוק על ה-runner | [order-of-work](../order-of-work/) |
| 4 | CI: build, publish, promote | 14% | images ב-GitLab Container Registry ו-commit ב-gitops | [order-of-work](../order-of-work/) |
| 5 | values ו-render של chart | 16% | `helm template` עובר לכל env | [order-of-work](../order-of-work/) |
| 6 | Secrets, Applications, root | 12% | כל ה-Applications `Synced` | [order-of-work](../order-of-work/) |
| 7 | envs מאומתים, observability | 12% | `/info` מחזיר את ה-candidate הנכון | [order-of-work](../order-of-work/) |
| 8 | verify, cleanup, idempotency | 8% | הרצף הכפול עובר | [last-20-minutes](../last-20-minutes/) |
| 9 | extras (עד 15%) וחוצץ לתקלות (5%) | 20% | רק אחרי שכל ה-MUST ירוקים | [creativity](../creativity/) |

סך הכול 100%, ואותם מספרים מפורטים ב-[time-and-triage](../time-and-triage/). שורה 9 היא גם מרווח ביטחון: אם שלב מוקדם נמרח, היא הראשונה שמוותרים עליה.

**איך מוודאים:** בכל שלב יש "gate" שאפשר להריץ ולקבל כן או לא, לא תחושה. את ה-gates ואת הכשל הסביר של כל שלב מפרט [order-of-work](../order-of-work/).

## חמשת הכללים

| # | כלל | שורה אחת | פירוט |
|---|---|---|---|
| 1 | Git is the only way to change the cluster | תיקון חי מתבטל ב-`selfHeal`, ואם הוא לא מתבטל הוא עדיין לא ב-Git ולכן לא שרד. | [argocd/operate](../../argocd/operate/#לעולם-לא-מתקנים-live-מתקנים-ב-git) |
| 2 | verify each layer before the next | באג בשכבה 2 שמתגלה בשכבה 6 עולה פי עשרה. | [verify/overview](../../verify/overview/#הסולם) |
| 3 | render before push | `helm template` עם אותם קבצי values ש-Argo יקרא, מקומית ובשניות. | [helm/testing](../../helm/testing/#בדיקה-בסיסית-helm-template--grep--q) |
| 4 | read the error bottom-up | השגיאה האמיתית היא השורה האחרונה; כל מה שמעליה עוטף אותה. | [debugging/overview](../../debugging/overview/) |
| 5 | code vs environment | אם הקוד לא השתנה והכשל התחיל, זו סביבה: DNS, daemon, runner, namespace. | [debugging/env-cards](../../debugging/env-cards/) |

**איך מוודאים:** בכל תקלה אתה יכול לומר איזה כלל מהחמישה היא מפרה, לפני שאתה מקליד תיקון.

:::tip[עיקרון]
מבחן נכשל בדרך כלל בהליך ולא בידע. הליך כתוב מנצח זיכרון בלחץ, ולכן העמודים כאן הם רשימות ו-gates ולא הסברים.
:::

## איזה עמוד מתי

| הרגע במבחן | העמוד |
|---|---|
| דקות 0–15, לפני שמקלידים | [overview](./) (אתה כאן) ו-[first-15-minutes](../first-15-minutes/) |
| דקות 15–25, לפני כל pipeline | [environment-setup](../environment-setup/) |
| בכל פעם ששואלים "מה עכשיו" | [order-of-work](../order-of-work/) |
| לפני כל station: מה עלול להישבר | [prevent-known-problems](../prevent-known-problems/) |
| משהו אדום יותר משתי דקות | [when-stuck](../when-stuck/) |
| אתה מפגר או צריך להחליט מה לוותר | [time-and-triage](../time-and-triage/) |
| 20 הדקות האחרונות | [last-20-minutes](../last-20-minutes/) |
| כל ה-MUST ירוקים ויש זמן | [creativity](../creativity/) |
| ערב לפני: תרגול עצמי | [drill](../drill/) ו-[time-and-triage](../time-and-triage/) (חזרה מתוזמנת) |

אם אין זמן לקרוא: [שליפה מהירה](../../quick/overview/) לפקודה, ו-[התמונה הגדולה](../../architecture/overview/) להבנת הזרימה.

**איך מוודאים:** בכל רגע אתה יודע איזה עמוד פתוח אצלך ולמה, ואף פעם לא קורא את הטאב מההתחלה לסוף במהלך המבחן.
