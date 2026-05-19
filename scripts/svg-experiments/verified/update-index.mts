import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { updateFilesJson } from "../update-files-json.mts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

await updateFilesJson({
  repoRoot,
  assetDir: "verified-banner-experiments",
  routePath: "verified-banner-experiments",
});
