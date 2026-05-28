// ---------------------------------------------------------------------------
// Small helpers over the unified-latex AST.
// ---------------------------------------------------------------------------

import type * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

export type Node = Ast.Node;

export function isMacro(n: Node | undefined, name?: string): n is Ast.Macro {
  return !!n && n.type === "macro" && (name === undefined || n.content === name);
}
export function isEnv(n: Node | undefined, name?: string): n is Ast.Environment {
  return !!n && n.type === "environment" && (name === undefined || (n as Ast.Environment).env === name);
}
export function isString(n: Node | undefined): n is Ast.String {
  return !!n && n.type === "string";
}
export function isWhitespace(n: Node | undefined): boolean {
  return !!n && n.type === "whitespace";
}
export function isParbreak(n: Node | undefined): boolean {
  return !!n && n.type === "parbreak";
}
export function isGroup(n: Node | undefined): n is Ast.Group {
  return !!n && n.type === "group";
}

/** Mandatory ("{}") arguments of a macro, in order. */
export function mArgs(m: Ast.Macro): Ast.Argument[] {
  return (m.args ?? []).filter((a) => a.openMark === "{");
}
/** Optional ("[]") arguments of a macro, in order. */
export function oArgs(m: Ast.Macro): Ast.Argument[] {
  return (m.args ?? []).filter((a) => a.openMark === "[");
}
/** Whether a macro's star (s) argument is present. */
export function hasStar(m: Ast.Macro): boolean {
  return (m.args ?? []).some((a) => a.openMark === "" && printRaw(a.content).trim() === "*");
}

/** Content nodes of the i-th mandatory argument (or []). */
export function mArg(m: Ast.Macro, i = 0): Node[] {
  return mArgs(m)[i]?.content ?? [];
}
/** Content nodes of the i-th optional argument (or undefined if absent). */
export function oArg(m: Ast.Macro, i = 0): Node[] | undefined {
  const a = oArgs(m)[i];
  return a ? a.content : undefined;
}

/** Serialize nodes back to (approximately) LaTeX source — used for math + verbatim. */
export function raw(nodes: Node | Node[]): string {
  return printRaw(nodes);
}

/** Plain-text extraction: concatenate string/whitespace, drop macros. Used for labels/paths. */
export function plainText(nodes: Node[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.type === "string") out += n.content;
    else if (n.type === "whitespace") out += " ";
    else if (n.type === "group") out += plainText(n.content);
    else if (n.type === "macro") {
      // common escapes that appear in paths/keys
      if (n.content === "_") out += "_";
      else if (n.content === "#") out += "#";
    }
  }
  return out;
}

/** Drop leading/trailing whitespace + parbreak nodes from a node list. */
export function trimNodes(nodes: Node[]): Node[] {
  let start = 0;
  let end = nodes.length;
  while (start < end && (isWhitespace(nodes[start]) || isParbreak(nodes[start]))) start++;
  while (end > start && (isWhitespace(nodes[end - 1]) || isParbreak(nodes[end - 1]))) end--;
  return nodes.slice(start, end);
}
