---
name: DevOps Exam Toolbox
description: A Hebrew RTL reference toolbox set like a technical book's back index, with green-tinted neutrals, one teal accent and hairlines instead of boxes.
colors:
  accent-dark: "#41c4aa"
  accent-light: "#0c6b5b"
  accent-low-dark: "#123029"
  accent-low-light: "#e2efec"
  accent-high-dark: "#a8e8d9"
  accent-high-light: "#0a4f43"
  ground-dark: "#0d1310"
  ground-light: "#f3f5f3"
  surface-dark: "#141b17"
  surface-light: "#ffffff"
  chrome-dark: "#111915"
  chrome-light: "#e9eeea"
  ink-dark: "#e4ece7"
  ink-light: "#22302a"
  ink-strong-dark: "#f2f7f4"
  ink-strong-light: "#0f1a15"
  muted-dark: "#8fa198"
  muted-light: "#586a62"
  rule-dark: "#26322c"
  rule-light: "#d8e0db"
  placeholder-bg-dark: "#4a3a0c"
  placeholder-ink-dark: "#ffd772"
  placeholder-border-dark: "#8a6a1a"
  placeholder-bg-light: "#fff0b8"
  placeholder-ink-light: "#5a4300"
  placeholder-border-light: "#d9b13b"
  note-bg-dark: "#10241f"
  note-ink-dark: "#a8e8d9"
  note-bg-light: "#eef6f3"
  note-ink-light: "#0a4f43"
  trap-bg-dark: "#2a2010"
  trap-ink-dark: "#f3c46e"
  trap-bg-light: "#fdf5e6"
  trap-ink-light: "#7a4d00"
  danger-bg-dark: "#2c1514"
  danger-ink-dark: "#f59b90"
  danger-bg-light: "#fcefed"
  danger-ink-light: "#9b2c22"
  tip-bg-dark: "#172219"
  tip-ink-dark: "#a9d9a2"
  tip-bg-light: "#f1f7ef"
  tip-ink-light: "#2d5a28"
typography:
  h1:
    fontFamily: "Rubik, Heebo, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "Rubik, Heebo, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Rubik, Heebo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Heebo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  table:
    fontFamily: "Heebo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.55
  label:
    fontFamily: "Rubik, Heebo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "liga off (inline)"
rounded:
  xs: "3px"
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  xs: "0.2rem"
  sm: "0.5rem"
  md: "0.85rem"
  lg: "1.4rem"
  xl: "2.6rem"
  index-gap: "2.75rem"
components:
  callout:
    backgroundColor: "{colors.note-bg-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.1rem"
  placeholder-chip:
    backgroundColor: "{colors.placeholder-bg-dark}"
    textColor: "{colors.placeholder-ink-dark}"
    rounded: "{rounded.xs}"
  runs-on-pill:
    backgroundColor: "{colors.accent-low-dark}"
    textColor: "{colors.accent-dark}"
    rounded: "{rounded.pill}"
    padding: "0.1em 0.6em"
  inline-code:
    rounded: "{rounded.sm}"
    padding: "0.1em 0.35em"
  kbd:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.sm}"
    padding: "0.1em 0.45em"
  first-aid-link:
    textColor: "{colors.ink-strong-dark}"
    padding: "0.8rem 0.9rem"
  first-aid-link-hover:
    backgroundColor: "{colors.accent-low-dark}"
  index-block:
    padding: "0.85rem 0 0"
  index-link:
    textColor: "{colors.accent-dark}"
    padding: "0.2rem 0"
---

# Design System: DevOps Exam Toolbox

## Overview

**Creative North Star: "The Back-of-Book Index"**

This is a technical reference set the way a printed manual is set: reading text on a quiet ground, structure carried by type weight and hairline rules, one teal accent reserved for links and current state. It serves one student mid-exam on a second monitor, scanning for a command, copying it and going back to the terminal. Nothing decorative stands between the eye and the term it wants. Starlight's chrome (sidebar, search, pager) stays; the build re-skins it with the "guide family" world: green-tinted neutrals (hue about 150) in place of Starlight's blue-gray.

Density is operational but not cramped: 17px body at 1.7 line height, tables at 15px, headings on a tight fixed rem scale. Dark is the default theme and light is a full peer with its own tuned values. Hebrew prose runs RTL; every command, flag and technical term is English and stays LTR and unbroken.

**Key Characteristics:**
- Hairlines (1px) and a heavier 2px rule divide content; boxes are rare and tinted, never shadowed.
- One accent hue (teal), used for links, current state, focus and the "runs on" pill only.
- Heebo for reading, Rubik for headings and labels, JetBrains Mono strictly for code.
- Amber is reserved for placeholders; callout hues carry fixed meaning.
- Flat: no shadows anywhere in the build.

## Colors

A green-tinted neutral ramp with a single teal accent; amber, red and sage appear only as semantic fields. Every color has a dark and a light value; the theme switch swaps the whole set (Starlight: dark is `:root`, light is `:root[data-theme='light']`).

### Primary
- **Lagoon Teal** (dark `#41c4aa`, light `#0c6b5b`): links, active sidebar item, focus ring, index links, hover on index headings. The light value is darkened for text contrast on pale ground.
- **Teal Field** (dark `#123029`, light `#e2efec`): the tint behind a hovered first-aid link and the "runs on" pill.
- **Teal Ink** (dark `#a8e8d9`, light `#0a4f43`): highest-contrast accent text; the note callout's ink.

### Neutral
- **Ground** (dark `#0d1310`, light `#f3f5f3`): page background.
- **Chrome** (dark `#111915`, light `#e9eeea`): sidebar and nav.
- **Surface** (dark `#141b17`, light `#ffffff`): keycap fill.
- **Body Ink** (dark `#e4ece7`, light `#22302a`): running text. **Strong Ink** (dark `#f2f7f4`, light `#0f1a15`): bold, headings, table headers.
- **Muted** (dark `#8fa198`, light `#586a62`): secondary descriptions (first-aid sub-lines, search hint).
- **Rule** (dark `#26322c`, light `#d8e0db`): hairlines, table row borders, section dividers.

### Semantic (callouts and placeholders)
- **Placeholder Amber** (bg dark `#4a3a0c` / light `#fff0b8`; ink `#ffd772` / `#5a4300`; border `#8a6a1a` / `#d9b13b`): `<UPPER_SNAKE>` tokens, nothing else.
- **Note / Trap / Danger / Tip** fields (teal, amber, red, sage; background, 1px rule and ink each tuned per theme, values in the tokens above and the sidecar): fixed meaning, see Components.

### Named Rules
**The One Accent Rule.** Teal marks navigation and state only. It never fills a large area and never decorates.

**The Amber Is Placeholder Rule.** Amber on a code token means "replace me". Trap callouts use a related warm hue, but as a quiet field, never as the saturated chip.

**The Paired Theme Rule.** Any new color is defined for dark and light together as a custom property; no theme-specific one-offs in component rules.

## Typography

**Display Font:** Rubik (with Heebo, system-ui)
**Body Font:** Heebo (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace), code only

**Character:** Heebo and Rubik share Hebrew and Latin coverage and a rounded geometry, so mixed Hebrew/English lines read as one voice. Rubik gives headings and labels a firmer, slightly tighter presence; mono appears only where text is literal.

### Hierarchy
- **H1** (Rubik 700, 2.125rem, 2.375rem from 50em): page title.
- **H2** (Rubik 600, 1.5rem, 1.625rem from 50em): section; preceded by a 1px rule with 2.6rem above and 1.1rem padding.
- **H3** (Rubik 600, 1.1875rem, 1.25rem from 50em): subsection, 1.8rem above.
- **Body** (Heebo 400, 1.0625rem, 1.7): prose and list items, capped at 72ch.
- **Table** (Heebo 0.9375rem, 1.55; header Rubik 600 0.875rem; first column weight 500): dense, tabular numerals.
- **Callout title / sidebar group** (Rubik 600, 0.9375rem): labels.
- **Code** (JetBrains Mono 400, 0.875rem block; 0.86em inline; 0.75rem frame titles): all literal text.

Headings use `text-wrap: balance` and `letter-spacing: -0.01em`. Fonts are self-hosted Fontsource files (Heebo 400/500/700, Rubik 500/700, JetBrains Mono 400/600) with Hebrew subsets.

### Named Rules
**The Mono Is Literal Rule.** JetBrains Mono appears only for code, commands, paths, keycaps and "runs on" labels. Never for emphasis or decoration.

**The Never-Split Rule.** Inline code is `white-space: nowrap` with ligatures off, so a flag like `--force` is never broken at its hyphen and copies exactly. Markdown smartypants is off for the same reason.

## Layout

Starlight's two-column shell: a 16.5rem sidebar and a 52rem content column (sized for tables and code on a second monitor). The home page has no table-of-contents column, so it widens to 76rem and flows its index in CSS columns (`columns: 20rem`, gap 2.75rem; three columns on a wide monitor, one on mobile), each block `break-inside: avoid`.

Rhythm is rem-based and loose around structure, tight inside lists: 2.6rem before H2, 1.8rem before H3, 0.6rem after a heading, 1.4rem between index blocks, 0.5rem and 0.75rem table cell padding. Tables scroll horizontally inside their own block on narrow screens (cells min 9rem under 50rem). Home first-aid row is an auto-fit grid (`minmax(11.5rem, 1fr)`) that stacks below 40rem. Use logical properties (`border-inline-end`, `padding-inline`, `text-align: start`) so the RTL root mirrors correctly.

## Elevation & Depth

Flat. The build has no box-shadows. Depth comes from tonal fields (callouts, inline code, keycaps), 1px hairlines, and a 2px heavier rule above index blocks and under table headers. State feedback is a background tint (first-aid hover, table row hover at 5% accent) or an underline thickening from 1px to 2px.

### Named Rules
**The Hairline Over Box Rule.** Separate with a rule or a whitespace gap before reaching for a bordered box. Where a field is needed, it is tinted with a 1px rule in a matching hue.

## Shapes

Quiet, small radii. Callouts 8px; inline code and keycaps 4px; placeholder chips 3px (with a 1px outline); "runs on" pill fully rounded (999px). Borders are always 1px, except the 2px structural rules (index block top, table header bottom, keycap bottom edge). No thick side-bar accents on callouts.

## Components

### Callouts (Starlight asides, four fixed meanings)
Tinted field, 1px rule in a darker tint of the same hue, 8px radius, padding 0.85rem 1.1rem, Rubik 600 0.9375rem title, content 0.975rem at 1.65. The meaning is fixed and set by the authoring syntax:
- **note**: the page's `בקצרה` intro. When it is the first child of the content it reads as a lede (content 1.0625rem).
- **caution**: a trap from the student's own practice, in amber-brown.
- **danger**: a destructive action, in red.
- **tip**: a principle, in sage green.

### Code blocks and titles
Copy-ready Expressive Code frames. Always LTR, left-aligned and bidi-isolated inside the RTL page; frame titles are mono 0.75rem. Titles name where a command runs: `runs on: VM`, `runs on: Mac`, `runs on: any shell`, `runs on: CI job`, `file: <path>`, `GitLab UI`.

### Placeholder chips
Any `<UPPER_SNAKE>` token is highlighted amber (600 weight, 3px radius, 1px amber outline): in block code via an Expressive Code text marker added by the remark plugin `src/plugins/placeholders.mjs`, in inline code via a `span.ph` added by its rehype plugin. Authors write the token; they do not style it.

### "Runs on" pill
Mono, small, fully rounded, teal field with a 45% teal border; LTR isolated. The Astro component `RunsOn.astro` for inline provenance.

### Inline code and keycaps
Inline code: 0.86em, 4px radius, 1px hairline border, nowrap. `kbd`: mono 0.8em, surface fill, 1px border with a 2px bottom edge.

### Tables
Hairline rows only, no fills, no zebra. Header: Rubik 600, strong ink, 2px bottom rule, nowrap. Row hover is a 5% teal wash.

### Home index (signature)
`TabIndex.astro` renders `src/data/home-index.mjs`. A first-aid row of four links (bold Rubik teal title over a muted one-line description, divided by hairlines, between top and bottom rules, tint on hover), then tab blocks: a 2px rule, the tab name as a bold 1.3rem heading link in strong ink, and a plain list of teal task links with faint 22% underlines (1px, thickening to 2px on hover). Backticked terms in link labels become inline code. No cards, icons or imagery.

### Navigation
Starlight sidebar at 0.9375rem; group labels in Rubik 600 strong ink; the current page in weight 600. Site title in Rubik 700.

### Authoring conventions
Content writers rely on the semantics above (callout types, placeholder syntax, code titles, LTR code). The syntax and rules live in `CONTENT-GUIDE.md`; do not restate or vary them here.

## Do's and Don'ts

### Do:
- **Do** keep Hebrew prose RTL and all code, commands, flags and technical terms English and LTR.
- **Do** use teal only for links, current state and focus (2px focus ring, 2px offset, in the theme's accent).
- **Do** define any new color as a dark and light custom-property pair.
- **Do** keep callout meanings fixed: note = intro, caution = trap, danger = destructive, tip = principle.
- **Do** give every command block a title that says where it runs.
- **Do** respect `prefers-reduced-motion`; the only transition in the build is a 160ms background fade on first-aid links.

### Don't:
- **Don't** use amber for anything except placeholders and trap callouts' quiet field.
- **Don't** set Hebrew text in mono or put code inside an RTL flow without isolation.
- **Don't** add shadows, thick side-stripe borders or boxed card grids; the house voice is hairlines and tinted fields.
- **Don't** let smartypants or ligatures alter a command; commands must copy exactly.
- **Don't** open the home page with a hero or same-size icon cards; it is an index.

## Not canonized (build defects or inherited drift)

- Starlight's default glyph icon inside callout headers is inherited and scaled (`1.15em`) in the build; it is not a house device for new surfaces.
- Several home-index rules rely on `!important` to beat Starlight's prose margins; this is a workaround, not a pattern to extend.
