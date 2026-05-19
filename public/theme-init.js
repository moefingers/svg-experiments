// Layer-1 theme bootstrap.
//
// Loaded synchronously from <script src="/theme-init.js"> in the root
// layout BEFORE any other resource. Browsers execute same-origin
// synchronous src-scripts in document order before paint, so the
// `dark` class and `data-theme` attribute land on <html> before
// styles compute. Eliminates the dark/light/preset FOUC.
//
// Reads svg-experiments-mode and svg-experiments-theme from localStorage.
// Project-scoped keys so we don't collide with any other site on the
// same GitHub Pages user-org domain (moefingers.github.io).
//
// Why a static file + SRI instead of an inline <script
// dangerouslySetInnerHTML>: see zcanon CONTEXT/internal_docs/theme.md
// "FOUC Prevention" for the full reasoning (React 19 inline-script
// warning, next/script beforeInteractive limitation, CSP nonce vs
// SRI trade-off).
//
// Integrity: <script integrity="sha384-..."> on the tag enforces
// that this file's content matches the hash baked into the layout
// at build time.

(function () {
  try {
    var mk = "svg-experiments-mode";
    var tk = "svg-experiments-theme";
    var mode = localStorage.getItem(mk);
    var dark =
      mode === "dark" ||
      (mode !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    var theme = localStorage.getItem(tk);
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    // localStorage blocked / SSR — accept default theme.
  }
})();
