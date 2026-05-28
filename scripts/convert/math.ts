// ---------------------------------------------------------------------------
// Math → KaTeX-ready TeX.
//
// We serialize math AST back to a TeX string (printRaw). Display environments
// that KaTeX does not support at top level (align/gather) are wrapped in their
// KaTeX-supported counterparts (aligned/gathered). The project's math macros
// (\Vmold etc.) are left intact and defined in the shared KaTeX macro dict on
// the site.
// ---------------------------------------------------------------------------

import type * as Ast from "@unified-latex/unified-latex-types";
import { isMacro, mArg, plainText, raw } from "./ast.ts";

/** Pull the first \label{...} out of a node list; return label + remaining nodes. */
export function extractLabel(nodes: Ast.Node[]): { label?: string; rest: Ast.Node[] } {
  let label: string | undefined;
  const rest: Ast.Node[] = [];
  for (const n of nodes) {
    if (isMacro(n, "label")) {
      label = plainText(mArg(n)).trim();
      continue;
    }
    rest.push(n);
  }
  return { label, rest };
}

/** Serialize inline math ($...$) content. */
export function inlineMathTex(node: Ast.InlineMath): string {
  return raw(node.content).trim();
}

/** Build display-math TeX from an `equation`/`align`/... environment. */
export function displayEnvTex(env: Ast.Environment): { tex: string; label?: string } {
  const { label, rest } = extractLabel(env.content);
  const body = raw(rest).trim();
  const name = env.env.replace(/\*$/, "");
  let tex: string;
  switch (name) {
    case "align":
    case "alignat":
    case "flalign":
    case "eqnarray":
      tex = `\\begin{aligned}\n${body}\n\\end{aligned}`;
      break;
    case "gather":
      tex = `\\begin{gathered}\n${body}\n\\end{gathered}`;
      break;
    case "multline":
      tex = body;
      break;
    default: // equation, displaymath, math, $$
      tex = body;
  }
  return { tex, label };
}

/** Build display-math TeX from a bare \[ ... \] DisplayMath node. */
export function displayMathTex(node: Ast.DisplayMath): { tex: string; label?: string } {
  const { label, rest } = extractLabel(node.content);
  return { tex: raw(rest).trim(), label };
}
