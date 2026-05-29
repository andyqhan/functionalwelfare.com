// ---------------------------------------------------------------------------
// IR → Markdown serialization, for LLM/agent consumption.
//
// The site renders IR to HTML for humans; this module renders the same IR to
// clean Markdown for machines. It powers the static .md/.txt endpoints
// (src/pages/*.md.ts, llms.txt, llms-full.txt) and the "Copy for LLM" button.
//
// Pure module: no Astro/DOM. It reads the already-generated IR through the
// existing loader helpers in ./ir, so no `pnpm convert` step is involved.
// ---------------------------------------------------------------------------

import type { Block, Inline, Unit } from "./ir";
import {
  manifest,
  mainUnits,
  appendixUnits,
  getUnit,
  appendixSummaries,
  appendixParam,
} from "./ir";
import { proseNumber } from "./katex";

const ARXIV_ID = "2605.30232";
const ARXIV_URL = `https://arxiv.org/abs/${ARXIV_ID}`;

// Absolute-URL base, so pasted Markdown still resolves figures/links. Mirrors
// astro.config.mjs `site`; falls back to the production domain if unset.
const SITE = (((import.meta as any).env?.SITE as string | undefined) ?? "https://functionalwelfare.com").replace(/\/$/, "");
function abs(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return SITE + (path.startsWith("/") ? path : "/" + path);
}

// --- Math macros -----------------------------------------------------------
// Mirror of the custom \newcommands in src/lib/katex.ts (MACROS), but expanded
// to portable plain LaTeX — no \htmlClass / \includegraphics — so the math is
// self-contained in a raw .md file. katex.ts is the source of truth; the set is
// small and stable, so keep these in sync if it changes. Compound macros (V*/U*)
// are listed before the bare name macros they contain.
const MD_MACROS: [RegExp, string][] = [
  [/\\Vmold\b/g, "\\mathbf{v}_{\\text{Mold}}"],
  [/\\Vgold\b/g, "\\mathbf{v}_{\\text{Gold}}"],
  [/\\Umold\b/g, "\\mathbf{u}_{\\text{Mold}}"],
  [/\\Ugold\b/g, "\\mathbf{u}_{\\text{Gold}}"],
  [/\\Vrolo\b/g, "\\mathbf{v}_{\\text{🗂}}"],
  [/\\Vruler\b/g, "\\mathbf{v}_{\\text{📐}}"],
  [/\\Mold\b/g, "\\text{Mold}"],
  [/\\Gold\b/g, "\\text{Gold}"],
  [/\\Path\b/g, "\\text{Path}"],
];
function expandMacros(tex: string): string {
  let out = tex;
  for (const [re, rep] of MD_MACROS) out = out.replace(re, rep);
  return out;
}

// Emoji nodes carry either a CLDR short name or a hex-codepoint sequence
// (e.g. "1f385-1f3fe", joined by "-"). Named ones are mapped explicitly; the
// codepoint form is decoded to the actual glyph; anything else → :name:.
const EMOJI: Record<string, string> = {
  "card-index": "🗂",
  "triangular-ruler": "📐",
  receipt: "🧾",
  "deciduous-tree": "🌳",
  automobile: "🚗",
};
function emojiChar(name: string): string {
  if (EMOJI[name]) return EMOJI[name];
  if (/^[0-9a-f]{2,}(?:-[0-9a-f]{2,})*$/i.test(name)) {
    try {
      return String.fromCodePoint(...name.split("-").map((h) => parseInt(h, 16)));
    } catch {
      /* not a valid codepoint sequence — fall through */
    }
  }
  return `:${name}:`;
}

// ============================ Inline ====================================

function inline(nodes: Inline[]): string {
  return nodes.map(inlineOne).join("");
}

function codeSpan(v: string): string {
  return v.includes("`") ? "`` " + v + " ``" : "`" + v + "`";
}

function inlineOne(n: Inline): string {
  switch (n.type) {
    case "text":
      return n.value;
    case "emph":
      return `*${inline(n.content)}*`;
    case "strong":
      return `**${inline(n.content)}**`;
    case "smallcaps":
    case "underline":
    case "highlight":
      return inline(n.content); // no Markdown equivalent — keep the text
    case "coloredLabel":
      return n.bold ? `**${inline(n.content)}**` : inline(n.content);
    case "code":
    case "token":
      return codeSpan(n.value);
    case "sup":
      return `<sup>${inline(n.content)}</sup>`;
    case "sub":
      return `<sub>${inline(n.content)}</sub>`;
    case "link":
      return `[${inline(n.content)}](${n.href})`;
    case "mathInline": {
      const pn = proseNumber(n.tex); // bare numbers render as plain text, like the site
      return pn !== null ? pn : `$${expandMacros(n.tex)}$`;
    }
    case "emoji":
      return emojiChar(n.name);
    case "inlineImage":
      return `![${n.alt ?? ""}](${abs(n.src)})`;
    case "footnoteRef":
      return `[^${n.id}]`;
    case "crossRef":
    case "citeRef":
      return n.text; // already-resolved display text ("Figure 1", "§3.1", "[12]")
    case "break":
      return "  \n";
    default:
      return "";
  }
}

/** Inline rendered as bare text (no Markdown markers) — for titles/authors. */
function plain(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return n.value;
      if (n.type === "code" || n.type === "token") return n.value;
      if (n.type === "crossRef" || n.type === "citeRef") return n.text;
      if (n.type === "break") return " ";
      if ("content" in n && Array.isArray((n as any).content)) return plain((n as any).content);
      return "";
    })
    .join("");
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

// ============================ Blocks ====================================

interface Opts {
  /** Added to each heading level (doc title is "#", so main sections use 1). */
  headingOffset: number;
}

function blocks(bs: Block[], opts: Opts): string {
  return bs
    .map((b) => blockOne(b, opts))
    .map((s) => s.trimEnd())
    .filter((s) => s.length > 0)
    .join("\n\n");
}

type FigureB = Extract<Block, { type: "figure" }>;
type TableB = Extract<Block, { type: "table" }>;
type ListB = Extract<Block, { type: "list" }>;
type EpigraphB = Extract<Block, { type: "epigraph" }>;
type ModelExB = Extract<Block, { type: "modelExample" }>;

function blockOne(b: Block, opts: Opts): string {
  switch (b.type) {
    case "heading": {
      const lvl = Math.max(1, Math.min(b.level + opts.headingOffset, 6));
      const num = b.number ? b.number + " " : "";
      return "#".repeat(lvl) + " " + num + inline(b.title);
    }
    case "paragraph":
      return inline(b.content);
    case "mathBlock":
      return "$$\n" + expandMacros(b.tex) + "\n$$";
    case "list":
      return listMd(b, opts);
    case "blockquote":
    case "callout":
      return quote(blocks(b.content, opts));
    case "center":
      return blocks(b.content, opts);
    case "verbatim":
      return fence(b.value);
    case "epigraph":
      return epigraphMd(b);
    case "figure":
      return figureMd(b);
    case "table":
      return tableMd(b);
    case "modelExample":
      return modelExampleMd(b);
    default:
      return "";
  }
}

/** Prefix every line with "> " (blank lines become ">"). */
function quote(s: string): string {
  return s
    .split("\n")
    .map((l) => (l.length ? "> " + l : ">"))
    .join("\n");
}

/** Fenced code block, widening the fence past any backtick run inside. */
function fence(v: string): string {
  const runs = v.match(/`+/g);
  const n = runs ? Math.max(3, Math.max(...runs.map((r) => r.length)) + 1) : 3;
  const f = "`".repeat(n);
  return `${f}\n${v.replace(/\n+$/, "")}\n${f}`;
}

function listMd(b: ListB, opts: Opts): string {
  return b.items
    .map((it, i) => {
      const marker = b.ordered ? `${i + 1}. ` : "- ";
      const pad = " ".repeat(marker.length);
      const body = blocks(it.content, opts);
      return body
        .split("\n")
        .map((l, j) => (j === 0 ? marker + l : l.length ? pad + l : ""))
        .join("\n");
    })
    .join("\n");
}

function epigraphMd(b: EpigraphB): string {
  const body = b.lines.map((l) => inline(l)).join("\n");
  let s = quote(body);
  if (b.attribution) s += "\n>\n> — " + inline(b.attribution);
  return s;
}

function figureMd(b: FigureB): string {
  const imgs = b.items
    .map((it) => {
      const src = it.svg ?? it.png;
      const altText = it.alt ?? (b.number ? `Figure ${b.number}` : "figure");
      return src ? `![${altText}](${abs(src)})` : "";
    })
    .filter(Boolean)
    .join("\n\n");
  const cap = b.caption.length ? `**Figure ${b.number ?? ""}.** ${tidy(inline(b.caption))}` : "";
  return [imgs, cap].filter(Boolean).join("\n\n");
}

const escapeCell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

function tableMd(b: TableB): string {
  const cap = b.caption.length || b.number ? `**Table ${b.number ?? ""}.** ${tidy(inline(b.caption))}` : "";
  const rows = b.rows ?? [];
  if (b.kind === "image" || rows.length === 0) {
    const src = b.asImage?.svg ?? b.asImage?.png;
    const img = src ? `![${b.number ? `Table ${b.number}` : "table"}](${abs(src)})` : "";
    return [img, cap].filter(Boolean).join("\n\n");
  }
  // Data table → GFM. Colspan pads with empty cells; rowspan is flattened
  // (GFM has no spans) — lossy but readable for an LLM.
  const ncol = Math.max(...rows.map((r) => r.reduce((a, c) => a + (c.colspan || 1), 0)));
  type Row = NonNullable<TableB["rows"]>[number];
  const fmtRow = (r: Row) => {
    const cells: string[] = [];
    for (const c of r) {
      cells.push(escapeCell(inline(c.content)));
      for (let k = 1; k < (c.colspan || 1); k++) cells.push("");
    }
    while (cells.length < ncol) cells.push("");
    return "| " + cells.join(" | ") + " |";
  };
  const lines = [fmtRow(rows[0]), "| " + Array(ncol).fill("---").join(" | ") + " |"];
  for (let i = 1; i < rows.length; i++) lines.push(fmtRow(rows[i]));
  return [cap, lines.join("\n")].filter(Boolean).join("\n\n");
}

function modelExampleMd(b: ModelExB): string {
  const labels: Record<string, string> = { prompt: "**Prompt:** ", response: "**Response:** " };
  const parts = b.parts.map((p) => {
    const txt = tidy(inline(p.content));
    if (p.kind === "meta") return `_${txt}_`;
    return (labels[p.kind] ?? "") + txt;
  });
  return quote(parts.join("\n\n"));
}

// ============================ Documents =================================

function frontMatterMd(): string {
  const title = tidy(plain(manifest.title));
  const authors = manifest.authors.map((a) => tidy(plain(a.name))).join(", ");
  const affil = manifest.affiliation ? tidy(plain(manifest.affiliation)) : "";
  const meta = [`[arXiv:${ARXIV_ID}](${ARXIV_URL})`];
  if (manifest.repoUrl) meta.push(`[Code](${manifest.repoUrl})`);
  return [
    "# " + title,
    `_${[authors, affil].filter(Boolean).join(" — ")}_`,
    meta.join(" · "),
    "## Abstract",
    blocks(manifest.abstract, { headingOffset: 1 }),
  ].join("\n\n");
}

function unitToMd(u: Unit, opts: Opts): string {
  let s = blocks(u.blocks, opts);
  if (u.footnotes?.length) {
    const fns = u.footnotes
      .map((f) => `[^${f.id}]: ${blocks(f.content, opts).replace(/\n/g, "\n    ")}`)
      .join("\n\n");
    s += "\n\n" + fns;
  }
  return s;
}

function referencesMd(): string {
  if (!manifest.references.length) return "";
  const items = manifest.references.map((r) => `${r.number}. ${tidy(inline(r.content))}`);
  return "## References\n\n" + items.join("\n");
}

/** Body only: title, abstract, main sections, references. No appendices. */
export function bodyMarkdown(): string {
  const parts = [frontMatterMd(), ...mainUnits().map((u) => unitToMd(u, { headingOffset: 1 })), referencesMd()];
  return parts.filter(Boolean).join("\n\n") + "\n";
}

/** One appendix as a standalone document (its heading becomes the H1). */
export function appendixMarkdown(slug: string): string {
  const u = getUnit(slug);
  return u ? unitToMd(u, { headingOffset: 0 }) + "\n" : "";
}

/** The whole paper: body + every appendix, in one file. */
export function fullMarkdown(): string {
  const parts = [
    frontMatterMd(),
    ...mainUnits().map((u) => unitToMd(u, { headingOffset: 1 })),
    referencesMd(),
    ...appendixUnits().map((u) => unitToMd(u, { headingOffset: 1 })),
  ];
  return parts.filter(Boolean).join("\n\n") + "\n";
}

/** Curated index per the llmstxt.org spec (links, not the full dump). */
export function llmsTxt(): string {
  const title = tidy(plain(manifest.title));
  const authors = manifest.authors.map((a) => tidy(plain(a.name))).join(", ");
  const affil = manifest.affiliation ? tidy(plain(manifest.affiliation)) : "";
  const firstPara = manifest.abstract.find((b) => b.type === "paragraph");
  const summary = firstPara ? tidy(inline((firstPara as any).content)) : "";

  const out: string[] = ["# " + title];
  if (summary) out.push("> " + summary);
  out.push(
    `${authors}${affil ? ` (${affil})` : ""}. [arXiv:${ARXIV_ID}](${ARXIV_URL})${
      manifest.repoUrl ? ` · [Code](${manifest.repoUrl})` : ""
    }.`,
  );

  out.push("## Paper");
  out.push(`- [Main text (Markdown)](${abs("/index.md")}): title, abstract, main sections, and references.`);

  const apx = appendixSummaries()
    .filter((s) => s.slug !== "appendix-overview")
    .map((s) => {
      const label = s.number ? `${s.number} · ${tidy(plain(s.title))}` : tidy(plain(s.title));
      return `- [${label}](${abs(`/appendix/${appendixParam(s.slug)}.md`)})`;
    });
  if (apx.length) {
    out.push("## Appendices");
    out.push(apx.join("\n"));
  }

  out.push("## Full text");
  out.push(`- [Entire paper, single file](${abs("/llms-full.txt")}): main text plus all appendices.`);

  const links = [`- [arXiv](${ARXIV_URL})`];
  if (manifest.repoUrl) links.push(`- [Code repository](${manifest.repoUrl})`);
  out.push("## Links");
  out.push(links.join("\n"));

  return out.join("\n\n") + "\n";
}
