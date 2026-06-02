// ---------------------------------------------------------------------------
// Build the interactive emotion-scatter data file.
//
// The static emotion-scatter figures (Figs 3, 18, 19, 20, 25, 26) are rendered
// upstream by valence-neurips/figures/scripts/generate_emotion_scatter_tikz.py,
// which dumps the numeric point cloud to
//   <PAPER_SRC>/figures/data/emotion_scatter/<key>/{points.dat,ols.dat}
// and bakes the (de-overlapped) emotion labels into the per-key .tex. The .dat
// files carry x/y/distance but NOT the emotion name per point — the per-point
// identity lives only in the upstream emotion-order artifact. We commit that
// order (scripts/figure-data/emotions-order.json, pulled from torch:
//   /scratch/.../welfare-concept-vector/emotions/artifacts/qwen3_4b_*/emotions_order.json
// — base and instruct orders are identical, validated against every baked label)
// and join it back here, producing one self-contained JSON the site renders into
// an interactive (hover-to-inspect) scatter.
//
// Run:  node scripts/figure-data/build-emotion-scatters.mjs
// Reads:  <PAPER_SRC>/figures/{data,tikz}/emotion_scatter/<key>/...
//         scripts/figure-data/emotions-order.json
// Writes: src/data/figures/emotion-scatters.json   (committed)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const PAPER_SRC = path.resolve(SITE_ROOT, "../valence-neurips");
const SCATTER_DATA = path.join(PAPER_SRC, "figures/data/emotion_scatter");
const SCATTER_TIKZ = path.join(PAPER_SRC, "figures/tikz/emotion_scatter");
const OUT = path.join(SITE_ROOT, "src/data/figures/emotion-scatters.json");

// All scatter keys emitted by the upstream generator. Each maps to one panel.
const KEYS = [
  "base",
  "instruct_drgrpo",
  "instruct_drgrpo_fft",
  "instruct_sft_fft",
  "base_control",
  "instruct_drgrpo_control",
  "cad",
  "prompt",
  "cad_vs_prompt",
];

const emotions = JSON.parse(
  fs.readFileSync(path.join(HERE, "emotions-order.json"), "utf8"),
);

// ---- tiny parsers -------------------------------------------------------
function readDat(file) {
  // tab/space separated, first line is the header
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  const rows = lines.slice(1).map((l) => l.trim().split(/\s+/).map(Number));
  return rows;
}

// Extract the brace-balanced argument of `key={...}` from a TeX string.
function braceArg(tex, key) {
  const at = tex.indexOf(key + "={");
  if (at < 0) return null;
  let i = at + key.length + 2;
  let depth = 1;
  let out = "";
  for (; i < tex.length && depth > 0; i++) {
    const ch = tex[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
    out += ch;
  }
  return out;
}

const STYLE_TO_CLASS = {
  labelGoldHL: "gold",
  labelMoldHL: "mold",
  labelOriginHL: "origin",
  labelOutlierHL: "outlier",
  labelGold: "gold",
  labelMold: "mold",
  labelCorner: "origin",
  labelOutlier: "outlier",
};

// Parse the baked label nodes: each is a connector from the data point
// (x0,y0) to the de-overlapped text anchor (xt,yt), then a styled node.
function parseLabels(tex) {
  const re =
    /\\draw\[connector\]\s*\(axis cs:([-0-9.]+),([-0-9.]+)\)\s*--\s*\(axis cs:([-0-9.]+),([-0-9.]+)\);\s*\\node\[(\w+)\]\s*at\s*\(axis cs:[^)]*\)\s*\{([^}]+)\}/g;
  const out = [];
  let m;
  while ((m = re.exec(tex))) {
    out.push({
      x0: +m[1],
      y0: +m[2],
      tx: +m[3],
      ty: +m[4],
      cls: STYLE_TO_CLASS[m[5]] ?? "origin",
      emotion: m[6].trim(),
    });
  }
  return out;
}

function nearestIndex(pts, x, y) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i][0] - x;
    const dy = pts[i][1] - y;
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return { best, dist: Math.sqrt(bd) };
}

function pearson(xs, ys) {
  const n = xs.length;
  let sx = 0,
    sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n,
    my = sy / n;
  let cov = 0,
    vx = 0,
    vy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx,
      b = ys[i] - my;
    cov += a * b;
    vx += a * a;
    vy += b * b;
  }
  return cov / Math.sqrt(vx * vy);
}

// ---- per-key build ------------------------------------------------------
function buildKey(key) {
  const points = readDat(path.join(SCATTER_DATA, key, "points.dat")); // [x,y,distance]
  const ols = readDat(path.join(SCATTER_DATA, key, "ols.dat")); // 2 endpoints
  const tex = fs.readFileSync(path.join(SCATTER_TIKZ, `${key}.tex`), "utf8");

  if (points.length !== emotions.length) {
    throw new Error(
      `${key}: ${points.length} points but ${emotions.length} emotions`,
    );
  }

  const xlabel = braceArg(tex, "xlabel");
  const ylabel = braceArg(tex, "ylabel");

  // axis half-range (xmin=-vabs, xmax=+vabs) and tick spacing
  const vabs = Math.abs(
    Number(/xmax=([-0-9.eE]+)/.exec(tex)?.[1] ?? points
      .reduce((m, p) => Math.max(m, Math.abs(p[0]), Math.abs(p[1])), 0) * 1.08),
  );
  const tick = Number(/xtick distance=([-0-9.eE]+)/.exec(tex)?.[1] ?? vabs / 3);

  // residual (off-fit) label colour, baked per figure
  const residualColor =
    "#" + (/\\definecolor\{residualBlue\}\{HTML\}\{([0-9A-Fa-f]{6})\}/.exec(tex)?.[1] ?? "1F7B4A");

  // OLS line: slope/intercept from the two clipped endpoints
  const [[x1, y1], [x2, y2]] = ols;
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = y1 - slope * x1;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const r = pearson(xs, ys);

  // baked, de-overlapped labels → validate against the committed emotion order
  const labels = parseLabels(tex);
  let labelMismatch = 0;
  const labelByEmotion = new Map();
  for (const lab of labels) {
    const { best, dist } = nearestIndex(points, lab.x0, lab.y0);
    if (dist > 1e-3 || emotions[best] !== lab.emotion) labelMismatch++;
    lab.index = best;
    labelByEmotion.set(lab.emotion, lab);
  }

  // join emotion names; flag which points carry a baked label
  const pmax = points.reduce((m, p) => Math.max(m, p[2]), 0);
  const pts = points.map((p, i) => ({
    e: emotions[i],
    x: p[0],
    y: p[1],
    d: p[2],
    lab: labelByEmotion.has(emotions[i]) ? labelByEmotion.get(emotions[i]).cls : null,
  }));

  return {
    key,
    panel: {
      key,
      xlabel,
      ylabel,
      vabs,
      tick,
      slope,
      intercept,
      r,
      pmax,
      residualColor,
      // legend sits opposite the data trend (matches the generator)
      legendCorner: slope >= 0 ? "NW" : "NE",
      ols: ols.map(([x, y]) => [x, y]),
      points: pts,
      labels: labels.map((l) => ({
        e: l.emotion,
        x0: l.x0,
        y0: l.y0,
        tx: l.tx,
        ty: l.ty,
        cls: l.cls,
      })),
    },
    labelMismatch,
  };
}

// ---- main ---------------------------------------------------------------
const panels = {};
let totalMismatch = 0;
for (const key of KEYS) {
  const { panel, labelMismatch } = buildKey(key);
  panels[key] = panel;
  totalMismatch += labelMismatch;
  console.log(
    `[scatter] ${key.padEnd(26)} pts=${panel.points.length} ` +
      `labels=${panel.labels.length} slope=${panel.slope.toFixed(2)} ` +
      `R=${panel.r.toFixed(3)} vabs=${panel.vabs.toFixed(3)}` +
      (labelMismatch ? `  ⚠ ${labelMismatch} label mismatches` : ""),
  );
}
if (totalMismatch) {
  throw new Error(
    `${totalMismatch} baked labels did not match the committed emotion order — ` +
      `emotions-order.json is likely stale.`,
  );
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ emotions, panels }, null, 0) + "\n");
console.log(`\n[scatter] wrote ${path.relative(SITE_ROOT, OUT)} (${KEYS.length} panels)`);
