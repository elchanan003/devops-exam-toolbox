// Home page index: one block per tab, each with its most-used tasks as deep links.
// href is relative to the site base (no leading slash). Add a block = add an object; order = display order.
export const firstAid = [
  { href: 'quick/overview/', title: 'שליפה מהירה', text: 'הפקודות הנפוצות, מסך אחד לכל תחום' },
  { href: 'debugging/symptoms/', title: 'טבלת תקלות', text: 'הודעת שגיאה ← סיבה ← פקודת בדיקה' },
  { href: 'architecture/overview/', title: 'איפה זה רץ?', text: 'VM, CI job, GitLab UI, Argo — ומאיפה המשתנים' },
  { href: 'bash/templates/', title: 'סקריפטים מלאים', text: 'prepare, promote, cleanup — להעתקה' },
  { href: 'verify/overview/', title: 'סולם האימות', text: 'מלמטה למעלה, עם פקודה לכל שלב' },
];

export const index = [
  { tab: 'התמונה הגדולה', href: 'architecture/overview/', links: [
    ['פיצול ה-repos והזרימה מקצה לקצה', 'architecture/overview/#הזרימה-מקצה-לקצה'],
    ['מפת credentials: מי קורא, מי כותב', 'architecture/credentials/'],
    ['Compose → Kubernetes/Helm', 'architecture/compose-to-k8s/'],
    ['איך קוראים את ה-contract וסדר העבודה', 'architecture/exam-method/'],
  ]},
  { tab: 'Git', href: 'git/overview/', links: [
    ['ליצור branch, לעבור, לדחוף כמה branches', 'git/branches/#ליצור-branch-חדש-ולעבור-אליו'],
    ['`pull`, `merge --ff-only`, diverged', 'git/sync/#merge---ff-only-נכשל-diverged'],
    ['ה-push נדחה: `non-fast-forward`', 'git/sync/#ה-push-נדחה-rejected-non-fast-forward'],
    ['חירום: `reflog`, `reset`, `revert`', 'git/undo/#חירום-שלוש-פקודות-הצלה'],
    ['`reset` מול `revert` מול `restore`', 'git/undo/#טבלה-reset-מול-revert-מול-restore'],
    ['ליצור tag ולדחוף אותו', 'git/branches/#ליצור-tag-ולדחוף-אותו'],
  ]},
  { tab: 'SSH וגישה', href: 'ssh/overview/', links: [
    ['VM חדשה: מאפס ועד clone', 'ssh/overview/#צקליסט-vm-חדשה-מאפס-ועד-clone'],
    ['`~/.ssh/config` ו-`IdentitiesOnly`', 'ssh/overview/#ליצור-sshconfig-ו-identitiesonly'],
    ['`ssh -T` עובד אבל clone נכשל', 'ssh/overview/#git-clone-נכשל-אבל-ssh--t-עובד'],
  ]},
  { tab: 'GitLab', href: 'gitlab/overview/', links: [
    ['איזו זהות לכל actor (Free מול Premium)', 'gitlab/identities/#טבלת-החלטה-איזו-זהות-לכל-actor'],
    ['role מול scope, ואבחון 403', 'gitlab/permissions/#role-מול-scope'],
    ['CI/CD variables: Mask מול Protect', 'gitlab/variables/#mask-מול-protect'],
    ['רישום runner ו-tags', 'gitlab/runners/#לרשום-על-ה-vm'],
    ['deploy token למשיכת images', 'gitlab/registry/#ליצור-deploy-token-למשיכה'],
  ]},
  { tab: 'GitLab CI', href: 'ci/overview/', links: [
    ['מילון keywords: `needs`, `rules`, `extends`', 'ci/keywords/#טבלה-מילה-ומה-היא-עושה'],
    ['candidate tag דרך `dotenv`', 'ci/patterns/#candidate-תג-אחד-לכל-ה-pipeline-dotenv'],
    ['build/publish loop', 'ci/patterns/#build-loop'],
    ['promote jobs ו-prod ידני', 'ci/patterns/#שער-ידני-ל-prod-needs--environment--resource_group'],
    ['predefined variables', 'ci/overview/#predefined-variables-שחוזרים-בפרויקט'],
  ]},
  { tab: 'Docker ו-Registry', href: 'docker/overview/', links: [
    ['build context ו-`COPY`', 'docker/overview/#build-context-ו-copy-paths'],
    ['מבנה שם image', 'docker/overview/#מבנה-שם-image'],
    ['`docker login` ו-push', 'docker/overview/#login-ו-push'],
    ['`daemon.json`: DNS ו-`blob unknown`', 'docker/overview/#כרטיס-סביבה-1-dns-ב-docker-build'],
  ]},
  { tab: 'Bash וסקריפטים', href: 'bash/overview/', links: [
    ['exit codes, `if !` ו-`set -e`', 'bash/overview/#if--cmd-ופטור-set--e-בתנאי'],
    ['`export` מול משתנה CI', 'bash/overview/#export-משתנה-רגיל-ו-ci-variable'],
    ['create|apply אידמפוטנטי', 'bash/snippets/#kubectl-create----dry-runclient--o-yaml--kubectl-apply--f--'],
    ['`prepare-environment.sh`', 'bash/templates/#prepare-environmentsh'],
    ['`promote.sh`', 'bash/templates/#promotesh'],
    ['`cleanup.sh`', 'bash/templates/#cleanupsh'],
    ['סקריפט verify עם PASS/FAIL', 'bash/verify-script/'],
  ]},
  { tab: 'Helm', href: 'helm/overview/', links: [
    ['`helm template` עם כמה `-f`', 'helm/overview/#pre-flight-render-אותו-render-ש-argo-יריץ'],
    ['שכבות values: מי גובר', 'helm/overview/#values-layering-מי-מנצח'],
    ['nxs-universal-chart: גיליון עזר', 'helm/values/#nxs-universal-chart-גיליון-עזר'],
    ['postgres ו-redis keys', 'helm/values/#postgres-groundhog2k-168'],
    ['בדיקת values מוזרקים: `grep -q`', 'helm/testing/#בדיקה-בסיסית-helm-template--grep--q'],
    ['`required` ו-lint ≠ template', 'helm/testing/#lint--template'],
  ]},
  { tab: 'Kubernetes', href: 'kubernetes/overview/', links: [
    ['`describe`, events, `logs --previous`', 'kubernetes/overview/#למה-זה-לא-עולה-describe-ו-events'],
    ['`-o jsonpath`', 'kubernetes/overview/#לקרוא-שדה--o-jsonpath'],
    ['Secrets: generic, docker-registry, tls', 'kubernetes/secrets/#generic-סיסמה-כקובץ'],
    ['Ingress, TLS ו-`curl --resolve`', 'kubernetes/networking/#curl---resolve-אל-ה-nodeport'],
    ['PVC Pending ו-StorageClass', 'kubernetes/storage-probes/#pod-pending-בגלל-pvc-סולם-האבחון'],
  ]},
  { tab: 'Argo CD', href: 'argocd/overview/', links: [
    ['root app ו-app-of-apps', 'argocd/overview/#app-of-apps-מה-root-מרנדר-ומה-כל-child-מרנדר'],
    ['multi-source עם `ref: values`', 'argocd/applications/#child-application-עם-multi-source'],
    ['`syncPolicy` ו-finalizers', 'argocd/applications/#syncpolicy-ו-finalizers'],
    ['repo Secrets ו-url מדויק', 'argocd/operate/#repo-secrets'],
    ['Synced, Healthy, Unknown: איך קוראים', 'argocd/operate/#קריאת-הסטטוסים'],
  ]},
  { tab: 'Observability', href: 'observability/overview/', links: [
    ['label `namespace` ב-Prometheus', 'observability/overview/#prometheus-גילוי-pods-ו-relabel-ל-namespace'],
    ['Grafana: admin מ-Secret', 'observability/overview/#grafana-admin-מ-secret-קיים'],
  ]},
  { tab: 'דיבוג ותקלות', href: 'debugging/overview/', links: [
    ['איך קוראים שגיאה: מלמטה למעלה', 'debugging/overview/#דוגמה-פירוק-שגיאה-שכבתית'],
    ['תקלות: Pipeline · Argo · Pods', 'debugging/symptoms/'],
    ['באגים של סביבה: DNS, push, CRLF', 'debugging/env-cards/'],
  ]},
  { tab: 'אימות וניקוי', href: 'verify/overview/', links: [
    ['סולם האימות מלמטה למעלה', 'verify/overview/'],
    ['בדיקת promotion מקצה לקצה', 'verify/overview/#בדיקת-promotion-מקצה-לקצה'],
    ['סדר ה-cleanup', 'verify/cleanup/#סדר-הניקוי'],
    ['צ׳קליסט MUST לפני הגשה', 'verify/cleanup/#צקליסט-must-לפני-הגשה'],
  ]},
];
