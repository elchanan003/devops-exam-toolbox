// Home page index: one block per tab, each with its most-used tasks as deep links.
// href is relative to the site base (no leading slash). Add a block = add an object; order = display order.
export const firstAid = [
  { href: 'debugging/symptoms/', title: 'טבלת תקלות', text: 'הודעת שגיאה ← סיבה ← פקודת בדיקה' },
  { href: 'architecture/overview/', title: 'איפה זה רץ?', text: 'VM, CI job, GitLab UI, Argo — ומאיפה המשתנים' },
  { href: 'bash/templates/', title: 'סקריפטים מלאים', text: 'prepare, promote, cleanup — להעתקה' },
  { href: 'verify/overview/', title: 'סולם האימות', text: 'מלמטה למעלה, עם פקודה לכל שלב' },
];

export const index = [
  { tab: 'התמונה הגדולה', href: 'architecture/overview/', note: 'repos · flow · credentials', links: [
    ['פיצול ה-repos והזרימה מקצה לקצה', 'architecture/overview/'],
    ['מפת credentials: מי קורא, מי כותב', 'architecture/credentials/'],
    ['Compose → Kubernetes/Helm', 'architecture/compose-to-k8s/'],
    ['איך קוראים את ה-contract וסדר העבודה', 'architecture/exam-method/'],
  ]},
  { tab: 'Git', href: 'git/overview/', note: 'branches · undo · push', links: [
    ['ליצור branch, לעבור, לדחוף כמה branches', 'git/branches/'],
    ['`pull`, `merge --ff-only`, diverged', 'git/sync/'],
    ['לדחוף branch מסוים / `HEAD:main`', 'git/sync/'],
    ['`reset` soft/mixed/hard, `revert`, `reflog`', 'git/undo/'],
    ['לחזור ל-commit ישן, לערוך commit', 'git/undo/'],
    ['CRLF, רווחים בסוף שורה', 'git/hygiene/'],
  ]},
  { tab: 'SSH וגישה', href: 'ssh/overview/', note: 'keys · config', links: [
    ['מפתח חדש ל-GitLab מאפס', 'ssh/overview/'],
    ['`~/.ssh/config` ו-`IdentitiesOnly`', 'ssh/overview/'],
    ['Welcome אבל "project not found"', 'ssh/overview/'],
  ]},
  { tab: 'GitLab', href: 'gitlab/overview/', note: 'tokens · roles · runners', links: [
    ['service account, PAT, deploy token — מה למי', 'gitlab/identities/'],
    ['role מול scope', 'gitlab/permissions/'],
    ['CI/CD variables: Mask מול Protect', 'gitlab/variables/'],
    ['רישום runner ו-tags', 'gitlab/runners/'],
    ['Container registry ו-pull credentials', 'gitlab/registry/'],
  ]},
  { tab: 'GitLab CI', href: 'ci/overview/', note: 'pipeline · promotion', links: [
    ['מילון keywords: `needs`, `rules`, `extends`', 'ci/keywords/'],
    ['candidate tag דרך `dotenv`', 'ci/patterns/'],
    ['build/publish loop', 'ci/patterns/'],
    ['promote jobs ו-prod ידני', 'ci/patterns/'],
    ['משתנים מוגדרים מראש', 'ci/overview/'],
  ]},
  { tab: 'Docker ו-Registry', href: 'docker/overview/', note: 'build · push', links: [
    ['build context ו-`COPY`', 'docker/overview/'],
    ['אנטומיה של image ref', 'docker/overview/'],
    ['`docker login` ו-push', 'docker/overview/'],
    ['`daemon.json`: DNS ו-"blob unknown"', 'docker/overview/'],
  ]},
  { tab: 'Bash וסקריפטים', href: 'bash/overview/', note: 'basics · templates', links: [
    ['exit codes, `if !` ו-`set -e`', 'bash/overview/'],
    ['`export` מול משתנה CI', 'bash/overview/'],
    ['create|apply אידמפוטנטי ועוד snippets', 'bash/snippets/'],
    ['`prepare-environment.sh`, `promote.sh`, `cleanup.sh`', 'bash/templates/'],
    ['סקריפט verify עם PASS/FAIL', 'bash/verify-script/'],
  ]},
  { tab: 'Helm', href: 'helm/overview/', note: 'values · template · tests', links: [
    ['`helm template` עם כמה `-f`', 'helm/overview/'],
    ['שכבות values: מי גובר', 'helm/overview/'],
    ['nxs-universal-chart, postgres, redis', 'helm/values/'],
    ['בדיקת values מוזרקים, `required`, schema', 'helm/testing/'],
  ]},
  { tab: 'Kubernetes', href: 'kubernetes/overview/', note: 'kubectl · secrets · ingress', links: [
    ['kubectl לפי משימה, `jsonpath`', 'kubernetes/overview/'],
    ['Secrets: generic, docker-registry, tls', 'kubernetes/secrets/'],
    ['Ingress, TLS ו-`curl --resolve`', 'kubernetes/networking/'],
    ['PVC Pending ו-StorageClass', 'kubernetes/storage-probes/'],
  ]},
  { tab: 'Argo CD', href: 'argocd/overview/', note: 'apps · sync · status', links: [
    ['root app ו-app-of-apps', 'argocd/overview/'],
    ['multi-source עם `ref: values`', 'argocd/applications/'],
    ['`syncPolicy`: selfHeal מול prune', 'argocd/applications/'],
    ['repo Secrets ו-url מדויק', 'argocd/operate/'],
    ['Synced, Healthy, Unknown — איך קוראים', 'argocd/operate/'],
  ]},
  { tab: 'Observability', href: 'observability/overview/', note: 'prometheus · grafana', links: [
    ['label `namespace` ב-Prometheus', 'observability/overview/'],
    ['Grafana: admin Secret ו-dashboard', 'observability/overview/'],
  ]},
  { tab: 'דיבוג ותקלות', href: 'debugging/overview/', note: 'method · symptoms', links: [
    ['איך קוראים שגיאה: מלמטה למעלה', 'debugging/overview/'],
    ['טבלת תקלות לפי שכבה', 'debugging/symptoms/'],
    ['באגים של סביבה: DNS, push, CRLF', 'debugging/env-cards/'],
  ]},
  { tab: 'אימות וניקוי', href: 'verify/overview/', note: 'ladder · cleanup', links: [
    ['סולם האימות מלמטה למעלה', 'verify/overview/'],
    ['בדיקות self-heal ו-prune', 'verify/overview/'],
    ['סדר ה-cleanup ורשימת MUST', 'verify/cleanup/'],
  ]},
];
