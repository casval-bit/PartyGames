// node tools/test-playlist.js : import de playlist avec un faux Deezer (aucun réseau)
import { parseInput, fetchDeezerPlaylist, importPlaylist, parseSpotifyEmbed, fetchSpotifyPlaylist, freshTrack } from "../src/data/playlist.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } };

eq("url", parseInput("https://www.deezer.com/fr/playlist/1313621735?utm=x"), { kind: "deezer", id: "1313621735" });
eq("url noloc", parseInput("deezer.com/playlist/123456"), { kind: "deezer", id: "123456" });
eq("id", parseInput("  1313621735 "), { kind: "deezer", id: "1313621735" });
eq("spotify", parseInput("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc"), { kind: "spotify", id: "37i9dQZF1DXcBWIGoYBM5M" });
eq("spotify intl", parseInput("https://open.spotify.com/intl-fr/playlist/AbC123"), { kind: "spotify", id: "AbC123" });
eq("short", parseInput("https://link.deezer.com/s/abc").kind, "error");
eq("text", parseInput("Daft Punk - Get Lucky\nQueen – Bohemian Rhapsody\nbla").lines.length, 2);
eq("empty", parseInput("").kind, "error");

const tr = (id, t, a, prev = "https://cdn/p" + id + ".mp3") => ({ id, title: t, artist: { name: a }, album: { cover_medium: "c" + id }, preview: prev, readable: true });
const all = [tr(1, "A", "X"), tr(2, "B", "Y"), tr(3, "C", "Z", ""), tr(4, "D", "W")];
const fake = async (path) => {
  if (path === "/playlist/9") return { title: "Ma liste", nb_tracks: 4, picture_medium: "pic" };
  if (path.startsWith("/playlist/9/tracks")) { const i = +path.match(/index=(\d+)/)[1]; return { data: all.slice(i, i + 2), next: i + 2 < all.length ? "n" : undefined }; }
  if (path.startsWith("/playlist/404")) return { error: { code: 800, type: "DataException" } };
  if (path.startsWith("/search")) { const q = decodeURIComponent(path); return q.includes("Nope") ? { data: [] } : { data: [tr(77, "Found", "Q")] }; }
  if (path.startsWith("/track/")) return { preview: "https://cdn/fresh.mp3", album: { cover_medium: "newc" } };
  return {};
};
const pl = await fetchDeezerPlaylist("9", fake);
eq("deezer tracks (sans extrait exclus)", pl.tracks.map((t) => t.id), ["1", "2", "4"]);
eq("name", pl.name, "Ma liste");
try { await fetchDeezerPlaylist("404", fake); bad++; console.log("ECHEC privée"); } catch (e) { eq("privée", /privée/.test(e.message), true); }
const txt = await importPlaylist("Q - Found\nNope - Nope", () => {}, fake);
eq("texte", [txt.tracks.length, txt.missing], [1, 1]);
const f = await freshTrack(pl.tracks[0], fake);
eq("frais", f.preview, "https://cdn/fresh.mp3");

const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { state: { data: { entity: { name: "Ma playlist", trackList: [{ title: "Get Lucky", subtitle: "Daft Punk, Pharrell Williams" }, { title: "Hello", subtitle: "Adele" }] } } } } } })}</script></html>`;
const sp = parseSpotifyEmbed(html);
eq("spotify parse", [sp.name, sp.lines], ["Ma playlist", [{ title: "Get Lucky", artist: "Daft Punk" }, { title: "Hello", artist: "Adele" }]]);
const spl = await fetchSpotifyPlaylist("abc", () => {}, fake, async () => html);
eq("spotify -> deezer", [spl.name, spl.tracks.length, spl.source], ["Ma playlist", 1, "Spotify"]);
try { await fetchSpotifyPlaylist("abc", () => {}, fake, async () => { throw new Error("cors"); }); bad++; } catch (e) { eq("spotify web", /APK/.test(e.message), true); }
console.log(bad ? bad + " échec(s)" : "playlist : tout est OK");
process.exit(bad ? 1 : 0);
