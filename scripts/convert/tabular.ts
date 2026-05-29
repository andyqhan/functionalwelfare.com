// ---------------------------------------------------------------------------
// tabular → structured rows.
//
// Splits a tabular environment into rows (on \\) and cells (on &), handling
// booktabs rules, \multicolumn (colspan), and column alignment from the
// preamble. Cell content is rendered by transformInlines (which handles
// \makecell line breaks, math, emoji, highlights, etc.).
// ---------------------------------------------------------------------------

import type * as Ast from "@unified-latex/unified-latex-types";
import type { TableCell, TableRow } from "./types.ts";
import type { Ctx } from "./context.ts";
import { isMacro, mArg, plainText, trimNodes } from "./ast.ts";
import { resolveTintHex, transformInlines } from "./transform.ts";

type Align = "left" | "center" | "right";

const RULE_MACROS = new Set(["toprule", "midrule", "bottomrule", "hline", "cmidrule", "cline", "morecmidrules"]);
const SKIP_MACROS = new Set(["addlinespace", "noalign"]);

function letterToAlign(letter: string): Align {
  const c = letter.trim().toLowerCase()[0];
  if (c === "c") return "center";
  if (c === "r") return "right";
  return "left"; // l, p, m, b, X, ...
}

function parseColSpec(arg: Ast.Node[]): Align[] {
  const aligns: Align[] = [];
  for (const n of arg) {
    if (n.type !== "string") continue; // skip @{...}, p{...} width groups, etc.
    for (const ch of n.content) {
      if (ch === "l" || ch === "c" || ch === "r" || ch === "p" || ch === "m" || ch === "b" || ch === "X") {
        aligns.push(letterToAlign(ch));
      }
    }
  }
  return aligns;
}

function colspecArgOf(env: Ast.Environment): Ast.Node[] {
  const m = (env.args ?? []).filter((a) => a.openMark === "{").pop();
  return m?.content ?? [];
}

/** Split a flat node list into rows of cells (node lists). */
function splitRows(content: Ast.Node[]): { cells: Ast.Node[][]; ruleAbove: boolean; bg?: string }[] {
  const rows: { cells: Ast.Node[][]; ruleAbove: boolean; bg?: string }[] = [];
  let cells: Ast.Node[][] = [[]];
  let ruleNext = false;
  let bgNext: string | undefined;

  const finishRow = () => {
    const trimmed = cells.map(trimNodes);
    const isBlank = trimmed.every((c) => c.length === 0);
    if (!isBlank) rows.push({ cells, ruleAbove: ruleNext, bg: bgNext });
    cells = [[]];
    ruleNext = false;
    bgNext = undefined;
  };

  for (const n of content) {
    if (n.type === "macro" && n.content === "\\") {
      finishRow();
      continue;
    }
    if (n.type === "macro" && RULE_MACROS.has(n.content)) {
      if (n.content === "toprule" || n.content === "midrule") ruleNext = true;
      continue;
    }
    if (n.type === "macro" && n.content === "rowcolor") {
      bgNext = resolveTintHex(plainText(mArg(n))) ?? bgNext;
      continue;
    }
    if (n.type === "macro" && SKIP_MACROS.has(n.content)) continue;
    if (n.type === "string" && n.content.includes("&")) {
      const parts = n.content.split("&");
      cells[cells.length - 1].push({ type: "string", content: parts[0] });
      for (let i = 1; i < parts.length; i++) {
        cells.push([{ type: "string", content: parts[i] }]);
      }
      continue;
    }
    cells[cells.length - 1].push(n);
  }
  // trailing row without a final \\
  if (cells.some((c) => trimNodes(c).length > 0)) finishRow();
  return rows;
}

function buildCell(nodes: Ast.Node[], ctx: Ctx, colAlign: Align[], colIndex: number, ruleAbove: boolean, bg?: string): TableCell {
  const trimmed = trimNodes(nodes).filter((n) => n.type !== "comment");
  let colspan = 1;
  let align: Align = colAlign[colIndex] ?? "left";
  let content;

  // \multicolumn always spans the whole cell; find it regardless of stray nodes.
  const mc = trimmed.find((n) => isMacro(n, "multicolumn")) as Ast.Macro | undefined;
  if (mc) {
    colspan = parseInt(plainText(mArg(mc, 0)), 10) || 1;
    align = letterToAlign(plainText(mArg(mc, 1)));
    content = transformInlines(mArg(mc, 2), ctx);
  } else {
    content = transformInlines(trimmed, ctx);
  }
  return { content, align, colspan, rowspan: 1, ruleAbove: ruleAbove || undefined, bg };
}

export function parseTabular(env: Ast.Environment, ctx: Ctx): { rows: TableRow[]; columnAlign: Align[] } {
  const columnAlign = parseColSpec(colspecArgOf(env));
  const rawRows = splitRows(env.content);
  const rows: TableRow[] = rawRows.map(({ cells, ruleAbove, bg }) => {
    const out: TableCell[] = [];
    let col = 0;
    for (const cnodes of cells) {
      const cell = buildCell(cnodes, ctx, columnAlign, col, ruleAbove, bg);
      out.push(cell);
      col += cell.colspan;
    }
    return out;
  });
  return { rows, columnAlign };
}
