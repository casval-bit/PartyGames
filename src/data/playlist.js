// Import d'une playlist pour le blind test.
// - Deezer : API publique, sans clé. Chaque morceau a un extrait MP3 de 30 s ("preview"). Pas de CORS sur api.deezer.com :
//   dans le navigateur on passe par JSONP, dans l'APK (CapacitorHttp activé) un fetch normal marche.
// - Spotify : Spotify ne donne plus d'extraits audio aux nouvelles applications. On lit seulement la LISTE des morceaux (page
//   « embed » publique, possible uniquement dans l'APK) puis on retrouve chaque morceau sur Deezer pour avoir l'extrait.
// - Liste texte : une ligne « Artiste - Titre » par morceau, retrouvée sur Deezer.
// - Démo : quelques morceaux avec une mélodie synthétique (aucun réseau), pour tester le jeu.

export const MAX_TRACKS = 500;
const DZ = "https://api.deezer.com";

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
  if (/^https?:\/\//i.test(s)) return { kind: "error", msg: "Adresse non reconnue. Playlists acceptées : Deezer et Spotify." };
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((l) => {
    const k = l.search(/\s[-–—]\s/);
    return k > 0 ? { artist: l.slice(0, k).trim(), title: l.slice(k).replace(/^\s[-–—]\s/, "").trim() } : null;
  }).filter((x) => x && x.artist && x.title);
  if (!parsed.length) return { kind: "error", msg: "Je ne reconnais rien. Format d'une ligne : Artiste - Titre." };
  return { kind: "text", lines: parsed.slice(0, 150) };
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
    if (t && t.preview) return { ...track, preview: t.preview, cover: (t.album && (t.album.cover_medium || t.album.cover)) || track.cover };
  } catch { /* on garde l'ancienne adresse */ }
  return track;
}

/* ------------------- recherche d'un morceau (Spotify / texte) ------------------- */
const nrm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export async function searchDeezerTrack({ artist, title }, getJson = deezerJson) {
  const q = (txt) => encodeURIComponent(txt);
  const tryQ = async (query) => {
    const r = await getJson(`/search?q=${q(query)}&limit=6`);
    return ((r && r.data) || []).filter(usable);
  };
  let list = await tryQ(`artist:"${artist}" track:"${title}"`);
  if (!list.length) list = await tryQ(`${artist} ${title}`);
  if (!list.length) return null;
  const a = nrm(artist);
  const t = list.find((x) => nrm(x.artist && x.artist.name) === a) || list[0];
  return mapTrack(t);
}
export async function resolveLines(lines, getJson = deezerJson, onProgress = () => {}) {
  const out = [], missing = [];
  let done = 0;
  const queue = lines.slice(0, 150);
  const worker = async () => {
    while (queue.length) {
      const l = queue.shift();
      try { const t = await searchDeezerTrack(l, getJson); if (t) out.push(t); else missing.push(l); } catch { missing.push(l); }
      onProgress(++done, lines.length);
      await new Promise((r) => setTimeout(r, 120)); // l'API limite à ~50 requêtes / 5 s
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
export async function fetchSpotifyPlaylist(id, onProgress = () => {}, getJson = deezerJson, fetchText = getText) {
  let html;
  try { html = await fetchText(`https://open.spotify.com/embed/playlist/${id}`); }
  catch { throw new Error("Spotify n'est lisible que depuis l'appli Android (APK). Sur le web : exporte la liste en texte « Artiste - Titre » ou transfère la playlist sur Deezer."); }
  const { name, lines } = parseSpotifyEmbed(html);
  const { tracks, missing } = await resolveLines(lines, getJson, onProgress);
  return { name, cover: "", source: "Spotify", total: lines.length, tracks, missing: missing.length };
}

/* ------------------------------ démo (sans réseau) ------------------------------ */
export const DEMO_TRACKS = [
  ["Get Lucky (feat. Pharrell Williams & Nile Rodgers) - Radio Edit", ["Daft Punk", "Pharrell Williams"]],
  ["Bohemian Rhapsody - Remastered 2011", ["Queen"]],
  ["Rolling in the Deep", ["Adele"]],
  ["Alors on danse", ["Stromae"]],
  ["Billie Jean", ["Michael Jackson"]],
  ["Dernière danse", ["Indila"]],
  ["Smells Like Teen Spirit", ["Nirvana"]],
  ["Formidable", ["Stromae"]],
  ["Shape of You", ["Ed Sheeran"]],
  ["La Vie en rose", ["Édith Piaf"]],
  ["Lose Yourself", ["Eminem"]],
  ["Un jour en France", ["Mylène Farmer"]],
].map(([title, artists], i) => ({ id: "demo" + i, title, artists, preview: "demo:" + i, cover: "" }));
export const demoPlaylist = () => ({ name: "Playlist de démo (mélodies de test)", cover: "", source: "Démo", total: DEMO_TRACKS.length, tracks: DEMO_TRACKS });

/** Point d'entrée : transforme ce que le joueur a collé en playlist. */
export async function importPlaylist(raw, onProgress = () => {}, getJson = deezerJson) {
  const p = parseInput(raw);
  if (p.kind === "error") throw new Error(p.msg);
  let pl;
  if (p.kind === "deezer") pl = await fetchDeezerPlaylist(p.id, getJson, onProgress);
  else if (p.kind === "spotify") pl = await fetchSpotifyPlaylist(p.id, onProgress, getJson);
  else {
    const { tracks, missing } = await resolveLines(p.lines, getJson, onProgress);
    pl = { name: "Liste collée", cover: "", source: "Liste", total: p.lines.length, tracks, missing: missing.length };
  }
  if (!pl.tracks.length) throw new Error("Aucun morceau jouable (il faut un extrait audio Deezer).");
  return pl;
}
