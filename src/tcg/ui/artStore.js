// Illustrations choisies par les joueurs : elles remplacent l'illustration générée d'une carte.
//   - gardées sur le téléphone (IndexedDB), donc disponibles hors ligne ;
//   - partagées entre amis par Supabase (table tcg_art, voir supabase/tcg_art.sql) quand la table existe :
//     tout le monde les voit, il faut être connecté à un compte pour en ajouter.
import { useSyncExternalStore } from "react";
import { ONLINE } from "../../config.js";
import { getSupa } from "../../net/supa.js";
import { CARD, ALL, FAMILY } from "../cards/index.js";
import { slug } from "../rules.js";

export const ART_W = 450, ART_H = 630; // pleine carte (5 × 7) : les légendaires
const DB = "ph-tcg-art", ST = "art";
const mem = new Map(); // id -> { img, t, src: "me" | "remote", up }
const subs = new Set();
let ver = 0, started = false, synced = false;
export const remote = { state: ONLINE ? "idle" : "off", msg: "" }; // off | idle | loading | ok | missing | error

const emit = () => { ver++; for (const f of subs) f(); };
const sub = (f) => { subs.add(f); return () => subs.delete(f); };
const okImg = (s) => typeof s === "string" && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 400000;

/* ------------------------------ IndexedDB ------------------------------ */
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(ST);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  if (!d) return null;
  return new Promise((res) => {
    try {
      const tx = d.transaction(ST, mode);
      const out = fn(tx.objectStore(ST));
      tx.oncomplete = () => res(out && "result" in out ? out.result : true);
      tx.onerror = () => res(null);
    } catch { res(null); }
  });
}
async function loadAll() {
  const d = await db();
  if (!d) return;
  await new Promise((res) => {
    try {
      const tx = d.transaction(ST, "readonly");
      const rq = tx.objectStore(ST).openCursor();
      rq.onsuccess = () => {
        const c = rq.result;
        if (!c) return res();
        if (CARD[c.key] && c.value && okImg(c.value.img)) mem.set(c.key, c.value);
        c.continue();
      };
      rq.onerror = () => res();
    } catch { res(); }
  });
}
const putLocal = (id, v) => { mem.set(id, v); idb("readwrite", (s) => s.put(v, id)); };
const delLocal = (id) => { mem.delete(id); idb("readwrite", (s) => s.delete(id)); };

/* ------------------------------ Supabase ------------------------------ */
const missing = (e) => /42P01|PGRST205|does not exist|Could not find the table/i.test(`${e && e.code} ${e && e.message}`);
async function signedIn(s) { try { const { data } = await s.auth.getSession(); return Boolean(data && data.session); } catch { return false; } }

/** Récupère les illustrations partagées (seulement celles qui ont changé). */
export async function syncRemote(force = false) {
  if (!ONLINE || (synced && !force)) return;
  synced = true;
  remote.state = "loading"; emit();
  try {
    const s = await getSupa();
    const { data, error } = await s.from("tcg_art").select("card_id,updated_at");
    if (error) { remote.state = missing(error) ? "missing" : "error"; remote.msg = error.message || ""; emit(); return; }
    const rows = (data || []).filter((r) => CARD[r.card_id]);
    const there = new Set(rows.map((r) => r.card_id));
    for (const [id, v] of mem) if (v.src === "remote" && !there.has(id)) delLocal(id); // retirée par un ami
    const need = rows.filter((r) => { const m = mem.get(r.card_id); return !m || (m.t || 0) < Date.parse(r.updated_at); }).map((r) => r.card_id);
    for (let i = 0; i < need.length; i += 12) {
      const { data: part } = await s.from("tcg_art").select("card_id,img,updated_at").in("card_id", need.slice(i, i + 12));
      for (const r of part || []) if (okImg(r.img)) putLocal(r.card_id, { img: r.img, t: Date.parse(r.updated_at) || Date.now(), src: "remote", up: true });
      emit();
    }
    remote.state = "ok";
    // illustrations faites hors connexion : envoyées maintenant si on est connecté
    if (await signedIn(s)) for (const [id, v] of mem) if (v.src === "me" && !v.up) await pushOne(s, id, v);
  } catch (e) { remote.state = "error"; remote.msg = String((e && e.message) || e); }
  emit();
}
async function pushOne(s, id, v) {
  const { error } = await s.from("tcg_art").upsert({ card_id: id, img: v.img, updated_at: new Date(v.t).toISOString() });
  if (!error) { putLocal(id, { ...v, up: true }); return true; }
  if (missing(error)) remote.state = "missing";
  return false;
}

function start() {
  if (started || typeof indexedDB === "undefined") return;
  started = true;
  loadAll().then(() => { emit(); syncRemote(); });
}

/* ------------------------------ lecture ------------------------------ */
/** Illustration personnalisée d'une carte (data URL) ou null. Le composant se met à jour quand elle change. */
export function useArt(id) {
  useSyncExternalStore(sub, () => ver, () => ver);
  start();
  const v = id ? mem.get(id) : null;
  return v ? v.img : null;
}
/** Nombre d'illustrations, et état du partage. */
export function useArtInfo() {
  useSyncExternalStore(sub, () => ver, () => ver);
  start();
  return { count: mem.size, ids: new Set(mem.keys()), remote: { ...remote } };
}

/* ------------------------------ écriture ------------------------------ */
/**
 * Format de l'illustration d'une carte, tel qu'elle s'affiche : pleine carte (5 × 7) pour les légendaires, bandeau large (16 × 9)
 * pour les autres, plus haut pour les cartes sans texte. L'image est recadrée une seule fois, directement à ce format.
 */
export function artBox(d) {
  if (!d || d.r === "L") return { w: ART_W, h: ART_H };
  const plain = d.type !== "plot" && !(d.abs && d.abs.length) && !Object.keys(d.kw || {}).length && !d.req;
  return plain ? { w: 460, h: 388 } : { w: 560, h: 318 };
}
const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible.")); i.src = url; });

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
 * Où se trouve le sujet, sur une miniature : contours (à grande échelle, pour ne pas suivre les débris ni les textures)
 * + couleurs qui tranchent sur la teinte moyenne de l'image. Les deux cartes comptent autant. Profils par colonne et par ligne.
 */
function interest(img) {
  const sw = 120, sh = Math.max(16, Math.round((sw * img.naturalHeight) / img.naturalWidth)), n = sw * sh;
  const cv = document.createElement("canvas"); cv.width = sw; cv.height = sh;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, sw, sh);
  let px;
  try { px = g.getImageData(0, 0, sw, sh).data; } catch { return null; }
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
/** Cadrage automatique : { fx, fy } (0 = bord gauche/haut, 1 = bord droit/bas), comme background-position en %. */
export function autoFocus(img, box) {
  const k = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const fw = box.w / (img.naturalWidth * k), fh = box.h / (img.naturalHeight * k); // part de l'image gardée
  const it = interest(img);
  return {
    fx: fw >= 0.999 || !it ? 0.5 : bestPos(it.cols, fw, 0.5, 0.22),
    fy: fh >= 0.999 || !it ? 0.3 : bestPos(it.rows, fh, 0.28, 0.5), // en hauteur, on garde surtout le haut : les têtes
  };
}
/** Prépare une image pour une carte : son format d'affichage et le cadrage automatique (à ajuster avant d'enregistrer). */
export async function prepareArt(file, d) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const box = artBox(d);
    return { url, file, box, iw: img.naturalWidth, ih: img.naturalHeight, ...autoFocus(img, box) };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}
/**
 * Image choisie (fichier) → JPEG au format d'affichage de la carte d (sans d : format carte 5 × 7).
 * focus { fx, fy } : cadrage voulu (0..1) ; sans focus, cadrage automatique sur le sujet.
 */
export async function fileToArt(file, d, focus) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const box = artBox(d);
    const f = focus || autoFocus(img, box);
    const cv = document.createElement("canvas"); cv.width = box.w; cv.height = box.h;
    const g = cv.getContext("2d");
    const k = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    g.fillStyle = "#0b1426"; g.fillRect(0, 0, box.w, box.h);
    g.imageSmoothingQuality = "high";
    g.drawImage(img, (box.w - w) * Math.min(1, Math.max(0, f.fx)), (box.h - h) * Math.min(1, Math.max(0, f.fy)), w, h);
    let q = 0.86, out = cv.toDataURL("image/jpeg", q);
    while (out.length >= 390000 && q > 0.5) { q -= 0.08; out = cv.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
/* Images d'origine choisies pendant cette session (en mémoire seulement) : on peut recadrer une carte sans rechoisir le fichier. */
const recent = new Map(); // id -> File
export const recentFile = (id) => recent.get(id) || null;
export const rememberFile = (id, file) => { if (id && file) recent.set(id, file); };

/** Enregistre l'illustration d'une carte (et la partage si possible). Renvoie "shared" | "local". */
export async function setArt(id, img) {
  if (!CARD[id] || !okImg(img)) throw new Error("Image refusée.");
  const v = { img, t: Date.now(), src: "me", up: false };
  putLocal(id, v); emit();
  if (!ONLINE) return "local";
  try {
    const s = await getSupa();
    if (!(await signedIn(s))) return "local";
    const ok = await pushOne(s, id, v);
    emit();
    return ok ? "shared" : "local";
  } catch { return "local"; }
}
export async function removeArt(id) {
  delLocal(id); recent.delete(id); emit();
  if (!ONLINE) return;
  try { const s = await getSupa(); if (await signedIn(s)) await s.from("tcg_art").delete().eq("card_id", id); } catch { /* hors ligne */ }
}

/* ------------------------------ import en lot ------------------------------ */
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
/**
 * Importe plusieurs images d'un coup. Les noms précis (avec le coût) passent avant les noms seuls.
 * Chaque image est recadrée automatiquement au format de chaque carte ; ids : les cartes illustrées, à vérifier (et recadrer).
 */
export async function importFiles(files, onStep) {
  const list = [...files].map((f) => ({ f, m: matchFile(f.name) }));
  const done = new Set(), out = { ok: 0, cards: 0, bad: [], ids: [] };
  list.sort((a, b) => a.m.cards.length - b.m.cards.length); // le plus précis d'abord
  let i = 0;
  for (const { f, m } of list) {
    i++;
    if (onStep) onStep(i, list.length);
    if (!m.cards.length) { out.bad.push(`${f.name} (${m.why === "ambigu" ? "nom présent dans plusieurs familles" : "aucune carte de ce nom"})`); continue; }
    let any = false, failed = false;
    const byBox = new Map(); // une image recadrée par format (pleine carte, bandeau…)
    for (const d of m.cards) {
      if (done.has(d.id)) continue;
      const b = artBox(d), key = `${b.w}x${b.h}`;
      if (!byBox.has(key)) { try { byBox.set(key, await fileToArt(f, d)); } catch { failed = true; break; } }
      done.add(d.id); await setArt(d.id, byBox.get(key)); rememberFile(d.id, f); out.ids.push(d.id); out.cards++; any = true;
    }
    if (failed && !any) { out.bad.push(`${f.name} (image illisible)`); continue; }
    if (any) out.ok++;
  }
  return out;
}
