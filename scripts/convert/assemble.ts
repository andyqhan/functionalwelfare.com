// ---------------------------------------------------------------------------
// Assemble the document: read the main .tex, extract front matter (title,
// authors, abstract, epigraph), and produce the ordered list of content units
// (main sections + appendix), each with its \input-expanded AST.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type * as Ast from "@unified-latex/unified-latex-types";
import { MAIN_TEX, PAPER_SRC } from "../../paper.config.ts";
import { parseLatex } from "./parse.ts";
import { expandInputs } from "./expand.ts";
import { hasStar, mArg, mArgs, plainText } from "./ast.ts";

export interface UnitSpec {
  slug: string;
  kind: "main" | "appendix";
  source: string;
  defaultTitle: string;
  nodes: Ast.Node[];
}

export interface Assembled {
  titleNodes: Ast.Node[];
  authorNameNodes: Ast.Node[][];
  affiliationNodes: Ast.Node[];
  thanksNodes: Ast.Node[];
  repoUrl?: string;
  correspondenceEmail?: string;
  abstractNodes: Ast.Node[];
  epigraphCenter?: Ast.Environment;
  units: UnitSpec[];
}

function findMacro(nodes: Ast.Node[], name: string): Ast.Macro | null {
  for (const n of nodes) {
    if (n.type === "macro" && n.content === name) return n;
    if (n.type === "environment" || n.type === "group") {
      const r = findMacro(n.content, name);
      if (r) return r;
    } else if (n.type === "macro" && n.args) {
      for (const a of n.args) {
        const r = findMacro(a.content, name);
        if (r) return r;
      }
    }
  }
  return null;
}

function findAllMacros(nodes: Ast.Node[], name: string, acc: Ast.Macro[] = []): Ast.Macro[] {
  for (const n of nodes) {
    if (n.type === "macro" && n.content === name) acc.push(n);
    if (n.type === "environment" || n.type === "group") findAllMacros(n.content, name, acc);
    else if (n.type === "macro" && n.args) for (const a of n.args) findAllMacros(a.content, name, acc);
  }
  return acc;
}

function stripMacro(nodes: Ast.Node[], name: string): Ast.Node[] {
  return nodes.filter((n) => !(n.type === "macro" && n.content === name));
}

function paperSlug(file: string): string {
  return path.basename(file).replace(/\.tex$/, "").replace(/^\d+_/, "").replace(/_/g, "-");
}
function appendixSlug(file: string): { slug: string; letter: string } {
  const base = path.basename(file).replace(/\.tex$/, "");
  const letter = base.split("_")[0];
  return { slug: `appendix-${letter.toLowerCase()}`, letter };
}

function readUnitNodes(relTexPath: string): Ast.Node[] {
  const abs = path.resolve(PAPER_SRC, relTexPath.endsWith(".tex") ? relTexPath : `${relTexPath}.tex`);
  const src = fs.readFileSync(abs, "utf8");
  return expandInputs(parseLatex(src).content);
}

export function assemble(): Assembled {
  const root = parseLatex(fs.readFileSync(MAIN_TEX, "utf8"));

  // ---- front matter from preamble ----
  const titleMacro = findMacro(root.content, "title");
  const titleNodes = titleMacro ? mArg(titleMacro) : [];

  const authorMacro = findMacro(root.content, "author");
  const authorArg = authorMacro ? mArg(authorMacro) : [];
  const boxes = findAllMacros(authorArg, "makebox");
  const authorNameNodes: Ast.Node[][] = boxes.map((b) => {
    const args = mArgs(b);
    const nameNodes = args.length ? args[args.length - 1].content : [];
    return stripMacro(nameNodes, "thanks");
  });

  // affiliation: text following the top-level "\\" inside the author arg
  let affiliationNodes: Ast.Node[] = [];
  const brIdx = authorArg.findIndex((n) => n.type === "macro" && n.content === "\\");
  if (brIdx >= 0) affiliationNodes = authorArg.slice(brIdx + 1);

  // \thanks → correspondence + repo url
  const thanksMacro = findMacro(authorArg, "thanks");
  const thanksNodes = thanksMacro ? mArg(thanksMacro) : [];
  const urlMacro = findMacro(thanksNodes, "url");
  const repoUrl = urlMacro ? plainText(mArg(urlMacro)).trim() : undefined;
  const emailMatch = plainText(thanksNodes).match(/[\w.+-]+@[\w.-]+\.\w+/);

  // ---- walk the document body ----
  let documentContent: Ast.Node[] = [];
  for (const n of root.content) {
    if (n.type === "environment" && n.env === "document") {
      documentContent = n.content;
      break;
    }
  }

  let abstractNodes: Ast.Node[] = [];
  let epigraphCenter: Ast.Environment | undefined;
  const units: UnitSpec[] = [];

  let mode: "main" | "appendix" = "main";
  let appendixOverview: Ast.Node[] | null = null;

  for (const n of documentContent) {
    if (n.type === "environment" && n.env === "abstract") {
      abstractNodes = expandInputs(n.content);
      continue;
    }
    if (n.type === "environment" && n.env === "center" && !epigraphCenter) {
      epigraphCenter = { ...n, content: expandInputs(n.content) } as Ast.Environment;
      continue;
    }
    if (n.type === "environment" && n.env === "ack") {
      units.push({
        slug: "acknowledgments",
        kind: "main",
        source: "ack",
        defaultTitle: "Acknowledgments",
        nodes: expandInputs(n.content),
      });
      continue;
    }
    if (n.type === "macro" && n.content === "appendix") {
      mode = "appendix";
      appendixOverview = null; // start collecting only at the "Appendix overview" heading
      continue;
    }
    // begin the overview unit at the starred \section{Appendix overview},
    // skipping the \makeatletter/\let/\renewcommand redefinition prologue
    if (mode === "appendix" && appendixOverview === null && n.type === "macro" && n.content === "section" && hasStar(n)) {
      appendixOverview = [n];
      continue;
    }
    if (n.type === "macro" && (n.content === "input" || n.content === "include")) {
      const rel = plainText(mArg(n)).trim();
      if (rel.startsWith("paper/")) {
        units.push({ slug: paperSlug(rel), kind: "main", source: rel, defaultTitle: paperSlug(rel), nodes: readUnitNodes(rel) });
      } else if (rel.startsWith("appendix/")) {
        // flush the appendix overview unit once, before the first appendix file
        if (appendixOverview) {
          units.push({
            slug: "appendix-overview",
            kind: "appendix",
            source: "appendix-overview",
            defaultTitle: "Appendix overview",
            nodes: expandInputs(appendixOverview),
          });
          appendixOverview = null;
        }
        const { slug, letter } = appendixSlug(rel);
        units.push({ slug, kind: "appendix", source: rel, defaultTitle: letter, nodes: readUnitNodes(rel) });
      }
      continue;
    }
    // collect appendix-overview prose between \appendix and first \input{appendix/...}
    if (mode === "appendix" && appendixOverview) {
      appendixOverview.push(n);
    }
  }

  return {
    titleNodes,
    authorNameNodes,
    affiliationNodes,
    thanksNodes,
    repoUrl,
    correspondenceEmail: emailMatch ? emailMatch[0] : undefined,
    abstractNodes,
    epigraphCenter,
    units,
  };
}
