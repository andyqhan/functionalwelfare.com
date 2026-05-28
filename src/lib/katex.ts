// ---------------------------------------------------------------------------
// Build-time KaTeX rendering with the paper's shared macro dictionary.
// ---------------------------------------------------------------------------

import katex from "katex";

const MACROS: Record<string, string> = {
  "\\Mold": "\\mathrm{Mold}",
  "\\Gold": "\\mathrm{Gold}",
  "\\Path": "\\mathrm{Path}",
  "\\Vmold": "\\mathbf{v}_{\\mathrm{Mold}}",
  "\\Vgold": "\\mathbf{v}_{\\mathrm{Gold}}",
  "\\Umold": "\\mathbf{u}_{\\mathrm{Mold}}",
  "\\Ugold": "\\mathbf{u}_{\\mathrm{Gold}}",
  "\\Vrolo": "\\mathbf{v}_{\\includegraphics[height=0.72em]{/paper/emoji/card-index.png}}",
  "\\Vruler": "\\mathbf{v}_{\\includegraphics[height=0.72em]{/paper/emoji/triangular-ruler.png}}",
};

export function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      macros: MACROS,
      strict: false,
      trust: (ctx) => ctx.command === "\\includegraphics",
    });
  } catch {
    return `<code class="math-error">${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
