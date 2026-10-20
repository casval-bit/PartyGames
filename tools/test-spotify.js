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

const pls = await myPlaylists(o);
eq("playlists : les miennes + collaboration, pas celles des autres", pls.map((p) => [p.id, p.total]), [["p1", 242], ["p3", 5]]);
const lines = await playlistLines("p1", o);
eq("53 pages lues sur 2 appels, locaux et épisodes ignorés, premier artiste", [lines.length, lines[0], lines[50]], [51, { title: "T0", artist: "A0" }, { title: "Vieux champ", artist: "Z" }]);
try { await playlistLines("p2", o); bad++; console.log("ECHEC lecture seule"); } catch (e) { eq("playlist non lisible", /seules les tiennes/.test(e.message), true); }
try { await playlistLines("p9", o); bad++; console.log("ECHEC 403"); } catch (e) { eq("403 expliqué", /refuse/.test(e.message), true); }

// jeton expiré -> renouvelé tout seul ; refresh invalide -> déconnexion propre
const s = JSON.parse(st.getItem("ph_spotify")); s.exp = 0; st.setItem("ph_spotify", JSON.stringify(s));
tokens = 0; await myPlaylists(o);
eq("jeton renouvelé automatiquement", tokens, 1);
const s2 = JSON.parse(st.getItem("ph_spotify")); s2.exp = 0; s2.refresh = "MORT"; st.setItem("ph_spotify", JSON.stringify(s2));
try { await myPlaylists(o); bad++; console.log("ECHEC refresh"); } catch (e) { eq("session expirée", [e.code, isConnected(st)], ["auth", false]); }
disconnect(st); eq("déconnexion", isConnected(st), false);
console.log(bad ? bad + " échec(s)" : "spotify : tout est OK");
process.exit(bad ? 1 : 0);
