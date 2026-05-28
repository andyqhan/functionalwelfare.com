// ---------------------------------------------------------------------------
// Write the IR to disk: one JSON per unit + a manifest the site consumes.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { GENERATED_DIR } from "../../paper.config.ts";
import type { Manifest, Unit } from "./types.ts";

const UNITS_DIR = path.join(GENERATED_DIR, "units");

export function resetOutput() {
  fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  fs.mkdirSync(UNITS_DIR, { recursive: true });
}

export function writeUnit(unit: Unit) {
  fs.writeFileSync(path.join(UNITS_DIR, `${unit.slug}.json`), JSON.stringify(unit));
}

export function writeManifest(manifest: Manifest) {
  fs.writeFileSync(path.join(GENERATED_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
}
