// Illustrations choisies par les joueurs : elles remplacent l'illustration générée d'une carte.
//   - gardées sur le téléphone (IndexedDB), donc disponibles hors ligne ;
//   - partagées entre amis par Supabase (table tcg_art, voir supabase/tcg_art.sql) quand la table existe :
//     tout le monde les voit, il faut être connecté à un compte pour en ajouter.
import { useSyncExternalStore } from "react";
import { ONLINE } from "../../config.js";
import { getSupa } from "../../net/supa.js";
import { CARD, ALL, FAMILY } from "../cards/index.js";
import { slug } from "../rules.js";

export const ART_W = 360, ART_H = 504; // format carte (5 × 7), recadré au centre
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
/** Image choisie (fichier) → JPEG au format carte, recadré au centre (un peu vers le haut : les visages). */
export async function fileToArt(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible.")); i.src = url; });
    const cv = document.createElement("canvas"); cv.width = ART_W; cv.height = ART_H;
    const g = cv.getContext("2d");
    const k = Math.max(ART_W / img.naturalWidth, ART_H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    g.fillStyle = "#0b1426"; g.fillRect(0, 0, ART_W, ART_H);
    g.drawImage(img, (ART_W - w) / 2, Math.min(0, (ART_H - h) * 0.3), w, h);
    return cv.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(url); }
}
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
  delLocal(id); emit();
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
/** Importe plusieurs images d'un coup. Les noms précis (avec le coût) passent avant les noms seuls. */
export async function importFiles(files, onStep) {
  const list = [...files].map((f) => ({ f, m: matchFile(f.name) }));
  const done = new Set(), out = { ok: 0, cards: 0, bad: [] };
  list.sort((a, b) => a.m.cards.length - b.m.cards.length); // le plus précis d'abord
  let i = 0;
  for (const { f, m } of list) {
    i++;
    if (onStep) onStep(i, list.length);
    if (!m.cards.length) { out.bad.push(`${f.name} (${m.why === "ambigu" ? "nom présent dans plusieurs familles" : "aucune carte de ce nom"})`); continue; }
    let img;
    try { img = await fileToArt(f); } catch { out.bad.push(`${f.name} (image illisible)`); continue; }
    let any = false;
    for (const d of m.cards) { if (done.has(d.id)) continue; done.add(d.id); await setArt(d.id, img); out.cards++; any = true; }
    if (any) out.ok++;
  }
  return out;
}
