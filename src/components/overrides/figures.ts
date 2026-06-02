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
import EmotionScatter from "./figures/EmotionScatter.astro";
import EmotionProjection from "./figures/EmotionProjection.astro";
import EmojiScatter from "./figures/EmojiScatter.astro";
import EvalCurves from "./figures/EvalCurves.astro";
import DensityPanels from "./figures/DensityPanels.astro";

export const figureOverrides: Record<string, AstroComponentFactory> = {
  "fig:maze_context": MazeInteractive,
  // Emotion-scatter figures: every one of the 171 emotion points is hoverable.
  "fig:emotion_scatter": EmotionScatter,
  "fig:emotion_scatter_control": EmotionScatter,
  "fig:emotion_scatter_trained_base": EmotionScatter,
  "fig:fft_emotion_scatter": EmotionScatter,
  "fig:emotion_scatter_vs_lava": EmotionScatter,
  "fig:emotion_scatter_cad_vs_prompt": EmotionScatter,
  // Emotion-PCA / residual projection figures: sorted bar charts where each of
  // the 171 emotion bars is hoverable (static labels only every 5th).
  "fig:emotion_pca_instruct": EmotionProjection,
  "fig:emotion_pca_base": EmotionProjection,
  "fig:emotion_pc1_residual": EmotionProjection,
  // Emoji-scatter figures: ~5.2k-emoji cloud, every point hoverable (static
  // labels only the 3 highlighted maze-tile emoji).
  "fig:emoji_scatter_desserts": EmojiScatter,
  "fig:emoji_scatter_office": EmojiScatter,
  // Steering eval-curve grids: every mean±CI point hoverable per steering strength.
  "fig:steering_evals": EvalCurves,
  "fig:sentiment_full": EvalCurves,
  "fig:sentiment_full_welfare": EvalCurves,
  "fig:sentiment_full_associations": EvalCurves,
  "fig:backtracking_full": EvalCurves,
  "fig:confidence_mmlu_full": EvalCurves,
  "fig:confidence_simpleqa_full": EvalCurves,
  "fig:refusal_full": EvalCurves,
  "fig:refusal_subsplits": EvalCurves,
  // Tracking density-panel grids: every KDE curve hoverable (class, condition, std-dev, density).
  "fig:maze_trajectory_tracking": DensityPanels,
  "fig:correctness_tracking": DensityPanels,
  "fig:mmlu_confidence_control": DensityPanels,
  "fig:maze_trajectory_tracking_base": DensityPanels,
  "fig:correctness_tracking_base": DensityPanels,
  "fig:mmlu_confidence_control_base": DensityPanels,
};
