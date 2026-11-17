// Trône des Mondes côté créateur du salon : lobby (decks), partie complète avec un bot, réponses réseau, départ d'un joueur.
import { HostEngine } from "../src/net/hostEngine.js";
import { starters } from "../src/tcg/deck.js";
globalThis.TRONE_FAST = true;
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const st = starters();

/** Réponse « au plus simple » d'un joueur, à partir de sa vue privée (comme le ferait l'interface). */
function simple(q, v) {
  switch (q.kind) {
    case "mulligan": return { keep: true };
    case "setup": return { pick: [] };
    case "plot": return { pick: v.plots[0].u };
    case "first": return { pick: q.cands[0] };
    case "choose": return { pick: q.cands.slice(0, q.min) };
    case "option": return { pick: q.opts[0].id };
    case "defend": return { dfd: [] };
    case "challenge": { const t = q.types[0]; return { type: t, def: q.opps[0], atk: [q.cands[t][0]] }; }
    default: return { pass: true };
  }
}

async function run(withLeave) {
  const msgs = [];
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => msgs.push(m), fresh: async (t) => t });
  e.addPlayer({ id: "a", name: "Anna" });
  e.addBot();
  e.setSettings("h", { game: "trone", agTimer: 0, agGoal: 10 });
  ok(e.capacity === 4, "Trône : 4 joueurs au maximum");
  e.start("h");
  ok(e.S.phase === "lobby", "sans deck, la partie ne démarre pas");
  e.agSetDeck("h", { ...st[0], cards: { ...st[0].cards, x: 1 } });
  ok(!e.agDecks.h, "deck invalide refusé");
  e.agSetDeck("h", st[0]); e.agSetDeck("a", st[5]);
  ok(e.S.players.find((p) => p.id === "h").agDeck.name === st[0].name, "le lobby affiche le deck choisi");
  e.start("h");
  ok(e.S.phase === "ag_play" && e.S.ag && e.S.ag.players.length === 3, "partie lancée à 3 (dont un bot)");
  const last = {};
  let steps = 0, left = false;
  while (e.S.phase === "ag_play" && steps++ < 4000) {
    for (const m of msgs.splice(0)) if (m.t === "agp") last[m.to] = m.v;
    for (const id of ["h", "a"]) {
      const v = last[id];
      if (!v || !v.prompt) continue;
      if (withLeave && id === "a" && !left && e.S.ag.round >= 2) { e.leave("a"); left = true; continue; }
      if (left && id === "a") continue;
      const q = v.prompt;
      last[id] = { ...v, prompt: null };
      e.agAnswer(id, q.id, simple(q, v));
    }
    await sleep(3);
  }
  ok(e.S.phase === "ag_end" && e.S.ag.over && e.S.ag.winner, `partie terminée (${e.S.ag.round} rounds)${withLeave ? " malgré le départ d'Anna" : ""}`);
  if (withLeave) ok(left && !e.player("a"), "Anna est partie, l'ordinateur a fini pour elle");
  ok(msgs.every((m) => m.t !== "agp" || m.to !== e.S.players.find((p) => p.bot).id), "aucune vue privée envoyée aux bots");
  e.backToLobby("h");
  ok(e.S.phase === "lobby" && !e.S.ag && !e.agGame, "retour au lobby");
  e.destroy();
}
await run(false);
await run(true);
// réponses réseau nettoyées
{
  const e = new HostEngine({ roomId: "r", name: "T", host: { id: "h", name: "Hôte" }, emit: () => {}, fresh: async (t) => t });
  e.addBot(); e.setSettings("h", { game: "trone", agTimer: 0 }); e.agSetDeck("h", st[1]); e.start("h");
  const id = e.agGame.wait.id;
  e.agAnswer("h", id + 5, { keep: true });
  ok(e.agGame.wait && e.agGame.wait.id === id, "réponse à une ancienne question ignorée");
  e.agAnswer("h", id, { keep: "oui", evil: { x: 1 } });
  ok(e.agGame.wait.id === id, "réponse mal formée ignorée");
  e.agAnswer("h", id, { keep: true });
  ok(e.agGame.answers.h === true, "bonne réponse acceptée");
  e.destroy();
}
// salon de Heavy is the Crown (appli du jeu seul) : jeu verrouillé, apparence des joueurs (photo, cadre, bannière, code ami)
{
  const look = { av: "dc-superman-7", fr: "or", bn: "conquerant", lv: 12, fc: "AB3DF9KM" };
  const e = new HostEngine({ roomId: "ABC234", name: "T", host: { id: "h", name: "Hôte", tl: look }, emit: () => {}, fresh: async (t) => t, settings: { game: "trone", tcg: true, agGoal: 10 } });
  ok(e.S.settings.game === "trone" && e.S.settings.tcg && e.S.settings.agGoal === 10, "salon du jeu de cartes : réglages de départ");
  e.setSettings("h", { game: "timesup" });
  ok(e.S.settings.game === "trone", "salon du jeu de cartes : le jeu ne change pas");
  ok(JSON.stringify(e.player("h").tl) === JSON.stringify(look), "l'apparence du créateur est dans l'état du salon");
  e.addPlayer({ id: "a", name: "Anna", tl: { av: "onepiece-coby-1", fr: "faux", bn: "<script>", lv: 9999, fc: "x", evil: 1 } });
  const ta = e.player("a").tl;
  ok(ta.av === null && ta.fr === "bronze" && ta.bn === "heraut" && ta.lv === 200 && ta.fc === null && !("evil" in ta), "apparence reçue nettoyée (photo = carte 7 seulement, cadre et bannière connus)");
  e.setTcgLook("a", { av: "marvel-thor-7", fr: "argent", bn: "aube", lv: 3 });
  ok(e.player("a").tl.av === "marvel-thor-7" && e.player("a").tl.bn === "aube", "changement d'apparence dans le lobby");
  e.addBot();
  const bot = e.S.players.find((p) => p.bot);
  ok(bot.tl && bot.tl.av && bot.tl.bn, "un bot a une photo et une bannière dans le lobby");
  e.destroy();
  const f = new HostEngine({ roomId: "r2", name: "T", host: { id: "h", name: "Hôte" }, emit: () => {}, fresh: async (t) => t, settings: { game: "timesup", tcg: true } });
  ok(!f.S.settings.tcg, "le verrou du jeu de cartes ne vaut que pour une partie du jeu de cartes");
  f.destroy();
}
console.log(bad ? `${bad} ÉCHEC(S)` : "Trône (salon) : tout est OK");
process.exit(bad ? 1 : 0);
