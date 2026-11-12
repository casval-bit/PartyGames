// Tests du Trône des Mondes : données des cartes, règles de deck, decks de départ, et parties complètes bot contre bot.
// Lancer : node tools/test-tcg.js            (rapide)
//          node tools/test-tcg.js --sim 400  (tournoi d'équilibrage : taux de victoire par deck de départ)
import { CARD, ALL, PLOTS, FAMILIES, PLAYABLE } from "../src/tcg/cards/index.js";
import { validateDeck, starters, buildStarter } from "../src/tcg/deck.js";
import { Game, createGame, makeApi } from "../src/tcg/engine.js";
import { plain } from "../src/tcg/rules.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else if (!process.argv.includes("--quiet")) console.log("ok    :", m); };
const simN = (() => { const i = process.argv.indexOf("--sim"); return i > 0 ? +process.argv[i + 1] || 200 : 0; })();

/* ---------------- données ---------------- */
ok(ALL.length > 40, `${ALL.length} cartes à collectionner, ${PLOTS.length} scénarios, ${PLAYABLE.length} familles jouables`);
ok(ALL.every((d) => d.name && d.type && Number.isFinite(d.cost)), "chaque carte a un nom, un type et un coût");
ok(ALL.filter((d) => d.type === "char").every((d) => Number.isFinite(d.str) && (d.icons.combat || d.icons.ruse || d.icons.influence)), "chaque personnage a une force et au moins une icône");
ok(ALL.every((d) => d.abs.every((ab) => typeof ab.text === "string" && ab.text.length > 5 && !/undefined|NaN/.test(ab.text))), "tous les textes d'effets sont complets");
ok(PLOTS.every((p) => p.inc >= 0 && p.ini >= 0 && p.res >= 3), "scénarios : revenu, initiative et réserve valides");
ok(ALL.every((d) => ["C", "U", "R", "E", "L"].includes(d.r)), "raretés valides");
const keyCost = {};
for (const d of ALL) { (keyCost[d.key] = keyCost[d.key] || []).push(d); }
ok(Object.values(keyCost).every((l) => new Set(l.map((d) => d.fam)).size === 1), "les versions d'un même personnage sont dans la même famille");

/* ---------------- règles de deck ---------------- */
const st = starters();
ok(st.length >= PLAYABLE.length, `${st.length} decks de départ`);
for (const s of st) {
  const v = validateDeck(s);
  ok(v.ok, `deck de départ « ${s.name} » valide${v.ok ? "" : " : " + v.errors.join(" / ")}`);
}
const s0 = st[0];
const twoVersions = ALL.find((d) => d.fam === s0.fam && d.type === "char" && Object.keys(s0.cards).some((id) => CARD[id].key === d.key && id !== d.id));
if (twoVersions) {
  const bad = { ...s0, cards: { ...s0.cards, [twoVersions.id]: 1 } };
  const first = Object.keys(bad.cards).find((id) => CARD[id].type === "char" && id !== twoVersions.id && CARD[id].key !== twoVersions.key);
  bad.cards[first] -= 1; if (!bad.cards[first]) delete bad.cards[first];
  const v = validateDeck(bad);
  ok(!v.ok && v.errors.some((e) => e.includes("Une seule version")), "deux versions du même personnage : refusé avec un message");
}
ok(!validateDeck({ ...s0, cards: { ...s0.cards, [Object.keys(s0.cards)[0]]: 3 } }).ok, "3 exemplaires d'une carte : refusé");
ok(validateDeck(s0, {}).errors.some((e) => e.startsWith("Il te manque")), "cartes non possédées : refusé");

/* ---------------- parties ---------------- */
function play(decks, seed, goal = 15) {
  const g = new Game({ players: decks.map((d, i) => ({ id: "b" + i, name: "Bot" + i, bot: true, deck: d })), seed, goal });
  return g;
}
let t0 = Date.now();
let ended = 0, rounds = 0, errors = 0;
for (let i = 0; i < 40; i++) {
  const a = st[i % st.length], b = st[(i * 7 + 3) % st.length];
  try {
    const g = play([a, b], 1000 + i);
    if (g.G.over && g.G.winner) { ended++; rounds += g.G.round; } else console.log("partie non terminée", a.name, b.name, g.G.round, g.G.phase, g.wait && g.wait.kind);
  } catch (e) { errors++; if (errors < 4) console.log(e.stack); }
}
ok(errors === 0, "aucune erreur pendant 40 duels bot contre bot");
ok(ended === 40, `40 duels terminés (${(rounds / Math.max(1, ended)).toFixed(1)} rounds en moyenne, ${Date.now() - t0} ms)`);
t0 = Date.now(); ended = 0; errors = 0;
for (let i = 0; i < 12; i++) {
  const n = 3 + (i % 2);
  const decks = Array.from({ length: n }, (_, k) => st[(i * 3 + k * 5) % st.length]);
  try { const g = play(decks, 5000 + i); if (g.G.over) ended++; } catch (e) { errors++; if (errors < 3) console.log(e.stack); }
}
ok(errors === 0 && ended === 12, `12 mêlées à 3 ou 4 joueurs terminées sans erreur (${Date.now() - t0} ms)`);

// partie avec un humain qui répond « au plus simple » (la valeur par défaut) : le moteur doit avancer
{
  const g = new Game({ players: [{ id: "h", name: "Humain", deck: st[0] }, { id: "b", name: "Bot", bot: true, deck: st[1] }], seed: 77 });
  let n = 0;
  while (!g.G.over && n++ < 5000) { if (!g.wait) break; for (const id of g.waitingFor()) g.auto(id); }
  ok(g.G.over, `partie humain (joué automatiquement) terminée en ${n} réponses`);
  ok(g.G.log.length > 20 && g.G.log.every((l) => typeof l.t === "string"), "journal de partie rempli");
}

/* ---------------- effets des grandes cartes (coût 7) ---------------- */
{
  // une table de test : tout est en jeu, debout ; `drive` répond aux questions (premier choix possible)
  const table = (idsA, idsB) => {
    const deck = (ids) => ({ fam: CARD[ids[0]].fam, pt: null, cards: Object.fromEntries(ids.map((id) => [id, 1])), plots: [], name: "test" });
    const G = createGame({ players: [{ id: "a", name: "A", deck: deck(idsA) }, { id: "b", name: "B", deck: deck(idsB) }], seed: 3 });
    const X = makeApi(G);
    for (const p of G.players) for (const c of [...p.deck]) { p.deck.splice(p.deck.indexOf(c), 1); c.z = "char"; p.chars.push(c); }
    const of = (p, id) => p.chars.find((c) => c.id === id);
    return { G, X, A: G.players[0], B: G.players[1], of };
  };
  const drive = (gen) => {
    let r = gen.next(), n = 0;
    while (!r.done && n++ < 40) { const q = r.value; r = gen.next(q.kind === "choose" ? q.cands.slice(0, Math.max(1, q.min)) : q.kind === "option" ? q.opts[0].id : q.dflt(q.who[0])); }
    return r.value;
  };
  const ab = (id, tpl) => CARD[id].abs.find((a) => a.tpl === tpl);
  const small = ["onepiece-coby-1", "onepiece-usopp-2", "onepiece-nami-3"]; // force 1, 1, 2
  let t = table(["marvel-thor-7"], [...small, "onepiece-sanji-4"]);
  let me = t.of(t.A, "marvel-thor-7");
  drive(ab("marvel-thor-7", "enterKneelAll").run(t.X, me, { inst: me }));
  ok(t.B.chars.filter((c) => t.X.str(c) <= 2).every((c) => c.k) && !t.of(t.B, "onepiece-sanji-4").k, "Thor 7 : agenouille chaque adversaire de force 2 ou moins, pas les autres");

  t = table(["marvel-scarlet-witch-7"], ["onepiece-sanji-4"]);
  me = t.of(t.A, "marvel-scarlet-witch-7");
  drive(ab("marvel-scarlet-witch-7", "enterFreeze").run(t.X, me, { inst: me }));
  const sj = t.of(t.B, "onepiece-sanji-4");
  ok(sj.k && t.X.noStand(sj), "Scarlet Witch 7 : la cible est gelée (ne se redresse pas)");

  t = table(["marvel-doctor-strange-7", "marvel-captain-america-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "marvel-doctor-strange-7");
  const cap = t.of(t.A, "marvel-captain-america-7");
  t.X.toPile(cap, "dead");
  const hulkBack = t.A.chars.length;
  drive(ab("marvel-doctor-strange-7", "enterRevive").run(t.X, me, { inst: me }));
  ok(t.A.chars.length === hulkBack && t.A.dead.length === 1, "Doctor Strange 7 : coût 7 trop cher pour revenir");
  t = table(["marvel-doctor-strange-7", "marvel-spider-man-4"], ["onepiece-coby-1"]);
  me = t.of(t.A, "marvel-doctor-strange-7");
  t.X.toPile(t.of(t.A, "marvel-spider-man-4"), "dead");
  drive(ab("marvel-doctor-strange-7", "enterRevive").run(t.X, me, { inst: me }));
  ok(t.A.chars.some((c) => c.id === "marvel-spider-man-4") && !t.A.dead.length, "Doctor Strange 7 : ramène un allié de la pile des morts");

  t = table(["marvel-captain-america-7", "marvel-black-widow-3"], ["onepiece-coby-1"]);
  me = t.of(t.A, "marvel-captain-america-7");
  t.X.toPile(t.of(t.A, "marvel-black-widow-3"), "hand");
  drive(ab("marvel-captain-america-7", "enterPutPlay").run(t.X, me, { inst: me }));
  ok(t.A.chars.some((c) => c.id === "marvel-black-widow-3"), "Captain America 7 : un Avenger de la main entre en jeu");

  t = table(["toystory-buzz-l-eclair-7", "toystory-woody-4"], ["onepiece-coby-1"]);
  me = t.of(t.A, "toystory-buzz-l-eclair-7");
  const wd = t.of(t.A, "toystory-woody-4");
  me.k = true; wd.k = true;
  drive(ab("toystory-buzz-l-eclair-7", "winStandAll").run(t.X, me, { p: t.A, loser: t.B, ch: { type: "combat", parts: [me.u, wd.u], atk: [me.u, wd.u], dfd: [] } }));
  ok(!me.k && !wd.k, "Buzz 7 : tous les participants se redressent après la victoire");

  t = table(["marvel-hulk-7"], ["onepiece-sanji-4", "onepiece-roronoa-zoro-6"]);
  me = t.of(t.A, "marvel-hulk-7");
  const z6 = t.of(t.B, "onepiece-roronoa-zoro-6"), s4 = t.of(t.B, "onepiece-sanji-4");
  drive(ab("marvel-hulk-7", "winBounce").run(t.X, me, { p: t.A, loser: t.B, ch: { type: "combat", parts: [me.u, z6.u, s4.u] } }));
  ok(t.B.hand.includes(s4) && t.B.chars.includes(z6), "Hulk 7 : renvoie en main un participant de coût 4 ou moins (pas Zoro 6)");

  t = table(["onepiece-marshall-d-teach-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "onepiece-marshall-d-teach-7");
  t.B.power = 3;
  drive(ab("onepiece-marshall-d-teach-7", "winPowerSteal").run(t.X, me, { p: t.A, loser: t.B, ch: { type: "ruse", parts: [me.u] } }));
  ok(t.B.power === 2 && t.A.power === 1, "Barbe Noire 7 : prend 1 Pouvoir au perdant");

  t = table(["hunger-finnick-odair-7"], ["onepiece-sanji-4"]);
  me = t.of(t.A, "hunger-finnick-odair-7");
  drive(ab("hunger-finnick-odair-7", "winFreeze").run(t.X, me, { p: t.A, loser: t.B, ch: { type: "combat", parts: [me.u] } }));
  ok(t.of(t.B, "onepiece-sanji-4").k && t.X.noStand(t.of(t.B, "onepiece-sanji-4")), "Finnick 7 : le filet gèle un personnage du perdant");

  t = table(["bebop-jet-black-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "bebop-jet-black-7");
  const evd = { p: t.A, loser: t.B, ch: { type: "combat", parts: [me.u], atk: [], dfd: [me.u] } };
  ok(ab("bebop-jet-black-7", "defWinPower").cond(t.X, me, evd) && !ab("bebop-jet-black-7", "defWinPower").cond(t.X, me, { ...evd, ch: { ...evd.ch, atk: [me.u], dfd: [] } }), "Jet Black 7 : Pouvoir seulement en gagnant en défense");

  t = table(["teenwolf-peter-hale-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "teenwolf-peter-hale-7");
  t.X.toPile(me, "dead");
  drive(ab("teenwolf-peter-hale-7", "dieReturn").run(t.X, me, { inst: me, p: t.A }));
  ok(t.A.hand.includes(me), "Peter Hale 7 : revient dans la main après sa mort");

  t = table(["dc-lex-luthor-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "dc-lex-luthor-7");
  t.B.power = 2;
  drive(ab("dc-lex-luthor-7", "domSteal").run(t.X, me, { p: t.A }));
  ok(t.A.power === 1 && t.B.power === 1, "Lex Luthor 7 : la Domination vole 1 Pouvoir");
  ok(t.X.taxOf(t.B, CARD["onepiece-coby-1"]) === 1 && t.X.taxOf(t.A, CARD["onepiece-coby-1"]) === 0, "Lex Luthor 7 : les personnages adverses coûtent 1 de plus (pas les siens)");

  t = table(["onepiece-kaido-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "onepiece-kaido-7");
  const ev = { ev: "wouldDie", inst: me, p: t.A, saved: false };
  ok(ab("onepiece-kaido-7", "selfGuard").cond(t.X, me, ev), "Kaido 7 : peut se sauver tant qu'il est debout");
  drive(ab("onepiece-kaido-7", "selfGuard").run(t.X, me, ev));
  ok(ev.saved && me.k && !ab("onepiece-kaido-7", "selfGuard").cond(t.X, me, { ...ev, saved: false }), "Kaido 7 : sauvé en s'agenouillant (plus possible une fois agenouillé)");

  t = table(["onepiece-sanji-7", "onepiece-nami-3", "onepiece-usopp-2", "onepiece-smoker-4"], ["onepiece-coby-1"]);
  me = t.of(t.A, "onepiece-sanji-7");
  for (const c of t.A.chars) if (c !== me) c.k = true;
  drive(ab("onepiece-sanji-7", "actStandAll").run(t.X, me));
  ok(me.k && !t.of(t.A, "onepiece-nami-3").k && !t.of(t.A, "onepiece-usopp-2").k && t.of(t.A, "onepiece-smoker-4").k, "Sanji 7 : redresse les Chapeaux de paille (pas Smoker)");

  t = table(["umbrella-allison-hargreeves-7"], ["onepiece-sanji-4"]);
  me = t.of(t.A, "umbrella-allison-hargreeves-7");
  drive(ab("umbrella-allison-hargreeves-7", "actSilence").run(t.X, me));
  const tg = t.of(t.B, "onepiece-sanji-4");
  ok(t.X.noAttack(tg) && t.X.noDefend(tg) && me.k, "Allison 7 : la rumeur empêche d'attaquer et de défendre");

  t = table(["onepiece-monkey-d-luffy-7-2"], ["onepiece-nami-3", "onepiece-sanji-4"]);
  me = t.of(t.A, "onepiece-monkey-d-luffy-7-2");
  t.G.ch = { type: "combat", att: "a", def: "b", atk: [me.u], dfd: [], parts: [], claimMod: 0 };
  ok(t.X.noDefend(t.of(t.B, "onepiece-nami-3")) && !t.X.noDefend(t.of(t.B, "onepiece-sanji-4")), "Luffy 7 (Gear Fourth) : les personnages de force 3 ou moins ne peuvent pas défendre");
  t.G.ch = null;
  ok(!t.X.noDefend(t.of(t.B, "onepiece-nami-3")), "… seulement pendant qu'il attaque");

  t = table(["lol-janna-7", "lol-vi-5"], ["onepiece-coby-1"]);
  ok(t.X.immune(t.of(t.A, "lol-vi-5")) && !t.X.immune(t.of(t.B, "onepiece-coby-1")), "Janna 7 : ses alliés sont immunisés aux événements adverses");
  t = table(["lol-veigar-7"], ["onepiece-coby-1"]);
  me = t.of(t.A, "lol-veigar-7");
  const v0 = t.X.str(me); t.A.power = 8;
  ok(t.X.str(me) === v0 + 3, "Veigar 7 : +3 force à 8 Pouvoir");
  ok(/tuée, remettez-la/.test(CARD["lol-lissandra-7"].abs.map((a) => a.text).join(" ")) && /qu'Allison/.test(CARD["umbrella-allison-hargreeves-4"].abs[0].text), "textes accordés (féminin, élision)");

  // parties complètes avec les nouvelles cartes 7 dans les decks (bots)
  const sevens = ALL.filter((d) => d.type === "char" && d.cost === 7 && d.abs.some((a) => /enterKneelAll|enterFreeze|enterRevive|enterPutPlay|winStandAll|winBounce|winPowerSteal|winFreeze|defWinPower|dieReturn|domSteal|selfGuard|actStandAll|actSilence|atkTerror|immuneAura|ifPower|oppTax/.test(a.tpl)));
  let errs = 0, done = 0;
  sevens.forEach((d, i) => {
    const base = st.find((s) => s.fam === d.fam && (!d.pt.length || d.pt.includes(s.pt)));
    if (!base) return;
    const cards = { ...base.cards };
    const drop = Object.keys(cards).filter((id) => CARD[id].type === "char" && CARD[id].key !== d.key).sort((x, y) => CARD[x].cost - CARD[y].cost)[0];
    delete cards[drop]; cards[d.id] = 2;
    for (const id of Object.keys(cards)) if (CARD[id].key === d.key && id !== d.id) delete cards[id];
    try { const g = play([{ ...base, cards }, st[(i * 5 + 2) % st.length]], 7000 + i); if (g.G.over) done++; } catch (e) { errs++; if (errs < 3) console.log(e.stack); }
  });
  ok(errs === 0 && done > 30, `${sevens.length} nouvelles cartes 7 jouées par les bots : ${done} parties sans erreur`);
}

/* ---------------- tournoi d'équilibrage ---------------- */
if (simN) {
  const res = Object.fromEntries(st.map((s) => [s.id, { w: 0, n: 0, name: s.name }]));
  const famRes = {};
  for (let i = 0; i < simN; i++) {
    const a = st[Math.floor(Math.random() * st.length)];
    let b = st[Math.floor(Math.random() * st.length)];
    if (b === a) b = st[(st.indexOf(a) + 1) % st.length];
    const g = play([a, b], 90000 + i);
    const w = g.G.winner === "b0" ? a : b;
    for (const s of [a, b]) { res[s.id].n++; (famRes[s.fam] = famRes[s.fam] || { w: 0, n: 0 }).n++; }
    res[w.id].w++; famRes[w.fam].w++;
  }
  console.log("\nTaux de victoire par deck de départ :");
  for (const r of Object.values(res).sort((x, y) => y.w / Math.max(1, y.n) - x.w / Math.max(1, x.n))) console.log(`  ${(100 * r.w / Math.max(1, r.n)).toFixed(0).padStart(3)} %  (${r.n} parties)  ${r.name}`);
  console.log("Par famille :");
  for (const [f, r] of Object.entries(famRes).sort((x, y) => y[1].w / y[1].n - x[1].w / x[1].n)) console.log(`  ${(100 * r.w / r.n).toFixed(0).padStart(3)} %  ${f}`);
}

console.log(fail ? `${fail} ÉCHEC(S)` : "Trône des Mondes : tout est OK");
process.exit(fail ? 1 : 0);
void plain; void FAMILIES; void buildStarter;
