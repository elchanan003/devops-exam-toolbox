---
title: זמן וטריאז'
description: תקציב זמן באחוזים, מתי עוברים הלאה, מה מוותרים עליו ראשון, איך משאירים את ה-cluster ניתן לאימות, ותרגול ריצה מלאה לפני המבחן.
sidebar:
  order: 7
---

:::note[בקצרה]
הדף משמש פעמיים: **הלילה** לתרגול ריצה מתוזמנת מאפס, ו**במבחן** כשמפגרים, בטבלת "על מה מוותרים". האחוזים הם הצעה, לא נתון מהמבחן.
סדר העבודה עצמו: [order-of-work](../order-of-work/). כשתקוע: [when-stuck](../when-stuck/).
:::

## תקציב זמן באחוזים (הצעה)

מכפילים את האחוז בזמן הכולל. העמודה הימנית היא **דוגמה** ל-240 דקות, להמחשה בלבד.

| שלב | % מהזמן | דוגמה ל-240 דקות |
|---|---|---|
| קריאה ומיפוי בלי להקליד (worksheet) | 6 | 14 |
| preflight וסביבה (`env.sh`, SSH, runner) | 4 | 10 |
| repos + tokens + variables + runner | 8 | 19 |
| build + publish ל-GitLab Container Registry | 10 | 24 |
| promote (`promote.sh`, `versions/<ENV>.yaml`) | 4 | 10 |
| values + `helm template` על כל ה-envs | 16 | 38 |
| Secrets לכל namespace + Applications ב-Argo | 12 | 29 |
| אימות envs (סולם האימות) | 8 | 19 |
| observability (חלק ה-MUST) | 4 | 10 |
| cleanup + רצף אידמפוטנטי + [last-20-minutes](../last-20-minutes/) | 8 | 19 |
| **סה"כ MUST** | **80** | **192** |
| יצירתיות ([creativity](../creativity/)), **רק** אם הסולם ירוק | עד 15 | עד 36 |
| חוצץ לתקלות לא צפויות | 5 | 12 |

**איך מוודאים:** באמצע הזמן (50%) אתה אמור להיות בסוף שלב values + render, כלומר בערך 50% מהשורות למעלה גמורות. אם לא, עבור לטבלת הטריאז' למטה.

## מתי עוברים הלאה

כלל אחד: **כל חסימה מקבלת timebox, ואחריו מתעדים ועוברים לשלב שלא תלוי בה.**

| מצב | timebox | מה עושים כשהזמן נגמר |
|---|---|---|
| שגיאה שלא הבנת | 2 דקות לקרוא מלמטה למעלה | פרוטוקול [when-stuck](../when-stuck/) |
| חסימה אחרי הפרוטוקול | 10 דקות | כותבים שורה ב-`NOTES.txt` (למטה) ועוברים הלאה |
| שלב שלם נכשל אחרי 15 דקות | 15 דקות | לא עוצרים את כל המבחן: ממשיכים במסלול המקביל |
| המתנה (pipeline, sync) | לא מחכים בטל | עושים בינתיים משהו מהמסלול השני |

שני מסלולים שלא תלויים זה בזה עד שה-Argo צריך את ה-tag:

| מסלול CI | מסלול cluster |
|---|---|
| runner, variables, build, publish, promote | values, `helm template`, Secrets, Applications |

CI חסום? ממשיכים עם `--set-string defaultImageTag=probe` ב-render ובונים את צד ה-cluster. Argo חסום? מתקדמים ב-promote ו-verify script. כך שתי חסימות לא הופכות לחסימה אחת.

```bash title="runs on: any shell"
note() { printf '%s | %s\n' "$(date +%H:%M)" "$*" >> NOTES.txt; }
note "promote: 403 on push; checked token project and Protect flag; next: Members of gitops"
git status --short
```

**איך מוודאים:** `NOTES.txt` מכיל שורה לכל חסימה פתוחה (לא ב-Git: הוסף אותו ל-`.git/info/exclude`). ה-working tree לא מכיל שינוי חצי-גמור שמשבית render.

:::caution[מלכודת · קרה בתרגול]
Application ב-`Failed` אחרי 5 ניסיונות sync לא מתחיל מחדש מעצמו, ו-`refresh=hard` לא מתחיל אותו. הודעת `operationState.message` בת 36 דקות נקראה כאילו היא עכשיו. לפני שמחליטים "עוברים הלאה": משווים `finishedAt` ל-`date -u`, ואם צריך מריצים sync ידני ([argocd/operate](../../argocd/operate/#argo-ויתר-sync-ידני)).
:::

## על מה מוותרים ראשון: MUST / SHOULD / STRETCH

מפגרים? מוותרים **מלמעלה למטה** בטבלה. אף פעם לא מוותרים על שורה בקבוצת "לא מוותרים".

| סדר ויתור | פריט | סוג | הערה |
|---|---|---|---|
| 1 | `sensor-outage` על המפה ושאר STRETCH | STRETCH | לא נוגע ב-MUST |
| 2 | כל ה-[creativity](../creativity/) | תוספת | רק אחרי סולם ירוק |
| 3 | Loki / Tempo / Alloy | SHOULD | נשארים כ-source בהערה, לא שבורים |
| 4 | NetworkPolicies | SHOULD | אחרי שהכול ירוק, ואם ה-CNI אוכף |
| 5 | ליטוש README / הערות | נחמד | לא הקוד |
| **לא מוותרים** | promote chain: `dev` ל-DEV, `main` ל-STAGING, כפתור ל-PROD | MUST | חוזה delivery |
| | Secrets בכל namespace, pull Secret ל-GitLab Container Registry | MUST | בלעדיו `ImagePullBackOff` |
| | automated + selfHeal + prune, root היחיד שהוחל ידנית | MUST | חוזה GitOps |
| | `cleanup.sh` אידמפוטנטי + `verify-clean` | MUST | נבדק פעמיים |
| | אין token/סיסמה ב-Git; אין TODO/placeholder | MUST | [last-20-minutes](../last-20-minutes/) |
| | כל deliverable קיים ולא ריק | MUST | הכשל "תוצר לא מוגש" |

הסיווג לקוח מה-README של TRIDENT. בפרויקט המבחן חוזה המבחן הוא הקובע: אם סעיף SHOULD הוא MUST אצלו, הוא עולה בטבלה.

**איך מוודאים:** לפני כל ויתור שואלים "האם זה בשורת לא-מוותרים?". אם כן, לא מוותרים אלא מקצרים (למשל env אחד במקום שלושה, ורושמים).

## להשאיר את ה-cluster ניתן לאימות

מצב סופי טוב הוא לא רק "ירוק": זה מצב שמישהו אחר יכול לבדוק בפקודה אחת. עוברים על הרשימה בכל פעם שמפסיקים לעבוד לזמן ארוך, ובסוף.

- [ ] כל ה-Applications `Synced`/`Healthy`, או אדומים **עם סיבה ידועה שרשומה ב-`NOTES.txt`**
- [ ] אף שינוי לא נעשה ב-live: מה שרץ = מה שב-Git (אין `OutOfSync` שנוצר מ-`kubectl edit`/`scale`)
- [ ] אין Deployment ב-`0/…` שנשאר מבדיקת self-heal
- [ ] אין Pod ב-`Pending`/`CrashLoopBackOff` שלא הוסבר
- [ ] אין process רקע (`port-forward`, `-w`) שרץ
- [ ] הכול נדחף: `git status` נקי ו-`git log @{u}..HEAD` ריק בכל repo
- [ ] פלט הסולם נשמר כראיה ([last-20-minutes](../last-20-minutes/#ראיות-evidence))

```bash title="runs on: VM"
kubectl -n argocd get applications
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get deploy -A --no-headers | awk '$3 ~ /^0\//'
pgrep -af 'kubectl (port-forward|.* -w)'
```

**איך מוודאים:** הפקודה הראשונה: הכול `Synced`/`Healthy`. השנייה: רק Pods שהסיבה ידועה (`Completed` של Job ישן אינו בעיה). השלישית והרביעית: **ריקות**. פירוט הסולם: [verify/overview](../../verify/overview/).

## תרגול הלילה: ריצה מלאה מאפס

המטרה: לדעת כמה זמן כל תחנה לוקחת **אצלך** ואיפה זה כואב, לפני שזה קורה במבחן. ריצה אחת מתוזמנת שווה יותר משלוש קריאות.

1. **מאפסים** (על ה-cluster של התרגול בלבד): הרצף מ-[verify/cleanup](../../verify/cleanup/#רצף-האידמפוטנטיות), ואז clone חדש לתיקייה חדשה.
2. **shell נקי:** חלון חדש בלי `export` ישנים, כדי שה-`env.sh` שלך יוכח.
3. **טוענים את שעון העצר** (למטה), ומריצים `st start repos` ו-`st end repos` (שם תחנה חופשי) סביב כל תחנה לפי [order-of-work](../order-of-work/).
4. **לא מסתכלים בדפים בלי סיבה.** כל פעם שפתחת דף, רושמים אותו בעמודת "where it hurt".
5. בסוף: סולם אימות מלא + הרצף האידמפוטנטי + [last-20-minutes](../last-20-minutes/).
6. ממלאים את הטבלה ומתקנים את **דבר אחד** בכל שורה כואבת (script, alias, שורה ב-`env.sh`), לא את כולן.

```bash title="runs on: VM"
env -i HOME="$HOME" PATH="$PATH" bash --noprofile --norc
```

```bash title="file: ~/rehearsal/stamp.sh"
# source this file:  . ~/rehearsal/stamp.sh
TIMING="${TIMING:-$HOME/rehearsal/timing.tsv}"
mkdir -p "$(dirname "$TIMING")"
st() { printf '%s\t%s\t%s\n' "$(date +%s)" "$1" "$2" >> "$TIMING"; }   # st start|end <station>
report() {
  awk -F'\t' '$2=="start"{s[$3]=$1; if(!($3 in o)){o[$3]=++n; nm[n]=$3}}
              $2=="end"{e[$3]=$1}
              END{printf "%-22s %7s\n","station","minutes"
                  for(i=1;i<=n;i++){k=nm[i]; printf "%-22s %7.1f\n", k, (e[k]?(e[k]-s[k])/60:-1)}}' "$TIMING"
}
```

```bash title="runs on: VM"
. ~/rehearsal/stamp.sh
st start repos
# ... work ...
st end repos
report
```

**איך מוודאים:** `report` מדפיס שורה לכל תחנה עם דקות; `-1.0` = תחנה שהתחלת ולא סיימת (גם זה מידע). הסקריפט נבדק עם `bash -n` והרצה קצרה.

העתק את הטבלה לקובץ והשלם אחרי כל תחנה:

| station | start | end | minutes | where it hurt | fix for next time |
|---|---|---|---|---|---|
| repos + tokens + variables + runner | | | | | |
| build + publish | | | | | |
| promote | | | | | |
| values + render | | | | | |
| Secrets + Argo apps | | | | | |
| envs verified | | | | | |
| observability | | | | | |
| cleanup + idempotency | | | | | |
| last 20 minutes | | | | | |

:::tip[עיקרון]
הכשל הנפוץ הוא לא פער ידע אלא היעדר procedure. תחנה שלקחה פי שניים מהתקציב היא תחנה שצריך לה סקריפט או שורה ב-`env.sh`, לא עוד קריאה.
:::
