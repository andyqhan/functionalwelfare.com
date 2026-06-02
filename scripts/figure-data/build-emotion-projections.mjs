// ---------------------------------------------------------------------------
// Build the interactive emotion-PCA / residual projection data file.
//
// Three appendix figures are *sorted bar charts* (one bar per emotion, sorted
// by projection value) rather than 2D point clouds:
//   * Fig 28  fig:emotion_pca_instruct  → emotion_pca_reward_projection_instruct
//   * Fig 29  fig:emotion_pca_base       → emotion_pca_reward_projection_base
//   * Fig 32  fig:emotion_pc1_residual   → emotion_pc1_projection
//
// The PCA figures stack two panels (PC1, PC2); the residual figure has one
// (PC1 at L22). Each panel also carries a few horizontal reference lines where
// the steering / sentiment vectors project onto that PC.
//
// Upstream bakes the per-emotion identity straight into the cache JSON
// (emotion_names + emotion_pc for PCA; pc1.sorted_names + sorted_pc1 for the
// residual), so — unlike the emotion *scatters* — nothing here needs torch.
// We re-sort, attach the reference lines, and emit one self-contained JSON the
// site renders into an interactive (hover-to-inspect) bar chart where every one
// of the 171 emotions is hoverable (the static figure only labels every 5th).
//
// Run:  node scripts/figure-data/build-emotion-projections.mjs
// Reads:  <PAPER_SRC>/figures/data/appendix_emotion_pca_steering/data.json
//         <PAPER_SRC>/figures/data/appendix_sentiment_residual/data.json
//         (+ the sibling *.dat tables, used only to validate our re-sort)
// Writes: src/data/figures/emotion-projections.json   (committed)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const PAPER_SRC = path.resolve(SITE_ROOT, "../valence-neurips");
const PCA_JSON = path.join(PAPER_SRC, "figures/data/appendix_emotion_pca_steering/data.json");
const PCA_DIR = path.join(PAPER_SRC, "figures/data/appendix_emotion_pca_steering");
const RES_JSON = path.join(PAPER_SRC, "figures/data/appendix_sentiment_residual/data.json");
const RES_DIR = path.join(PAPER_SRC, "figures/data/appendix_sentiment_residual");
const OUT = path.join(SITE_ROOT, "src/data/figures/emotion-projections.json");

// shared bar fill: pgfplots `black!45` = 45% black + 55% white
const BAR_COLOR = "#8c8c8c";

// matplotlib tab10 → hex (matches the cache's `color` strings)
const TAB_HEX = { "tab:red": "#d62728", "tab:green": "#2ca02c" };

// ---- helpers ------------------------------------------------------------
function readDatValues(file) {
  // 2-col `idx\tvalue` table → values in row order
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").slice(1);
  return lines.map((l) => Number(l.trim().split(/\s+/)[1]));
}

// Compare our re-sorted values against the upstream .dat (sorted by the
// generator). A mismatch means the cache and .dat have drifted apart.
function validateSorted(label, mine, datFile) {
  if (!fs.existsSync(datFile)) {
    console.log(`[proj] ${label.padEnd(20)} (no .dat to validate against)`);
    return 0;
  }
  const dat = readDatValues(datFile);
  if (dat.length !== mine.length) {
    throw new Error(`${label}: ${mine.length} bars but ${dat.length} in ${path.basename(datFile)}`);
  }
  let maxErr = 0;
  for (let i = 0; i < dat.length; i++) maxErr = Math.max(maxErr, Math.abs(dat[i] - mine[i]));
  if (maxErr > 1e-3) throw new Error(`${label}: re-sort disagrees with ${path.basename(datFile)} (maxErr=${maxErr})`);
  return maxErr;
}

const pct = (frac) => (frac * 100).toFixed(1);

// ---- PCA panels (Figs 28, 29) ------------------------------------------
function buildPcaModel(model, key) {
  const names = model.emotion_names;
  const pcs = model.emotion_pc; // [[pc1, pc2], ...] in emotion order
  if (names.length !== pcs.length) throw new Error(`${key}: names/pc length mismatch`);

  const panels = {};
  for (let k = 0; k < 2; k++) {
    const bars = names
      .map((e, i) => ({ e, v: pcs[i][k] }))
      .sort((a, b) => a.v - b.v);
    validateSorted(`${key}_pc${k + 1}`, bars.map((b) => b.v),
      path.join(PCA_DIR, `${model.model_key}_pc${k + 1}.dat`));

    const refs = model.projections.map((p) => ({
      v: p.pc[k],
      color: TAB_HEX[p.color] ?? "#888888",
      style: p.linestyle === "--" ? "dashed" : "solid",
      opacity: p.alpha,
      short: p.short_label, // e.g. "📇 (mold)"
      full: p.full_label, // e.g. "trained, normal tiles · 📇 (mold)"
    }));

    panels[`${key}_pc${k + 1}`] = {
      key: `${key}_pc${k + 1}`,
      pcLabel: `PC${k + 1} (${pct(model.evr[k])}% var)`,
      bars,
      refs,
    };
  }
  return panels;
}

// ---- residual panel (Fig 32) -------------------------------------------
function buildResidual(res) {
  const p = res.pc1;
  const bars = p.sorted_names.map((e, i) => ({ e, v: p.sorted_pc1[i] }));
  validateSorted("residual_pc1", bars.map((b) => b.v),
    path.join(RES_DIR, "emotion_pc1_projection.dat"));

  // reference lines, in the order/styling the upstream tikz draws them
  const V = p.vector_pc1;
  const refs = [
    { v: V.v_eval, color: "#7a4fa0", style: "solid", opacity: 1, short: "$\\mathbf{v}_{\\mathrm{eval}}$", full: "$\\mathbf{v}_{\\mathrm{eval}}$" },
    { v: V.v_goal, color: "#5b8db8", style: "dotted", opacity: 1, short: "$\\mathbf{v}_{\\mathrm{gold}}$", full: "$\\mathbf{v}_{\\mathrm{gold}}$" },
    { v: V.v_sent_cad, color: "#4f8f4f", style: "dotted", opacity: 1, short: "Sentiment (CAD)", full: "Sentiment (CAD)" },
    { v: V.v_sent_prompt, color: "#d47971", style: "dotted", opacity: 1, short: "Sentiment (Prompt)", full: "Sentiment (Prompt)" },
  ];

  return {
    residual_pc1: {
      key: "residual_pc1",
      pcLabel: `PC1 (${pct(p.evr_pc1)}% var)`,
      bars,
      refs,
    },
  };
}

// ---- main ---------------------------------------------------------------
const pca = JSON.parse(fs.readFileSync(PCA_JSON, "utf8"));
const res = JSON.parse(fs.readFileSync(RES_JSON, "utf8"));

const panels = {
  ...buildPcaModel(pca.instruct, "instruct"),
  ...buildPcaModel(pca.base, "base"),
  ...buildResidual(res),
};

// figure (svg stem) → ordered panels + title
const figures = {
  emotion_pca_reward_projection_instruct: {
    title: `${pca.instruct.label} · mold/gold reward vectors on emotion PCA · layer ${pca.instruct.layer}`,
    panels: ["instruct_pc1", "instruct_pc2"],
  },
  emotion_pca_reward_projection_base: {
    title: `${pca.base.label} · mold/gold reward vectors on emotion PCA · layer ${pca.base.layer}`,
    panels: ["base_pc1", "base_pc2"],
  },
  emotion_pc1_projection: {
    title: `Emotion-PCA PC1 projection at L${res.steering_layer} (Qwen3 4B Instruct Dr. GRPO)`,
    panels: ["residual_pc1"],
  },
};

for (const [stem, fig] of Object.entries(figures)) {
  const n = fig.panels.reduce((m, k) => m + panels[k].bars.length, 0);
  console.log(`[proj] ${stem.padEnd(40)} panels=${fig.panels.length} bars=${n}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ barColor: BAR_COLOR, figures, panels }, null, 0) + "\n");
console.log(`\n[proj] wrote ${path.relative(SITE_ROOT, OUT)} (${Object.keys(figures).length} figures)`);
