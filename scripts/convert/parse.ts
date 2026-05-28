// ---------------------------------------------------------------------------
// LaTeX parsing via unified-latex.
//
// We register xparse-style signatures for every macro/environment we care about
// so their arguments attach correctly during parsing. Anything not listed still
// parses (as an argument-less macro); the transformer degrades gracefully and
// logs unknown macros so we can extend this list.
// ---------------------------------------------------------------------------

import { getParser } from "@unified-latex/unified-latex-util-parse";
import type * as Ast from "@unified-latex/unified-latex-types";

const MACROS: Record<string, { signature: string }> = {
  // sectioning
  section: { signature: "s o m" },
  subsection: { signature: "s o m" },
  subsubsection: { signature: "s o m" },
  paragraph: { signature: "s o m" },
  subparagraph: { signature: "s o m" },

  // font / text style
  textbf: { signature: "m" },
  textit: { signature: "m" },
  textsc: { signature: "m" },
  texttt: { signature: "m" },
  textrm: { signature: "m" },
  textsf: { signature: "m" },
  textnormal: { signature: "m" },
  textup: { signature: "m" },
  textsl: { signature: "m" },
  emph: { signature: "m" },
  underline: { signature: "m" },
  text: { signature: "m" },
  mbox: { signature: "m" },
  textsuperscript: { signature: "m" },
  textsubscript: { signature: "m" },
  makebox: { signature: "o o m" },

  // cross-references
  label: { signature: "m" },
  ref: { signature: "m" },
  eqref: { signature: "m" },
  pageref: { signature: "m" },
  autoref: { signature: "m" },
  nameref: { signature: "m" },
  // project ref wrappers
  figref: { signature: "m" },
  figsref: { signature: "m" },
  tableref: { signature: "m" },
  tablesref: { signature: "m" },
  appref: { signature: "m" },
  appsref: { signature: "m" },
  sectionref: { signature: "m" },
  sectionsref: { signature: "m" },

  // citations (natbib)
  cite: { signature: "s o o m" },
  citep: { signature: "s o o m" },
  citet: { signature: "s o o m" },
  citealt: { signature: "s o o m" },
  citealp: { signature: "s o o m" },
  citeauthor: { signature: "s o o m" },
  citeyear: { signature: "o o m" },
  citenum: { signature: "m" },

  // footnotes
  footnote: { signature: "o m" },
  footnotetext: { signature: "o m" },
  footnotemark: { signature: "o" },
  thanks: { signature: "m" },

  // links
  href: { signature: "m m" },
  url: { signature: "m" },
  nolinkurl: { signature: "m" },

  // graphics
  includegraphics: { signature: "o m" },
  caption: { signature: "o m" },
  captionof: { signature: "m m" },
  subcaption: { signature: "m" },

  // color
  textcolor: { signature: "o m m" },
  colorbox: { signature: "o m m" },
  fcolorbox: { signature: "o m m m" },
  color: { signature: "o m" },
  definecolor: { signature: "m m m" },
  rowcolor: { signature: "o m" },
  cellcolor: { signature: "o m" },

  // project semantic macros
  emoji: { signature: "m" },
  Mold: { signature: "" },
  Gold: { signature: "" },
  Path: { signature: "" },
  Vmold: { signature: "" },
  Vgold: { signature: "" },
  Umold: { signature: "" },
  Ugold: { signature: "" },
  Vrolo: { signature: "" },
  Vruler: { signature: "" },
  hlr: { signature: "m" },
  hlg: { signature: "m" },
  bluelabel: { signature: "m" },
  redlabel: { signature: "m" },
  blacklabel: { signature: "m" },
  greenlabel: { signature: "m" },
  scattercolorkey: { signature: "m m" },
  exmeta: { signature: "m" },
  exprompt: { signature: "m" },
  exresponse: { signature: "" },
  sptok: { signature: "m" },
  nltok: { signature: "" },
  curvecell: { signature: "m" },

  // tables
  toprule: { signature: "o" },
  midrule: { signature: "o" },
  bottomrule: { signature: "o" },
  cmidrule: { signature: "d() m" },
  multicolumn: { signature: "m m m" },
  multirow: { signature: "o m m m" },
  makecell: { signature: "o o m" },
  addlinespace: { signature: "o" },

  // title block
  title: { signature: "m" },
  author: { signature: "m" },
  date: { signature: "m" },

  // commands whose args we must swallow but otherwise drop
  vspace: { signature: "s m" },
  hspace: { signature: "s m" },
  setlength: { signature: "m m" },
  setcounter: { signature: "m m" },
  addtocounter: { signature: "m m" },
  addcontentsline: { signature: "m m m" },
  phantom: { signature: "m" },
  newcommand: { signature: "m o o m" },
  renewcommand: { signature: "m o o m" },
  providecommand: { signature: "m o o m" },
  newcolumntype: { signature: "m o m" },
  raisebox: { signature: "m o o m" },

  // bibliography (.bbl)
  bibitem: { signature: "o m" },
  natexlab: { signature: "m" },
  doi: { signature: "m" },

  // locally-defined helpers (appendix S, fancyvrb)
  liccell: { signature: "m" },
  fvset: { signature: "m" },

  // accents (grab the following letter)
  "'": { signature: "m" },
  '"': { signature: "m" },
  "^": { signature: "m" },
  "`": { signature: "m" },
  "~": { signature: "m" },
  "=": { signature: "m" },
  ".": { signature: "m" },
  u: { signature: "m" },
  v: { signature: "m" },
  c: { signature: "m" },
  r: { signature: "m" },
  H: { signature: "m" },
  k: { signature: "m" },
};

const ENVIRONMENTS: Record<string, { signature: string }> = {
  figure: { signature: "o" },
  table: { signature: "o" },
  tabular: { signature: "o m" },
  array: { signature: "o m" },
  minipage: { signature: "o o m" },
  wrapfigure: { signature: "o m m" },
  tcolorbox: { signature: "o" },
  lstlisting: { signature: "o" },
  thebibliography: { signature: "m" },
};

let cachedParser: ReturnType<typeof getParser> | null = null;

function parser() {
  if (!cachedParser) {
    cachedParser = getParser({ macros: MACROS, environments: ENVIRONMENTS });
  }
  return cachedParser;
}

/**
 * Normalize verbatim-family environments to lowercase `verbatim`, which
 * unified-latex parses with raw (newline-preserving) string content. Options
 * like `\begin{Verbatim}[frame=...]` are stripped.
 */
function preprocess(s: string): string {
  return s
    .replace(/\\begin\{Verbatim\*?\}(\[[^\]]*\])?/g, "\\begin{verbatim}")
    .replace(/\\end\{Verbatim\*?\}/g, "\\end{verbatim}")
    .replace(/\\begin\{lstlisting\}(\[[^\]]*\])?/g, "\\begin{verbatim}")
    .replace(/\\end\{lstlisting\}/g, "\\end{verbatim}")
    .replace(/\\begin\{minted\}(\{[^}]*\})?(\[[^\]]*\])?/g, "\\begin{verbatim}")
    .replace(/\\end\{minted\}/g, "\\end{verbatim}");
}

/** Parse a LaTeX string into a unified-latex Root AST. */
export function parseLatex(source: string): Ast.Root {
  return parser().parse(preprocess(source)) as Ast.Root;
}
