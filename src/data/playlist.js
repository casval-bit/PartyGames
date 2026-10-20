// Import d'une playlist pour le blind test.
// - Deezer : API publique, sans clé. Chaque morceau a un extrait MP3 de 30 s ("preview"). Pas de CORS sur api.deezer.com :
//   dans le navigateur on passe par JSONP, dans l'APK (CapacitorHttp activé) un fetch normal marche.
// - Spotify : Spotify ne donne plus d'extraits audio aux nouvelles applications. On lit seulement la LISTE des morceaux (page
//   « embed » publique, possible uniquement dans l'APK) puis on retrouve chaque morceau sur Deezer pour avoir l'extrait.
// - Liste texte : une ligne « Artiste - Titre » par morceau, retrouvée sur Deezer.
// - Démo : quelques morceaux avec une mélodie synthétique (aucun réseau), pour tester le jeu.

export const MAX_TRACKS = 2000;   // morceaux lus dans une playlist Deezer (pages de 100)
export const MAX_TEXT_LINES = 1500; // lignes « Artiste - Titre » acceptées d'un coup
export const MAX_TOTAL = 3000;     // total après avoir ajouté plusieurs playlists
const DZ = "https://api.deezer.com";

/** Identifiants de morceaux Spotify trouvés dans un texte collé (liens open.spotify.com/track/… ou spotify:track:…). */
export function spotifyTrackIds(raw) {
  const ids = [];
  for (const m of String(raw).matchAll(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/g)) if (!ids.includes(m[1])) ids.push(m[1]);
  return ids;
}
export const SPOTIFY_EMBED_MAX = 100; // la page « embed » de Spotify ne contient que les 100 premiers morceaux

/** Export CSV d'Exportify (ou tout CSV avec colonnes « Track Name » / « Artist Name(s) ») -> lignes { artist, title }. */
export function parseCsvTracks(s) {
  const rows = [];
  let row = [], cell = "", q = false;
  const text = String(s).replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some(Boolean)) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return null;
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const ti = head.findIndex((h) => /^(track name|titre|title|track)$/.test(h));
  const ai = head.findIndex((h) => /^(artist name\(s\)|artist names?|artist|artiste)$/.test(h));
  if (ti < 0 || ai < 0) return null;
  return rows.slice(1).map((r) => ({ title: (r[ti] || "").trim(), artist: (r[ai] || "").split(";")[0].trim() })).filter((x) => x.title && x.artist);
}

/** Quel type d'entrée a-t-on collé ? */
export function parseInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return { kind: "error", msg: "Colle l'adresse d'une playlist Deezer, ou une liste « Artiste - Titre »." };
  let m = s.match(/deezer\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?playlist\/(\d+)/i);
  if (m) return { kind: "deezer", id: m[1] };
  if (/^\d{6,}$/.test(s)) return { kind: "deezer", id: s };
  if (/(deezer\.page\.link|link\.deezer\.com)/i.test(s)) return { kind: "error", msg: "Lien court Deezer : ouvre-le dans le navigateur et copie l'adresse complète (deezer.com/…/playlist/123…)." };
  m = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([A-Za-z0-9]+)/i) || s.match(/spotify:playlist:([A-Za-z0-9]+)/i);
  if (m) return { kind: "spotify", id: m[1] };
  if (/^https?:\/\//i.test(s) && !spotifyTrackIds(s).length) return { kind: "error", msg: "Adresse non reconnue. Playlists acceptées : Deezer et Spotify." };
  const sids = spotifyTrackIds(s);
  if (sids.length) return { kind: "spotifytracks", ids: sids.slice(0, MAX_TEXT_LINES) };
  const csv = parseCsvTracks(s);
  if (csv && csv.length) return { kind: "text", lines: csv.slice(0, MAX_TEXT_LINES) };
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((l) => {
    const k = l.search(/\s[-–—]\s/);
    return k > 0 ? { artist: l.slice(0, k).trim(), title: l.slice(k).replace(/^\s[-–—]\s/, "").trim() } : null;
  }).filter((x) => x && x.artist && x.title);
  if (!parsed.length) return { kind: "error", msg: "Je ne reconnais rien. Format d'une ligne : Artiste - Titre." };
  return { kind: "text", lines: parsed.slice(0, MAX_TEXT_LINES) };
}

/* ------------------------------ réseau ------------------------------ */
function jsonp(url, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const cb = "dz_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    const done = () => { clearTimeout(t); delete window[cb]; s.remove(); };
    const t = setTimeout(() => { done(); reject(new Error("Deezer ne répond pas.")); }, timeoutMs);
    window[cb] = (d) => { done(); resolve(d); };
    s.onerror = () => { done(); reject(new Error("Deezer est injoignable (Internet ?).")); };
    s.src = url + (url.includes("?") ? "&" : "?") + "output=jsonp&callback=" + cb;
    document.head.appendChild(s);
  });
}
/** GET JSON sur l'API Deezer : fetch d'abord (APK), sinon JSONP (navigateur). */
export async function deezerJson(path) {
  const url = DZ + path;
  try { const r = await fetch(url); if (r.ok) { const j = await r.json(); if (j) return j; } } catch { /* CORS : on passe en JSONP */ }
  return jsonp(url);
}
async function getText(url) { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }

/* ------------------------------ Deezer ------------------------------ */
const mapTrack = (t, coverFallback = "") => ({
  id: String(t.id),
  title: t.title || t.title_short || "",
  artists: [t.artist && t.artist.name, ...(t.contributors || []).map((c) => c.name)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
  preview: t.preview || "",
  cover: (t.album && (t.album.cover_medium || t.album.cover)) || coverFallback,
});
const usable = (t) => t && t.id && t.preview && t.readable !== false;

export async function fetchDeezerPlaylist(id, getJson = deezerJson, onProgress = () => {}) {
  const meta = await getJson(`/playlist/${id}`);
  if (meta && meta.error) throw new Error(meta.error.code === 800 || meta.error.type === "DataException" ? "Playlist introuvable ou privée (elle doit être publique)." : "Deezer : " + (meta.error.message || "erreur"));
  const tracks = [];
  let index = 0, total = meta.nb_tracks || 0;
  while (tracks.length < MAX_TRACKS) {
    const page = await getJson(`/playlist/${id}/tracks?index=${index}&limit=100`);
    if (page && page.error) throw new Error("Deezer : " + (page.error.message || "erreur"));
    const data = (page && page.data) || [];
    for (const t of data) if (usable(t)) tracks.push(mapTrack(t, meta.picture_medium));
    index += data.length;
    onProgress(Math.min(index, total || index), total || index);
    if (!data.length || !page.next) break;
  }
  return { name: meta.title || "Playlist Deezer", cover: meta.picture_medium || "", source: "Deezer", total: total || tracks.length, tracks };
}

/** Un morceau Deezer à jour : les adresses d'extraits expirent, on les redemande juste avant de jouer. */
export async function freshTrack(track, getJson = deezerJson) {
  if (!track || String(track.preview || "").startsWith("demo:")) return track;
  try {
    const t = await getJson(`/track/${track.id}`);
    if (t && t.preview) return { ...track, preview: t.preview, cover: (t.album && (t.album.cover_medium || t.album.cover)) || track.cover, release: t.release_date || track.release || "" };
  } catch { /* on garde l'ancienne adresse */ }
  return track;
}

/* ------------------- recherche d'un morceau (Spotify / texte) ------------------- */
const nrm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export async function searchDeezerTrack({ artist, title }, getJson = deezerJson) {
  const q = (txt) => encodeURIComponent(txt);
  const tryQ = async (query) => {
    const r = await getJson(`/search?q=${q(query)}&limit=6`);
    if (r && r.error && (r.error.code === 4 || /quota/i.test(r.error.message || ""))) throw new Error("quota");
    return ((r && r.data) || []).filter(usable);
  };
  let list = await tryQ(`artist:"${artist}" track:"${title}"`);
  if (!list.length) list = await tryQ(`${artist} ${title}`);
  if (!list.length) return null;
  const a = nrm(artist);
  const t = list.find((x) => nrm(x.artist && x.artist.name) === a) || list[0];
  return mapTrack(t);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Cherche un morceau ; si Deezer répond « trop de requêtes » (code 4), on attend et on réessaie. */
async function searchRetry(line, getJson, pause) {
  for (let attempt = 0; ; attempt++) {
    try { return await searchDeezerTrack(line, getJson); }
    catch (e) {
      if (attempt >= 3 || e.message !== "quota") throw e; // on ne réessaie que si Deezer demande de ralentir
      await sleep(pause * 8 * (attempt + 1));
    }
  }
}
export async function resolveLines(lines, getJson = deezerJson, onProgress = () => {}, pause = 120) {
  const out = [], missing = [];
  let done = 0;
  const queue = lines.slice(0, MAX_TEXT_LINES);
  const worker = async () => {
    while (queue.length) {
      const l = queue.shift();
      try { const t = await searchRetry(l, getJson, pause); if (t) out.push(t); else missing.push(l); } catch { missing.push(l); }
      onProgress(++done, Math.min(lines.length, MAX_TEXT_LINES));
      await sleep(pause); // l'API limite à ~50 requêtes / 5 s
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { tracks: out.filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i), missing };
}

/* ------------------------------ Spotify (liste seule) ------------------------------ */
export function parseSpotifyEmbed(html) {
  const m = String(html).match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Page Spotify illisible (playlist privée ?).");
  const data = JSON.parse(m[1]);
  let list = null, name = "";
  const walk = (o) => {
    if (!o || typeof o !== "object" || list) return;
    if (Array.isArray(o.trackList) && o.trackList.length) { list = o.trackList; name = o.name || o.title || name; return; }
    for (const v of Object.values(o)) walk(v);
  };
  walk(data);
  if (!list) throw new Error("Aucun morceau trouvé (playlist privée ?).");
  return {
    name: name || "Playlist Spotify",
    lines: list.map((t) => ({ title: String(t.title || "").trim(), artist: String(t.subtitle || "").replace(/ /g, " ").split(/,\s*/)[0].trim() })).filter((x) => x.title && x.artist),
  };
}
export async function fetchSpotifyPlaylist(id, onProgress = () => {}, getJson = deezerJson, fetchText = getText, pause = 120) {
  let html;
  try { html = await fetchText(`https://open.spotify.com/embed/playlist/${id}`); }
  catch { throw new Error("Spotify n'est lisible que depuis l'appli Android (APK). Sur le web : exporte la liste en texte « Artiste - Titre » ou transfère la playlist sur Deezer."); }
  const { name, lines } = parseSpotifyEmbed(html);
  const { tracks, missing } = await resolveLines(lines, getJson, onProgress, pause);
  return { name, cover: "", source: "Spotify", total: lines.length, tracks, missing: missing.length, capped: lines.length >= SPOTIFY_EMBED_MAX };
}

/* ------------- Spotify : liens de morceaux collés (Ctrl+A, Ctrl+C dans une playlist Spotify) ------------- */
const decodeEntities = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, e) => {
  const k = e.toLowerCase();
  if (k === "amp") return "&"; if (k === "quot") return '"'; if (k === "apos") return "'"; if (k === "lt") return "<"; if (k === "gt") return ">";
  return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
});
const metaContent = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = (String(html).match(re) || [])[0];
  const c = tag && tag.match(/content=("([^"]*)"|'([^']*)')/i);
  return c ? decodeEntities(c[2] !== undefined ? c[2] : c[3]).trim() : "";
};
/** Page publique d'un morceau Spotify -> { title, artist }. */
export function parseSpotifyTrackPage(html) {
  const title = metaContent(html, "og:title");
  const desc = metaContent(html, "og:description"); // « Artiste, Artiste 2 · Album · Song · 2013 »
  const artist = (metaContent(html, "music:musician_description") || desc.split(" · ")[0] || "").split(/,\s*/)[0].trim();
  return title && artist ? { title, artist } : null;
}
export async function fetchSpotifyTracks(ids, onProgress = () => {}, fetchText = getText) {
  const queue = ids.slice();
  const lines = [];
  let done = 0, failed = 0, webBlocked = false;
  const worker = async () => {
    while (queue.length && !webBlocked) {
      const id = queue.shift();
      try { const l = parseSpotifyTrackPage(await fetchText(`https://open.spotify.com/track/${id}`)); if (l) lines.push({ ...l, order: ids.indexOf(id) }); else failed++; }
      catch (e) { if (done === 0 && /Failed to fetch|NetworkError|Load failed/i.test(String(e && e.message))) webBlocked = true; failed++; }
      onProgress(++done, ids.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (webBlocked) throw new Error("Les liens de morceaux Spotify ne se lisent que depuis l'appli Android (APK). Sur le web : exporte la liste en texte « Artiste - Titre » ou transfère la playlist sur Deezer.");
  lines.sort((a, b) => a.order - b.order);
  return { lines: lines.map(({ title, artist }) => ({ title, artist })), failed };
}

/* ------------------------------ démo (sans réseau) ------------------------------ */
export const DEMO_TRACKS = [
  ["Get Lucky (feat. Pharrell Williams & Nile Rodgers) - Radio Edit", ["Daft Punk", "Pharrell Williams"], 2013],
  ["Bohemian Rhapsody - Remastered 2011", ["Queen"], 1975],
  ["Rolling in the Deep", ["Adele"], 2010],
  ["Alors on danse", ["Stromae"], 2009],
  ["Billie Jean", ["Michael Jackson"], 1983],
  ["Dernière danse", ["Indila"], 2013],
  ["Smells Like Teen Spirit", ["Nirvana"], 1991],
  ["Formidable", ["Stromae"], 2013],
  ["Shape of You", ["Ed Sheeran"], 2017],
  ["La Vie en rose", ["Édith Piaf"], 1947],
  ["Lose Yourself", ["Eminem"], 2002],
  ["Un jour en France", ["Mylène Farmer"]],
].map(([title, artists, year], i) => ({ id: "demo" + i, title, artists, preview: "demo:" + i, cover: "", ...(year ? { year } : {}) }));
export const demoPlaylist = () => ({ name: "Playlist de démo (mélodies de test)", cover: "", source: "Démo", total: DEMO_TRACKS.length, tracks: DEMO_TRACKS });

/** Point d'entrée : transforme ce que le joueur a collé en playlist. */
export async function importPlaylist(raw, onProgress = () => {}, getJson = deezerJson, pause = 120, fetchText = getText) {
  const p = parseInput(raw);
  if (p.kind === "error") throw new Error(p.msg);
  let pl;
  if (p.kind === "deezer") pl = await fetchDeezerPlaylist(p.id, getJson, onProgress);
  else if (p.kind === "spotify") pl = await fetchSpotifyPlaylist(p.id, onProgress, getJson, undefined, pause);
  else if (p.kind === "spotifytracks") {
    const { lines, failed } = await fetchSpotifyTracks(p.ids, (a, b) => onProgress(a, b * 2), fetchText);
    if (!lines.length) throw new Error("Aucun morceau lu : ces liens Spotify ne répondent pas (appli Android uniquement).");
    const { tracks, missing } = await resolveLines(lines, getJson, (a, b) => onProgress(p.ids.length + a, p.ids.length * 2), pause);
    pl = { name: "Morceaux Spotify collés", cover: "", source: "Spotify", total: p.ids.length, tracks, missing: missing.length + failed };
  }
  else {
    const { tracks, missing } = await resolveLines(p.lines, getJson, onProgress, pause);
    pl = { name: "Liste collée", cover: "", source: "Liste", total: p.lines.length, tracks, missing: missing.length };
  }
  if (!pl.tracks.length) throw new Error("Aucun morceau jouable (il faut un extrait audio Deezer).");
  return pl;
}
