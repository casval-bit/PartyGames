// Vote « quitter la partie » + fusion de playlists, côté moteur (sans réseau).
import { HostEngine } from "../src/net/hostEngine.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } };

const mk = () => {
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: () => {}, fresh: async (t) => t });
  e.addPlayer({ id: "a", name: "Anna" }); e.addPlayer({ id: "b", name: "Bob" }); e.addPlayer({ id: "c", name: "Cléo" });
  return e;
};
const e = mk();
// en lobby : rien
e.quitVote("a", "start"); eq("lobby: pas de vote", e.S.quit, null);
e.S.phase = "bt_play"; e.S.bt = { n: 1 };
// 4 humains : majorité = 3
e.quitVote("a", "start"); eq("proposé", [e.S.quit.by, e.S.quit.yes], ["a", ["a"]]);
e.quitVote("b", "yes"); eq("2 oui sur 4: encore ouvert", e.S.phase, "bt_play");
e.quitVote("c", "no"); eq("1 non", e.S.quit.no, ["c"]);
e.quitVote("h", "yes"); eq("3 oui -> lobby", [e.S.phase, e.S.quit, e.S.bt], ["lobby", null, null]);

// refus : 2 non sur 4 = impossible d'atteindre 3 oui
const f = mk(); f.S.phase = "qe_play";
f.quitVote("a", "start"); f.quitVote("b", "no"); eq("1 non: ouvert", !!f.S.quit && !f.S.quit.closed, true);
f.quitVote("c", "no"); eq("2 non: refusé", f.S.quit && f.S.quit.closed, "refused"); eq("reste en jeu", f.S.phase, "qe_play");
f.quitVote("h", "yes"); eq("vote clos: ignoré", f.S.quit.yes.length, 1);

// les bots ne comptent pas, un joueur qui part recalcule la majorité
const g = mk(); g.addBot && g.addBot(); g.S.phase = "tu_play";
const humans = g.S.players.filter((p) => !p.bot).length;
eq("humains", humans, 4);
g.quitVote("a", "start"); g.quitVote("b", "yes"); g.leave("c"); // 3 humains : majorité 2, déjà 2 oui
eq("départ -> majorité atteinte", g.S.phase, "lobby");

// anti-spam : après un refus, relancer tout de suite est ignoré
const h = mk(); h.S.phase = "tu_play";
h.quitVote("a", "start"); h.quitVote("b", "no"); h.quitVote("c", "no"); h.S.quit = null;
h.quitVote("a", "start"); eq("anti-spam", h.S.quit, null);
// un joueur seul : immédiat
const solo = new HostEngine({ roomId: "r", name: "S", host: { id: "h", name: "Hôte" }, emit: () => {}, fresh: async (t) => t });
solo.S.phase = "bt_play"; solo.S.bt = { n: 1 };
solo.quitVote("h", "start"); eq("solo", solo.S.phase, "lobby");

// fusion de playlists
const t = (id) => ({ id: String(id), title: "T" + id, artists: ["A"], preview: "https://cdns-preview-d.dzcdn.net/stream/c-" + id + ".mp3", cover: "" });
const m = mk();
m.setPlaylist("h", { name: "Une", source: "Deezer", tracks: [t(1), t(2), t(3)] });
eq("1re", [m.S.playlist.count, m.S.playlist.name], [3, "Une"]);
m.setPlaylist("h", { name: "Deux", source: "Deezer", tracks: [t(3), t(4), t(5)] }, true);
eq("ajout sans doublon", [m.S.playlist.count, m.S.playlist.name, m.S.playlist.lists], [5, "Une + 1 autre", 2]);
m.setPlaylist("h", { name: "Trois", source: "Liste", tracks: [t(6)], missing: 2 }, true);
eq("3e", [m.S.playlist.count, m.S.playlist.name, m.S.playlist.source, m.S.playlist.missing], [6, "Une + 2 autres", "Mélange", 2]);
m.setPlaylist("h", { name: "Seule", source: "Deezer", tracks: [t(9)] });
eq("remplacement", [m.S.playlist.count, m.S.playlist.name], [1, "Seule"]);
m.setPlaylist("h", null); eq("vidée", m.S.playlist, null);
const big = Array.from({ length: 1200 }, (_, i) => t(i));
m.setPlaylist("h", { name: "G", source: "Deezer", tracks: big }); eq("1200 morceaux gardés", m.S.playlist.count, 1200);
console.log(bad ? bad + " échec(s)" : "quit + playlists : tout est OK");
m.destroy(); e.destroy(); f.destroy(); g.destroy(); h.destroy(); solo.destroy();
process.exit(bad ? 1 : 0);
