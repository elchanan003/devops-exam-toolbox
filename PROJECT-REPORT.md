# DevOps Exam Toolbox — Project Report

Handoff document for whoever continues developing the site. It records what exists, why it was built this way,
which commands were verified (and how), what was corrected along the way, what is still unverified, and what to do next.

- **Report date:** 2026-10-04, updated 2026-10-05 (round 3: the "גישה למבחן" / `playbook` tab — see §14)
- **Live site:** https://elchanan003.github.io/devops-exam-toolbox/
- **Repo:** https://github.com/elchanan003/devops-exam-toolbox (public)
- **Local path:** `~/devops-exam-toolbox`
- **Companion docs in the repo:** `README.md`, `AGENT_GUIDE.md` (how to maintain), `CONTENT-GUIDE.md` (authoring rules),
  `PRODUCT.md` (product record), `DESIGN.md` + `.impeccable/design.json` (design system), this file.

---

## 1. Purpose and audience

One DevOps student sits a **practical final exam with web access but no AI**: they receive a project like
TRIDENT (a Docker Compose POC) and must migrate it to **Argo CD GitOps with Helm** across several GitLab repos, with GitLab CI
(dev → staging → manual prod promotion), scoped tokens, bootstrap bash scripts, and verification.

The site is a **toolbox, not a solution guide**: generic patterns with placeholders, the TRIDENT practice project as the worked
example. The reader is under a clock: they scan, find a command, copy it, replace placeholders, and go back to the terminal.
Every design and content decision below serves that.

Product principles (from `PRODUCT.md`):
1. Speed of finding beats beauty.
2. Every command is correct, complete, and says where it runs.
3. Traps appear at the point of use, sourced from real practice.
4. Generic patterns with a concrete example, never the exam's answer.
5. Focus over completeness: one home per topic, cross-link instead of duplicating.

---

## 2. Snapshot

| Item | Value |
|---|---|
| Content pages | **54** (`src/content/docs/<tab>/*.md`) + `index.mdx` (home); 44 before round 3 |
| Tabs | 15 (13 original + quick reference in round 2 + playbook in round 3) |
| Content size | ~6,500 lines of Markdown, ~340 fenced code blocks (every block has a `title=`) |
| Stack | Astro **7.3.5**, Starlight **0.42.5**, `@astrojs/markdown-remark` 7.3.1, `unist-util-visit` 5.1 |
| Fonts | `@fontsource` Heebo (body), Rubik (headings), JetBrains Mono (code only) — self-hosted via npm, no Google Fonts requests |
| Search | Pagefind (built into Starlight), index generated at build |
| Deploy | GitHub Actions (`.github/workflows/deploy.yml`: `actions/checkout@v7`, `withastro/action@v6`, `actions/deploy-pages@v5`, Node 24) on push to `main`; Pages source = "GitHub Actions" |
| Internal links | 0 broken links/anchors across ~3,500 hrefs (checked after the last content change) |
| Live checks | RTL (`dir=rtl`), fonts load, all 42 sidebar links return 200, 0 asset 4xx, Ctrl+K search finds `reset --hard`, `ImagePullBackOff` and a Hebrew term |

---

## 3. Decisions and the reasoning behind them

| Decision | Chosen | Why / alternatives rejected |
|---|---|---|
| Hosting | **GitHub Pages** | The user's previous guides (`skywatch-007`, `gitops-ci-guide`, `k8s-exam-kit`) already use it; `gh` is authenticated on the VM. GitLab Pages would need GitLab auth that does not exist on the machine. |
| Framework | **Astro Starlight** | Built-in RTL + Hebrew UI strings, Pagefind search (Ctrl+K), Expressive Code (copy button, titled frames), sidebar generated from folders, asides/callouts. Adding a page = adding a file. A custom `build.py` (as in the 007 guide) would have meant hand-building search, copy buttons and nav. |
| Language | Hebrew prose, **all technical terms English and never translated** | Avoids confusing translations ("מאגר", "צינור", "אסימון"). Inline English goes in backticks (renders LTR-isolated). |
| Generic vs TRIDENT-specific | Generic `<PLACEHOLDERS>` + a `# TRIDENT:` example line | The exam project will differ from TRIDENT; the student still needs to see what a correct value looks like. |
| Grounding | Real events from the tutoring log (`~/Claude-Final/PROGRESS.md`, sessions 1–9) | The user asked that traps and commands reflect what actually went wrong. Traps from real events are tagged `:::caution[מלכודת · קרה בתרגול]`; documented-but-not-hit gotchas use plain `:::caution[מלכודת]`. |
| Home page | **Dense tab index** (back-of-book index, no hero, no icon cards) | Chosen by the user from three options (the other two: "exam-day run sheet", "where-does-this-run matrix"). Gives two clicks to any command; deep links go to exact H2 anchors. |
| Theme | Dark default + light; green-tinted neutrals, one teal accent, amber placeholder chips, hairlines instead of boxes | Carried over from the user's earlier guides (accent `#0c6b5b` / `#41c4aa`). Light ground `#f3f5f3`, dark ground `#0d1310`. |
| One home per topic | Master troubleshooting table only in `debugging/symptoms`; full scripts only in `bash/templates`; credential map in `architecture/credentials`, the *how* in `gitlab/identities` | A student under pressure must not meet two slightly different versions of the same fact. |
| Extensibility | One folder per tab; **one line** in `src/sidebar.mjs` per tab; home index is data (`src/data/home-index.mjs`) | The user asked for a structure that changes without friction. Verified by adding a dummy tab (+1 page, appeared in sidebar and home) and reverting. |
| Placeholders highlighted automatically | `src/plugins/placeholders.mjs` | Authors add no markup. A remark plugin appends an Expressive Code regex text-marker to every code block; a rehype plugin wraps tokens inside inline `code` in `span.ph`. |
| `runs on:` code titles | Mandatory on every block | Directly targets the student's #1 recurring confusion: "where does this run → where do its variables come from" (VM shell vs CI job vs GitLab UI vs Argo). |
| No hard-coded NodePort/IP | Always discover: `kubectl -n ingress-nginx get svc` | The port differed between documents (`31024`, `31651`, `31731`). Pages label any number as a TRIDENT example. |

### Process decisions (how it was built)

- The work was split across **parallel Sonnet agents with disjoint folder ownership** (no merge conflicts), preceded by research agents
  and followed by a dedicated accuracy/consistency reviewer and an independent verification agent. Rationale: breadth (14 tabs) in
  parallel, then an adversarial pass to catch what writers miss.
- All **design** work went through the `impeccable` skill (the user's standing rule): `PRODUCT.md` → direction contract
  (`.impeccable/surfaces/src-content-docs-index-mdx.md`) → build → finish review (8 fixes, all scored *resolved*, disposition *ship*)
  → `DESIGN.md`.
- A **commit after each phase** so a killed session loses little (this mattered: see §9).

---

## 4. Repository layout

```
astro.config.mjs        site/base (/devops-exam-toolbox), Starlight config, Hebrew root locale dir:rtl,
                        markdown.smartypants:false, remark/rehype placeholder plugins
src/sidebar.mjs         THE tab list: [Hebrew label, folder]. New tab = 1 line.
src/content.config.ts   Starlight content collection
src/content/docs/       index.mdx + <tab>/<slug>.md (slug = short kebab-case, no number prefix; order via frontmatter)
src/components/         RunsOn.astro (badge), TabIndex.astro (home index renderer)
src/data/home-index.mjs home index data: firstAid[] row + index[] blocks {tab, href, links:[label, href-with-anchor]}
src/plugins/            placeholders.mjs (see above)
src/styles/             fonts.css (fontsource imports), custom.css (the whole design system, 10 numbered sections)
public/favicon.svg      teal rounded square with a prompt glyph
.github/workflows/      deploy.yml
CONTENT-GUIDE.md        authoring rules (placeholder vocabulary, callouts, code titles, accuracy rules)
AGENT_GUIDE.md          maintenance guide
DESIGN.md / PRODUCT.md  design system / product record (impeccable)
.impeccable/            design.json, surfaces/ (direction contract); review/ is gitignored
```

Sidebar groups use `{label, collapsed: true, items: [{autogenerate: {directory}}]}` — Starlight 0.42 rejects `autogenerate` on a
group that also has a `label`. Sidebar item text comes from frontmatter `sidebar.label` where set (the prefix "Git —" was dropped
from labels so items fit on one line); the page `title` keeps the prefix, so search results still show it.

### How to extend

- **New page:** create `src/content/docs/<tab>/<slug>.md` with frontmatter (`title`, `description`, `sidebar.order`), start with
  `:::note[בקצרה]`. If it should appear on the home page, add a link to `src/data/home-index.mjs` (anchor = slugified H2).
- **New tab:** create `src/content/docs/<tab>/overview.md` (`sidebar.order: 1`) + one line in `src/sidebar.mjs` + an index block in
  `src/data/home-index.mjs`.
- **Never rename a published slug or H2 casually:** the home index, the quick-reference tab and many cross-links depend on exact
  anchors. After any rename run the link check (§10).
- **Placeholders:** use only the vocabulary in `CONTENT-GUIDE.md` (see §5); add new ones to its table.

---

## 5. Authoring conventions (enforced by review, summarised from `CONTENT-GUIDE.md`)

- **Page skeleton:** frontmatter → `:::note[בקצרה]` (2–4 lines) → task-oriented H2s → command → `**איך מוודאים:**` line.
- **Code block titles:** `runs on: VM | Mac | any shell | CI job`, `file: <path>`, or `GitLab UI`. Comments inside code are English only.
- **Callouts:** `note` = `בקצרה` intro; `caution` = trap (real or documented); `danger` = destructive (`reset --hard`, `--force`, delete);
  `tip` = one transferable principle.
- **Placeholder vocabulary** (`<UPPER_SNAKE>` only): `GROUP REPO GITLAB_HOST BRANCH TAG SHA ENV NS APP RELEASE CHART_DIR REGISTRY IMAGE
  CANDIDATE SECRET HOST VM_IP PORT TOKEN_FILE USER SERVICE FILE NS_PREFIX DIR KEY DOMAIN VAR_NAME EMAIL APP_DIR POD CONTAINER PVC RESOURCE
  KIND FIELD LABEL URL BASE64`. Note `<APP>` = Argo CD Application name, while `<APP_DIR>` = the Secret mount sub-directory.
- **Full scripts** declare a variables block at the top (`GROUP="<GROUP>"  # TRIDENT: trident-lab00`) and refuse to run while a
  `<PLACEHOLDER>` is left in it (guards against the "placeholder left behind" failure seen in real submissions).
- **Relative links only** (site is served under `/devops-exam-toolbox/`).
- **No number prefixes in file names;** order comes from `sidebar.order` (`bash/toolbelt` uses `2.5` to sit between snippets and
  templates — the build accepts it, but its sidebar position was not visually confirmed).

---

## 6. Content inventory

Line counts are approximate (after round 2). "Real traps" = items sourced from the tutoring log.

### שליפה מהירה — `quick/` (1 page, 175 lines)
One-screen lifeline. A 5-row **emergency table** (symptom class → first command → page) plus the most-used commands per area (Git, GitLab/CI,
Docker, Bash, Helm, kubectl, Argo CD, curl/verify, cleanup), each block linking to its full page. Commands are copied from the full pages
(single source of truth); the verification agent aligned them exactly.

### התמונה הגדולה — `architecture/` (4 pages)
- `overview` (112): one-sentence rule (Git is the only way to change the cluster), repo split derived from *who reads / who writes / what
  changes at which pace*, end-to-end flow diagram, environments ≠ branches, promotion ladder + candidate string, the canonical **"where does this
  run?"** table (laptop / VM / CI job / GitLab UI / Argo).
- `credentials` (59): the credential map (actor → needs → credential → scope/role → where stored → what breaks).
- `compose-to-k8s` (57): Compose → K8s/Helm mapping table with the chart key for each; least-knowledge `envConfigmaps`; why Secrets are files.
- `exam-method` (73): reading the contract (MUST/SHOULD/TODO/`exit 1`), order of work, "never fix live", logging evidence, common process failures.

### Git — `git/` (5 pages, ~860 lines)
`overview` (setup, clone, status, first 5 minutes on a fresh VM, who last changed a file), `branches` (create/switch/push `-u`/multiple branches,
tags lightweight vs annotated, tracking, merge), `sync` (fetch vs pull vs `merge --ff-only`, divergence, `rejected (non-fast-forward)`, force-push
danger, pushing a specific branch / `HEAD:<BRANCH>`), `undo` (emergency trio, restore/unstage, amend, fixup + `rebase -i`, reset soft/mixed/hard vs
revert vs restore table, reflog, detached HEAD, cherry-pick, stash, clean), `hygiene` (`git diff --check`, CRLF, `.gitattributes`, `[skip ci]`,
pre-push checklist).
Real traps: stale clone, pull refuses rather than overwrites, `--force` would delete the CI commit, `--ff-only` failing due to a stray
unpushed commit, `reset --hard <sha>` no-op (argument = destination), push only the current branch, tags need their own push, group path vs
display name in clone URLs, unpushed work is invisible to Argo.

### SSH וגישה — `ssh/overview` (213)
Key generation, registering `.pub`, `ssh -T`, `~/.ssh/config` + `IdentitiesOnly`, the `-F /dev/null` fresh-machine test, `GIT_SSH_COMMAND`
diagnosis, permissions 700/600, `ssh -v`, fingerprints, `known_hosts`, `oauth2:<token>@` HTTPS clone, fresh-VM checklist.
Real traps: default key names vs config, "server picks the key" (it's the client), Welcome ≠ authorization.

### GitLab — `gitlab/` (6 pages)
`overview` (group path vs display name, create group/project/branch, single **"where in the UI" table**), `identities` (decision table actor →
identity; Free vs Premium; service account / PAT / deploy token / access tokens), `permissions` (role vs scope as two independent layers, capability
table, protected branches, 403 diagnosis), `variables` (Mask vs Protect, the `promote:dev` trap, CI vars invisible in the shell), `runners`
(`glrt-` register flow, tags + scope, pending/stuck table, docker group), `registry` (path anatomy, push vs pull identity, deploy token →
`docker-registry` Secret, JWT 200/401 check).
Real traps: Argo-reader "Access denied" because the bot was not a member (fix = Reporter, not Developer), Protect ON → empty token on unprotected
`dev`, bootstrap URLs set as CI variables, `gitlab-runner run` started by hand, runner scope vs tags.

### GitLab CI — `ci/` (3 pages)
`overview` (anatomy, variable sources, predefined vars, triggering without a code change, retry vs new pipeline, CI Lint), `keywords` (dense table +
one snippet per keyword using the real TRIDENT `source.yml`), `patterns` (candidate via dotenv, build/publish loops, promote family, manual prod gate,
thin include, self-test job, idempotent push, the `promote:prod` click path).
Corrected fact: with `when: manual` inside `rules`, `allow_failure` defaults to `false`, so the pipeline stays *blocked* until the click.

### Docker — `docker/overview` (188)
Build vs run, build context and `COPY` paths, image ref anatomy (tag = after the **last** `:`), login `--password-stdin`, push loop, `image inspect`,
`manifest inspect`, `system df`, and the two **environment cards** (DNS via `daemon.json` `dns`; Docker 29 containerd image store →
`features.containerd-snapshotter: false` for "blob unknown to registry"; switching stores empties images, so re-run the full pipeline).

### Bash — `bash/` (5 pages, ~1,280 lines)
`overview` (essentials: exit codes, `if !` and the `set -e` exemption, `export` vs CI variable, `read -rs`, umask/printf, trailing space after `\`,
CRLF fix, `cd` inside scripts), `snippets` (12 reusable blocks), `toolbelt` (diagnostic one-liners: `set -x`, `trap ERR`, grep/sed/awk/jq/curl,
`cat -A`), `templates` (five **full scripts**: `prepare-environment.sh`, `prepare-observability.sh`, `cleanup.sh`, `promote.sh`, credential-file
writer — each with a variables block, contract header, verify steps), `verify-script` (PASS/FAIL skeleton + value-injection tests with a negative
self-test).

### Helm — `helm/` (3 pages)
`overview` (pre-flight `helm template` with repeated `-f`; "`-f` always takes the next word"; `-s`; `grep -c` assertions; show/pull; layering: later
wins, maps merge, lists replace; `fullnameOverride`; YAML traps; render errors), `values` (reading a chart API, nxs-universal-chart cheat sheet,
postgres + redis keys, ingress hostname-twice trap, the `/run/secrets/<APP_DIR>` fix), `testing` (value-injection tests, `required`, lint ≠
template, `values.schema.json`, `kubectl --dry-run=client -o json | jq`, CI job, minimal chart from scratch).

### Kubernetes — `kubernetes/` (4 pages)
`overview` (kubectl by task; "no logs = container never started → describe Events"; `logs -c/--previous`; `explain` as offline docs),
`secrets` (generic / docker-registry / tls, the per-namespace rule, idempotent create|apply, file vs env), `networking` (short name vs FQDN, Ingress +
TLS, `curl --resolve`, reading `/info`, `quick-transit`, NetworkPolicy, CNI caveat), `storage-probes` (PVC/StorageClass, the postgres Pending ladder,
immutable `volumeClaimTemplates` procedure, StatefulSet vs Deployment replacement, probes).

### Argo CD — `argocd/` (3 pages)
`overview` (only applier, app-of-apps, bootstrap edge, flow after a promote commit, UI + admin password, no CLI), `applications` (root app,
multi-source with `ref: values`, kustomize directory source, `targetRevision` tag vs branch, `syncPolicy`, finalizers, "where each value comes from"
table), `operate` (repo Secrets, byte-exact URL, status table, ComparisonError, kubectl-only ops, self-heal/prune tests, **manual sync after a
failed automated sync**).

### Observability — `observability/overview` (179)
Prometheus pod discovery + `namespace` relabel, verifying the label, Grafana admin Secret, ingress + TLS, `$${}` escaping, kustomize dashboard source,
failure table, red `observability` Application ordering (prepare script → Secrets → manual sync), Loki/Tempo/Alloy as SHOULD.

### דיבוג ותקלות — `debugging/` (3 pages)
`overview` (method), `symptoms` (**the master table**, 8 layers: Pipeline, Git & auth, Render, Argo, Pods, Ingress/TLS, Data, Observability;
exact error strings in backticks so search finds them), `env-cards` (summary cards linking to `docker/overview` for detail).

### אימות וניקוי — `verify/` (2 pages)
`overview` (7-rung bottom-up ladder, per-environment `/info` loop, final-state check), `cleanup` (root-first order, verify-clean, the idempotency
sequence, 12-item MUST checklist).

---

## 7. Real events encoded (source: `PROGRESS.md` sessions 1–9)

These are the traps with the highest value; each is on its owning page and in `debugging/symptoms`.

| Event | Exact signal | Fix (where) |
|---|---|---|
| `$values` used in bash | empty at render; `$values` exists only inside Argo | `helm/overview` |
| `-f` swallowed the chart path | `Error: open …: no such file or directory` / `non-absolute URLs should be in form of repo_name/path_to_chart` | `helm/overview` |
| Secret mounted at `/run/secrets` | `StartError … mounting … /var/run/secrets/kubernetes.io … read-only file system` — collides with the service-account token mount; hit **postgres and signal-processor** | mount at `/run/secrets/<APP_DIR>`, env points at the **file** (`helm/values`, `kubernetes/*`) |
| PVC Pending | `unbound immediate PersistentVolumeClaims`, `STORAGECLASS` column empty | `storage.className` in **values/Git**; making the class default is the wrong fix (`kubernetes/storage-probes`) |
| StatefulSet immutable | `updates to statefulset spec for fields other than 'replicas', 'ordinals', 'template', … are forbidden` | delete StatefulSet **and** PVC (only when no data; never the StorageClass); nothing to delete if fixed in Git before first create |
| Broken StatefulSet Pod never replaced | rolling update waits for the old Pod to be Ready | delete the **Pod**; a Deployment replaces Pods by itself |
| Argo stopped after a failed sync | `operationState.phase: Failed`; stale `message` read as current | check `finishedAt` vs now; `refresh=hard` does **not** restart; manual sync (UI or `kubectl patch` of `.operation`) (`argocd/operate`) |
| `Unknown / Healthy` | Argo could not render, so zero resources | read SYNC first; bottom-up error reading |
| 403 on `promote` push | Protect ON on an unprotected branch → empty token | Mask ON, Protect OFF (`gitlab/variables`) |
| `HTTP Basic: Access denied` for Argo reader | reader bot not a member of the repo | add as Reporter (`gitlab/permissions`) |
| `no runner for tags trident` | project runner scoped to another project | unlock/enable the runner for the project (`gitlab/runners`) |
| Docker build `Temporary failure in name resolution` | `127.0.0.53` stub resolver | `daemon.json` `dns` (`docker/overview`) |
| `blob unknown to registry` | Docker 29 containerd store push | `containerd-snapshotter: false`, re-run whole pipeline |
| `!URL_VAR: export …` | variables set as CI variables, script run on the VM | `export` in that shell (`bash/overview`) |
| `--ff-only` failed | stray unpushed local commit; read git's own output line 2 | `git/sync` |
| Student reasoning pitfalls | guessing causes instead of reading text; Role vs Scope vocabulary; per-namespace Secrets; trailing space after `\` | `debugging/overview`, `gitlab/permissions`, `kubernetes/secrets`, `bash/overview` |

Tutoring Stations 5 (end recall) and 6 (`verify.sh`, `cleanup.sh`, timed full re-run) were **not completed** in the log, so the `cleanup.sh`
template and the verification ladder are grounded in the TRIDENT contract and tests, not in a live student run.

---

## 8. Verification log

Method: each content agent verified its own commands, then a reviewer and an independent verification agent re-checked. "Locally" = on the lab VM
(`git 2.34`, `bash`, `kubectl` 1.36, `helm` 3.21.4, `docker` 29, `jq`, `openssl`, `ssh-keygen`, `gitlab-runner`; `shellcheck`, `yq`, `argocd`,
`glab` are **not** installed). The kubeconfig points at a live cluster: only **read-only** commands and `--dry-run` forms were used.

### 8.1 Verified by execution

- **Git** — every command run in throwaway repos: branch/switch/tag/push-to-bare-repo, `merge --ff-only` failure on divergence, `reset`
  soft/mixed/hard, `revert`, `reflog` recovery, `restore`, amend, fixup + autosquash, cherry-pick, stash, `diff --check`, `.gitattributes`
  `--renormalize`, `ls-remote`, `blame -L`, `log -- <FILE>`.
- **SSH** — `ssh-keygen` flags, `ssh -G`, `ssh -F … -v` against a non-routable address (nothing contacted).
- **Bash** — `bash -n` on all **255** bash blocks (after substituting placeholders) and on the five full templates. The two bootstrap scripts ran
  twice (idempotency) against dummy credential files with a `kubectl` shim: real `create --dry-run=client`, shimmed `apply`. `promote.sh` ran
  against a local bare git repo (first run commits and pushes with the bot identity, second run reports no change and prints the same SHA).
  `cleanup.sh` ran through a fake `kubectl` (call order, idempotent second run, failure message when a finalizer never clears). `verify.sh` and
  the injected-values test ran against a scratch chart, including a **negative self-test** (a loosened pattern must FAIL).
- **Helm** — real charts pulled: `nxs-universal-chart` 3.2.1 (`oci://registry.nixys.ru/nuc/nxs-universal-chart`), `postgres` 1.6.8 and `redis` 2.4.7
  (`https://groundhog2k.github.io/helm-charts/`). Confirmed by rendering: `storageClassName` appears once in `volumeClaimTemplates`; the
  `/run/secrets/trident` mount + `secretName`; redis renders `redis`, `redis-headless`, `redis-scripts` and uses `emptyDir` when `storage: {}`;
  `image: /ingest-api` when `imageRepository` is missing (or sits at column 0, outside `generic:`); one `imagePullSecrets` per Deployment;
  `TRIDENT_VERSION` injection; `envFrom`; the ingress host appears twice (rule + TLS); an empty `defaultImageTag` → `YAML parse error … line 42/44`
  and `--set defaultImageTag=probe` clears it; without `-n` the namespace renders as `"default"`; all five helm argument-error messages are exact.
  Also reproduced: `required` fails `helm template` (exit 1) while `helm lint` passes with `[INFO]` (exit 0); `values.schema.json` messages; the
  `kubectl create --dry-run=client -o json | jq -e` structural check.
- **kubectl** — client dry-runs for `create secret generic|docker-registry|tls`, `delete pvc`, `delete statefulset`; server dry-run for
  `apply --server-side --force-conflicts --field-manager=…` and for an Application carrying an `operation` patch; read-only `get sc`, jsonpath,
  `auth can-i`, `wait`, `explain`.
- **Argo CD fields** — checked with `kubectl explain` against the live Argo CRD: `status.sync.status`, `status.health.status`,
  `status.operationState.{phase,finishedAt,message}`, `status.history`, `status.conditions`, `status.sync.revision`,
  `spec.syncPolicy.retry.limit`, plus pod `status.initContainerStatuses`.
- **Docker** — `docker build` (`-t`, `-f`), `login --password-stdin`, `push`, `logout`, `info --format '{{.Driver}}'`, a deliberately wrong build context
  (error text quoted from the run), `resolvectl status`. `docker manifest inspect` only via `--help`.
- **gitlab-runner** — `register --help`, `list`, `verify`, `status`; a fake `glrt-` token with `--tag-list` returned
  `FATAL: Runner configuration other than name and executor configuration is reserved…`, which is why the page says tags are set in the UI.
- **YAML/JSON** — all YAML blocks parse with PyYAML (multi-doc aware) except two Go-template snippets in `helm/testing` (expected);
  `daemon.json` validated with `jq`.
- **Flags** — every flag of kubectl/helm/docker/git/curl/gitlab-runner/openssl used on the site exists (checked against `--help`/man).

### 8.2 Verified against documentation or source

- Argo CD manual-sync patch form: `kubectl patch … --type merge -p '{"operation":{"initiatedBy":{"username":"…"},"sync":{"syncStrategy":{"hook":{}}}}}'`
  from the official `sync-kubectl` page; a client dry-run cannot resolve the CRD, a server dry-run accepted the object.
- `argocd.argoproj.io/refresh=hard` ignores the manifest cache, and Argo removes the annotation afterwards; it does not restart anything.
- Automated sync **does not re-attempt** a sync that failed for the same commit SHA and parameters (docs `auto_sync.md`; same message in
  `appcontroller.go`). The "5 retries" figure comes from the **source** (`autoSync` sets `Retry{Limit: 5}`); the docs state no default.
  `syncPolicy.retry` overrides it (`limit: -1` = unlimited).
- GitLab (docs, 2026): project/group **access tokens are not on Free**; **service accounts and deploy tokens are on Free** (service accounts
  need the top-level group Owner's identity verification); Mask needs ≥ 8 chars, single line, no spaces; `glrt-` runners accept only
  `--url --token --executor --description` on the command line.

### 8.3 Not verified (labelled as such on the pages where relevant)

- **GitLab UI click paths** (menu wording changes between versions) and the exact Free-tier runner UI.
  Docs list **group runners in all tiers**, but the practice run showed no "New group runner" button — pages state both and recommend the project runner.
- **Real Argo behaviour on TRIDENT apps:** the lab cluster currently has no Applications and no TRIDENT namespaces, so status/`operationState`
  contents were inferred from the CRD schema, source and the tutoring log.
- **Mutating commands never run against the cluster:** simulator `POST /scenarios/quick-transit` via `kubectl exec`, `kubectl patch application`,
  real deletes of StatefulSet/PVC, `psql` flags against a real Pod, NetworkPolicy enforcement test (simulator → redis must fail).
- **`usermod -aG docker gitlab-runner`** and the `daemon.json` restart were not run (would change this VM).
- **Grafana admin Secret key names** (`admin-user`, `admin-password`) follow the supplied TRIDENT chart values, not a live Secret.
- **PVC fix after correcting `storage.className`:** documented from the tutoring session; the page's live outcome could not be reproduced here.

---

## 9. Corrections log (facts that were wrong and got fixed)

Found by the review and verification agents; useful as a list of "easy to get wrong" items when adding content.

1. **Mount path:** examples recommended `mountPath: /run/secrets` → now `/run/secrets/<APP_DIR>` (real incident, 5 pages + helm/k8s examples).
2. **Group runners on Free:** "none on Free" → docs say all tiers; practice run lacked the button → both stated.
3. **Service accounts:** added the identity-verification requirement for the top-level group Owner.
4. **Mask requirements:** removed "base64-like characters"; current rule = 8+ chars, one line, no spaces.
5. **Protected branch default push:** "Maintainers only" → depends on the group/instance default.
6. **CI writer token scope:** `read_repository + write_repository` → `write_repository` (includes read); roles Developer on gitops, Reporter on `trident-ci`.
7. **reflog retention:** "about two weeks" → at least 30 days (git default).
8. **dotenv scope:** "only jobs in `needs`" → reaches later jobs; with `needs`, only from the listed jobs.
9. **`when: manual` in `rules`:** pipeline is **blocked** (`allow_failure: false` by default), not "not blocked".
10. **Secret apply leak:** examples used plain `kubectl apply` for Secrets, which stores the value in `last-applied-configuration` → `--server-side --force-conflicts`.
11. **PVC fix procedure:** "delete the PVC" was insufficient → delete the **StatefulSet and PVC** (real incident).
12. **signal-processor CrashLoop:** previously described as "downstream of the DB" → it was the same `/run/secrets` mount collision.
13. **`--set image.tag=1.20`:** claimed to become a number → false on helm 3.21.4 (`1.20`, `1.2.3` stay strings); only whole integers, `true/false`,
    `null` are coerced → `--set-string image.tag=1` example.
14. **Argo "gives up after 5 retries":** reworded to the mechanism (no re-attempt for the same revision; limit 5 from source; `syncPolicy.retry`).
15. **Runner register command** contained a literal `…` → `read -rs RUNNER_TOKEN` + `--token "$RUNNER_TOKEN"`.
16. **Typography bugs:** the Markdown engine's `smartypants` turned `--hard` in headings into an em-dash (copy-breaking) → disabled in
    `astro.config.mjs`; inline code split flags like `--force` at the hyphen → `white-space: nowrap` (and `normal` inside table cells so long commands wrap
    at spaces instead of being clipped).
17. **Ports:** conflicting NodePorts (`31024`/`31651`/`31731`) → always discover with `kubectl -n ingress-nginx get svc`.
18. **Docs/duplicates:** 8 duplicated traps collapsed to one home each with links; `debugging/env-cards` reduced to summaries.

Additional findings from agents (not contradictions, but worth knowing): `ssh-keygen -f <custom path>` does not create `~/.ssh` (use
`mkdir -p -m 700 ~/.ssh` first); `install -d -m 700 a/b/c` sets the mode only on the last directory; `git diff --check` also flags CRLF; fixup
autosquash with `<SHA>~1` fails on the root commit; `yes | grep -q y` exits 141 under `pipefail`; `read -p` fails in zsh; `--from-file` fed from
`echo` adds a trailing newline to a Secret; a `containers:` override in an env values file silently drops probes; on this VM `gitlab-runner` is not in the
`docker` group (`permission denied`); the VM's own Docker reports the containerd store (`overlayfs`) and has no `daemon.json`.

---

## 10. Maintenance runbook

### Build and preview
```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH     # node/npx live under nvm on this VM
cd ~/devops-exam-toolbox
npm ci && npx astro build        # ~3-5 s for 44 pages; output in dist/
npx astro preview --port 4321    # (a preview server may already be running on another port: `astro preview status`)
```
Expected build warnings (harmless): empty `i18n` collection, missing `404` entry, vite `use astro:head-inject`.

### Isolated build (for parallel editors/agents)
```bash
W=<scratch>/tb && rm -rf "$W" && mkdir -p "$W"
rsync -a --exclude /node_modules --exclude /dist --exclude /.astro ~/devops-exam-toolbox/ "$W"/
cp -a ~/devops-exam-toolbox/node_modules "$W"/node_modules     # a symlink FAILS (Vite/Astro compile-metadata error)
cd "$W" && npx astro build
```
Use **anchored** excludes (`/dist`): an unanchored `--exclude dist` also strips `node_modules/astro/dist`.

### Link/anchor check (re-create — the script lived in a scratch directory and is not in the repo)
Walk `dist/**/*.html`; for every `href` (skip `http`, `_astro`, `pagefind`): strip the base `/devops-exam-toolbox/`, resolve relative links against the
page's directory, require the target `index.html` to exist, and require any `#fragment` (URL-decoded) to be an `id="…"` on the target page.
Hebrew anchors are slugified by Starlight (spaces → `-`, punctuation removed; since `smartypants` is off, `--hard` stays `--hard` in ids).

### Deploy
`git push origin main` → Actions run (~40–80 s) → live. Check with `gh run list --limit 1` and `curl -sI` on a few pages.

### Quality gates worth re-running after content changes
- Every page starts with `:::note[בקצרה]`; every code block has `title=`; no trailing whitespace (`grep -nP ' +$'`); placeholders only from the vocabulary;
  no translated jargon; relative links only.
- `bash -n` on every bash block (substitute `<PLACEHOLDER>` first); parse every YAML block; spot-check new flags with `--help`.
- After editing any H2: re-run the link check (home index and quick tab use exact anchors).

### Design tooling notes
- Playwright MCP was disconnected during the build; screenshots were taken with the `playwright` npm library from a scratch directory using the
  cached Chromium. The `impeccable detect` run on built HTML gave false positives (it cannot resolve base-path stylesheets, and it counts `--`
  in command flags as em-dashes).
- A newer impeccable skill (v4.5.0) was available; not applied.

---

## 11. Known issues and limitations

1. **Round-2 simplification was only partial.** Agents A (Git/SSH/GitLab/CI/Docker), B (Bash/Helm) and C (K8s/Argo/Observability) added content and
   fixed facts but did **not** trim the existing pages. Several pages are long (`bash/templates` 493 lines, `bash/overview` 308, `helm/values` 249,
   `bash/snippets` 243, `git/undo` 219). The goal "clear, simple, super precise" is met on facts, less on brevity.
2. **No automated checks in the repo.** Link check, code-block extraction, `bash -n` sweep and the mechanical rule checker lived in scratch directories.
   Nothing runs them in CI.
3. **`bash/toolbelt` sidebar position** (`sidebar.order: 2.5`) not visually confirmed.
4. **Content is in Hebrew with English terms; Pagefind has no Hebrew stemming** — search works for exact tokens (commands, error strings), not for
   Hebrew inflections.
5. **Hard-coded lab specifics appear as TRIDENT examples** (group `trident-lab00`, VM IP, NodePort). They are labelled examples; an exam on another
   environment must discover its own values.
6. **Bidi punctuation** (English at the end of a Hebrew sentence followed by punctuation) was not audited visually page by page.
7. **Callout header icons** (Starlight glyphs) and `!important` margin overrides on the home index are recorded in `DESIGN.md` as defects, not house style.
8. **`.impeccable/review/` is gitignored** (screenshots); `.impeccable/design.json`, `hook.cache.json` and `surfaces/` are committed.

---

## 12. Suggested next steps (highest value first)

1. **Simplification pass** over the longest pages: split `bash/templates` (one page per script) *only* with matching updates to home-index
   anchors; cut repeated explanations; keep every command.
2. **Add `scripts/check.mjs` (or Python) to the repo** and a CI job: link/anchor check, `title=` on code blocks, trailing whitespace,
   placeholder vocabulary, `bash -n` sweep. Run on every push before deploy.
3. **Rehearse on a real TRIDENT run.** Complete Stations 5–6 of the tutoring plan (end recall, `verify.sh`, `cleanup.sh`, timed re-run) and
   update pages with anything that still differs — especially `bash/templates` `cleanup.sh`, the `quick-transit` exec command, the Argo manual-sync
   patch on a real failed Application, and GitLab UI wording on the exam's GitLab.
4. **Visual QA on mobile and in dark mode** for the three longest pages, and the bidi punctuation audit.
5. **Optional:** an offline bundle (zip of `dist/` + `python3 -m http.server`) if the exam VM may lack internet — currently out of scope because
   web access is allowed.
6. **Optional:** apply the newer impeccable update in a later session, then re-run the detector with the base path resolved.

---

## 13. Reference: sources used while building

Kept **outside** the public repo (they contain lab-specific values):
- `~/Claude-Final/PROGRESS.md` — tutoring log (sessions 1–9); `00`–`05` reports; `CLAUDE.md` (tutor brief).
- `~/Claude-Final/toolbox-research/` — `scenarios.md` (real events by topic, line refs to PROGRESS), `trident-patterns.md` (supplied bash idioms,
  CI YAML, Argo shapes, chart value APIs, Compose→K8s mapping, TODO outcomes, fixed names), `design-tech.md` (Starlight/RTL facts),
  `AGENT-BRIEF-COMMON.md` (round 1 site map and ownership), `AGENT-BRIEF-ROUND2.md` (round 2 brief with session-9 ground truth).
- Practice project (read-only): `~/00_devops_course/00_devops_course_public/00_Final_Exercise/Exercises/TRIDENT/`.
- Earlier user sites used as design/structure references: `skywatch-007`, `gitops-ci-guide`, `k8s-exam-kit`.

### Build-tooling gotchas discovered (Astro 7 / Starlight 0.42)
- Astro 7 no longer bundles the unified markdown processor: install `@astrojs/markdown-remark` for `markdown.remarkPlugins/rehypePlugins` (a deprecation
  notice for that config path appears at build).
- Starlight 0.42 requires Astro ≥ 7.2.10; keep versions in step and commit `package-lock.json`.
- An unquoted `:` in frontmatter `description` breaks the build — quote descriptions.
- Expressive Code's `styleOverrides` ignores `var()` values — override `--ec-tm-markBg` / `--ec-tm-markBrdCol` in CSS instead. `mark` is reserved for
  placeholders; do not use manual `mark` or regex meta in code blocks.
- Starlight sidebar groups: `autogenerate` cannot sit on a group that has a `label` (see §4).
- Unlayered CSS beats Starlight's `@layer` rules; light theme selector is `:root[data-theme='light']`, dark is the default.

---

## 14. Round 3 (2026-10-05): the "גישה למבחן" tab (`playbook/`)

**Why:** every other tab is reference ("how do I write X"). The student also needs procedure: "what do I do next, and how do I know it
worked" — from minute 0 to the final push, including how to earn credit for creativity. The tab links to reference pages instead of
repeating them. Owner brief: `~/Claude-Final/toolbox-research/PLAYBOOK-BRIEF.md`; plan: `PLAYBOOK-PLAN.md` (same folder).

**Design test used for the plan:** "what does a stressed student open at minute 40?" → `order-of-work` stays open; `prevent-known-problems`
is grouped **by station** so it is read one block at a time before each station; `when-stuck` on red; `creativity` only after every MUST is green.

| Page (order) | Lines | Content |
|---|---|---|
| `overview` (1) | 84 | 10-line "if you read nothing else", phase budget in %, the 5 rules, "which page when" table |
| `first-15-minutes` (2) | 161 | read-only mapping commands, "values that must match" worksheet, delta-on-copy table |
| `environment-setup` (3) | 404 | `env.sh`, CI vars vs shell vars, SSH, tmux + aliases, `preflight.sh`, proactive `daemon.json`, NodePort/`/etc/hosts` |
| `order-of-work` (4) | 244 | 9 stations: goal · MUST/SHOULD · steps (links) · gate command · good-looks-like · likely failure |
| `prevent-known-problems` (5) | 167 | pre-mortem table per station: trap → cheap prevention → when → symptom if skipped |
| `when-stuck` (6) | 101 | 8-step protocol, 11-row "don't do" table, two worked real examples |
| `time-and-triage` (7) | 163 | budget % (the single source; `overview` mirrors it), drop-first triage, verifiable-state checklist, rehearsal + timing sheet |
| `last-20-minutes` (8) | 171 | `finish-check.sh`, leftover and secret greps, idempotency sequence, deliverables, evidence |
| `creativity` (9) | 363 | order rule (≤15% time, only after MUSTs green), 12 safe extras, dangerous creativity + one-line test, `DECISIONS.md` template, extras menu |
| `drill` (10) | 396 | 27 real error messages; answer (cause + first check + link) hidden in `<details>` |

**Registered in:** `src/sidebar.mjs` (second tab, after quick reference), `src/data/home-index.mjs` (first-aid entry + index block),
one link line in `architecture/exam-method.md`.

**Registry terminology rule (owner):** always "GitLab Container Registry" (images belong to the source project; push with the predefined
`CI_REGISTRY*`; pull with a `read_registry` deploy token stored per namespace). The Secret type `kubernetes.io/dockerconfigjson` and the
subcommand `create secret docker-registry` are only Kubernetes names — the new pages say so. No page on the site implies Docker Hub or a
self-hosted registry; older pages say "registry של GitLab"/"Container registry" (consistent but not the exact phrase).

**Verified (round 3):**
- `preflight.sh`: `bash -n`, run on the VM, failure cases (CRLF + trailing space, placeholder left, unset variable, ssh to 127.0.0.1 → FAIL).
  Bug found and fixed: `gitlab-runner list` embeds colour codes, so the runner count read 0 until they were stripped. Uses `sudo -n gitlab-runner list`.
- `env.sh`: `bash -n`, sourced in bash and zsh; refuses to run as `bash env.sh` on purpose. tmux layout tested in a detached session.
- Mapping greps on TRIDENT (read-only): 51 `TODO|FIXME|exit 1` lines, 6 `TODO.*exit 1` stubs, 17 active `repoURL: ""` in 5 files; staging/prod
  Applications have no TODO — only the empty `repoURL` grep finds them. `find -name Chart.yaml` = 0 (charts arrive via `import-charts.sh`).
- `values.schema.json` on a scratch chart (blocks empty tag, `latest`, foreign registry); NetworkPolicy `--dry-run=client` and `--dry-run=server`;
  CI validation job parsed and **kubeconform v0.8.0 actually run** (valid chart passes, `replicas: "abc"` fails); pre-push hook in a scratch repo
  (blocks planted TODO / `repoURL: ""` / token, passes clean); `finish-check.sh` (0 clean, 1 with planted problems); `stamp.sh`; `git revert` rollback.
- GitLab token prefixes checked against docs: `glsoat-` is a SCIM token; a service account's token starting `glpat-` is an inference (labelled).

**Not verified (round 3):** anything contacting GitLab (`ssh -T`, `ls-remote`, registry login/JWT); Argo parts of rollback/self-heal demos and
`capture-evidence.sh` (no Applications on the cluster); a live NetworkPolicy block; writing `/etc/hosts`; the CI job on a real runner; `shellcheck`
(not installed); kubeconform needs internet for schemas.

**Consistency fix by the coordinator:** `overview` and `time-and-triage` had different budgets; `overview` now mirrors the detailed table
(6/4/8/14/16/12/12/8 + 20 for extras and buffer), so "at 50% of the time you finish values + render" holds (cumulative 48%).

**Open items from round 3:** `environment-setup`, `creativity` and `drill` exceed the CONTENT-GUIDE length guideline (each has a TOC); add
`<STORAGE_CLASS>` to the vocabulary; unify older pages to the exact phrase "GitLab Container Registry" and consider renaming the tab label
"Docker ו-Registry"; rehearse a timed full re-run with the timing sheet; run `cleanup.sh` + the idempotency sequence and one real
`kubectl patch` manual sync on a live TRIDENT setup.
