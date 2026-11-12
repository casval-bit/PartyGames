// Connexion à Spotify (flux « PKCE », sans secret) pour importer TOUTES les playlists du créateur, sans la limite de 100 morceaux.
// 1) on ouvre la page d'autorisation Spotify ; 2) Spotify renvoie vers public/spotify.html qui AFFICHE un code ;
// 3) le joueur colle ce code dans l'appli ; 4) l'appli l'échange contre un jeton, gardé sur le téléphone (et renouvelé tout seul).
// Limites de Spotify (mode développement) : seules les playlists dont on est propriétaire ou collaborateur sont lisibles.
// Aucune dépendance à config.js : tout est injecté (testable sans réseau).

export const SCOPES = "playlist-read-private playlist-read-collaborative";
const AUTH = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const KEY = "ph_spotify";

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const makeVerifier = () => b64url(crypto.getRandomValues(new Uint8Array(48)));
export const challengeOf = async (verifier) => b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));

const read = (storage) => { try { return JSON.parse(storage.getItem(KEY) || "null") || {}; } catch { return {}; } };
const write = (storage, v) => { try { storage.setItem(KEY, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

export const isConnected = (storage = localStorage) => Boolean(read(storage).refresh);
export const disconnect = (storage = localStorage) => { try { storage.removeItem(KEY); } catch { /* rien */ } };

/** Adresse de la page d'autorisation Spotify ; garde le vérificateur PKCE et un « state » anti-falsification. */
export async function startAuth({ clientId, redirect, storage = localStorage }) {
  const verifier = makeVerifier(), state = makeVerifier().slice(0, 16);
  write(storage, { ...read(storage), pending: { verifier, state } });
  const q = new URLSearchParams({ response_type: "code", client_id: clientId, scope: SCOPES, redirect_uri: redirect, code_challenge_method: "S256", code_challenge: await challengeOf(verifier), state });
  return `${AUTH}?${q}`;
}

async function tokenCall(body, storage, fetchFn) {
  const r = await fetchFn(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error === "invalid_grant" ? "Code refusé ou expiré. Reconnecte-toi à Spotify." : "Spotify a refusé la connexion" + (j.error_description ? " (" + j.error_description + ")" : "."));
  const cur = read(storage);
  write(storage, { refresh: j.refresh_token || cur.refresh, access: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 - 60000 });
  return j.access_token;
}

/** Échange le texte affiché par la page de retour (« code~state ») contre un jeton. */
export async function finishAuth(pasted, { clientId, redirect, storage = localStorage, fetchFn = fetch }) {
  // on accepte le code « code~state » affiché par la page, OU l'adresse complète de cette page (même si la page affiche une erreur 404)
  const txt = String(pasted).trim();
  const mc = txt.match(/[?&]code=([^&\s#]+)/), ms = txt.match(/[?&]state=([^&\s#]+)/);
  const [code, state] = mc ? [decodeURIComponent(mc[1]), ms ? decodeURIComponent(ms[1]) : ""] : txt.split("~");
  const pending = read(storage).pending;
  if (!code || !pending) throw new Error("Code illisible : copie-le en entier sur la page Spotify, puis recommence « Se connecter ».");
  if (state !== pending.state) throw new Error("Ce code ne correspond pas à la connexion en cours. Recommence « Se connecter ».");
  const tok = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: clientId, code_verifier: pending.verifier }, storage, fetchFn);
  const cur = read(storage); delete cur.pending; write(storage, cur);
  return tok;
}

async function accessToken({ clientId, storage, fetchFn }) {
  const s = read(storage);
  if (s.access && s.exp > Date.now()) return s.access;
  if (!s.refresh) throw Object.assign(new Error("Connecte-toi à Spotify."), { code: "auth" });
  try { return await tokenCall({ grant_type: "refresh_token", refresh_token: s.refresh, client_id: clientId }, storage, fetchFn); }
  catch { disconnect(storage); throw Object.assign(new Error("Session Spotify expirée : reconnecte-toi."), { code: "auth" }); }
}

const RETRY_MS = [700, 1800, 4000, 8000, 15000, 25000]; // pannes passagères de Spotify (429, 500 à 504) : on réessaie tout seul (≈ 55 s en tout) avant d'afficher une erreur
async function api(path, ctx) {
  for (let attempt = 0; ; attempt++) {
    const tok = await accessToken(ctx);
    const r = await ctx.fetchFn(path.startsWith("http") ? path : API + path, { headers: { Authorization: "Bearer " + tok } });
    if (r.status === 401) { disconnect(ctx.storage); throw Object.assign(new Error("Session Spotify expirée : reconnecte-toi."), { code: "auth" }); }
    if (r.status === 403) throw new Error("Spotify refuse l'accès (compte non autorisé pour cette appli, ou playlist qui n'est pas la tienne).");
    const transient = r.status === 429 || (r.status >= 500 && r.status <= 504);
    if (transient && attempt < RETRY_MS.length) {
      const ra = Number(r.headers && r.headers.get && r.headers.get("Retry-After"));
      const ms = r.status === 429 && ra > 0 ? Math.min(ra, 20) * 1000 : RETRY_MS[attempt];
      ctx.pace = Math.max(ctx.pace, 1200);                    // Spotify souffle : on espace ensuite les pages
      ctx.onWait(r.status, ms, attempt + 1);
      await ctx.sleep(ms);
      continue;
    }
    if (r.status === 429) throw new Error("Spotify demande de patienter : réessaie dans une minute.");
    if (r.status >= 500) throw Object.assign(new Error(`Spotify est momentanément indisponible (erreur ${r.status}). Ça vient de leurs serveurs : réessaie dans quelques minutes.`), { status: r.status });
    if (!r.ok) throw new Error("Spotify : erreur " + r.status);
    return r.json();
  }
}
const ctxOf = (o = {}) => ({ clientId: o.clientId, storage: o.storage || localStorage, fetchFn: o.fetchFn || ((...a) => fetch(...a)), sleep: o.sleep || ((ms) => new Promise((res) => setTimeout(res, ms))), onWait: o.onWait || (() => {}), pace: o.pace ?? 250 });

/** Mes playlists lisibles (les miennes ou en collaboration). */
export async function myPlaylists(o) {
  const ctx = ctxOf(o);
  const me = await api("/me", ctx);
  const out = [];
  let url = "/me/playlists?limit=50";
  for (let guard = 0; url && guard < 40; guard++) {
    const page = await api(url, ctx);
    for (const p of page.items || []) {
      if (!p || !p.id) continue;
      const mine = p.collaborative || (p.owner && p.owner.id === me.id);
      if (mine) out.push({ id: p.id, name: p.name || "Sans titre", total: (p.items && p.items.total) ?? (p.tracks && p.tracks.total) ?? 0, cover: (p.images && p.images[0] && p.images[0].url) || "" });
    }
    url = page.next || "";
  }
  return out;
}

/**
 * Tous les morceaux d'une playlist (pages de 50, une petite pause entre deux pages pour ne pas se faire limiter) -> [{ artist, title }].
 * `resume` ({}) garde l'avancement : si Spotify coupe en route (panne, limite), on rappelle avec le MÊME objet et la lecture reprend à la page
 * où elle s'est arrêtée, sans tout relire. Les morceaux déjà lus sont dans `resume.lines` (l'erreur levée porte aussi `partial` / `total`).
 */
export async function playlistLines(id, o, onProgress = () => {}, resume = {}) {
  const ctx = ctxOf(o);
  const lines = resume.lines || (resume.lines = []);
  let url = resume.url === undefined ? `/playlists/${encodeURIComponent(id)}/items?limit=50&additional_types=track` : resume.url, total = resume.total || 0;
  resume.url = url;
  try {
    for (let guard = 0; url && guard < 200; guard++) {
      if (guard > 0) await ctx.sleep(ctx.pace);
      const page = await api(url, ctx);
      if (page.items === undefined) throw new Error("Spotify ne donne pas le contenu de cette playlist (seules les tiennes sont lisibles).");
      total = page.total || total;
      for (const it of page.items) {
        const t = it && (it.item || it.track);
        if (!t || t.is_local || (t.type && t.type !== "track") || !t.name) continue;
        const artist = t.artists && t.artists[0] && t.artists[0].name;
        if (artist) lines.push({ title: t.name, artist });
      }
      url = page.next || ""; resume.url = url; resume.total = total;   // page validée : on ne la relira pas
      onProgress(lines.length, total || lines.length);
    }
  } catch (e) { e.partial = lines.length; e.total = total; throw e; }
  return lines;
}
