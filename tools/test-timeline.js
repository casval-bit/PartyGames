// Frise musicale, côté moteur (sans réseau) : tours, placement, révélation, victoire, dates incertaines.
import { HostEngine } from "../src/net/hostEngine.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));

const YEARS = { 1: 1975, 2: 1983, 3: 1991, 4: 2002, 5: 2010, 6: 2013, 7: 2017, 8: 1947, 9: 1999, 10: 2005, 11: 1969, 12: 1987 };
const BASE_IDS = Object.keys(YEARS);
const track = (id, extra = {}) => ({ id: String(id), title: `Titre secret <${id}> - Remastered 2011`, artists: [`Artiste <${id}>`], preview: `https://cdns-preview-d.dzcdn.net/stream/c-${id}.mp3`, cover: "", ...extra });
const mk = ({ ids = BASE_IDS, unsure = [], goal = 3 } = {}) => {
  const events = [];
  const e = new HostEngine({
    roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => events.push(m), fresh: async (t) => t,
    dates: async (t) => (YEARS[t.id] ? { year: YEARS[t.id], confident: !unsure.includes(Number(t.id)) } : null),
  });
  e.addPlayer({ id: "a", name: "Anna" }); e.addPlayer({ id: "b", name: "Bob" }); e.addPlayer({ id: "c", name: "Cléo" });
  e.setSettings("h", { game: "timeline" });
  e.S.settings.tlGoal = goal;
  e.setPlaylist("h", { name: "Ma playlist", source: "Spotify", tracks: ids.map((i) => track(i)) });
  e.events = events;
  return e;
};
/** Meilleur emplacement pour la carte cachée (le moteur la connaît, pas l'interface). */
const goodSlot = (e) => { const line = e.S.tl.line[e.S.tl.turn.team]; const y = e.tlCard.year; const k = line.findIndex((c) => c.y > y); return k < 0 ? line.length : k; };
const badSlot = (e) => { const line = e.S.tl.line[e.S.tl.turn.team]; const y = e.tlCard.year; for (let i = 0; i <= line.length; i++) { const ok = (i === 0 || line[i - 1].y <= y) && (i === line.length || y <= line[i].y); if (!ok) return i; } return -1; };

// ---------- démarrage
let e = mk();
eq("le jeu frise est accepté", e.S.settings.game, "timeline");
eq("capacité = équipes × joueurs (pas de limite solo)", e.capacity, e.S.settings.teamCount * e.S.settings.perTeam);
const secretTitle = "Titre secret";
e.start("h"); await wait();
eq("phase de jeu", e.S.phase, "tl_play");
const teams = e.S.tl.teams;
eq("2 équipes", teams.length, 2);
eq("une carte de départ par équipe, année visible", teams.map((t) => e.S.tl.line[t].length), [1, 1]);
ok1: {
  const pub = JSON.stringify(e.publicState());
  const hidden = e.tlCard;
  eq("l'année et le titre de la carte en cours ne sont PAS dans l'état diffusé", [pub.includes(hidden.title), pub.includes(`Artiste <${hidden.id}>`), JSON.stringify(e.S.tl.cur).includes("year")], [false, false, false]);
  eq("l'état diffusé contient l'adresse de l'extrait", Boolean(e.S.tl.cur && e.S.tl.cur.url), true);
}
const t1 = { ...e.S.tl.turn };
const other = e.S.players.find((p) => p.id !== t1.pid && p.team === t1.team);
const intruder = e.S.players.find((p) => p.team !== t1.team);

// ---------- un autre joueur ne peut pas placer
const nBefore = e.S.tl.line[t1.team].length;
e.tlPlace(intruder.id, 0); eq("autre équipe : refusé", e.S.phase, "tl_play");
if (other) { e.tlPlace(other.id, 0); eq("coéquipier : refusé (seul le joueur du tour place)", e.S.phase, "tl_play"); }
e.tlPlace(t1.pid, 99); eq("emplacement hors frise : refusé", e.S.phase, "tl_play");
e.tlPlace(t1.pid, -1); eq("emplacement négatif : refusé", e.S.phase, "tl_play");
e.tlPlace(t1.pid, "0"); eq("emplacement non entier : refusé", e.S.phase, "tl_play");

// ---------- bien placé : la carte entre dans la frise, triée
const card1 = e.tlCard;
e.tlPlace(t1.pid, goodSlot(e));
eq("révélation", e.S.phase, "tl_reveal");
eq("bien placé", [e.S.tl.reveal.ok, e.S.tl.reveal.year, e.S.tl.reveal.team], [true, card1.year, t1.team]);
eq("la carte a rejoint la frise", e.S.tl.line[t1.team].length, nBefore + 1);
eq("frise triée", e.S.tl.line[t1.team].map((c) => c.y), [...e.S.tl.line[t1.team].map((c) => c.y)].sort((a, b) => a - b));
eq("le titre nettoyé est révélé (sans « Remastered »)", e.S.tl.reveal.title, `Titre secret <${card1.id}>`);
eq("la carte révélée n'est plus cachée", e.tlCard, null);

// ---------- tour suivant : l'autre équipe
e.tlAfterReveal(); await wait();
eq("tour de l'autre équipe", e.S.tl.turn.team !== t1.team, true);
eq("et phase de jeu", e.S.phase, "tl_play");

// ---------- mal placé : défaussée
const t2 = { ...e.S.tl.turn }; const n2 = e.S.tl.line[t2.team].length;
let bs = badSlot(e);
if (bs < 0) { // une frise d'une seule carte peut n'avoir aucun mauvais emplacement : on force un tour à égalité impossible
  console.log("(pas de mauvais emplacement possible ici, test sauté)");
} else {
  e.tlPlace(t2.pid, bs);
  eq("mal placé", [e.S.tl.reveal.ok, e.S.tl.line[t2.team].length], [false, n2]);
}
e.tlAfterReveal(); await wait();

// ---------- temps écoulé = ratage
const t3 = { ...e.S.tl.turn }; const n3 = e.S.tl.line[t3.team].length;
e.tlResolve(null, "time");
eq("temps écoulé : raté, rien ajouté", [e.S.tl.reveal.ok, e.S.tl.reveal.reason, e.S.tl.line[t3.team].length], [false, "time", n3]);
e.tlAfterReveal(); await wait();

// ---------- le joueur du tour part : tour perdu
const t4 = { ...e.S.tl.turn };
if (t4.pid !== "h") {
  e.leave(t4.pid);
  eq("joueur parti pendant son tour : raté", [e.S.phase, e.S.tl.reveal.ok, e.S.tl.reveal.reason], ["tl_reveal", false, "left"]);
  e.tlAfterReveal(); await wait();
}

// ---------- jusqu'à la victoire (objectif 3)
let guard = 0;
while (e.S.phase !== "tl_final" && guard++ < 40) {
  if (e.S.phase === "tl_play") { if (e.S.tl.loading) { await wait(); continue; } e.tlPlace(e.S.tl.turn.pid, goodSlot(e)); }
  else if (e.S.phase === "tl_reveal") { e.tlAfterReveal(); await wait(); }
}
eq("partie terminée", e.S.phase, "tl_final");
const w = e.S.tl.winner;
eq("une équipe gagne avec l'objectif atteint", [w !== null, e.S.tl.line[w].length >= 3, e.S.tl.ended || null], [true, true, null]);
eq("la frise gagnante est dans l'ordre", e.S.tl.line[w].map((c) => c.y), [...e.S.tl.line[w].map((c) => c.y)].sort((a, b) => a - b));
eq("statistiques de profil par joueur (tours, réussites)", Object.values(e.S.pstats).every((s) => (s.turns || 0) >= (s.hits || 0)), true);
// retour au lobby
e.backToLobby("h"); eq("retour au lobby, frise effacée", [e.S.phase, e.S.tl], ["lobby", null]);
e.destroy();

// ---------- égalité d'année : les deux côtés comptent
e = mk({ ids: [1, 1], goal: 10 }); // placeholder, remplacé juste dessous
e.destroy();
{
  const T = (id, y) => { YEARS[id] = y; return track(id); };
  const ev = new HostEngine({ roomId: "r", name: "T", host: { id: "h", name: "H" }, emit: () => {}, fresh: async (t) => t, dates: async (t) => ({ year: YEARS[t.id], confident: true }) });
  ev.setSettings("h", { game: "timeline" });
  YEARS[100] = 2000; YEARS[101] = 2000; YEARS[102] = 2000; // départ, puis deux cartes de la même année
  ev.setPlaylist("h", { name: "x", source: "Liste", tracks: [T(100, 2000), T(101, 2000), T(102, 2000)] });
  ev.start("h"); await wait();
  const team = ev.S.tl.turn.team;
  eq("égalité : même année, placée AVANT = juste", [ev.S.tl.line[team].length], [1]);
  ev.tlPlace("h", 0);
  eq("année identique acceptée avant", ev.S.tl.reveal.ok, true);
  ev.tlAfterReveal(); await wait(); // l'équipe d'en face n'existe pas : l'hôte rejoue
  if (ev.S.phase === "tl_play") { const L = ev.S.tl.line[ev.S.tl.turn.team]; ev.tlPlace("h", L.length); eq("année identique acceptée après", ev.S.tl.reveal.ok, true); }
  ev.destroy();
}

// ---------- dates incertaines : écartées par défaut, acceptées si on le demande
e = mk({ unsure: [1, 2, 3, 4, 5, 6] }); e.start("h"); await wait(60);
eq("incertaines écartées : la partie démarre avec les sûres", e.S.phase, "tl_play");
const used = [...e.S.tl.teams.flatMap((t) => e.S.tl.line[t].map((c) => Number(c.id))), Number(e.tlCard.id)];
eq("aucune carte à date incertaine n'est jouée", used.some((i) => [1, 2, 3, 4, 5, 6].includes(i)), false);
e.tlQueue = [track(1), track(2), track(10)]; e.tlSkipped = 0;
{ const c = await e.tlPickCard(); eq("tirage : les dates incertaines sont sautées, la sûre est prise", [c && c.id, c && c.uncertain, e.tlSkipped, e.S.tl.skipped], ["10", false, 2, 2]); }
e.destroy();
e = mk({ unsure: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }); e.S.settings.tlUncertain = true; e.start("h"); await wait(60);
eq("incertaines acceptées : la partie démarre", e.S.phase, "tl_play");
e.tlPlace(e.S.tl.turn.pid, 0);
eq("la révélation signale l'année incertaine", e.S.tl.reveal.uncertain, true);
e.destroy();

// ---------- pas assez de morceaux fiables : retour au lobby avec un message
e = mk({ ids: [1], goal: 3 }); e.start("h"); await wait(40);
eq("1 seul morceau pour 2 équipes : partie annulée", [e.S.phase, e.events.some((m) => m.t === "aborted")], ["lobby", true]);
e.destroy();
e = mk({ ids: [1, 2, 3] }); e.S.settings.tlUncertain = false; e.start("h"); await wait(40);
// 3 morceaux : 2 cartes de départ + 1 tour, puis plus rien -> fin « plus de morceaux »
if (e.S.phase === "tl_play") { e.tlPlace(e.S.tl.turn.pid, goodSlot(e)); e.tlAfterReveal(); await wait(); }
eq("paquet épuisé : fin de partie", e.S.phase, "tl_final");
eq("fin par épuisement du paquet", e.S.tl.ended, "deck");
e.destroy();

// ---------- messages réseau : champ « slot » filtré
e = mk(); e.start("h"); await wait();
while (e.S.tl.turn.pid === "h") { e.tlResolve(null, "time"); e.tlAfterReveal(); await wait(); } // les messages réseau ne viennent jamais du créateur
const pid = e.S.tl.turn.pid, nb = e.S.tl.line[e.S.tl.turn.team].length;
for (const slot of ["0", 1.5, -2, 9999, null, {}]) e.receive({ t: "place", from: pid, slot });
await wait(40);
eq("messages « place » invalides ignorés", [e.S.phase, e.S.tl.line[e.S.tl.turn.team].length], ["tl_play", nb]);
e.receive({ t: "place", from: pid, slot: 0 }); await wait(40);
eq("message « place » valide pris en compte", e.S.phase, "tl_reveal");
// vote pour quitter en pleine frise
e.quitVote("a", "start"); e.quitVote("b", "yes"); e.quitVote("c", "yes");
eq("vote pour quitter : retour au lobby", [e.S.phase, e.S.tl], ["lobby", null]);
e.destroy();

// ---------- réglages
e = mk();
e.setSettings("h", { tlGoal: 15 }); eq("objectif 15", e.S.settings.tlGoal, 15);
e.setSettings("h", { tlGoal: 7 }); eq("objectif invalide refusé", e.S.settings.tlGoal, 15);
e.setSettings("h", { tlGoal: 20 }); eq("objectif 20", e.S.settings.tlGoal, 20);
e.setSettings("a", { tlGoal: 10 }); eq("seul le créateur règle", e.S.settings.tlGoal, 20);
e.setSettings("h", { tlAudio: "host", tlUncertain: true }); eq("son + incertaines", [e.S.settings.tlAudio, e.S.settings.tlUncertain], ["host", true]);
e.setSettings("h", { tlAudio: "n'importe quoi", tlUncertain: "oui" }); eq("valeurs invalides ignorées", [e.S.settings.tlAudio, e.S.settings.tlUncertain], ["host", true]);
e.destroy();
// départ sans playlist : refusé
{
  const x = new HostEngine({ roomId: "r", name: "T", host: { id: "h", name: "H" }, emit: () => {}, fresh: async (t) => t });
  x.setSettings("h", { game: "timeline" }); x.start("h"); eq("sans playlist : on reste au lobby", x.S.phase, "lobby"); x.destroy();
}
console.log(bad ? bad + " échec(s)" : "frise : tout est OK");
process.exit(bad ? 1 : 0);
