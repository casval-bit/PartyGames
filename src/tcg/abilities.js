// Trône des Mondes : modèles d'effets des cartes.
//
// Une carte déclare ses effets avec une petite chaîne « modèle:arg1,arg2@Nom de l'effet », par exemple
// "winStand:combat@Super Sprint". Chaque modèle fournit À LA FOIS le texte affiché sur la carte et le comportement
// exécuté par le moteur : le texte ne peut donc jamais dire autre chose que ce que fait la carte.
//
// Les comportements reçoivent X, l'interface du moteur (voir engine.js : api()), et `me`, l'instance de la carte
// (personnage, lieu, objet, scénario, carte de famille ou événement en main). Les fonctions marquées function*
// peuvent demander un choix au joueur (yield* X.choose(...)).
import { TYPE_NAME, KEYWORDS, unDefi } from "./rules.js";

const num = (x, d = 1) => (x === undefined || x === "" || !Number.isFinite(+x) ? d : +x);
const anyT = (t) => !t || t === "*";
const perso = (t, pl = false) => (anyT(t) ? (pl ? "personnages" : "personnage") : `${pl ? "personnages" : "personnage"} *${t}*`);
const s = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
const carte = (n) => s(n, "carte");
const typeOk = (t, ch) => anyT(t) || (ch && ch.type === t);
const KIND_NAME = { char: "personnage", loc: "lieu", obj: "objet", evt: "événement" };
/** Accords d'un personnage féminin (carte marquée `fem`, voir cards/gender.js). */
const gn = (c) => (c && c.fem
  ? { il: "elle", le: "la", seul: "seule", att: "attaquante", def: "défenseuse", debout: "si elle est debout" }
  : { il: "il", le: "le", seul: "seul", att: "attaquant", def: "défenseur", debout: "s'il est debout" });
const ée = (c) => (c && c.fem ? "ée" : "é");
/** « que » + nom, avec l'élision devant une voyelle : « qu'Allison », « que Shen ». */
const H_MUET = /^(hermione|hedwige|helga|horace|hera|héra)\b/i; // h muet : « qu'Hermione », mais « que Harry », « que Hagrid »
const que = (name) => ((/^[aeiouyàâäáéèêëíîïóôöúùûüœæ]/i.test(String(name)) && !/^(onze|un)$/i.test(String(name))) || H_MUET.test(String(name)) ? `qu'${name}` : `que ${name}`); // « que Onze » : pas d'élision devant un nombre

/* ------------------------------ fabriques ------------------------------ */
const statik = (o) => ({ kind: "static", ...o });
/** Réaction d'un personnage/lieu/objet en jeu, ou d'une carte de famille (auto = utilisée d'office, sans coût). */
const react = (on, cond, run, o = {}) => ({ kind: "react", on, cond, run, auto: o.cost ? false : true, ...o });
const interrupt = (on, cond, run, o = {}) => ({ kind: "interrupt", on, cond, run, ...o });
const action = (when, can, run, o = {}) => ({ kind: "action", when, can, run, ...o });
const evt = (timing, o) => ({ kind: "evt", timing, ...o });
const plot = (o) => ({ kind: "plot", ...o });

/* --------------------------- conditions utiles --------------------------- */
const mine = (X, me, inst) => X.ctrl(inst) === X.ctrl(me);
const wonWith = (X, me, ev, t) => ev.p === X.ctrl(me) && typeOk(t, ev.ch) && ev.ch.parts.includes(me.u);
const lostWith = (X, me, ev) => ev.p === X.ctrl(me) && ev.ch.parts.includes(me.u);

/* -------------------------- petits effets réutilisés -------------------------- */
function* kneelOpp(X, me, maxStr, title, onlyLoser, freeze = false) {
  const p = X.ctrl(me);
  const pool = (onlyLoser ? [onlyLoser] : X.opps(p)).flatMap((o) => X.chars(o)).filter((c) => !c.k && X.str(c) <= maxStr && X.targetable(c, me));
  if (!pool.length) return;
  const [u] = yield* X.choose(p, { title, cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id });
  if (!u) return;
  X.kneel(X.inst(u), me);
  if (freeze) { X.mod({ t: "nostand", u, until: "round" }); X.log(`${X.name(X.inst(u))} ne se redressera pas ce round.`); }
}
function* killOpp(X, me, pred, title, among) {
  const p = X.ctrl(me);
  const pool = (among || X.opps(p).flatMap((o) => X.chars(o))).filter((c) => X.inPlay(c) && pred(c) && X.targetable(c, me));
  if (!pool.length) return;
  const [u] = yield* X.choose(p, { title, cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id, harm: true });
  if (u) yield* X.kill(X.inst(u), me);
}
function* standMine(X, me, t, title, notSelf) {
  const p = X.ctrl(me);
  const pool = X.chars(p).filter((c) => c.k && (!notSelf || c !== me) && (anyT(t) || X.hasTrait(c, t)));
  if (!pool.length) return;
  const [u] = yield* X.choose(p, { title, cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id });
  if (u) X.stand(X.inst(u));
}
function* buffOne(X, me, pred, n, title, side) {
  const p = X.ctrl(me);
  const pool = X.participants().filter((c) => pred(c) && (side === "opp" ? X.ctrl(c) !== p : side === "mine" ? X.ctrl(c) === p : true) && (side !== "opp" || X.targetable(c, me)));
  if (!pool.length) return;
  const [u] = yield* X.choose(p, { title, cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id, harm: side === "opp" });
  if (u) X.mod({ t: "str", u, n, until: "challenge" });
}
function* recallFromDiscard(X, p, t, me, kinds = ["char"]) {
  const pool = p.disc.filter((c) => kinds.includes(X.card(c).type) && (anyT(t) || X.cardHasTrait(X.card(c), t)));
  if (!pool.length) return;
  const [u] = yield* X.choose(p, { title: "Reprendre en main", cands: pool.map((c) => c.u), min: 1, max: 1, src: me && me.id, zone: "disc" });
  if (u) X.fromDiscardToHand(p, u);
}
const partChar = (X) => X.participants();

/* ================================ MODÈLES ================================ */
export const TPL = {
  /* ---------------------------- statiques ---------------------------- */
  aura: ([t, n], c) => statik({
    text: c.type === "char" ? `Vos autres ${perso(t, true)} gagnent +${num(n)} force.` : `Vos ${perso(t, true)} gagnent +${num(n)} force.`,
    str: (X, me, tg) => (tg !== me && X.inPlay(me) && mine(X, me, tg) && (anyT(t) || X.hasTrait(tg, t)) ? num(n) : 0),
  }),
  pack: ([t, n], c) => statik({
    text: `${c.name} gagne +${num(n)} force pour chaque autre ${perso(t)} que vous contrôlez (+${3 * num(n)} au maximum).`,
    str: (X, me, tg) => (tg === me ? num(n) * Math.min(3, X.chars(X.ctrl(me)).filter((o) => o !== me && X.hasTrait(o, t)).length) : 0),
  }),
  ifFirst: ([n], c) => statik({ text: `Tant que vous êtes premier joueur, ${c.name} gagne +${num(n)} force.`, str: (X, me, tg) => (tg === me && X.isFirst(X.ctrl(me)) ? num(n) : 0) }),
  ifAlone: ([n], c) => statik({ text: `Tant qu'${gn(c).il} attaque ou défend ${gn(c).seul}, ${c.name} gagne +${num(n)} force.`, str: (X, me, tg) => (tg === me && X.aloneInChallenge(me) ? num(n) : 0) }),
  ifAtk: ([n], c) => statik({ text: `${c.name} gagne +${num(n)} force tant qu'${gn(c).il} attaque.`, str: (X, me, tg) => (tg === me && X.isAttacking(me) ? num(n) : 0) }),
  ifDef: ([n], c) => statik({ text: `${c.name} gagne +${num(n)} force tant qu'${gn(c).il} défend.`, str: (X, me, tg) => (tg === me && X.isDefending(me) ? num(n) : 0) }),
  ifBehind: ([n], c) => statik({ text: `Tant que vous avez moins de Pouvoir qu'un adversaire, ${c.name} gagne +${num(n)} force.`, str: (X, me, tg) => (tg === me && X.isBehind(X.ctrl(me)) ? num(n) : 0) }),
  ifWith: ([t, n], c) => statik({
    text: `Tant que vous contrôlez un autre ${perso(t)}, ${c.name} gagne +${num(n)} force.`,
    str: (X, me, tg) => (tg === me && X.chars(X.ctrl(me)).some((o) => o !== me && X.hasTrait(o, t)) ? num(n) : 0),
  }),
  ifName: ([nm, n], c) => statik({
    text: `Tant que vous contrôlez ${nm}, ${c.name} gagne +${num(n)} force.`,
    str: (X, me, tg) => (tg === me && X.chars(X.ctrl(me)).some((o) => o !== me && X.card(o).name === nm) ? num(n) : 0),
  }),
  claim: ([n], c) => statik({ text: `Tant ${que(c.name)} attaque, la revendication du défi augmente de ${num(n)}.`, claim: (X, me, ch) => (ch.atk.includes(me.u) && X.inPlay(me) ? num(n) : 0) }),
  domi: ([n], c) => statik({
    text: c.type === "char" ? `${c.name} compte pour +${num(n)} force supplémentaire à la Domination (${gn(c).debout}).` : `+${num(n)} force pour la Domination.`,
    domi: (X, me, p) => (X.ctrl(me) === p && X.inPlay(me) && (X.card(me).type !== "char" || !me.k) ? num(n) : 0),
  }),
  income: ([n]) => statik({ text: `+${num(n)} revenu.`, income: (X, me, p) => (X.ctrl(me) === p && X.inPlay(me) ? num(n) : 0) }),
  reserve: ([n]) => statik({ text: `+${num(n)} réserve.`, reserve: (X, me, p) => (X.ctrl(me) === p && X.inPlay(me) ? num(n) : 0) }),
  noKneel: ([t], c) => statik({ text: `${c.name} ne s'agenouille pas pour attaquer dans ${anyT(t) ? "les défis" : unDefi(t)}.`, noKneel: (X, me, inst, ty) => inst === me && typeOk(t, { type: ty }) }),
  immune: ([], c) => statik({ text: `${c.name} est immunis${ée(c)} contre les événements adverses.`, immune: (X, me, inst) => inst === me }),
  iconAura: ([t, ty]) => statik({ text: `Vos ${perso(t, true)} gagnent l'icône {${ty}}.`, icon: (X, me, tg, q) => (q === ty && X.inPlay(me) && mine(X, me, tg) && (anyT(t) || X.hasTrait(tg, t)) ? 1 : 0) }),
  xtraCh: ([ty]) => statik({ text: `Vous pouvez lancer ${unDefi(ty)} supplémentaire pendant la phase des Défis.`, extraCh: (X, me, p, q) => (X.ctrl(me) === p && X.inPlay(me) && q === ty ? 1 : 0) }),
  defAura: ([n]) => statik({ text: `Vos personnages qui défendent gagnent +${num(n)} force.`, str: (X, me, tg) => (X.inPlay(me) && mine(X, me, tg) && X.isDefending(tg) ? num(n) : 0) }),
  atkAura: ([t, n]) => statik({ text: `Vos ${perso(t, true)} qui attaquent gagnent +${num(n)} force.`, str: (X, me, tg) => (X.inPlay(me) && mine(X, me, tg) && X.isAttacking(tg) && (anyT(t) || X.hasTrait(tg, t)) ? num(n) : 0) }),
  kwAura: ([t, k]) => statik({ text: `Vos ${perso(t, true)} gagnent ${KEYWORDS[k].name}.`, kw: (X, me, tg, q) => q === k && X.inPlay(me) && mine(X, me, tg) && (anyT(t) || X.hasTrait(tg, t)) }),
  /** Terreur : pendant qu'il attaque, les petits personnages n'osent pas défendre. */
  atkTerror: ([m], c) => statik({
    text: `Tant ${que(c.name)} attaque, les personnages adverses de force ${num(m)} ou moins ne peuvent pas défendre.`,
    noDefend: (X, me, inst) => Boolean(X.inPlay(me) && me.z === "char" && X.G.ch && X.G.ch.atk.includes(me.u) && X.ctrl(inst) !== X.ctrl(me) && X.str(inst) <= num(m)),
  }),
  immuneAura: ([t], c) => statik({
    text: `Vos autres ${perso(t, true)} sont immunisés contre les événements adverses.`,
    immune: (X, me, inst) => X.inPlay(me) && inst !== me && mine(X, me, inst) && (anyT(t) || X.hasTrait(inst, t)),
  }),
  ifPower: ([n, b], c) => statik({ text: `Tant que vous avez ${num(n)} Pouvoir ou plus, ${c.name} gagne +${num(b)} force.`, str: (X, me, tg) => (tg === me && X.totalPower(X.ctrl(me)) >= num(n) ? num(b) : 0) }),
  /** Taxe : les personnages que recrutent les adversaires coûtent plus cher (voir costFor dans engine.js). */
  oppTax: ([n]) => statik({ text: `Les personnages que vos adversaires recrutent coûtent ${num(n)} de plus.`, tax: (X, me, p, d) => (X.inPlay(me) && X.ctrl(me) !== p && d.type === "char" ? num(n) : 0) }),
  /** Réduction de coût : le moteur agenouille ce lieu tout seul quand il sert à payer moins cher. */
  reduce: ([t, n], c) => statik({
    text: `Action : agenouillez ${c.name} : le prochain ${perso(t)} que vous recrutez coûte ${num(n)} de moins.`,
    reducer: { trait: anyT(t) ? null : t, n: num(n) },
  }),

  /* ------------------------ réactions à l'entrée en jeu ------------------------ */
  enterDraw: ([n], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après ${que(c.name)} entre en jeu, piochez ${carte(num(n))}.` }),
  enterGold: ([n], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { X.gainGold(X.ctrl(me), num(n)); }, { text: `Réaction : après ${que(c.name)} entre en jeu, gagnez ${num(n)} or.` }),
  enterKneel: ([m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* kneelOpp(X, me, num(m), "Agenouiller un personnage adverse"); }, { text: `Réaction : après ${que(c.name)} entre en jeu, agenouillez un personnage adverse de force ${num(m)} ou moins.` }),
  enterStand: ([t], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* standMine(X, me, t, "Redresser un personnage", true); }, { text: `Réaction : après ${que(c.name)} entre en jeu, redressez un de vos ${perso(t, true)}.` }),
  enterSearch: ([t], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* X.search(X.ctrl(me), (d) => anyT(t) || X.cardHasTrait(d, t), 10, me); }, { text: `Réaction : après ${que(c.name)} entre en jeu, regardez les 10 premières cartes de votre deck : ajoutez-en une ${anyT(t) ? "" : `*${t}* `}à votre main, puis mélangez.` }),
  enterRecall: ([t], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* recallFromDiscard(X, X.ctrl(me), t, me); }, { text: `Réaction : après ${que(c.name)} entre en jeu, reprenez en main un ${perso(t)} de votre défausse.` }),
  enterDiscard: ([n], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { for (const o of X.opps(X.ctrl(me))) X.discardRandom(o, num(n), me); }, { text: `Réaction : après ${que(c.name)} entre en jeu, chaque adversaire défausse ${carte(num(n))} au hasard.` }),
  enterKill: ([m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* killOpp(X, me, (o) => X.card(o).cost <= num(m), "Tuer un personnage adverse"); }, { text: `Réaction : après ${que(c.name)} entre en jeu, tuez un personnage adverse de coût ${num(m)} ou moins.` }),
  enterPower: ([n], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, { text: `Réaction : après ${que(c.name)} entre en jeu, gagnez ${num(n)} Pouvoir.` }),
  enterKneelAll: ([m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) {
    for (const o of X.opps(X.ctrl(me))) for (const x of X.chars(o)) if (!x.k && X.str(x) <= num(m)) X.kneel(x);
  }, { text: `Réaction : après ${que(c.name)} entre en jeu, agenouillez chaque personnage adverse de force ${num(m)} ou moins.` }),
  enterFreeze: ([m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) { yield* kneelOpp(X, me, num(m), "Geler un personnage adverse", null, true); }, {
    text: `Réaction : après ${que(c.name)} entre en jeu, agenouillez un personnage adverse de force ${num(m)} ou moins : il ne se redresse pas à la prochaine phase de Redressement.`,
  }),
  enterRevive: ([m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) {
    const p = X.ctrl(me);
    const pool = p.dead.filter((x) => X.card(x).type === "char" && X.card(x).cost <= num(m) && x !== me);
    if (!pool.length) return;
    const [u] = yield* X.choose(p, { title: "Ramener un personnage de la pile des morts", cands: pool.map((x) => x.u), min: 1, max: 1, src: me.id, zone: "dead" });
    if (u) yield* X.putIntoPlay(p, X.inst(u), "dead");
  }, { text: `Réaction : après ${que(c.name)} entre en jeu, remettez en jeu un personnage de coût ${num(m)} ou moins de votre pile des morts.` }),
  enterPutPlay: ([t, m], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) {
    const p = X.ctrl(me);
    const pool = p.hand.filter((x) => X.card(x).type === "char" && X.card(x).cost <= num(m) && (anyT(t) || X.cardHasTrait(X.card(x), t)) && X.canEnter(p, x));
    if (!pool.length) return;
    const [u] = yield* X.choose(p, { title: "Mettre en jeu", cands: pool.map((x) => x.u), min: 0, max: 1, src: me.id, zone: "hand", ask: true });
    if (u) yield* X.putIntoPlay(p, X.inst(u), "hand");
  }, { text: `Réaction : après ${que(c.name)} entre en jeu, mettez en jeu depuis votre main un ${perso(t)} de coût ${num(m)} ou moins.` }),
  enterBuff: ([t, n], c) => react("enter", (X, me, ev) => ev.inst === me, function* (X, me) {
    for (const o of X.chars(X.ctrl(me))) if (anyT(t) || X.hasTrait(o, t)) X.mod({ t: "str", u: o.u, n: num(n), until: "round" });
  }, { text: `Réaction : après ${que(c.name)} entre en jeu, vos ${perso(t, true)} gagnent +${num(n)} force jusqu'à la fin du round.` }),

  /* ------------------------ réactions aux défis ------------------------ */
  winDraw: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, piochez ${carte(num(n))}.` }),
  winGold: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me) { X.gainGold(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, gagnez ${num(n)} or.` }),
  winPower: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, gagnez ${num(n)} Pouvoir.` }),
  winStand: ([t], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t) && me.k, function* (X, me) { X.stand(me); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, redressez ${c.name}.` }),
  winKneel: ([t], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) { yield* kneelOpp(X, me, 99, "Agenouiller un personnage du perdant", ev.loser); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, agenouillez un personnage du perdant.` }),
  winKill: ([t, m], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) { yield* killOpp(X, me, (o) => X.str(o) <= num(m), "Tuer un personnage du perdant", X.chars(ev.loser)); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, tuez un personnage du perdant de force ${num(m)} ou moins.` }),
  winDiscard: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) { X.discardRandom(ev.loser, num(n), me); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, le perdant défausse ${carte(num(n))} au hasard.` }),
  winRecall: ([t], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me) { yield* recallFromDiscard(X, X.ctrl(me), "*", me); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, reprenez en main un personnage de votre défausse.` }),
  winSteal: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) { X.stealGold(ev.loser, X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, prenez ${num(n)} or au perdant.` }),
  winStandAll: ([t], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t) && ev.ch.parts.some((u) => { const o = X.inst(u); return o && o.k && X.ctrl(o) === X.ctrl(me); }), function* (X, me, ev) {
    for (const u of ev.ch.parts) { const o = X.inst(u); if (o && o.z === "char" && X.ctrl(o) === X.ctrl(me)) X.stand(o); }
  }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, redressez tous vos personnages participants.` }),
  winBounce: ([t, m], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) {
    const pool = ev.ch.parts.map((u) => X.inst(u)).filter((o) => o && o.z === "char" && X.ctrl(o) === ev.loser && X.card(o).cost <= num(m));
    if (!pool.length) return;
    const [u] = yield* X.choose(X.ctrl(me), { title: "Renvoyer un personnage dans la main de son propriétaire", cands: pool.map((o) => o.u), min: 1, max: 1, src: me.id, harm: true });
    if (u) yield* X.returnToHand(X.inst(u));
  }, { text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, renvoyez dans la main de son propriétaire un personnage participant du perdant de coût ${num(m)} ou moins.` }),
  winPowerSteal: ([t, n], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t) && ev.loser.power > 0, function* (X, me, ev) { X.movePower(ev.loser, X.ctrl(me), num(n)); }, {
    text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, prenez ${num(n)} Pouvoir au perdant.`,
  }),
  winFreeze: ([t], c) => react("win", (X, me, ev) => wonWith(X, me, ev, t), function* (X, me, ev) { yield* kneelOpp(X, me, 99, "Geler un personnage du perdant", ev.loser, true); }, {
    text: `Réaction : après avoir gagné ${unDefi(t)} auquel ${c.name} participe, agenouillez un personnage du perdant : il ne se redresse pas à la prochaine phase de Redressement.`,
  }),
  defWinPower: ([n], c) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && ev.ch.dfd.includes(me.u) && ev.ch.parts.includes(me.u), function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, {
    text: `Réaction : après avoir gagné un défi où ${c.name} défend, gagnez ${num(n)} Pouvoir.`,
  }),
  loseStand: ([], c) => react("lose", (X, me, ev) => lostWith(X, me, ev) && me.k, function* (X, me) { X.stand(me); }, { text: `Réaction : après avoir perdu un défi auquel ${c.name} participe, redressez-${gn(c).le}.` }),
  loseDraw: ([n], c) => react("lose", (X, me, ev) => lostWith(X, me, ev), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir perdu un défi auquel ${c.name} participe, piochez ${carte(num(n))}.` }),
  atkKneel: ([m], c) => react("atk", (X, me, ev) => ev.ch.atk.includes(me.u), function* (X, me, ev) { yield* kneelOpp(X, me, num(m), "Agenouiller un personnage du défenseur", ev.defender); }, { text: `Réaction : après ${que(c.name)} a été déclar${ée(c)} ${gn(c).att}, agenouillez un personnage du défenseur de force ${num(m)} ou moins.` }),
  atkBuff: ([t, n], c) => react("atk", (X, me, ev) => ev.ch.atk.includes(me.u), function* (X, me, ev) {
    for (const u of ev.ch.atk) { const o = X.inst(u); if (o && o !== me && (anyT(t) || X.hasTrait(o, t))) X.mod({ t: "str", u, n: num(n), until: "challenge" }); }
  }, { text: `Réaction : après ${que(c.name)} a été déclar${ée(c)} ${gn(c).att}, vos autres ${perso(t, true)} attaquants gagnent +${num(n)} force jusqu'à la fin du défi.` }),
  defStand: ([], c) => react("def", (X, me, ev) => ev.ch.dfd.includes(me.u) && me.k, function* (X, me) { X.stand(me); }, { text: `Réaction : après ${que(c.name)} a été déclar${ée(c)} ${gn(c).def}, redressez-${gn(c).le}.` }),

  /* ------------------------ autres réactions ------------------------ */
  dieDraw: ([n], c) => react("killed", (X, me, ev) => ev.inst === me, function* (X, me, ev) { X.draw(ev.p, num(n)); }, { text: `Réaction : après ${que(c.name)} a été tu${ée(c)}, piochez ${carte(num(n))}.` }),
  dieKill: ([m], c) => react("killed", (X, me, ev) => ev.inst === me, function* (X, me, ev) { yield* killOpp(X, { ...me, _owner: ev.p }, (o) => X.str(o) <= num(m), "Tuer un personnage adverse"); }, { text: `Réaction : après ${que(c.name)} a été tu${ée(c)}, tuez un personnage adverse de force ${num(m)} ou moins.` }),
  dieReturn: ([], c) => react("killed", (X, me, ev) => ev.inst === me && me.z === "dead", function* (X, me, ev) { X.fromDeadToHand(ev.p, me.u); }, { text: `Réaction : après ${que(c.name)} a été tu${ée(c)}, reprenez-${gn(c).le} dans votre main.` }),
  domSteal: ([n], c) => react("dom", (X, me, ev) => ev.p === X.ctrl(me) && X.opps(X.ctrl(me)).some((o) => o.power > 0), function* (X, me) {
    const p = X.ctrl(me);
    const o = yield* X.chooseOpp(p, "Prendre du Pouvoir à…", (q) => q.power > 0);
    if (o) X.movePower(o, p, num(n));
  }, { text: `Réaction : après avoir gagné la Domination, prenez ${num(n)} Pouvoir à un adversaire.` }),
  domDraw: ([n], c) => react("dom", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné la Domination, piochez ${carte(num(n))}.` }),
  domPower: ([n], c) => react("dom", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.gainPower(X.ctrl(me), num(n), X.card(me).type === "char" ? me : null, me); }, { text: c.type === "char" ? `Réaction : après avoir gagné la Domination, ${c.name} gagne ${num(n)} Pouvoir.` : `Réaction : après avoir gagné la Domination, gagnez ${num(n)} Pouvoir.` }),
  firstDraw: ([n]) => react("first", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après être devenu premier joueur, piochez ${carte(num(n))}.` }),

  /* ------------------------ interruptions (sauvetages) ------------------------ */
  guard: ([t], c) => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst !== me && !me.k && mine(X, me, ev.inst) && (anyT(t) || X.hasTrait(ev.inst, t)), function* (X, me, ev) { X.kneel(me); ev.saved = true; }, {
    text: c.type === "char" ? `Interruption : quand un autre de vos ${perso(t, true)} devrait être tué, agenouillez ${c.name} pour le sauver.` : `Interruption : quand un de vos ${perso(t, true)} devrait être tué, agenouillez ${c.name} pour le sauver.`,
  }),
  sacSave: ([t], c) => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst !== me && mine(X, me, ev.inst) && (anyT(t) || X.hasTrait(ev.inst, t)), function* (X, me, ev) { ev.saved = true; yield* X.sacrifice(me); }, { text: `Interruption : quand un autre de vos ${perso(t, true)} devrait être tué, sacrifiez ${c.name} pour le sauver.` }),
  escape: ([], c) => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst === me, function* (X, me, ev) { ev.saved = true; ev.toHand = true; }, { text: `Interruption : quand ${c.name} devrait être tu${ée(c)}, remettez-${gn(c).le} dans votre main à la place.` }),
  selfSave: ([n], c) => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst === me && X.ctrl(me).gold >= num(n), function* (X, me, ev) { X.ctrl(me).gold -= num(n); ev.saved = true; }, { text: `Interruption : quand ${c.name} devrait être tu${ée(c)}, payez ${num(n)} or pour ${gn(c).le} sauver.` }),
  selfGuard: ([], c) => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst === me && !me.k, function* (X, me, ev) { X.kneel(me); ev.saved = true; }, { text: `Interruption : quand ${c.name} devrait être tu${ée(c)}, agenouillez-${gn(c).le} pour ${gn(c).le} sauver.` }),
  famEscape: ([t]) => interrupt("wouldDie", (X, me, ev) => !ev.saved && mine(X, me, ev.inst) && (anyT(t) || X.hasTrait(ev.inst, t)), function* (X, me, ev) { ev.saved = true; ev.toHand = true; }, { text: `Interruption (une fois par round) : quand un de vos ${perso(t, true)} devrait être tué, remettez-le dans votre main à la place.` }),

  /* ------------------------ actions des cartes en jeu ------------------------ */
  actBuff: ([t, n], c) => action("challenge", (X, me) => !me.k && partChar(X).some((o) => mine(X, me, o) && (anyT(t) || X.hasTrait(o, t))), function* (X, me) {
    X.kneel(me); yield* buffOne(X, me, (o) => anyT(t) || X.hasTrait(o, t), num(n), `+${num(n)} force`, "mine");
  }, { text: `Action : agenouillez ${c.name} : un de vos ${perso(t, true)} participants gagne +${num(n)} force jusqu'à la fin du défi.` }),
  actStand: ([t], c) => action("any", (X, me) => !me.k && X.chars(X.ctrl(me)).some((o) => o !== me && o.k && (anyT(t) || X.hasTrait(o, t))), function* (X, me) {
    X.kneel(me); yield* standMine(X, me, t, "Redresser un personnage", true);
  }, { text: `Action : agenouillez ${c.name} pour redresser un autre de vos ${perso(t, true)}.` }),
  actMinus: ([n], c) => action("challenge", (X, me) => !me.k && partChar(X).some((o) => !mine(X, me, o)), function* (X, me) {
    X.kneel(me); yield* buffOne(X, me, () => true, -num(n), `-${num(n)} force`, "opp");
  }, { text: `Action : agenouillez ${c.name} : un personnage adverse participant perd ${num(n)} force jusqu'à la fin du défi.` }),
  /** Redresse tous les autres personnages du trait (ou seulement N d'entre eux si N est donné). */
  actStandAll: ([t, n], c) => action("any", (X, me) => !me.k && X.chars(X.ctrl(me)).some((o) => o !== me && o.k && (anyT(t) || X.hasTrait(o, t))), function* (X, me) {
    X.kneel(me);
    const p = X.ctrl(me);
    const pool = X.chars(p).filter((o) => o !== me && o.k && (anyT(t) || X.hasTrait(o, t)));
    if (!n) { for (const o of pool) X.stand(o); return; }
    const k = Math.min(num(n), pool.length);
    const picks = yield* X.choose(p, { title: `Redresser ${k} personnage${k > 1 ? "s" : ""}`, cands: pool.map((o) => o.u), min: k, max: k, src: me.id });
    for (const u of picks) X.stand(X.inst(u));
  }, { text: n ? `Action : agenouillez ${c.name} pour redresser jusqu'à ${num(n)} de vos autres ${perso(t, true)}.` : `Action : agenouillez ${c.name} pour redresser tous vos autres ${perso(t, true)}.` }),
  actSilence: ([m], c) => action("challenge", (X, me) => !me.k && X.opps(X.ctrl(me)).some((o) => X.chars(o).some((x) => !x.k && X.str(x) <= num(m))), function* (X, me) {
    X.kneel(me);
    const p = X.ctrl(me);
    const pool = X.opps(p).flatMap((o) => X.chars(o)).filter((x) => !x.k && X.str(x) <= num(m)); // ceux qui pourraient encore agir
    const [u] = yield* X.choose(p, { title: "Qui ne pourra ni attaquer ni défendre ?", cands: pool.map((x) => x.u), min: 1, max: 1, src: me.id, harm: true });
    if (u) { X.mod({ t: "noatk", u, until: "phase" }); X.mod({ t: "nodef", u, until: "phase" }); X.log(`${X.name(X.inst(u))} ne peut ni attaquer ni défendre jusqu'à la fin de la phase.`); }
  }, { text: `Action : agenouillez ${c.name} : un personnage adverse de force ${num(m)} ou moins ne peut ni attaquer ni défendre jusqu'à la fin de la phase.` }),
  actPay: ([n], c) => action("challenge", (X, me) => X.ctrl(me).gold >= 1 && X.participants().includes(me), function* (X, me) {
    X.ctrl(me).gold -= 1; X.mod({ t: "str", u: me.u, n: num(n), until: "challenge" });
  }, { text: `Action : payez 1 or : ${c.name} gagne +${num(n)} force jusqu'à la fin du défi.` }),
  actIcon: ([ty], c) => action("any", (X, me) => !me.k && X.G.phase === "challenges", function* (X, me) {
    X.kneel(me);
    const p = X.ctrl(me);
    const pool = X.chars(p).filter((o) => !X.hasIcon(o, ty));
    if (!pool.length) return;
    const [u] = yield* X.choose(p, { title: `Donner l'icône ${TYPE_NAME[ty]}`, cands: pool.map((o) => o.u), min: 1, max: 1, src: me.id });
    if (u) X.mod({ t: "icon", u, ty, until: "phase" });
  }, { text: `Action : agenouillez ${c.name} : un de vos personnages gagne l'icône {${ty}} jusqu'à la fin de la phase.` }),
  actDraw: ([n], c) => action("any", (X, me) => !me.k, function* (X, me) { X.kneel(me); X.draw(X.ctrl(me), num(n)); }, { text: `Action : agenouillez ${c.name} pour piocher ${carte(num(n))}.` }),
  actGold: ([n], c) => action("marshal", (X, me) => !me.k, function* (X, me) { X.kneel(me); X.gainGold(X.ctrl(me), num(n)); }, { text: `Action : agenouillez ${c.name} pour gagner ${num(n)} or.` }),
  actKneel: ([m], c) => action("any", (X, me) => !me.k && X.ctrl(me).gold >= 1 && X.opps(X.ctrl(me)).some((o) => X.chars(o).some((x) => !x.k && X.str(x) <= num(m))), function* (X, me) {
    X.kneel(me); X.ctrl(me).gold -= 1; yield* kneelOpp(X, me, num(m), "Agenouiller un personnage adverse");
  }, { text: `Action : agenouillez ${c.name} et payez 1 or pour agenouiller un personnage adverse de force ${num(m)} ou moins.` }),
  actSacKill: ([m], c) => action("any", (X, me) => X.opps(X.ctrl(me)).some((o) => X.chars(o).some((x) => X.str(x) <= num(m))), function* (X, me) {
    yield* X.sacrifice(me); yield* killOpp(X, me, (o) => X.str(o) <= num(m), "Tuer un personnage adverse");
  }, { text: `Action : sacrifiez ${c.name} pour tuer un personnage adverse de force ${num(m)} ou moins.` }),
  actSacDraw: ([n], c) => action("any", () => true, function* (X, me) { const p = X.ctrl(me); yield* X.sacrifice(me); X.draw(p, num(n)); }, { text: `Action : sacrifiez ${c.name} pour piocher ${carte(num(n))}.` }),

  /* -------------------------------- objets -------------------------------- */
  attStr: ([n]) => statik({ text: `Le personnage attaché gagne +${num(n)} force.`, str: (X, me, tg) => (me.host === tg.u ? num(n) : 0) }),
  attIcon: ([ty]) => statik({ text: `Le personnage attaché gagne l'icône {${ty}}.`, icon: (X, me, tg, q) => (me.host === tg.u && q === ty ? 1 : 0) }),
  attKw: ([k]) => statik({ text: `Le personnage attaché gagne ${KEYWORDS[k] ? KEYWORDS[k].name : k}.`, kw: (X, me, tg, q) => me.host === tg.u && q === k }),
  attNeg: ([n]) => statik({ hostile: true, text: `Le personnage attaché perd ${num(n)} force.`, str: (X, me, tg) => (me.host === tg.u ? -num(n) : 0) }),
  attNoIcon: ([ty]) => statik({ hostile: true, text: `Le personnage attaché perd l'icône {${ty}}.`, icon: (X, me, tg, q) => (me.host === tg.u && q === ty ? -1 : 0) }),
  attNoStand: () => statik({ hostile: true, text: `Le personnage attaché ne se redresse pas pendant la phase de Redressement.`, noStand: (X, me, inst) => me.host === inst.u }),
  attNoAttack: () => statik({ hostile: true, text: `Le personnage attaché ne peut pas attaquer.`, noAttack: (X, me, inst) => me.host === inst.u }),
  attNoDefend: () => statik({ hostile: true, text: `Le personnage attaché ne peut pas défendre.`, noDefend: (X, me, inst) => me.host === inst.u }),
  attSave: () => interrupt("wouldDie", (X, me, ev) => !ev.saved && ev.inst.u === me.host, function* (X, me, ev) { ev.saved = true; yield* X.discardFromPlay(me); }, { text: `Interruption : quand le personnage attaché devrait être tué, défaussez cet objet pour le sauver.` }),
  attWinDraw: ([n]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && me.host && ev.ch.parts.includes(me.host), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après que le personnage attaché a gagné un défi, piochez ${carte(num(n))}.` }),
  attStand: () => action("any", (X, me) => !me.k && X.inst(me.host) && X.inst(me.host).k && X.ctrl(X.inst(me.host)) === X.ctrl(me), function* (X, me) { X.kneel(me); X.stand(X.inst(me.host)); }, { text: `Action : agenouillez cet objet pour redresser le personnage attaché.` }),

  /* ------------------------------ événements ------------------------------ */
  evBuff: ([n]) => evt("action", { when: "challenge", can: (X, me) => partChar(X).some((o) => mine(X, me, o)), run: function* (X, me) { yield* buffOne(X, me, () => true, num(n), `+${num(n)} force`, "mine"); }, text: `Action : un de vos personnages participants gagne +${num(n)} force jusqu'à la fin du défi.` }),
  evBuffTrait: ([t, n]) => evt("action", { when: "challenge", can: (X, me) => partChar(X).some((o) => mine(X, me, o) && X.hasTrait(o, t)), run: function* (X, me) {
    for (const o of partChar(X)) if (mine(X, me, o) && X.hasTrait(o, t)) X.mod({ t: "str", u: o.u, n: num(n), until: "challenge" });
  }, text: `Action : chacun de vos ${perso(t, true)} participants gagne +${num(n)} force jusqu'à la fin du défi.` }),
  evMinus: ([n]) => evt("action", { when: "challenge", can: (X, me) => partChar(X).some((o) => !mine(X, me, o) && X.targetable(o, me)), run: function* (X, me) { yield* buffOne(X, me, () => true, -num(n), `-${num(n)} force`, "opp"); }, text: `Action : un personnage adverse participant perd ${num(n)} force jusqu'à la fin du défi.` }),
  evStand: ([t]) => evt("action", { when: "any", can: (X, me) => X.chars(X.ctrl(me)).some((o) => o.k && (anyT(t) || X.hasTrait(o, t))), run: function* (X, me) { yield* standMine(X, me, t, "Redresser un personnage"); }, text: `Action : redressez un de vos ${perso(t, true)}.` }),
  evStandAll: ([t]) => evt("action", { when: "any", can: (X, me) => X.chars(X.ctrl(me)).some((o) => o.k && (anyT(t) || X.hasTrait(o, t))), run: function* (X, me) {
    for (const o of X.chars(X.ctrl(me))) if (anyT(t) || X.hasTrait(o, t)) X.stand(o);
  }, text: `Action : redressez tous vos ${perso(t, true)}.` }),
  evKneel: ([m]) => evt("action", { when: "any", can: (X, me) => X.opps(X.ctrl(me)).some((o) => X.chars(o).some((x) => !x.k && X.str(x) <= num(m) && X.targetable(x, me))), run: function* (X, me) { yield* kneelOpp(X, me, num(m), "Agenouiller un personnage"); }, text: `Action : agenouillez un personnage adverse de force ${num(m)} ou moins.` }),
  evKill: ([m]) => evt("action", { when: "any", can: (X, me) => X.opps(X.ctrl(me)).some((o) => X.chars(o).some((x) => x.k && X.str(x) <= num(m) && X.targetable(x, me))), run: function* (X, me) { yield* killOpp(X, me, (o) => o.k && X.str(o) <= num(m), "Tuer un personnage agenouillé"); }, text: `Action : tuez un personnage adverse agenouillé de force ${num(m)} ou moins.` }),
  evKillAll: ([m]) => evt("action", { when: "any", can: (X) => X.allChars().some((x) => X.str(x) <= num(m)), run: function* (X, me) {
    for (const o of X.allChars().filter((x) => X.str(x) <= num(m))) yield* X.kill(o, me);
  }, text: `Action : tuez chaque personnage (le vôtre compris) de force ${num(m)} ou moins.` }),
  evSave: ([t]) => evt("interrupt", { on: "wouldDie", cond: (X, me, ev) => !ev.saved && ev.p === X.ctrl(me) && (anyT(t) || X.hasTrait(ev.inst, t)), run: function* (X, me, ev) { ev.saved = true; }, text: `Interruption : quand un de vos ${perso(t, true)} devrait être tué, sauvez-le.` }),
  evDraw: ([n]) => evt("action", { when: "any", can: () => true, run: function* (X, me) { X.draw(X.ctrl(me), num(n)); }, text: `Action : piochez ${carte(num(n))}.` }),
  evGold: ([n]) => evt("action", { when: "marshal", can: () => true, run: function* (X, me) { X.gainGold(X.ctrl(me), num(n)); }, text: `Action (Recrutement) : gagnez ${num(n)} or.` }),
  evBounce: ([m]) => evt("action", { when: "any", can: (X, me) => X.allChars().some((o) => X.card(o).cost <= num(m) && X.targetable(o, me)), run: function* (X, me) {
    const p = X.ctrl(me);
    const pool = X.allChars().filter((o) => X.card(o).cost <= num(m) && X.targetable(o, me));
    const [u] = yield* X.choose(p, { title: "Renvoyer un personnage en main", cands: pool.map((o) => o.u), min: 1, max: 1, src: me.id, harm: true });
    if (u) yield* X.returnToHand(X.inst(u));
  }, text: `Action : remettez un personnage de coût ${num(m)} ou moins dans la main de son propriétaire.` }),
  evRecall: ([t]) => evt("action", { when: "any", can: (X, me) => X.ctrl(me).disc.some((c) => X.card(c).type === "char" && (anyT(t) || X.cardHasTrait(X.card(c), t))), run: function* (X, me) { yield* recallFromDiscard(X, X.ctrl(me), t, me); }, text: `Action : reprenez en main un ${perso(t)} de votre défausse.` }),
  evRevive: () => evt("react", { on: "killed", cond: (X, me, ev) => ev.p === X.ctrl(me) && X.ctrl(me).dead.includes(ev.inst), run: function* (X, me, ev) { X.fromDeadToHand(ev.p, ev.inst.u); }, text: `Réaction : après qu'un de vos personnages a été tué, remettez-le dans votre main.` }),
  evWinPower: ([t, n]) => evt("react", { on: "win", cond: (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), run: function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, text: `Réaction : après avoir gagné ${unDefi(t)}, gagnez ${num(n)} Pouvoir.` }),
  evWinDraw: ([t, n]) => evt("react", { on: "win", cond: (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), run: function* (X, me) { X.draw(X.ctrl(me), num(n)); }, text: `Réaction : après avoir gagné ${unDefi(t)}, piochez ${carte(num(n))}.` }),
  evWinKill: ([t, m]) => evt("react", { on: "win", cond: (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch) && ev.ch.parts.some((u) => { const o = X.inst(u); return o && X.ctrl(o) === ev.loser && X.str(o) <= num(m); }), run: function* (X, me, ev) {
    yield* killOpp(X, me, (o) => X.str(o) <= num(m), "Tuer un personnage du perdant", ev.ch.parts.map((u) => X.inst(u)).filter((o) => o && X.ctrl(o) === ev.loser));
  }, text: `Réaction : après avoir gagné ${unDefi(t)}, tuez un personnage participant du perdant de force ${num(m)} ou moins.` }),
  evClaim: ([n]) => evt("action", { when: "challenge", can: (X, me) => X.G.ch && X.G.ch.att === X.ctrl(me).id, run: function* (X, me) { X.G.ch.claimMod += num(n); X.log(`La revendication du défi augmente de ${num(n)}.`); }, text: `Action : la revendication du défi où vous attaquez augmente de ${num(n)}.` }),
  evCancel: () => evt("interrupt", { on: "claim", cond: (X, me, ev) => !ev.cancel && ev.target === X.ctrl(me), run: function* (X, me, ev) { ev.cancel = true; }, text: `Interruption : quand la revendication d'un défi s'applique contre vous, annulez-la.` }),
  evDiscard: ([n]) => evt("action", { when: "any", can: (X, me) => X.opps(X.ctrl(me)).some((o) => o.hand.length), run: function* (X, me) {
    const p = X.ctrl(me);
    const o = yield* X.chooseOpp(p, "Quel adversaire ?", (q) => q.hand.length > 0);
    if (o) X.discardRandom(o, num(n), me);
  }, text: `Action : choisissez un adversaire, il défausse ${carte(num(n))} au hasard.` }),
  evSteal: ([n]) => evt("action", { when: "any", can: (X, me) => X.opps(X.ctrl(me)).some((o) => o.gold > 0), run: function* (X, me) {
    const p = X.ctrl(me);
    const o = yield* X.chooseOpp(p, "Prendre de l'or à…", (q) => q.gold > 0);
    if (o) X.stealGold(o, p, num(n));
  }, text: `Action : prenez ${num(n)} or à un adversaire.` }),
  evPowerSteal: ([n]) => evt("action", { when: "any", can: (X, me) => X.opps(X.ctrl(me)).some((o) => o.power > 0), run: function* (X, me) {
    const p = X.ctrl(me);
    const o = yield* X.chooseOpp(p, "Voler du Pouvoir à…", (q) => q.power > 0);
    if (o) X.movePower(o, p, num(n));
  }, text: `Action : déplacez ${num(n)} Pouvoir de la famille d'un adversaire vers la vôtre.` }),
  evDomPower: ([n]) => evt("react", { on: "dom", cond: (X, me, ev) => ev.p === X.ctrl(me), run: function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, text: `Réaction : après avoir gagné la Domination, gagnez ${num(n)} Pouvoir.` }),
  evPutPlay: ([t, m]) => evt("action", { when: "any", can: (X, me) => X.ctrl(me).hand.some((c) => c !== me && X.card(c).type === "char" && X.card(c).cost <= num(m) && (anyT(t) || X.cardHasTrait(X.card(c), t)) && X.canEnter(X.ctrl(me), c)), run: function* (X, me) {
    const p = X.ctrl(me);
    const pool = p.hand.filter((c) => c !== me && X.card(c).type === "char" && X.card(c).cost <= num(m) && (anyT(t) || X.cardHasTrait(X.card(c), t)) && X.canEnter(p, c));
    const [u] = yield* X.choose(p, { title: "Mettre en jeu", cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id, zone: "hand" });
    if (u) yield* X.putIntoPlay(p, X.inst(u), "hand");
  }, text: `Action : mettez en jeu depuis votre main un ${perso(t)} de coût ${num(m)} ou moins.` }),

  /* ------------------------------ scénarios ------------------------------ */
  plDraw: ([n]) => plot({ text: `Une fois révélé : piochez ${carte(num(n))}.`, reveal: function* (X, me) { X.draw(X.ctrl(me), num(n)); } }),
  plSearch: ([k]) => plot({
    text: `Une fois révélé : cherchez ${anyT(k) ? "une carte" : `un ${KIND_NAME[k]}`} dans votre deck, ajoutez-${anyT(k) ? "la" : "le"} à votre main, puis mélangez.`,
    reveal: function* (X, me) { yield* X.search(X.ctrl(me), (d) => anyT(k) || d.type === k, 999, me); },
  }),
  plRecall: () => plot({ text: `Une fois révélé : reprenez en main un personnage de votre défausse.`, reveal: function* (X, me) { yield* recallFromDiscard(X, X.ctrl(me), "*", me); } }),
  plKillEach: () => plot({ text: `Une fois révélé : chaque joueur choisit un de ses personnages et le tue.`, reveal: function* (X, me) {
    for (const p of X.order()) {
      const pool = X.chars(p);
      if (!pool.length) continue;
      const [u] = yield* X.choose(p, { title: "Tuer un de vos personnages", cands: pool.map((c) => c.u), min: 1, max: 1, src: me.id, sacrifice: true });
      if (u) yield* X.kill(X.inst(u), me);
    }
  } }),
  plKillWeak: ([m]) => plot({ text: `Une fois révélé : tuez chaque personnage de force ${num(m)} ou moins.`, reveal: function* (X, me) {
    for (const o of X.allChars().filter((x) => X.str(x) <= num(m))) yield* X.kill(o, me);
  } }),
  plDiscard: ([n]) => plot({ text: `Une fois révélé : chaque adversaire défausse ${carte(num(n))} au hasard.`, reveal: function* (X, me) { for (const o of X.opps(X.ctrl(me))) X.discardRandom(o, num(n), me); } }),
  plKneel: () => plot({ text: `Une fois révélé : agenouillez un personnage adverse.`, reveal: function* (X, me) { yield* kneelOpp(X, me, 99, "Agenouiller un personnage adverse"); } }),
  plEachDraw: ([n]) => plot({ text: `Une fois révélé : chaque joueur pioche ${carte(num(n))}.`, reveal: function* (X) { for (const p of X.order()) X.draw(p, num(n)); } }),
  plCatchUp: ([n]) => plot({ text: `Une fois révélé : si personne n'a moins de Pouvoir que vous, gagnez ${num(n)} Pouvoir.`, reveal: function* (X, me) {
    const p = X.ctrl(me);
    if (X.opps(p).every((o) => X.totalPower(o) >= X.totalPower(p))) X.gainPower(p, num(n), null, me);
  } }),
  plClaim: ([ty, n]) => plot({ text: `Ce round, vos défis {${ty}} ont +${num(n)} revendication.`, claim: (X, me, ch) => (X.isCurrentPlot(me) && ch.att === me.o && ch.type === ty ? num(n) : 0) }),
  plNo: ([ty]) => plot({ text: `Ce round, aucun défi {${ty}} ne peut être lancé.`, noCh: (X, me, q) => X.isCurrentPlot(me) && q === ty }),
  plExtra: ([ty]) => plot({ text: `Ce round, vous pouvez lancer un défi {${ty}} supplémentaire.`, extraCh: (X, me, p, q) => (X.isCurrentPlot(me) && me.o === p.id && q === ty ? 1 : 0) }),
  plDom: ([n]) => plot({ text: `Ce round, le vainqueur de la Domination gagne ${num(n)} Pouvoir de plus.`, domBonus: (X, me) => (X.isCurrentPlot(me) ? num(n) : 0) }),
  plNoDom: () => plot({ text: `Ce round, il n'y a pas de Domination.`, noDom: (X, me) => X.isCurrentPlot(me) }),
  plCheap: ([n]) => plot({ text: `Ce round, le premier personnage que vous recrutez coûte ${num(n)} de moins.`, reveal: function* (X, me) { X.ctrl(me).cheap = num(n); } }),
  plTrait: ([t, n]) => plot({ text: `Ce round, chaque personnage *${t}* (de tous les joueurs) gagne +${num(n)} force.`, str: (X, me, tg) => (X.isCurrentPlot(me) && X.hasTrait(tg, t) ? num(n) : 0) }),
  plUnopp: ([n]) => plot({ text: `Ce round, gagner un défi sans opposition rapporte ${num(n)} Pouvoir de plus.`, unoppBonus: (X, me, p) => (X.isCurrentPlot(me) && me.o === p.id ? num(n) : 0) }),
  plDrawMore: ([n]) => plot({ text: `Ce round, chaque joueur pioche ${carte(num(n))} de plus pendant la phase de Pioche.`, drawBonus: (X, me) => (X.isCurrentPlot(me) ? num(n) : 0) }),
  plStandOne: () => plot({ text: `Une fois révélé : redressez un de vos personnages et gagnez 1 or.`, reveal: function* (X, me) { X.gainGold(X.ctrl(me), 1); yield* standMine(X, me, "*", "Redresser un personnage"); } }),

  /* ------------------------ bonus de famille (passifs) ------------------------ */
  fWinDraw: ([t, n]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné ${unDefi(t)}, piochez ${carte(num(n))} (une fois par round).` }),
  fWinGold: ([t, n]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), function* (X, me) { X.gainGold(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné ${unDefi(t)}, gagnez ${num(n)} or (une fois par round).` }),
  fWinPower: ([t, n]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), function* (X, me) { X.gainPower(X.ctrl(me), num(n), null, me); }, { text: `Réaction : après avoir gagné ${unDefi(t)}, gagnez ${num(n)} Pouvoir (une fois par round).` }),
  fWinStand: ([t]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch) && ev.ch.parts.some((u) => { const o = X.inst(u); return o && o.k && X.ctrl(o) === X.ctrl(me); }), function* (X, me, ev) {
    const p = X.ctrl(me);
    const pool = ev.ch.parts.map((u) => X.inst(u)).filter((o) => o && o.k && X.ctrl(o) === p);
    const [u] = yield* X.choose(p, { title: "Redresser un personnage", cands: pool.map((o) => o.u), min: 1, max: 1, src: null });
    if (u) X.stand(X.inst(u));
  }, { text: `Réaction : après avoir gagné ${unDefi(t)}, redressez un de vos personnages participants (une fois par round).` }),
  fLoseDraw: ([t, n]) => react("lose", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir perdu ${unDefi(t)}, piochez ${carte(num(n))} (une fois par round).` }),
  fDomDraw: ([n]) => react("dom", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après avoir gagné la Domination, piochez ${carte(num(n))}.` }),
  fKillDraw: ([n]) => react("killed", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.draw(X.ctrl(me), num(n)); }, { text: `Réaction : après la mort d'un de vos personnages, piochez ${carte(num(n))} (une fois par round).` }),
  fEnterGold: ([t]) => react("enter", (X, me, ev) => ev.p === X.ctrl(me) && X.card(ev.inst).type === "char" && (anyT(t) || X.hasTrait(ev.inst, t)), function* (X, me) { X.gainGold(X.ctrl(me), 1); }, { text: `Réaction : après qu'un de vos ${perso(t, true)} entre en jeu, gagnez 1 or (une fois par round).` }),
  fFirstGold: ([n]) => react("first", (X, me, ev) => ev.p === X.ctrl(me), function* (X, me) { X.gainGold(X.ctrl(me), num(n)); }, { text: `Réaction : après être devenu premier joueur, gagnez ${num(n)} or.` }),
  fWinKneel: ([t]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch) && ev.loser.chars.some((c) => !c.k), function* (X, me, ev) { yield* kneelOpp(X, me, 99, "Agenouiller un personnage du perdant", ev.loser); }, { text: `Réaction : après avoir gagné ${unDefi(t)}, agenouillez un personnage du perdant (une fois par round).` }),
  fWinDiscard: ([t, n]) => react("win", (X, me, ev) => ev.p === X.ctrl(me) && typeOk(t, ev.ch) && ev.loser.hand.length > 0, function* (X, me, ev) { X.discardRandom(ev.loser, num(n), me); }, { text: `Réaction : après avoir gagné ${unDefi(t)}, le perdant défausse ${carte(num(n))} au hasard (une fois par round).` }),
  defAuraT: ([t, n]) => statik({ text: `Vos ${perso(t, true)} qui défendent gagnent +${num(n)} force.`, str: (X, me, tg) => (X.inPlay(me) && mine(X, me, tg) && X.isDefending(tg) && (anyT(t) || X.hasTrait(tg, t)) ? num(n) : 0) }),
};

/** Lit "modèle:a,b@Nom" et renvoie l'effet prêt pour le moteur (avec son texte). Lève une erreur si le modèle est inconnu. */
export function compileAbility(spec, card) {
  const [body, name] = String(spec).split("@");
  const [tpl, args = ""] = body.split(":");
  const make = TPL[tpl.trim()];
  if (!make) throw new Error(`Effet inconnu « ${tpl} » sur ${card.name}`);
  const a = args ? args.split(",").map((x) => x.trim()) : [];
  const ab = make(a, card);
  return { ...ab, tpl: tpl.trim(), args: a, name: name ? name.trim() : "" };
}

/** Effets par défaut d'une carte de famille sans bonus particulier. */
export const NO_ABILITY = [];
