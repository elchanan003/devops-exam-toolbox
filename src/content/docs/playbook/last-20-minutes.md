---
title: 20 הדקות האחרונות
description: צ'קליסט סיום, grep לשאריות ול-secrets ב-Git, רצף אידמפוטנטיות, deliverables, ראיות וסולם אימות סופי.
sidebar:
  order: 8
---

:::note[בקצרה]
בדיקות סטטיות תופסות את הכשלים שחוזרים בהגשות אמיתיות: placeholder שנשאר, תוצר שלא הוגש, עצירה ב-`PASS`. הסדר חשוב: קודם בודקים ומצלמים ראיות, ורק אחר כך מריצים cleanup.
אחרי שהכול עבר: [creativity](../creativity/) רק אם נשאר זמן. עד אז: [time-and-triage](../time-and-triage/).
:::

## הצ'קליסט

- [ ] `git pull --ff-only` בכל repo לפני הדחיפה האחרונה (ה-CI כותב ל-gitops)
- [ ] אין שאריות: TODO / FIXME / `exit 1` של stub / `<PLACEHOLDER>` / `repoURL: ""` / `defaultImageTag: ""`
- [ ] אין token, סיסמה או מפתח ב-Git: לא בעץ ולא בהיסטוריה
- [ ] אין רווח בסוף שורה ואין CRLF
- [ ] כל branch וכל tag נדחפו; `git status` נקי בכל repo
- [ ] סולם האימות ירוק, והפלט נשמר ב-`evidence/`
- [ ] כל deliverable קיים ולא ריק (לא תבנית, לא `...`)
- [ ] הרצף האידמפוטנטי עבר, ואתה קראת את הפלט של ההרצה השנייה
- [ ] המצב הסופי של ה-cluster הוא מה שהחוזה דורש (ראה בהמשך)

## סקריפט אחד שמריץ את הבדיקות הסטטיות

מריצים בתוך כל repo (`source`, `ci`, `gitops`, `templates`). קורא בלבד, ולא מדפיס ערכי secrets: בדיקות ה-token מדפיסות **שמות קבצים** בלבד.

```bash title="file: finish-check.sh"
#!/usr/bin/env bash
# finish-check.sh — run inside each repo clone before the final push. Read-only.
set -u
DELIVERABLES="${DELIVERABLES:-}"   # space-separated paths, e.g. "evidence/ladder.txt DECISIONS.md"
bad=0
hit()  { echo "FAIL  $1"; bad=1; }
ok()   { echo "PASS  $1"; }

if git grep -nIE 'TODO|FIXME|CHANGEME|repoURL: ""|defaultImageTag: ""' -- . ':!*.md' ':!*/versions/*'; then hit "leftovers above"; else ok "no leftovers"; fi
if git grep -lIE '(glpat|gldt|glrt|glrtr|glcbt|glptt|glft|glagent|gloas)-[0-9A-Za-z_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY' -- .; then hit "token/key text in files above"; else ok "no token/key text in tracked files"; fi
if [ -n "$(git log --all -G'(glpat|gldt|glrt|glcbt)-[0-9A-Za-z_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY' --format=%h -- .)" ]; then hit "token/key text in history"; else ok "no token/key text in history"; fi
if git ls-files . | grep -E '(^|/)(\.env|token|username|password|id_[a-z0-9]+|[^/]+\.(pem|key))$'; then echo "WARN  secret-like file names tracked (above): open each, confirm no secret"; else ok "no secret-like file names tracked"; fi
if git grep -nIE ' +$' -- . ':!*.md'; then hit "trailing whitespace above"; else ok "no trailing whitespace"; fi
if git grep -lI $'\r' -- . ; then hit "CRLF in files above"; else ok "no CRLF"; fi
for f in $DELIVERABLES; do [ -s "$f" ] && ok "deliverable $f" || hit "deliverable missing or empty: $f"; done
[ -z "$(git status --porcelain)" ] && ok "working tree clean" || hit "uncommitted changes"
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  [ -z "$(git log '@{u}..HEAD' --oneline)" ] && ok "nothing unpushed" || hit "unpushed commits"
else hit "no upstream set"; fi
exit "$bad"
```

```bash title="runs on: VM"
cd <DIR>
DELIVERABLES="evidence/ladder.txt DECISIONS.md" bash finish-check.sh
echo "exit=$?"
```

**איך מוודאים:** הכול `PASS` ו-`exit=0`. כל `FAIL` מדפיס מעליו את השורות הרלוונטיות. `git grep` רואה קבצים tracked בלבד; קובץ חדש בלי `git add` נתפס בבדיקת `git status`. הסקריפט נבדק ב-repo מבודד: נקי נתן `exit=0`; עם token מושתל, `repoURL: ""` ו-deliverable חסר נתן `exit=1`.

## שאריות: TODO, placeholder, stub

```bash title="runs on: any shell"
git grep -nIE 'TODO|FIXME|CHANGEME' -- . ':!*.md'
git grep -nIE 'repoURL: ""|defaultImageTag: ""|imageRepository: ""' -- .
git grep -nIE 'TODO.*exit 1' -- .
git grep -nIE '<[A-Z][A-Z0-9_]+>' -- '*.yaml' '*.yml' '*.sh' '*.json'
```

הדפוס `TODO.*exit 1` תופס stub (`echo "TODO …"; exit 1`). `exit 1` לבד **לא** נכנס ל-grep: בסקריפטים אמיתיים הוא תקין (`command -v openssl || exit 1`), וב-TRIDENT הוא נותן כ-20 פגיעות לגיטימיות שמסתירות את הבעיה.

**איך מוודאים:** פלט ריק. פגיעה ב-`<…>` בתוך הערת `#` היא תיעוד ולא placeholder: קרא את השורה לפני שמוחקים. `versions/<ENV>.yaml` עם `defaultImageTag: ""` תקין עד שהוקדם ל-env, ולכן הוא מוחרג בסקריפט.

:::caution[מלכודת]
placeholder שנשאר, TODO בקובץ שהוגש ותוצר שהוגש כתבנית ריקה הם הכשלים החוזרים בהגשות אמיתיות (COURSE_MECHANICS סעיף 11). הם לא פער ידע: פשוט לא הורץ grep.
:::

## Secrets ב-Git: עץ והיסטוריה

לכל token ב-GitLab יש prefix קבוע. הטבלה לקוחה מתיעוד GitLab (Token overview, נבדק 2026-10-04):

| prefix | סוג |
|---|---|
| `glpat-` | personal / project / group access token |
| `gldt-` | deploy token |
| `glrt-`, `glrtr-` | runner authentication token |
| `glcbt-` | CI/CD job token |
| `glptt-`, `glft-`, `glagent-`, `gloas-` | trigger, feed, agent for Kubernetes, OAuth application secret |
| `glsoat-` | **SCIM** token, לא token של service account |

Token של service account לא מופיע בטבלה בנפרד; אם נוצר כ-PAT הוא יתחיל ב-`glpat-`. ה-regex מכסה את הקבוצה כולה.

```bash title="runs on: any shell"
# 1. working tree (file names only, never the secret line)
git grep -lIE '(glpat|gldt|glrt|glrtr|glcbt|glptt|glft|glagent|gloas)-[0-9A-Za-z_-]{8,}' -- .
git grep -lIE -e '-----BEGIN [A-Z ]*PRIVATE KEY' -- .
# 2. assignments with a literal value (a variable name is fine, a string is not)
git grep -nIiE '(password|passwd|pwd|token)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9+/=_.-]{8,}' -- . | grep -vE '[:=] *["'"'"']?[$<]'
# 3. secret-like file names tracked
git ls-files . | grep -E '(^|/)(\.env|token|username|password|id_[a-z0-9]+|[^/]+\.(pem|key))$'
# 4. history: commits that ever added or removed such text (hashes only)
git log --all --format='%h %s' -G'(glpat|gldt|glrt|glcbt)-[0-9A-Za-z_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY' -- .
# 5. the log -p form, printing a COUNT and not the lines
git log --all -p -- . | grep -cE '^\+.*(glpat|gldt|glrt|glcbt)-[0-9A-Za-z_-]{8,}'
```

**איך מוודאים:** שלבים 1, 2 ו-4 ריקים; שלב 5 מחזיר `0`. פגיעה בשלב 3 אינה בהכרח בעיה: פתח את הקובץ והחלט.

הרצה על תיקיית TRIDENT (קריאה בלבד) לבדיקת false positives: שלבים 1 ו-5 נתנו **אפס**. שלב 2 נתן **שתי שורות**, שתיהן שם משתנה (`password=DB_PASSWORD`) ולא ערך. שלב 3 הציג `source/.env` (קובץ הגדרות של Compose, בלי secret). שלב 4 הראה commits ישנים של הקורס עם קבצי `tls/*.key` של ה-lab (חומר לא-production שנמחק מהעץ): בדיוק מה שבדיקת עץ בלבד מפספסת.

:::danger[זהירות]
מצאת token ב-Git או בהיסטוריה? **קודם מבטלים אותו (revoke) ב-GitLab ויוצרים חדש.** מחיקת השורה ב-commit חדש לא מסירה אותו מההיסטוריה, וכתיבה מחדש של היסטוריה עם `--force` ב-repo ש-CI כותב אליו מוחקת את ה-commits שלו. מי משתמש בו: [architecture/credentials](../../architecture/credentials/).
:::

אותו עיקרון לפלט: לא מדביקים ל-scrollback פקודה שמדפיסה token (`cat` של קובץ credential, `kubectl get secret -o yaml`). בודקים קיום וגודל: `[ -s <FILE> ]`, `wc -c < <FILE>`.

## רצף האידמפוטנטיות

```bash title="runs on: VM"
bash verify.sh && bash cleanup.sh && bash verify-clean.sh && bash cleanup.sh && bash verify-clean.sh
echo "exit=$?"
```

**איך מוודאים:** `exit=0`, וקראת את הפלט של `cleanup.sh` **השני** (על cluster נקי, חייב להצליח בלי `exit 1` על "לא נמצא"). `verify.sh: PASSED` הוא לא סוף: ההרצה השנייה היא מה שנבדק. סדר הניקוי, finalizers וסקריפט מלא: [verify/cleanup](../../verify/cleanup/#רצף-האידמפוטנטיות) ו-[bash/templates](../../bash/templates/#cleanupsh).

:::caution[מלכודת]
הרצף **מוחק** את מה שהותקן. הסולם והראיות רצים לפניו, לא אחריו. אם החוזה בודק cluster חי ולא רק את הרצף, מריצים bootstrap מחדש בסוף. אל תנחש: קרא מה החוזה אומר על מצב ההגשה.
:::

## Deliverables

```bash title="runs on: any shell"
for f in <FILE> <FILE>; do [ -s "$f" ] && echo "ok   $f" || echo "MISSING $f"; done
find evidence -type f -size -20c
```

**איך מוודאים:** אין `MISSING`, והפקודה השנייה ריקה. קובץ קטן מ-20 בתים הוא כמעט בוודאי `...` או תבנית ריקה (כך נראו 5 מתוך 6 קבצי ראיות בהגשה אמיתית בקורס). קובץ `answers`/`DECISIONS` שעדיין מכיל את התבנית המקורית שווה לריק.

## ראיות (evidence)

קובץ ראיה הוא פלט אמיתי של פקודה, עם תאריך, שנשמר לפני ה-cleanup. פקודה קרא-בלבד לכל שלב בסולם:

```bash title="runs on: VM"
mkdir -p evidence
{ date -u +%FT%TZ; kubectl -n argocd get applications; } > evidence/argo-apps.txt
kubectl -n argocd get applications -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.sync.status}{"/"}{.status.health.status}{"\n"}{end}' > evidence/argo-status.txt
[ -s evidence/argo-status.txt ] && cat evidence/argo-status.txt
```

**איך מוודאים:** כל הקבצים לא ריקים, וכל Application `Synced/Healthy`. גרסה עם before/after: [creativity](../creativity/#evidence-לפני-ואחרי).

## סולם אימות סופי

מריצים את [verify/overview](../../verify/overview/) מלמעלה למטה ועוצרים בראשון שאדום: render, pipeline, Argo, objects, `/info`, תכונות GitOps, נתונים שורדים. `Synced`/`Healthy` לבד לא מספיק: צריך גם `version` = candidate ב-`/info` של **כל** env, ו-`accepted` שעולה בין שתי קריאות.

**איך מוודאים:** כל השלבים ירוקים ושמורים ב-`evidence/`. בדיקה שלילית אחת (פעולה אסורה שנכשלת, למשל `kubectl auth can-i` שמחזיר `no`) שווה יותר מעוד בדיקה חיובית.

## הדחיפה האחרונה

```bash title="runs on: any shell"
git pull --ff-only
git push origin --all
git push origin --tags
git ls-remote --heads --tags origin
git for-each-ref --format='%(refname:short) %(upstream:short) %(upstream:track)' refs/heads
```

**איך מוודאים:** `ls-remote` מציג כל branch וכל tag שצריך (למשל `v1.0.0`); בפקודה האחרונה אין `[ahead …]`. branch בלי upstream מוצג ריק: ודא ב-`ls-remote` שהוא קיים.

:::caution[מלכודת · קרה בתרגול]
ה-CI דחף commit ל-gitops בזמן שה-clone המקומי היה ישן, ונראה ש"השינויים לא מגיעים". `git pull` לפני עריכה ולפני דחיפה. `--force` היה מוחק את ה-commit של ה-CI ומחזיר את התג ל-`""`. `git push` רגיל דוחף רק את ה-branch הנוכחי, ו-tags דורשים push משלהם ([git/branches](../../git/branches/)).
:::
