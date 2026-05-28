// ---------------------------------------------------------------------------
// AST → IR transform: the heart of the converter.
//   transformInlines(nodes, ctx) → Inline[]
//   transformBlocks(nodes, ctx)  → Block[]
// ---------------------------------------------------------------------------

import type * as Ast from "@unified-latex/unified-latex-types";
import type {
  Block,
  Epigraph,
  FigureBlock,
  FigureItem,
  Inline,
  ListItem,
  ModelExamplePart,
  TableBlock,
} from "./types.ts";
import type { Ctx } from "./context.ts";
import { isEnv, isMacro, mArg, mArgs, oArg, plainText, raw, trimNodes } from "./ast.ts";
import { displayEnvTex, displayMathTex, inlineMathTex } from "./math.ts";
import { parseTabular } from "./tabular.ts";

// ----------------------------- color map --------------------------------

const COLORS: Record<string, string> = {
  mildred: "#FFCDD2",
  mildgreen: "#D5E8D4",
  labelGoldText: "#5B8DB8",
  labelMoldText: "#D47971",
  labelOriginText: "#222222",
  labelResidualText: "#1F7B4A",
  gray: "#777777",
  black: "#000000",
  red: "#cc0000",
  blue: "#1a4f8b",
};
function resolveColor(name: string): string {
  const n = name.trim();
  if (/^[0-9A-Fa-f]{6}$/.test(n)) return `#${n}`;
  return COLORS[n] ?? "#333333";
}

// --------------------------- text decoding ------------------------------

function decodeText(s: string): string {
  return s
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/``/g, "“")
    .replace(/''/g, "”")
    .replace(/`/g, "‘")
    .replace(/'/g, "’")
    .replace(/~/g, " ");
}
function text(value: string): Inline {
  return { type: "text", value };
}

// ----------------------- macro lookup tables ----------------------------

const SPACE_MACROS = new Set([" ", ",", ";", ":", "quad", "qquad", "enspace", "thinspace", "medspace", "thickspace", ">", "<", "/"]);
const DROP_INLINE_MACROS = new Set([
  "centering", "noindent", "indent", "smallskip", "medskip", "bigskip", "hfill", "vfill",
  "clearpage", "newpage", "FloatBarrier", "maketitle", "itshape", "bfseries", "normalfont",
  "rmfamily", "sffamily", "ttfamily", "upshape", "slshape", "scshape", "em", "small",
  "footnotesize", "scriptsize", "tiny", "normalsize", "large", "Large", "LARGE", "huge", "Huge",
  "makeatletter", "makeatother", "protect", "leavevmode", "strut", "null", "par",
  "setlength", "setcounter", "addtocounter", "addcontentsline", "phantom", "vspace", "hspace",
  "newcommand", "renewcommand", "providecommand", "newcolumntype", "today", "noalign", "raggedright", "raggedleft",
  "newblock", "bibitem", "fvset", "penalty", "begingroup", "endgroup", "let", "oldappendixsection", "makeatletter", "makeatother",
]);
const ACCENTS: Record<string, string> = {
  "'": "́", '"': "̈", "`": "̀", "^": "̂", "~": "̃",
  "=": "̄", ".": "̇", u: "̆", v: "̌", c: "̧",
  r: "̊", H: "̋", k: "̨",
};
const LITERAL_MACROS: Record<string, string> = {
  "%": "%", "&": "&", "#": "#", "_": "_", "{": "{", "}": "}", $: "$",
  S: "§", P: "¶",
  textbackslash: "\\", textasciitilde: "~", textvisiblespace: "␣",
  textunderscore: "_", textbar: "|", textgreater: ">", textless: "<",
  textasciicircum: "^", textendash: "–", textemdash: "—",
  textellipsis: "…", ldots: "…", dots: "…", cdots: "⋯",
  LaTeX: "LaTeX", TeX: "TeX", LaTeXe: "LaTeX2ε",
  textquotedblleft: "“", textquotedblright: "”",
  textquoteleft: "‘", textquoteright: "’",
  copyright: "©", textregistered: "®", texttrademark: "™",
  pounds: "£", textdegree: "°",
};
const FONT_WRAP: Record<string, Inline["type"]> = {
  emph: "emph", textit: "emph", textsl: "emph",
  textbf: "strong",
  textsc: "smallcaps",
  underline: "underline",
};
const FLATTEN_MACROS = new Set(["textrm", "textnormal", "textsf", "textup", "text", "mbox", "ensuremathtext", "natexlab", "doi"]);

// ------------------------------- inlines --------------------------------

export function transformInlines(nodes: Ast.Node[], ctx: Ctx): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "string":
        out.push(text(decodeText(n.content)));
        break;
      case "whitespace":
        out.push(text(" "));
        break;
      case "parbreak":
        out.push(text(" "));
        break;
      case "comment":
        // a `%` comment swallows the trailing space of its line into
        // leadingWhitespace; preserve it so words don't run together
        if ((n as any).leadingWhitespace) out.push(text(" "));
        break;
      case "group":
        out.push(...transformInlines(n.content, ctx));
        break;
      case "inlinemath":
        out.push({ type: "mathInline", tex: inlineMathTex(n) });
        break;
      case "displaymath":
        out.push({ type: "mathInline", tex: displayMathTex(n).tex });
        break;
      case "macro":
        out.push(...macroToInlines(n, ctx));
        break;
      default:
        break;
    }
  }
  return out;
}

function inl(nodes: Ast.Node[], ctx: Ctx): Inline[] {
  return transformInlines(nodes, ctx);
}

function macroToInlines(m: Ast.Macro, ctx: Ctx): Inline[] {
  const name = m.content;

  // line break
  if (name === "\\" || name === "newline" || name === "linebreak") return [{ type: "break" }];

  // spacing
  if (SPACE_MACROS.has(name)) return [text(" ")];
  if (name === "!") return [];

  // accents: combine the diacritic onto the following letter
  if (name in ACCENTS) {
    const base = plainText(mArg(m));
    return [text(base + ACCENTS[name])];
  }

  // literal characters
  if (name in LITERAL_MACROS) return [text(LITERAL_MACROS[name])];

  // font wrappers
  if (name in FONT_WRAP) {
    return [{ type: FONT_WRAP[name], content: inl(mArg(m), ctx) } as Inline];
  }
  if (FLATTEN_MACROS.has(name)) return inl(mArg(m), ctx);
  if (name === "texttt") return [{ type: "code", value: plainText(mArg(m)) }];
  if (name === "textsuperscript") return [{ type: "sup", content: inl(mArg(m), ctx) }];
  if (name === "textsubscript") return [{ type: "sub", content: inl(mArg(m), ctx) }];
  if (name === "ensuremath") return [{ type: "mathInline", tex: raw(mArg(m)).trim() }];

  // ---- project semantic macros ----
  if (name === "emoji") {
    const ename = plainText(mArg(m)).trim();
    return [{ type: "emoji", name: ename, src: ctx.assets.emoji(ename) }];
  }
  if (name === "Mold" || name === "Gold" || name === "Path") {
    return [{ type: "smallcaps", content: [text(name)] }];
  }
  if (["Vmold", "Vgold", "Umold", "Ugold", "Vrolo", "Vruler"].includes(name)) {
    return [{ type: "mathInline", tex: `\\${name}` }];
  }
  if (name === "hlr" || name === "hlg") {
    return [{ type: "highlight", color: name === "hlr" ? "red" : "green", content: inl(mArg(m), ctx) }];
  }
  if (name === "bluelabel") return [coloredLabel("#5B8DB8", inl(mArg(m), ctx), true)];
  if (name === "redlabel") return [coloredLabel("#D47971", inl(mArg(m), ctx), true)];
  if (name === "blacklabel") return [coloredLabel("#222222", inl(mArg(m), ctx), true)];
  if (name === "greenlabel") return [coloredLabel("#1F7B4A", inl(mArg(m), ctx), false)];
  if (name === "scattercolorkey") return scatterColorKey(m, ctx);
  if (name === "sptok") return [{ type: "token", value: "␣" + plainText(mArg(m)) }];
  if (name === "nltok") return [{ type: "token", value: "\\n" }];
  if (name === "curvecell") {
    const a = ctx.assets.curve(plainText(mArg(m)).trim());
    return [{ type: "inlineImage", src: a.svg ?? a.png ?? "", alt: "training curve" }];
  }
  if (name === "__tikzasset") {
    const a = ctx.assets.tikz(plainText(mArg(m)).trim());
    return [{ type: "inlineImage", src: a.svg ?? a.png ?? "" }];
  }
  if (name === "makecell") {
    // content is the last mandatory arg; \\ inside becomes break
    const args = mArgs(m);
    const contentArg = args.length ? args[args.length - 1].content : [];
    return inl(contentArg, ctx);
  }

  // color
  if (name === "textcolor") {
    return [coloredLabel(resolveColor(plainText(mArg(m, 0))), inl(mArg(m, 1), ctx), false)];
  }
  if (name === "colorbox") {
    const c = plainText(mArg(m, 0)).trim();
    const color = c === "mildgreen" ? "green" : "red";
    return [{ type: "highlight", color, content: inl(mArg(m, 1), ctx) }];
  }
  if (name === "color" || name === "definecolor") return [];

  // links
  if (name === "liccell") {
    const u = plainText(mArg(m)).trim();
    return [{ type: "link", href: `https://${u}`, content: [text(u)], mono: true }];
  }
  if (name === "href") return [{ type: "link", href: plainText(mArg(m, 0)).trim(), content: inl(mArg(m, 1), ctx) }];
  if (name === "url" || name === "nolinkurl") {
    const u = plainText(mArg(m)).trim();
    return [{ type: "link", href: u, content: [text(u)], mono: true }];
  }

  // images (inline)
  if (name === "includegraphics") {
    const src = plainText(mArg(m)).trim();
    const a = ctx.assets.image(src);
    const opt = oArg(m) ? raw(oArg(m)!) : "";
    const hm = /height\s*=\s*([0-9.]+)\s*em/.exec(opt);
    return [{ type: "inlineImage", src: a.svg ?? a.png ?? "", heightEm: hm ? parseFloat(hm[1]) : undefined }];
  }

  // cross references
  if (name === "ref") return [bareRef(plainText(mArg(m)).trim(), ctx)];
  if (name === "eqref") {
    const t = plainText(mArg(m)).trim();
    const num = refNumber(t, ctx);
    return [{ type: "crossRef", kind: "equation", target: t, text: `(${num})` }];
  }
  if (name === "pageref" || name === "autoref" || name === "nameref") {
    return [bareRef(plainText(mArg(m)).trim(), ctx)];
  }
  if (name === "figref") return [wrapRef(m, "figure", "Figure", ctx)];
  if (name === "figsref") return [wrapRef(m, "figure", "Figures", ctx)];
  if (name === "tableref") return [wrapRef(m, "table", "Table", ctx)];
  if (name === "tablesref") return [wrapRef(m, "table", "Tables", ctx)];
  if (name === "appref") return [wrapRef(m, "appendix", "Appendix", ctx)];
  if (name === "appsref") return [wrapRef(m, "appendix", "Appendices", ctx)];
  if (name === "sectionref") return [wrapRef(m, "section", "§", ctx, true)];
  if (name === "sectionsref") return [wrapRef(m, "section", "§§", ctx, true)];

  // citations
  if (["cite", "citep", "citet", "citealt", "citealp", "citeauthor", "citenum"].includes(name)) {
    return [makeCite(m, name, ctx)];
  }
  if (name === "citeyear") {
    const keys = splitKeys(mArg(m));
    const yr = keys.map((k) => ctx.refs.cites.get(k)?.year ?? "?").join(", ");
    return [text(yr)];
  }

  // footnotes
  if (name === "footnote") {
    const id = ctx.addFootnote(transformBlocks(mArg(m), ctx));
    return [{ type: "footnoteRef", id }];
  }
  if (name === "thanks") {
    const id = ctx.addFootnote(transformBlocks(mArg(m), ctx));
    return [{ type: "footnoteRef", id }];
  }
  if (name === "footnotemark") return [];
  if (name === "footnotetext") {
    ctx.addFootnote(transformBlocks(mArg(m), ctx));
    return [];
  }

  // makebox / raisebox: render last mandatory arg
  if (name === "makebox" || name === "raisebox" || name === "fbox" || name === "framebox") {
    const args = mArgs(m);
    return args.length ? inl(args[args.length - 1].content, ctx) : [];
  }

  // labels/captions handled at block level; ignore if seen inline
  if (name === "label" || name === "caption" || name === "captionof") return [];

  // drop-list (formatting/structural)
  if (DROP_INLINE_MACROS.has(name)) return [];

  // unknown: record and pass through any mandatory content
  ctx.stats.unknownMacros.set(name, (ctx.stats.unknownMacros.get(name) ?? 0) + 1);
  const ma = mArgs(m);
  if (ma.length) return inl(ma[ma.length - 1].content, ctx);
  return [];
}

function coloredLabel(color: string, content: Inline[], bold: boolean): Inline {
  return { type: "coloredLabel", color, bold, content };
}

function scatterColorKey(m: Ast.Macro, ctx: Ctx): Inline[] {
  const a = inl(mArg(m, 0), ctx); // x-axis (red)
  const b = inl(mArg(m, 1), ctx); // y-axis (blue)
  const out: Inline[] = [];
  out.push(coloredLabel("#5B8DB8", [text("Blue labels")], true));
  out.push(text(" are most similar to "));
  out.push(...b);
  out.push(text(" (y-axis); "));
  out.push(coloredLabel("#D47971", [text("red labels")], true));
  out.push(text(" are most similar to "));
  out.push(...a);
  out.push(text(" (x-axis); "));
  out.push(coloredLabel("#222222", [text("black labels")], true));
  out.push(text(" are closest to the origin; "));
  out.push(coloredLabel("#1F7B4A", [text("green labels")], false));
  out.push(text(" are most deviant from the best-fit line."));
  return out;
}

// ------------------------ ref / cite helpers ----------------------------

function refNumber(label: string, ctx: Ctx): string {
  const info = ctx.refs.labels.get(label);
  if (!info) {
    ctx.stats.unresolvedRefs.add(label);
    return "?";
  }
  return info.number;
}
function bareRef(label: string, ctx: Ctx): Inline {
  const info = ctx.refs.labels.get(label);
  if (!info) ctx.stats.unresolvedRefs.add(label);
  const kind = info?.kind;
  const mapped =
    kind === "figure" ? "figure" :
    kind === "table" ? "table" :
    kind === "equation" ? "equation" :
    kind === "appendix" ? "appendix" : "section";
  return { type: "crossRef", kind: mapped, target: label, text: info?.number ?? "?" };
}
function wrapRef(m: Ast.Macro, kind: "figure" | "table" | "section" | "appendix", prefix: string, ctx: Ctx, noSpace = false): Inline {
  const label = plainText(mArg(m)).trim();
  const num = refNumber(label, ctx);
  const sep = noSpace ? "" : " ";
  return { type: "crossRef", kind, target: label, text: `${prefix}${sep}${num}` };
}

function splitKeys(nodes: Ast.Node[]): string[] {
  return plainText(nodes)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function makeCite(m: Ast.Macro, name: string, ctx: Ctx): Inline {
  const keys = splitKeys(mArg(m));
  const nums = keys.map((k) => ctx.refs.cites.get(k)?.number);
  const style: "p" | "t" = name === "citet" || name === "citealt" ? "t" : "p";
  let display: string;
  if (name === "citeauthor") {
    display = keys.map((k) => ctx.refs.cites.get(k)?.author ?? "?").join(", ");
  } else if (style === "t") {
    display = keys
      .map((k) => {
        const c = ctx.refs.cites.get(k);
        return `${c?.author ?? "?"} [${c?.number ?? "?"}]`;
      })
      .join(", ");
  } else {
    display = `[${nums.map((n) => n ?? "?").join(", ")}]`;
  }
  keys.forEach((k) => {
    if (!ctx.refs.cites.has(k)) ctx.stats.unresolvedRefs.add(`cite:${k}`);
  });
  return { type: "citeRef", keys, style, text: display };
}

// ------------------------------- blocks ---------------------------------

const HEADING_LEVELS: Record<string, 1 | 2 | 3 | 4> = {
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
  subparagraph: 4,
};

function slugifyLabel(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
function inlineToPlain(inls: Inline[]): string {
  let s = "";
  for (const i of inls) {
    if (i.type === "text") s += i.value;
    else if (i.type === "code" || i.type === "token") s += i.value;
    else if ("content" in i && Array.isArray((i as any).content)) s += inlineToPlain((i as any).content);
  }
  return s;
}

export function transformBlocks(nodes: Ast.Node[], ctx: Ctx): Block[] {
  const blocks: Block[] = [];
  let para: Ast.Node[] = [];

  const flush = () => {
    const trimmed = trimNodes(para);
    para = [];
    if (!trimmed.length) return;
    const inls = transformInlines(trimmed, ctx);
    if (inls.some((i) => i.type !== "text" || i.value.trim() !== "")) {
      blocks.push({ type: "paragraph", content: inls });
    }
  };
  const lastBlock = () => blocks[blocks.length - 1];

  for (const n of nodes) {
    if (n.type === "parbreak") {
      flush();
      continue;
    }
    if (n.type === "macro" && n.content === "par") {
      flush();
      continue;
    }
    if (n.type === "comment") {
      if ((n as any).leadingWhitespace) para.push({ type: "whitespace" });
      continue;
    }
    if (n.type === "verbatim") {
      flush();
      blocks.push({ type: "verbatim", value: (n as Ast.VerbatimEnvironment).content.replace(/^\n+|\n+$/g, "") });
      continue;
    }

    if (n.type === "macro") {
      const lvl = HEADING_LEVELS[n.content];
      if (lvl) {
        flush();
        blocks.push(makeHeading(n, lvl, ctx));
        continue;
      }
      if (n.content === "label") {
        const lb = lastBlock();
        const key = plainText(mArg(n)).trim();
        if (trimNodes(para).length === 0 && lb && "label" in lb) {
          (lb as any).label = key;
          const id = (lb as any).id ?? ctx.makeId(slugifyLabel(key));
          (lb as any).id = id;
          if (!(lb as any).number) {
            const info = ctx.refs.labels.get(key);
            if (info) (lb as any).number = info.number;
          }
          ctx.registerLabel(key, id);
        }
        continue;
      }
      if (n.content === "__tikzasset") {
        flush();
        blocks.push(standaloneTikz(n, ctx));
        continue;
      }
      // otherwise inline content
      para.push(n);
      continue;
    }

    if (n.type === "displaymath") {
      flush();
      blocks.push(makeMathBlockFromDisplay(n, ctx));
      continue;
    }

    if (n.type === "environment") {
      const handled = transformEnvironment(n, ctx);
      if (handled) {
        flush();
        blocks.push(...handled);
      }
      continue;
    }

    // strings, whitespace, math, groups → inline
    para.push(n);
  }
  flush();
  return blocks;
}

function makeHeading(m: Ast.Macro, level: 1 | 2 | 3 | 4, ctx: Ctx): Block {
  const title = inl(mArg(m), ctx);
  const id = ctx.makeId(slugifyLabel(inlineToPlain(title)) || `sec-${blocksCounter()}`);
  return { type: "heading", level, title, id };
}
let _hc = 0;
function blocksCounter() {
  return ++_hc;
}

function makeMathBlockFromDisplay(node: Ast.DisplayMath, ctx: Ctx): Block {
  const { tex, label } = displayMathTex(node);
  return finalizeMath(tex, label, ctx);
}
function finalizeMath(tex: string, label: string | undefined, ctx: Ctx): Block {
  const block: any = { type: "mathBlock", tex };
  if (label) {
    const id = ctx.makeId(slugifyLabel(label));
    block.label = label;
    block.id = id;
    block.number = ctx.refs.labels.get(label)?.number;
    ctx.registerLabel(label, id);
  }
  return block;
}

// --------------------------- environments -------------------------------

const MATH_ENVS = new Set(["equation", "equation*", "align", "align*", "alignat", "alignat*", "flalign", "gather", "gather*", "multline", "multline*", "eqnarray", "eqnarray*", "displaymath", "math"]);

function transformEnvironment(env: Ast.Environment, ctx: Ctx): Block[] | null {
  const name = env.env;

  if (name === "figure" || name === "figure*" || name === "wrapfigure") {
    return [buildFigure(env, ctx, name === "wrapfigure")];
  }
  if (name === "table" || name === "table*") {
    return [buildTable(env, ctx)];
  }
  if (name === "tabular" || name === "tabular*" || name === "array") {
    // bare tabular not wrapped in a float
    const { rows, columnAlign } = parseTabular(env, ctx);
    ctx.stats.counts.tables++;
    return [{ type: "table", label: ctx.makeId("tab"), caption: [], kind: "data", rows, columnAlign }];
  }
  if (MATH_ENVS.has(name)) {
    const { tex, label } = displayEnvTex(env);
    return [finalizeMath(tex, label, ctx)];
  }
  if (name === "itemize" || name === "description") return [buildList(env, ctx, false)];
  if (name === "enumerate") return [buildList(env, ctx, true)];
  if (name === "quote" || name === "quotation") {
    return [{ type: "blockquote", content: transformBlocks(env.content, ctx) }];
  }
  if (name === "modelexample") return [buildModelExample(env, ctx)];
  if (name === "tcolorbox") return [{ type: "callout", content: transformBlocks(env.content, ctx) }];
  if (name === "center") return [buildCenter(env, ctx)];
  if (name === "flushleft" || name === "flushright" || name === "minipage" || name === "spacing" || name === "singlespace") {
    return transformBlocks(env.content, ctx);
  }
  if (name === "ack") {
    const blocks = transformBlocks(env.content, ctx);
    return blocks;
  }
  if (name === "abstract" || name === "thebibliography" || name === "document") {
    return transformBlocks(env.content, ctx);
  }

  // unknown environment: record + pass through content
  ctx.stats.unknownEnvs.set(name, (ctx.stats.unknownEnvs.get(name) ?? 0) + 1);
  return transformBlocks(env.content, ctx);
}

// figures -------------------------------------------------------------

function parseWidthFrac(opt: string): number | undefined {
  const m = /width\s*=\s*([0-9.]*)\s*\\(?:textwidth|linewidth|columnwidth)/.exec(opt);
  if (m) return m[1] ? parseFloat(m[1]) : 1;
  return undefined;
}

function collectFigureParts(nodes: Ast.Node[], ctx: Ctx, items: FigureItem[], capRef: { caption?: Inline[] }, lblRef: { label?: string }) {
  for (const n of nodes) {
    if (n.type === "macro") {
      switch (n.content) {
        case "includegraphics": {
          const src = plainText(mArg(n)).trim();
          const a = ctx.assets.image(src);
          const opt = oArg(n) ? raw(oArg(n)!) : "";
          items.push({ svg: a.svg, png: a.png, widthFrac: parseWidthFrac(opt) });
          break;
        }
        case "__tikzasset": {
          const a = ctx.assets.tikz(plainText(mArg(n)).trim());
          items.push({ svg: a.svg, png: a.png, widthFrac: 1 });
          break;
        }
        case "curvecell": {
          const a = ctx.assets.curve(plainText(mArg(n)).trim());
          items.push({ svg: a.svg, png: a.png, widthFrac: 0.31 });
          break;
        }
        case "caption": {
          const args = mArgs(n);
          capRef.caption = inl(args.length ? args[args.length - 1].content : [], ctx);
          break;
        }
        case "label":
          lblRef.label = plainText(mArg(n)).trim();
          break;
        // do NOT recurse into arbitrary macro args (e.g. \newcommand definition
        // bodies) — images live directly in the env / groups / minipages.
      }
    } else if (n.type === "environment" || n.type === "group") {
      collectFigureParts(n.content, ctx, items, capRef, lblRef);
    }
  }
}

function buildFigure(env: Ast.Environment, ctx: Ctx, wrap: boolean): FigureBlock {
  const items: FigureItem[] = [];
  const capRef: { caption?: Inline[] } = {};
  const lblRef: { label?: string } = {};
  collectFigureParts(env.content, ctx, items, capRef, lblRef);

  const label = lblRef.label ?? "";
  const id = ctx.makeId(label ? slugifyLabel(label) : "fig");
  if (label) ctx.registerLabel(label, id);
  ctx.stats.counts.figures++;
  return {
    type: "figure",
    label: label || id,
    number: label ? ctx.refs.labels.get(label)?.number : undefined,
    layout: items.length > 1 ? "row" : "single",
    items,
    caption: capRef.caption ?? [],
    wrap: wrap || undefined,
  };
}

function standaloneTikz(m: Ast.Macro, ctx: Ctx): FigureBlock {
  const a = ctx.assets.tikz(plainText(mArg(m)).trim());
  const id = ctx.makeId("fig");
  ctx.stats.counts.figures++;
  return { type: "figure", label: id, layout: "single", items: [{ svg: a.svg, png: a.png, widthFrac: 1 }], caption: [] };
}

// tables --------------------------------------------------------------

function findFirst(nodes: Ast.Node[], pred: (n: Ast.Node) => boolean): Ast.Node | null {
  for (const n of nodes) {
    if (pred(n)) return n;
    if (n.type === "environment" || n.type === "group") {
      const r = findFirst(n.content, pred);
      if (r) return r;
    }
  }
  return null;
}

function buildTable(env: Ast.Environment, ctx: Ctx): TableBlock {
  const capRef: { caption?: Inline[] } = {};
  const lblRef: { label?: string } = {};
  // caption + label can be anywhere in the float
  const walk = (nodes: Ast.Node[]) => {
    for (const n of nodes) {
      if (n.type === "macro") {
        if (n.content === "caption") {
          const args = mArgs(n);
          capRef.caption = inl(args.length ? args[args.length - 1].content : [], ctx);
        } else if (n.content === "label") {
          lblRef.label = plainText(mArg(n)).trim();
        }
      } else if (n.type === "environment" || n.type === "group") {
        walk(n.content);
      }
    }
  };
  walk(env.content);

  const label = lblRef.label ?? "";
  const id = ctx.makeId(label ? slugifyLabel(label) : "tab");
  if (label) ctx.registerLabel(label, id);
  ctx.stats.counts.tables++;
  const base = {
    type: "table" as const,
    label: label || id,
    number: label ? ctx.refs.labels.get(label)?.number : undefined,
    caption: capRef.caption ?? [],
  };

  const tabularNode = findFirst(env.content, (n) => isEnv(n, "tabular") || isEnv(n, "tabular*") || isEnv(n, "array")) as Ast.Environment | null;
  if (tabularNode) {
    const { rows, columnAlign } = parseTabular(tabularNode, ctx);
    return { ...base, kind: "data", rows, columnAlign };
  }
  const tikz = findFirst(env.content, (n) => isMacro(n, "__tikzasset")) as Ast.Macro | null;
  if (tikz) {
    const a = ctx.assets.tikz(plainText(mArg(tikz)).trim());
    return { ...base, kind: "image", asImage: { svg: a.svg, png: a.png } };
  }
  const img = findFirst(env.content, (n) => isMacro(n, "includegraphics")) as Ast.Macro | null;
  if (img) {
    const a = ctx.assets.image(plainText(mArg(img)).trim());
    return { ...base, kind: "image", asImage: { svg: a.svg, png: a.png } };
  }
  return { ...base, kind: "data", rows: [] };
}

// lists ---------------------------------------------------------------

function buildList(env: Ast.Environment, ctx: Ctx, ordered: boolean): Block {
  const items: ListItem[] = [];
  let cur: Ast.Node[] | null = null;
  for (const n of env.content) {
    if (isMacro(n, "item")) {
      if (cur) items.push({ content: transformBlocks(cur, ctx) });
      cur = [];
      continue;
    }
    if (cur) cur.push(n);
  }
  if (cur) items.push({ content: transformBlocks(cur, ctx) });
  return { type: "list", ordered, items };
}

// model example -------------------------------------------------------

function buildModelExample(env: Ast.Environment, ctx: Ctx): Block {
  const parts: ModelExamplePart[] = [];
  let respBuf: Ast.Node[] = [];
  const flushResp = () => {
    const t = trimNodes(respBuf);
    respBuf = [];
    if (t.length) parts.push({ kind: "response", content: inl(t, ctx) });
  };
  for (const n of env.content) {
    if (isMacro(n, "exmeta")) {
      flushResp();
      parts.push({ kind: "meta", content: inl(mArg(n), ctx) });
    } else if (isMacro(n, "exprompt")) {
      flushResp();
      parts.push({ kind: "prompt", content: inl(mArg(n), ctx) });
    } else if (isMacro(n, "exresponse")) {
      flushResp();
    } else {
      respBuf.push(n);
    }
  }
  flushResp();
  ctx.stats.counts.modelExamples++;
  return { type: "modelExample", parts };
}

// center / epigraph ---------------------------------------------------

function buildCenter(env: Ast.Environment, ctx: Ctx): Block {
  const hasItalic = env.content.some((n) => isMacro(n, "itshape") || isMacro(n, "textit") || isMacro(n, "emph"));
  const tabularNode = findFirst(env.content, (n) => isEnv(n, "tabular")) as Ast.Environment | null;
  if (hasItalic && tabularNode) {
    return tabularToEpigraph(tabularNode, ctx);
  }
  return { type: "center", content: transformBlocks(env.content, ctx) };
}

export function tabularToEpigraph(tabularNode: Ast.Environment, ctx: Ctx): Epigraph {
  const { rows } = parseTabular(tabularNode, ctx);
  const lines = rows.map((r) => r.flatMap((c) => c.content));
  return { type: "epigraph", lines };
}
