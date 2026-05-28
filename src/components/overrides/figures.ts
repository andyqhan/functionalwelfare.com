// ---------------------------------------------------------------------------
// Figure override registry.
//
// Map a LaTeX figure label → a custom Astro/JS component that renders a "fancy"
// (interactive) version of that figure. Any label NOT listed here falls back to
// the faithful static SVG emitted by the converter — so you only build fancy
// versions for the figures that benefit, and everything else just works.
//
// Example (later):
//   import EmotionScatter from "./figures/EmotionScatter.astro";
//   export const figureOverrides = { "fig:emotion_scatter": EmotionScatter };
// ---------------------------------------------------------------------------

import type { AstroComponentFactory } from "astro/runtime/server/index.js";

import MazeInteractive from "./figures/MazeInteractive.astro";

export const figureOverrides: Record<string, AstroComponentFactory> = {
  "fig:maze_context": MazeInteractive,
};
