import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the LaTeX source tree (the source of truth). */
export const PAPER_SRC = path.resolve(here, "../valence-neurips");

/** Entry .tex file that assembles the whole document. */
export const MAIN_TEX = path.join(PAPER_SRC, "neurips_2026.tex");

/** Where the converter writes the structured IR (one JSON per top-level unit + manifest). */
export const GENERATED_DIR = path.join(here, "src/generated");

/** Public assets root the site serves from (figures, emoji). */
export const PUBLIC_DIR = path.join(here, "public");

/** Web path prefix under which generated assets are served. */
export const ASSET_BASE = "/paper";

/** Absolute dir where rendered figure/emoji assets are written. */
export const ASSET_DIR = path.join(PUBLIC_DIR, "paper");

/** Converter scratch dir (latexmk out-dir, standalone tikz compiles, hash cache). */
export const CACHE_DIR = path.join(here, ".convert-cache");
