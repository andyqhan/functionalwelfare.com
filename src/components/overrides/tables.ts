// ---------------------------------------------------------------------------
// Table override registry.
//
// Map a LaTeX table label → a custom component that renders a "fancy"
// (interactive / specially-styled) version of that table. Labels not listed
// fall back to the structured HTML table (or static SVG) from the converter.
//
// Example (later):
//   import LogitLensTable from "./tables/LogitLensTable.astro";
//   export const tableOverrides = { "tab:concept-tokens": LogitLensTable };
// ---------------------------------------------------------------------------

import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export const tableOverrides: Record<string, AstroComponentFactory> = {};
