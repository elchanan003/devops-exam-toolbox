---
title: Argo CD — מה הוא עושה ואיך מגיעים אליו
description: התפקיד של Argo CD בתכנון, app-of-apps, ה-bootstrap הידני, הזרימה אחרי promote, וגישה ל-UI בלי CLI.
sidebar:
  label: "מה הוא עושה ואיך מגיעים אליו"
  order: 1
---

:::note[בקצרה]
Argo CD הוא ה**מחיל היחיד** (the only applier) על ה-cluster: הוא שואב (pull) מ-Git ומחיל. CI כותב ל-Git, לא ל-cluster.
הדף הזה עונה: מה Argo קורא, מה הוא מחיל, מה הוא לא עושה, ומה הדבר היחיד שאתה מחיל ידנית.
YAML מלא של ה-Application בדף [applications](../applications/); תפעול וקריאת סטטוסים בדף [operate](../operate/).
:::

## מה Argo עושה בתכנון הזה

- **Pull-based:** Argo רץ בתוך ה-cluster, בודק את Git מדי פעם (polling; מרווח הזמן משתנה בין סביבות, אל תניח מספר) ומשווה למצב החי.
- **קורא שני repos בלבד:** `gitops` (values + Application manifests) ו-`templates` (ה-charts). ה-`source` (קוד האפליקציה) ו-`ci` הם לא שלו.
- **מחיל רק מה שמרונדר:** הוא מריץ `helm template` על ה-charts עם ה-values, ומחיל את ה-manifests שיצאו.
- **תמיד אוטומטי:** ה-gate הידני של prod נמצא ב-CI (`when: manual` על job ה-promote), לא ב-Argo. ראה [operate](../operate/#prod-לא-צריך-syncpolicy-אחר).

| Repo | Argo קורא? | מה יש בו |
|---|---|---|
| `gitops` | כן | `argocd/` (root + Applications), `apps/<SERVICE>/` values, `observability/` |
| `templates` | כן | `charts/` (ב-`targetRevision` של `<TAG>`) |
| `source` | לא | קוד + Dockerfile; CI בונה ממנו images |
| `ci` | לא | include של pipeline ו-scripts |

:::caution[מלכודת · קרה בתרגול]
נאמר "Argo קורא מ-source". לא: `source` מייצר images ב-registry, ו-Argo לא נוגע בו. Argo קורא `gitops` + `templates`.
ה-kubelet הוא זה שמושך את ה-image, עם ה-pull Secret.
:::

## app-of-apps: מה root מרנדר ומה כל child מרנדר

```text title="the picture"
root Application (trident-root)
  source (ONE): gitops, path argocd/apps
  workload  = Application manifests (dev, staging, prod, observability)

child Application (trident-dev)
  sources (N chart sources + ONE values source)
    1  templates @ <TAG>  path <CHART_DIR>   helm.valueFiles: $values/...
    2  templates @ <TAG>  path <CHART_DIR>   helm.valueFiles: $values/...
    3  templates @ <TAG>  path <CHART_DIR>   helm.valueFiles: $values/...
    4  gitops    @ main   ref: values           (no path)
  workload  = Deployments, Services, ConfigMaps... in destination.namespace
```

:::caution[מלכודת · קרה בתרגול]
בלבול: "root מרנדר את האפליקציות ולכן צריך את שני ה-repos". לא. ל-root יש **source אחד**: `gitops`, path `argocd/apps`.
ה-"workload" שלו הוא קבצי Application, לא charts. רק ל-child יש כמה sources: N של charts (מ-`templates`) ועוד אחד עם `ref: values` (מ-`gitops`).
:::

- `$values` הוא שם ה-`ref` של ה-source הרביעי. הוא קיים רק בתוך Argo, **לא ב-bash** (ראה [helm/overview](../../helm/overview/)).
- ה-path של root לא יכול להכיל את הקובץ של root עצמו (נעילה עצמית בעת מחיקה).

## ה-bootstrap edge: root הוא האובייקט היחיד שמחילים ידנית

Argo הוא controller שמסתכל על **אובייקטי Application** ב-cluster. אם אין אובייקט, אין על מה להגיב. Push ל-Git לא יוצר אותו.

:::caution[מלכודת · קרה בתרגול]
אחרי push ל-`gitops` הציפייה הייתה ש-Argo יגיב, אבל `kubectl get applications -n argocd` החזיר ריק.
סיבה: החץ מתחיל ב-cluster, לא ב-Git. חסר אובייקט root. תיקון: להחיל את `root.yaml` פעם אחת (ב-TRIDENT: `bootstrap/bootstrap.sh`). משם root יוצר את ה-children מ-Git.
:::

```bash title="runs on: VM"
kubectl apply -f <FILE>
# TRIDENT: kubectl apply -f argocd/root.yaml  (wrapped by bash bootstrap/bootstrap.sh)
kubectl -n argocd get applications
```

**איך מוודאים:** רשימה עם root ואחריו ה-children (ב-TRIDENT: 5 Applications). `repoURL: ""` שנשאר ב-`root.yaml` חוסם את ה-bootstrap script.

## מה קורה אחרי commit של promote

1. `promote.sh` כותב `versions/<ENV>.yaml` ב-`gitops` `main` (CI, לא Argo).
2. Argo מבצע polling ל-Git ורואה revision חדש: האפליקציה הופכת `OutOfSync`.
3. `syncPolicy.automated` מפעיל sync.
4. Argo מריץ מחדש `helm template` עם ה-values החדשים.
5. ה-Deployment מקבל `image` חדש, מתחיל rollout.
6. ה-kubelet מושך את ה-image עם ה-pull Secret של ה-namespace.

:::caution[מלכודת · קרה בתרגול]
ניסוח שגוי: "Argo מעדכן את ה-Application". לא. ה-Application נשאר כמו שהוא. Argo מחיל את ה-**Deployment המרונדר** מחדש.
:::

אם Argo לא רואה שינוי: הוא לא קורא את ה-clone המקומי שלך. מה שלא נדחף (`git push`) לא קיים בשבילו.

## גישה ל-UI ולסיסמת admin

אין `argocd` CLI על ה-VM. עובדים עם `kubectl` + ה-UI.

```bash title="runs on: VM"
kubectl -n argocd get svc argocd-server
```

חפש את ה-NodePort של פורט 443 (עמודת `PORT(S)`, למשל `443:<PORT>/TCP`), ופתח `https://<VM_IP>:<PORT>` (ה-certificate self-signed, אשר בדפדפן).

```bash title="runs on: VM"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
```

משתמש: `admin`. **איך מוודאים:** הסיסמה מודפסת (ואין שורה ריקה אחריה); ה-UI מציג כרטיס לכל Application.

:::tip[עיקרון]
Argo הוא כלי קריאה בלבד אצלך: תיקונים הולכים ל-Git. ראה [operate](../operate/#לעולם-לא-מתקנים-live-מתקנים-ב-git).
:::

ראה גם: [credentials](../../architecture/credentials/) (מי צריך איזה credential), [verify/overview](../../verify/overview/).
