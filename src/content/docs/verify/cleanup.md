---
title: cleanup וצ'קליסט לפני הגשה
description: סדר הניקוי (root קודם), אימות ניקיון, רצף האידמפוטנטיות וצ'קליסט MUST סופי.
sidebar:
  order: 2
---

:::note[בקצרה]
ניקוי נכון משאיר את ה-cluster כמו שהיה: בלי Applications, בלי namespaces, בלי repo Secrets. המבחן מריץ אותו פעמיים ובודק שהשני לא נכשל.
הסקריפט המלא: [bash/templates](../../bash/templates/).
:::

## סדר הניקוי

1. **ה-root Application קודם.** ה-finalizer `resources-finalizer.argocd.argoproj.io` גורם למחיקה לרדת (cascade) לילדים ולמשאבים שלהם. אם מוחקים namespace לפני, Argo מייצר מחדש.
2. **שאר ה-Applications**, אם נשארו.
3. **ה-namespaces** של ה-envs ו-observability. ה-PVC ונתוניו נמחקים איתם.
4. **repo Secrets** ב-`argocd` (רק אלה שה-bootstrap יצר).
5. **חומר מקומי נשאר:** `~/.local/share/trident/` (TLS, credentials) לא נמחק.

```bash title="runs on: VM"
kubectl delete application <APP> -n argocd --ignore-not-found --wait=true
kubectl delete namespace <NS> --ignore-not-found --wait=true
kubectl delete secret <SECRET> -n argocd --ignore-not-found
```

:::danger[זהירות]
מחיקת namespace מוחקת את כל מה שבו, כולל PVC ונתוני ה-DB. מוחקים רק את ה-namespaces של הפרויקט, לא `argocd` ולא `ingress-nginx`. מחיקת repo Secrets לפי label בלבד עלולה למחוק גם Secrets של אחרים: סנן גם לפי `app.kubernetes.io/part-of`.
:::

## לוודא שנקי

```bash title="runs on: VM"
kubectl get applications -n argocd
kubectl get ns
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository
```

**איך נראה טוב:** `No resources found` ל-Applications ול-Secrets; אין namespaces של הפרויקט ב-`kubectl get ns`. Application תקוע ב-`Terminating`? בדוק `kubectl get application <APP> -n argocd -o jsonpath='{.metadata.finalizers}'`.

## רצף האידמפוטנטיות

```bash title="runs on: VM"
# script paths as in your project (bash/templates uses scripts/ and bootstrap/)
bash verify.sh && bash cleanup.sh && bash verify-clean.sh && bash cleanup.sh && bash verify-clean.sh
```

כל חוליה חייבת לעבור. ה-`cleanup.sh` השני רץ על cluster נקי ולכן חייב להצליח: `--ignore-not-found` ובדיקת קיום לפני מחיקה, לא `exit 1` על "לא נמצא".

:::tip[עיקרון]
סקריפט שיכול להיכשל כשאין מה לעשות אינו אידמפוטנטי. "כבר נעדר, אין מה לעשות" הוא הצלחה.
:::

## צ'קליסט MUST לפני הגשה

התאם לחוזה שקיבלת (האזורים כלליים):

- [ ] **Artifact:** images ב-registry הפרטי, tag = candidate, לא `latest`; אין credential ב-Git
- [ ] **Runtime:** לכל env: השירותים + DB + queue ב-namespace שלו; DB שורד החלפת Pod; probes נכונים; labels נדרשים
- [ ] **Front door:** `/info` ב-HTTPS מחזיר `version` = candidate ו-`environment` = env
- [ ] **Templates:** גרסאות מדויקות, ב-tag בלתי-משתנה, ללא עריכה
- [ ] **GitOps:** root הוא האובייקט היחיד שהוחל ידנית; automated + selfHeal + prune; `versions/<ENV>.yaml` נכתב רק ע"י `promote.sh`
- [ ] **Delivery:** `dev` ל-DEV, `main` ל-STAGING, PROD רק דרך הכפתור הידני של אותו pipeline
- [ ] **Observability:** סדרות עם `namespace=<NS>`; ה-dashboard מראה env אחד לכל בחירה; SHOULD אם נדרש
- [ ] **Secrets ו-access:** Secrets בכל namespace; credential קריאה ל-Argo נפרד מכתיבה של CI; אין token/סיסמה בשום repo
- [ ] אין `TODO` ו-`repoURL: ""` שנשארו: `grep -rnE 'TODO|repoURL: ""' <FILE>`
- [ ] אין רווח בסוף שורה / CRLF: `grep -nP ' +$' <FILE>`
- [ ] כל deliverable קיים ולא ריק, ו-git נקי ונדחף (`git status`, `git log origin/main..HEAD` ריק)
- [ ] הרצת `verify` ואז הרצף האידמפוטנטי עברה ללא כשל

**איך מוודאים:** כל סעיף עם ראיה מהיומן, לא "נראה לי". הסדר ההגיוני: [exam-method](../../architecture/exam-method/).
