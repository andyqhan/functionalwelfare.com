// ---------------------------------------------------------------------------
// Asset pipeline: resolve \includegraphics / \emoji / (rare) inline TikZ to web
// assets under public/paper, rendering PDFs to SVG with pdftocairo. Rendering is
// synchronous + cached by mtime so the transform can stay synchronous and reruns
// are fast.
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ASSET_BASE, ASSET_DIR, CACHE_DIR, PAPER_SRC } from "../../paper.config.ts";
import type { AssetManager, AssetRef, Stats } from "./context.ts";

const FIG_DIR = path.join(ASSET_DIR, "fig");
const EMOJI_DIR = path.join(ASSET_DIR, "emoji");

function sanitizeBase(srcRel: string): string {
  return srcRel
    .replace(/^figures\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/\//g, "__")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function newer(src: string, dest: string): boolean {
  // true if dest is up to date relative to src
  if (!fs.existsSync(dest)) return false;
  try {
    return fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { stdio: "ignore", timeout: 120_000 });
    return true;
  } catch {
    return false;
  }
}

export class Assets implements AssetManager {
  private memo = new Map<string, AssetRef>();
  private emojiMemo = new Map<string, string>();

  constructor(private stats: Stats) {
    fs.mkdirSync(FIG_DIR, { recursive: true });
    fs.mkdirSync(EMOJI_DIR, { recursive: true });
  }

  image(srcRel: string): AssetRef {
    const base = sanitizeBase(srcRel);
    const memoized = this.memo.get(base);
    if (memoized) return memoized;

    const abs = path.resolve(PAPER_SRC, srcRel);
    let result: AssetRef = {};
    if (!fs.existsSync(abs)) {
      this.stats.unclassifiedInputs.add(`missing-image:${srcRel}`);
      this.memo.set(base, result);
      return result;
    }

    const ext = path.extname(abs).toLowerCase();
    if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".svg") {
      const dest = path.join(FIG_DIR, base + ext);
      if (!newer(abs, dest)) fs.copyFileSync(abs, dest);
      result = ext === ".svg" ? { svg: `${ASSET_BASE}/fig/${base}${ext}` } : { png: `${ASSET_BASE}/fig/${base}${ext}` };
    } else {
      // PDF (the common case): render to SVG, fall back to PNG.
      const destSvg = path.join(FIG_DIR, base + ".svg");
      if (newer(abs, destSvg)) {
        result = { svg: `${ASSET_BASE}/fig/${base}.svg` };
      } else if (run("pdftocairo", ["-svg", abs, destSvg]) && fs.existsSync(destSvg) && fs.statSync(destSvg).size > 0) {
        result = { svg: `${ASSET_BASE}/fig/${base}.svg` };
      } else {
        const destPng = path.join(FIG_DIR, base + ".png");
        if (run("pdftocairo", ["-png", "-r", "200", "-singlefile", abs, path.join(FIG_DIR, base)]) && fs.existsSync(destPng)) {
          result = { png: `${ASSET_BASE}/fig/${base}.png` };
        } else {
          this.stats.unclassifiedInputs.add(`render-failed:${srcRel}`);
        }
      }
    }
    this.memo.set(base, result);
    return result;
  }

  curve(name: string): AssetRef {
    return this.image(`figures/appendix_training_curves/${name}.pdf`);
  }

  emoji(name: string): string {
    const memoized = this.emojiMemo.get(name);
    if (memoized) return memoized;
    const web = `${ASSET_BASE}/emoji/${name}.png`;
    const abs = path.resolve(PAPER_SRC, `figures/emoji/${name}.png`);
    const dest = path.join(EMOJI_DIR, `${name}.png`);
    if (fs.existsSync(abs)) {
      if (!newer(abs, dest)) fs.copyFileSync(abs, dest);
    } else {
      this.stats.unclassifiedInputs.add(`missing-emoji:${name}`);
    }
    this.emojiMemo.set(name, web);
    return web;
  }

  // Rare: inline-TikZ \input. No such inputs exist in the current paper, but we
  // support them via a best-effort standalone xelatex compile → SVG.
  tikz(srcRel: string): AssetRef {
    const base = sanitizeBase(srcRel);
    const memoized = this.memo.get(`tikz:${base}`);
    if (memoized) return memoized;

    const abs = path.resolve(PAPER_SRC, srcRel);
    const destSvg = path.join(FIG_DIR, base + ".svg");
    let result: AssetRef = {};
    if (fs.existsSync(abs) && (newer(abs, destSvg) || this.compileTikz(abs, base, destSvg))) {
      result = { svg: `${ASSET_BASE}/fig/${base}.svg` };
    } else {
      this.stats.unclassifiedInputs.add(`tikz-failed:${srcRel}`);
    }
    this.memo.set(`tikz:${base}`, result);
    return result;
  }

  private compileTikz(abs: string, base: string, destSvg: string): boolean {
    const dir = path.join(CACHE_DIR, "tikz", base);
    fs.mkdirSync(dir, { recursive: true });
    const sibCommon = path.join(path.dirname(abs), "_common.tex");
    const commonLine = fs.existsSync(sibCommon) ? `\\input{${sibCommon}}` : "";
    const wrapper = [
      "\\documentclass[border=2pt]{standalone}",
      "\\usepackage{fontspec}",
      "\\usepackage{pgfplots}",
      "\\pgfplotsset{compat=1.18}",
      "\\usepackage{tikz}",
      "\\usepackage{amsmath}",
      "\\usepackage[table]{xcolor}",
      "\\usepackage{graphicx}",
      "\\newcommand{\\emoji}[1]{}",
      "\\newcommand{\\Mold}{\\textsc{Mold}}\\newcommand{\\Gold}{\\textsc{Gold}}\\newcommand{\\Path}{\\textsc{Path}}",
      commonLine,
      "\\begin{document}",
      `\\input{${abs}}`,
      "\\end{document}",
    ].join("\n");
    const texFile = path.join(dir, "fig.tex");
    fs.writeFileSync(texFile, wrapper);
    const ok = run("xelatex", ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", dir, texFile]);
    const pdf = path.join(dir, "fig.pdf");
    if (!ok || !fs.existsSync(pdf)) return false;
    return run("pdftocairo", ["-svg", pdf, destSvg]) && fs.existsSync(destSvg);
  }
}
