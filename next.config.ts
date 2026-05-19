import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages.
 *
 * `output: "export"` emits a fully static site to `out/` on `next build`.
 * No server runtime, no API routes, no middleware — those are blocked at
 * build time by Next.js itself.
 *
 * `basePath: "/svg-experiments"` is required because GH Pages serves
 * project sites under `<user>.github.io/<repo>/`. Next.js prepends the
 * basePath to every internal link and asset URL; consumer code that
 * builds asset URLs by hand (e.g. `<img src={`/banner-experiments/${name}`}>`)
 * must wrap them with `${basePath}/...` or use Next's <Image>/<Link>.
 *
 * `assetPrefix` mirrors `basePath` so static asset requests hit the
 * subpath too. Both can be overridden via env var so local dev
 * (where the site is served at `/`) and previews don't break.
 *
 * `trailingSlash: true` makes Next emit `route/index.html` instead of
 * `route.html`. GH Pages serves the index.html for a directory URL, so
 * trailing-slash keeps `/banner-experiments/` and `/banner-experiments`
 * resolving to the same content without HTTP redirects (which Pages
 * can't issue).
 *
 * `images.unoptimized: true` is required when `output: "export"` is set;
 * the Next image-optimization server doesn't exist in a static build.
 * All `<Image>` calls render as plain `<img>` with the configured src.
 */
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/svg-experiments" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Expose basePath to client code that builds asset URLs manually.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
