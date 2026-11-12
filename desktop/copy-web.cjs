// Copie l'appli web construite (../dist, par « npm run build » à la racine) dans desktop/web, le dossier affiché par l'appli PC.
const fs = require("node:fs");
const path = require("node:path");

const src = path.join(__dirname, "..", "dist");
const dst = path.join(__dirname, "web");
if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("Pas de dist/index.html : lance d'abord « npm run build » à la racine du projet.");
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log("Appli web copiée dans desktop/web.");
