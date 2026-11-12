// Loup-garou (version Stranger Things) côté créateur du salon : composition, partie (moteur src/lg/engine.js), bots, minuteurs.
// Ces méthodes sont ajoutées à HostEngine (voir la fin de hostEngine.js).
import { LgGame } from "../lg/engine.js";
import { ROLES, BOXES, autoCompo, checkCompo } from "../lg/roles.js";
import { publicView, privateView } from "../lg/view.js";

export const LG_MIN = 4;
export const LG_MAX = 18;
export const LG_NIGHT = [[30, "30 s"], [45, "45 s"], [60, "1 min"], [90, "1 min 30"]];
export const LG_DEBATE = [[60, "1 min"], [120, "2 min"], [180, "3 min"], [300, "5 min"], [480, "8 min"], [0, "Illimité"]];
export const LG_VOTE = [[30, "30 s"], [45, "45 s"], [60, "1 min"], [90, "1 min 30"]];
export const LG_DEFAULTS = { lgBoxes: BOXES.map((b) => b.id), lgWolves: 0, lgNight: 45, lgDebate: 180, lgVote: 60, lgCap: true, lgShow: true, lgPick: null };
const GRACE_MS = 8000; // vote : quand tout le monde a voté, encore 8 s pour changer d'avis

const fast = () => Boolean(globalThis.LG_FAST);
const rand = (a, b) => a + Math.random() * (b - a);

/** Réglages reçus du créateur (déjà filtrés par setSettings). */
export function cleanLgSettings(patch, s) {
  if (Array.isArray(patch.lgBoxes)) { const ok = patch.lgBoxes.filter((b) => BOXES.some((x) => x.id === b)); if (ok.includes("base")) s.lgBoxes = [...new Set(ok)]; }
  if (Number.isInteger(patch.lgWolves) && patch.lgWolves >= 0 && patch.lgWolves <= 6) s.lgWolves = patch.lgWolves;
  if (LG_NIGHT.some(([v]) => v === patch.lgNight)) s.lgNight = patch.lgNight;
  if (LG_DEBATE.some(([v]) => v === patch.lgDebate)) s.lgDebate = patch.lgDebate;
  if (LG_VOTE.some(([v]) => v === patch.lgVote)) s.lgVote = patch.lgVote;
  if (typeof patch.lgCap === "boolean") s.lgCap = patch.lgCap;
  if (typeof patch.lgShow === "boolean") s.lgShow = patch.lgShow;
  if (patch.lgPick === null) s.lgPick = null;
  else if (Array.isArray(patch.lgPick) && patch.lgPick.length <= LG_MAX + 2 && patch.lgPick.every((id) => typeof id === "string" && ROLES[id])) s.lgPick = [...patch.lgPick];
}
/** Réponse d'un joueur (forme seulement : le moteur vérifie le reste). */
export function cleanLgAnswer(a) {
  if (!a || typeof a !== "object") return null;
  const out = {};
  const s = (v, n = 40) => (typeof v === "string" && v.length <= n ? v : undefined);
  if (Array.isArray(a.pick) && a.pick.length <= 20 && a.pick.every((x) => typeof x === "string" && x.length <= 40)) out.pick = [...a.pick];
  if (a.skip === true) out.skip = true;
  if (s(a.v, 16)) out.v = a.v;
  if (s(a.save)) out.save = a.save;
  if (s(a.kill)) out.kill = a.kill;
  return out;
}

export const loupMethods = {
  lgReady() {
    const n = this.S.players.length;
    if (n < LG_MIN || n > LG_MAX) return false;
    const pick = this.S.settings.lgPick;
    return !pick || checkCompo(pick, n).length === 0;
  },
  startLoup() {
    if (!this.lgReady()) return;
    const s = this.S.settings;
    const n = this.S.players.length;
    const allowed = Object.keys(ROLES).filter((id) => (s.lgBoxes || ["base"]).includes(ROLES[id].box));
    const compo = s.lgPick && !checkCompo(s.lgPick, n).length ? [...s.lgPick] : autoCompo(n, allowed, { wolves: s.lgWolves || 0 });
    this.lgGame = new LgGame({ players: this.S.players.map((p) => ({ id: p.id, name: p.name, bot: Boolean(p.bot) })), compo, seed: (Math.random() * 2 ** 31) | 0, opts: { cap: s.lgCap !== false, show: s.lgShow !== false } });
    this.lgSent = {};
    this.lgWaitId = null;
    this.lgStamp = (this.lgStamp || 0) + 1;
    this.setPhase("lg_play", null);
    this.lgTick();
  },
  /** Durée d'une étape (secondes), selon les réglages. 0 = pas de limite. */
  lgDuration(w) {
    const s = this.S.settings;
    if (fast()) return w.kind === "debate" ? 0.6 : 0.4;
    if (w.kind === "role") return 40;
    if (w.kind === "debate") return s.lgDebate || 0;
    if (w.kind === "vote" || w.kind === "cap") return s.lgVote || 60;
    if (w.kind === "wolves") return (s.lgNight || 45) + 15;
    if (w.t === "night") return s.lgNight || 45;
    return 40; // tir de Nancy, succession, Servante, Juge…
  },
  /** Quand un bot répond : pas trop vite (la nuit, personne ne doit deviner qui agit), et jamais avant les humains au débat. */
  lgBotDelay(w) {
    if (fast()) return 0;
    if (globalThis.LG_BOTFAST) return rand(60, 400); // tests de l'interface : les bots répondent tout de suite
    if (w.kind === "role") return rand(900, 2500);
    if (w.kind === "debate") return rand(12000, 30000);
    if (w.kind === "vote" || w.kind === "cap") return rand(3000, 12000);
    if (w.t === "night") return rand(2500, 7000);
    return rand(1500, 4000);
  },
  lgTick() {
    const g = this.lgGame;
    if (!g || this.dead) return;
    const stamp = (this.lgStamp = (this.lgStamp || 0) + 1);
    clearTimeout(this.lgBotT); clearTimeout(this.lgEndT);
    this.S.lg = publicView(g);
    if (g.G.over) { this.deadline = null; this.S.phase = "lg_end"; }
    for (const p of this.S.players) {
      if (p.bot) continue;
      const v = privateView(g, p.id);
      const key = JSON.stringify(v);
      if (this.lgSent[p.id] !== key) { this.lgSent[p.id] = key; this.emit({ t: "lgp", to: p.id, v }); }
    }
    if (g.G.over || !g.wait) { this.broadcast(); return; }
    const w = g.wait;
    const now = Date.now();
    if (this.lgWaitId !== w.id) {
      this.lgWaitId = w.id;
      const d = this.lgDuration(w);
      this.lgStepEnd = d ? now + d * 1000 : null;
      this.lgGrace = null; this.lgHinted = false;
      this.lgBotDue = {};
      for (const id of Object.keys(w.asks)) this.lgBotDue[id] = now + this.lgBotDelay(w);
    }
    const waiting = g.waitingFor();
    const botIds = new Set(this.S.players.filter((p) => p.bot).map((p) => p.id));
    const gone = new Set(g.G.players.filter((p) => !this.player(p.id)).map((p) => p.id)); // partis : l'ordinateur joue pour eux
    const auto = waiting.filter((id) => botIds.has(id) || gone.has(id));
    const humans = waiting.filter((id) => !auto.includes(id));
    // au débat, les bots attendent que les humains soient prêts (ou la moitié du temps)
    if (w.kind === "debate" && humans.length && !globalThis.LG_BOTFAST) for (const id of auto) this.lgBotDue[id] = Math.max(this.lgBotDue[id] || 0, this.lgStepEnd ? now + (this.lgStepEnd - now) * 0.5 : now + 45000);
    // vote : tout le monde a voté → délai de grâce, et l'indice de Robin
    if (w.revisable && w.kind !== "debate" && !waiting.length && !this.lgGrace) this.lgGrace = now + (fast() ? 50 : GRACE_MS);
    const end = [this.lgStepEnd, this.lgGrace].filter(Boolean);
    const deadline = end.length ? Math.min(...end) : null;
    if (w.kind === "vote" && !this.lgHinted && deadline && (this.lgGrace || deadline - now <= 15000)) { this.lgHinted = true; if (g.mentalHint()) return this.lgTick(); }
    this.deadline = deadline;
    if (auto.length) {
      const due = Math.min(...auto.map((id) => this.lgBotDue[id] || now));
      this.lgBotT = setTimeout(() => {
        if (this.dead || stamp !== this.lgStamp || this.lgGame !== g) return;
        const t = Date.now();
        for (const id of g.waitingFor()) if ((botIds.has(id) || gone.has(id)) && (this.lgBotDue[id] || 0) <= t + 5) g.auto(id);
        this.lgTick();
      }, Math.max(fast() ? 1 : 30, due - now));
    }
    if (deadline) {
      this.lgEndT = setTimeout(() => {
        if (this.dead || stamp !== this.lgStamp || this.lgGame !== g) return;
        if (w.kind === "vote" && !this.lgHinted) { this.lgHinted = true; g.mentalHint(); }
        g.close(); // minuteur écoulé : réponses par défaut pour les absents
        this.lgTick();
      }, Math.max(fast() ? 1 : 50, deadline - now));
    }
    this.broadcast();
  },
  /** Réponse d'un joueur à l'étape `wid`. */
  lgAnswer(id, wid, a) {
    const g = this.lgGame;
    if (!g || this.S.phase !== "lg_play" || !g.wait || g.wait.id !== wid) return;
    const clean = cleanLgAnswer(a);
    if (!clean) return;
    if (!g.answer(id, clean)) this.lgSent[id] = null; // refusée : on renvoie la question
    this.lgTick();
  },
  lgChat(id, ch, text) {
    const g = this.lgGame;
    if (!g || !["lg_play", "lg_end"].includes(this.S.phase)) return;
    if (g.say(id, ch, text)) this.lgTick();
  },
  lgClear() {
    clearTimeout(this.lgBotT); clearTimeout(this.lgEndT);
    this.lgGame = null; this.S.lg = null; this.lgSent = {}; this.lgWaitId = null;
    this.lgStamp = (this.lgStamp || 0) + 1;
  },
};
