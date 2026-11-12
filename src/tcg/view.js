// Trône des Mondes : ce qui part sur le réseau.
//   publicView : ce que tout le monde voit (plateaux, scénarios révélés, Pouvoir, or, nombre de cartes en main…)
//   privateView : la main du joueur, ses scénarios restants et la question qui lui est posée.
import { TYPES } from "./rules.js";

const icons = (X, c) => TYPES.filter((t) => X.hasIcon(c, t)).map((t) => t[0].toUpperCase()).join("");
const KWS = ["celebre", "discret", "intimidation", "genie", "pillard", "duel"];
function instView(X, c) {
  const d = X.card(c);
  const v = { u: c.u, d: c.id, k: c.k ? 1 : 0 };
  if (c.pw) v.pw = c.pw;
  if (c.dup.length) v.dup = c.dup.length;
  if (c.att.length) v.att = c.att.map((a) => ({ u: a.u, d: a.id, o: a.o }));
  if (d.type === "char") {
    v.s = X.str(c);
    v.ic = icons(X, c);
    const kw = KWS.filter((k) => X.hasKw(c, k) && !(d.kw && d.kw[k] !== undefined));
    if (kw.length) v.kw = kw; // mots-clés gagnés en cours de partie
    if (c.k && X.noStand(c)) v.fz = 1; // gelé : ne se redressera pas
    if (X.G.mods.some((m) => m.u === c.u && (m.t === "noatk" || m.t === "nodef"))) v.sil = 1; // ne peut ni attaquer ni défendre
  }
  return v;
}

export function publicView(game) {
  const G = game.G, X = game.X;
  const ch = G.ch;
  const live = (l, who) => l.map((u) => X.inst(u)).filter((c) => c && c.z === "char" && c.c === who);
  return {
    v: 1, round: G.round, phase: G.phase, goal: G.goal, first: (G.players[G.first] || {}).id || null, turn: G.turn,
    over: G.over, winner: G.winner, rank: G.rank,
    prompt: G.prompt && !G.over ? { id: G.prompt.id, kind: G.prompt.kind, who: game.waitingFor(), title: G.prompt.title } : null,
    ch: ch ? {
      type: ch.type, att: ch.att, def: ch.def, atk: ch.atk, dfd: ch.dfd, bypass: ch.bypass, stage: ch.stage, winner: ch.winner,
      sa: live(ch.atk, ch.att).reduce((s, c) => s + X.str(c), 0), sd: live(ch.dfd, ch.def).reduce((s, c) => s + X.str(c), 0),
    } : null,
    players: G.players.map((p) => ({
      id: p.id, name: p.name, bot: p.bot, fam: p.fam, pt: p.pt, deck: p.deckName,
      power: X.totalPower(p), fp: p.power, gold: p.gold, hand: p.hand.length, left: p.deck.length, plotsLeft: p.plots.length,
      plot: p.plot ? p.plot.id : null, used: p.used.map((c) => c.id), disc: p.disc.map((c) => c.id), dead: p.dead.map((c) => c.id),
      chars: p.chars.map((c) => instView(X, c)), locs: p.locs.map((c) => instView(X, c)),
      res: X.reserve(p), inc: p.plot ? X.income(p) : 0,
    })),
    log: G.log.slice(-60),
    st: G.st,
  };
}

/** Données privées d'un joueur. `full` : inclure la question complète s'il doit répondre. */
export function privateView(game, pid) {
  const G = game.G, X = game.X;
  const p = G.players.find((x) => x.id === pid);
  if (!p) return null;
  const q = game.wait;
  let prompt = null;
  if (q && !G.over && game.waitingFor().includes(pid)) {
    const { check, dflt, who, multi, ...data } = q; // eslint-disable-line no-unused-vars
    prompt = JSON.parse(JSON.stringify(data));
    // cartes des choix qui ne sont visibles nulle part ailleurs (deck, défausse, main…)
    const us = new Set();
    for (const v of [data.cands, data.opts && data.opts.map((o) => o.u)].flat()) if (typeof v === "string" && X.inst(v)) us.add(v);
    if (data.cands && typeof data.cands === "object" && !Array.isArray(data.cands)) for (const l of Object.values(data.cands)) for (const u of l) us.add(u);
    prompt.cmap = Object.fromEntries([...us].map((u) => [u, X.inst(u).id]).filter(([, id]) => id));
  }
  return { hand: p.hand.map((c) => ({ u: c.u, d: c.id })), plots: p.plots.map((c) => ({ u: c.u, d: c.id })), prompt };
}
