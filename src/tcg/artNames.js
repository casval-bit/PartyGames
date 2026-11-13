// Illustrations des cartes : la partie « pure » (sans navigateur), partagée par l'appli (ui/artStore.js) et par l'outil
// qui intègre les images du dossier illustrations/ au moment du build (tools/build-art.mjs) :
//   - nom de fichier ↔ carte(s) (« Gryfenfer 7.jpg », « Mendoza 5 (Cités d'or).png », « Pikachu.png »…) ;
//   - format d'affichage de chaque carte (pleine carte pour les légendaires, bandeau pour les autres) ;
//   - cadrage automatique sur le sujet, à partir d'une miniature RGBA de l'image.
import { ALL, FAMILY } from "./cards/index.js";
import { slug } from "./rules.js";

export const ART_W = 450, ART_H = 630; // pleine carte (5 × 7) : les légendaires

/**
 * Format de l'illustration d'une carte, tel qu'elle s'affiche : pleine carte (5 × 7) pour les légendaires, bandeau large (16 × 9)
 * pour les autres, plus haut pour les cartes sans texte. L'image est recadrée une seule fois, directement à ce format.
 */
export function artBox(d) {
  if (!d || d.r === "L") return { w: ART_W, h: ART_H };
  const plain = d.type !== "plot" && !(d.abs && d.abs.length) && !Object.keys(d.kw || {}).length && !d.req;
  return plain ? { w: 460, h: 388 } : { w: 560, h: 318 };
}

/* ------------------------------ noms de fichiers ------------------------------ */
/** Nom de base d'une carte : « Gryfenfer 7 » (personnages : nom + coût), sinon le nom. */
export const artFileName = (d) => (d.type === "char" ? `${d.name} ${d.cost}` : d.name);
let index = null;
function buildIndex() {
  index = new Map();
  const add = (k, d) => { if (!index.has(k)) index.set(k, []); if (!index.get(k).includes(d)) index.get(k).push(d); };
  for (const d of ALL) {
    add(d.id, d);
    add(slug(artFileName(d)), d);
    add(slug(d.name), d);
    add(`${d.fam}-${slug(artFileName(d))}`, d);
  }
  return index;
}
const clean = (s) => String(s).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
/** Nom de fichier conseillé, toujours sans ambiguïté : « Onze 7 », « Mendoza 5 (Cités d'or) » (même nom dans deux familles),
 *  « Noah 2 (Promo 2024) » (deux versions de même coût). C'est ce nom que la liste des cartes affiche et copie. */
export function artFile(d) {
  const ix = index || buildIndex();
  const base = artFileName(d);
  const hit = ix.get(slug(base)) || [d];
  if (hit.length <= 1) return clean(base);
  if (hit.filter((x) => x.fam === d.fam).length === 1) { const f = FAMILY[d.fam]; return clean(`${base} (${f.short || f.name})`); }
  return clean(`${base} (${d.title})`);
}
const famOf = (h) => { const s = slug(h); const f = Object.values(FAMILY).find((x) => [x.id, x.name, x.short].some((v) => v && slug(v) === s)); return f ? f.id : null; };
/** Retrouve la ou les cartes d'un nom de fichier (« Gryfenfer 7.jpg », « Mendoza 5 (Cités d'or).png », « Pikachu.png », id exact…).
 *  Une parenthèse finale qui n'est ni une famille ni un sous-titre (« Onze 7 (1).jpg », copie de Windows) est ignorée. */
export function matchFile(name) {
  const ix = index || buildIndex();
  let raw = String(name).replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_+/g, " ").trim();
  let hint = null;
  const m = raw.match(/\(([^()]*)\)\s*$/);
  if (m && ix.has(slug(raw.slice(0, m.index)))) { hint = m[1]; raw = raw.slice(0, m.index); }
  let hit = ix.get(slug(raw));
  if (!hit) return { cards: [], why: "inconnu" };
  if (hint) {
    const f = famOf(hint), hs = slug(hint);
    const h2 = hit.filter((d) => (f ? d.fam === f : slug(d.title) === hs));
    if (h2.length) hit = h2;
  }
  const fams = new Set(hit.map((d) => d.fam));
  if (fams.size > 1) return { cards: [], why: "ambigu" };
  return { cards: hit, why: "" };
}

/* ------------------------------ cadrage automatique ------------------------------ */
/** Taille de la miniature analysée (120 px de large). */
export const thumbSize = (iw, ih) => ({ sw: 120, sh: Math.max(16, Math.round((120 * ih) / iw)) });

/** Flou rapide : moyenne sur un carré de côté 2r + 1 (bords prolongés), par image intégrale. */
function boxBlur(a, w, h, r) {
  const W = w + 2 * r, H = h + 2 * r, k = 2 * r + 1, I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.max(0, y - r));
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += a[sy * w + Math.min(w - 1, Math.max(0, x - r))];
      I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    out[y * w + x] = (I[(y + k) * (W + 1) + x + k] - I[y * (W + 1) + x + k] - I[(y + k) * (W + 1) + x] + I[y * (W + 1) + x]) / (k * k);
  }
  return out;
}
const LIN = Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; });
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
/**
 * Où se trouve le sujet, sur une miniature RGBA (sw × sh) : contours (à grande échelle, pour ne pas suivre les débris ni les textures)
 * + couleurs qui tranchent sur la teinte moyenne de l'image. Les deux cartes comptent autant. Profils par colonne et par ligne.
 */
export function interestFromRGBA(px, sw, sh) {
  const n = sw * sh;
  const lum = new Float32Array(n), L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  let mL = 0, mA = 0, mB = 0;
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], gr = px[i * 4 + 1], b = px[i * 4 + 2];
    lum[i] = 0.3 * r + 0.59 * gr + 0.11 * b;
    const R = LIN[r], G = LIN[gr], Bl = LIN[b];
    const fx = fLab((0.4124 * R + 0.3576 * G + 0.1805 * Bl) / 0.9505), fy = fLab(0.2126 * R + 0.7152 * G + 0.0722 * Bl), fz = fLab((0.0193 * R + 0.1192 * G + 0.9505 * Bl) / 1.089);
    L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
    mL += L[i]; mA += A[i]; mB += B[i];
  }
  mL /= n; mA /= n; mB /= n;
  const lb = boxBlur(lum, sw, sh, 1), e = new Float32Array(n);
  for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
    const i = y * sw + x;
    e[i] = Math.abs(lb[i + 1] - lb[i - 1]) + Math.abs(lb[i + sw] - lb[i - sw]);
  }
  const eb = boxBlur(e, sw, sh, 2), Lb = boxBlur(L, sw, sh, 3), Ab = boxBlur(A, sw, sh, 3), Bb = boxBlur(B, sw, sh, 3);
  const d = new Float32Array(n);
  let se = 0, sd = 0;
  for (let i = 0; i < n; i++) { d[i] = Math.hypot(Lb[i] - mL, Ab[i] - mA, Bb[i] - mB); se += eb[i]; sd += d[i]; }
  const cols = new Float32Array(sw), rows = new Float32Array(sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = y * sw + x, v = (se ? eb[i] / se : 0) + (sd ? d[i] / sd : 0);
    cols[x] += v; rows[y] += v;
  }
  return { cols, rows };
}
/**
 * Position (0..1) de la fenêtre de taille frac qui capte le plus d'intérêt. La fenêtre pèse plus en son milieu : le sujet
 * est mis au centre au lieu d'être coupé au bord. pen : préférence pour prior (plus fort = on s'en écarte moins).
 */
function bestPos(arr, frac, prior, pen) {
  const n = arr.length, win = Math.max(1, Math.round(n * frac));
  if (win >= n) return prior;
  let total = 0; for (const v of arr) total += v;
  if (!total) return prior;
  const wt = new Float32Array(win);
  let wm = 0;
  for (let j = 0; j < win; j++) { wt[j] = 0.55 + 0.45 * Math.sin((Math.PI * (j + 0.5)) / win); wm += wt[j] / win; }
  let best = -Infinity, at = prior;
  for (let i = 0; i + win <= n; i++) {
    let s = 0;
    for (let j = 0; j < win; j++) s += arr[i + j] * wt[j];
    const pos = i / (n - win);
    const score = s / wm / total - pen * Math.abs(pos - prior);
    if (score > best) { best = score; at = pos; }
  }
  return at;
}
/** Cadrage automatique d'une image iw × ih dans le format box : { fx, fy } (0 = bord gauche/haut, 1 = bord droit/bas). it : profils (ou null). */
export function focusFor(iw, ih, box, it) {
  const k = Math.max(box.w / iw, box.h / ih);
  const fw = box.w / (iw * k), fh = box.h / (ih * k); // part de l'image gardée
  return {
    fx: fw >= 0.999 || !it ? 0.5 : bestPos(it.cols, fw, 0.5, 0.22),
    fy: fh >= 0.999 || !it ? 0.3 : bestPos(it.rows, fh, 0.28, 0.5), // en hauteur, on garde surtout le haut : les têtes
  };
}
