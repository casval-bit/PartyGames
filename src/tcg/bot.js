// Trône des Mondes : l'ordinateur. Répond à n'importe quelle question du moteur avec des règles simples
// (attaquer quand on peut gagner, défendre quand ça vaut le coup, recruter ce qui rapporte le plus…).
// Sert pour les bots, pour les simulations d'équilibrage et quand un joueur met trop longtemps à répondre.
import { TYPES } from "./rules.js";

const KW_VAL = { celebre: 1.2, discret: 0.6, intimidation: 0.5, genie: 0.7, pillard: 0.4, duel: 0.3, embuscade: 0.3 };

/** Valeur approximative d'une carte (pour choisir quoi jouer, quoi défausser, quoi sacrifier). */
export function cardValue(d) {
  if (!d) return 0;
  if (d.type === "char") {
    const icons = TYPES.filter((t) => d.icons && d.icons[t]).length;
    let v = (d.str || 0) + icons * 0.9 + (d.abs || []).length * 0.9;
    for (const k of Object.keys(d.kw || {})) v += KW_VAL[k] || 0;
    return v;
  }
  if (d.type === "loc") return 1.5 + (d.abs || []).reduce((s, ab) => s + (ab.tpl === "income" ? 2.2 * (+ab.args[0] || 1) : 1), 0);
  if (d.type === "obj") return 2;
  if (d.type === "evt") return 1.6;
  return 1;
}
const instVal = (X, c) => (X.card(c).type === "char" ? X.str(c) + cardValue(X.card(c)) * 0.6 + c.pw * 1.5 + c.att.length : cardValue(X.card(c)));

export function botAnswer(X, P, q) {
  const G = X.G;
  const C = (u) => X.inst(u);
  const D = (u) => X.card(C(u));
  switch (q.kind) {
    case "mulligan": {
      const cheap = P.hand.filter((c) => X.card(c).type === "char" && X.card(c).cost <= 4).length;
      return { keep: cheap >= 2 };
    }
    case "setup": {
      const pool = P.hand.filter((c) => ["char", "loc"].includes(X.card(c).type));
      pool.sort((a, b) => cardValue(X.card(b)) / Math.max(1, X.card(b).cost) - cardValue(X.card(a)) / Math.max(1, X.card(a).cost) || X.card(b).cost - X.card(a).cost);
      const out = []; let gold = 0, lim = 0; const keys = new Set();
      for (const c of pool) {
        const d = X.card(c);
        if (d.uni && keys.has(d.key)) { out.push(c.u); continue; } // doublon gratuit
        if (gold + d.cost > q.budget) continue;
        if (d.kw.limite !== undefined && lim >= 1) continue;
        if (d.type === "loc" && out.length === 0 && pool.some((x) => X.card(x).type === "char" && X.card(x).cost <= q.budget - gold)) continue;
        out.push(c.u); gold += d.cost; keys.add(d.key); if (d.kw.limite !== undefined) lim++;
      }
      return { pick: out };
    }
    case "plot": {
      const handCost = P.hand.filter((c) => ["char", "loc", "obj"].includes(X.card(c).type)).reduce((s, c) => s + X.card(c).cost, 0);
      const myStr = P.chars.reduce((s, c) => s + X.str(c), 0);
      const oppStr = Math.max(0, ...X.opps(P).map((o) => o.chars.reduce((s, c) => s + X.str(c), 0)));
      const best = P.plots.map((c) => {
        const d = X.card(c);
        let v = Math.min(d.inc, handCost + 1) * 1.0 + d.ini * 0.12 + d.clm * (myStr > oppStr ? 1.6 : 0.7) + d.res * 0.1;
        for (const ab of d.abs) {
          if (ab.tpl === "plDraw" || ab.tpl === "plEachDraw") v += 1.2 * (+ab.args[0] || 1);
          if (ab.tpl === "plKillEach") v += P.chars.length > (X.opps(P)[0] || P).chars.length ? 1.5 : -2;
          if (ab.tpl === "plKillWeak") v += 0.5;
          if (ab.tpl === "plCatchUp") v += X.isBehind(P) ? 2 : -0.5;
          if (ab.tpl === "plSearch" || ab.tpl === "plRecall") v += 1;
        }
        return { c, v: v + Math.random() * 1.2 };
      }).sort((a, b) => b.v - a.v)[0];
      return { pick: best.c.u };
    }
    case "first": {
      const mine = P.chars.reduce((a, c) => a + X.str(c), 0);
      const best = X.opps(P).map((o) => ({ o, v: o.chars.reduce((a, c) => a + X.str(c), 0) })).sort((a, b) => b.v - a.v)[0];
      return { pick: !best || mine >= best.v * 0.9 ? P.id : best.o.id };
    }
    case "marshal": return marshal(X, P, q);
    case "challenge": return challenge(X, P, q);
    case "defend": return defend(X, P, q);
    case "action": return action(X, P, q);
    case "react": {
      if (q.save) {
        const dup = q.opts.find((o) => o.k === "dup");
        if (dup) return { j: dup.j };
        const ab = q.opts.find((o) => o.k === "ab");
        if (ab) return { j: ab.j };
        const ev = q.opts.find((o) => o.k === "evt");
        if (ev) {
          const t = C(q.target);
          if (!t || X.card(t).cost >= 3 || q.title.includes("revendication")) return { j: ev.j };
        }
        return { pass: true };
      }
      return q.opts.length ? { u: q.opts[0].u } : { pass: true };
    }
    case "choose": return { pick: choose(X, P, q) };
    case "option": {
      const best = [...q.opts].sort((a, b) => X.totalPower(X.player(b.id) || P) - X.totalPower(X.player(a.id) || P))[0];
      return { pick: (best || q.opts[0]).id };
    }
    default: return q.dflt ? q.dflt(P.id) : null;
  }
  void G; void D;
}

function marshal(X, P, q) {
  const C = (u) => X.inst(u);
  const dup = q.opts.find((o) => o.k === "dup");
  if (dup) return dup;
  const evGold = q.opts.find((o) => o.k === "evt" && X.card(C(o.u)).abs[0].tpl === "evGold");
  if (evGold) return evGold;
  const holdFor = Math.min(2, ...P.hand.filter((c) => X.card(c).type === "evt" && X.card(c).abs[0].timing !== "action" || (X.card(c).type === "evt" && X.card(c).abs[0].when === "challenge")).map((c) => X.card(c).cost).concat([9]));
  const scored = q.opts.filter((o) => o.k === "play").map((o) => {
    const d = X.card(C(o.u));
    let v = cardValue(d);
    if (d.type === "char") v += P.chars.length < 4 ? 3 : 1;
    if (d.type === "loc") v += X.G.round <= 2 ? 1.5 : 0;
    if (d.type === "obj") v += P.chars.length >= 2 ? 0.5 : -2;
    return { o, v: v + d.cost * 0.8 };
  }).filter((x) => x.v > 0);
  const actDraw = q.opts.find((o) => o.k === "act" && /Draw|Gold/.test(X.abs(C(o.u))[o.i].tpl));
  if (actDraw) return actDraw;
  if (!scored.length) return { pass: true };
  scored.sort((a, b) => b.v - a.v);
  const top = scored.find((x) => P.gold - x.o.cost >= (holdFor < 9 ? holdFor : 0)) || (P.gold >= 4 ? scored[0] : null);
  return top ? top.o : { pass: true };
}

function oppDefense(X, D, t, bypassPower = 0) {
  const list = D.chars.filter((c) => !c.k && X.hasIcon(c, t) && !X.noDefend(c)).map((c) => X.strAs(c, "dfd", t)).sort((a, b) => b - a);
  let tot = list.reduce((s, v) => s + v, 0);
  for (let i = 0; i < bypassPower && i < list.length; i++) tot -= list[i];
  return tot;
}
/** Adversaires qui lanceront encore leurs défis après moi pendant cette phase (mes personnages debout leur servent de défense). */
function laterOpps(X, P) {
  const order = X.order();
  const me = order.indexOf(P);
  return X.G.phase === "challenges" ? order.slice(me + 1).filter((o) => o !== P) : [];
}
const standingStr = (X, p) => p.chars.filter((c) => !c.k).reduce((s, c) => s + X.str(c), 0);
function challenge(X, P, q) {
  const C = (u) => X.inst(u);
  const opps = q.opps.map((id) => X.player(id));
  const later = laterOpps(X, P);
  const threat = later.length ? Math.max(...later.map((o) => standingStr(X, o))) : 0;
  const plans = [];
  for (const t of q.types) {
    const A = (c) => X.strAs(c, "atk", t);
    const mine = q.cands[t].map(C).sort((a, b) => A(b) - A(a));
    for (const D of opps) {
      let pick = [], sum = 0, def = oppDefense(X, D, t, 0);
      if (def === 0) {
        // personne pour défendre : le plus petit attaquant suffit (sans opposition)
        const small = [...mine].sort((a, b) => A(a) - A(b) || (a.pw - b.pw))[0];
        pick = [small.u]; sum = A(small);
      } else {
        // la plus petite équipe qui égale la meilleure défense possible (l'attaquant gagne les égalités)
        for (const c of mine) {
          if (sum >= def && pick.length) break;
          pick.push(c.u); sum += A(c);
          def = oppDefense(X, D, t, pick.filter((u) => X.hasKw(C(u), "discret")).length);
        }
        if (sum < def) continue;
        // retire les attaquants en trop (du plus faible au plus fort) tant que ça suffit encore
        for (const u of [...pick].reverse()) {
          if (pick.length <= 1) break;
          const rest = pick.filter((x) => x !== u);
          const s2 = rest.reduce((a, x) => a + A(C(x)), 0);
          const d2 = oppDefense(X, D, t, rest.filter((x) => X.hasKw(C(x), "discret")).length);
          if (s2 >= d2) { pick = rest; sum = s2; def = d2; }
        }
      }
      if (sum === 0) continue;
      let gain = t === "combat" ? (D.chars.length ? 2.0 : 0.4) : t === "influence" ? 1.4 + (D.power > 0 ? 0.8 : 0) : 0.9 + (D.hand.length ? 0.5 : 0);
      if (def === 0) gain += 1.4;
      else gain -= 0.3; // il peut défendre et nous faire perdre
      gain += Math.min(1, X.totalPower(D) * 0.06);
      // agenouiller des personnages nous expose aux défis des adversaires qui jouent après nous
      const used = pick.reduce((a, u) => a + X.str(C(u)), 0);
      const leftC = P.chars.filter((c) => !c.k && !pick.includes(c.u) && X.hasIcon(c, "combat")).reduce((a, c) => a + X.str(c), 0);
      if (later.length) gain -= 0.12 * used + (threat > 0 && leftC === 0 ? 1.2 : 0);
      else gain -= 0.03 * used;
      plans.push({ type: t, def: D.id, atk: pick, gain });
    }
  }
  if (!plans.length) return { pass: true };
  plans.sort((a, b) => b.gain - a.gain);
  return plans[0].gain > 0.2 ? { type: plans[0].type, def: plans[0].def, atk: plans[0].atk } : { pass: true };
}
function defend(X, P, q) {
  const G = X.G, ch = G.ch;
  const C = (u) => X.inst(u);
  if (!ch) return { dfd: [] };
  const sa = ch.atk.map(C).filter((c) => c && c.z === "char").reduce((s, c) => s + X.str(c), 0);
  const Dv = (c) => X.strAs(c, "dfd", ch.type);
  const cands = q.cands.map(C).sort((a, b) => Dv(a) - Dv(b));
  const iStillAttack = X.G.phase === "challenges" && laterOpps(X, X.player(ch.att)).includes(P);
  // la plus petite équipe qui bat l'attaque (il faut dépasser strictement)
  const best = [];
  {
    let sum = 0;
    for (const c of [...cands].sort((a, b) => Dv(b) - Dv(a))) { if (sum > sa) break; if (best.length >= q.max) break; best.push(c); sum += Dv(c); }
    if (sum > sa) {
      for (const c of [...best].sort((a, b) => Dv(b) - Dv(a))) { // retire le superflu
        if (best.length <= 1) break;
        const rest = best.filter((x) => x !== c);
        if (rest.reduce((a, x) => a + Dv(x), 0) > sa) best.splice(best.indexOf(c), 1);
      }
      const worth = ch.type === "combat" || ch.type === "influence" || !iStillAttack || best.length === 1;
      if (worth) return { dfd: best.map((c) => c.u) };
    }
  }
  // perdu d'avance : un petit personnage suffit à empêcher le « sans opposition » (1 Pouvoir de moins pour l'attaquant)
  const small = cands.find((c) => Dv(c) <= 2 || ch.type === "influence");
  if (small && (!iStillAttack || Dv(small) <= 1 || ch.type === "influence")) return { dfd: [small.u] };
  return { dfd: [] };
}
function action(X, P, q) {
  const G = X.G, ch = G.ch;
  const C = (u) => X.inst(u);
  for (const o of q.opts) {
    const c = C(o.u);
    const d = X.card(c);
    const tpl = o.k === "act" ? X.abs(c)[o.i].tpl : o.k === "evt" ? d.abs[0].tpl : "amb";
    if (o.k === "amb") { if (ch && ch.def === P.id && ch.stage !== "res") return o; continue; }
    if (/^(evDraw|actDraw|evRecall|evGold)$/.test(tpl)) return o;
    if (/^(evKill|evKneel|actKneel|actSacKill)$/.test(tpl)) { if (tpl !== "actSacKill" || Math.random() < 0.3) return o; continue; }
    if (tpl === "evKillAll") {
      const m = +d.abs[0].args[0] || 1;
      const theirs = X.opps(P).flatMap((op) => op.chars).filter((x) => X.str(x) <= m).reduce((a, x) => a + X.card(x).cost, 0);
      const ours = P.chars.filter((x) => X.str(x) <= m).reduce((a, x) => a + X.card(x).cost, 0);
      if (theirs >= ours + 4) return o;
      continue;
    }
    if (tpl === "actStandAll") { // tout le monde debout : vaut le coup s'il y a du monde à relever
      const t = X.abs(c)[o.i].args[0];
      const knelt = P.chars.filter((x) => x !== c && x.k && (!t || t === "*" || X.hasTrait(x, t)));
      if (knelt.length >= 2 && knelt.reduce((s, x) => s + X.str(x), 0) >= X.str(c) + 2) return o;
      continue;
    }
    if (!ch) continue;
    if (tpl === "actSilence") { if (ch.att === P.id && ch.stage === "atk") return o; continue; }
    const mine = ch.att === P.id ? "atk" : ch.def === P.id ? "dfd" : null;
    if (!mine) continue;
    const sa = ch.atk.map(C).filter((x) => x && x.z === "char").reduce((s, x) => s + X.str(x), 0);
    const sd = ch.dfd.map(C).filter((x) => x && x.z === "char").reduce((s, x) => s + X.str(x), 0);
    const losing = mine === "atk" ? sa < sd : sd <= sa;
    const gap = Math.abs(sa - sd) + (mine === "dfd" ? 1 : 0);
    if (tpl === "evZap") { // décharge : on tue si on peut, sinon on s'en sert pour renverser un défi perdu
      const [n, b, nm] = d.abs[0].args;
      const k = nm && X.participants().some((x) => X.ctrl(x) === P && X.card(x).name === nm) ? +b || 1 : +n || 1;
      const kills = X.participants().some((x) => X.ctrl(x) !== P && X.targetable(x, c) && X.str(x) <= k);
      if (ch.stage === "act" && (kills || (losing && k >= gap))) return o;
      continue;
    }
    const amount = +((o.k === "act" ? X.abs(c)[o.i].args : d.abs[0].args) || [])[1] || +((o.k === "act" ? X.abs(c)[o.i].args : d.abs[0].args) || [])[0] || 1;
    if (losing && ch.stage === "act" && /Buff|Minus|actPay|evBuffTrait/.test(tpl) && amount >= gap) return o;
    if (tpl === "evClaim" && mine === "atk" && sa >= sd && ch.stage === "act") return o;
  }
  return { pass: true };
}
function choose(X, P, q) {
  const C = (u) => X.inst(u);
  const n = q.min || Math.min(1, q.max);
  const cands = [...q.cands];
  const isInst = (u) => typeof u === "string" && X.inst(u);
  if (!cands.every(isInst)) return cands.slice(0, Math.max(n, 0));
  const val = (u) => instVal(X, C(u));
  const mineAll = cands.every((u) => C(u).o === P.id || X.ctrl(C(u)) === P);
  if (q.zone === "hand" && /Mettre en jeu/.test(q.title || "")) return cands.sort((a, b) => cardValue(X.card(C(b))) - cardValue(X.card(C(a)))).slice(0, Math.max(1, n));
  if (q.zone === "hand") { // défausse (réserve) : on garde le meilleur
    return cands.sort((a, b) => cardValue(X.card(C(a))) - cardValue(X.card(C(b)))).slice(0, q.min);
  }
  if (q.zone === "deck" || q.zone === "disc") return cands.sort((a, b) => cardValue(X.card(C(b))) - cardValue(X.card(C(a)))).slice(0, Math.max(1, n));
  if (mineAll && /tuer|Revendication|sacrifi/i.test(q.title)) { // perdre le moins possible (un doublon le sauvera)
    return cands.sort((a, b) => (C(b).dup.length - C(a).dup.length) || val(a) - val(b)).slice(0, q.min);
  }
  if (mineAll && /Redresser|\+/.test(q.title)) return cands.sort((a, b) => val(b) - val(a)).slice(0, Math.max(1, n));
  if (mineAll && /Attacher/.test(q.title)) return cands.sort((a, b) => val(b) - val(a)).slice(0, 1);
  // effet qui tue à 0 force : d'abord un personnage qu'il tue vraiment (le plus précieux)
  if (q.lethal) {
    const dies = cands.filter((u) => X.ctrl(C(u)) !== P && X.str(C(u)) <= q.lethal);
    if (dies.length) return dies.sort((a, b) => val(b) - val(a)).slice(0, Math.max(1, n));
  }
  // cible adverse : la plus forte
  const theirs = cands.filter((u) => X.ctrl(C(u)) !== P);
  const pool = theirs.length ? theirs : cands;
  return pool.sort((a, b) => val(b) - val(a)).slice(0, Math.max(1, n));
}
