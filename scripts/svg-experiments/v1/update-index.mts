/**
 * Sync src/app/banner-experiments/files.json with the contents of
 * public/banner-experiments/.
 *
 * Usage: pnpm svg:update-index
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { updateFilesJson } from "../update-files-json.mts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

await updateFilesJson({
  repoRoot,
  assetDir: "banner-experiments",
  routePath: "banner-experiments",
});
