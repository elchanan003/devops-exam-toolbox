# CONTENT-GUIDE — authoring rules for the DevOps Exam Toolbox

Every page in this site follows these rules. Read this file fully before writing or editing content.

## 1. Who reads this and how

A student in a practical DevOps exam, **without AI**, under a clock. They do not read — they **scan**, find,
copy, replace placeholders, and move on. Every rule below serves that:

- Find in seconds: task-oriented headings, Ctrl+K search, short pages.
- Copy safely: every command is complete, verified, and says **where it runs**.
- Avoid known traps: the mistakes the student actually made are called out at the point of use.
- Know it worked: every task ends with a verify command and what "good" looks like.

This is a **toolbox, not a solution guide**. Generic patterns with placeholders, with the TRIDENT practice
project as the worked example. Never write "the answer to the exam".

## 2. Language

- Prose is **Hebrew**. Code, commands, file names, keys, UI labels and technical terms stay **English**.
- **Never translate** these (write them in English, in backticks when they are identifiers):
  repo, branch, commit, merge, rebase, push, pull, fetch, clone, tag, remote, HEAD, stash, pipeline, job,
  stage, runner, executor, artifact, token, scope, role, deploy token, service account, access token,
  group, project, namespace, Pod, Deployment, Service, Secret, ConfigMap, PVC, StorageClass, Ingress,
  probe, NetworkPolicy, values, chart, release, template, Argo CD (or Argo), Application, root app,
  sync, selfHeal, prune, Synced, Healthy, OutOfSync, registry, image, Dockerfile, build context,
  kubelet, kubectl, Helm, GitLab, GitOps, CI/CD, Mask, Protect, protected branch.
  Bad: "מאגר", "צינור", "ענן", "אסימון", "מרחב שמות", "סוד". Good: "ה-repo", "ה-pipeline", "ה-token".
  (ענף for branch is acceptable in running prose; prefer `branch` in headings and tables.)
- Hebrew + English mixing: put English identifiers in backticks (they render LTR-isolated). For a plain
  English phrase inside a Hebrew sentence that ends with punctuation, wrap it: `<bdi>Synced + Healthy</bdi>`
  (MDX pages only) or rephrase so the English isn't at the end.
- Tone: direct, calm, no promotion, no "בואו נלמד". Second person singular is fine ("הרץ", "בדוק").

## 3. Page skeleton

```md
---
title: <Hebrew title, may contain English terms>
description: <one Hebrew sentence — shown in search results>
sidebar:
  order: <n>          # 1,2,3… within the tab folder
---

:::note[בקצרה]
2–4 lines: what this is, why it exists in the flow, when you reach for this page.
:::

## <task heading — "ליצור branch ולדחוף אותו">

1–3 lines of context (only what's needed to choose correctly).

```bash title="runs on: VM"
<command>
```

**איך מוודאים:** the verify command + what good output looks like.
```

- One H2 = one task / one question the student would ask. Headings are what they search for: include the
  key English term (`reset --hard`, `ImagePullBackOff`, `dotenv`) in the heading where natural.
- H3 only for sub-variants. No H4.
- Each **tab** has an intro page `overview.md` with `sidebar.order: 1` whose first block is the `בקצרה` note
  describing the tab itself (purpose of this area, environments involved, how it fits the flow).
- Page length: about 3–6 screens max. Longer → split into two pages in the same folder.
- Tables for comparisons and lookups (flag → meaning, symptom → cause). Keep cells short.

## 4. Code blocks

- Always a language (`bash`, `yaml`, `text`, `json`, `ini`, `dockerfile`) and a **title saying where it runs**:
  - `title="runs on: VM"` — the lab VM shell (kubectl, helm, bootstrap scripts, docker)
  - `title="runs on: Mac"` — the student's laptop (only where it truly differs; on exam day the VM may be all they have)
  - `title="runs on: any shell"` — git and generic bash that works anywhere
  - `title="runs on: CI job"` — inside a GitLab CI job script (variables come from GitLab, not from `export`)
  - `title="file: <path>"` — file contents (e.g. `title="file: gitops/argocd/apps/dev.yaml"`)
  - `title="GitLab UI"` — a text block describing a click path
- **Comments inside code are English only** (Hebrew inside LTR code renders badly).
- Commands must be complete and copy-paste-runnable after replacing placeholders. No `...` inside a command
  unless it is a literal file excerpt clearly marked `# … (rest unchanged)`.
- No trailing whitespace, no line-continuation `\` followed by spaces (a real recurring bug of this student).
- Prefer one command per line over long `&&` chains, unless the chain is the point.

## 5. Placeholders

- Format: `<UPPER_SNAKE>` only. The site highlights this pattern automatically inside code.
- Fixed vocabulary — use these exact names; add a new one only if none fits, and add it here:

| Placeholder | Meaning | TRIDENT example |
|---|---|---|
| `<GROUP>` | GitLab group **path** (not display name) | `trident-lab00` |
| `<REPO>` | GitLab project path | `trident-gitops` |
| `<GITLAB_HOST>` | GitLab host | `gitlab.com` |
| `<BRANCH>` | branch name | `dev` |
| `<TAG>` | git tag | `v1.0.0` |
| `<SHA>` | commit sha | `78e24670` |
| `<ENV>` | environment name | `dev` / `staging` / `prod` |
| `<NS>` | Kubernetes namespace | `trident-dev` |
| `<APP>` | Argo CD Application name | `trident-dev` |
| `<RELEASE>` | Helm release name | `trident` |
| `<CHART_DIR>` | path to a chart directory | `charts/nxs-universal-chart` |
| `<REGISTRY>` | registry host | `registry.gitlab.com` |
| `<IMAGE>` | full image path without tag | `registry.gitlab.com/trident-lab00/trident-source/ingest-api` |
| `<CANDIDATE>` | image tag / candidate id | `dev-20261001-78e24670` |
| `<SECRET>` | Secret name | `trident-registry` |
| `<HOST>` | DNS host name | `dev.trident.test` |
| `<VM_IP>` | lab VM IP | `192.168.242.130` |
| `<PORT>` | port / NodePort | `31651` |
| `<TOKEN_FILE>` | path of a file holding a token | `~/.local/share/trident/repo/gitops/token` |
| `<USER>` | username (bot / deploy token user) | `gitlab+deploy-token-1` |
| `<SERVICE>` | microservice name | `ingest-api` |
| `<FILE>` | a file path | `apps/trident/versions/dev.yaml` |
| `<NS_PREFIX>` | namespace prefix before the env | `trident` |
| `<DIR>` | a directory path | `~/.local/share/trident` |
| `<KEY>` | a key inside a Secret/ConfigMap | `postgres_password` |
| `<DOMAIN>` | DNS domain for env hosts | `trident.test` |
| `<VAR_NAME>` | an environment variable name | `TRIDENT_GITOPS_URL` |
| `<EMAIL>` | an email for git identity | `trident-ci@noreply` |
| `<APP_DIR>` | secret mount sub-directory name: `mountPath: /run/secrets/<APP_DIR>` (never `/run/secrets` itself). Not the same as `<APP>` | `trident` |
| `<POD>` | Pod name | `postgres-0` |
| `<CONTAINER>` | container name inside a Pod | `postgres` |
| `<PVC>` | PersistentVolumeClaim name | `postgres-data-postgres-0` |
| `<RESOURCE>` / `<KIND>` / `<FIELD>` | Kubernetes resource type / kind / field path (for `kubectl explain`, `api-resources`) | `statefulset` / `ingress` / `volumeClaimTemplates` |
| `<LABEL>` | a `key=value` label selector | `trident.dev/service=ingest-api` |
| `<URL>` | a git remote URL | `git@gitlab.com:trident-lab00/trident-gitops.git` |
| `<BASE64>` | a base64 string | (none) |

- Show the TRIDENT value on the line **below** as a comment, only where it helps:
  ```bash
  git clone git@<GITLAB_HOST>:<GROUP>/<REPO>.git
  # TRIDENT: git clone git@gitlab.com:trident-lab00/trident-gitops.git
  ```
- **Full scripts** declare a variables block once at the top and use `$VARS` below — the student edits only the top:
  ```bash
  GROUP="<GROUP>"          # TRIDENT: trident-lab00
  ENVS="dev staging prod"
  ```
- Never put a real token, password or key in the site. Token values are always `<TOKEN_FILE>` or read with `read -rs`.

## 6. Callouts (Starlight asides)

| Use | Syntax | When |
|---|---|---|
| Tab/page intro | `:::note[בקצרה]` | first block of every page, 2–4 lines |
| Real trap | `:::caution[מלכודת · קרה בתרגול]` | a mistake the student actually made (source: `scenarios.md` items tagged REAL). State: symptom → cause → fix, 2–4 lines |
| Known trap (not hit yet) | `:::caution[מלכודת]` | documented course gotchas |
| Destructive | `:::danger[זהירות]` | `reset --hard`, `push --force`, deleting namespaces/Secrets/Applications |
| Principle | `:::tip[עיקרון]` | one transferable rule per section at most |

Don't stack more than two callouts in a row. A callout is never longer than the content it decorates.

## 7. Accuracy

- **Every command and flag must be verified** on this machine before it goes in (git, bash, kubectl, helm,
  docker, jq, gitlab-runner, openssl, ssh-keygen are installed here). Use `--help`, `man`, or a harmless run
  (e.g. `kubectl create secret generic x --from-literal=a=b --dry-run=client -o yaml` needs no cluster).
  If something can't be verified locally (GitLab UI paths, Argo behaviour), take it from the research files
  or official docs; if still unsure, leave it out.
- GitLab tier facts (from research, verified 2026-09-28): on **gitlab.com Free** there are **no project/group
  access tokens** and **no group runners**; **service accounts** and **deploy tokens** are available; PATs are
  the fallback. Present both the Free path and the paid path briefly — the exam GitLab may differ.
- Don't present `helm template --debug` line numbers as a reliable way to find a render error (it was not, in
  practice). Use differential + isolation (see Debugging).
- Argo polling interval varies (≈3 min default; 30s in some course labs) — don't hard-code a number.

## 8. Focus and cross-linking

- No theory essays. Background only when it changes what you type.
- One home per topic. The **master troubleshooting table lives in `debugging/`**; other tabs link to it
  rather than duplicating. Bash full-script templates live in `bash/`; other tabs link to them.
- File names are short English kebab-case slugs **without number prefixes** (`git/undo.md` → URL `git/undo/`);
  order comes from `sidebar.order`. A slug, once published, doesn't change (links depend on it).
- Links are **relative** (`../../git/undo/`), never root-absolute (`/git/…`) — the site is served under
  `/devops-exam-toolbox/`. Check the built `dist/` for the exact slug before linking.

## 9. Sources (read-only)

- `~/Claude-Final/toolbox-research/scenarios.md` — real events, errors, fixes, weak spots (with line refs to PROGRESS.md)
- `~/Claude-Final/toolbox-research/trident-patterns.md` — supplied bash idioms, CI yml, Argo shapes, chart APIs, fixed names
- `~/Claude-Final/toolbox-research/design-tech.md` — Starlight/RTL facts
- `~/Claude-Final/PROGRESS.md`, `~/Claude-Final/00-MASTER-study-plan.md` — tutoring log and master plan
- `~/00_devops_course/00_devops_course_public/00_Final_Exercise/Exercises/TRIDENT/` — the practice project. **Never modify.**

## 10. Done means

- `npm run build` passes with zero warnings about your pages.
- Every page: frontmatter + `בקצרה` + task H2s + every code block titled + verify lines.
- `grep -n ' $'` on your files returns nothing; no placeholder outside the vocabulary.
