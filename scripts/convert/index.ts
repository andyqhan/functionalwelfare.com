// ---------------------------------------------------------------------------
// Converter entry point: `pnpm convert`.
//
// Pipeline: latexmk prepass (numbers) → assemble units → transform AST→IR →
// render figure assets → parse bibliography → write JSON + manifest → summary.
// ---------------------------------------------------------------------------

import type * as Ast from "@unified-latex/unified-latex-types";
import type { Block, Footnote, Heading, Inline, Manifest, TocEntry, Unit, UnitSummary } from "./types.ts";
import type { Ctx } from "./context.ts";
import { newStats } from "./context.ts";
import { loadRefData } from "./refs.ts";
import { assemble } from "./assemble.ts";
import { Assets } from "./figures.ts";
import { transformBlocks, transformInlines, tabularToEpigraph } from "./transform.ts";
import { parseBibliography } from "./bib.ts";
import { resetOutput, writeManifest, writeUnit } from "./emit.ts";

function makeCtx(slug: string, base: Omit<Ctx, "slug" | "footnotes" | "addFootnote" | "registerLabel" | "makeId">): Ctx {
  const footnotes: Footnote[] = [];
  let fn = 0;
  const ids = new Set<string>();
  return {
    ...base,
    slug,
    footnotes,
    addFootnote(content: Block[]) {
      const id = ++fn;
      footnotes.push({ id, content });
      base.stats.counts.footnotes++;
      return id;
    },
    registerLabel(label: string, id: string) {
      base.labelIndex.set(label, { slug, id });
    },
    makeId(b: string) {
      let id = b || "x";
      let i = 2;
      while (ids.has(id)) id = `${b}-${i++}`;
      ids.add(id);
      return id;
    },
  };
}

function firstHeading(blocks: Block[]): Heading | undefined {
  return blocks.find((b): b is Heading => b.type === "heading" && b.level === 1);
}

function buildToc(units: Unit[]): TocEntry[] {
  const toc: TocEntry[] = [];
  for (const unit of units) {
    let top: TocEntry | null = null;
    for (const b of unit.blocks) {
      if (b.type !== "heading") continue;
      if (b.level === 1) {
        top = { id: b.id, number: b.number, title: b.title, level: 1, slug: unit.slug, children: [] };
        toc.push(top);
      } else if (b.level === 2 && top) {
        top.children.push({ id: b.id, number: b.number, title: b.title, level: 2, slug: unit.slug, children: [] });
      }
    }
    // units without a level-1 heading still get a nav entry (e.g. acknowledgments)
    if (!top) {
      toc.push({ id: unit.slug, title: summaryTitle(unit), level: 1, slug: unit.slug, children: [] });
    }
  }
  return toc;
}

function summaryTitle(unit: Unit): Inline[] {
  const h = firstHeading(unit.blocks);
  if (h) return h.title;
  return [{ type: "text", value: unit.source }];
}

function findTabular(env: Ast.Environment | undefined): Ast.Environment | undefined {
  if (!env) return undefined;
  for (const n of env.content) {
    if (n.type === "environment" && n.env === "tabular") return n;
    if (n.type === "environment" || n.type === "group") {
      const r = findTabular(n as Ast.Environment);
      if (r) return r;
    }
  }
  return undefined;
}

async function main() {
  const t0 = Date.now();
  console.log("• loading cross-reference data (latexmk prepass, cached)…");
  const refs = loadRefData();
  if (!refs.auxPath) console.warn("  ! no .aux — cross-references/figure numbers will be unresolved");

  console.log("• assembling document…");
  const asm = assemble();

  const stats = newStats();
  const labelIndex = new Map<string, { slug: string; id: string }>();
  const assets = new Assets(stats);
  const ctxBase = { refs, assets, stats, labelIndex };

  console.log(`• transforming ${asm.units.length} units + rendering figures…`);
  resetOutput();
  const units: Unit[] = [];
  for (const spec of asm.units) {
    const ctx = makeCtx(spec.slug, ctxBase as any);
    let blocks = transformBlocks(spec.nodes, ctx);
    // ensure heading-less main units (acknowledgments) have a title
    if (spec.kind === "main" && !firstHeading(blocks)) {
      blocks = [{ type: "heading", level: 1, title: [{ type: "text", value: spec.defaultTitle }], id: ctx.makeId(spec.slug) }, ...blocks];
    }
    const unit: Unit = { slug: spec.slug, kind: spec.kind, source: spec.source, blocks, footnotes: ctx.footnotes };
    units.push(unit);
    writeUnit(unit);
  }

  // front matter
  const fctx = makeCtx("index", ctxBase as any);
  const title = transformInlines(asm.titleNodes, fctx);
  const authors = asm.authorNameNodes.map((nodes) => ({ name: transformInlines(nodes, fctx) }));
  const affiliation = transformInlines(asm.affiliationNodes, fctx);
  const abstract = transformBlocks(asm.abstractNodes, fctx);
  const epigraph = asm.epigraphCenter ? tabularToEpigraph(findTabular(asm.epigraphCenter)!, fctx) : undefined;
  const correspondence = asm.thanksNodes.length ? transformInlines(asm.thanksNodes, fctx) : undefined;

  // bibliography
  console.log("• parsing bibliography…");
  const bibCtx = makeCtx("references", ctxBase as any);
  const references = parseBibliography(refs.bblPath, bibCtx, refs.cites);

  const unitSummaries: UnitSummary[] = units.map((u) => {
    const h = firstHeading(u.blocks);
    return { slug: u.slug, kind: u.kind, title: summaryTitle(u), number: h?.number };
  });

  const manifest: Manifest = {
    title,
    authors,
    affiliation,
    repoUrl: asm.repoUrl,
    correspondence,
    abstract,
    epigraph,
    toc: buildToc(units),
    units: unitSummaries,
    labelIndex: Object.fromEntries(labelIndex),
    references,
    generatedAt: new Date(t0).toISOString(),
  };
  writeManifest(manifest);

  printSummary(stats, units, references.length, Date.now() - t0);
}

function printSummary(stats: ReturnType<typeof newStats>, units: Unit[], refCount: number, ms: number) {
  const totalFootnotes = units.reduce((a, u) => a + u.footnotes.length, 0);
  console.log("\n──────── conversion summary ────────");
  console.log(`units:        ${units.length}`);
  console.log(`figures:      ${stats.counts.figures}`);
  console.log(`tables:       ${stats.counts.tables}`);
  console.log(`modelExamples:${stats.counts.modelExamples}`);
  console.log(`footnotes:    ${totalFootnotes}`);
  console.log(`references:   ${refCount}`);

  const topUnknown = [...stats.unknownMacros.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (topUnknown.length) {
    console.log(`\nunknown macros (${stats.unknownMacros.size}):`);
    console.log("  " + topUnknown.map(([k, v]) => `${k}(${v})`).join("  "));
  }
  if (stats.unknownEnvs.size) {
    console.log(`unknown environments: ${[...stats.unknownEnvs.entries()].map(([k, v]) => `${k}(${v})`).join("  ")}`);
  }
  if (stats.unresolvedRefs.size) {
    const sample = [...stats.unresolvedRefs].slice(0, 15);
    console.log(`\nunresolved refs/cites (${stats.unresolvedRefs.size}): ${sample.join(", ")}${stats.unresolvedRefs.size > 15 ? " …" : ""}`);
  }
  if (stats.unclassifiedInputs.size) {
    console.log(`\nasset issues (${stats.unclassifiedInputs.size}):`);
    [...stats.unclassifiedInputs].slice(0, 20).forEach((s) => console.log("  " + s));
  }
  console.log(`\n✓ done in ${(ms / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
