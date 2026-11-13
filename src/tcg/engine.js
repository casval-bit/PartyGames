// Trône des Mondes : moteur de règles (module pur, exécuté chez le créateur du salon).
//
// Déroulé fidèle au Trône de Fer JCE 2e édition, adapté au téléphone :
//   mise en place (main de 7, mulligan, 8 or de cartes posées), puis chaque round :
//   Scénario → Pioche → Recrutement → Défis → Domination → Redressement → Taxe.
// Le premier joueur à atteindre l'objectif de Pouvoir (15 par défaut) gagne immédiatement.
//
// Le déroulé est écrit comme un générateur : chaque fois qu'un joueur doit choisir, le générateur « produit »
// une question (prompt). La classe Game attend la réponse (ou la calcule pour un bot) et relance le générateur.
// Les cartes ne sont jamais copiées : une instance = { u, id, o (propriétaire), c (contrôleur), k (agenouillée), pw, dup, att, host, z }.
import { CARD, FAMILY, subOf } from "./cards/index.js";
import { TYPES, TYPE_NAME, SETUP_GOLD, HAND_START, DEFAULT_GOAL, MAX_ROUNDS, plain } from "./rules.js";
import { botAnswer } from "./bot.js";

const OVER = new Error("partie terminée");
const KEEP_LOG = 140;

/* ================================ utilitaires ================================ */
function rnd(G) { // mulberry32, état gardé dans G (partie rejouable à l'identique avec la même graine)
  let t = (G.rs = (G.rs + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(G, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const def = (inst) => (inst ? CARD[inst.id] || null : null);
const FAM_DEF = (G, inst) => { const P = G.players.find((p) => p.id === inst.o); const f = FAMILY[P.fam]; return { type: "fam", name: f ? f.name : "Famille", traits: [], abs: famAbs(P), kw: {} }; };
function famAbs(P) {
  const f = FAMILY[P.fam];
  const out = f && f.abs ? [...f.abs] : [];
  const sub = subOf(P.fam, P.pt); // type Pokémon, région…
  if (sub) out.push(...sub.abs);
  return out;
}

/* ================================ création ================================ */
export function createGame({ players, goal = DEFAULT_GOAL, seed, maxRounds = MAX_ROUNDS }) {
  const G = {
    v: 1, rs: (seed >>> 0) || 1, goal, maxRounds, round: 0, phase: "setup", first: 0, turn: null,
    players: [], inst: {}, nextU: 1, mods: [], used: {}, ch: null, log: [], logN: 0,
    over: false, winner: null, rank: null, st: {}, prompt: null, seq: 0,
  };
  players.forEach((pl, i) => {
    const P = {
      id: pl.id, name: pl.name || "Joueur", bot: Boolean(pl.bot), idx: i, fam: pl.deck.fam, pt: pl.deck.pt || null, deckName: pl.deck.name || "",
      deck: [], hand: [], disc: [], dead: [], plots: [], used: [], plot: null, chars: [], locs: [],
      power: 0, gold: 0, limited: false, cheap: 0, done: { combat: 0, ruse: 0, influence: 0 }, fu: "F" + i,
    };
    for (const [id, n] of Object.entries(pl.deck.cards)) for (let k = 0; k < n; k++) if (CARD[id]) P.deck.push(mk(G, id, P.id, "deck"));
    for (const id of pl.deck.plots) if (CARD[id]) P.plots.push(mk(G, id, P.id, "plots"));
    G.inst[P.fu] = { u: P.fu, id: null, o: P.id, c: P.id, fam: true, k: false, z: "fam", dup: [], att: [] };
    G.players.push(P);
    G.st[P.id] = { won: { combat: 0, ruse: 0, influence: 0 }, lost: 0, kills: 0, deaths: 0, played: 0, dom: 0, unopp: 0, gained: 0, events: 0, saves: 0 };
  });
  return G;
}
function mk(G, id, owner, z) {
  const u = "c" + G.nextU++;
  const inst = { u, id, o: owner, c: owner, k: false, pw: 0, dup: [], att: [], host: null, z };
  G.inst[u] = inst;
  return inst;
}

/* ================================ l'API des effets ================================ */
export function makeApi(G) {
  const X = { G };
  const P = (id) => G.players.find((p) => p.id === id);
  X.player = P;
  X.inst = (u) => G.inst[u] || null;
  X.card = (inst) => (!inst ? null : inst.fam ? FAM_DEF(G, inst) : CARD[inst.id]);
  X.ctrl = (inst) => P(inst.c || inst.o);
  X.order = () => { const n = G.players.length; const out = []; for (let i = 0; i < n; i++) out.push(G.players[(G.first + i) % n]); return out; };
  X.opps = (p) => G.players.filter((q) => q !== p);
  X.chars = (p) => p.chars;
  X.allChars = () => G.players.flatMap((p) => p.chars);
  X.inPlay = (inst) => Boolean(inst) && (inst.z === "char" || inst.z === "loc" || inst.z === "att" || inst.z === "fam" || inst.z === "plot");
  X.isCurrentPlot = (inst) => inst.z === "plot";
  X.totalPower = (p) => p.power + p.chars.reduce((s, c) => s + c.pw, 0);
  X.isFirst = (p) => G.players[G.first] === p;
  X.isBehind = (p) => X.opps(p).some((o) => X.totalPower(o) > X.totalPower(p));
  X.cardHasTrait = (d, t) => Boolean(d && d.traitSet && d.traitSet.has(String(t).toLowerCase()));
  X.hasTrait = (inst, t) => X.cardHasTrait(X.card(inst), t);
  X.participants = () => (G.ch ? [...G.ch.atk, ...G.ch.dfd].map((u) => G.inst[u]).filter((c) => c && c.z === "char") : []);
  X.isAttacking = (inst) => Boolean(G.ch && G.ch.atk.includes(inst.u) && inst.z === "char");
  X.isDefending = (inst) => Boolean(G.ch && G.ch.dfd.includes(inst.u) && inst.z === "char");
  X.aloneInChallenge = (inst) => Boolean(G.ch && ((G.ch.atk.length === 1 && G.ch.atk[0] === inst.u) || (G.ch.dfd.length === 1 && G.ch.dfd[0] === inst.u)) && inst.z === "char");

  /* --- sources d'effets en jeu (pour les effets permanents) --- */
  X.sources = () => {
    const out = [];
    for (const p of G.players) {
      out.push(G.inst[p.fu]);
      for (const c of p.chars) { out.push(c); for (const a of c.att) out.push(a); }
      for (const l of p.locs) out.push(l);
      if (p.plot) out.push(p.plot);
    }
    return out;
  };
  X.abs = (inst) => (!inst ? [] : inst.fam ? famAbs(P(inst.o)) : (CARD[inst.id] && CARD[inst.id].abs) || []);
  const each = (hook, fn) => { for (const src of X.sources()) for (const ab of X.abs(src)) if (ab[hook]) fn(ab, src); };

  X.str = (inst) => {
    const d = X.card(inst);
    if (!d || d.type !== "char") return 0;
    let s = d.str || 0;
    each("str", (ab, src) => { s += ab.str(X, src, inst) || 0; });
    for (const m of G.mods) if (m.t === "str" && m.u === inst.u) s += m.n;
    return Math.max(0, s);
  };
  /** Force qu'aurait ce personnage s'il attaquait (role "atk") ou défendait ("dfd") — sert aux calculs des bots. */
  X.strAs = (inst, role, type = "combat") => {
    const saved = G.ch;
    G.ch = { type, atk: role === "atk" ? [inst.u, "_"] : [], dfd: role === "dfd" ? [inst.u, "_"] : [], att: role === "atk" ? inst.c : null, def: role === "dfd" ? inst.c : null, claimMod: 0, parts: [] };
    try { return X.str(inst); } finally { G.ch = saved; }
  };
  X.hasIcon = (inst, t) => {
    const d = X.card(inst);
    if (!d || d.type !== "char") return false;
    let add = 0, rem = 0;
    each("icon", (ab, src) => { const r = ab.icon(X, src, inst, t); if (r > 0) add++; else if (r < 0) rem++; });
    for (const m of G.mods) if (m.u === inst.u && m.ty === t) { if (m.t === "icon") add++; else if (m.t === "noicon") rem++; }
    return Boolean((d.icons && d.icons[t]) || add > 0) && rem === 0;
  };
  X.hasKw = (inst, k) => {
    const d = X.card(inst);
    if (!d) return false;
    if (d.kw && d.kw[k] !== undefined) return true;
    let yes = false;
    each("kw", (ab, src) => { if (!yes && ab.kw(X, src, inst, k)) yes = true; });
    return yes || G.mods.some((m) => m.t === "kw" && m.u === inst.u && m.k === k);
  };
  const anyHook = (hook, ...a) => { let yes = false; each(hook, (ab, src) => { if (!yes && ab[hook](X, src, ...a)) yes = true; }); return yes; };
  const sumHook = (hook, ...a) => { let n = 0; each(hook, (ab, src) => { n += ab[hook](X, src, ...a) || 0; }); return n; };
  X.noKneel = (inst, t) => anyHook("noKneel", inst, t);
  X.noStand = (inst) => anyHook("noStand", inst) || G.mods.some((m) => m.t === "nostand" && m.u === inst.u);
  X.noAttack = (inst) => anyHook("noAttack", inst) || G.mods.some((m) => m.t === "noatk" && m.u === inst.u);
  X.noDefend = (inst) => anyHook("noDefend", inst) || G.mods.some((m) => m.t === "nodef" && m.u === inst.u);
  /** Surcoût imposé par les adversaires (effets « taxe »). */
  X.taxOf = (p, d) => sumHook("tax", p, d);
  X.immune = (inst) => anyHook("immune", inst);
  /** Un événement adverse ne peut pas viser un personnage immunisé. */
  X.targetable = (inst, src) => !(src && X.card(src) && X.card(src).type === "evt" && src.o !== inst.c && X.immune(inst));
  X.income = (p) => (p.plot ? def(p.plot).inc : 0) + sumHook("income", p);
  X.reserve = (p) => (p.plot ? def(p.plot).res : 7) + sumHook("reserve", p);
  X.initiative = (p) => (p.plot ? def(p.plot).ini : 0);
  X.claimOf = (ch) => { const a = P(ch.att); return Math.max(0, (a.plot ? def(a.plot).clm : 1) + sumHook("claim", ch) + ch.claimMod); };
  X.maxCh = (p, t) => 1 + sumHook("extraCh", p, t);
  X.noCh = (t) => anyHook("noCh", t);
  X.domOf = (p) => p.chars.filter((c) => !c.k).reduce((s, c) => s + X.str(c), 0) + p.gold + sumHook("domi", p);
  X.domBonus = () => sumHook("domBonus");
  X.noDom = () => anyHook("noDom");
  X.unoppBonus = (p) => sumHook("unoppBonus", p);
  X.drawBonus = () => sumHook("drawBonus");

  /* --- journal --- */
  X.log = (t, o = {}) => { G.log.push({ n: ++G.logN, t, ...o }); if (G.log.length > KEEP_LOG) G.log.splice(0, G.log.length - KEEP_LOG); };
  X.name = (inst) => (inst ? X.card(inst).name : "?");

  /* --- déplacements de cartes --- */
  const detach = (inst) => {
    const owner = P(inst.o), cc = P(inst.c || inst.o);
    const rm = (arr) => { const i = arr.indexOf(inst); if (i >= 0) arr.splice(i, 1); };
    switch (inst.z) {
      case "deck": rm(owner.deck); break;
      case "hand": rm(owner.hand); break;
      case "disc": rm(owner.disc); break;
      case "dead": rm(owner.dead); break;
      case "char": rm(cc.chars); break;
      case "loc": rm(cc.locs); break;
      case "att": { const h = G.inst[inst.host]; if (h) rm(h.att); break; }
      case "dup": { const h = G.inst[inst.host]; if (h) rm(h.dup); break; }
      default:
    }
    inst.host = null;
  };
  const toPile = (inst, z) => {
    detach(inst);
    const owner = P(inst.o);
    inst.c = inst.o; inst.k = false; inst.pw = 0; inst.z = z;
    G.mods = G.mods.filter((m) => m.u !== inst.u);
    ({ hand: owner.hand, disc: owner.disc, dead: owner.dead, deck: owner.deck })[z].push(inst);
  };
  X.detach = detach;
  X.toPile = toPile;

  X.draw = (p, n) => {
    let got = 0;
    for (let i = 0; i < n; i++) { const c = p.deck.pop(); if (!c) break; c.z = "hand"; p.hand.push(c); got++; }
    if (n > 0 && got < n && !p.deckOut) { p.deckOut = true; X.log(`Le deck de ${p.name} est vide.`, { p: p.id }); }
    return got;
  };
  X.gainGold = (p, n) => { p.gold += n; };
  X.stealGold = (from, to, n) => { const k = Math.min(n, from.gold); from.gold -= k; to.gold += k; if (k) X.log(`${to.name} prend ${k} or à ${from.name}.`, { p: to.id }); };
  X.gainPower = (p, n, inst, src) => {
    if (n <= 0) return;
    if (inst && inst.z === "char") inst.pw += n; else p.power += n;
    G.st[p.id].gained += n;
    X.log(`${p.name} gagne ${n} Pouvoir${inst && inst.z === "char" ? ` (sur ${X.name(inst)})` : src ? ` (${X.name(src)})` : ""}.`, { p: p.id, ty: "power" });
    checkWin(G, X);
  };
  X.movePower = (from, to, n) => {
    const k = Math.min(n, from.power);
    if (k <= 0) return 0;
    from.power -= k; to.power += k; G.st[to.id].gained += k;
    X.log(`${to.name} prend ${k} Pouvoir à ${from.name}.`, { p: to.id, ty: "power" });
    checkWin(G, X);
    return k;
  };
  X.kneel = (inst) => { if (inst && !inst.k) inst.k = true; };
  X.stand = (inst) => { if (inst && inst.k) inst.k = false; };
  X.mod = (m) => G.mods.push(m);
  X.discardRandom = (p, n, src) => {
    const out = [];
    for (let i = 0; i < n && p.hand.length; i++) { const c = p.hand[Math.floor(rnd(G) * p.hand.length)]; toPile(c, "disc"); out.push(X.name(c)); }
    if (out.length) X.log(`${p.name} défausse ${out.join(", ")}${src ? ` (${X.name(src)})` : ""}.`, { p: p.id });
    return out.length;
  };
  X.discardTop = (p, n) => { for (let i = 0; i < n; i++) { const c = p.deck[p.deck.length - 1]; if (!c) break; toPile(c, "disc"); X.log(`${p.name} défausse ${X.name(c)} (dessus du deck).`, { p: p.id }); } };
  X.fromDiscardToHand = (p, u) => { const c = G.inst[u]; if (c && c.z === "disc" && c.o === p.id) { toPile(c, "hand"); X.log(`${p.name} reprend ${X.name(c)} en main.`, { p: p.id }); } };
  X.fromDeadToHand = (p, u) => { const c = G.inst[u]; if (c && c.z === "dead" && c.o === p.id) { toPile(c, "hand"); X.log(`${X.name(c)} revient dans la main de ${p.name}.`, { p: p.id }); } };
  X.canEnter = (p, inst) => { const d = X.card(inst); return !(d.uni && p.dead.some((x) => def(x).key === d.key)); };
  X.twin = (p, d) => (d.uni ? [...p.chars, ...p.locs].find((x) => def(x).key === d.key) : null);

  /* --- choix (générateurs) --- */
  X.choose = function* (p, o) {
    const cands = (o.cands || []).filter(Boolean);
    const min = Math.min(o.min ?? 1, cands.length), max = Math.min(o.max ?? 1, cands.length);
    if (!cands.length || max === 0) return [];
    if (min === cands.length && max === cands.length && !o.ask) return cands; // pas le choix
    const ans = yield ask(G, [p.id], { kind: "choose", title: o.title || "Choisir", cands, min, max, src: o.src || null, harm: Boolean(o.harm), zone: o.zone || null, lethal: o.lethal || null },
      (pid, a) => { const pick = Array.isArray(a && a.pick) ? [...new Set(a.pick)] : null; return pick && pick.length >= min && pick.length <= max && pick.every((x) => cands.includes(x)) ? pick : null; },
      () => cands.slice(0, min));
    return ans;
  };
  X.chooseOpp = function* (p, title, pred = () => true) {
    const pool = X.opps(p).filter(pred);
    if (!pool.length) return null;
    if (pool.length === 1) return pool[0];
    const ans = yield ask(G, [p.id], { kind: "option", title, opts: pool.map((o) => ({ id: o.id, label: o.name })) },
      (pid, a) => (a && pool.some((o) => o.id === a.pick) ? a.pick : null), () => pool[0].id);
    return P(ans);
  };
  X.search = function* (p, pred, depth, src) {
    const top = p.deck.slice(-depth);
    const pool = top.filter((c) => pred(X.card(c)));
    if (pool.length) {
      const [u] = yield* X.choose(p, { title: "Ajouter à votre main", cands: pool.map((c) => c.u), min: 0, max: 1, src: src && src.id, zone: "deck", ask: true });
      if (u) { const c = G.inst[u]; toPile(c, "hand"); X.log(`${p.name} ajoute une carte à sa main${src ? ` (${X.name(src)})` : ""}.`, { p: p.id }); }
    }
    shuffle(G, p.deck);
  };

  /* --- sorties de jeu --- */
  X.leavePlay = function* (inst, dest) {
    const owner = P(inst.o);
    for (const a of [...inst.att]) { const ad = def(a); toPile(a, ad.kw && ad.kw.terminal !== undefined ? "disc" : "hand"); }
    for (const d of [...inst.dup]) toPile(d, "disc");
    if (inst.pw > 0) X.log(`${inst.pw} Pouvoir de ${X.name(inst)} retourne à la réserve.`);
    toPile(inst, dest);
    void owner;
  };
  X.kill = function* (inst, src) {
    if (!inst || inst.z !== "char") return false;
    const p = X.ctrl(inst);
    const ev = { ev: "wouldDie", inst, p, saved: false, toHand: false, src };
    yield* interruptWindow(G, X, ev);
    if (inst.z !== "char") return false;
    if (ev.saved && !ev.toHand) { X.log(`${X.name(inst)} est sauvé.`, { p: p.id, ty: "save" }); G.st[p.id].saves++; return false; }
    if (ev.toHand) { yield* X.leavePlay(inst, "hand"); X.log(`${X.name(inst)} retourne dans la main de ${p.name} au lieu de mourir.`, { p: p.id, ty: "save" }); G.st[p.id].saves++; return false; }
    yield* X.leavePlay(inst, "dead");
    X.log(`${X.name(inst)} (${p.name}) ${(FAMILY[def(inst).fam] && FAMILY[def(inst).fam].killWord) || "est tué"}.`, { p: p.id, ty: "kill" });
    G.st[p.id].deaths++;
    const killer = src ? X.ctrl(src) : G.ch && G.ch.att !== p.id ? P(G.ch.att) : null;
    if (killer && killer !== p) G.st[killer.id].kills++;
    yield* fire(G, X, { ev: "killed", inst, p, src });
    return true;
  };
  X.sacrifice = function* (inst) { if (inst && X.inPlay(inst)) { const p = X.ctrl(inst); X.log(`${p.name} sacrifie ${X.name(inst)}.`, { p: p.id }); if (inst.z === "att") toPile(inst, "disc"); else yield* X.leavePlay(inst, "disc"); } };
  X.discardFromPlay = function* (inst) { if (inst && X.inPlay(inst)) { if (inst.z === "att") toPile(inst, "disc"); else yield* X.leavePlay(inst, "disc"); } };
  X.returnToHand = function* (inst) { if (inst && X.inPlay(inst)) { X.log(`${X.name(inst)} retourne dans la main de son propriétaire.`); if (inst.z === "att") toPile(inst, "hand"); else yield* X.leavePlay(inst, "hand"); } };

  /** Met en jeu un personnage ou un lieu (doublon s'il est unique et déjà en jeu). */
  X.putIntoPlay = function* (p, inst, from, o = {}) {
    const d = def(inst);
    const twin = X.twin(p, d);
    if (twin) { detach(inst); inst.z = "dup"; inst.host = twin.u; inst.c = p.id; twin.dup.push(inst); X.log(`${p.name} ajoute un doublon de ${d.name}.`, { p: p.id }); return; }
    detach(inst);
    inst.c = p.id; inst.k = Boolean(o.knelt); inst.pw = 0;
    if (d.type === "char") { inst.z = "char"; p.chars.push(inst); } else { inst.z = "loc"; p.locs.push(inst); }
    if (!o.quiet) X.log(`${p.name} met en jeu ${d.name}${from === "ambush" ? " (Embuscade)" : ""}.`, { p: p.id, c: inst.id });
    if (!o.setup) yield* fire(G, X, { ev: "enter", inst, p });
  };
  X.attach = function* (p, inst, host) {
    detach(inst);
    inst.z = "att"; inst.host = host.u; inst.c = p.id; inst.k = false;
    host.att.push(inst);
    X.log(`${p.name} attache ${X.name(inst)} à ${X.name(host)}.`, { p: p.id, c: inst.id });
    yield* fire(G, X, { ev: "enter", inst, p });
  };
  return X;
}

/* ================================ questions ================================ */
/** Fabrique une question : `check` valide une réponse (renvoie la réponse nettoyée, ou null), `dflt` en propose une sûre. */
function ask(G, who, data, check, dflt) {
  return { id: ++G.seq, who, ...data, check, dflt, multi: false };
}
function askAll(G, who, data, check, dflt) {
  return { id: ++G.seq, who, ...data, check, dflt, multi: true };
}

/* ================================ fin de partie ================================ */
function checkWin(G, X) {
  if (G.over) return;
  const best = G.players.map((p) => ({ p, v: X.totalPower(p) })).filter((x) => x.v >= G.goal).sort((a, b) => b.v - a.v)[0];
  if (best) { G.winner = best.p.id; X.log(`${best.p.name} atteint ${best.v} Pouvoir et remporte la partie !`, { p: best.p.id, ty: "win" }); throw OVER; }
}
function finish(G, X) {
  if (!G.winner) {
    const s = [...G.players].sort((a, b) => X.totalPower(b) - X.totalPower(a));
    G.winner = s[0].id;
    X.log(`Fin du dernier round : ${s[0].name} gagne avec le plus de Pouvoir.`, { ty: "win" });
  }
  G.over = true; G.phase = "end"; G.prompt = null; G.ch = null;
  G.rank = [...G.players].sort((a, b) => (b.id === G.winner) - (a.id === G.winner) || X.totalPower(b) - X.totalPower(a)).map((p) => p.id);
}

/* ================================ déclencheurs ================================ */
const usedKey = (src, i) => `${src.u}:${i}`;
const isUsed = (G, src, i) => G.used[usedKey(src, i)] === G.round;
const markUsed = (G, src, i) => { G.used[usedKey(src, i)] = G.round; };

/** Réactions après un événement : d'abord les automatiques (sans coût), puis les événements en main (on demande au joueur). */
function* fire(G, X, ev) {
  const order = X.order();
  const extra = ev.ev === "killed" && ev.inst ? [ev.inst] : [];
  const pool = [...X.sources(), ...extra];
  for (const p of order) {
    for (const src of pool) {
      if (X.ctrl(src) !== p) continue;
      const abs = X.abs(src);
      for (let i = 0; i < abs.length; i++) {
        const ab = abs[i];
        if (ab.kind !== "react" || ab.on !== ev.ev || !ab.auto || isUsed(G, src, i)) continue;
        if (src.z !== "char" && src.z !== "loc" && src.z !== "att" && src.z !== "fam" && src.z !== "plot" && !(ev.ev === "killed" && src === ev.inst)) continue;
        let ok = false;
        try { ok = ab.cond(X, src, ev); } catch { ok = false; }
        if (!ok) continue;
        markUsed(G, src, i);
        X.log(`${X.name(src)}${ab.name ? ` — ${ab.name}` : ""}.`, { p: p.id, ty: "ab", c: src.id || null });
        yield* ab.run(X, src, ev);
        if (G.over) return;
      }
    }
  }
  // événements « Réaction » en main
  for (const p of order) {
    let guard = 0;
    while (guard++ < 6) {
      const opts = p.hand.filter((c) => { const d = def(c); const ab = d.abs[0]; return d.type === "evt" && ab && ab.timing === "react" && ab.on === ev.ev && d.cost <= p.gold && safe(() => ab.cond(X, c, ev)); });
      if (!opts.length) break;
      const pick = yield ask(G, [p.id], { kind: "react", title: reactTitle(ev, X), opts: opts.map((c) => ({ u: c.u, id: c.id, cost: def(c).cost })) },
        (pid, a) => (a && a.pass ? "pass" : a && opts.some((c) => c.u === a.u) ? a.u : null), () => "pass");
      if (pick === "pass") break;
      const c = G.inst[pick];
      yield* playEvent(G, X, p, c, ev);
      if (G.over) return;
    }
  }
}
const safe = (fn) => { try { return Boolean(fn()); } catch { return false; } };
function reactTitle(ev, X) {
  switch (ev.ev) {
    case "win": return `${ev.p.name} gagne le défi : réagir ?`;
    case "lose": return "Défi perdu : réagir ?";
    case "killed": return `${X.name(ev.inst)} est tué : réagir ?`;
    case "dom": return "Domination : réagir ?";
    case "enter": return `${X.name(ev.inst)} entre en jeu : réagir ?`;
    default: return "Réagir ?";
  }
}
function* playEvent(G, X, p, c, ev) {
  const d = def(c);
  p.gold -= d.cost;
  c.z = "limbo";
  p.hand.splice(p.hand.indexOf(c), 1);
  X.log(`${p.name} joue ${d.name}.`, { p: p.id, ty: "evt", c: d.id });
  G.st[p.id].events++;
  try { yield* d.abs[0].run(X, c, ev); } finally { if (c.z === "limbo") { c.z = "disc"; p.disc.push(c); } }
}

/** Interruptions « devrait être tué » / « revendication » : le joueur concerné choisit s'il se sauve. */
function* interruptWindow(G, X, ev) {
  const p = ev.p || ev.target;
  let guard = 0;
  while (!ev.saved && !ev.cancel && guard++ < 4) {
    const opts = [];
    if (ev.ev === "wouldDie" && ev.inst.dup.length) opts.push({ k: "dup", u: ev.inst.u, label: "Défausser un doublon" });
    for (const src of X.sources()) {
      if (X.ctrl(src) !== p) continue;
      X.abs(src).forEach((ab, i) => {
        if (ab.kind === "interrupt" && ab.on === ev.ev && !isUsed(G, src, i) && safe(() => ab.cond(X, src, ev))) opts.push({ k: "ab", u: src.u, i, id: src.id || null, label: ab.name || X.name(src) });
      });
    }
    for (const c of p.hand) {
      const d = def(c); const ab = d.abs[0];
      if (d.type === "evt" && ab && ab.timing === "interrupt" && ab.on === ev.ev && d.cost <= p.gold && safe(() => ab.cond(X, c, ev))) opts.push({ k: "evt", u: c.u, id: c.id, cost: d.cost, label: d.name });
    }
    if (!opts.length) return;
    const title = ev.ev === "wouldDie" ? `${X.name(ev.inst)} va être tué : le sauver ?` : `La revendication s'applique contre vous : l'annuler ?`;
    const pick = yield ask(G, [p.id], { kind: "react", title, save: true, target: ev.inst ? ev.inst.u : null, opts: opts.map((o, j) => ({ ...o, j })) },
      (pid, a) => (a && a.pass ? "pass" : a && Number.isInteger(a.j) && opts[a.j] ? a.j : null), () => "pass");
    if (pick === "pass") return;
    const o = opts[pick];
    if (o.k === "dup") { const d = ev.inst.dup[0]; X.toPile(d, "disc"); ev.saved = true; X.log(`${p.name} défausse un doublon pour sauver ${X.name(ev.inst)}.`, { p: p.id, ty: "save" }); }
    else if (o.k === "ab") { const src = G.inst[o.u]; markUsed(G, src, o.i); X.log(`${X.name(src)}${X.abs(src)[o.i].name ? ` — ${X.abs(src)[o.i].name}` : ""}.`, { p: p.id, ty: "ab" }); yield* X.abs(src)[o.i].run(X, src, ev); }
    else if (o.k === "evt") yield* playEvent(G, X, p, G.inst[o.u], ev);
  }
}

/* ================================ coûts ================================ */
function costFor(G, X, p, inst) {
  const d = def(inst);
  let n = d.cost || 0;
  const use = [];
  if (d.type === "char") n += X.taxOf(p, d);
  if (d.type === "char" && p.cheap > 0) n -= p.cheap;
  if (d.type === "char") {
    for (const src of [...p.locs, ...p.chars]) {
      if (src.k || n <= 0) continue;
      for (const ab of X.abs(src)) if (ab.reducer && (!ab.reducer.trait || X.cardHasTrait(d, ab.reducer.trait))) { n -= ab.reducer.n; use.push(src); break; }
    }
  }
  return { n: Math.max(0, n), use, cheap: d.type === "char" && p.cheap > 0 };
}
function attachTargets(G, X, p, inst) {
  const d = def(inst);
  const hostile = d.abs.some((ab) => ab.hostile);
  const pool = hostile ? X.opps(p).flatMap((o) => o.chars) : p.chars;
  return pool.filter((c) => !X.hasKw(c, "sansobjet") && (!d.req || X.hasTrait(c, d.req)));
}

/* ================================ options proposées ================================ */
function marshalOpts(G, X, p) {
  const opts = [];
  for (const c of p.hand) {
    const d = def(c);
    if (d.type === "char" || d.type === "loc") {
      if (!X.canEnter(p, c)) continue;
      if (X.twin(p, d)) { opts.push({ k: "dup", u: c.u, cost: 0 }); continue; }
      if (d.kw.limite !== undefined && p.limited) continue;
      const cost = costFor(G, X, p, c);
      if (cost.n <= p.gold) opts.push({ k: "play", u: c.u, cost: cost.n });
    } else if (d.type === "obj") {
      if (d.kw.limite !== undefined && p.limited) continue;
      if (d.uni && X.allChars().some((h) => h.att.some((a) => a.c === p.id && def(a).key === d.key))) continue;
      if (d.cost <= p.gold && attachTargets(G, X, p, c).length) opts.push({ k: "play", u: c.u, cost: d.cost });
    } else if (d.type === "evt") {
      const ab = d.abs[0];
      if (ab && ab.timing === "action" && (ab.when === "marshal" || ab.when === "any") && d.cost <= p.gold && safe(() => ab.can(X, c))) opts.push({ k: "evt", u: c.u, cost: d.cost });
    }
  }
  pushActs(G, X, p, opts, ["marshal", "any"]);
  return opts;
}
function pushActs(G, X, p, opts, whens) {
  for (const src of X.sources()) {
    if (X.ctrl(src) !== p || src.z === "plot") continue;
    X.abs(src).forEach((ab, i) => {
      if (ab.kind === "action" && whens.includes(ab.when) && !isUsed(G, src, i) && safe(() => ab.can(X, src))) opts.push({ k: "act", u: src.u, i, id: src.id || null, name: ab.name || X.name(src) });
    });
  }
}
function challengeActOpts(G, X, p) {
  const opts = [];
  for (const c of p.hand) {
    const d = def(c);
    if (d.type === "evt") {
      const ab = d.abs[0];
      if (ab && ab.timing === "action" && (ab.when === "challenge" || ab.when === "any") && d.cost <= p.gold && safe(() => ab.can(X, c))) opts.push({ k: "evt", u: c.u, cost: d.cost });
    } else if (d.type === "char" && d.kw.embuscade !== undefined && X.canEnter(p, c) && !X.twin(p, d) && d.kw.embuscade <= p.gold) {
      opts.push({ k: "amb", u: c.u, cost: d.kw.embuscade });
    }
  }
  pushActs(G, X, p, opts, ["challenge", "any"]);
  return opts;
}
function attackers(G, X, p, t) {
  return p.chars.filter((c) => !c.k && X.hasIcon(c, t) && !X.noAttack(c));
}
function challengeTypes(G, X, p) {
  if (!X.opps(p).length) return [];
  return TYPES.filter((t) => !X.noCh(t) && p.done[t] < X.maxCh(p, t) && attackers(G, X, p, t).length > 0);
}

/* ================================ le déroulé ================================ */
function* flow(G, X) {
  yield* setupPhase(G, X);
  while (G.round < G.maxRounds) {
    G.round++;
    G.used = {};
    X.log(`— Round ${G.round} —`, { ty: "round" });
    for (const ph of ["plot", "draw", "marshal", "challenges", "dominance", "standing", "taxation"]) {
      G.phase = ph; G.turn = null;
      yield* PHASE_FN[ph](G, X);
      G.mods = G.mods.filter((m) => m.until !== "phase" && m.until !== "challenge");
    }
    G.mods = G.mods.filter((m) => m.until !== "round");
    for (const p of G.players) { p.limited = false; p.cheap = 0; p.done = { combat: 0, ruse: 0, influence: 0 }; }
  }
}

function* setupPhase(G, X) {
  G.phase = "setup";
  for (const p of G.players) { shuffle(G, p.deck); X.draw(p, HAND_START); }
  X.log("Mise en place : chacun pioche 7 cartes.", { ty: "round" });
  const ids = G.players.map((p) => p.id);
  const mull = yield askAll(G, ids, { kind: "mulligan", title: "Garder cette main ?" }, (pid, a) => (a && typeof a.keep === "boolean" ? a.keep : null), () => true);
  for (const p of G.players) {
    if (mull[p.id] === false) {
      for (const c of [...p.hand]) { c.z = "deck"; p.deck.push(c); }
      p.hand = [];
      shuffle(G, p.deck); X.draw(p, HAND_START);
      X.log(`${p.name} change sa main (mulligan).`, { p: p.id });
    }
  }
  const setupCheck = (p) => (pid, a) => {
    const pick = Array.isArray(a && a.pick) ? [...new Set(a.pick)] : null;
    if (!pick) return null;
    const cards = pick.map((u) => G.inst[u]);
    if (cards.some((c) => !c || c.z !== "hand" || c.o !== pid || !["char", "loc"].includes(def(c).type))) return null;
    let gold = 0, lim = 0; const keys = new Set();
    for (const c of cards) { const d = def(c); if (d.uni && keys.has(d.key)) continue; keys.add(d.key); gold += d.cost; if (d.kw.limite !== undefined) lim++; }
    return gold <= SETUP_GOLD && lim <= 1 ? pick : null;
  };
  const picks = yield askAll(G, ids, { kind: "setup", title: `Posez jusqu'à ${SETUP_GOLD} or de personnages et de lieux`, budget: SETUP_GOLD },
    (pid, a) => setupCheck(P(G, pid))(pid, a), () => []);
  for (const p of G.players) {
    const list = (picks[p.id] || []).map((u) => G.inst[u]).filter((c) => c && c.z === "hand");
    list.sort((a, b) => Number(Boolean(X.twin(p, def(a)))) - Number(Boolean(X.twin(p, def(b)))));
    for (const c of list) yield* X.putIntoPlay(p, c, "setup", { setup: true, quiet: true });
    if (list.length) X.log(`${p.name} pose ${list.map((c) => def(c).name).join(", ")}.`, { p: p.id });
    const n = HAND_START - p.hand.length;
    if (n > 0) X.draw(p, n);
  }
}
const P = (G, id) => G.players.find((p) => p.id === id);

const PHASE_FN = {
  *plot(G, X) {
    for (const p of G.players) if (!p.plots.length) { for (const c of p.used) { c.z = "plots"; p.plots.push(c); } p.used = []; }
    const ids = G.players.map((p) => p.id);
    const picks = yield askAll(G, ids, { kind: "plot", title: "Choisissez votre Scénario" },
      (pid, a) => (a && P(G, pid).plots.some((c) => c.u === a.pick) ? a.pick : null), (pid) => P(G, pid).plots[0].u);
    for (const p of G.players) {
      if (p.plot) { p.plot.z = "used"; p.used.push(p.plot); }
      const c = G.inst[picks[p.id]];
      p.plots.splice(p.plots.indexOf(c), 1);
      c.z = "plot"; p.plot = c;
      X.log(`${p.name} révèle « ${def(c).name} ».`, { p: p.id, ty: "plot", c: c.id });
    }
    // initiative : la plus haute ; égalité → le moins de Pouvoir ; puis au hasard
    const best = [...G.players].map((p) => ({ p, i: X.initiative(p), pw: X.totalPower(p), r: rnd(G) })).sort((a, b) => b.i - a.i || a.pw - b.pw || a.r - b.r)[0].p;
    X.log(`${best.name} a l'initiative.`, { p: best.id });
    const firstId = yield ask(G, [best.id], { kind: "first", title: "Qui sera premier joueur ?", cands: ids }, (pid, a) => (a && ids.includes(a.pick) ? a.pick : null), () => best.id);
    G.first = G.players.findIndex((p) => p.id === firstId);
    X.log(`${G.players[G.first].name} est premier joueur.`, { p: firstId });
    yield* fire(G, X, { ev: "first", p: G.players[G.first] });
    for (const p of X.order()) {
      const d = def(p.plot);
      for (const ab of d.abs) if (ab.reveal) { G.turn = p.id; yield* ab.reveal(X, p.plot); }
    }
    G.turn = null;
  },
  *draw(G, X) {
    const n = 2 + X.drawBonus();
    for (const p of X.order()) X.draw(p, n);
  },
  *marshal(G, X) {
    for (const p of X.order()) {
      G.turn = p.id;
      const inc = X.income(p);
      p.gold += inc;
      X.log(`${p.name} recrute avec ${p.gold} or.`, { p: p.id, ty: "phase" });
      let guard = 0;
      while (guard++ < 60) {
        const opts = marshalOpts(G, X, p);
        if (!opts.length) break;
        const pick = yield ask(G, [p.id], { kind: "marshal", title: `Recrutement — ${p.gold} or`, opts, gold: p.gold },
          (pid, a) => (a && a.pass ? "pass" : a ? opts.find((o) => o.k === a.k && o.u === a.u && (o.k !== "act" || o.i === a.i)) || null : null), () => "pass");
        if (pick === "pass") break;
        yield* doMarshal(G, X, p, pick);
      }
    }
    G.turn = null;
  },
  *challenges(G, X) {
    for (const p of X.order()) {
      G.turn = p.id;
      let guard = 0;
      while (guard++ < 12) {
        const types = challengeTypes(G, X, p);
        if (!types.length) break;
        const cands = Object.fromEntries(types.map((t) => [t, attackers(G, X, p, t).map((c) => c.u)]));
        const opps = X.opps(p).map((o) => o.id);
        const pick = yield ask(G, [p.id], { kind: "challenge", title: "Lancer un défi ?", types, cands, opps, done: { ...p.done } },
          (pid, a) => {
            if (a && a.pass) return "pass";
            if (!a || !types.includes(a.type)) return null;
            const def_ = opps.length === 1 ? opps[0] : a.def;
            if (!opps.includes(def_)) return null;
            const atk = Array.isArray(a.atk) ? [...new Set(a.atk)] : [];
            if (!atk.length || !atk.every((u) => cands[a.type].includes(u))) return null;
            return { type: a.type, def: def_, atk };
          }, () => "pass");
        if (pick === "pass") break;
        yield* runChallenge(G, X, p, pick);
      }
    }
    G.turn = null;
  },
  *dominance(G, X) {
    if (X.noDom()) { X.log("Pas de Domination ce round."); return; }
    const vals = G.players.map((p) => ({ p, v: X.domOf(p) })).sort((a, b) => b.v - a.v);
    X.log(`Domination : ${vals.map((x) => `${x.p.name} ${x.v}`).join(", ")}.`, { ty: "phase" });
    if (vals.length > 1 && vals[0].v === vals[1].v) { X.log("Égalité : personne ne gagne la Domination."); return; }
    if (vals[0].v <= 0) return;
    const w = vals[0].p;
    G.st[w.id].dom++;
    X.log(`${w.name} gagne la Domination.`, { p: w.id, ty: "dom" });
    X.gainPower(w, 1 + X.domBonus(), null);
    yield* fire(G, X, { ev: "dom", p: w });
  },
  *standing(G, X) {
    for (const p of G.players) {
      for (const c of [...p.chars, ...p.locs]) if (!X.noStand(c)) c.k = false;
      for (const c of p.chars) for (const a of c.att) a.k = false;
    }
  },
  *taxation(G, X) {
    for (const p of X.order()) {
      p.gold = 0;
      const res = X.reserve(p);
      const extra = p.hand.length - res;
      if (extra > 0) {
        const picks = yield* X.choose(p, { title: `Réserve ${res} : défaussez ${extra} carte${extra > 1 ? "s" : ""}`, cands: p.hand.map((c) => c.u), min: extra, max: extra, zone: "hand", ask: true });
        for (const u of picks) X.toPile(G.inst[u], "disc");
        X.log(`${p.name} défausse ${extra} carte${extra > 1 ? "s" : ""} (réserve).`, { p: p.id });
      }
    }
  },
};

/* ------------------------------ recrutement ------------------------------ */
function* doMarshal(G, X, p, o) {
  const c = G.inst[o.u];
  if (o.k === "act") return yield* useAction(G, X, p, o);
  if (o.k === "evt") return yield* playEvent(G, X, p, c, null);
  const d = def(c);
  if (o.k === "dup") { yield* X.putIntoPlay(p, c, "hand"); G.st[p.id].played++; return; }
  if (d.type === "obj") {
    const tg = attachTargets(G, X, p, c);
    const [u] = yield* X.choose(p, { title: `Attacher ${d.name} à…`, cands: tg.map((x) => x.u), min: 1, max: 1, src: d.id, ask: true });
    if (!u) return;
    p.gold -= d.cost;
    if (d.kw.limite !== undefined) p.limited = true;
    G.st[p.id].played++;
    yield* X.attach(p, c, G.inst[u]);
    return;
  }
  const cost = costFor(G, X, p, c);
  p.gold -= cost.n;
  for (const r of cost.use) X.kneel(r);
  if (cost.cheap) p.cheap = 0;
  if (d.kw.limite !== undefined) p.limited = true;
  G.st[p.id].played++;
  yield* X.putIntoPlay(p, c, "hand");
}
function* useAction(G, X, p, o) {
  const src = G.inst[o.u];
  const ab = X.abs(src)[o.i];
  if (!ab || !safe(() => ab.can(X, src))) return;
  markUsed(G, src, o.i);
  X.log(`${p.name} utilise ${X.name(src)}${ab.name ? ` — ${ab.name}` : ""}.`, { p: p.id, ty: "ab", c: src.id || null });
  yield* ab.run(X, src);
}

/* ------------------------------ fenêtres d'actions ------------------------------ */
function* actionWindow(G, X, label) {
  const ch = G.ch;
  const order = X.order();
  const start = order.findIndex((p) => p.id === ch.att);
  const seq = order.map((_, i) => order[(start + i) % order.length]).filter((p) => p.id === ch.att || p.id === ch.def || true);
  let passes = 0, i = 0, guard = 0;
  while (passes < seq.length && guard++ < 30) {
    const p = seq[i % seq.length];
    i++;
    const opts = challengeActOpts(G, X, p);
    if (!opts.length) { passes++; continue; }
    const pick = yield ask(G, [p.id], { kind: "action", title: label, opts, gold: p.gold },
      (pid, a) => (a && a.pass ? "pass" : a ? opts.find((o) => o.k === a.k && o.u === a.u && (o.k !== "act" || o.i === a.i)) || null : null), () => "pass");
    if (pick === "pass") { passes++; continue; }
    passes = 0;
    const c = G.inst[pick.u];
    if (pick.k === "evt") yield* playEvent(G, X, p, c, null);
    else if (pick.k === "act") yield* useAction(G, X, p, pick);
    else if (pick.k === "amb") { p.gold -= def(c).kw.embuscade; G.st[p.id].played++; yield* X.putIntoPlay(p, c, "ambush"); }
    if (G.over) return;
  }
}

/* ------------------------------ un défi ------------------------------ */
function* runChallenge(G, X, A, pick) {
  const D = P(G, pick.def);
  const t = pick.type;
  const ch = (G.ch = { type: t, att: A.id, def: D.id, atk: [...pick.atk], dfd: [], bypass: [], claimMod: 0, parts: [], winner: null, sa: 0, sd: 0, stage: "atk" });
  A.done[t]++;
  for (const u of ch.atk) { const c = G.inst[u]; if (!X.noKneel(c, t)) X.kneel(c); }
  X.log(`${A.name} lance un défi de ${TYPE_NAME[t]} contre ${D.name} avec ${ch.atk.map((u) => X.name(G.inst[u])).join(", ")}.`, { p: A.id, ty: "ch" });
  yield* fire(G, X, { ev: "atk", ch, p: A, defender: D });
  if (G.over) return;
  // Discret : chaque attaquant discret « contourne » un défenseur potentiel
  for (const u of ch.atk) {
    const c = G.inst[u];
    if (!c || c.z !== "char" || !X.hasKw(c, "discret")) continue;
    const pool = D.chars.filter((x) => !X.hasKw(x, "discret") && !ch.bypass.includes(x.u) && !x.k && X.hasIcon(x, t));
    if (!pool.length) continue;
    const [b] = yield* X.choose(A, { title: `Discret (${X.name(c)}) : qui ne pourra pas défendre ?`, cands: pool.map((x) => x.u), min: 1, max: 1, src: c.id });
    if (b) { ch.bypass.push(b); X.log(`${X.name(G.inst[b])} ne peut pas défendre (Discret).`, { p: A.id }); }
  }
  yield* actionWindow(G, X, "Attaquants déclarés : une action ?");
  if (G.over) return;
  // défenseurs
  ch.stage = "def";
  const dc = D.chars.filter((x) => !x.k && X.hasIcon(x, t) && !ch.bypass.includes(x.u) && !X.noDefend(x));
  const live = ch.atk.filter((u) => G.inst[u] && G.inst[u].z === "char");
  const duel = live.length === 1 && X.hasKw(G.inst[live[0]], "duel");
  if (dc.length) {
    const max = duel ? 1 : dc.length;
    const dfd = yield ask(G, [D.id], { kind: "defend", title: `Défendre contre ce défi de ${TYPE_NAME[t]} ?`, cands: dc.map((x) => x.u), max, duel },
      (pid, a) => { const l = Array.isArray(a && a.dfd) ? [...new Set(a.dfd)] : null; return l && l.length <= max && l.every((u) => dc.some((x) => x.u === u)) ? l : null; }, () => []);
    ch.dfd = dfd;
    for (const u of dfd) X.kneel(G.inst[u]);
    if (dfd.length) X.log(`${D.name} défend avec ${dfd.map((u) => X.name(G.inst[u])).join(", ")}.`, { p: D.id, ty: "ch" });
    else X.log(`${D.name} ne défend pas.`, { p: D.id });
  } else X.log(`${D.name} n'a personne pour défendre.`, { p: D.id });
  yield* fire(G, X, { ev: "def", ch, p: D });
  if (G.over) return;
  ch.stage = "act";
  yield* actionWindow(G, X, "Défenseurs déclarés : une action ?");
  if (G.over) return;
  // résolution
  ch.stage = "res";
  const atkL = ch.atk.map((u) => G.inst[u]).filter((c) => c && c.z === "char" && X.ctrl(c) === A);
  const dfdL = ch.dfd.map((u) => G.inst[u]).filter((c) => c && c.z === "char" && X.ctrl(c) === D);
  const sa = atkL.reduce((s, c) => s + X.str(c), 0), sd = dfdL.reduce((s, c) => s + X.str(c), 0);
  ch.sa = sa; ch.sd = sd;
  ch.parts = [...atkL, ...dfdL].map((c) => c.u);
  let W = null, L = null;
  if (sa >= sd && sa > 0) { W = A; L = D; } else if (sd > sa) { W = D; L = A; }
  if (!W) { X.log(`Défi de ${TYPE_NAME[t]} : ${sa} contre ${sd}, personne ne gagne.`, { ty: "ch" }); G.ch = null; return; }
  ch.winner = W.id;
  G.st[W.id].won[t]++; G.st[L.id].lost++;
  X.log(`${W.name} gagne le défi de ${TYPE_NAME[t]} (${sa} contre ${sd}).`, { p: W.id, ty: "chwin" });
  const winners = W === A ? atkL : dfdL;
  if (W === A && sd === 0) {
    G.st[A.id].unopp++;
    X.log("Défi sans opposition.", { p: A.id });
    X.gainPower(A, 1 + X.unoppBonus(A), null);
  }
  for (const c of winners) if (c.z === "char" && X.hasKw(c, "celebre")) X.gainPower(W, 1, c);
  if (W === A) {
    for (const c of atkL) {
      if (c.z !== "char") continue;
      if (X.hasKw(c, "intimidation")) {
        const diff = sa - sd;
        const pool = D.chars.filter((x) => !x.k && X.str(x) <= diff);
        if (pool.length) { const [u] = yield* X.choose(A, { title: `Intimidation (${X.name(c)}) : agenouiller…`, cands: pool.map((x) => x.u), min: 1, max: 1, src: c.id }); if (u) { X.kneel(G.inst[u]); X.log(`${X.name(G.inst[u])} est agenouillé (Intimidation).`); } }
      }
      if (X.hasKw(c, "genie")) { X.draw(A, 1); X.log(`${A.name} pioche 1 carte (Génie de ${X.name(c)}).`, { p: A.id }); }
      if (X.hasKw(c, "pillard")) X.discardTop(D, 1);
    }
    // revendication
    const n = X.claimOf(ch);
    const cev = { ev: "claim", ch, p: A, target: D, n, cancel: false };
    yield* interruptWindow(G, X, cev);
    if (cev.cancel) X.log("La revendication est annulée.", { ty: "save" });
    else if (n > 0) yield* applyClaim(G, X, A, D, t, n);
  }
  if (G.over) return;
  yield* fire(G, X, { ev: "win", ch, p: W, loser: L });
  if (G.over) return;
  yield* fire(G, X, { ev: "lose", ch, p: L, winner: W });
  G.mods = G.mods.filter((m) => m.until !== "challenge");
  G.ch = null;
}
function* applyClaim(G, X, A, D, t, n) {
  if (t === "combat") {
    const pool = D.chars;
    if (!pool.length) { X.log(`${D.name} n'a aucun personnage à perdre.`); return; }
    const k = Math.min(n, pool.length);
    const picks = yield* X.choose(D, { title: `Revendication Combat : choisissez ${k} personnage${k > 1 ? "s" : ""} à tuer`, cands: pool.map((c) => c.u), min: k, max: k, sacrifice: true });
    for (const u of picks) yield* X.kill(G.inst[u], null);
  } else if (t === "ruse") {
    const k = X.discardRandom(D, n, null);
    if (!k) X.log(`${D.name} n'a pas de carte en main.`);
  } else {
    const k = X.movePower(D, A, n);
    if (!k) X.log(`${D.name} n'a pas de Pouvoir à prendre.`);
  }
}

/* ================================ la partie ================================ */
export class Game {
  /** @param {{players:{id,name,bot,deck:{fam,pt,cards,plots,name}}[], goal?:number, seed?:number, autoBots?:boolean}} o */
  constructor(o) {
    this.G = createGame(o);
    this.X = makeApi(this.G);
    this.autoBots = o.autoBots !== false;
    this.wait = null;
    this.answers = {};
    this.it = flow(this.G, this.X);
    this.step(undefined);
  }
  P(id) { return this.G.players.find((p) => p.id === id); }
  step(val) {
    try {
      let r = this.it.next(val);
      while (!r.done) {
        const q = r.value;
        this.wait = q; this.answers = {};
        this.G.prompt = { id: q.id, kind: q.kind, who: q.who, title: q.title };
        if (this.autoBots) {
          for (const id of q.who) if (this.P(id).bot) this.answers[id] = this.botValue(id, q);
          if (q.who.every((id) => this.answers[id] !== undefined)) { const v = q.multi ? this.answers : this.answers[q.who[0]]; this.wait = null; r = this.it.next(v); continue; }
        }
        return;
      }
      finish(this.G, this.X);
      this.wait = null;
    } catch (e) {
      if (e === OVER) { finish(this.G, this.X); this.wait = null; return; }
      throw e;
    }
  }
  botValue(id, q) {
    let v = null;
    try { v = q.check(id, botAnswer(this.X, this.P(id), q)); } catch { v = null; }
    return v === null || v === undefined ? q.check(id, q.dflt(id)) ?? q.dflt(id) : v;
  }
  /** Réponse d'un joueur à la question en cours. Renvoie vrai si elle est acceptée. */
  answer(pid, a) {
    const q = this.wait;
    if (!q || this.G.over || !q.who.includes(pid) || this.answers[pid] !== undefined) return false;
    let v = null;
    try { v = q.check(pid, a); } catch { v = null; }
    if (v === null || v === undefined) return false;
    this.answers[pid] = v;
    if (q.who.every((id) => this.answers[id] !== undefined)) { const val = q.multi ? this.answers : v; this.wait = null; this.step(val); }
    return true;
  }
  /** Fait jouer l'ordinateur à la place d'un joueur (bot, ou joueur trop long à répondre). */
  auto(pid) {
    const q = this.wait;
    if (!q || this.G.over || !q.who.includes(pid) || this.answers[pid] !== undefined) return false;
    const v = this.botValue(pid, q);
    this.answers[pid] = v;
    if (q.who.every((id) => this.answers[id] !== undefined)) { const val = q.multi ? this.answers : v; this.wait = null; this.step(val); }
    return true;
  }
  /** Joueurs qui doivent encore répondre. */
  waitingFor() { const q = this.wait; return q ? q.who.filter((id) => this.answers[id] === undefined) : []; }
}

export { OVER, plain };
