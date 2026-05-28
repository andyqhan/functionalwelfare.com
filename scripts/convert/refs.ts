// ---------------------------------------------------------------------------
// Cross-reference + citation numbering, sourced from a LaTeX prepass.
//
// We run `latexmk -xelatex` once (cached by a hash of the .tex/.bib sources) to
// produce neurips_2026.aux, then parse:
//   \newlabel{KEY}{{NUMBER}{PAGE}{TITLE}{ANCHOR}{}}   → label → number + kind
//   \bibcite{KEY}{{NUM}{YEAR}{{ShortAuthor}}{{Long}}} → citekey → number/author
//
// This gives numbers that exactly match the compiled PDF. If the prepass is
// unavailable (compile fails / tools missing), callers fall back to "?".
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CACHE_DIR, MAIN_TEX, PAPER_SRC } from "../../paper.config.ts";

export type RefKind =
  | "figure"
  | "table"
  | "section"
  | "subsection"
  | "subsubsection"
  | "equation"
  | "appendix"
  | "item"
  | "unknown";

export interface LabelInfo {
  number: string;
  /** Inferred from the hyperref anchor (e.g. "figure.1" → figure). */
  kind: RefKind;
  /** Hyperref anchor name, e.g. "figure.1", "section.3", "subsection.3.1". */
  anchor: string;
}

export interface CiteInfo {
  number: number;
  year?: string;
  /** Short author label, e.g. "Sofroniew et al.". */
  author?: string;
}

export interface RefData {
  labels: Map<string, LabelInfo>;
  cites: Map<string, CiteInfo>;
  auxPath: string | null;
  bblPath: string | null;
}

const AUX_BASENAME = "neurips_2026.aux";
const BBL_BASENAME = "neurips_2026.bbl";

function hashSources(): string {
  const h = crypto.createHash("sha1");
  const exts = new Set([".tex", ".bib", ".sty"]);
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ent.name.startsWith(".")) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (exts.has(path.extname(ent.name))) {
        h.update(ent.name);
        h.update(fs.readFileSync(p));
      }
    }
  };
  walk(PAPER_SRC);
  return h.digest("hex");
}

/**
 * Ensure the LaTeX prepass has been run for the current sources. Cached: skips
 * the (slow) xelatex run when sources are unchanged and an .aux already exists.
 * Returns the directory containing the .aux, or null on failure.
 */
export function ensurePrepass(opts: { force?: boolean } = {}): string | null {
  const outDir = path.join(CACHE_DIR, "latex");
  fs.mkdirSync(outDir, { recursive: true });
  const hashFile = path.join(outDir, ".source-hash");
  const auxPath = path.join(outDir, AUX_BASENAME);
  const currentHash = hashSources();
  const cachedHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, "utf8").trim() : "";

  if (!opts.force && fs.existsSync(auxPath) && cachedHash === currentHash) {
    return outDir;
  }

  try {
    console.log("  [refs] running latexmk -xelatex prepass (this can take ~1 min)…");
    execFileSync(
      "latexmk",
      ["-xelatex", "-interaction=nonstopmode", "-f", `-outdir=${outDir}`, MAIN_TEX],
      { cwd: PAPER_SRC, stdio: "ignore", timeout: 5 * 60_000 },
    );
  } catch {
    // latexmk returns non-zero on warnings; the .aux is usually still written.
    if (!fs.existsSync(auxPath)) {
      console.warn("  [refs] latexmk failed and no .aux was produced; numbers will be unresolved.");
      return null;
    }
    console.warn("  [refs] latexmk reported errors but an .aux exists; using it.");
  }
  fs.writeFileSync(hashFile, currentHash);
  return outDir;
}

function anchorToKind(anchor: string): RefKind {
  const base = anchor.split(".")[0];
  switch (base) {
    case "figure":
      return "figure";
    case "table":
      return "table";
    case "section":
      return "section";
    case "subsection":
      return "subsection";
    case "subsubsection":
      return "subsubsection";
    case "equation":
      return "equation";
    case "item":
    case "Item":
      return "item";
    case "appendix":
      return "appendix";
    default:
      return "unknown";
  }
}

/** Find the first .bbl, checking the prepass out-dir then the source tree. */
function findBbl(outDir: string | null): string | null {
  const candidates = [
    outDir ? path.join(outDir, BBL_BASENAME) : null,
    path.join(PAPER_SRC, BBL_BASENAME),
  ].filter(Boolean) as string[];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/**
 * Parse balanced-brace groups starting at index `i` (which must point at "{").
 * Returns the inner content and the index just past the closing brace.
 */
function readGroup(s: string, i: number): { inner: string; next: number } {
  if (s[i] !== "{") return { inner: "", next: i };
  let depth = 0;
  const start = i;
  for (; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return { inner: s.slice(start + 1, i), next: i + 1 };
    }
  }
  return { inner: s.slice(start + 1), next: s.length };
}

function parseAux(auxText: string): { labels: Map<string, LabelInfo>; cites: Map<string, CiteInfo> } {
  const labels = new Map<string, LabelInfo>();
  const cites = new Map<string, CiteInfo>();

  // \newlabel{KEY}{{NUMBER}{PAGE}{TITLE}{ANCHOR}{}}
  const newlabelRe = /\\newlabel\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = newlabelRe.exec(auxText))) {
    const keyG = readGroup(auxText, m.index + m[0].length - 1);
    const key = keyG.inner;
    // Skip hyperref's @cref companions like {key@cref}.
    if (key.includes("@")) continue;
    const payload = readGroup(auxText, keyG.next);
    // payload.inner = {NUMBER}{PAGE}{TITLE}{ANCHOR}{}
    const numberG = readGroup(payload.inner, 0);
    let cur = numberG.next;
    const pageG = readGroup(payload.inner, cur);
    cur = pageG.next;
    const titleG = readGroup(payload.inner, cur);
    cur = titleG.next;
    const anchorG = readGroup(payload.inner, cur);
    const anchor = anchorG.inner;
    if (!labels.has(key)) {
      labels.set(key, { number: numberG.inner.trim(), kind: anchorToKind(anchor), anchor });
    }
  }

  // \bibcite{KEY}{{NUM}{YEAR}{{ShortAuthor}}{{Long}}}  OR  \bibcite{KEY}{NUM}
  const bibciteRe = /\\bibcite\s*\{/g;
  while ((m = bibciteRe.exec(auxText))) {
    const keyG = readGroup(auxText, m.index + m[0].length - 1);
    const key = keyG.inner;
    const payload = readGroup(auxText, keyG.next);
    const inner = payload.inner;
    if (inner.startsWith("{")) {
      const numG = readGroup(inner, 0);
      const yearG = readGroup(inner, numG.next);
      const authG = readGroup(inner, yearG.next);
      cites.set(key, {
        number: parseInt(numG.inner, 10),
        year: yearG.inner.trim() || undefined,
        author: cleanTexInline(authG.inner) || undefined,
      });
    } else {
      cites.set(key, { number: parseInt(inner, 10) });
    }
  }
  return { labels, cites };
}

/** Minimal TeX → text cleanup for short strings (author labels). */
export function cleanTexInline(s: string): string {
  return s
    .replace(/\\natexlab\s*\{[^}]*\}/g, "")
    .replace(/~/g, " ")
    .replace(/\\&/g, "&")
    .replace(/[{}]/g, "")
    .replace(/\\,/g, " ")
    .trim();
}

export function loadRefData(opts: { force?: boolean } = {}): RefData {
  const outDir = ensurePrepass(opts);
  const auxPath = outDir ? path.join(outDir, AUX_BASENAME) : null;
  const bblPath = findBbl(outDir);
  if (!auxPath || !fs.existsSync(auxPath)) {
    return { labels: new Map(), cites: new Map(), auxPath: null, bblPath };
  }
  const { labels, cites } = parseAux(fs.readFileSync(auxPath, "utf8"));
  return { labels, cites, auxPath, bblPath };
}
