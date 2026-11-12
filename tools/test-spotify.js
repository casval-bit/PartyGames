// node tools/test-spotify.js : connexion Spotify (PKCE) et lecture des playlists avec un faux serveur
import { makeVerifier, challengeOf, startAuth, finishAuth, isConnected, disconnect, myPlaylists, playlistLines } from "../src/data/spotifyApi.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } };
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };

eq("PKCE : exemple de la RFC 7636", await challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
eq("vérificateurs distincts, 64 caractères", [makeVerifier() !== makeVerifier(), makeVerifier().length], [true, 64]);

const st = mem();
const url = new URL(await startAuth({ clientId: "CID", redirect: "https://x.github.io/P/spotify.html", storage: st }));
eq("adresse d'autorisation", [url.origin + url.pathname, url.searchParams.get("client_id"), url.searchParams.get("code_challenge_method"), url.searchParams.get("redirect_uri"), url.searchParams.get("scope")], ["https://accounts.spotify.com/authorize", "CID", "S256", "https://x.github.io/P/spotify.html", "playlist-read-private playlist-read-collaborative"]);
const state = url.searchParams.get("state");

let calls = [], tokens = 0, access = "A1";
const server = async (u, init = {}) => {
  calls.push(u);
  const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });
  if (u.endsWith("/api/token")) {
    const b = new URLSearchParams(init.body); tokens++;
    if (b.get("grant_type") === "authorization_code") return b.get("code") === "GOOD" && b.get("code_verifier") ? json({ access_token: access, refresh_token: "R1", expires_in: 3600 }) : json({ error: "invalid_grant" }, 400);
    if (b.get("grant_type") === "refresh_token") return b.get("refresh_token") === "R1" ? json({ access_token: (access = "A2"), expires_in: 3600 }) : json({ error: "invalid_grant" }, 400);
  }
  if (init.headers && init.headers.Authorization !== "Bearer " + access) return json({}, 401);
  if (u.endsWith("/v1/me")) return json({ id: "me" });
  if (u.includes("/me/playlists")) return u.includes("offset") ? json({ items: [{ id: "p3", name: "Collab", collaborative: true, items: { total: 5 } }], next: null }) : json({ items: [{ id: "p1", name: "Ma liste", owner: { id: "me" }, tracks: { total: 242 }, images: [{ url: "i" }] }, { id: "p2", name: "Pas à moi", owner: { id: "other" } }, null], next: "https://api.spotify.com/v1/me/playlists?limit=50&offset=50" });
  if (u.includes("/playlists/p1/items")) {
    const mk = (i) => ({ item: { type: "track", name: "T" + i, artists: [{ name: "A" + i }, { name: "B" }] } });
    if (u.includes("offset=50")) return json({ total: 53, items: [{ track: { type: "track", name: "Vieux champ", artists: [{ name: "Z" }] } }, { item: { type: "episode", name: "Podcast" } }, { item: { is_local: true, type: "track", name: "Local", artists: [{ name: "L" }] } }], next: null });
    return json({ total: 53, items: Array.from({ length: 50 }, (_, i) => mk(i)), next: "https://api.spotify.com/v1/playlists/p1/items?limit=50&offset=50" });
  }
  if (u.includes("/playlists/p2/items")) return json({ total: 9 });           // métadonnées seules : pas de champ items
  if (u.includes("/playlists/p9/items")) return json({}, 403);
  return json({}, 404);
};
const o = { clientId: "CID", storage: st, fetchFn: server };

try { await finishAuth("GOOD~autre", { clientId: "CID", redirect: "r", storage: st, fetchFn: server }); bad++; console.log("ECHEC state"); } catch (e) { eq("mauvais state refusé", /ne correspond pas/.test(e.message), true); }
try { await finishAuth("BAD~" + state, { clientId: "CID", redirect: "r", storage: st, fetchFn: server }); bad++; console.log("ECHEC code"); } catch (e) { eq("code refusé", /refusé|expiré/.test(e.message), true); }
eq("pas connecté avant", isConnected(st), false);
await finishAuth(` GOOD~${state} `, { clientId: "CID", redirect: "r", storage: st, fetchFn: server });
eq("connecté après", isConnected(st), true);
// adresse complète collée (page de retour en 404 : le code est quand même dans la barre d'adresse)
const st2 = mem(); const u2 = new URL(await startAuth({ clientId: "CID", redirect: "r", storage: st2 })); const s2state = u2.searchParams.get("state");
await finishAuth(`https://casval-bit.github.io/PartyGames/spotify.html?code=GOOD&state=${encodeURIComponent(s2state)}&ubi=xyz%3D%3D`, { clientId: "CID", redirect: "r", storage: st2, fetchFn: server });
eq("adresse complète acceptée", isConnected(st2), true);

const pls = await myPlaylists(o);
eq("playlists : les miennes + collaboration, pas celles des autres", pls.map((p) => [p.id, p.total]), [["p1", 242], ["p3", 5]]);
const lines = await playlistLines("p1", o);
eq("53 pages lues sur 2 appels, locaux et épisodes ignorés, premier artiste", [lines.length, lines[0], lines[50]], [51, { title: "T0", artist: "A0" }, { title: "Vieux champ", artist: "Z" }]);
try { await playlistLines("p2", o); bad++; console.log("ECHEC lecture seule"); } catch (e) { eq("playlist non lisible", /seules les tiennes/.test(e.message), true); }
try { await playlistLines("p9", o); bad++; console.log("ECHEC 403"); } catch (e) { eq("403 expliqué", /refuse/.test(e.message), true); }

// pannes passagères de Spotify : réessais automatiques, puis message clair
{
  const waits = [];
  const mk = (statuses, headers) => { let i = 0, n = 0; return { n: () => n, fetchFn: async (u, init) => { if (u.endsWith("/api/token")) return server(u, init); n++; const code = statuses[Math.min(i++, statuses.length - 1)]; return code === 200 ? server(u, init) : { ok: false, status: code, headers: { get: (h) => (headers && headers[h]) || null }, json: async () => ({}) }; } }; };
  const sleep = async (ms) => { waits.push(ms); };
  let m = mk([503, 503, 200]);
  eq("503 deux fois puis OK : la liste arrive quand même", (await myPlaylists({ ...o, fetchFn: m.fetchFn, sleep })).length, 2);
  eq("deux pauses croissantes, 5 appels (me ×3 + 2 pages de playlists)", [waits.slice(), m.n()], [[700, 1800], 5]);
  waits.length = 0; m = mk([502]);
  try { await myPlaylists({ ...o, fetchFn: m.fetchFn, sleep }); bad++; console.log("ECHEC 5xx permanent"); } catch (e) { eq("5xx permanent : message clair, 6 réessais de plus en plus longs", [/momentanément indisponible \(erreur 502\)/.test(e.message), e.status, waits.slice(), m.n()], [true, 502, [700, 1800, 4000, 8000, 15000, 25000], 7]); }
  waits.length = 0; m = mk([429, 200], { "Retry-After": "2" });
  await myPlaylists({ ...o, fetchFn: m.fetchFn, sleep });
  eq("429 : on attend le Retry-After de Spotify", waits[0], 2000);
  // lecture d'une grande playlist : si Spotify lâche à la page 2, on reprend à la page 2 (sans relire la page 1, sans doublons)
  {
    const resume = {}; let page1 = 0, healthy = false;
    const flaky = async (u, init) => {
      if (u.endsWith("/api/token")) return server(u, init);
      if (u.includes("/playlists/p1/items") && !u.includes("offset=50")) page1++;
      if (!healthy && u.includes("/playlists/p1/items") && u.includes("offset=50")) return { ok: false, status: 503, headers: { get: () => null }, json: async () => ({}) };
      return server(u, init);
    };
    waits.length = 0;
    try { await playlistLines("p1", { ...o, fetchFn: flaky, sleep }, () => {}, resume); bad++; console.log("ECHEC coupure"); }
    catch (e) { eq("coupure à la page 2 : 50 morceaux déjà lus, total connu", [e.partial, e.total, resume.lines.length], [50, 53, 50]); }
    healthy = true; waits.length = 0;
    const all = await playlistLines("p1", { ...o, fetchFn: flaky, sleep }, () => {}, resume);
    eq("reprise : 51 morceaux, page 1 lue une seule fois, pas de doublon", [all.length, page1, new Set(all.map((l) => l.title)).size], [51, 1, 51]);
    eq("playlist déjà lue en entier : rien à relire", (await playlistLines("p1", { ...o, fetchFn: flaky, sleep }, () => {}, resume)).length, 51);
  }
  waits.length = 0; m = mk([403]);
  try { await myPlaylists({ ...o, fetchFn: m.fetchFn, sleep }); bad++; } catch (e) { eq("403 : jamais de réessai", [waits.length, m.n()], [0, 1]); }
}

// jeton expiré -> renouvelé tout seul ; refresh invalide -> déconnexion propre
const s = JSON.parse(st.getItem("ph_spotify")); s.exp = 0; st.setItem("ph_spotify", JSON.stringify(s));
tokens = 0; await myPlaylists(o);
eq("jeton renouvelé automatiquement", tokens, 1);
const s2 = JSON.parse(st.getItem("ph_spotify")); s2.exp = 0; s2.refresh = "MORT"; st.setItem("ph_spotify", JSON.stringify(s2));
try { await myPlaylists(o); bad++; console.log("ECHEC refresh"); } catch (e) { eq("session expirée", [e.code, isConnected(st)], ["auth", false]); }
disconnect(st); eq("déconnexion", isConnected(st), false);
console.log(bad ? bad + " échec(s)" : "spotify : tout est OK");
process.exit(bad ? 1 : 0);
