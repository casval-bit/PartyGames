// Intègre les images du dossier illustrations/ à l'appli, avant chaque build (npm run build, npm run dev, APK, appli PC).
// Ce dossier n'est jamais dans le dépôt public : c'est une copie du dépôt privé des illustrations (voir README, « Images intégrées »),
// que les workflows de l'APK et de l'appli PC récupèrent avec le secret ILLUSTRATIONS_TOKEN.
// Chaque image est reconnue par son nom, exactement comme l'import de l'appli (« Ulrich Stern 7.jpg », « Veigar.jpg » pour toutes
// ses versions…), recadrée au format de chaque carte avec le même cadrage automatique, puis écrite dans public/art/<carte>.jpg,
// avec la liste public/art/index.json que l'appli lit au démarrage. Les sous-dossiers sont permis (illustrations/lol/…).
//
//   PARTY_ART=off        aucune image intégrée (le site public GitHub Pages)
//   PARTY_ART_SCALE=1    images à la taille de l'import de l'appli (1,5 par défaut : plus net en grand, fichiers plus lourds)
//   illustrations/cadrages.json   cadrages à la main, par nom de fichier : { "Ulrich Stern 7.jpg": [0.7, 0.3, 0.75] }
//                                 (x puis y, de 0 à 1 : 0 = bord gauche / haut, 1 = bord droit / bas, comme le glisser de l'appli ;
//                                  puis le zoom, facultatif : 1 = l'image remplit la carte, 0.75 = dézoomée (on voit plus de l'image),
//                                  le reste de la carte est alors rempli par la même image floutée, avec un fondu)
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
/** Zoom d'un cadrage à la main : 1 = l'image couvre la carte (par défaut), moins = dézoomée, plus = zoomée. */
const zoomOf = (z) => (Number.isFinite(Number(z)) && Number(z) > 0 ? Math.min(2.5, Math.max(0.35, Number(z))) : 1);
/** Clé d'un nom de fichier pour cadrages.json : sans extension, « _ » = espace, sans majuscules (« Odd_Della_Robbia_7.webp » = « Odd Della Robbia 7.jpg »). */
const norm = (s) => String(s).normalize("NFC").toLowerCase().replace(/\.[a-z0-9]{2,5}$/, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();

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
  const a = Array.isArray(v) ? v : v && typeof v === "object" ? [v.x, v.y, v.zoom ?? v.z] : null;
  if (a && a.length >= 2) overrides.set(norm(path.basename(k)), [clamp(a[0]), clamp(a[1]), zoomOf(a[2])]);
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

/**
 * L'image au format de la carte (bw × bh). zoom 1 : elle couvre la carte, recadrée autour de (fx, fy).
 * zoom < 1 (cadrage à la main) : dézoomée ; ce qui dépasse est recadré, et le vide est rempli par la même image floutée et assombrie,
 * avec un fondu sur les bords de l'image (fx, fy placent alors l'image dans la carte : 0 = collée à gauche / en haut).
 */
async function frame(img, bw, bh, f, zoom = 1) {
  const { width: iw, height: ih } = img.info;
  const k = Math.max(bw / iw, bh / ih) * zoom;
  const W = Math.max(1, Math.round(iw * k)), H = Math.max(1, Math.round(ih * k));
  const src = () => sharp(img.data, { raw: img.info });
  if (W >= bw && H >= bh) return src().resize(W, H).extract({ left: Math.round((W - bw) * f.fx), top: Math.round((H - bh) * f.fy), width: bw, height: bh });
  const cw = Math.min(W, bw), chh = Math.min(H, bh);
  const left = Math.round((bw - cw) * f.fx), top = Math.round((bh - chh) * f.fy);
  const fg = await src().resize(W, H).extract({ left: Math.round((W - cw) * f.fx), top: Math.round((H - chh) * f.fy), width: cw, height: chh }).raw().toBuffer({ resolveWithObject: true });
  // fondu : seulement sur les bords qui touchent le fond flou
  const fx = Math.round(cw * 0.1), fy = Math.round(chh * 0.14);
  const fade = { l: left > 0 ? fx : 0, r: left + cw < bw ? fx : 0, t: top > 0 ? fy : 0, b: top + chh < bh ? fy : 0 };
  const mask = Buffer.alloc(cw * chh);
  const ease = (v) => v * v * (3 - 2 * v);
  for (let y = 0; y < chh; y++) {
    let ay = 1;
    if (fade.t && y < fade.t) ay = Math.min(ay, y / fade.t);
    if (fade.b && chh - 1 - y < fade.b) ay = Math.min(ay, (chh - 1 - y) / fade.b);
    for (let x = 0; x < cw; x++) {
      let a = ay;
      if (fade.l && x < fade.l) a = Math.min(a, x / fade.l);
      if (fade.r && cw - 1 - x < fade.r) a = Math.min(a, (cw - 1 - x) / fade.r);
      mask[y * cw + x] = Math.round(255 * ease(Math.max(0, Math.min(1, a))));
    }
  }
  const fgPng = await sharp(fg.data, { raw: fg.info }).joinChannel(mask, { raw: { width: cw, height: chh, channels: 1 } }).png().toBuffer();
  const bg = await src().resize(bw, bh, { fit: "cover" }).blur(Math.max(6, bw * 0.035)).modulate({ brightness: 0.62, saturation: 1.15 }).png().toBuffer();
  return sharp(bg).composite([{ input: fgPng, left, top }]);
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
      fs.mkdirSync(OUT, { recursive: true });
      await (await frame(img, bw, bh, f, ov ? ov[2] : 1)).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, out));
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
