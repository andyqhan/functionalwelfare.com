// ---------------------------------------------------------------------------
// Site-side IR access: load the generated manifest + units, and helpers for
// turning labels/slugs into URLs.
// ---------------------------------------------------------------------------

import type { Manifest, Unit, UnitSummary } from "../../scripts/convert/types.ts";
import manifestJson from "../generated/manifest.json";

export type {
  Block,
  Inline,
  Manifest,
  Unit,
  UnitSummary,
  TocEntry,
  Reference,
  Footnote,
  FigureBlock,
  TableBlock,
  ModelExample,
} from "../../scripts/convert/types.ts";

export const manifest = manifestJson as unknown as Manifest;

const unitModules = (import.meta as any).glob("../generated/units/*.json", { eager: true }) as Record<string, { default: Unit }>;
const unitsBySlug = new Map<string, Unit>();
for (const [path, mod] of Object.entries(unitModules)) {
  const slug = path.split("/").pop()!.replace(/\.json$/, "");
  unitsBySlug.set(slug, mod.default);
}

export const referencesByKey = new Map(manifest.references.map((r) => [r.key, r]));

export function getUnit(slug: string): Unit | undefined {
  return unitsBySlug.get(slug);
}
export function mainUnits(): Unit[] {
  return manifest.units.filter((u) => u.kind === "main").map((u) => getUnit(u.slug)!).filter(Boolean);
}
export function appendixUnits(): Unit[] {
  return manifest.units.filter((u) => u.kind === "appendix").map((u) => getUnit(u.slug)!).filter(Boolean);
}
export function appendixSummaries(): UnitSummary[] {
  return manifest.units.filter((u) => u.kind === "appendix");
}

/** Route param for an appendix unit: "appendix-a" → "a", "appendix-overview" → "overview". */
export function appendixParam(slug: string): string {
  return slug.replace(/^appendix-/, "");
}

/** Site path for a unit (without hash). Main units live on the home page. */
export function unitPath(slug: string): string {
  const u = manifest.units.find((x) => x.slug === slug);
  if (!u || u.kind === "main") return "/";
  return `/appendix/${appendixParam(slug)}`;
}

/** Resolve a LaTeX label to an href (cross-page aware). */
export function labelHref(label: string): string {
  const entry = manifest.labelIndex[label];
  if (!entry) return "#";
  const base = unitPath(entry.slug);
  return `${base === "/" ? "" : base}#${entry.id}`;
}
