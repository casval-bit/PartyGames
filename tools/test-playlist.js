// node tools/test-playlist.js : import de playlist avec un faux Deezer (aucun réseau)
import { MAX_TEXT_LINES, parseCsvTracks, spotifyTrackIds, parseSpotifyTrackPage, fetchSpotifyTracks, resolveLines, parseInput, fetchDeezerPlaylist, importPlaylist, parseSpotifyEmbed, fetchSpotifyPlaylist, freshTrack } from "../src/data/playlist.js";
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

// plus de 100 morceaux : 300 lignes texte acceptées, 600 au maximum
const many = Array.from({ length: MAX_TEXT_LINES + 100 }, (_, i) => `Artiste${i} - Titre${i}`).join("\n");
eq("texte au-dessus du maximum -> plafond", parseInput(many).lines.length, MAX_TEXT_LINES);
// export CSV d'Exportify : guillemets, virgules dans un titre, plusieurs artistes séparés par « ; »
const csvIn = 'Track URI,Track Name,Artist URI(s),Artist Name(s),Album Name\nspotify:track:1,"Hello, World",x,Adele;Someone,A\nspotify:track:2,Linger,y,The Cranberries,B\n';
eq("CSV Exportify", parseCsvTracks(csvIn), [{ title: "Hello, World", artist: "Adele" }, { title: "Linger", artist: "The Cranberries" }]);
eq("CSV via parseInput", parseInput(csvIn).kind === "text" && parseInput(csvIn).lines.length, 2);
eq("texte simple n'est pas un CSV", parseCsvTracks("Daft Punk - Get Lucky\nQueen - Bohemian Rhapsody"), null);
let calls = 0;
const searchOk = async (path) => (path.startsWith("/search") ? (calls++, { data: [tr(1000 + calls, "T" + calls, "A")] }) : {});
const big = await resolveLines(parseInput(many.split("\n").slice(0, 300).join("\n")).lines, searchOk, () => {}, 0);
eq("300 lignes résolues", big.tracks.length, 300);
// Deezer répond « quota » (code 4) quelques fois : on réessaie au lieu de perdre le morceau
let q = 0;
const quota = async (path) => (path.startsWith("/search") ? (++q <= 2 ? { error: { code: 4, message: "Quota limit exceeded" } } : { data: [tr(5000, "Z", "Y")] }) : {});
const rq = await resolveLines([{ artist: "Y", title: "Z" }], quota, () => {}, 1);
eq("quota -> réessai", [rq.tracks.length, rq.missing.length], [1, 0]);
// playlist Deezer de 350 morceaux (pages de 100)
const bigAll = Array.from({ length: 350 }, (_, i) => tr(2000 + i, "S" + i, "A" + i));
const bigFake = async (path) => {
  if (path === "/playlist/8") return { title: "Grosse", nb_tracks: 350 };
  if (path.startsWith("/playlist/8/tracks")) { const i = +path.match(/index=(\d+)/)[1]; return { data: bigAll.slice(i, i + 100), next: i + 100 < 350 ? "n" : undefined }; }
  return {};
};
eq("350 morceaux Deezer", (await fetchDeezerPlaylist("8", bigFake)).tracks.length, 350);
// liens de morceaux Spotify collés (Ctrl+A, Ctrl+C dans une playlist) : lus un par un, sans limite de 100
const IDS = Array.from({ length: 250 }, (_, i) => "T" + String(i).padStart(21, "0"));
const pasted = IDS.map((id) => "https://open.spotify.com/track/" + id).join("\n") + "\nhttps://open.spotify.com/intl-fr/track/" + IDS[0] + "?si=x";
const pin = parseInput(pasted);
eq("liens morceaux : 250 uniques", [pin.kind, pin.ids.length], ["spotifytracks", 250]);
eq("lien unique d'un morceau", parseInput("https://open.spotify.com/track/" + IDS[3] + "?si=abc").ids, [IDS[3]]);
eq("spotify:track:", spotifyTrackIds("spotify:track:" + IDS[5]), [IDS[5]]);
eq("playlist prioritaire sur morceaux", parseInput("https://open.spotify.com/playlist/AbC123").kind, "spotify");
const page = (id) => { const n = +id.slice(1); return `<head><meta property="og:title" content="Titre &amp; Co ${n}"/><meta property="og:description" content="Artiste${n}, Autre · Album · Song · 1994"/><meta name="music:musician_description" content="Artiste${n}"/></head>`; };
eq("page morceau", parseSpotifyTrackPage(page(IDS[7])), { title: "Titre & Co 7", artist: "Artiste7" });
eq("page sans infos", parseSpotifyTrackPage("<html></html>"), null);
let seenUrls = 0;
const fetched = await fetchSpotifyTracks(IDS, () => {}, async (u) => { seenUrls++; if (u.endsWith(IDS[10])) throw new Error("HTTP 429"); return page(u.split("/").pop()); });
eq("250 pages lues, 1 échec, ordre conservé", [seenUrls, fetched.lines.length, fetched.failed, fetched.lines[0].title, fetched.lines[10].title], [250, 249, 1, "Titre & Co 0", "Titre & Co 11"]);
try { await fetchSpotifyTracks(IDS.slice(0, 5), () => {}, async () => { throw new Error("Failed to fetch"); }); bad++; console.log("ECHEC web"); } catch (e) { eq("web : APK uniquement", /APK/.test(e.message), true); }
const spt = await importPlaylist(IDS.slice(0, 3).map((i) => "https://open.spotify.com/track/" + i).join("\n"), () => {}, fake, 1, async (u) => page(u.split("/").pop()));
eq("import morceaux Spotify -> Deezer", [spt.source, spt.total, spt.tracks.length], ["Spotify", 3, 1]); // le faux Deezer renvoie toujours le même morceau (dédoublonné)
console.log(bad ? bad + " échec(s)" : "playlist : tout est OK");
process.exit(bad ? 1 : 0);
