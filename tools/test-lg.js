// Loup-garou (version Stranger Things) : compositions, parties complètes entre bots, et partie en réseau côté créateur.
// Lancer : node tools/test-lg.js
import { LgGame } from "../src/lg/engine.js";
import { ROLES, autoCompo, checkCompo, BOXES } from "../src/lg/roles.js";
import { publicView, privateView } from "../src/lg/view.js";
import { HostEngine } from "../src/net/hostEngine.js";
import { CARD } from "../src/tcg/cards/index.js";

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("ÉCHEC :", m); } else if (!process.argv.includes("--quiet")) console.log("ok    :", m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- rôles ---------------- */
ok(Object.values(ROLES).every((d) => d.name && d.st && d.power && ["village", "loups", "solo"].includes(d.camp) && BOXES.some((b) => b.id === d.box)), `${Object.keys(ROLES).length} rôles complets`);
ok(Object.values(ROLES).every((d) => !d.tcg || CARD[d.tcg]), "les illustrations des rôles existent dans le Trône des Mondes");
let compoOk = true;
for (let n = 4; n <= 18; n++) for (let k = 0; k < 20; k++) { const c = autoCompo(n, null); if (checkCompo(c, n).length) { compoOk = false; console.log(n, c, checkCompo(c, n)); } }
ok(compoOk, "compositions automatiques valides de 4 à 18 joueurs");
ok(checkCompo(["loup", "loup", "voyante"], 4).length > 0, "composition incomplète refusée");
ok(checkCompo(["voyante", "voyante", "villageois", "villageois"], 4).length > 0, "rôle unique en double refusé (et pas de créature)");
ok(autoCompo(8, ["villageois", "loup", "voyante", "sorciere", "chasseur"]).every((id) => ["villageois", "loup", "voyante", "sorciere", "chasseur"].includes(id)), "composition limitée aux rôles cochés");

/* ---------------- parties entre bots ---------------- */
function play(n, compo, seed) {
  const players = Array.from({ length: n }, (_, i) => ({ id: "p" + i, name: "Joueur" + i, bot: true }));
  const g = new LgGame({ players, compo, seed });
  let guard = 0;
  while (!g.G.over && g.wait && guard++ < 6000) {
    const w = g.wait;
    for (const id of g.waitingFor()) g.auto(id);
    if (g.wait === w && !g.G.over) { if (w.kind === "vote") g.mentalHint(); g.close(); }
  }
  return g;
}
let ended = 0, errors = 0, days = 0;
const seen = {};
const t0 = Date.now();
for (let i = 0; i < 300; i++) {
  const n = 4 + (i % 15);
  const compo = autoCompo(n, null);
  for (const r of compo) seen[r] = true;
  try { const g = play(n, compo, 7000 + i); if (g.G.over && g.G.winner) { ended++; days += g.G.day; } } catch (e) { errors++; if (errors < 3) console.log(e.stack); }
}
ok(errors === 0, "aucune erreur pendant 300 parties entre bots");
ok(ended === 300, `300 parties terminées (${(days / Math.max(1, ended)).toFixed(1)} jours en moyenne, ${Date.now() - t0} ms)`);
ok(Object.keys(ROLES).every((r) => seen[r]), "tous les rôles ont été tirés au moins une fois");

// rôles précis
{
  const all = ["loup", "gml", "infect", "bavard", "blanc", "voyante", "sorciere", "chasseur", "cupidon", "petitefille", "salvateur", "ancien", "idiot", "bouc", "juge", "chevalier", "montreur", "renard", "servante", "comedien", "corbeau", "mentaliste", "fossoyeur", "dictateur", "chaman", "noctambule", "chaperon"];
  let fine = 0;
  for (let s = 0; s < 60; s++) { try { const g = play(all.length, all, 900 + s); if (g.G.over) fine++; } catch (e) { console.log(e.stack); break; } }
  ok(fine === 60, "60 parties à 27 rôles différents terminées");
  const solo = ["loup", "loup", "flute", "ange", "sectaire", "mercenaire", "voleur", "villageois", "chienloup", "enfant", "soeur", "soeur", "frere", "frere", "frere", "villvill"];
  let fine2 = 0;
  for (let s = 0; s < 60; s++) { try { const g = play(14, solo, 300 + s); if (g.G.over) fine2++; } catch (e) { console.log(e.stack); break; } }
  ok(fine2 === 60, "60 parties avec solitaires, Voleur, Chien-loup, Enfant sauvage, Sœurs et Frères terminées");
}
// vues : rien ne fuit
{
  const g = new LgGame({ players: Array.from({ length: 8 }, (_, i) => ({ id: "p" + i, name: "J" + i })), compo: ["loup", "loup", "voyante", "sorciere", "chasseur", "cupidon", "villageois", "villageois"], seed: 5 });
  const pub = publicView(g);
  ok(pub.players.every((p) => p.role === null || p.role === "villvill"), "vue publique : aucun rôle visible au départ");
  const wolfId = g.G.players.find((p) => p.role === "loup").id;
  const vilId = g.G.players.find((p) => p.role === "villageois").id;
  ok(privateView(g, wolfId).role === "loup" && privateView(g, vilId).role === "villageois", "vue privée : son propre rôle");
  for (const id of g.waitingFor()) g.auto(id);
  // première nuit : chacun a une question (personne ne peut deviner qui agit)
  const asked = g.G.players.filter((p) => g.wait && g.wait.asks[p.id]).length;
  ok(asked === 8, "la nuit, tous les joueurs vivants ont une question");
  const pv = privateView(g, vilId);
  ok(!JSON.stringify(pv).includes('"loup"') || pv.role === "loup", "un habitant ne voit pas qui sont les créatures");
}

/* ---------------- en réseau, côté créateur ---------------- */
globalThis.LG_FAST = true;
async function net(withLeave) {
  const msgs = [];
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => msgs.push(m), fresh: async (t) => t });
  e.setSettings("h", { game: "loupgarou", lgPick: ["loup", "villageois"] });
  e.addPlayer({ id: "a", name: "Anna" });
  for (let i = 0; i < 5; i++) e.addBot();
  ok(e.capacity === 18, "Loup-garou : 18 joueurs au maximum");
  e.start("h");
  ok(e.S.phase === "lobby", "composition invalide : la partie ne démarre pas");
  e.setSettings("h", { lgPick: null, lgBoxes: ["base", "nl", "pers", "fan"] });
  e.start("h");
  ok(e.S.phase === "lg_play" && e.S.lg && e.S.lg.players.length === 7, "partie lancée à 7 (dont 5 bots)");
  const last = {};
  let steps = 0, left = false;
  while (e.S.phase === "lg_play" && steps++ < 6000) {
    for (const m of msgs.splice(0)) if (m.t === "lgp") last[m.to] = m.v;
    for (const id of ["h", "a"]) {
      const v = last[id];
      if (!v || !v.prompt || v.prompt.answered) continue;
      if (withLeave && id === "a" && !left && e.S.lg.day >= 1) { e.leave("a"); left = true; continue; }
      if (left && id === "a") continue;
      const q = v.prompt;
      let a = {};
      if (q.type === "pick") a = q.skip ? { skip: true } : { pick: q.opts.slice(0, q.min) };
      else if (q.type === "choice") a = { v: q.choices[0].v };
      else if (q.type === "debate") a = { v: "ready" };
      if (id === "h" && q.kind === "dream") e.lgChat("h", "day", "je dors");
      last[id] = { ...v, prompt: { ...q, answered: true } };
      e.lgAnswer(id, q.wid, a);
    }
    await sleep(2);
  }
  ok(e.S.phase === "lg_end" && e.S.lg.over && e.S.lg.winner, `partie terminée au jour ${e.S.lg.day} : ${e.S.lg.winner && e.S.lg.winner.title}${withLeave ? " (Anna est partie en route)" : ""}`);
  ok(e.S.lg.players.every((p) => p.role), "en fin de partie, tous les rôles sont révélés");
  ok(msgs.every((m) => m.t !== "lgp" || !e.S.players.some((p) => p.bot && p.id === m.to)), "aucune vue privée envoyée aux bots");
  e.backToLobby("h");
  ok(e.S.phase === "lobby" && !e.S.lg && !e.lgGame, "retour au lobby");
  e.destroy();
}
await net(false);
await net(true);

console.log(bad ? `${bad} ÉCHEC(S)` : "Loup-garou : tout est OK");
process.exit(bad ? 1 : 0);
