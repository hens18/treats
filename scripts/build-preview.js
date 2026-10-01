// Bundles site/ into a preview page.
// Local CSS/JS are inlined and images become data URIs. The videos, captions and the 3D strawberry bundle stay
// as files next to the page (too big to inline), so they are copied to .preview/assets/ and, for the live link,
// published alongside it with the Artifact tool's `files`. Output: .preview/index.html (git-ignored).
// --artifact writes .preview/live.html for the live preview link instead: the artifact host wraps pages in
// its own <html>/<head>/<body>, so those are stripped, and the tab title is the plain business name.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const site = path.join(root, "site");
const out = path.join(root, ".preview");
const artifact = process.argv.includes("--artifact");

const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
const inlineImages = text => text.replace(/assets\/img\/[\w.-]+\.(webp|png|jpe?g|svg)/g, ref => {
  const file = path.join(site, ref);
  if (!fs.existsSync(file)) return ref; // e.g. the example in a code comment
  const mime = MIME[path.extname(file).toLowerCase()];
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
});

// Files the page loads at runtime by path (published next to the page).
const SIDE_FILES = [
  "assets/strawberry3d.js",
  ...fs.readdirSync(path.join(site, "assets/video")).map(f => `assets/video/${f}`),
  ...fs.readdirSync(path.join(site, "assets/captions")).map(f => `assets/captions/${f}`)
];

let html = fs.readFileSync(path.join(site, "index.html"), "utf8");

html = html
  .replace(/<link rel="preload" as="image"[^>]*>\s*/g, "")
  .replace(/<link rel="stylesheet" href="(assets\/[^"]+)">/g, (_, f) =>
    `<style>\n${fs.readFileSync(path.join(site, f), "utf8")}</style>`)
  .replace(/<script src="(assets\/[^"]+)"><\/script>/g, (_, f) =>
    `<script>\n${fs.readFileSync(path.join(site, f), "utf8")}</script>`);

html = inlineImages(html);

if (artifact) {
  html = html
    .replace(/<!doctype html>\s*/i, "")
    .replace(/<\/?(html|head|body)\b[^>]*>\s*/gi, "")
    .replace(/<meta (charset|name="viewport")[^>]*>\s*/gi, "")
    .replace(/<title>[^<]*<\/title>/, "<title>Treats Dipped by Jay</title>");
}

const name = artifact ? "live.html" : "index.html";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, name), html);
for (const f of SIDE_FILES) {
  fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
  fs.copyFileSync(path.join(site, f), path.join(out, f));
}
console.log(`Wrote .preview/${name} (${Math.round(fs.statSync(path.join(out, name)).size / 1024)} KB) and ${SIDE_FILES.length} side files:`);
console.log(SIDE_FILES.map(f => `  .preview/${f}`).join("\n"));
