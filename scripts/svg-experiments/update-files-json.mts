/**
 * Shared helper: scan a public/<asset-dir>/ for *.svg files and write the
 * sorted list to the corresponding src/app/<route>/files.json that the
 * gallery page imports.
 *
 * One callsite per gallery in v1/v2/v3/verified/update-index.mts.
 *
 * The old version of this script targeted an inline `const files = [...]`
 * array inside a public/<dir>/index.html — that pattern was retired when
 * the museum routed galleries through the App Router; files.json is the
 * source of truth now.
 */
import { readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export async function updateFilesJson({
  repoRoot,
  assetDir,
  routePath,
}: {
  repoRoot: string;
  /** e.g. "banner-experiments" — name of the public/<assetDir>/ folder. */
  assetDir: string;
  /** e.g. "banner-experiments" — name of the src/app/<routePath>/ folder. */
  routePath: string;
}): Promise<void> {
  const publicDir = resolve(repoRoot, "public", assetDir);
  const jsonPath = resolve(repoRoot, "src", "app", routePath, "files.json");

  const entries = await readdir(publicDir, { withFileTypes: true });
  const svgs = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".svg"))
    .map((e) => e.name)
    .sort((a, b) => collator.compare(a, b));

  const next = JSON.stringify(svgs, null, 2) + "\n";
  await writeFile(jsonPath, next);
  console.log(`updated ${jsonPath} — ${svgs.length} SVGs listed`);
}
