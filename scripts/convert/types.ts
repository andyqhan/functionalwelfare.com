// ---------------------------------------------------------------------------
// Intermediate representation (IR) for the paper.
//
// The converter emits this typed, structured JSON tree; the Astro site owns all
// presentation. The contract between the two is this file — it is re-exported to
// the site via src/lib/paper-types.ts so the renderer is fully typed.
//
// Design notes:
//  - Every `figure` and `table` carries a `label`, which is the key the site's
//    override registries use to swap in a fancy HTML/JS version. The static
//    fallback (SVG / structured rows) always lives on the node, so most
//    figures/tables need no override at all.
//  - Math nodes carry raw KaTeX-ready TeX; the site renders with KaTeX at build
//    time using a shared macro dictionary.
// ---------------------------------------------------------------------------

// ============================ Inline nodes ===============================

export type Inline =
  | TextNode
  | EmphNode
  | StrongNode
  | SmallcapsNode
  | UnderlineNode
  | CodeNode
  | SupNode
  | SubNode
  | LinkNode
  | MathInline
  | EmojiNode
  | InlineImage
  | HighlightNode
  | ColoredLabel
  | TokenNode
  | FootnoteRef
  | CrossRef
  | CiteRef
  | LineBreak;

export interface TextNode {
  type: "text";
  value: string;
}
export interface EmphNode {
  type: "emph";
  content: Inline[];
}
export interface StrongNode {
  type: "strong";
  content: Inline[];
}
export interface SmallcapsNode {
  type: "smallcaps";
  content: Inline[];
}
export interface UnderlineNode {
  type: "underline";
  content: Inline[];
}
export interface CodeNode {
  type: "code";
  value: string;
}
export interface SupNode {
  type: "sup";
  content: Inline[];
}
export interface SubNode {
  type: "sub";
  content: Inline[];
}
export interface LinkNode {
  type: "link";
  href: string;
  content: Inline[];
  /** Render the link text in a monospace/url style. */
  mono?: boolean;
}
export interface MathInline {
  type: "mathInline";
  /** KaTeX-ready TeX source. */
  tex: string;
}
export interface EmojiNode {
  type: "emoji";
  /** Macro argument, e.g. "card-index". */
  name: string;
  /** Web path to the copied PNG, e.g. /paper/emoji/card-index.png. */
  src: string;
}
export interface InlineImage {
  type: "inlineImage";
  src: string;
  alt?: string;
  /** Approx height in em, mirroring \includegraphics[height=..em]. */
  heightEm?: number;
}
export interface HighlightNode {
  type: "highlight";
  color: "red" | "green";
  content: Inline[];
}
export interface ColoredLabel {
  type: "coloredLabel";
  /** CSS color (hex). */
  color: string;
  bold?: boolean;
  content: Inline[];
}
/** A token rendered in a special "special-token" style, e.g. ␣cannot or \n. */
export interface TokenNode {
  type: "token";
  value: string;
}
export interface FootnoteRef {
  type: "footnoteRef";
  id: number;
}
export interface CrossRef {
  type: "crossRef";
  kind: "figure" | "table" | "section" | "equation" | "appendix";
  /** LaTeX label being referenced. */
  target: string;
  /** Resolved display text, e.g. "Figure 1", "§3.1", "Appendix H", "(1)". */
  text: string;
}
export interface CiteRef {
  type: "citeRef";
  keys: string[];
  style: "p" | "t"; // \citep vs \citet
  /** Resolved display text, e.g. "[12]" or "Sofroniew et al. [12]". */
  text: string;
}
export interface LineBreak {
  type: "break";
}

// ============================ Block nodes ================================

export type Block =
  | Heading
  | Paragraph
  | MathBlock
  | ListBlock
  | Blockquote
  | Verbatim
  | Epigraph
  | FigureBlock
  | TableBlock
  | ModelExample
  | Callout
  | Center;

export interface Heading {
  type: "heading";
  level: 1 | 2 | 3 | 4;
  label?: string;
  /** Resolved section number, e.g. "3", "3.1", "H", "H.1". May be undefined for unnumbered. */
  number?: string;
  title: Inline[];
  /** Stable URL anchor id. */
  id: string;
}
export interface Paragraph {
  type: "paragraph";
  content: Inline[];
}
export interface MathBlock {
  type: "mathBlock";
  /** KaTeX-ready TeX (already wrapped, e.g. aligned for align envs). */
  tex: string;
  label?: string;
  number?: string;
  id?: string;
}
export interface ListItem {
  content: Block[];
}
export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}
export interface Blockquote {
  type: "blockquote";
  content: Block[];
}
export interface Verbatim {
  type: "verbatim";
  value: string;
}
export interface Epigraph {
  type: "epigraph";
  lines: Inline[][];
  attribution?: Inline[];
}

export interface FigureItem {
  /** Web path to rendered SVG. */
  svg?: string;
  /** Web path to raster fallback (PNG), if SVG unavailable. */
  png?: string;
  /** Fraction of text width (0..1), from \includegraphics[width=..\textwidth]. */
  widthFrac?: number;
  alt?: string;
}
export interface FigureBlock {
  type: "figure";
  label: string; // override-registry key
  number?: string;
  layout: "single" | "row";
  items: FigureItem[];
  caption: Inline[];
  /** True if this figure float wraps content (wrapfigure). */
  wrap?: boolean;
}

export interface TableCell {
  content: Inline[];
  align: "left" | "center" | "right";
  colspan: number;
  rowspan: number;
  /** A rule drawn above this cell (booktabs/cmidrule), for the data renderer. */
  ruleAbove?: boolean;
  /** Background highlight, hex color. */
  bg?: string;
}
export type TableRow = TableCell[];
export interface TableBlock {
  type: "table";
  label: string; // override-registry key
  number?: string;
  caption: Inline[];
  /** "data" → structured rows render as an HTML <table>; "image" → asImage SVG. */
  kind: "data" | "image";
  rows?: TableRow[];
  /** Column alignment spec from the tabular preamble. */
  columnAlign?: ("left" | "center" | "right")[];
  asImage?: { svg?: string; png?: string };
}

export interface ModelExamplePart {
  kind: "meta" | "prompt" | "response";
  content: Inline[];
}
export interface ModelExample {
  type: "modelExample";
  parts: ModelExamplePart[];
}
export interface Callout {
  type: "callout";
  content: Block[];
}
export interface Center {
  type: "center";
  content: Block[];
}

// ============================ Document ==================================

export interface Footnote {
  id: number;
  content: Block[];
}

/** One top-level unit: a main-paper section, the abstract, or one appendix. */
export interface Unit {
  /** URL slug, e.g. "intro", "characterization", "appendix-a". */
  slug: string;
  /** "main" body unit vs "appendix" vs "frontmatter". */
  kind: "frontmatter" | "main" | "appendix";
  /** Source .tex basename for traceability. */
  source: string;
  blocks: Block[];
  footnotes: Footnote[];
}

export interface TocEntry {
  id: string;
  number?: string;
  title: Inline[];
  level: number;
  slug: string; // which unit/page it lives on
  children: TocEntry[];
}

export interface Reference {
  number: number;
  key: string;
  /** Short author label for \citet, e.g. "Sofroniew et al.". */
  author?: string;
  year?: string;
  /** Rich formatted reference body. */
  content: Inline[];
}

export interface Author {
  name: Inline[];
}

export interface UnitSummary {
  slug: string;
  kind: "frontmatter" | "main" | "appendix";
  /** Display title (for nav), e.g. "Introduction" or "A · Full controls…". */
  title: Inline[];
  number?: string;
}

export interface Manifest {
  title: Inline[];
  authors: Author[];
  affiliation?: Inline[];
  repoUrl?: string;
  correspondence?: Inline[];
  abstract: Block[];
  epigraph?: Epigraph;
  toc: TocEntry[];
  /** Ordered unit summaries, for navigation. */
  units: UnitSummary[];
  /** Global map: LaTeX label → the unit slug + anchor id where it is defined. */
  labelIndex: Record<string, { slug: string; id: string }>;
  references: Reference[];
  generatedAt?: string;
}
