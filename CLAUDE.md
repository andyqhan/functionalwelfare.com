# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The web edition of a research paper ("How's it going? Reinforcement learning in language
models recruits a functional welfare axis"). It is **not** authored here — the LaTeX source
in `../valence-neurips/` (see `paper.config.ts` → `PAPER_SRC` / `MAIN_TEX`) is the source of
truth. A converter turns that `.tex` into a typed JSON intermediate representation (IR); an
Astro site renders the IR into a single readable web page (main text) plus one page per appendix.

## Commands

```bash
pnpm install
pnpm convert      # tex → IR + figure/emoji assets. Run whenever the .tex source changes.
pnpm dev          # local site at http://localhost:4321
pnpm build        # static site → dist/
pnpm preview      # serve the built dist/
pnpm check        # astro check — the only typecheck/lint step (there is no test suite)
```

- **`pnpm convert` is a prerequisite for `dev`/`build`.** It writes `src/generated/` (which the
  site imports directly) and `public/paper/` (assets). Both are git-ignored, so a fresh clone has
  nothing to render until convert runs.
- Convert needs external binaries on `PATH`: `latexmk`/`xelatex` (for the numbering prepass) and
  `pdftocairo` from poppler (PDF→SVG figures). Results are cached in `.convert-cache/`.

## Architecture

Two halves with a single contract between them: the IR type definitions in
`scripts/convert/types.ts`. The converter emits IR; the site consumes it (re-exported site-side
via `src/lib/ir.ts`). Presentation lives entirely in the site — the converter never emits HTML.

### Converter (`scripts/convert/`), orchestrated by `index.ts`

Pipeline: latexmk prepass for exact numbers (`refs.ts`) → assemble front matter + ordered units
(`assemble.ts`, splicing `\input`s via `expand.ts`) → walk AST into IR (`transform.ts`, with
`tabular.ts` for tables and `math.ts` for KaTeX-ready TeX) → register+render figure/emoji assets
(`figures.ts`) → parse `.bbl` into numbered references (`bib.ts`) → write JSON (`emit.ts`).

Key mechanics:
- **Units** = top-level pieces (each main section, the abstract, each appendix). Slugs are derived
  from `.tex` filenames in `assemble.ts` (`paperSlug`/`appendixSlug`); `kind` is `main` |
  `appendix` | `frontmatter`.
- **`Ctx`** (`context.ts`) threads shared state through transform: the cross-ref data, the
  `labelIndex` (LaTeX label → `{slug, anchor id}`), per-unit footnotes, and a unique-id maker.
- **Assets are registered synchronously, rendered in a batch afterward** (`AssetManager` in
  `context.ts` returns predicted web paths so `transform.ts` stays synchronous).
- **The conversion summary is the signal for gaps.** `index.ts` prints unknown macros/environments
  and unresolved refs after each run. When the `.tex` changes and something renders wrong, that
  list tells you what `transform.ts` doesn't yet handle.

### Site (`src/`)

- `pages/index.astro` — entire main paper on one page. `pages/appendix/[slug].astro` — one static
  page per appendix (`getStaticPaths` from `appendixSummaries()`).
- **Rendering is recursive dispatch on IR node `type`:** `Blocks.astro` → `BlockNode.astro`
  (switches on block type) and `Inline.astro` → `InlineNode.astro`. Add a new IR node type ⇒ add a
  branch in the matching dispatcher *and* in the Markdown renderer (`lib/markdown.ts`, below).
  `Figure`/`Table`/`ModelExample` are the non-trivial block renderers.
- `lib/ir.ts` loads the generated manifest + units and provides URL helpers (`labelHref`,
  `unitPath`, `mainUnits`, `appendixUnits`).
- `PaperLayout.astro` is the shell (fonts, KaTeX CSS, sticky resizable TOC sidebar). `styles/global.css`
  holds the design (Cardo typography, constrained measure, margin sidenotes, theme).

### Markdown output for LLM agents (`src/lib/markdown.ts`)

A second renderer of the *same* IR — to Markdown instead of HTML — feeds a set of static text
endpoints and the "Copy for LLM" buttons in the header. The endpoints are Astro static file
endpoints (`export function GET`), prerendered to literal files at build:

- `pages/index.md.ts` → `/index.md` — body: title, abstract, main sections, references (no appendices)
- `pages/appendix/[slug].md.ts` → `/appendix/<x>.md` — one per appendix
- `pages/llms-full.txt.ts` → `/llms-full.txt` — the whole paper (body + all appendices) in one file
- `pages/llms.txt.ts` → `/llms.txt` — curated index (title, summary, links), per llmstxt.org

`markdown.ts` mirrors the `BlockNode`/`InlineNode` dispatch, so a new IR node type needs a branch
here too. Two sync points with the rest of the site:
- Its `MD_MACROS` table mirrors `katex.ts`'s `MACROS`, but as plain LaTeX (no `\htmlClass` /
  `\includegraphics`), so custom math macros don't leak as undefined into raw `.md`. Keep in sync.
- Emoji `name`s are usually hex-codepoint sequences (e.g. `1f385-1f3fe`), decoded to glyphs; a few
  CLDR short names are mapped explicitly in `EMOJI`.

The buttons live in `components/CopyMarkdown.astro` (fetch the static file → clipboard); each page
also advertises its `.md` via `<link rel="alternate" type="text/markdown">`. This is pure site-side
rendering of already-generated IR — no converter changes, no `pnpm convert`.

### Two things that commonly need editing together with the source

1. **Math macros.** KaTeX renders at build time (`src/lib/katex.ts`) using a hand-maintained
   `MACROS` dictionary that mirrors the paper's `\newcommand`s. New/changed math macros in the
   `.tex` must be added here or they render as errors.
2. **Fancy figure/table overrides.** Every figure and table carries its LaTeX `label`. To replace a
   static SVG/data-table with an interactive version, drop a component in
   `src/components/overrides/figures/` (or `tables/`) and register it by label in
   `overrides/figures.ts` / `overrides/tables.ts`. Unregistered labels fall back to the faithful
   static version — so you only build interactive versions where they're worth it.

## Conventions / gotchas

- **Never hand-edit `src/generated/` or `public/paper/`** — they are regenerated by `pnpm convert`
  and git-ignored. Fixes to content/structure go in the converter (or the upstream `.tex`).
- Changing how content is parsed/structured ⇒ edit the converter and re-run `pnpm convert`.
  Changing how it looks ⇒ edit the Astro components / `global.css` (no convert needed).
- The IR contract (`scripts/convert/types.ts`) is shared by both halves; when you add a field,
  update both the emitter and the renderer.
