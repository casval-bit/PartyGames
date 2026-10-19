// Année de première sortie d'un morceau, pour le jeu de frise.
//
// Pourquoi pas la date de l'album Spotify ou Deezer ? Parce que c'est la date de l'ALBUM d'où vient la version jouée :
// une version « Remastered 2011 » ou un best-of donne la mauvaise année. MusicBrainz (base ouverte) connaît chaque
// enregistrement avec sa date de PREMIÈRE sortie, tous albums confondus : c'est l'année qu'on veut.
//
// Méthode : une recherche par titre + artiste (titre nettoyé de « Remastered », « Live », « feat. »…), on ne garde que les
// enregistrements dont le titre ET l'artiste correspondent bien, puis la plus ancienne date. On la compare à l'année Deezer :
//   - MusicBrainz seul, ou d'accord avec Deezer      -> date « sûre »
//   - Deezer seul, ou plus ancienne que MusicBrainz  -> date « incertaine » (écartée par défaut)
// Limite imposée par MusicBrainz : 1 requête par seconde au maximum (file d'attente partagée ci-dessous).
import { norm, cleanTitle, artistForms } from "./blindtest.js";

const MB = "https://musicbrainz.org/ws/2";
export const MB_PAUSE_MS = 1100;
const UA = "PartyHub/0.1 (https://github.com/casval-bit/PartyGames)";

const thisYear = () => new Date().getFullYear();
/** « 1975-10-31 » / « 1975 » -> 1975 ; dates absurdes (0000, 1900 ou moins) -> null. */
export function yearOf(date) {
  const m = String(date || "").match(/^(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y > 1900 && y <= thisYear() + 1 ? y : null;
}

/** Titre pour la recherche : sans « - Remastered 2011 », « (Live) », « feat. … », « [Radio Edit] »… */
export function searchTitle(raw) {
  let t = String(raw || "");
  t = t.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, " "); // tout ce qui est entre parenthèses / crochets
  t = t.split(/\s[-–—]\s/)[0];                         // « Titre - Remastered 2011 » -> « Titre »
  t = t.replace(/\b(feat|ft|featuring)\b.*$/i, "");
  return t.replace(/\s+/g, " ").trim();
}

/** Caractères spéciaux de la syntaxe Lucene : on les neutralise dans une valeur entre guillemets. */
const lucene = (s) => String(s).replace(/[\\"]/g, " ").replace(/\s+/g, " ").trim();

export function buildQuery(title, artist) {
  return `recording:"${lucene(title)}" AND artist:"${lucene(artist)}"`;
}

const credit = (r) => (r["artist-credit"] || []).flatMap((c) => [c && c.name, c && c.artist && c.artist.name]).filter(Boolean);
const BAD_DISAMBIG = /\b(demo|bootleg|rehearsal|work ?tape|unreleased|instrumental|karaoke|cover|tribute)\b/i;

/** Parmi les enregistrements renvoyés, ceux qui sont bien CE morceau de CET artiste. */
export function matching(recordings, { title, artists }) {
  const want = norm(searchTitle(title)), who = new Set(artistForms(artists));
  return (recordings || []).filter((r) => {
    if (!r || (typeof r.score === "number" && r.score < 85)) return false;
    if (norm(searchTitle(r.title)) !== want) return false;
    if (r.disambiguation && BAD_DISAMBIG.test(r.disambiguation)) return false;
    return credit(r).some((n) => who.has(norm(n)) || artistForms([n]).some((f) => who.has(f)));
  });
}

/** Année MusicBrainz (la plus ancienne des enregistrements concordants) ou null. */
export function pickYear(recordings, track) {
  const years = matching(recordings, track).map((r) => yearOf(r["first-release-date"])).filter(Boolean);
  return years.length ? Math.min(...years) : null;
}

/** Décision finale à partir des deux sources. */
export function decide(mb, dz) {
  const year = [mb, dz].filter(Boolean).reduce((a, b) => Math.min(a, b), Infinity);
  if (!Number.isFinite(year)) return null;
  return { year, confident: mb != null && (dz == null || dz >= mb), mb, dz, source: mb != null && year === mb ? "musicbrainz" : "deezer" };
}

/* ------------------------------- réseau ------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve(), lastAt = 0;
/** File d'attente commune : jamais plus d'une requête par MB_PAUSE_MS, quel que soit le nombre d'appelants. */
function limited(fn, pause) {
  const run = async () => {
    const wait = lastAt + pause - Date.now();
    if (wait > 0) await sleep(wait);
    try { return await fn(); } finally { lastAt = Date.now(); }
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

async function defaultGet(url, timeoutMs = 9000) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctl && setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let r;
    try { r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA }, signal: ctl && ctl.signal }); }
    catch (e) { if (ctl && ctl.signal.aborted) throw e; r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctl && ctl.signal }); } // navigateur : User-Agent refusé
    if (r.status === 503 || r.status === 429) { const e = new Error("busy"); e.busy = true; throw e; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/** Année MusicBrainz d'un morceau, ou null (introuvable / réseau). `get` et `pause` sont injectables pour les tests. */
export async function mbYear(track, { get = defaultGet, pause = MB_PAUSE_MS } = {}) {
  const title = searchTitle(track.title), artist = (track.artists || [])[0];
  if (!title || !artist) return null;
  const url = `${MB}/recording?query=${encodeURIComponent(buildQuery(title, artist))}&limit=25&fmt=json`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await limited(() => get(url), pause);
      return pickYear(data && data.recordings, track);
    } catch (e) {
      if (!e.busy || attempt) return null; // surcharge : on réessaie une fois, plus lentement
      await sleep(pause * 2);
    }
  }
  return null;
}

/** Point d'entrée : { year, confident, mb, dz, source } ou null si aucune date exploitable. `track.release` = date Deezer. */
export async function resolveYear(track, opts) {
  const dz = yearOf(track.release);
  const mb = await mbYear(track, opts);
  return decide(mb, dz);
}
