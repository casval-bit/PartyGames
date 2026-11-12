// Loup-garou version Stranger Things : moteur de règles (module pur, exécuté chez le créateur du salon).
//
// Règles des Loups-Garous de Thiercelieux (jeu de base, Nouvelle Lune, Personnages, Corbeau du Village) et rôles fanmade
// des jeux en ligne. L'appli remplace le meneur : chaque nuit, les rôles agissent sur leur téléphone (tout le monde a quelque
// chose à toucher, pour ne trahir personne), puis le jour on débat et on vote.
//
// Le déroulé est un générateur : chaque étape « produit » une attente { id, asks: { idJoueur: question } }. La classe LgGame
// garde les réponses ; quand tout le monde a répondu (ou quand le créateur ferme l'étape à la fin du minuteur), elle relance
// le générateur. Les questions « révisables » (votes) acceptent qu'on change d'avis jusqu'à la clôture.
import { ROLES, WOLF_ROLES, COMEDIEN_POWERS, TOWNSFOLK, BAVARD_WORDS, roleTitle } from "./roles.js";

const OVER = new Error("partie terminée");
const KEEP_LOG = 160;
const KEEP_CHAT = 220;

function rnd(G) { // mulberry32 : partie rejouable avec la même graine
  let t = (G.rs = (G.rs + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const shuffle = (G, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const one = (G, a) => (a.length ? a[Math.floor(rnd(G) * a.length)] : null);
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const roleLabel = (id) => (ROLES[id] ? `${ROLES[id].st} (${ROLES[id].name})` : "?");
const FAMILY_NAMES = { soeur: ["Karen Wheeler", "Claudia Henderson"], frere: ["Le chef Powell", "L'agent Callahan", "Flo"] };

/* ================================ création ================================ */
export function createGame({ players, compo, seed = 1, opts = {} }) {
  const G = {
    rs: seed >>> 0 || 1, players: [], day: 0, night: 0, phase: "setup", step: "Distribution des rôles", over: false, winner: null,
    cap: null, lovers: null, extra: [], pot: { life: true, death: true }, prot: null, salvLast: null, renardOn: true, corbeau: null,
    tetanus: null, gmlOn: true, infectUsed: false, esModel: null, sect: null, merc: null, bavard: null, dictUsed: false, jugeUsed: false,
    noPowers: false, banVote: null, blocked: null, comedien: null, know: {}, notes: {}, chat: [], chatN: 0, log: [], logN: 0,
    vote: null, wolfVotes: null, morning: [], trig: [], compo: [...compo], opts: { cap: true, ...opts },
  };
  const deck = shuffle(G, [...compo]);
  const names = shuffle(G, [...TOWNSFOLK]);
  const fam = { soeur: 0, frere: 0 };
  players.forEach((pl, i) => {
    const role = deck[i] || "villageois";
    G.players.push({ id: pl.id, name: pl.name, bot: Boolean(pl.bot), seat: i, role, camp: ROLES[role].camp, alive: true, charmed: false,
      idiot: false, life: role === "ancien" ? 2 : 1, alias: null, fresh: true, cause: null, shown: null, infected: false });
  });
  G.extra = deck.slice(players.length, players.length + 2);
  for (const p of G.players) p.alias = aliasFor(p.role, names, fam);
  // le Villageois-villageois est connu de tous
  for (const p of G.players) if (p.role === "villvill") p.shown = "villvill";
  // l'Abominable sectaire : deux clans visibles de tous
  if (G.players.some((p) => p.role === "sectaire")) {
    const order = shuffle(G, G.players.map((p) => p.id));
    G.sect = Object.fromEntries(order.map((id, i) => [id, i % 2]));
  }
  for (const p of G.players) { G.notes[p.id] = []; G.know[p.id] = {}; }
  return G;
}
function aliasFor(role, names, fam) {
  if (role === "villageois") return names.pop() || "Habitant de Hawkins";
  if (FAMILY_NAMES[role]) return FAMILY_NAMES[role][fam[role]++ % FAMILY_NAMES[role].length];
  return null;
}

/* ================================ la partie ================================ */
export class LgGame {
  /** @param {{players:{id,name,bot}[], compo:string[], seed?:number, opts?:object}} o */
  constructor(o) {
    this.G = createGame(o);
    this.wait = null;
    this.answers = {};
    this.n = 0;
    this.it = this.flow();
    this.step(undefined);
  }

  /* ---------- accès ---------- */
  P(id) { return this.G.players.find((p) => p.id === id) || null; }
  alive() { return this.G.players.filter((p) => p.alive); }
  byRole(role) { return this.G.players.find((p) => p.role === role && p.alive) || null; }
  inPack(p) { return Boolean(p && p.alive && (p.camp === "loups" || p.role === "blanc")); }
  wolfish(p) { return Boolean(p && (p.camp === "loups" || p.role === "blanc")); }
  /** Le pouvoir du joueur marche-t-il ? (Ancien éliminé par le village : les habitants perdent leurs pouvoirs ; Noctambule la nuit). */
  powered(p) {
    if (!p) return false;
    if (this.G.noPowers && ROLES[p.role] && ROLES[p.role].camp === "village" && p.camp === "village") return false;
    if (this.G.phase === "night" && this.G.blocked === p.id) return false;
    return true;
  }
  /** Pouvoirs passifs (Ancien, Chaperon, Chevalier, Chasseur…) : seul l'Ancien éliminé par le village les éteint. */
  passive(p) { return Boolean(p) && !(this.G.noPowers && p.camp === "village" && ROLES[p.role] && ROLES[p.role].camp === "village"); }
  name(id) { const p = this.P(id); return p ? p.name : "?"; }
  /** Voisins vivants d'un joueur (gauche, droite), selon l'ordre de la table. */
  neighbors(id) {
    const al = this.G.players.filter((p) => p.alive || p.id === id).sort((a, b) => a.seat - b.seat);
    const i = al.findIndex((p) => p.id === id);
    if (i < 0 || al.length < 2) return [];
    const left = al[(i + 1) % al.length], right = al[(i - 1 + al.length) % al.length];
    return [left, right].filter((p, k, a) => p.id !== id && a.indexOf(p) === k && p.alive).map((p) => p.id);
  }
  log(t, k = "info") {
    const G = this.G;
    G.log.push({ n: ++G.logN, d: G.day, ni: G.night, ph: G.phase, k, t });
    if (G.log.length > KEEP_LOG) G.log.splice(0, G.log.length - KEEP_LOG);
  }
  note(id, t, k = "info") { const l = this.G.notes[id]; if (!l) return; l.push({ n: ++this.G.logN, d: this.G.day, ni: this.G.night, k, t }); if (l.length > 60) l.splice(0, l.length - 60); }

  /* ---------- moteur des attentes ---------- */
  step(val) {
    try {
      const r = this.it.next(val);
      if (r.done) { this.wait = null; return; }
      this.wait = r.value;
      this.answers = {};
      // personne à attendre (ex. plus aucun joueur concerné) : on enchaîne
      if (!Object.keys(this.wait.asks).length) { const w = this.wait; this.wait = null; this.step(this.resolveAnswers(w)); }
    } catch (e) {
      if (e === OVER) { this.wait = null; return; }
      throw e;
    }
  }
  resolveAnswers(w) { return { ...this.answers, __w: w }; }
  /** Joueurs qui doivent encore répondre. */
  waitingFor() { const w = this.wait; return w ? Object.keys(w.asks).filter((id) => this.answers[id] === undefined) : []; }
  done(w) {
    if (!w || this.wait !== w) return;
    if (w.revisable && w.closeWhen === "ready") { // le débat : une majorité veut voter (ou le maire prend le pouvoir)
      const vals = Object.values(this.answers);
      if (!vals.some((v) => v && v.coup) && vals.filter((v) => v && v.ready).length * 2 <= Object.keys(w.asks).length) return;
    } else {
      if (this.waitingFor().length) return;
      if (w.revisable) {
        if (w.closeWhen !== "unanimous") return; // les votes se ferment au minuteur
        const picks = Object.entries(this.answers).filter(([id]) => w.asks[id].kind === w.kind).map(([, a]) => (a && a[0]) || null);
        if (!picks.length || picks.some((x) => !x || x !== picks[0])) return; // la meute doit être d'accord
      }
    }
    this.wait = null;
    this.step(this.resolveAnswers(w));
  }
  /** Réponse d'un joueur. Renvoie vrai si elle est acceptée. */
  answer(pid, a) {
    const w = this.wait;
    if (!w || this.G.over) return false;
    const q = w.asks[pid];
    if (!q || (this.answers[pid] !== undefined && !w.revisable && !q.live)) return false;
    let v = null;
    try { v = q.check(a); } catch { v = null; }
    if (v === null || v === undefined) return false;
    if (q.live && v && v.live) { q.live(v); return true; } // action instantanée (mot placé…) : la question reste ouverte
    this.answers[pid] = v;
    this.onAnswer(w, pid, v);
    if (v && v.coup) { this.wait = null; this.step(this.resolveAnswers(w)); return true; }
    this.done(w);
    return true;
  }
  /** L'ordinateur répond à la place d'un joueur (bot, joueur parti, minuteur écoulé). */
  auto(pid) {
    const w = this.wait;
    if (!w || this.G.over || !w.asks[pid] || this.answers[pid] !== undefined) return false;
    let v = null;
    try { v = w.asks[pid].check(w.asks[pid].bot ? w.asks[pid].bot() : w.asks[pid].dflt()); } catch { v = null; }
    if (v === null || v === undefined) v = w.asks[pid].check(w.asks[pid].dflt());
    this.answers[pid] = v;
    this.onAnswer(w, pid, v);
    this.done(w);
    return true;
  }
  /** Fin du minuteur : les absents prennent la réponse par défaut, et l'étape se termine. */
  close() {
    const w = this.wait;
    if (!w || this.G.over) return false;
    for (const id of this.waitingFor()) { const q = w.asks[id]; let v = null; try { v = q.check(q.dflt()); } catch { v = null; } this.answers[id] = v; }
    this.wait = null;
    this.step(this.resolveAnswers(w));
    return true;
  }
  onAnswer(w, pid, v) {
    if (w.kind === "wolves") this.G.wolfVotes = { ...(this.G.wolfVotes || {}), [pid]: v[0] || null };
    if ((w.kind === "vote" || w.kind === "cap") && this.G.vote) this.G.vote.votes = { ...this.G.vote.votes, [pid]: v[0] || null };
    if (w.kind === "debate" && this.G.debate) this.G.debate.ready = { ...this.G.debate.ready, [pid]: Boolean(v.ready) };
  }

  /* ---------- fabrique de questions ---------- */
  /** Choisir entre min et max joueurs parmi `opts` (ou aucun si skip). Réponse : { pick: [ids] }. */
  qPick(o) {
    const q = { type: "pick", min: 1, max: 1, skip: false, ...o };
    q.check = (a) => {
      if (!a) return null;
      if (a.skip && q.skip) return [];
      const ids = Array.isArray(a.pick) ? [...new Set(a.pick)] : [];
      if (ids.length < q.min || ids.length > q.max || !ids.every((id) => q.opts.includes(id))) return null;
      return ids;
    };
    q.dflt = o.dflt || (() => (q.skip ? { skip: true } : { pick: shuffle(this.G, [...q.opts]).slice(0, q.min) }));
    q.bot = o.bot ? () => o.bot() : q.dflt;
    return q;
  }
  /** Choisir une option parmi `choices` ([{v, label}]). Réponse : { v }. */
  qChoice(o) {
    const q = { type: "choice", ...o };
    q.check = (a) => (a && q.choices.some((c) => c.v === a.v) ? a.v : null);
    q.dflt = o.dflt || (() => ({ v: q.choices[0].v }));
    q.bot = o.bot ? () => o.bot() : q.dflt;
    return q;
  }
  qOk(o) { const q = { type: "ok", ...o }; q.check = () => true; q.dflt = () => ({}); q.bot = q.dflt; return q; }
  /** Question « vide » de la nuit pour tous ceux qui n'ont rien à faire (personne ne peut deviner qui agit). */
  qDream(p) {
    const opts = this.alive().filter((x) => x.id !== p.id).map((x) => x.id);
    return this.qPick({ kind: "dream", title: "Hawkins dort", text: "Pendant que d'autres agissent, touche la personne qui te paraît la plus louche. Personne ne le saura.", opts, skip: true, dflt: () => ({ skip: true }), bot: () => ({ skip: true }) });
  }
  /** Attente : `asks` pour certains joueurs ; `dream` donne une question vide à tous les autres vivants. */
  *ask(asks, o = {}) {
    if (o.dream) for (const p of this.alive()) if (!asks[p.id]) asks[p.id] = this.qDream(p);
    const w = { id: ++this.n, kind: o.kind || "night", label: o.label || "", revisable: Boolean(o.revisable), closeWhen: o.closeWhen || null, t: o.t || "night", asks };
    this.G.step = o.label || this.G.step;
    const res = yield w;
    return res;
  }

  /* ================================ déroulé ================================ */
  *flow() {
    const G = this.G;
    // 0. chacun découvre son rôle
    const asks = {};
    for (const p of G.players) asks[p.id] = this.qOk({ kind: "role", title: "Ton rôle", text: "Garde-le secret !" });
    this.log("Les rôles sont distribués. Bienvenue à Hawkins…", "start");
    yield* this.ask(asks, { kind: "role", label: "Découvrez vos rôles", t: "setup" });
    for (;;) {
      yield* this.nightPhase();
      this.checkEnd();
      yield* this.dayPhase();
      this.checkEnd();
      if (G.day >= 40) this.win("none", [], "Partie interminable", "Quarante jours sans dénouement : la partie s'arrête, personne ne gagne.");
    }
  }

  /* ---------------------------- la nuit ---------------------------- */
  *nightPhase() {
    const G = this.G;
    G.night += 1; G.phase = "night"; G.blocked = null; G.prot = []; G.wolfVotes = null; G.vote = null; G.debate = null; G.morning = [];
    this.log(G.night === 1 ? "La première nuit tombe sur Hawkins. Tout le monde ferme les yeux…" : `La nuit ${G.night} tombe sur Hawkins…`, "night");
    const tonight = []; // [{id, cause}] attaques de la nuit, résolues à l'aube

    // 1. Max (Voleur), première nuit
    const vol = this.G.players.find((p) => p.alive && p.role === "voleur" && p.fresh);
    if (vol && G.extra.length === 2 && this.powered(vol)) {
      const both = G.extra.every((r) => ROLES[r].camp === "loups");
      const choices = [...(both ? [] : [{ v: "keep", label: `Garder ta carte (${roleTitle("voleur")})` }]), ...G.extra.map((r, i) => ({ v: "x" + i, label: `Prendre ${ROLES[r].st} (${ROLES[r].name})`, role: r }))];
      const res = yield* this.ask({ [vol.id]: this.qChoice({ kind: "voleur", title: roleTitle("voleur"), text: both ? "Les deux cartes du centre sont des créatures : tu dois en prendre une." : "Tu peux échanger ton rôle contre l'une des deux cartes du centre.", choices, bot: () => ({ v: one(G, choices).v }) }) }, { dream: true, label: `${ROLES.voleur.st} pirate le système…` });
      const v = res[vol.id];
      if (v && v !== "keep") {
        const i = Number(v.slice(1)), role = G.extra[i];
        G.extra[i] = "voleur";
        this.become(vol, role);
        if (!vol.alias) vol.alias = role === "villageois" ? "Habitant de Hawkins" : null;
        this.note(vol.id, `Tu prends la carte ${roleLabel(role)}.`, "role");
      } else { vol.fresh = false; this.note(vol.id, "Tu gardes ta carte.", "role"); }
    }

    // 2. Dr Owens (Noctambule) : il bloque le pouvoir de nuit d'un joueur
    const noc = this.byRole("noctambule");
    if (noc && this.powered(noc)) {
      const opts = this.alive().filter((p) => p.id !== noc.id).map((p) => p.id);
      const res = yield* this.ask({ [noc.id]: this.qPick({ kind: "noctambule", title: roleTitle("noctambule"), text: "Qui plonges-tu dans une illusion ? Son pouvoir de nuit ne marchera pas.", opts, skip: true, bot: () => ({ pick: [one(G, opts)] }) }) }, { dream: true, label: `${ROLES.noctambule.st} tisse ses illusions…` });
      const t = (res[noc.id] || [])[0];
      if (t) { G.blocked = t; this.note(noc.id, `Tu plonges ${this.name(t)} dans une illusion : son pouvoir ne marchera pas cette nuit.`); }
    }

    // 3. Les habitants qui agissent avant la meute (en même temps)
    {
      const asks = {};
      const others = (p) => this.alive().filter((x) => x.id !== p.id).map((x) => x.id);
      const all = () => this.alive().map((x) => x.id);
      for (const p of this.alive()) {
        if (!this.powered(p)) continue;
        if (p.role === "cupidon" && p.fresh) {
          const opts = all();
          asks[p.id] = this.qPick({ kind: "cupidon", title: roleTitle("cupidon"), text: "Désigne les deux amoureux (tu peux te choisir).", opts, min: 2, max: 2, bot: () => ({ pick: shuffle(G, [...opts]).slice(0, 2) }) });
        } else if (p.role === "chienloup" && p.fresh) {
          asks[p.id] = this.qChoice({ kind: "chienloup", title: roleTitle("chienloup"), text: "Choisis ton camp pour toute la partie.", choices: [{ v: "village", label: "Rester avec Hawkins" }, { v: "loups", label: "Rejoindre la meute" }], bot: () => ({ v: rnd(G) < 0.5 ? "loups" : "village" }) });
        } else if (p.role === "enfant" && p.fresh) {
          const opts = others(p);
          asks[p.id] = this.qPick({ kind: "enfant", title: roleTitle("enfant"), text: "Choisis ton modèle. S'il meurt, tu rejoindras la meute.", opts });
        } else if (p.role === "comedien") {
          if (!G.comedien || G.comedien.pid !== p.id) G.comedien = { pid: p.id, cards: shuffle(G, [...COMEDIEN_POWERS]).slice(0, 3), used: [] };
          const left = G.comedien.cards.filter((c) => !G.comedien.used.includes(c));
          if (left.length) {
            const opts = all();
            const q = this.qPick({ kind: "comedien", title: roleTitle("comedien"), text: "Choisis un pouvoir à jouer cette nuit (une fois chacun), puis sa cible.", opts, skip: true, choices: left.map((c) => ({ v: c, label: `${ROLES[c].st} (${ROLES[c].name})` })), bot: () => (rnd(G) < 0.55 ? { v: one(G, left), pick: [one(G, others(p))] } : { skip: true }) });
            const base = q.check;
            q.check = (a) => { if (a && a.skip) return []; const ids = base(a); return ids && ids.length && left.includes(a.v) && !(a.v !== "salvateur" && ids[0] === p.id) ? [ids[0], a.v] : null; };
            asks[p.id] = q;
          }
        } else if (p.role === "voyante") {
          const opts = others(p);
          asks[p.id] = this.qPick({ kind: "voyante", title: roleTitle("voyante"), text: "Plonge dans le Néant : de qui veux-tu découvrir le rôle ?", opts, bot: () => ({ pick: [one(G, opts.filter((id) => !G.know[p.id][id]).concat(opts).slice(0, 99))] }) });
        } else if (p.role === "renard" && G.renardOn) {
          const opts = others(p);
          asks[p.id] = this.qPick({ kind: "renard", title: roleTitle("renard"), text: "Le Cerebro sonde un joueur et ses deux voisins. S'il n'y a aucune créature parmi eux, ton pouvoir s'éteint.", opts, skip: true, bot: () => ({ pick: [one(G, opts)] }) });
        } else if (p.role === "corbeau") {
          const opts = others(p);
          asks[p.id] = this.qPick({ kind: "corbeau", title: roleTitle("corbeau"), text: "Qui accuses-tu dans ton article anonyme ? Il aura 2 voix de plus contre lui au prochain vote.", opts, skip: true, bot: () => (rnd(G) < 0.7 ? { pick: [one(G, opts)] } : { skip: true }) });
        } else if (p.role === "salvateur") {
          const opts = all().filter((id) => id !== G.salvLast);
          asks[p.id] = this.qPick({ kind: "salvateur", title: roleTitle("salvateur"), text: "Qui protèges-tu de la meute cette nuit ? (Pas le même que la nuit dernière.)", opts, skip: true, bot: () => ({ pick: [one(G, opts)] }) });
        }
      }
      const res = yield* this.ask(asks, { dream: true, label: "Les habitants de Hawkins agissent dans l'ombre…" });
      for (const [pid, v] of Object.entries(res)) {
        if (pid === "__w") continue;
        const p = this.P(pid);
        if (!p || !asks[pid] || asks[pid].kind === "dream") continue;
        this.applyNightA(p, asks[pid].kind, v);
      }
    }
    // informations de la première nuit
    if (G.night === 1) {
      for (const role of ["soeur", "frere"]) {
        const fam = G.players.filter((p) => p.role === role);
        if (fam.length > 1) for (const p of fam) this.note(p.id, `${role === "soeur" ? "Ta sœur" : "Tes frères"} : ${fam.filter((x) => x !== p).map((x) => x.name).join(", ")}.`, "family");
      }
      const pack = this.alive().filter((p) => this.inPack(p));
      for (const p of pack) this.note(p.id, pack.length > 1 ? `Ta meute : ${pack.filter((x) => x !== p).map((x) => x.name).join(", ")}.` : "Tu es la seule créature de la meute.", "pack");
    }

    // 4. La meute
    let victim = null;
    const pack = this.alive().filter((p) => this.inPack(p));
    if (pack.length) {
      const asks = {};
      const targets = this.alive().filter((p) => !this.inPack(p)).map((p) => p.id);
      G.wolfVotes = {};
      for (const w of pack) {
        asks[w.id] = this.qPick({ kind: "wolves", title: "La meute se réveille", text: "Choisissez ensemble votre victime. Quand tout le monde est d'accord, la nuit continue.", opts: targets, skip: true,
          dflt: () => ({ skip: true }),
          bot: () => { const cur = Object.values(G.wolfVotes || {}).filter(Boolean); return { pick: [cur.length && rnd(G) < 0.85 ? one(G, cur) : this.botTarget(w, targets)] }; } });
      }
      const spy = this.byRole("petitefille");
      if (spy && !this.inPack(spy) && this.powered(spy)) asks[spy.id] = this.qOk({ kind: "spy", title: roleTitle("petitefille"), text: "Tu te glisses dans les conduits et tu espionnes la meute…" });
      const res = yield* this.ask(asks, { dream: true, kind: "wolves", revisable: true, closeWhen: "unanimous", label: "La meute du Monde à l'envers se réveille…" });
      const tally = {};
      for (const w of pack) { const t = ((res[w.id] || [])[0]); if (t) tally[t] = (tally[t] || 0) + 1; }
      const max = Math.max(0, ...Object.values(tally));
      if (max > 0) victim = one(G, Object.keys(tally).filter((k) => tally[k] === max));
      for (const w of pack) this.note(w.id, victim ? `La meute attaque ${this.name(victim)}.` : "La meute n'a choisi personne cette nuit.", "pack");
    }

    // 5. Pouvoirs de la meute et de Vecna
    let infected = false, second = null, vecnaKill = null;
    {
      const asks = {};
      const inf = this.byRole("infect");
      if (inf && victim && !G.infectUsed && this.powered(inf)) {
        asks[inf.id] = this.qChoice({ kind: "infect", title: "Le Flagelleur mental", text: `Posséder ${this.name(victim)} au lieu de le tuer ? Il rejoindra la meute (une seule fois dans la partie).`, choices: [{ v: "kill", label: "Non, le tuer" }, { v: "infect", label: "Le posséder" }], bot: () => ({ v: rnd(G) < 0.4 ? "infect" : "kill" }) });
      }
      const gml = this.byRole("gml");
      if (gml && G.gmlOn && this.powered(gml)) {
        const opts = this.alive().filter((p) => !this.inPack(p) && p.id !== victim).map((p) => p.id);
        if (opts.length) asks[gml.id] = this.qPick({ kind: "gml", title: "Le Démogorgon", text: "Tant qu'aucune créature n'est morte, tu chasses une seconde victime.", opts, skip: true, bot: () => ({ pick: [this.botTarget(gml, opts)] }) });
      }
      const vec = this.byRole("blanc");
      if (vec && G.night % 2 === 0 && this.powered(vec)) {
        const opts = this.alive().filter((p) => p.camp === "loups").map((p) => p.id);
        if (opts.length) asks[vec.id] = this.qPick({ kind: "blanc", title: "Vecna", text: "Une nuit sur deux, tu peux tuer une créature de la meute.", opts, skip: true, bot: () => (rnd(G) < 0.6 ? { pick: [one(G, opts)] } : { skip: true }) });
      }
      if (Object.keys(asks).length) {
        const res = yield* this.ask(asks, { dream: true, label: "Les cauchemars rôdent…" });
        if (inf && res[inf.id] === "infect") infected = true;
        if (gml && res[gml.id]) second = res[gml.id][0] || null;
        if (vec && res[vec.id]) vecnaKill = res[vec.id][0] || null;
      }
    }
    if (infected) { G.infectUsed = true; }

    // qui mourrait vraiment ? (pour Joyce)
    const wouldDie = (t) => {
      const p = this.P(t);
      if (!p || !p.alive) return false;
      if (G.prot.includes(t)) return false;
      if (p.role === "chaperon" && this.byRole("chasseur") && this.passive(p)) return false;
      if (p.role === "ancien" && p.life > 1 && this.passive(p)) return false;
      return true;
    };
    const attacked = [!infected && victim, second].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i);
    const dying = attacked.filter(wouldDie);

    // 6. Joyce (Sorcière), Papa (Joueur de flûte)
    let saved = null, poison = null, charm = [];
    {
      const asks = {};
      const sor = this.byRole("sorciere");
      if (sor && this.powered(sor) && (G.pot.life || G.pot.death)) {
        const killOpts = this.alive().filter((p) => p.id !== sor.id).map((p) => p.id);
        const q = { type: "witch", kind: "sorciere", title: roleTitle("sorciere"), victims: G.pot.life ? dying : [], seen: dying, life: G.pot.life, death: G.pot.death, opts: killOpts,
          text: dying.length ? `Cette nuit, ${dying.map((id) => this.name(id)).join(" et ")} ${dying.length > 1 ? "vont" : "va"} mourir.` : "Personne ne va mourir cette nuit… pour l'instant." };
        q.check = (a) => {
          if (!a) return null;
          const save = typeof a.save === "string" && G.pot.life && dying.includes(a.save) ? a.save : null;
          const kill = typeof a.kill === "string" && G.pot.death && killOpts.includes(a.kill) ? a.kill : null;
          if ((a.save && !save) || (a.kill && !kill)) return null;
          return { save, kill };
        };
        q.dflt = () => ({});
        q.bot = () => ({ save: dying.length && (dying.includes(sor.id) || rnd(G) < 0.5) ? (dying.includes(sor.id) ? sor.id : one(G, dying)) : undefined, kill: G.pot.death && G.night > 1 && rnd(G) < 0.15 ? one(G, killOpts) : undefined });
        asks[sor.id] = q;
      }
      const fl = this.byRole("flute");
      if (fl && this.powered(fl)) {
        const opts = this.alive().filter((p) => p.id !== fl.id && !p.charmed).map((p) => p.id);
        if (opts.length) asks[fl.id] = this.qPick({ kind: "flute", title: roleTitle("flute"), text: `Prends le contrôle de ${Math.min(2, opts.length)} joueur${opts.length > 1 ? "s" : ""}.`, opts, min: Math.min(2, opts.length), max: Math.min(2, opts.length) });
      }
      if (Object.keys(asks).length) {
        const res = yield* this.ask(asks, { dream: true, label: "Hawkins retient son souffle…" });
        if (sor && res[sor.id]) {
          const v = res[sor.id];
          if (v.save) { saved = v.save; G.pot.life = false; this.note(sor.id, `Ta potion de vie sauve ${this.name(v.save)}.`); }
          if (v.kill) { poison = v.kill; G.pot.death = false; this.note(sor.id, `Ta potion de mort frappe ${this.name(v.kill)}.`); }
        }
        if (fl && res[fl.id]) charm = res[fl.id];
      }
    }

    // 7. Résolution : morts de la nuit (annoncées à l'aube, sans dire comment)
    if (G.tetanus) { const t = this.P(G.tetanus); if (t && t.alive) tonight.push({ id: t.id, cause: "tetanos" }); G.tetanus = null; }
    if (infected && victim) {
      const v = this.P(victim);
      v.camp = "loups"; v.infected = true;
      this.note(v.id, "Le Flagelleur mental t'a possédé : tu rejoins la meute du Monde à l'envers (tu gardes tes pouvoirs).", "pack");
      for (const w of this.alive().filter((p) => this.inPack(p) && p.id !== v.id)) this.note(w.id, `${v.name} est désormais possédé : il rejoint la meute.`, "pack");
    }
    for (const t of attacked) {
      const p = this.P(t);
      if (!wouldDie(t)) { if (p.role === "ancien" && p.life > 1 && !G.prot.includes(t)) p.life -= 1; continue; }
      if (saved === t) continue;
      tonight.push({ id: t, cause: "devore" });
    }
    if (vecnaKill) tonight.push({ id: vecnaKill, cause: "vecna" });
    if (poison) tonight.push({ id: poison, cause: "poison" });
    for (const id of charm) { const p = this.P(id); if (p) p.charmed = true; }
    if (charm.length) {
      const fl = this.byRole("flute");
      const all = G.players.filter((p) => p.charmed);
      for (const p of all) this.note(p.id, `Papa t'a sous son contrôle. Les joueurs sous contrôle : ${all.map((x) => x.name).join(", ")}.`, "charm");
      if (fl) this.note(fl.id, `Sous ton contrôle : ${all.map((x) => x.name).join(", ")}.`, "charm");
    }
    G.blocked = null;
    G.phase = "dawn";
    for (const d of tonight) {
      const p = this.P(d.id);
      if (!p || !p.alive) continue;
      this.kill(p.id, d.cause);
      if (d.cause === "devore" && p.role === "chevalier" && this.passive(p)) {
        const al = G.players.filter((x) => x.alive || x.id === p.id).sort((a, b) => a.seat - b.seat);
        const i = al.findIndex((x) => x.id === p.id);
        for (let k = 1; k < al.length; k++) { const c = al[(i + k) % al.length]; if (c.alive && c.camp === "loups") { G.tetanus = c.id; break; } }
      }
    }
    // l'aube : on annonce les morts (sans dire comment)
    G.day += 1;
    this.log(`Le jour ${G.day} se lève sur Hawkins.`, "day");
    const nightDeaths = G.morning.filter((m) => m.night);
    if (!nightDeaths.length) this.log("Personne n'est mort cette nuit.", "info");
    else for (const m of nightDeaths) this.log(this.deathLine(this.P(m.id), m.cause), "death");
  }

  applyNightA(p, kind, v) {
    const G = this.G;
    if (kind === "cupidon" && v.length === 2) {
      G.lovers = [...v];
      p.fresh = false;
      for (const id of v) { const o = v.find((x) => x !== id) || id; this.note(id, `${ROLES.cupidon.st} t'a désigné : tu es amoureux de ${this.name(o)}. Si l'un de vous meurt, l'autre meurt de chagrin.`, "love"); }
      this.note(p.id, `Tes amoureux : ${v.map((id) => this.name(id)).join(" et ")}.`);
    } else if (kind === "chienloup") {
      p.fresh = false;
      if (v === "loups") { p.camp = "loups"; this.note(p.id, `${ROLES.chienloup.st} rejoint la meute du Monde à l'envers.`, "pack"); } else this.note(p.id, `${ROLES.chienloup.st} reste fidèle à Hawkins.`);
    } else if (kind === "enfant" && v[0]) {
      G.esModel = v[0]; p.fresh = false;
      this.note(p.id, `Ton modèle : ${this.name(v[0])}. S'il meurt, tu rejoins la meute.`);
    } else if (kind === "comedien" && v.length === 2) {
      const [t, power] = v;
      G.comedien.used.push(power);
      this.note(p.id, `Tu joues ${ROLES[power].st} (${ROLES[power].name}).`);
      this.applyNightA(p, power, [t]);
    } else if (kind === "voyante" && v[0]) {
      const t = this.P(v[0]);
      G.know[p.id][t.id] = this.wolfish(t) ? "wolf" : "good";
      this.note(p.id, `Le Néant te montre ${t.name} : ${roleLabel(t.role)}${t.infected ? ", possédé par le Flagelleur" : ""}.`, "seer");
    } else if (kind === "renard" && v[0]) {
      const trio = [v[0], ...this.neighbors(v[0])].filter((id, i, a) => a.indexOf(id) === i);
      const hit = trio.some((id) => this.wolfish(this.P(id)));
      const names = trio.map((id) => this.name(id)).join(", ");
      if (hit) { this.note(p.id, `Le Cerebro capte un signal : il y a au moins une créature parmi ${names}.`, "seer"); for (const id of trio) if (G.know[p.id][id] !== "good") G.know[p.id][id] = "sus"; }
      else {
        for (const id of trio) G.know[p.id][id] = "good";
        if (p.role === "renard") { G.renardOn = false; this.note(p.id, `Aucun signal : ${names} sont innocents. Le Cerebro est grillé, ton pouvoir s'éteint.`, "seer"); }
        else this.note(p.id, `Aucun signal : ${names} sont innocents.`, "seer");
      }
    } else if (kind === "corbeau" && v[0]) {
      G.corbeau = v[0];
      this.note(p.id, `Ton article accuse ${this.name(v[0])}.`);
    } else if (kind === "salvateur" && v[0]) {
      G.prot.push(v[0]);
      if (p.role === "salvateur") G.salvLast = v[0];
      this.note(p.id, `Tu veilles sur ${this.name(v[0])} cette nuit.`);
    } else if (kind === "noctambule" && v[0]) {
      G.blocked = v[0];
      this.note(p.id, `Tu plonges ${this.name(v[0])} dans une illusion.`);
    }
  }

  /** Cible au hasard pour un bot créature : jamais un membre de la meute. */
  botTarget(p, opts) { return one(this.G, opts.filter((id) => !this.inPack(this.P(id)))) || one(this.G, opts); }

  /** Le joueur prend un autre rôle (Voleur, Servante). Son pouvoir repart à zéro. */
  become(p, role) {
    p.role = role; p.camp = ROLES[role].camp; p.fresh = true; p.life = role === "ancien" ? 2 : 1;
    if (role === "sorciere") this.G.pot = { life: true, death: true };
    if (role === "renard") this.G.renardOn = true;
    if (role === "comedien") this.G.comedien = null;
    if (role === "villageois" && !p.alias) p.alias = "Habitant de Hawkins";
  }

  /* ---------------------------- morts ---------------------------- */
  /** Tue un joueur et déclenche ce qui en découle (amoureux, Enfant sauvage, Chasseur, Fossoyeur, capitaine…). */
  kill(id, cause) {
    const G = this.G;
    const p = this.P(id);
    if (!p || !p.alive) return;
    p.alive = false; p.cause = cause; p.diedOn = G.day; p.diedAtNight = G.phase === "night" || G.phase === "dawn";
    G.morning.push({ id, cause, role: p.shown || p.role, night: p.diedAtNight });
    if (!p.diedAtNight) this.log(this.deathLine(p, cause), "death");
    if (p.camp === "loups") G.gmlOn = false;
    if (p.role === "ancien" && ["vote", "tir", "poison", "dictateur"].includes(cause)) {
      G.noPowers = true;
      this.log(`Le village a tué ${ROLES.ancien.st}, l'Ancien : les habitants perdent tous leurs pouvoirs !`, "alert");
    }
    if (p.role === "chasseur" && this.passive(p)) G.trig.push({ type: "chasseur", id });
    if (p.role === "fossoyeur" && this.passive(p)) G.trig.push({ type: "fossoyeur", id });
    if (G.cap === id) G.trig.push({ type: "cap", id });
    if (G.esModel === id) {
      const es = G.players.find((x) => x.alive && x.role === "enfant" && x.camp !== "loups");
      if (es) { es.camp = "loups"; this.note(es.id, `Ton modèle ${p.name} est mort : tu rejoins la meute du Monde à l'envers.`, "pack"); }
    }
    if (G.lovers && G.lovers.includes(id)) {
      const o = this.P(G.lovers.find((x) => x !== id));
      if (o && o.alive) this.kill(o.id, "chagrin");
    }
  }
  /** « Benny Hammond (Simple villageois) », « Onze (Voyante) » : le rôle révélé d'un joueur. */
  label(p) { const r = p.shown || p.role; return p.alias && r === p.role ? `${p.alias} (${ROLES[r].name})` : roleLabel(r); }
  deathLine(p, cause) {
    const c = `C'était ${this.label(p)}.`;
    switch (cause) {
      case "vote": return `Le village a éliminé ${p.name}. ${c}`;
      case "tir": return `${ROLES.chasseur.st} tire une dernière fois : ${p.name} s'effondre. ${c}`;
      case "chagrin": return `${p.name} meurt de chagrin. ${c}`;
      case "dictateur": return `Sur ordre du maire Kline, ${p.name} est exécuté. ${c}`;
      case "kline": return `Le coup de force échoue : ${p.name} est destitué et éliminé. ${c}`;
      case "bouc": return `Égalité : ${p.name} paie pour les autres. ${c}`;
      case "bavard": return `${p.name} n'a pas réussi à placer son mot… et se trahit. ${c}`;
      default: return `${p.name} n'a pas survécu à la nuit. ${c}`;
    }
  }
  /** Déclencheurs en attente après des morts : dernier tir du Chasseur, Fossoyeur, succession du capitaine. */
  *afterDeaths() {
    const G = this.G;
    let guard = 0;
    while (G.trig.length && guard++ < 30) {
      const t = G.trig.shift();
      const p = this.P(t.id);
      this.checkEnd();
      if (t.type === "chasseur") {
        const opts = this.alive().map((x) => x.id);
        if (!opts.length) continue;
        const res = yield* this.ask({ [p.id]: this.qPick({ kind: "chasseur", title: roleTitle("chasseur"), text: "Dans ton dernier souffle, tu tires sur…", opts, skip: true,
          bot: () => ({ pick: [one(G, opts.filter((id) => G.know[p.id][id] === "wolf").concat(opts.filter((id) => G.know[p.id][id] !== "good"), opts).slice(0, 1)) || one(G, opts)] }) }) }, { kind: "trigger", t: "day", label: `${ROLES.chasseur.st} dégaine…` });
        const target = (res[p.id] || [])[0];
        if (target) this.kill(target, "tir"); else this.log(`${ROLES.chasseur.st} baisse son arme.`, "info");
      } else if (t.type === "fossoyeur") {
        const opts = this.alive().map((x) => x.id);
        if (!opts.length) continue;
        const res = yield* this.ask({ [p.id]: this.qPick({ kind: "fossoyeur", title: roleTitle("fossoyeur"), text: "Avant de partir, désigne un joueur : son nom sera annoncé avec celui d'un joueur de l'autre camp.", opts, bot: () => ({ pick: [one(G, opts)] }) }) }, { kind: "trigger", t: "day", label: "Bob laisse un dernier indice…" });
        const a = this.P((res[p.id] || [])[0]);
        if (a) {
          const pool = this.alive().filter((x) => x.id !== a.id && this.wolfish(x) !== this.wolfish(a));
          const b = one(G, pool);
          this.log(b ? `Le dernier indice de Bob : ${shuffle(G, [a.name, b.name]).join(" ou ")}… l'un des deux est une créature.` : `Le dernier indice de Bob désigne ${a.name}… mais personne d'autre ne lui ressemble.`, "clue");
        }
      } else if (t.type === "cap") {
        const opts = this.alive().map((x) => x.id);
        if (!opts.length) { G.cap = null; continue; }
        const res = yield* this.ask({ [p.id]: this.qPick({ kind: "successor", title: "Succession", text: "Tu étais capitaine : à qui transmets-tu ton insigne ?", opts, bot: () => ({ pick: [one(G, opts)] }) }) }, { kind: "trigger", t: "day", label: "Le capitaine transmet son insigne…" });
        G.cap = (res[p.id] || [])[0] || one(G, opts);
        this.log(`${this.name(G.cap)} devient capitaine.`, "cap");
      }
    }
  }

  /* ---------------------------- le jour ---------------------------- */
  *dayPhase() {
    const G = this.G;
    G.phase = "day";
    yield* this.afterDeaths();
    this.checkEnd();
    // Montreur d'ours : les guirlandes de Joyce
    const mont = this.byRole("montreur");
    if (mont && this.powered(mont)) {
      if (this.neighbors(mont.id).some((id) => this.wolfish(this.P(id)))) this.log(`Les guirlandes de ${ROLES.montreur.st} clignotent… une créature est assise juste à côté !`, "clue");
      else this.log(`Les guirlandes de ${ROLES.montreur.st} restent éteintes ce matin.`, "info");
    }
    if (G.corbeau && this.P(G.corbeau) && this.P(G.corbeau).alive) this.log(`Article anonyme dans le Hawkins Post : « ${this.name(G.corbeau)} n'est pas celui qu'il prétend être ! » (2 voix de plus contre lui aujourd'hui)`, "clue");
    // Grigori (Mercenaire) : sa cible, le premier jour
    const merc = this.byRole("mercenaire");
    if (merc && G.day === 1 && !G.merc) {
      const t = one(G, this.alive().filter((p) => p.id !== merc.id).map((p) => p.id));
      G.merc = { pid: merc.id, target: t };
      if (t) this.note(merc.id, `Ta cible : ${this.name(t)}. Fais-la éliminer au vote d'aujourd'hui pour gagner seul.`, "merc");
    }
    // Billy (Loup bavard) : son mot du jour
    const bav = this.byRole("bavard");
    if (bav) { G.bavard = { pid: bav.id, word: one(G, BAVARD_WORDS), said: false }; this.note(bav.id, `Ton mot du jour : « ${G.bavard.word} ». Place-le dans la conversation, puis touche « Mot placé ».`, "word"); }
    else G.bavard = null;

    // élection du capitaine (premier jour)
    if (G.opts.cap && !G.cap && this.alive().length > 2) {
      const voters = this.alive();
      const opts = voters.map((p) => p.id);
      G.vote = { kind: "cap", votes: {}, corbeau: null };
      const asks = {};
      for (const p of voters) asks[p.id] = this.qPick({ kind: "cap", title: "Élection du capitaine", text: "Le capitaine a une voix double et départage les égalités. Vote pour qui tu veux (toi compris).", opts, skip: true, dflt: () => ({ skip: true }), bot: () => ({ pick: [one(G, Object.values(G.vote.votes).filter(Boolean).concat(opts).slice(0, opts.length + 2))] }) });
      const res = yield* this.ask(asks, { kind: "cap", t: "day", revisable: true, label: "Élection du capitaine" });
      const tally = {};
      for (const p of voters) { const t = (res[p.id] || [])[0]; if (t) tally[t] = (tally[t] || 0) + 1; }
      const max = Math.max(0, ...Object.values(tally));
      G.cap = max ? one(G, Object.keys(tally).filter((k) => tally[k] === max)) : one(G, opts);
      G.vote = null;
      this.log(`${this.name(G.cap)} est élu capitaine de Hawkins.`, "cap");
    }

    // débat (et coup de force éventuel du maire Kline)
    let coup = null;
    {
      const voters = this.alive();
      G.debate = { ready: {} };
      const asks = {};
      for (const p of voters) {
        const choices = [{ v: "ready", label: "Passer au vote" }, { v: "wait", label: "Encore un peu" }];
        if (p.role === "dictateur" && !G.dictUsed && this.powered(p)) choices.push({ v: "coup", label: "Prendre le pouvoir (Kline)" });
        if (G.bavard && G.bavard.pid === p.id && !G.bavard.said) choices.push({ v: "word", label: "Mot placé" });
        const opts = voters.filter((x) => x.id !== p.id).map((x) => x.id);
        const q = { type: "debate", kind: "debate", title: "Le débat", text: "Discutez ! Qui se cache derrière les créatures ?", choices, opts };
        q.check = (a) => {
          if (!a || !choices.some((c) => c.v === a.v)) return null;
          if (a.v === "word") return { live: true, word: true };
          if (a.v === "coup") { const t = Array.isArray(a.pick) ? a.pick[0] : null; return t && opts.includes(t) ? { coup: t, ready: true } : null; }
          return { ready: a.v === "ready" };
        };
        q.live = (v) => { if (v.word && G.bavard && G.bavard.pid === p.id) { G.bavard.said = true; this.note(p.id, "Mot placé : la meute peut compter sur toi.", "word"); } };
        q.dflt = () => ({ v: "ready" });
        q.bot = () => ({ v: "ready" });
        asks[p.id] = q;
      }
      if (G.bavard && this.P(G.bavard.pid).bot) G.bavard.said = rnd(G) < 0.9;
      const res = yield* this.ask(asks, { kind: "debate", t: "day", revisable: true, closeWhen: "ready", label: `Jour ${G.day} : le débat` });
      for (const p of voters) if (res[p.id] && res[p.id].coup) { coup = { by: p.id, target: res[p.id].coup }; break; }
      G.debate = null;
    }

    if (coup) {
      const k = this.P(coup.by), t = this.P(coup.target);
      G.dictUsed = true;
      this.log(`Coup de force ! Le maire ${k.name} s'empare du pouvoir et fait juger ${t.name}.`, "alert");
      const wolf = this.wolfish(t);
      this.kill(t.id, "dictateur");
      yield* this.afterDeaths();
      this.checkEnd();
      if (k.alive) {
        if (wolf) { G.cap = k.id; this.log(`C'était bien une créature : ${k.name} devient capitaine.`, "cap"); }
        else { this.kill(k.id, "kline"); yield* this.afterDeaths(); }
      }
      this.checkEnd();
    } else {
      const out = yield* this.dayVote(true);
      this.checkEnd();
      // Juge bègue : second vote
      const juge = this.byRole("juge");
      if (out !== "end" && juge && !G.jugeUsed && this.powered(juge) && this.alive().length > 2) {
        const res = yield* this.ask({ [juge.id]: this.qChoice({ kind: "juge", title: roleTitle("juge"), text: "Déclencher un second vote, tout de suite, sans débat ?", choices: [{ v: "no", label: "Non" }, { v: "yes", label: "Second vote !" }], bot: () => ({ v: rnd(G) < 0.2 ? "yes" : "no" }) }) }, { kind: "trigger", t: "day", label: "M. Clarke réfléchit…" });
        if (res[juge.id] === "yes") {
          G.jugeUsed = true;
          this.log("M. Clarke fait un signe : on refait l'expérience ! Second vote immédiat.", "alert");
          yield* this.dayVote(false);
          this.checkEnd();
        }
      }
    }
    // fin du premier jour : Barb et Grigori redeviennent de simples habitants
    if (G.day === 1) {
      for (const role of ["ange", "mercenaire"]) {
        const p = this.byRole(role);
        if (p && p.camp === "solo") { p.camp = "village"; this.note(p.id, "Ton objectif secret a échoué : tu joues désormais avec les habitants de Hawkins.", "role"); }
      }
    }
    // Billy n'a pas placé son mot
    if (G.bavard) {
      const b = this.P(G.bavard.pid);
      if (b && b.alive && !G.bavard.said) { this.kill(b.id, "bavard"); yield* this.afterDeaths(); }
      G.bavard = null;
    }
    G.corbeau = null;
    G.vote = null;
    this.checkEnd();
  }

  /** Vote du village. `first` : premier vote du jour (Barb, Grigori). Renvoie l'id éliminé, null, ou "end". */
  *dayVote(first) {
    const G = this.G;
    let voters = this.alive().filter((p) => !p.idiot);
    if (G.banVote) { const ok = new Set(G.banVote); voters = voters.filter((p) => ok.has(p.id)); G.banVote = null; }
    const cands = this.alive().map((p) => p.id);
    G.vote = { kind: "vote", votes: {}, corbeau: G.corbeau && this.P(G.corbeau).alive ? G.corbeau : null, hinted: false };
    const asks = {};
    for (const p of voters) {
      const opts = cands.filter((id) => id !== p.id);
      asks[p.id] = this.qPick({ kind: "vote", title: first ? "Le vote" : "Second vote", text: "Qui le village doit-il éliminer ? Tu peux changer d'avis jusqu'à la fin du vote.", opts, skip: true, dflt: () => ({ skip: true }), bot: () => ({ pick: [this.botVote(p, opts)] }) });
    }
    if (!voters.length) { this.log("Personne n'a le droit de voter aujourd'hui.", "info"); G.vote = null; return null; }
    const res = yield* this.ask(asks, { kind: "vote", t: "day", revisable: true, label: first ? `Jour ${G.day} : le vote` : "Second vote" });
    const tally = this.tally(res, voters);
    G.vote = { ...G.vote, final: tally };
    const max = Math.max(0, ...Object.values(tally));
    let out = null;
    if (max <= 0) { this.log("Personne n'a voté : le village épargne tout le monde aujourd'hui.", "info"); G.vote = null; return null; }
    const tied = Object.keys(tally).filter((k) => tally[k] === max);
    if (tied.length === 1) out = tied[0];
    else {
      const bouc = this.byRole("bouc");
      if (bouc && this.powered(bouc)) {
        this.kill(bouc.id, "bouc");
        const opts = this.alive().map((p) => p.id);
        if (opts.length) {
          const r = yield* this.ask({ [bouc.id]: this.qPick({ kind: "bouc", title: roleTitle("bouc"), text: "Avant de partir, choisis qui aura le droit de voter demain.", opts, min: 1, max: opts.length, bot: () => ({ pick: shuffle(G, [...opts]).slice(0, Math.max(1, Math.ceil(opts.length / 2))) }) }) }, { kind: "trigger", t: "day", label: "Eddie choisit qui votera demain…" });
          G.banVote = r[bouc.id] && r[bouc.id].length ? r[bouc.id] : null;
          if (G.banVote) this.log(`Demain, seuls ${G.banVote.map((id) => this.name(id)).join(", ")} pourront voter.`, "info");
        }
        yield* this.afterDeaths();
        G.vote = null;
        return bouc.id;
      }
      const cap = G.cap && this.P(G.cap) && this.P(G.cap).alive ? this.P(G.cap) : null;
      if (cap) {
        const r = yield* this.ask({ [cap.id]: this.qPick({ kind: "tiebreak", title: "Égalité", text: "Tu es capitaine : à toi de trancher entre les ex aequo.", opts: tied, bot: () => ({ pick: [one(G, tied)] }) }) }, { kind: "trigger", t: "day", label: "Le capitaine tranche…" });
        out = (r[cap.id] || [])[0] || one(G, tied);
      } else { this.log("Égalité : personne n'est éliminé.", "info"); G.vote = null; return null; }
    }
    // Jonathan (Servante dévouée) peut prendre le rôle de l'éliminé
    const victim = this.P(out);
    const serv = this.byRole("servante");
    const inLove = (id) => G.lovers && G.lovers.includes(id);
    if (serv && serv.id !== victim.id && !inLove(serv.id) && this.powered(serv) && !(victim.role === "idiot" && !victim.idiot)) {
      const r = yield* this.ask({ [serv.id]: this.qChoice({ kind: "servante", title: roleTitle("servante"), text: `${victim.name} va être éliminé. Prendre son rôle en secret ? C'est toi qui seras révélé à sa place.`, choices: [{ v: "no", label: "Non" }, { v: "yes", label: "Prendre son rôle" }], bot: () => ({ v: rnd(G) < 0.25 ? "yes" : "no" }) }) }, { kind: "trigger", t: "day", label: "Un instant…" });
      if (r[serv.id] === "yes") {
        const role = victim.role, camp = victim.camp;
        victim.role = "servante"; victim.camp = "village"; victim.shown = "servante";
        this.become(serv, role);
        serv.camp = camp;
        if (G.esModel === victim.id && role !== "enfant") { /* le modèle reste le même joueur */ }
        if (role === "cupidon") G.lovers = null;
        this.note(serv.id, `Tu prends en secret le rôle de ${victim.name} : ${roleLabel(role)}.`, "role");
        this.log(`Jonathan se dévoue : le rôle de ${victim.name} passe à quelqu'un d'autre…`, "alert");
      }
    }
    // Argyle (Idiot du village)
    if (victim.role === "idiot" && !victim.idiot && !victim.shown && this.powered(victim)) {
      victim.idiot = true; victim.shown = "idiot";
      this.log(`Le village vote contre ${victim.name}… mais c'est Argyle, l'Idiot du village ! Il est épargné, et ne votera plus.`, "alert");
      G.vote = null;
      return null;
    }
    const wasRole = victim.shown || victim.role;
    const merc = G.merc;
    this.kill(victim.id, "vote");
    // Barb (Ange) : éliminée au premier vote, elle gagne seule
    if (first && G.day === 1 && wasRole === "ange") this.win("solo", [victim.id], "Justice pour Barb !", "Barb a été éliminée au premier vote : elle gagne seule.");
    if (first && G.day === 1 && merc && merc.target === victim.id) { const m = this.P(merc.pid); if (m && m.alive && m.camp === "solo") this.win("solo", [m.id], "Contrat rempli", `Grigori, l'agent russe, a fait éliminer sa cible (${victim.name}) : il gagne seul.`); }
    yield* this.afterDeaths();
    G.vote = null;
    return out;
  }
  tally(res, voters) {
    const G = this.G;
    const t = {};
    for (const p of voters) { const v = (res[p.id] || [])[0]; if (v) t[v] = (t[v] || 0) + (G.cap === p.id ? 2 : 1); }
    const c = G.vote && G.vote.corbeau;
    if (c && Object.keys(t).length) t[c] = (t[c] || 0) + 2;
    else if (c) t[c] = 2;
    return t;
  }
  /** Indice de Robin (Mentaliste) pendant le vote : le village vise-t-il une créature ? (une fois par vote) */
  mentalHint() {
    const G = this.G;
    const robin = this.byRole("mentaliste");
    if (!robin || !this.powered(robin) || !G.vote || G.vote.kind !== "vote" || G.vote.hinted) return false;
    G.vote.hinted = true;
    const res = Object.fromEntries(Object.entries(G.vote.votes).map(([k, v]) => [k, v ? [v] : []]));
    const voters = this.alive().filter((p) => !p.idiot);
    const t = this.tally(res, voters);
    const max = Math.max(0, ...Object.values(t));
    const top = Object.keys(t).filter((k) => t[k] === max);
    if (!max) this.note(robin.id, "Ton décodeur ne capte rien : personne n'a encore voté.", "seer");
    else if (top.length > 1) this.note(robin.id, "Ton décodeur hésite : le vote est à égalité pour l'instant.", "seer");
    else this.note(robin.id, this.wolfish(this.P(top[0])) ? "Ton décodeur est formel : le village s'apprête à éliminer une créature !" : "Ton décodeur est formel : le village s'apprête à éliminer un innocent…", "seer");
    return true;
  }
  /** Vote d'un bot : ce qu'il sait, sinon il suit souvent la majorité. */
  botVote(p, opts) {
    const G = this.G;
    const k = G.know[p.id] || {};
    if (this.inPack(p)) {
      const safe = opts.filter((id) => !this.inPack(this.P(id)));
      const cur = Object.values((G.vote && G.vote.votes) || {}).filter((id) => safe.includes(id));
      return cur.length && rnd(G) < 0.6 ? one(G, cur) : one(G, safe) || one(G, opts);
    }
    const wolf = opts.filter((id) => k[id] === "wolf");
    if (wolf.length) return one(G, wolf);
    const cand = opts.filter((id) => k[id] !== "good" && !(G.lovers && G.lovers.includes(p.id) && G.lovers.includes(id)));
    const cur = Object.values((G.vote && G.vote.votes) || {}).filter((id) => cand.includes(id));
    if (cur.length && rnd(G) < 0.5) return one(G, cur);
    const sus = cand.filter((id) => k[id] === "sus");
    return one(G, sus.length && rnd(G) < 0.7 ? sus : cand) || one(G, opts);
  }

  /* ---------------------------- fin ---------------------------- */
  win(camp, ids, title, text) {
    const G = this.G;
    if (G.over) throw OVER;
    G.over = true; G.phase = "over"; G.step = "Fin de la partie";
    G.winner = { camp, ids, title, text };
    this.log(text, "end");
    throw OVER;
  }
  /** Vérifie les conditions de victoire (lance la fin de partie si besoin). */
  checkEnd() {
    const G = this.G;
    if (G.over) throw OVER;
    const al = this.alive();
    if (!al.length) this.win("none", [], "Personne ne gagne", "Hawkins est vide : tout le monde est mort, personne ne gagne.");
    const L = G.lovers && G.lovers.every((id) => this.P(id).alive) ? G.lovers.map((id) => this.P(id)) : null;
    const mixed = L && (L[0].camp === "loups") !== (L[1].camp === "loups");
    if (mixed && al.length === 2) this.win("lovers", G.lovers, "L'amour triomphe", `${L[0].name} et ${L[1].name}, amoureux de deux mondes, sont les derniers survivants : ils gagnent ensemble.`);
    const fl = al.find((p) => p.role === "flute");
    if (fl && al.length > 1 && al.every((p) => p === fl || p.charmed)) this.win("solo", [fl.id], "Papa a gagné", "Tous les survivants sont sous le contrôle de Papa : le Dr Brenner gagne seul.");
    const vec = al.find((p) => p.role === "blanc");
    if (vec && al.length === 1) this.win("solo", [vec.id], "Vecna règne", "Vecna est le dernier survivant : le maître des cauchemars gagne seul.");
    const sec = al.find((p) => p.role === "sectaire" && p.camp === "solo");
    if (sec && G.sect && al.every((p) => G.sect[p.id] === G.sect[sec.id])) this.win("solo", [sec.id], "Jason a gagné", `Tout l'autre clan est éliminé : Jason Carver et ${G.sect[sec.id] ? "le Hellfire Club" : "les Tigers"} gagnent… enfin, surtout Jason.`);
    const wolves = al.filter((p) => p.camp === "loups");
    const others = al.filter((p) => p.camp !== "loups");
    if (!wolves.length && !vec && !fl) {
      if (mixed) return;
      this.win("village", G.players.filter((p) => p.camp === "village").map((p) => p.id), "Hawkins est sauvé", "Toutes les créatures sont éliminées : les habitants de Hawkins gagnent !");
    }
    if (wolves.length && !others.length) this.win("loups", G.players.filter((p) => p.camp === "loups").map((p) => p.id), "Le Monde à l'envers l'emporte", "Il ne reste plus que des créatures : le Monde à l'envers engloutit Hawkins.");
  }

  /* ---------------------------- discussion ---------------------------- */
  /** Canaux lisibles et écrivables par un joueur. */
  channels(pid) {
    const G = this.G;
    const p = this.P(pid);
    if (!p) return { read: [], write: [] };
    const read = ["day"], write = [];
    if (G.over) return { read: ["day", "pack", "lovers", "soeur", "frere", "dead"], write: ["day"] };
    if (p.alive && (G.phase === "day" || G.phase === "dawn")) write.push("day");
    if (this.inPack(p)) { read.push("pack"); write.push("pack"); }
    if (G.lovers && G.lovers.includes(pid)) { read.push("lovers"); if (p.alive) write.push("lovers"); }
    for (const fam of ["soeur", "frere"]) if (p.role === fam) { read.push(fam); if (p.alive) write.push(fam); }
    if (!p.alive) { read.push("dead"); write.push("dead"); }
    if (p.alive && p.role === "chaman" && this.powered(p) && G.phase === "night") read.push("dead");
    return { read, write };
  }
  /** Message de discussion. Le mot du Loup bavard est repéré automatiquement dans la discussion du jour. */
  say(pid, ch, text) {
    const G = this.G;
    const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!t || !this.channels(pid).write.includes(ch)) return false;
    G.chat.push({ n: ++G.chatN, ch, from: pid, t, d: G.day, ni: G.night });
    if (G.chat.length > KEEP_CHAT) G.chat.splice(0, G.chat.length - KEEP_CHAT);
    if (ch === "day" && G.bavard && G.bavard.pid === pid && !G.bavard.said && norm(t).includes(norm(G.bavard.word))) { G.bavard.said = true; this.note(pid, "Mot placé ! La meute peut compter sur toi.", "word"); }
    return true;
  }
}

export { OVER, WOLF_ROLES };
