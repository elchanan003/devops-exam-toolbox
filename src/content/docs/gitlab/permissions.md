---
title: הרשאות role מול scope
description: שתי שכבות עצמאיות שחייבות שתיהן לאפשר, חברים ב-project, protected branches ו-least privilege.
sidebar:
  order: 3
---

:::note[בקצרה]
**role** = מה ה-user מורשה ב-project (מוגדר ב-Members). **scope** = מה ה-token מורשה (מוגדר ביצירת ה-token).
שתי שכבות עצמאיות: הפעולה עוברת רק אם **שתיהן** מתירות. דף זה הוא הכלי לאבחון `403` / `Access denied`.
:::

## role מול scope

| | role | scope |
|---|---|---|
| נקבע איפה | `Project → Manage → Members` | ביצירת ה-token |
| נקבע לפי | לכל project (ולכל group) | לכל token |
| מי מחזיק | user / service account | token (ל-deploy token אין role) |
| טעות נפוצה | "נשנה את ה-scope ל-Reporter" (זה role) | "role גבוה יפתור" (scope חוסם) |

היעילות = role **וגם** scope, לא "הגבוה מביניהם". דוגמאות:

| role | scope | push ל-git | clone | הסבר |
|---|---|---|---|---|
| Developer | `read_repository` | נחסם | עובד | ה-scope חוסם כתיבה |
| Reporter | `write_repository` | נחסם | עובד | ה-role חוסם כתיבה |
| Developer | `write_repository` | עובד* | עובד | *ל-branch לא מוגן, או מוגן שמתיר Developer |
| Maintainer | `read_registry` | נחסם | נחסם | ה-scope לא כולל git |

:::caution[מלכודת · קרה בתרגול]
בלבול חוזר: לקרוא ל-role בשם "scope". Role הוא per project ב-Members. Scope הוא per token. ו-protected branches מגבילים **push**, לא pull.
:::

## מה כל role יכול (הרלוונטי כאן)

| פעולה | Guest | Reporter | Developer | Maintainer | Owner |
|---|---|---|---|---|---|
| clone / pull של repo פרטי | לא | כן | כן | כן | כן |
| משיכת image מה-registry | לא | כן | כן | כן | כן |
| push ל-branch לא מוגן | לא | לא | כן | כן | כן |
| push ל-`main` מוגן (ברירת מחדל) | לא | לא | לא | כן | כן |
| דחיפת image ל-registry | לא | לא | כן | כן | כן |
| הרצת pipeline | לא | לא | כן | כן | כן |
| variables, runners, deploy tokens, protected branches | לא | לא | לא | כן | כן |
| ניהול ה-group ו-members שלו | לא | לא | לא | לא | כן |

הטבלה מקורבת; פרטים שונים קלות בין גרסאות (למשל מי רשאי group variables: Maintainer או Owner). אם משהו קריטי, אמת בתיעוד ה-roles של גרסת ה-GitLab שלך.

## scopes של token

| scope | מתיר | סוגי token | הערה |
|---|---|---|---|
| `read_repository` | clone / fetch ב-HTTPS | PAT, service account, deploy token | קריאה בלבד |
| `write_repository` | push (כולל קריאה) | PAT, service account, project token | **לא** זמין ל-deploy token |
| `read_registry` | pull images | PAT, service account, deploy token | |
| `write_registry` | push images | PAT, service account, deploy token | ב-CI לא צריך: יש `CI_REGISTRY_PASSWORD` |
| `api` | הכול כמו ה-user | PAT, service account | הימנע: רחב מדי |

## ליצור ולנהל members

```text title="GitLab UI"
Project → Manage → Members → Invite members
  Username or email: <USER>      Select a role: Reporter | Developer | Maintainer
  Access expiration date: optional → Invite
Change/remove later: same page → role dropdown / the trash icon on the member row
```

ב-versions ישנות התפריט הוא `Project information → Members`. אפשר גם להזמין ברמת ה-group (`Group → Manage → Members`) והגישה יורשת לכל ה-projects.

**איך מוודאים:** ה-user מופיע ברשימה עם ה-role הנכון, ו-`git ls-remote` מהזהות שלו מצליח.

## protected branches וכללי push

```text title="GitLab UI"
Project → Settings → Repository → Protected branches → Expand
  Branch: main
  Allowed to merge:          Maintainers | Developers + Maintainers
  Allowed to push and merge: No one | Maintainers | Developers + Maintainers
  Allow force push: OFF
  → Protect / change an existing rule via its dropdowns
```

- ברירת המחדל ל-`main` ב-project חדש תלויה בהגדרת ה-group/instance (לרוב: push רק ל-Maintainers). בדוק בטבלת ה-Protected branches.
- ב-Free בוחרים **role** בלבד, לא user ספציפי (רשימת users מוכרים היא Premium).
- כדי ש-CI promote (Developer) ידחוף ל-`main` ב-gitops: `Allowed to push and merge` = `Developers + Maintainers`. הפתרון הנגדי (להעלות את הבוט ל-Maintainer) הפוך מ-least privilege.
- הגנה משפיעה גם על variables עם Protect (ראה [variables](../variables/)): ה-variable זמין רק ב-branch מוגן.

:::caution[מלכודת · קרה בתרגול]
`main` נפתח ל-push של Developer בדיוק מהסיבה הזו: הכותב הוא Developer, וה-branch מוגן.
:::

## אבחון: `403` / `Access denied` בגישה ל-repo

:::caution[מלכודת · קרה בתרגול]
`git ls-remote` עם credentials של ה-Argo reader: ל-templates עבד, ל-gitops `HTTP Basic: Access denied`.
הניחוש "ניתן Developer" שגוי בכיוון: קריאה דורשת Reporter, ו-Developer שובר least privilege.
הסיבה: רק ה-bot הכותב היה member ב-gitops; ה-argo-reader לא היה. ה-scope זהה בשני ה-repos (per token), לכן ההבדל חייב להיות per project = membership.
תיקון: להוסיף את argo-reader ל-gitops כ-Reporter. אין צורך להריץ סקריפט מחדש, התיקון בצד GitLab.
:::

סדר בדיקה לאותו `403` (הרחב: אל תישאר בקטגוריה אחת):

| בדוק | איך |
|---|---|
| ה-user member ב-**ה-repo הזה**? | `Project → Manage → Members` |
| role מספיק לפעולה (קריאה: Reporter, כתיבה: Developer)? | הטבלה למעלה |
| ה-scope מכסה את הפעולה? | scopes למעלה |
| ה-token לא פג / בוטל? | `Access tokens` של הזהות |
| ה-token נוצר על ה-project הנכון / זהות נכונה? | שם ה-token ו-owner |
| ה-branch מוגן ויש push מ-role נמוך? | Protected branches |
| ה-variable ריק כי Protect ON ב-branch לא מוגן? | [variables](../variables/) |
| ה-URL נכון (group path, לא display name)? | `git remote -v` |

אבחון נוסף ל-Argo: בממשק Argo: `Settings → Repositories`, עמודת CONNECTION STATUS. מצב ה-Secret לבד (`register-repository.sh --verify`) בודק רק צורה, לא ש-GitLab מקבל את ה-credential. פרטים: [argocd/operate](../../argocd/operate/). טבלת התסמינים הכללית: [debugging/symptoms](../../debugging/symptoms/).

:::tip[עיקרון]
Least privilege: קורא = Reporter או deploy token קריאה; כותב = Developer + `write_repository` על ה-repo היחיד שהוא כותב אליו. "הוסף עוד הרשאה" הוא כמעט תמיד הכיוון הלא נכון.
:::
