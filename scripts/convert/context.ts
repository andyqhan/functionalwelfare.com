// ---------------------------------------------------------------------------
// Conversion context shared across transform modules.
// ---------------------------------------------------------------------------

import type { Block, Footnote } from "./types.ts";
import type { RefData } from "./refs.ts";

/** Web paths to a rendered asset (at least one of svg/png is set). */
export interface AssetRef {
  svg?: string;
  png?: string;
  /** Intrinsic aspect ratio (width/height), if known after rendering. */
}

/**
 * Registers asset-conversion jobs and returns the *predicted* web paths
 * synchronously. The actual rendering (pdf→svg etc.) runs in a batch after
 * transform completes, so the transform stays synchronous.
 */
export interface AssetManager {
  /** \includegraphics{srcRel} — path relative to PAPER_SRC. */
  image(srcRel: string): AssetRef;
  /** \curvecell{name} → figures/appendix_training_curves/<name>.pdf */
  curve(name: string): AssetRef;
  /** Inline-TikZ \input → standalone-compile to SVG. srcRel relative to PAPER_SRC. */
  tikz(srcRel: string): AssetRef;
  /** \emoji{name} → returns web src for the copied PNG. */
  emoji(name: string): string;
}

export interface Stats {
  unknownMacros: Map<string, number>;
  unknownEnvs: Map<string, number>;
  unresolvedRefs: Set<string>;
  unclassifiedInputs: Set<string>;
  counts: { figures: number; tables: number; modelExamples: number; footnotes: number };
}

export function newStats(): Stats {
  return {
    unknownMacros: new Map(),
    unknownEnvs: new Map(),
    unresolvedRefs: new Set(),
    unclassifiedInputs: new Set(),
    counts: { figures: 0, tables: 0, modelExamples: 0, footnotes: 0 },
  };
}

export interface Ctx {
  refs: RefData;
  assets: AssetManager;
  stats: Stats;

  /** Slug of the unit currently being transformed. */
  slug: string;

  /** Per-unit footnote accumulator. */
  footnotes: Footnote[];
  addFootnote(content: Block[]): number;

  /** Global label → {slug, anchor id} registry (filled as labels are seen). */
  labelIndex: Map<string, { slug: string; id: string }>;
  registerLabel(label: string, id: string): void;

  /** Per-unit unique id generation. */
  makeId(base: string): string;
}
