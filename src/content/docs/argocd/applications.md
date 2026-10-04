---
title: Application YAML — root, multi-source, syncPolicy
description: צורות ה-YAML המדויקות של Application ב-Argo CD, מאיפה מגיע כל ערך, ו-targetRevision של tag מול branch.
sidebar:
  label: "root, multi-source, syncPolicy"
  order: 2
---

:::note[בקצרה]
שלוש צורות: **root** (source אחד), **child עם multi-source** (charts + `ref: values`), ו-**kustomize directory source**.
כל `repoURL` חייב להתאים בייט-לבייט ל-`url` של repo Secret (ראה [operate](../operate/#repo-secrets)).
רקע על התמונה הכללית: [overview](../overview/).
:::

## root Application

```yaml title="file: gitops/argocd/root.yaml"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: <APP>
  namespace: argocd
  finalizers: [resources-finalizer.argocd.argoproj.io]
spec:
  project: default
  source:
    repoURL: https://<GITLAB_HOST>/<GROUP>/<REPO>.git
    targetRevision: main
    path: argocd/apps
  destination: {server: https://kubernetes.default.svc, namespace: argocd}
  syncPolicy:
    automated: {prune: true, selfHeal: true}
# TRIDENT: name trident-root, repo trident-gitops
```

- `source` יחיד (לא `sources`). ה-path מכיל Application manifests של ה-children, ולא את `root.yaml` עצמו.
- `namespace: argocd` ב-destination כי ה-Application objects חיים שם.

## child Application עם multi-source

```yaml title="file: gitops/argocd/apps/<ENV>.yaml"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: <APP>
  namespace: argocd
  finalizers: [resources-finalizer.argocd.argoproj.io]
spec:
  project: default
  sources:
    - repoURL: https://<GITLAB_HOST>/<GROUP>/<REPO>.git   # the templates repo
      targetRevision: <TAG>
      path: <CHART_DIR>
      helm:
        releaseName: <RELEASE>
        valueFiles:
          - $values/apps/<SERVICE>/base.yaml
          - $values/apps/<SERVICE>/<ENV>.yaml
          - $values/apps/<SERVICE>/versions/<ENV>.yaml
    # … (one more chart source per chart, same shape)
    - repoURL: https://<GITLAB_HOST>/<GROUP>/<REPO>.git   # the gitops repo
      targetRevision: main
      ref: values
  destination: {server: https://kubernetes.default.svc, namespace: <NS>}
  syncPolicy:
    automated: {prune: true, selfHeal: true}
    syncOptions: [CreateNamespace=false]
# TRIDENT: templates repo trident-templates, <TAG> = v1.0.0, gitops repo trident-gitops
```

שים לב: שני ה-`repoURL` משתמשים ב-`<REPO>` אבל הם **שני repos שונים**: charts מ-`templates`, ערכים מ-`gitops`.

- **סדר `valueFiles`:** `base → <ENV> → versions/<ENV>`. המאוחר מנצח; maps מתמזגים לפי מפתח, lists מוחלפים.
- **source הערכים:** `ref: values`, ב-`gitops`, **בלי `path`**. השם `values` הוא מה שמופיע ב-`$values/`.
- `versions/<ENV>.yaml` נכתב רק על ידי `promote.sh`. אם הוא `""` (מעולם לא עבר promote), הרינדור נכשל: ראה [ComparisonError](../operate/#comparisonerror-קוראים-מלמטה-למעלה).
- `CreateNamespace=false` (או השמטה) כשה-namespace נוצר על ידי script ה-bootstrap, יחד עם ה-Secrets שה-Pods צריכים לפני sync.

```bash title="runs on: any shell"
python3 -c "import sys,yaml; [print(d['kind'], d['metadata']['name']) for d in yaml.safe_load_all(open(sys.argv[1]))]" <FILE>
grep -n 'repoURL: ""' <FILE>
```

**איך מוודאים:** השורה הראשונה מדפיסה `Application <name>` (ה-YAML תקין); ה-`grep` לא מדפיס כלום (אין `repoURL` ריק).

## kustomize directory source

Source שהוא תיקייה עם `kustomization.yaml`. אין מפתח `kustomize:`; Argo מזהה לבד. משמש להעלאת dashboard כ-ConfigMap (ראה [observability](../../observability/overview/#dashboard-דרך-kustomize)).

```yaml title="file: gitops/argocd/apps/observability.yaml (one source of sources:)"
    - repoURL: https://<GITLAB_HOST>/<GROUP>/<REPO>.git   # the gitops repo
      targetRevision: main
      path: observability/grafana/dashboards
```

:::caution[מלכודת · קרה בתרגול]
ה-source של ה-dashboards הצביע על `templates` במקום `gitops` (הועתקה השורה הקודמת). סימנים: ה-path לא מתחיל ב-`charts/`, וה-`targetRevision` הוא `main` ולא ה-tag.
הכלל: לא מעתיקים שורה מהבלוק הקודם; קוראים את שאר הבלוק.
:::

## tag מול branch ב-targetRevision

| Source | `targetRevision` | למה |
|---|---|---|
| charts ב-`templates` | `<TAG>` | נעוץ (pin): push ל-`templates` לא שובר סביבה חיה |
| values ב-`gitops` (`ref: values`) | `main` | `promote.sh` כותב ל-`main`; הערכים חייבים לעקוב |
| root, kustomize ב-`gitops` | `main` | אותו שינוי, אותה סיבה |

:::caution[מלכודת · קרה בתרגול]
tag על `gitops` היה מקפיא את כל השרשרת: ה-promote עושה commit ל-`main`, אבל Argo היה ממשיך לקרוא את ה-tag הישן, ושום סביבה לא הייתה מתעדכנת.
:::

## destination: איפה ה-Application, ואיפה המשאבים

- `metadata.namespace: argocd`: ה-Application object עצמו (תמיד).
- `destination.namespace: <NS>`: לשם Argo מחיל את המשאבים המרונדרים.
- `destination.server`: `https://kubernetes.default.svc` = אותו cluster שבו Argo רץ.
- ל-Argo יש הרשאות cluster-wide, ולכן הוא יכול לכתוב ל-`<NS>` למרות שהוא רץ ב-`argocd`.

## syncPolicy ו-finalizers

| צורה | משמעות |
|---|---|
| `syncPolicy: {}` | sync ידני בלבד: `OutOfSync` נשאר עד שמפעילים; אין selfHeal |
| `automated: {}` | sync אוטומטי, בלי prune ובלי selfHeal |
| `automated: {prune: true, selfHeal: true}` | המטרה: מחיקה ב-Git מוחקת בקלאסטר, ושינוי חי מוחזר |

- `selfHeal` נכנס כשהשינוי **בצד ה-cluster** (scale, edit); `prune` כשהשינוי **ב-Git** (קובץ נמחק).
- `resources-finalizer.argocd.argoproj.io`: מחיקת ה-Application מוחקת גם את המשאבים שלו (cascade). בלעדיו המשאבים נשארים יתומים. פירוט: [verify/cleanup](../../verify/cleanup/).
- מחק Application לפני AppProject שלו.

## טבלה: מאיפה מגיע כל ערך

| שדה | מקור הערך |
|---|---|
| `metadata.name` | שם ה-Application לפי החוזה (`<APP>`) |
| `metadata.namespace` | תמיד `argocd` |
| `repoURL` (charts) | כתובת HTTPS של repo ה-templates, זהה ל-`url` ב-repo Secret |
| `repoURL` (values, root) | כתובת HTTPS של `gitops`, זהה ל-`url` ב-repo Secret |
| `targetRevision` | tag לצ'ארטים, `main` לכל השאר |
| `path` | תיקיית chart ב-`templates` (מתחילה ב-`charts/`) או תיקייה ב-`gitops` |
| `releaseName` | החוזה (שם ה-release; אל תשתמש ב-`.Release.Name` בתבניות) |
| `valueFiles` | קבצים ב-`gitops`, תחת `$values/` |
| `destination.namespace` | `<NS>` של הסביבה, נוצר ב-bootstrap |

:::tip[עיקרון]
כל שדה הוא או כתובת (חייבת להתאים ל-Secret), או revision (tag = נעוץ, `main` = עוקב), או path (תיקייה אמיתית ב-repo הנכון). שגיאה = בדוק איזה משלושת.
:::
