# AGENT_GUIDE

Hebrew (RTL) Astro 7 + Starlight 0.42 site, deployed to GitHub Pages at `/devops-exam-toolbox/`.
Content conventions live in [CONTENT-GUIDE.md](CONTENT-GUIDE.md) — read it before writing.

## Structure

```
astro.config.mjs        site/base, Starlight config, markdown plugins
src/sidebar.mjs         the single list of tabs
src/content/docs/       index.mdx + one folder per tab (overview.md + pages)
src/components/         RunsOn.astro (MDX only)
src/plugins/            placeholders.mjs (remark + rehype)
src/styles/             fonts.css, custom.css (tokens, RTL/LTR rules)
.github/workflows/      deploy.yml (push to main -> Pages)
```

## Add a page
Create `src/content/docs/<tab>/<slug>.md` (kebab-case, no number prefix; slug is permanent):
```md
---
title: Hebrew title
description: One Hebrew sentence without a colon (or quote the value).
sidebar:
  order: 2
---
```
`overview.md` uses `order: 1`. YAML pitfall: a `:` inside an unquoted value breaks the build.

## Add a tab
1. Create `src/content/docs/<folder>/overview.md` (order 1, `:::note[בקצרה]` first).
2. Add one line to `tabs` in `src/sidebar.mjs`: `['Label', 'folder']`.
Groups are `collapsed: true` and auto-expand when they contain the current page.
(Starlight >= 0.39 requires `items: [{ autogenerate }]` inside a group; sidebar.mjs already does this.)

## Components
- Starlight (MDX only): `import { Steps, Tabs, TabItem, Card, CardGrid, FileTree } from '@astrojs/starlight/components';`
- `RunsOn`: `import RunsOn from '../../components/RunsOn.astro';` then `<RunsOn where="VM" />`
  (`VM | Mac | CI job | GitLab UI | any shell`). Adjust the relative import depth to the page.

## Placeholder highlighting
Any `<UPPER_SNAKE>` (`<[A-Z][A-Z0-9_]*>`) is highlighted automatically. No author action.
- Code blocks: `remarkPlaceholderMarkers` appends an Expressive Code regex text-marker to every code node's meta;
  EC renders matches as `<mark>`, restyled in `custom.css` via `--ec-tm-markBg` / `--ec-tm-markBrdCol`
  (EC `styleOverrides` do not accept `var()`, so CSS overrides are used).
- Inline code: `rehypeInlinePlaceholders` wraps matches in `<span class="ph">`.
- Colours: `--tb-placeholder-bg`, `--tb-placeholder-ink`, `--tb-placeholder-border` (light + dark).
- Caveat: `mark` is therefore reserved for placeholders; don't use `mark`/`/regex/` meta manually.
- Plugins run via `markdown.remarkPlugins/rehypePlugins` (legacy path; needs `@astrojs/markdown-remark`, installed).

## Commands
`npm run dev` · `npm run build` (check `dist/<tab>/<page>/index.html`) · `npm run preview`.
Deploy: push to `main`; the workflow builds and publishes. Manual: Actions -> Deploy -> Run workflow.

## RTL notes and pitfalls
- Page is `lang="he" dir="rtl"`. Code blocks, frames and inline `code` are forced LTR (`unicode-bidi: isolate`).
- Use **relative links** (`../../git/undo/`); root-absolute `/git/...` ignores `base` and 404s on Pages.
  Raw `<a>`/`<img>`/`public/` URLs in MDX need the base prefixed manually.
- Wrap English phrases that end a Hebrew sentence in `<bdi dir="ltr">` (MDX) or rephrase; punctuation reorders.
- Keep comments in code English-only.
- Hebrew search has no stemming; put plain keywords in headings.
- Dark is Starlight's `:root` default; light is `:root[data-theme='light']`.
