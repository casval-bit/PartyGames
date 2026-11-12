// Trône des Mondes côté créateur du salon : decks des joueurs, partie (moteur src/tcg/engine.js), bots, minuteur.
// Ces méthodes sont ajoutées à HostEngine (voir la fin de hostEngine.js).
import { Game } from "../tcg/engine.js";
import { starters, validateDeck } from "../tcg/deck.js";
import { FAMILY } from "../tcg/cards/index.js";
import { publicView, privateView } from "../tcg/view.js";

export const AG_GOALS = [10, 15];
export const AG_TIMERS = [[45, "45 s"], [90, "1 min 30"], [180, "3 min"], [0, "Illimité"]];
export const AG_MAX = 4;
export const AG_DEFAULTS = { agGoal: 15, agTimer: 90 };

const botDelay = () => (globalThis.TRONE_FAST ? 2 : 650);

/** Nettoie un deck reçu du réseau (forme seulement ; les règles sont vérifiées par validateDeck). */
export function cleanDeck(d) {
  if (!d || typeof d !== "object" || typeof d.fam !== "string" || !FAMILY[d.fam]) return null;
  const cards = {};
  const entries = d.cards && typeof d.cards === "object" ? Object.entries(d.cards).slice(0, 80) : [];
  for (const [id, n] of entries) if (typeof id === "string" && id.length <= 60 && Number.isInteger(n) && n >= 1 && n <= 2) cards[id] = n;
  const plots = Array.isArray(d.plots) ? d.plots.filter((x) => typeof x === "string" && x.length <= 60).slice(0, 7) : [];
  return { name: String(d.name || "Deck").slice(0, 32), fam: d.fam, pt: typeof d.pt === "string" ? d.pt.slice(0, 20) : null, cards, plots };
}
/** Nettoie une réponse de joueur (seulement des champs connus, de taille bornée). */
export function cleanAnswer(a) {
  if (!a || typeof a !== "object") return null;
  const out = {};
  const s = (v, n = 40) => (typeof v === "string" && v.length <= n ? v : undefined);
  const arr = (v) => (Array.isArray(v) && v.length <= 40 && v.every((x) => typeof x === "string" && x.length <= 40) ? [...v] : undefined);
  if (typeof a.keep === "boolean") out.keep = a.keep;
  if (a.pass === true) out.pass = true;
  if (typeof a.pick === "string") out.pick = s(a.pick); else if (Array.isArray(a.pick)) out.pick = arr(a.pick);
  if (s(a.k, 8)) out.k = a.k;
  if (s(a.u)) out.u = a.u;
  if (Number.isInteger(a.i) && a.i >= 0 && a.i < 10) out.i = a.i;
  if (Number.isInteger(a.j) && a.j >= 0 && a.j < 60) out.j = a.j;
  if (s(a.type, 12)) out.type = a.type;
  if (s(a.def)) out.def = a.def;
  if (arr(a.atk)) out.atk = arr(a.atk);
  if (arr(a.dfd)) out.dfd = arr(a.dfd);
  return out;
}

export const troneMethods = {
  /** Un joueur choisit son deck dans le lobby. */
  agSetDeck(id, deck) {
    const p = this.player(id);
    if (!p || this.S.phase !== "lobby") return;
    const d = cleanDeck(deck);
    const ok = d && validateDeck(d).ok;
    this.agDecks = this.agDecks || {};
    if (ok) { this.agDecks[id] = d; p.agDeck = { name: d.name, fam: d.fam, pt: d.pt }; } else { delete this.agDecks[id]; p.agDeck = null; }
    this.broadcast();
  },
  agReady() {
    const humans = this.S.players.filter((p) => !p.bot);
    return this.S.players.length >= 2 && this.S.players.length <= AG_MAX && humans.every((p) => this.agDecks && this.agDecks[p.id]);
  },
  startTrone() {
    if (!this.agReady()) return;
    const all = starters();
    const players = this.S.players.map((p) => ({
      id: p.id, name: p.name, bot: Boolean(p.bot), look: p.look,
      deck: p.bot ? all[Math.floor(Math.random() * all.length)] : this.agDecks[p.id],
    }));
    for (const p of this.S.players) if (p.bot) { const d = players.find((x) => x.id === p.id).deck; p.agDeck = { name: d.name, fam: d.fam, pt: d.pt || null }; }
    const s = this.S.settings;
    this.agGame = new Game({ players, goal: AG_GOALS.includes(s.agGoal) ? s.agGoal : 15, seed: (Math.random() * 2 ** 31) | 0, autoBots: false });
    this.agSent = {};
    this.agStamp = (this.agStamp || 0) + 1;
    this.setPhase("ag_play", null);
    this.agTick();
  },
  /** À appeler après chaque changement : état public, vues privées, coups des bots, minuteur des joueurs. */
  agTick() {
    const g = this.agGame;
    if (!g || this.dead) return;
    const stamp = (this.agStamp = (this.agStamp || 0) + 1);
    clearTimeout(this.agBotT); clearTimeout(this.agAfkT);
    this.S.ag = publicView(g);
    if (g.G.over) {
      this.deadline = null;
      this.S.phase = "ag_end";
      for (const p of this.S.players) this.ps(p.id).ag = (g.G.st || {})[p.id] || null;
    }
    // vues privées (envoyées seulement si elles ont changé)
    for (const p of this.S.players) {
      if (p.bot) continue;
      const v = privateView(g, p.id);
      const key = JSON.stringify(v);
      if (this.agSent[p.id] !== key) { this.agSent[p.id] = key; this.emit({ t: "agp", to: p.id, v }); }
    }
    if (g.G.over) { this.broadcast(); return; }
    const waiting = g.waitingFor();
    const botIds = new Set(this.S.players.filter((p) => p.bot).map((p) => p.id));
    const gone = new Set(g.G.players.filter((p) => !this.player(p.id)).map((p) => p.id)); // partis : l'ordinateur joue pour eux
    const auto = waiting.filter((id) => botIds.has(id) || gone.has(id));
    const humans = waiting.filter((id) => !auto.includes(id));
    if (auto.length) {
      this.agBotT = setTimeout(() => {
        if (this.dead || stamp !== this.agStamp || this.agGame !== g) return;
        for (const id of auto) g.auto(id);
        this.agTick();
      }, humans.length ? (globalThis.TRONE_FAST ? 1 : 80) : botDelay() + (globalThis.TRONE_FAST ? 0 : Math.random() * 450));
    }
    const t = this.S.settings.agTimer;
    if (humans.length && t > 0) {
      this.deadline = Date.now() + t * 1000;
      this.agAfkT = setTimeout(() => {
        if (this.dead || stamp !== this.agStamp || this.agGame !== g) return;
        for (const id of g.waitingFor()) g.auto(id); // trop long : l'ordinateur répond à sa place
        this.agTick();
      }, t * 1000 + 300);
    } else if (!humans.length) this.deadline = null;
    this.broadcast();
  },
  /** Réponse d'un joueur à la question `pid` (numéro de la question en cours, pour ignorer les réponses en retard). */
  agAnswer(id, pid, a) {
    const g = this.agGame;
    if (!g || this.S.phase !== "ag_play" || !g.wait || g.wait.id !== pid) return;
    const clean = cleanAnswer(a);
    if (!clean) return;
    if (g.answer(id, clean)) this.agTick();
    else { this.agSent[id] = null; this.agTick(); } // réponse refusée : on renvoie la question
  },
  agClear() {
    clearTimeout(this.agBotT); clearTimeout(this.agAfkT);
    this.agGame = null; this.S.ag = null; this.agSent = {};
    this.agStamp = (this.agStamp || 0) + 1;
  },
};
