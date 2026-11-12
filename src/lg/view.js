// Loup-garou : ce qui part sur le réseau.
//   publicView : ce que tout le monde voit (joueurs vivants ou morts, rôles révélés, votes du jour, journal…)
//   privateView : le rôle du joueur, ce qu'il sait, sa question en cours et ses discussions secrètes.
const countBy = (l) => l.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
// étapes dont on peut montrer qui doit encore répondre (rôles déjà publics) ; les autres restent secrètes
const PUBLIC_WAIT = new Set(["vote", "cap", "debate", "chasseur", "fossoyeur", "successor", "bouc", "tiebreak", "role"]);

export function publicView(g) {
  const G = g.G;
  const w = g.wait;
  const shown = (p) => (G.over ? p.shown || p.role : !p.alive || p.shown ? p.shown || p.role : null);
  return {
    v: 1, phase: G.phase, day: G.day, night: G.night, step: G.step, over: G.over, winner: G.winner, cap: G.cap, sect: G.sect,
    players: G.players.map((p) => {
      const r = shown(p);
      return {
        id: p.id, name: p.name, bot: p.bot, seat: p.seat, alive: p.alive, role: r, alias: r && p.alias && r === p.role ? p.alias : null, idiot: p.idiot,
        night: !p.alive ? Boolean(p.diedAtNight) : undefined,
        ...(G.over ? { camp: p.camp, lover: Boolean(G.lovers && G.lovers.includes(p.id)), charmed: p.charmed, infected: p.infected, win: G.winner && G.winner.ids.includes(p.id) } : {}),
      };
    }),
    compo: G.opts.show !== false ? countBy(G.compo) : null,
    wait: w ? { id: w.id, kind: w.kind, t: w.t, label: w.label, left: g.waitingFor().length, total: Object.keys(w.asks).length, who: PUBLIC_WAIT.has(w.kind) ? g.waitingFor() : null } : null,
    vote: G.vote ? { kind: G.vote.kind, votes: G.vote.votes, corbeau: G.vote.corbeau || null, final: G.vote.final || null } : null,
    debate: G.debate ? { ready: Object.values(G.debate.ready).filter(Boolean).length, total: g.alive().length } : null,
    morning: G.morning.map((m) => ({ id: m.id, night: m.night })),
    banVote: G.banVote,
    log: G.log.slice(-90),
    chat: G.chat.filter((m) => m.ch === "day").slice(-60),
  };
}

export function privateView(g, pid) {
  const G = g.G;
  const p = g.P(pid);
  if (!p) return null;
  const w = g.wait;
  let prompt = null;
  if (w && w.asks[pid]) {
    const { check, dflt, bot, live, ...data } = w.asks[pid]; // eslint-disable-line no-unused-vars
    prompt = { ...JSON.parse(JSON.stringify(data)), wid: w.id, answered: g.answers[pid] !== undefined, mine: g.answers[pid] === undefined ? null : JSON.parse(JSON.stringify(g.answers[pid])) };
  }
  const ch = g.channels(pid);
  const spy = p.role === "petitefille" && p.alive && !g.inPack(p) && w && w.kind === "wolves" && g.powered(p);
  let wolves = null;
  if (w && w.kind === "wolves" && G.wolfVotes) {
    if (g.inPack(p)) wolves = { votes: G.wolfVotes };
    else if (spy) wolves = { counts: countBy(Object.values(G.wolfVotes).filter(Boolean)) };
  }
  const chat = G.chat.filter((m) => m.ch !== "day" && ch.read.includes(m.ch)).slice(-80);
  if (spy) for (const m of G.chat) if (m.ch === "pack" && m.ni === G.night) chat.push({ ...m, from: null, spy: true });
  return {
    role: p.role, alias: p.alias, camp: p.camp, alive: p.alive, infected: p.infected, charmed: p.charmed, life: p.role === "ancien" ? p.life : undefined,
    lover: G.lovers && G.lovers.includes(pid) ? G.lovers.find((x) => x !== pid) || pid : null,
    family: p.role === "soeur" || p.role === "frere" ? G.players.filter((x) => x.role === p.role && x.id !== pid).map((x) => x.id) : [],
    pack: g.inPack(p) ? G.players.filter((x) => x.alive && g.inPack(x) && x.id !== pid).map((x) => x.id) : [],
    charmedList: p.charmed || p.role === "flute" ? G.players.filter((x) => x.charmed).map((x) => x.id) : [],
    pot: p.role === "sorciere" ? G.pot : null,
    comedien: p.role === "comedien" && G.comedien ? { cards: G.comedien.cards, used: G.comedien.used } : null,
    salvLast: p.role === "salvateur" ? G.salvLast : null,
    esModel: p.role === "enfant" ? G.esModel : null,
    merc: G.merc && G.merc.pid === pid ? G.merc.target : null,
    word: G.bavard && G.bavard.pid === pid ? { w: G.bavard.word, said: G.bavard.said } : null,
    renardOn: p.role === "renard" ? G.renardOn : null,
    noPowers: G.noPowers,
    clan: G.sect ? G.sect[pid] : null,
    know: G.know[pid] || {},
    notes: (G.notes[pid] || []).slice(-40),
    prompt, wolves, chat, write: ch.write,
  };
}
