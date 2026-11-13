// Intègre les images du dossier illustrations/ à l'appli, avant chaque build (npm run build, npm run dev, APK, appli PC).
// Ce dossier n'est jamais dans le dépôt public : c'est une copie du dépôt privé des illustrations (voir README, « Images intégrées »),
// que les workflows de l'APK et de l'appli PC récupèrent avec le secret ILLUSTRATIONS_TOKEN.
// Chaque image est reconnue par son nom, exactement comme l'import de l'appli (« Ulrich Stern 7.jpg », « Veigar.jpg » pour toutes
// ses versions…), recadrée au format de chaque carte avec le même cadrage automatique, puis écrite dans public/art/<carte>.jpg,
// avec la liste public/art/index.json que l'appli lit au démarrage. Les sous-dossiers sont permis (illustrations/lol/…).
//
//   PARTY_ART=off        aucune image intégrée (le site public GitHub Pages)
//   PARTY_ART_SCALE=1    images à la taille de l'import de l'appli (1,5 par défaut : plus net en grand, fichiers plus lourds)
//   illustrations/cadrages.json   cadrages à la main, par nom de fichier : { "Ulrich Stern 7.jpg": [0.7, 0.3] }
//                                 (x puis y, de 0 à 1 : 0 = bord gauche / haut, 1 = bord droit / bas, comme le glisser de l'appli)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { artBox, matchFile, thumbSize, interestFromRGBA, focusFor } from "../src/tcg/artNames.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "illustrations");
const OUT = path.join(ROOT, "public", "art");
const CACHE = path.join(ROOT, "node_modules", ".cache", "party-art.json");
const SCALE = Math.min(2, Math.max(1, Number(process.env.PARTY_ART_SCALE) || 1.5));
const VERSION = 1; // à augmenter si la façon de recadrer change (tout est refait)
const IMG = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const clamp = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const norm = (s) => String(s).normalize("NFC").toLowerCase();

function writeIndex(cards) {
  fs.mkdirSync(OUT, { recursive: true });
  const sorted = Object.fromEntries(Object.keys(cards).sort().map((k) => [k, cards[k]]));
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ v: VERSION, cards: sorted }));
}
function prune(keep) {
  if (!fs.existsSync(OUT)) return;
  for (const f of fs.readdirSync(OUT)) if (!keep.has(f) && /\.(jpe?g|json)$/i.test(f)) fs.rmSync(path.join(OUT, f));
}

if (/^(off|0|non|no|false)$/i.test(process.env.PARTY_ART || "")) {
  prune(new Set()); writeIndex({});
  console.log("Illustrations intégrées : désactivées (PARTY_ART=off).");
  process.exit(0);
}

const files = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue; // .git du dépôt privé, fichiers cachés
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (IMG.test(e.name)) files.push(p);
  }
})(SRC);
if (!files.length) {
  prune(new Set()); writeIndex({});
  console.log("Illustrations intégrées : aucune image dans illustrations/.");
  process.exit(0);
}

let sharp;
try { sharp = (await import("sharp")).default; } catch {
  console.warn("Attention : le module sharp est introuvable (lance « npm install »). Les images du dossier illustrations/ ne sont pas intégrées.");
  if (!fs.existsSync(path.join(OUT, "index.json"))) writeIndex({});
  process.exit(0);
}

function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; } }
const overrides = new Map();
const rawOv = readJson(path.join(SRC, "cadrages.json"), {});
for (const [k, v] of Object.entries(rawOv || {})) {
  const xy = Array.isArray(v) ? v : v && typeof v === "object" ? [v.x, v.y] : null;
  if (xy && xy.length === 2) overrides.set(norm(path.basename(k)), [clamp(xy[0]), clamp(xy[1])]);
}
const cache = readJson(CACHE, {});

/** Décode l'image une seule fois (orientation de l'appareil photo appliquée), en pixels RGB bruts. */
const decode = (buf) => sharp(buf, { failOn: "none" }).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
/** Profils d'intérêt sur une miniature, comme dans l'appli. */
async function profile(img) {
  if (img.prof) return img.prof;
  const { sw, sh } = thumbSize(img.info.width, img.info.height);
  const px = await sharp(img.data, { raw: img.info }).resize(sw, sh, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  img.prof = interestFromRGBA(px, sw, sh);
  return img.prof;
}

const list = files.map((f) => ({ f, name: path.basename(f), m: matchFile(path.basename(f)) }));
list.sort((a, b) => a.m.cards.length - b.m.cards.length || a.f.localeCompare(b.f)); // noms précis (avec le coût) d'abord
const cards = {}, keep = new Set(["index.json"]), bad = [];
let made = 0, reused = 0, used = 0;
for (const it of list) {
  const rel = path.relative(SRC, it.f).split(path.sep).join("/");
  if (!it.m.cards.length) { bad.push(`${rel} (${it.m.why === "ambigu" ? "nom présent dans plusieurs familles" : "aucune carte de ce nom"})`); continue; }
  const todo = it.m.cards.filter((d) => !cards[d.id]);
  if (!todo.length) continue;
  const buf = fs.readFileSync(it.f);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);
  const ov = overrides.get(norm(it.name)) || null;
  let img = null, any = false;
  for (const d of todo) {
    const box = artBox(d), bw = Math.round(box.w * SCALE), bh = Math.round(box.h * SCALE);
    const out = `${d.id}.jpg`, key = `${VERSION}|${hash}|${bw}x${bh}|${ov ? ov.join(",") : "auto"}`;
    if (cache[out] === key && fs.existsSync(path.join(OUT, out))) { cards[d.id] = `art/${out}?v=${hash}`; keep.add(out); reused++; any = true; continue; }
    try {
      if (!img) img = await decode(buf);
      const { width: iw, height: ih } = img.info;
      const f = ov ? { fx: ov[0], fy: ov[1] } : focusFor(iw, ih, box, await profile(img));
      const k = Math.max(bw / iw, bh / ih);
      const W = Math.max(bw, Math.round(iw * k)), H = Math.max(bh, Math.round(ih * k));
      fs.mkdirSync(OUT, { recursive: true });
      await sharp(img.data, { raw: img.info }).resize(W, H).extract({ left: Math.round((W - bw) * f.fx), top: Math.round((H - bh) * f.fy), width: bw, height: bh })
        .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, out));
      cache[out] = key; cards[d.id] = `art/${out}?v=${hash}`; keep.add(out); made++; any = true;
    } catch (e) { bad.push(`${rel} (image illisible : ${e.message})`); break; }
  }
  if (any) used++;
}
prune(keep);
writeIndex(cards);
try { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(cache)); } catch { /* cache facultatif */ }
const n = Object.keys(cards).length;
console.log(`Illustrations intégrées : ${n} carte${n > 1 ? "s" : ""} (${used} image${used > 1 ? "s" : ""}), ${made} recadrée${made > 1 ? "s" : ""}, ${reused} déjà prête${reused > 1 ? "s" : ""}.`);
if (bad.length) console.log(`Non reconnues (renomme-les comme dans la liste des cartes de l'appli) :\n  ${bad.join("\n  ")}`);
