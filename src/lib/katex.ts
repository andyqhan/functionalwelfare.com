// ---------------------------------------------------------------------------
// Build-time KaTeX rendering with the paper's shared macro dictionary.
// ---------------------------------------------------------------------------

import katex from "katex";

// Tile names (Mold/Gold/Path) render as true small caps even inside math, matching
// the \textsc small caps used in prose. \htmlClass tags the name; the
// `.katex .sc-math` rule in global.css swaps in Cardo + font-variant:small-caps.
// This reaches every occurrence — standalone and embedded in subscripts.
const sc = (name: string) => `\\htmlClass{sc-math}{\\text{${name}}}`;

const MACROS: Record<string, string> = {
  // KaTeX has no \textsc; some math in the paper writes tile names as
  // \textsc{mold} directly (e.g. App. L). Render it as true small caps too.
  "\\textsc": "\\htmlClass{sc-math}{\\text{#1}}",
  "\\Mold": sc("Mold"),
  "\\Gold": sc("Gold"),
  "\\Path": sc("Path"),
  "\\Vmold": `\\mathbf{v}_{${sc("Mold")}}`,
  "\\Vgold": `\\mathbf{v}_{${sc("Gold")}}`,
  "\\Umold": `\\mathbf{u}_{${sc("Mold")}}`,
  "\\Ugold": `\\mathbf{u}_{${sc("Gold")}}`,
  "\\Vrolo": "\\mathbf{v}_{\\includegraphics[height=0.72em]{/paper/emoji/card-index.png}}",
  "\\Vruler": "\\mathbf{v}_{\\includegraphics[height=0.72em]{/paper/emoji/triangular-ruler.png}}",
};

// A standalone inline-math node that is really just a number in running prose
// (e.g. $15$, $50\%$, $2{,}000$, $-0.13$, $+4$). KaTeX would set these in
// KaTeX_Main's lining figures; rendering them as plain text instead lets them
// inherit the body's oldstyle figures — and the lining/tabular override inside
// tables — like any other prose number. Anything more than a bare number
// (fractions, \times, \approx, symbols, variables) returns null and stays math.
const PROSE_NUMBER = /^([+-]?)(\d+(?:\{,\}\d{3})*)(\.\d+)?(\\%|%)?$/;

export function proseNumber(tex: string): string | null {
  const m = PROSE_NUMBER.exec(tex.trim());
  if (!m) return null;
  const sign = m[1] === "-" ? "−" : m[1]; // U+2212 true minus, matching math
  const digits = m[2].replace(/\{,\}/g, ","); // TeX {,} thousands separator → comma
  const decimals = m[3] ?? "";
  const percent = m[4] ? "%" : "";
  return `${sign}${digits}${decimals}${percent}`;
}

export function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      macros: MACROS,
      strict: false,
      trust: (ctx) => ctx.command === "\\includegraphics" || ctx.command === "\\htmlClass",
    });
  } catch {
    return `<code class="math-error">${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
