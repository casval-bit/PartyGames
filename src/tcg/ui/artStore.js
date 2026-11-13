// Illustrations des cartes, de la plus prioritaire à la moins prioritaire :
//   1. choisies sur l'appareil (« Choisir une image », import en lot), gardées en IndexedDB, donc disponibles hors ligne ;
//      partagées entre amis par Supabase (table tcg_art, voir supabase/tcg_art.sql) quand la table existe :
//      tout le monde les voit, il faut être connecté à un compte pour en ajouter ;
//   2. intégrées à l'appli : les images du dossier illustrations/ du dépôt, recadrées au build (tools/build-art.mjs)
//      dans art/ à côté de l'appli, avec la liste art/index.json ;
//   3. sinon, l'illustration générée par l'appli (ui/art.js).
import { useSyncExternalStore } from "react";
import { ONLINE } from "../../config.js";
import { getSupa } from "../../net/supa.js";
import { CARD, RENAMED } from "../cards/index.js";
import { ART_W, ART_H, artBox, artFile, artFileName, matchFile, thumbSize, interestFromRGBA, focusFor } from "../artNames.js";

export { ART_W, ART_H, artBox, artFile, artFileName, matchFile };
const DB = "ph-tcg-art", ST = "art";
const mem = new Map(); // id -> { img, t, src: "me" | "remote", up }
const subs = new Set();
let ver = 0, started = false, synced = false;
export const remote = { state: ONLINE ? "idle" : "off", msg: "" }; // off | idle | loading | ok | missing | error

const emit = () => { ver++; for (const f of subs) f(); };
const sub = (f) => { subs.add(f); return () => subs.delete(f); };
/** Identifiant actuel d'une carte (une carte renommée garde son illustration), ou null. */
const artId = (k) => (CARD[k] ? k : RENAMED[k] && CARD[RENAMED[k]] ? RENAMED[k] : null);
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
        const id = artId(c.key);
        if (id && c.value && okImg(c.value.img) && (id === c.key || !mem.has(id))) mem.set(id, c.value);
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
    const rows = (data || []).map((r) => ({ ...r, id: artId(r.card_id) })).filter((r) => r.id);
    const there = new Set(rows.map((r) => r.id));
    for (const [id, v] of mem) if (v.src === "remote" && !there.has(id)) delLocal(id); // retirée par un ami
    const need = rows.filter((r) => { const m = mem.get(r.id); return !m || (m.t || 0) < Date.parse(r.updated_at); }).map((r) => r.card_id);
    for (let i = 0; i < need.length; i += 12) {
      const { data: part } = await s.from("tcg_art").select("card_id,img,updated_at").in("card_id", need.slice(i, i + 12));
      for (const r of part || []) { const id = artId(r.card_id); if (id && okImg(r.img)) putLocal(id, { img: r.img, t: Date.parse(r.updated_at) || Date.now(), src: "remote", up: true }); }
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

/* ------------------------------ intégrées à l'appli (dossier illustrations/) ------------------------------ */
const bundled = new Map(); // id -> adresse de l'image (art/<id>.jpg), d'après art/index.json écrit au build
async function loadBundled() {
  try {
    const r = await fetch("./art/index.json", { cache: "no-cache" });
    if (!r.ok) return;
    const j = await r.json();
    for (const [id, file] of Object.entries((j && j.cards) || {})) if (CARD[id] && typeof file === "string" && /^art\/[\w.-]+\.(jpe?g|webp|png)(\?v=\w+)?$/.test(file)) bundled.set(id, "./" + file);
  } catch { /* pas d'images intégrées */ }
}

function start() {
  if (started || typeof indexedDB === "undefined") return;
  started = true;
  loadBundled().then(emit);
  loadAll().then(() => { emit(); syncRemote(); });
}

/* ------------------------------ lecture ------------------------------ */
/** Illustration d'une carte (choisie sur l'appareil, sinon intégrée à l'appli) ou null. Le composant se met à jour quand elle change. */
export function useArt(id) {
  useSyncExternalStore(sub, () => ver, () => ver);
  start();
  const v = id ? mem.get(id) : null;
  return v ? v.img : (id && bundled.get(id)) || null;
}
/** D'où vient l'illustration d'une carte : "me" (choisie ici), "remote" (partagée par un ami), "bundle" (intégrée à l'appli) ou null. */
export function useArtSource(id) {
  useSyncExternalStore(sub, () => ver, () => ver);
  start();
  const v = id ? mem.get(id) : null;
  return v ? v.src : id && bundled.has(id) ? "bundle" : null;
}
/** Nombre d'illustrations (choisies + intégrées), et état du partage. */
export function useArtInfo() {
  useSyncExternalStore(sub, () => ver, () => ver);
  start();
  const ids = new Set([...mem.keys(), ...bundled.keys()]);
  return { count: ids.size, ids, bundled: bundled.size, remote: { ...remote } };
}

/* ------------------------------ écriture ------------------------------ */
const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible.")); i.src = url; });

/** Où se trouve le sujet : profils d'intérêt mesurés sur une miniature (voir artNames.js). */
function interest(img) {
  const { sw, sh } = thumbSize(img.naturalWidth, img.naturalHeight);
  const cv = document.createElement("canvas"); cv.width = sw; cv.height = sh;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, sw, sh);
  try { return interestFromRGBA(g.getImageData(0, 0, sw, sh).data, sw, sh); } catch { return null; }
}
/** Cadrage automatique : { fx, fy } (0 = bord gauche/haut, 1 = bord droit/bas), comme background-position en %. */
export const autoFocus = (img, box) => focusFor(img.naturalWidth, img.naturalHeight, box, interest(img));
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
