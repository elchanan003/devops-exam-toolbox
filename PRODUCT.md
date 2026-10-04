# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One DevOps student sitting a practical final exam with web access but **no AI**. Under a clock, on a full
second monitor or a separate browser tab next to their terminal. They scan, find a command or pattern,
copy it, replace placeholders, and return to the terminal. Hebrew is their reading language; all technical
vocabulary is English.

## Product Purpose

A reference toolbox for a project like TRIDENT: migrate a Compose POC to Argo CD GitOps with Helm across
several GitLab repos, GitLab CI with dev → staging → manual-prod promotion, scoped tokens, bootstrap bash
scripts, verification and troubleshooting. Success = the student finds the right, correct command or
pattern in seconds and avoids traps they already fell into during practice. It is a toolbox, not a
solution guide.

## Positioning

Grounded in the student's own eight tutoring sessions: traps are the mistakes they actually made, examples
come from the TRIDENT practice project, and every command says where it runs (VM, CI job, GitLab UI, any
shell) — the student's most recurring confusion.

## Operating Context

Exam environment: a lab VM (kubeadm single node, Argo CD, ingress-nginx, gitlab-runner shell executor) and
gitlab.com. No `argocd`/`glab` CLI. Site is an Astro Starlight static site on GitHub Pages
(`https://elchanan003.github.io/devops-exam-toolbox/`), searched with Ctrl+K (Pagefind).

## Capabilities and Constraints

- Hebrew RTL prose; code, commands and technical terms stay English and LTR. No translated jargon.
- Copy-ready code blocks with highlighted `<PLACEHOLDERS>` and a TRIDENT example line.
- Fixed callout semantics: `בקצרה` intro, trap (from practice), destructive warning, principle.
- Extensible: one folder per tab, one line in `src/sidebar.mjs` per tab; authoring rules in `CONTENT-GUIDE.md`.
- Desktop-width usage is primary; must still work on mobile.

## Evidence on Hand

Real scenarios and fixes: `~/Claude-Final/toolbox-research/scenarios.md`; project patterns:
`~/Claude-Final/toolbox-research/trident-patterns.md`. No testimonials or external claims — none needed.

## Product Principles

1. Speed of finding beats beauty; beauty must never slow scanning.
2. Every command is correct, complete, and says where it runs.
3. Traps appear at the point of use, sourced from real practice.
4. Generic patterns with a concrete example — never the exam's answer.
5. Focus over completeness: one home per topic, cross-link instead of duplicating.

## Accessibility & Inclusion

Readable contrast in light and dark; keyboard search; long sessions of reading — comfortable type size.
