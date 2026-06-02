// ---------------------------------------------------------------------------
// Build the interactive emoji-scatter data file (Figs 39, 40).
//
// Two appendix figures plot the full ~5.2k-emoji cloud in sentiment space
// (x = cosine sim with the CAD sentiment vector, y = with the prompt sentiment
// vector), highlighting one "trio" of maze-tile emoji each:
//   * Fig 39  fig:emoji_scatter_desserts → scatter_desserts_qwen3_4b_instruct
//   * Fig 40  fig:emoji_scatter_office    → scatter_office_qwen3_4b_instruct
//
// The upstream points.dat is just x/y with NO per-point identity — it is the
// full set MINUS the 3 highlighted trio emoji. The identity (emoji glyph + CLDR
// name + both cosine sims) lives only in the emoji-vector artifact on torch:
//   torch:/scratch/ah7660/welfare-concept-vector/artifacts/emoji_vectors/
//          sentiment_cosine_similarity.csv
// We commit that CSV (scripts/figure-data/emoji-sentiment.csv) and join it here,
// so the static figure's 3 labelled points become ~5.2k hoverable ones.
//
// Run:  node scripts/figure-data/build-emoji-scatters.mjs
// Reads:  scripts/figure-data/emoji-sentiment.csv
// Writes: src/data/figures/emoji-scatters.json   (committed)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const CSV = path.join(HERE, "emoji-sentiment.csv");
const OUT = path.join(SITE_ROOT, "src/data/figures/emoji-scatters.json");

// Trio definitions + colours, mirroring generate_appendix_emoji_figures.py.
// distanceAxis: which axis the trio's spread is measured on for the Δ annotation.
const FIGURES = {
  scatter_desserts_qwen3_4b_instruct: {
    panelTitle: "Qwen3-4B-Instruct-2507",
    supTitle: "Emoji sentiment similarity — desserts trio highlighted",
    distanceAxis: "prompt",
    trio: {
      "🧁": { color: "#e74c3c", label: "MOLD tile (cupcake)", role: "mold" },
      "🍩": { color: "#27ae60", label: "PATH tile (donut)", role: "path" },
      "🍨": { color: "#3498db", label: "GOLD tile (ice cream)", role: "gold" },
    },
  },
  scatter_office_qwen3_4b_instruct: {
    panelTitle: "Qwen3-4B-Instruct-2507",
    supTitle: "Emoji sentiment similarity — office trio highlighted",
    distanceAxis: "cad",
    trio: {
      "📇": { color: "#e74c3c", label: "MOLD tile (rolodex)", role: "mold" },
      "🧾": { color: "#27ae60", label: "PATH tile (receipt)", role: "path" },
      "📐": { color: "#3498db", label: "GOLD tile (triangular ruler)", role: "gold" },
    },
  },
};

const XLABEL = "Cosine similarity with CAD sentiment vector";
const YLABEL = "Cosine similarity with prompt sentiment vector";

// ---- parse CSV: emoji,name,cos_sim_cad,cos_sim_prompt --------------------
const lines = fs.readFileSync(CSV, "utf8").trim().split("\n");
const header = lines[0].split(",");
if (header.join(",") !== "emoji,name,cos_sim_cad,cos_sim_prompt") {
  throw new Error(`unexpected CSV header: ${lines[0]}`);
}
const points = lines.slice(1).map((l) => {
  const c = l.split(",");
  return { e: c[0], n: c[1].replace(/_/g, " "), x: +c[2], y: +c[3] };
});
const byEmoji = new Map(points.map((p) => [p.e, p]));

// axis limits = data min/max ± 0.02 (matches the upstream tikz)
const xs = points.map((p) => p.x);
const ys = points.map((p) => p.y);
const limits = {
  xlo: Math.min(...xs) - 0.02,
  xhi: Math.max(...xs) + 0.02,
  ylo: Math.min(...ys) - 0.02,
  yhi: Math.max(...ys) + 0.02,
};

// ---- per-figure trio + Δ annotation ------------------------------------
function buildFigure(def) {
  let trio = [];
  for (const [e, info] of Object.entries(def.trio)) {
    const p = byEmoji.get(e);
    if (!p) throw new Error(`trio emoji ${e} (${info.label}) not in CSV`);
    trio.push({ e, n: p.n, x: p.x, y: p.y, ...info });
  }
  // Fanned-out label anchors (data coords), mirroring the upstream matplotlib
  // annotate(): sort by (x,y); stagger vertically; push left/right of cluster.
  trio.sort((a, b) => a.x - b.x || a.y - b.y);
  const cx = trio.reduce((s, t) => s + t.x, 0) / trio.length;
  const nT = trio.length;
  trio = trio.map((t, i) => {
    const dir = t.x >= cx ? 1 : -1;
    const vertical = (i - (nT - 1) / 2) * 0.032;
    const lx = Math.max(limits.xlo + 0.01, Math.min(limits.xhi - 0.01, t.x + dir * 0.06));
    return { ...t, lx, ly: t.y + vertical, ha: dir > 0 ? "left" : "right" };
  });
  // Δ between the MOLD tile and the average of the other two, on distanceAxis
  const axis = def.distanceAxis; // "cad" → x, "prompt" → y
  const coord = (t) => (axis === "cad" ? t.x : t.y);
  const mold = trio.find((t) => t.role === "mold");
  const others = trio.filter((t) => t.role !== "mold");
  const avgOthers = others.reduce((s, t) => s + coord(t), 0) / others.length;
  const moldC = coord(mold);
  const delta = {
    axis, // "cad" (horizontal arrow) | "prompt" (vertical arrow)
    from: moldC,
    to: avgOthers,
    value: Math.abs(moldC - avgOthers),
    // cross-axis placement: past the cluster *and* its fanned labels
    cross: axis === "cad"
      ? Math.min(...trio.map((t) => t.ly)) - 0.02
      : Math.max(...trio.map((t) => t.lx)) + 0.03,
  };
  return {
    panelTitle: def.panelTitle,
    supTitle: def.supTitle,
    xlabel: XLABEL,
    ylabel: YLABEL,
    trio,
    delta,
  };
}

const figures = {};
for (const [key, def] of Object.entries(FIGURES)) figures[key] = buildFigure(def);

for (const [key, fig] of Object.entries(figures)) {
  console.log(`[emoji] ${key.padEnd(36)} trio=${fig.trio.map((t) => t.e).join("")} Δ${fig.delta.axis}=${fig.delta.value.toFixed(3)}`);
}
console.log(`[emoji] ${points.length} emoji points; limits x[${limits.xlo.toFixed(3)},${limits.xhi.toFixed(3)}] y[${limits.ylo.toFixed(3)},${limits.yhi.toFixed(3)}]`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ limits, xlabel: XLABEL, ylabel: YLABEL, points, figures }, null, 0) + "\n");
console.log(`\n[emoji] wrote ${path.relative(SITE_ROOT, OUT)} (${points.length} points, ${Object.keys(figures).length} figures)`);
