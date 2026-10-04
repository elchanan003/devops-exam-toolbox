// Single list of tabs: [Hebrew label, folder under src/content/docs]. Adding a tab = one line.
const tabs = [
  ['שליפה מהירה', 'quick'],
  ['התמונה הגדולה', 'architecture'],
  ['Git', 'git'],
  ['SSH וגישה', 'ssh'],
  ['GitLab', 'gitlab'],
  ['GitLab CI', 'ci'],
  ['Docker ו-Registry', 'docker'],
  ['Bash וסקריפטים', 'bash'],
  ['Helm', 'helm'],
  ['Kubernetes', 'kubernetes'],
  ['Argo CD', 'argocd'],
  ['Observability', 'observability'],
  ['דיבוג ותקלות', 'debugging'],
  ['אימות וניקוי', 'verify'],
];

export default [
  { label: 'דף הבית', link: '/' },
  ...tabs.map(([label, directory]) => ({ label, collapsed: true, items: [{ autogenerate: { directory } }] })),
];
