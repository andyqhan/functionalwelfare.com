// ---------------------------------------------------------------------------
// Build the interactive "tracking" density-panel data (Figs 5,6,7 + 36,37,38).
//
// These six figures share one structure: a grid of KDE density panels, each
// overlaying a positive and a negative class, for the trained model (solid line
// + light fill) and the maze-naive control (dashed line), with Cohen's d
// annotations. The static figure can't tell you which curve is which where they
// overlap; here every curve is hoverable (class, condition, std-devs, density).
//
// Rather than hand-transcribe ~16 panels × 4 curves, we PARSE the upstream tikz
// (panel titles, x-range, ylabel, the four density .dat refs, Cohen's d, colours,
// class labels) and read the referenced .dat tables, emitting one JSON.
//
// Run:  node scripts/figure-data/build-density-panels.mjs
// Reads:  <PAPER_SRC>/figures/tikz/{maze_trajectory_tracking,correctness_tracking}/*.tex
//         + the density_*.dat tables they reference
// Writes: src/data/figures/density-panels.json   (committed)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const PAPER_SRC = path.resolve(SITE_ROOT, "../valence-neurips");
const FIG = path.join(PAPER_SRC, "figures");
const OUT = path.join(SITE_ROOT, "src/data/figures/density-panels.json");

const TEX = [
  "tikz/maze_trajectory_tracking/maze_trajectory_tracking_base.tex",
  "tikz/maze_trajectory_tracking/maze_trajectory_tracking.tex",
  "tikz/correctness_tracking/correctness_tracking_base.tex",
  "tikz/correctness_tracking/correctness_tracking.tex",
  "tikz/correctness_tracking/mmlu_confidence_control_base.tex",
  "tikz/correctness_tracking/mmlu_confidence_control.tex",
];

// expand the paper's vector macros to KaTeX-renderable TeX (no \Vmold etc.)
function expandMacros(s) {
  return s
    .replace(/\\Vmold\{\}/g, "\\mathbf{v}_{\\mathrm{Mold}}")
    .replace(/\\Vgold\{\}/g, "\\mathbf{v}_{\\mathrm{Gold}}")
    .replace(/\\Umold\{\}/g, "\\mathbf{u}_{\\mathrm{Mold}}")
    .replace(/\\Ugold\{\}/g, "\\mathbf{u}_{\\mathrm{Gold}}")
    .replace(/\\,/g, "\\,");
}
// strip tikz font sizing / braces from a label, keep $math$ (macros expanded)
function cleanLabel(s) {
  if (s == null) return null;
  let t = s.replace(/\\(scriptsize|small|tiny|footnotesize|large|Large)\b/g, "").trim();
  t = t.replace(/^\{+/, "").replace(/\}+$/, "").trim();
  return expandMacros(t);
}
// content of the brace group starting at the first "{" after `key=` (balanced)
function braceArg(s, key) {
  const at = s.indexOf(key + "={");
  if (at < 0) return null;
  return balancedFrom(s, at + key.length + 1);
}
// content between the "{" at openIdx and its matching "}"
function balancedFrom(s, openIdx) {
  let depth = 0, out = "";
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") { depth++; if (depth === 1) continue; }
    else if (ch === "}") { depth--; if (depth === 0) return out; }
    out += ch;
  }
  return out;
}
function hex(tex, name) {
  const m = new RegExp(`\\\\definecolor\\{${name}\\}\\{HTML\\}\\{([0-9A-Fa-f]{6})\\}`).exec(tex);
  return m ? "#" + m[1].toLowerCase() : null;
}
function readDensity(relPath, fromDir) {
  const abs = path.resolve(fromDir, relPath);
  const lines = fs.readFileSync(abs, "utf8").trim().split("\n").slice(1);
  return lines.map((l) => {
    const c = l.trim().split(/\s+/).map(Number);
    return [c[0], c[1]];
  });
}

function buildFigure(texRel) {
  const texAbs = path.join(FIG, texRel);
  const tex = fs.readFileSync(texAbs, "utf8");
  const texDir = path.dirname(texAbs);
  const stem = path.basename(texRel, ".tex");

  const colors = {
    pos: { line: hex(tex, "posLine"), fill: hex(tex, "posFill") },
    neg: { line: hex(tex, "negLine"), fill: hex(tex, "negFill") },
  };

  const gs = /group size=(\d+) by (\d+)/.exec(tex);
  const grid = { cols: +gs[1], rows: +gs[2] };

  // legend class names: "{Word (trained)}" pairs (plain words only — exclude the
  // "$d$ = … (trained)" Cohen's-d annotations), in order pos, neg
  const legendWords = [...tex.matchAll(/\{([A-Za-z][A-Za-z ]*) \(trained\)\}/g)].map((m) => m[1].trim());
  const classes = { pos: legendWords[0] ?? "Positive", neg: legendWords[1] ?? "Negative" };

  // suptitle: node at (current bounding box.north) {TEXT}
  const supAnchor = tex.indexOf("(current bounding box.north)");
  let suptitle = "";
  if (supAnchor >= 0) {
    const open = tex.indexOf("{", supAnchor);
    suptitle = expandMacros(balancedFrom(tex, open).replace(/\\textperiodcentered\{\}/g, "·").trim());
  }

  // split into panels on \nextgroupplot
  const chunks = tex.split("\\nextgroupplot").slice(1);
  const panels = chunks.map((chunk) => {
    const title = cleanLabel(braceArg(chunk, "title") ?? "");
    const xmin = Number(/xmin=([-0-9.eE]+)/.exec(chunk)?.[1]);
    const xmax = Number(/xmax=([-0-9.eE]+)/.exec(chunk)?.[1]);
    const ylabel = cleanLabel(braceArg(chunk, "ylabel"));
    const xlabel = /xlabel=\{/.test(chunk);

    // density file refs → keyed by trained/naive × pos/neg
    const refs = [...chunk.matchAll(/table\[x=x, y=density\]\s*\{([^}]+)\}/g)].map((m) => m[1]);
    const pick = (cond, sign) =>
      refs.find((r) => r.includes(`_${cond}_${sign}.dat`));
    const curves = {};
    for (const cond of ["trained", "naive"])
      for (const sign of ["pos", "neg"]) {
        const f = pick(cond, sign);
        if (f) curves[`${cond}_${sign}`] = readDensity(f, texDir);
      }

    // Cohen's d: "{$d$\,=\,VALUE (trained)}" / "(naive)"
    const dOf = (cond) => /\$d\$\\,=\\,([-+0-9.]+) \((\w+)\)/g &&
      [...chunk.matchAll(/\$d\$\\,=\\,([-+0-9.]+) \((\w+)\)/g)].find((m) => m[2] === cond)?.[1];
    const cohen = { trained: dOf("trained") ?? null, naive: dOf("naive") ?? null };

    return { title, xmin, xmax, ylabel, xlabel, curves, cohen };
  });

  return { stem, figure: { suptitle, grid, colors, classes, panels } };
}

const figures = {};
for (const t of TEX) {
  const { stem, figure } = buildFigure(t);
  figures[stem] = figure;
  const npts = figure.panels.reduce((m, p) => m + Object.values(p.curves).reduce((a, c) => a + c.length, 0), 0);
  console.log(`[density] ${stem.padEnd(34)} ${figure.grid.cols}×${figure.grid.rows} panels, classes=${figure.classes.pos}/${figure.classes.neg}, ${npts} pts`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ figures }, null, 0) + "\n");
console.log(`\n[density] wrote ${path.relative(SITE_ROOT, OUT)} (${Object.keys(figures).length} figures)`);
