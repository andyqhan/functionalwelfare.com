// ---------------------------------------------------------------------------
// Render-time micro-typography: applied to IR inline arrays in the components.
// These are presentation tweaks (no content change), so they live site-side and
// never touch the converter or the generated IR.
// ---------------------------------------------------------------------------

import type { Inline } from "./ir";

const WJ = "⁠"; // WORD JOINER — prohibits a line break at this exact spot
const NBSP = " "; // NO-BREAK SPACE — keeps two words on the same line

// Inline nodes that render as an atomic box (KaTeX inline math, an emoji/inline
// image) introduce a line-break opportunity at their trailing edge. When the
// next text begins with punctuation (or any non-space), that punctuation can be
// stranded at the start of the next line. Gluing the boundary with a WORD JOINER
// keeps e.g. the period in "$P(\text{True})$." attached to the math.
const ATOMIC = new Set<Inline["type"]>(["mathInline", "emoji", "inlineImage"]);

export function glueAtomicPunctuation(nodes: Inline[]): Inline[] {
  let changed = false;
  const out = nodes.map((node, i) => {
    const prev = nodes[i - 1];
    if (
      node.type === "text" &&
      prev &&
      ATOMIC.has(prev.type) &&
      node.value.length > 0 &&
      !/^\s/.test(node.value)
    ) {
      changed = true;
      return { type: "text", value: WJ + node.value } as Inline;
    }
    return node;
  });
  return changed ? out : nodes;
}

// "Widont": stop a single short word being orphaned on the last line of a block
// by binding the final word break with a non-breaking space, so the last line
// always carries at least two words. Acts only when the block ends in a text
// node (the overwhelmingly common "…end of the sentence." case); blocks ending
// in a citation/footnote/etc. are left to text-wrap: pretty.
export function preventWidow(nodes: Inline[]): Inline[] {
  if (nodes.length === 0) return nodes;
  const i = nodes.length - 1;
  const last = nodes[i];
  if (last.type !== "text") return nodes;
  // head = everything up to the last word, ws = the connecting whitespace run,
  // word = the final word, tail = any trailing whitespace (preserved as-is).
  const m = /^([\s\S]*\S)(\s+)(\S+)(\s*)$/.exec(last.value);
  if (!m) return nodes; // single token / no internal break point — nothing to bind
  const out = nodes.slice();
  out[i] = { type: "text", value: m[1] + NBSP + m[3] + m[4] };
  return out;
}

// Opening quotation marks, for optical margin alignment. Double-width marks hang
// a little further than single ones.
const OPEN_DOUBLE = new Set(['"', "“", "«", "„", "‟"]); // " “ « „ ‟
const OPEN_SINGLE = new Set(["'", "‘", "‚", "‹", "‛"]); // ' ‘ ‚ ‹ ‛

// First visible character of an inline array, descending into wrappers (emph,
// strong, …) and skipping leading whitespace. Returns undefined if the block
// opens with a non-text atom (math, emoji) or nothing printable.
function firstChar(nodes: Inline[]): string | undefined {
  for (const n of nodes) {
    if (n.type === "text") {
      const t = n.value.replace(/^\s+/, "");
      if (t.length) return t[0];
      continue; // all whitespace — look at the next node
    }
    if ("content" in n && Array.isArray((n as { content?: Inline[] }).content)) {
      const c = firstChar((n as { content: Inline[] }).content);
      if (c) return c;
      continue;
    }
    return undefined; // a printable non-text atom leads the block — no hang
  }
  return undefined;
}

// Class that hangs a leading quotation mark into the margin (see global.css), or
// undefined when the block doesn't open with one.
export function leadingQuoteClass(nodes: Inline[]): string | undefined {
  const ch = firstChar(nodes);
  if (!ch) return undefined;
  if (OPEN_DOUBLE.has(ch)) return "hang-quote-d";
  if (OPEN_SINGLE.has(ch)) return "hang-quote-s";
  return undefined;
}

// Acronyms in small caps. Strings of full-height capitals shout in running prose
// and pock the grey of the column; setting them as small caps is the classic
// book/journal treatment (NASA, FBI, &c.). We wrap each one in <span class="ca">
// and let CSS lower-case-then-smcp it (Cardo has smcp but not c2sc), so the DOM
// text stays upper-case for copy/paste and screen readers.
//
// This is an explicit ALLOWLIST, not a "2+ capitals" regex, on purpose: the paper
// quotes model outputs that shout in all-caps ("…MY FINGERS ARE POSSESSED") and
// cites URL/rec codes (CHAWWT, LILI) — a blanket rule would small-cap those too,
// neutering the author's emphasis. To extend it after the .tex changes, scan the
// generated IR for capital runs and add the genuine acronyms:
//   grep -rho '"value":"[^"]*"' src/generated | grep -oE '\b[A-Z]{2,}\b' | sort | uniq -c | sort -rn
const ACRONYMS = new Set([
  "AAAI", "ACL", "AI", "API", "AUROC", "BSD", "CAD", "CC", "CI", "EACL",
  "FFT", "GOLD", "GPT", "GPU", "GRPO", "GSM8K", "HPC", "ID", "IMDB", "KL",
  "LIMA", "LLM", "LR", "MIT", "MMLU", "MOLD", "NYU", "OLS", "OSS", "PATH",
  "PC1", "PC2", "PCA", "PEFT", "PPO", "REINFORCE", "RL", "RLHF", "SFT", "SVD",
  "URL", "USA", "VAA",
]);
// Tokens that read as an English word on their own but are an acronym inside a
// fixed name — small-capped only in that context. "OR" is the conjunction in
// isolation, but the over-refusal benchmark OR-Bench; we shrink the OR, not Bench.
const CONTEXTUAL: { tok: string; after: RegExp }[] = [
  { tok: "OR", after: /^-[Bb]ench\b/ },
];
const isContextual = (tok: string, rest: string): boolean =>
  CONTEXTUAL.some((c) => c.tok === tok && c.after.test(rest));
// A capital/digit run, optionally pluralised (URLs, GPUs). Digits are allowed
// inside so names like GSM8K match as one token; pure-number and model-size runs
// (15, 4B, H200…) become candidates too but are dropped by the allowlist. \b
// before the first character leaves CamelCase ("iOS", "Qwen3") alone.
const CAP_RUN = /\b[A-Z0-9]{2,}s?\b/g;
const isAcronym = (tok: string): boolean =>
  ACRONYMS.has(tok) || (tok.endsWith("s") && ACRONYMS.has(tok.slice(0, -1)));

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Real superscript figures for footnote markers. Cardo carries true superior
// glyphs (¹²³…), but its `sups` OpenType feature can't be triggered for a bare
// digit run in the browser (the font has no DFLT script, so digit-only spans —
// "Common" script — never reach the latn-only feature). Mapping to the literal
// Unicode superscript characters sidesteps shaping entirely and renders the same
// designed glyphs in every browser. Non-digits (rare) are left untouched.
const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
export function toSuperscript(s: string): string {
  return s.replace(/[0-9]/g, (d) => SUPERSCRIPT[d]);
}

// HTML for a decoded text run, with allowlisted acronyms wrapped for small-caps.
// Used via set:html in InlineNode (text branch only — never code/tokens/math).
// Returns fully escaped HTML.
export function acronymHtml(value: string): string {
  if (!/[A-Z]{2,}/.test(value)) return escapeHtml(value); // common case: no candidates
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  CAP_RUN.lastIndex = 0;
  while ((m = CAP_RUN.exec(value)) !== null) {
    if (!isAcronym(m[0]) && !isContextual(m[0], value.slice(m.index + m[0].length))) continue;
    out += escapeHtml(value.slice(last, m.index));
    out += `<span class="ca">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(value.slice(last));
  return out;
}
