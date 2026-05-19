# SVG Experiments

Visual research and prototyping in pure SVG — orbital animation, lighting,
multi-shell composition. Extracted from the UNLV Museum repo so each
gallery can iterate independently.

Deployed via GitHub Pages: **https://moefingers.github.io/svg-experiments/**

## Galleries

| Route                          | What it is                                                 |
| ------------------------------ | ---------------------------------------------------------- |
| `/banner-experiments`          | First-pass: rotation, lighting, axis variants              |
| `/banner-experiments-v2`       | Stepwise light validation                                  |
| `/banner-experiments-v3`       | Multi-sphere, per-bead L recompute                         |
| `/verified-banner-experiments` | Atomic tests + globe orbits proven against the v2/v3 stack |

Each gallery reads its file list from `src/app/<route>/files.json`, which
is regenerated from `public/<assetDir>/` by `pnpm svg:update-index`.

## Local dev

```sh
pnpm install
pnpm dev
```

Visit `http://localhost:3000`. In dev, `basePath` is empty so routes serve
at `/banner-experiments`, etc. In production, `basePath` is
`/svg-experiments` to match the GH Pages subpath.

## Adding a new SVG

1. Drop the file in the right `public/<assetDir>/` folder, or run the
   generator (e.g. `pnpm tsx scripts/svg-experiments/v2/gen-step5b-primitive-precess.mts`).
2. Run `pnpm svg:update-index` to refresh all four `files.json` files.
3. Commit. The Pages workflow rebuilds and redeploys on push to `shepherd`.

## Theme system

Uses the zcanon design system (CSS custom properties + CSS Modules, no
Tailwind). See `src/app/globals.css` for tokens; `BannerGallery.module.css`
for component-scoped styles.

The dark/light theme is bootstrapped pre-paint via `public/theme-init.js`,
loaded with a SHA-384 SRI integrity hash computed at build time. See
zcanon's `CONTEXT/internal_docs/theme.md` for the full rationale.
