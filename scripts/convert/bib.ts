// ---------------------------------------------------------------------------
// Bibliography: parse the natbib .bbl into structured, formatted references.
// Numbering + short author come from \bibcite in the .aux (see refs.ts); the
// formatted body text is rendered from each \bibitem via transformInlines.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import type * as Ast from "@unified-latex/unified-latex-types";
import type { Reference } from "./types.ts";
import type { Ctx } from "./context.ts";
import type { CiteInfo } from "./refs.ts";
import { parseLatex } from "./parse.ts";
import { transformInlines } from "./transform.ts";
import { mArg, plainText, trimNodes } from "./ast.ts";

export function parseBibliography(bblPath: string | null, ctx: Ctx, cites: Map<string, CiteInfo>): Reference[] {
  if (!bblPath || !fs.existsSync(bblPath)) return [];
  let text = fs.readFileSync(bblPath, "utf8");
  const start = text.indexOf("\\bibitem");
  if (start < 0) return [];
  const end = text.indexOf("\\end{thebibliography}");
  text = text.slice(start, end >= 0 ? end : undefined);

  const root = parseLatex(text);
  const refs: Reference[] = [];
  let curKey: string | null = null;
  let body: Ast.Node[] = [];

  const flush = () => {
    if (curKey == null) return;
    const info = cites.get(curKey);
    refs.push({
      number: info?.number ?? refs.length + 1,
      key: curKey,
      author: info?.author,
      year: info?.year,
      content: transformInlines(trimNodes(body), ctx),
    });
    body = [];
  };

  for (const n of root.content) {
    if (n.type === "macro" && n.content === "bibitem") {
      flush();
      curKey = plainText(mArg(n)).trim();
    } else if (curKey != null) {
      body.push(n);
    }
  }
  flush();
  refs.sort((a, b) => a.number - b.number);
  return refs;
}
