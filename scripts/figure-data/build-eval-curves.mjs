// ---------------------------------------------------------------------------
// Build the interactive steering eval-curve data (Fig 4, + appendix eval grids).
//
// The eval figures share one data shape: per (condition, eval, model, concept) a
// `.dat` table of `alpha mean lo hi` (steering strength → mean ± 95% bootstrap
// CI), plus optional norm-matched (`*_nm*`) variants and `*_inc.dat`
// (`alpha rate`) incoherent-fraction bars. We re-emit a declared set of figures
// as one self-contained JSON the site renders into a grid of line+CI-band panels
// where each curve point is hoverable (strength, mean, CI).
//
// Run:  node scripts/figure-data/build-eval-curves.mjs
// Reads:  <PAPER_SRC>/figures/data/assistant_steering/<condition>/<eval>/<model>/*.dat
// Writes: src/data/figures/eval-curves.json   (committed)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const PAPER_SRC = path.resolve(SITE_ROOT, "../valence-neurips");
const AS = path.join(PAPER_SRC, "figures/data/assistant_steering");
const OUT = path.join(SITE_ROOT, "src/data/figures/eval-curves.json");

const COLORS = {
  lava: { line: "#D47971", fill: "#F4A6A0" },
  goal: { line: "#5B8DB8", fill: "#A8C5DD" },
  zero: "#DDDDDD",
};

// ---- figure specs -------------------------------------------------------
// Each col reads concept files relative to <condition>/<eval>/<model>/.
const FIGURES = [
  {
    stem: "all_evals_4b_instruct_base_consolidated_rl_steered_baseline_sans_incoherent",
    title: "Reward vectors modulate positive and negative behavior (maze-naive models)",
    condition: "maze_naive",
    rows: [
      { label: "Qwen3 4B Instruct Dr. GRPO", model: "qwen3_4b_drgrpo" },
      { label: "GPT-OSS-20B Dr. GRPO", model: "gpt_oss_20b" },
    ],
    cols: [
      { title: "Sentiment", ylabel: "Sentiment Score", yaxis: "sentiment", eval: "sentiment",
        lava: "lava.dat", goal: "goal.dat", lavaNm: "lava_nm.dat", goalNm: "goal_nm.dat" },
      { title: "Math Backtracking", ylabel: "% Backtracking (of coherent)", yaxis: "percent", eval: "backtracking",
        lava: "lava_masked.dat", goal: "goal_masked.dat", lavaNm: "lava_nm_masked.dat", goalNm: "goal_nm_masked.dat",
        lavaBar: "lava_inc.dat", goalBar: "goal_inc.dat" },
      { title: "MMLU Confidence", ylabel: "Normalized P(True)", yaxis: "ptrue", eval: "confidence_mmlu",
        lava: "lava.dat", goal: "goal.dat", lavaNm: "lava_nm.dat", goalNm: "goal_nm.dat" },
      { title: "Refusal", ylabel: "Refusal Rate", yaxis: "percent", eval: "refusal",
        lava: "lava_masked.dat", goal: "goal_masked.dat", lavaNm: "lava_nm_masked.dat", goalNm: "goal_nm_masked.dat",
        lavaBar: "lava_inc.dat", goalBar: "goal_inc.dat" },
    ],
  },
];

// ---- dat readers --------------------------------------------------------
function readTable(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  const head = lines[0].trim().split(/\s+/);
  return lines.slice(1).map((l) => {
    const c = l.trim().split(/\s+/).map(Number);
    const o = {};
    head.forEach((h, i) => (o[h] = c[i]));
    return o;
  });
}
// line/CI series → [[alpha, mean, lo, hi], ...] (skip NaN/jump rows)
function readSeries(file) {
  const rows = readTable(file);
  if (!rows) return null;
  return rows
    .filter((r) => Number.isFinite(r.alpha) && Number.isFinite(r.mean))
    .map((r) => [r.alpha, r.mean, r.lo, r.hi]);
}
function readBars(file) {
  const rows = readTable(file);
  if (!rows) return null;
  return rows.filter((r) => Number.isFinite(r.alpha) && Number.isFinite(r.rate)).map((r) => [r.alpha, r.rate]);
}

// ---- build --------------------------------------------------------------
function buildFigure(spec) {
  const dir = (col, model, file) => path.join(AS, spec.condition, col.eval, model, file);
  const panels = [];
  let missing = 0;
  for (const row of spec.rows) {
    for (const col of spec.cols) {
      const lava = readSeries(dir(col, row.model, col.lava));
      const goal = readSeries(dir(col, row.model, col.goal));
      if (!lava || !goal) missing++;
      const lines = [];
      if (lava) lines.push({ role: "lava", pts: lava });
      if (goal) lines.push({ role: "goal", pts: goal });
      const nm = [];
      const ln = col.lavaNm && readSeries(dir(col, row.model, col.lavaNm));
      const gn = col.goalNm && readSeries(dir(col, row.model, col.goalNm));
      if (ln) nm.push({ role: "lava", pts: ln });
      if (gn) nm.push({ role: "goal", pts: gn });
      const bars = [];
      const lb = col.lavaBar && readBars(dir(col, row.model, col.lavaBar));
      const gb = col.goalBar && readBars(dir(col, row.model, col.goalBar));
      if (lb) bars.push({ role: "lava", pts: lb });
      if (gb) bars.push({ role: "goal", pts: gb });
      panels.push({ lines, nm, bars });
    }
  }
  return {
    figure: {
      title: spec.title,
      cols: spec.cols.map((c) => ({ title: c.title, ylabel: c.ylabel, yaxis: c.yaxis })),
      rows: spec.rows.map((r) => ({ label: r.label })),
      panels,
    },
    missing,
  };
}

// ---- generic parser for the per-eval appendix grids (Figs 8–13, 16, 17) -----
// These are uniform groupplots: each panel is one model×condition titled with the
// model name, columns grouped under "(maze-trained models)" / "(maze-naive
// models)" headers; lines+bands+nm as in Fig 4, incoherent bars in trailing
// \begin{axis}[at={(group cXrY...)}] blocks. Parsed straight from the tikz.
const FIG_DIR = path.join(PAPER_SRC, "figures");
const APPENDIX_TEX = [
  "tikz/assistant_steering/sentiment.tex",
  "tikz/assistant_steering/sentiment_welfare_only.tex",
  "tikz/assistant_steering/sentiment_associations_only.tex",
  "tikz/assistant_steering/backtracking.tex",
  "tikz/assistant_steering/confidence_mmlu.tex",
  "tikz/assistant_steering/confidence_simpleqa.tex",
  "tikz/assistant_steering/refusal.tex",
  "tikz/assistant_steering/refusal_subsplits.tex",
];

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
function braceArg(s, key) {
  const at = s.indexOf(key + "={");
  return at < 0 ? null : balancedFrom(s, at + key.length + 1);
}
const cleanTitle = (s) =>
  s == null ? null : s.replace(/\\%/g, "%").replace(/---/g, "—")
    .replace(/\\Vmold\{\}/g, "$\\mathbf{v}_{\\mathrm{Mold}}$")
    .replace(/\\Vgold\{\}/g, "$\\mathbf{v}_{\\mathrm{Gold}}$").trim();

function refAfter(chunk, style) {
  // first "{....dat}" after \addplot[<style> ...]
  const at = chunk.indexOf(`[${style}`);
  if (at < 0) return null;
  const m = /\{([^{}]+\.dat)\}/.exec(chunk.slice(at));
  return m ? m[1] : null;
}

function parseEvalGrid(texRel) {
  const texAbs = path.join(FIG_DIR, texRel);
  const tex = fs.readFileSync(texAbs, "utf8");
  const texDir = path.dirname(texAbs);
  const stem = path.basename(texRel, ".tex");
  const abs = (rel) => path.resolve(texDir, rel);

  const gs = /group size=(\d+) by (\d+)/.exec(tex);
  const grid = { cols: +gs[1], rows: +gs[2] };

  // suptitle = the \Large\bfseries node text (the eval name)
  let suptitle = "";
  const li = tex.indexOf("\\Large\\bfseries");
  if (li >= 0) suptitle = cleanTitle(balancedFrom(tex, tex.indexOf("{", li)));

  // group headers spanning column ranges: ...(group cAr1...)!0.5!(group cBr1...)...{TEXT}
  // (stop at ";" so the `\coordinate (titlex) at (…);` line isn't matched)
  const groupHeaders = [...tex.matchAll(/group c(\d+)r1[^)]*\)!0\.5!\(group c(\d+)r1[^);]*\)[^{;]*\{([^{}]+)\}/g)]
    .map((m) => ({ fromCol: +m[1], toCol: +m[2], label: cleanTitle(m[3]) }));

  // panels (groupplot only — stop before the trailing bar axes)
  const groupBody = tex.split("\\end{groupplot}")[0];
  const chunks = groupBody.split("\\nextgroupplot").slice(1);
  const panels = chunks.map((chunk) => {
    const title = cleanTitle(braceArg(chunk, "title"));
    const yaxis = /yaxis (\w+)/.exec(chunk)?.[1] ?? "sentiment";
    const ylabel = cleanTitle(braceArg(chunk, "ylabel"));
    const lava = refAfter(chunk, "lava line");
    const goal = refAfter(chunk, "goal line");
    const lavaNm = refAfter(chunk, "lava nm");
    const goalNm = refAfter(chunk, "goal nm");
    const lines = [], nm = [];
    if (lava) { const s = readSeries(abs(lava)); if (s) lines.push({ role: "lava", pts: s }); }
    if (goal) { const s = readSeries(abs(goal)); if (s) lines.push({ role: "goal", pts: s }); }
    if (lavaNm) { const s = readSeries(abs(lavaNm)); if (s) nm.push({ role: "lava", pts: s }); }
    if (goalNm) { const s = readSeries(abs(goalNm)); if (s) nm.push({ role: "goal", pts: s }); }
    return { title, yaxis, ylabel, lines, nm, bars: [] };
  });

  // incoherent bars: trailing \begin{axis}[at={(group cXrY...)} ...] blocks
  for (const block of tex.split("\\begin{axis}").slice(1)) {
    const cell = /at=\{\(group c(\d+)r(\d+)/.exec(block);
    if (!cell) continue;
    const idx = (+cell[2] - 1) * grid.cols + (+cell[1] - 1);
    if (!panels[idx]) continue;
    const lb = refAfter(block, "lava bar");
    const gb = refAfter(block, "goal bar");
    if (lb) { const b = readBars(abs(lb)); if (b) panels[idx].bars.push({ role: "lava", pts: b }); }
    if (gb) { const b = readBars(abs(gb)); if (b) panels[idx].bars.push({ role: "goal", pts: b }); }
  }

  return { stem, figure: { suptitle, grid, groupHeaders, panels } };
}

const figures = {};
for (const spec of FIGURES) {
  const { figure, missing } = buildFigure(spec);
  figures[spec.stem] = figure;
  const np = figure.panels.length;
  const withData = figure.panels.filter((p) => p.lines.length).length;
  console.log(`[eval] ${spec.stem}`);
  console.log(`        ${figure.rows.length}×${figure.cols.length} grid, ${withData}/${np} panels with data` + (missing ? `  ⚠ ${missing} missing` : ""));
}
for (const t of APPENDIX_TEX) {
  const { stem, figure } = parseEvalGrid(t);
  figures[stem] = figure;
  const withData = figure.panels.filter((p) => p.lines.length).length;
  const withBars = figure.panels.filter((p) => p.bars.length).length;
  console.log(`[eval] ${stem.padEnd(28)} ${figure.grid.cols}×${figure.grid.rows}, ${withData}/${figure.panels.length} panels` + (withBars ? `, bars in ${withBars}` : "") + `  sup="${figure.suptitle}"`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ colors: COLORS, figures }, null, 0) + "\n");
console.log(`\n[eval] wrote ${path.relative(SITE_ROOT, OUT)} (${Object.keys(figures).length} figures)`);
