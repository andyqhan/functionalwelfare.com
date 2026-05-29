// ---------------------------------------------------------------------------
// \input expansion.
//
// Many figures/tables are pulled in via \input{figures/...}. We classify each:
//   - inline TikZ/pgfplots  → replaced with a synthetic \__tikzasset{relpath}
//                             macro (rendered to SVG by the figure pipeline)
//   - everything else (tabular tables, judge prompts) → parsed and spliced in
//                             place, so the surrounding float/handler sees the
//                             real nodes (a tabular, a tcolorbox, etc.)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type * as Ast from "@unified-latex/unified-latex-types";
import { PAPER_SRC } from "../../paper.config.ts";
import { parseLatex } from "./parse.ts";
import { mArg, plainText } from "./ast.ts";

const TIKZ_MARKERS = [
  "\\begin{tikzpicture}",
  "\\begin{axis}",
  "\\begin{groupplot}",
  "\\begin{pgfpicture}",
  "\\begin{semilogyaxis}",
  "\\begin{semilogxaxis}",
  "\\begin{loglogaxis}",
];

export function looksLikeTikz(src: string): boolean {
  return TIKZ_MARKERS.some((m) => src.includes(m));
}

function resolveInputPath(rel: string): string | null {
  const candidates = [rel, `${rel}.tex`];
  for (const c of candidates) {
    const abs = path.resolve(PAPER_SRC, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

function tikzAssetMacro(relPath: string): Ast.Macro {
  return {
    type: "macro",
    content: "__tikzasset",
    args: [
      {
        type: "argument",
        openMark: "{",
        closeMark: "}",
        content: [{ type: "string", content: relPath }],
      },
    ],
  };
}

/** Recursively expand \input macros within a node list. */
export function expandInputs(nodes: Ast.Node[], depth = 0): Ast.Node[] {
  if (depth > 12) return nodes; // cycle guard
  const out: Ast.Node[] = [];
  for (const n of nodes) {
    // Plain discriminant check (not the isMacro type guard) so the false branch
    // keeps macros in the union for the macro-args recursion below.
    if (n.type === "macro" && (n.content === "input" || n.content === "include")) {
      const rel = plainText(mArg(n)).trim();
      const abs = resolveInputPath(rel);
      if (!abs) {
        console.warn(`  [expand] could not resolve \\input{${rel}}`);
        continue;
      }
      const relFromSrc = path.relative(PAPER_SRC, abs);
      const src = fs.readFileSync(abs, "utf8");
      if (looksLikeTikz(src)) {
        out.push(tikzAssetMacro(relFromSrc));
      } else {
        const parsed = parseLatex(src);
        out.push(...expandInputs(parsed.content, depth + 1));
      }
      continue;
    }
    if (n.type === "environment" || n.type === "group") {
      out.push({ ...n, content: expandInputs(n.content, depth + 1) } as Ast.Node);
      continue;
    }
    if (n.type === "macro" && n.args) {
      // Expand \input nested inside macro arguments, e.g.
      // \resizebox{\textwidth}{!}{\input{figures/.../table.tex}}.
      const args = n.args.map((a) => ({ ...a, content: expandInputs(a.content, depth + 1) }));
      out.push({ ...n, args } as Ast.Node);
      continue;
    }
    out.push(n);
  }
  return out;
}
