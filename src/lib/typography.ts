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
