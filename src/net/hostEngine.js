// Le créateur du lobby fait tourner ce moteur : il est la source de vérité.
// Les autres joueurs lui envoient des actions, il diffuse l'état public et envoie à chacun ses cartes en privé.
import { CATEGORIES, BY_ID, rulesFor } from "../data/categories.js";
import { drawPack, CARD_BY_ID } from "../data/cards.js";
import { findFirstWithImage } from "../data/wikiImages.js";
import { freshTrack } from "../data/playlist.js";
import { judge, cleanTitle, partPoints, streakBonus } from "../data/blindtest.js";
import { shuffle, pick, uid } from "../lib/util.js";
import { safeUrl } from "../lib/safeUrl.js";
import { verifyMsg, validPk } from "./secure.js";
import { cleanLook, randomFreeLook } from "../data/profile.js";
import {
  DEFAULT_PER_TEAM, VOTE_SECONDS, DISCARD_SECONDS, BOOSTER_SECONDS, REVEAL_MS, SHUFFLE_MS, COUNTDOWN_MS, HAND_SIZE,
  TU_ROUNDS, TU_READY_SECONDS, TU_TURNEND_MS, TU_ROUNDEND_SECONDS, TU_MIN_CARRY_MS, TU_ROUND_RULES, FAST,
  QE_ROUNDS_OPTIONS, QE_DEFAULT_ROUNDS, QE_TAP_SECONDS, QE_COUNT_MS, QE_PLAY_SECONDS, QE_RESULT_MS,
  BONUS_SECONDS, BONUS_SLOTS, TIME_BONUS_MS, SCORE_BONUS_PTS,
  BT_SONGS_OPTIONS, BT_GUESS_OPTIONS, BT_BREAK_SECONDS, BT_MAX_SOLO, BT_PREVIEW_S, BT_DEFAULTS,
} from "../config.js";

/** Pseudo : sans caractères de contrôle ni d'inversion de texte, 16 caractères au plus. */
export const cleanName = (n) => String(n ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff<>]/g, "").trim().slice(0, 16) || "Joueur";

const BOT_NAMES = ["Léa", "Hugo", "Nina", "Tom", "Inès", "Max", "Zoé", "Lucas", "Maëlle", "Noah", "Jade", "Eliott"];
const VOTE_IDS = new Set([...CATEGORIES.map((c) => c.id), "random", "mixtes"]);

export class HostEngine {
  /** @param {{roomId:string, name:string, host:{id:string,name:string}, emit:(msg:any)=>void}} o */
  constructor({ roomId, name, host, emit, fresh, signed }) {
    this.emit = emit;
    this.signed = Boolean(signed);   // vrai : tout message réseau doit être signé par le joueur (voir secure.js)
    this.pks = {};                   // clé publique de chaque joueur : { id: "x.y" }
    this.lastN = {};                 // dernier compteur vu par joueur (anti-rejeu)
    this.buckets = {};               // limiteur de débit par expéditeur
    this.chains = {};                // file d'attente par expéditeur (vérification asynchrone, ordre conservé)
    this.fresh = fresh || freshTrack;
    this.playlist = [];  // blind test : morceaux importés (restent chez le créateur)
    this.btQueue = [];
    this.timers = new Set();
    this.deadline = null;
    this.nextColor = 0;
    this.votes = {};
    this.hands = {};   // boosters ouverts : { joueur: [pack, pack] }
    this.dealt = {};   // 12 cartes reçues après le mélange commun : { joueur: [cartes] }
    this.discards = {};
    this.gameDeck = []; // paquet commun de la partie (après défausse, remélangé)
    this.bonusPicks = {}; // variante Bonus : { joueur: { carte: "time" | "score" } } pendant le choix
    this.bonusMap = {};   // bonus actifs pour la manche : { carte: "time" | "score" }
    this.turnTimer = null;
    this.state = {
      id: roomId,
      name,
      hostId: host.id,
      settings: { game: "timesup", variant: "classic", roundSeconds: 45, teamCount: 2, perTeam: DEFAULT_PER_TEAM, rounds: QE_DEFAULT_ROUNDS, ...BT_DEFAULTS },
      players: [],
      phase: "lobby",
      votesCast: {},
      tally: {},
      reveal: null,
      tu: null,
      deckSize: 0,
      qe: null,
      bonus: null,
      playlist: null,
      bt: null,
      pstats: {},   // statistiques détaillées de la partie en cours, par joueur (pour les profils)
      gameNo: 0,    // numéro de la partie dans ce lobby (sert à ne compter chaque partie qu'une fois)
      endsIn: null,
    };
    this.addPlayer({ id: host.id, name: host.name, pk: host.pk, look: host.look });
    this.hb = setInterval(() => this.broadcast(), 4000);
  }

  /* ---------------------------- utilitaires ---------------------------- */
  get S() { return this.state; }
  get rules() { return rulesFor(this.S.settings); }
  get variant() { return this.S.settings.game === "timesup" && this.S.settings.variant === "bonus" ? "bonus" : "classic"; }
  get capacity() { const s = this.S.settings; return s.game === "blindtest" && !s.btTeams ? BT_MAX_SOLO : s.teamCount * s.perTeam; }
  after(ms, fn) {
    const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
    this.timers.add(t);
    return t;
  }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers.clear(); }
  setPhase(phase, ms) {
    this.S.phase = phase;
    this.deadline = ms ? Date.now() + ms : null;
  }
  publicState() {
    return { ...this.S, endsIn: this.deadline ? Math.max(0, this.deadline - Date.now()) : null };
  }
  broadcast() { this.emit({ t: "state", state: this.publicState() }); }
  lobbyInfo() {
    const S = this.S;
    return {
      roomId: S.id, name: S.name,
      hostName: S.players.find((p) => p.id === S.hostId)?.name || "?",
      count: S.players.length, max: this.capacity, status: S.phase, game: S.settings.game,
    };
  }
  player(id) { return this.S.players.find((p) => p.id === id); }
  teamSize(t) { return this.S.players.filter((p) => p.team === t).length; }
  allReady() { return this.S.players.every((p) => p.ready); }
  resetReady() { this.S.players.forEach((p) => (p.ready = false)); }
  destroy() {
    this.dead = true;
    this.clearTimers();
    clearInterval(this.hb);
    this.emit({ t: "closed" });
  }

  /* ------------------------------- lobby ------------------------------- */
  addPlayer({ id, name, pk, look }, isBot = false) {
    if (this.player(id)) return this.broadcast();
    if (this.S.phase !== "lobby") return this.emit({ t: "denied", to: id, reason: "La partie a déjà commencé." });
    if (this.S.players.length >= this.capacity) return this.emit({ t: "denied", to: id, reason: "Le lobby est complet." });
    // répartition dans l'ordre d'arrivée : équipe la moins remplie, puis la première
    let best = 0;
    for (let t = 0; t < this.S.settings.teamCount; t++) if (this.teamSize(t) < this.teamSize(best)) best = t;
    if (pk) this.pks[id] = pk;
    this.S.players.push({ id, name: cleanName(name), look: isBot ? randomFreeLook() : cleanLook(look), team: best, ci: this.nextColor++, ready: false, bot: isBot, joinedAt: Date.now() });
    this.broadcast();
  }
  addBot() {
    const taken = new Set(this.S.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !taken.has(n)) || "Bot" + uid(2);
    this.addPlayer({ id: "bot-" + uid(5), name }, true);
  }
  leave(id) {
    if (id === this.S.hostId) return;
    this.S.players = this.S.players.filter((p) => p.id !== id);
    delete this.pks[id]; delete this.lastN[id]; delete this.buckets[id]; delete this.chains[id];
    delete this.S.votesCast[id];
    delete this.votes[id];
    this.S.tally = {};
    for (const v of Object.values(this.votes)) for (const c of v) if (c) this.S.tally[c] = (this.S.tally[c] || 0) + 1;
    this.broadcast();
    if (this.S.phase !== "lobby" && this.S.players.length < (this.S.settings.game === "blindtest" ? 1 : 2)) return this.abort("Il n'y a plus assez de joueurs.");
    if (this.S.phase === "bt_play") this.btCheckDone();
    if (["tu_ready", "tu_play"].includes(this.S.phase) && this.S.tu && this.S.tu.playerId === id) return this.endTurn("left");
    this.checkAdvance();
  }
  kick(by, id) {
    if (by !== this.S.hostId || id === this.S.hostId) return;
    this.emit({ t: "kicked", to: id });
    this.leave(id);
  }
  setLook(id, look) {
    const p = this.player(id);
    if (!p || this.S.phase !== "lobby") return;
    p.look = cleanLook(look);
    this.broadcast();
  }
  setTeam(id, team) {
    const p = this.player(id);
    if (!p || this.S.phase !== "lobby") return;
    if (team < 0 || team >= this.S.settings.teamCount || p.team === team) return;
    if (this.teamSize(team) >= this.S.settings.perTeam) return;
    p.team = team;
    this.broadcast();
  }
  setSettings(by, patch) {
    if (by !== this.S.hostId || this.S.phase !== "lobby") return;
    const s = this.S.settings;
    if (patch.game === "timesup" || patch.game === "quiest" || patch.game === "blindtest") s.game = patch.game;
    if (BT_SONGS_OPTIONS.includes(patch.btSongs)) s.btSongs = patch.btSongs;
    if (BT_GUESS_OPTIONS.includes(patch.btGuess)) s.btGuess = patch.btGuess;
    for (const k of ["btOneGuess", "btManual", "btTeams"]) if (typeof patch[k] === "boolean") s[k] = patch[k];
    if (patch.btScoring === "shared" || patch.btScoring === "sum") s.btScoring = patch.btScoring;
    if (patch.btAudio === "all" || patch.btAudio === "host") s.btAudio = patch.btAudio;
    if (patch.variant === "classic" || patch.variant === "bonus") s.variant = patch.variant;
    if (QE_ROUNDS_OPTIONS.includes(patch.rounds)) s.rounds = patch.rounds;
    if (patch.roundSeconds) s.roundSeconds = patch.roundSeconds;
    if (patch.perTeam) {
      const n = Math.max(2, Math.min(6, patch.perTeam));
      const biggest = Math.max(...Array.from({ length: s.teamCount }, (_, t) => this.teamSize(t)));
      if (n < biggest) return; // une équipe a plus de joueurs que la nouvelle limite
      s.perTeam = n;
    }
    if (patch.teamCount && patch.teamCount !== s.teamCount) {
      const n = Math.max(2, Math.min(4, patch.teamCount));
      if (this.S.players.length > n * s.perTeam) return;
      s.teamCount = n;
      // replace ceux dont l'équipe n'existe plus
      for (const p of this.S.players.filter((x) => x.team >= n)) {
        let best = -1;
        for (let t = 0; t < n; t++) if (this.teamSize(t) < s.perTeam && (best < 0 || this.teamSize(t) < this.teamSize(best))) best = t;
        p.team = best < 0 ? 0 : best;
      }
    }
    this.broadcast();
  }
  start(by) {
    if (by !== this.S.hostId || this.S.phase !== "lobby") return;
    const teamsUsed = new Set(this.S.players.map((p) => p.team)).size;
    const st = this.S.settings;
    if (st.game === "blindtest") {
      if (!this.playlist.length) return;
      if (st.btTeams && teamsUsed < 2) return;
      this.newGame();
      return this.startBlind();
    }
    if (this.S.players.length < 2 || teamsUsed < 2) return;
    this.newGame();
    if (this.S.settings.game === "quiest") return this.startQuiEst(); // Qui est-ce ? : pas de vote, tout est aléatoire
    this.startVoting();
  }
  newGame() { this.S.gameNo += 1; this.S.pstats = {}; }
  ps(id) { return (this.S.pstats[id] ||= {}); }
  abort(reason) {
    this.clearTimers();
    this.emit({ t: "aborted", reason });
    this.S.phase = "lobby";
    this.deadline = null;
    this.S.votesCast = {}; this.S.reveal = null; this.S.qe = null; this.S.tu = null; this.S.bonus = null; this.S.bt = null; this.bonusMap = {}; this.bonusPicks = {}; this.resetReady();
    this.broadcast();
  }
  // Fin de partie (Time's Up ou Qui est-ce ?) : tout le monde retourne au lobby, équipes conservées.
  backToLobby(by) {
    if (by !== this.S.hostId || !(["done", "qe_final", "bt_final"].includes(this.S.phase))) return;
    this.clearTimers();
    this.hands = {}; this.dealt = {}; this.discards = {}; this.gameDeck = []; this.votes = {};
    Object.assign(this.S, { votesCast: {}, tally: {}, reveal: null, tu: null, deckSize: 0, qe: null, bonus: null, bt: null, pstats: {} });
    this.btQueue = []; this.btNextP = null;
    this.bonusMap = {}; this.bonusPicks = {};
    this.deck = []; this.allCards = [];
    this.resetReady();
    this.setPhase("lobby", null);
    this.broadcast();
  }

  /* ------------------------------- votes ------------------------------- */
  startVoting() {
    this.clearTimers();
    this.votes = {};
    this.S.votesCast = {};
    this.S.tally = {};
    this.S.reveal = null;
    this.resetReady();
    this.setPhase("voting", VOTE_SECONDS * 1000);
    this.broadcast();
    this.after(VOTE_SECONDS * 1000, () => this.endVoting());
    this.S.players.filter((p) => p.bot).forEach((b) => this.botVote(b));
  }
  vote(id, slots) {
    if (this.S.phase !== "voting" || !this.player(id) || !Array.isArray(slots)) return;
    const clean = Array.from({ length: this.rules.votes }, (_, i) => i).map((i) => (VOTE_IDS.has(slots[i]) ? slots[i] : null));
    this.votes[id] = clean;
    this.S.votesCast[id] = clean.filter(Boolean).length;
    this.S.tally = {};
    for (const v of Object.values(this.votes)) for (const c of v) if (c) this.S.tally[c] = (this.S.tally[c] || 0) + 1;
    this.player(id).ready = false;
    this.broadcast();
  }
  setReady(id, v) {
    const p = this.player(id);
    if (!p) return;
    if (this.S.phase === "voting" && v && this.S.votesCast[id] !== this.rules.votes) return;
    p.ready = !!v;
    this.broadcast();
    this.checkAdvance();
  }
  checkAdvance() {
    const ph = this.S.phase;
    if (ph === "tu_roundend" && this.S.players.length && this.allReady()) return this.afterRoundEnd();
    if (ph === "qe_play" && this.S.players.length && this.S.players.every((p) => this.S.qe.order.includes(p.id))) return this.endRound();
    if (!this.S.players.length || !this.allReady()) return;
    if (ph === "qe_tap") return this.startCount();
    if (ph === "voting") this.endVoting();
    else if (ph === "booster") this.startShuffle();
    else if (ph === "discard") this.endDiscard();
    else if (ph === "bonus") this.endBonus();
  }
  endVoting() {
    if (this.S.phase !== "voting") return;
    this.clearTimers();
    const reveal = {};
    for (const p of this.S.players) {
      const v = this.votes[p.id] || Array(this.rules.votes).fill(null);
      reveal[p.id] = v.map((x) => x || "mixtes"); // pas voté => Mixtes
    }
    this.S.reveal = reveal;
    this.setPhase("reveal", REVEAL_MS);
    this.broadcast();
    this.after(REVEAL_MS, () => this.startBooster(reveal));
  }

  /* ----------------------------- boosters ----------------------------- */
  startBooster(reveal) {
    const used = new Set();
    this.hands = {};
    for (const p of shuffle(this.S.players)) {
      const packs = reveal[p.id].map((choice) => drawPack(choice, used, this.rules.cards));
      this.hands[p.id] = packs;
    }
    this.resetReady();
    this.setPhase("booster", BOOSTER_SECONDS * 1000);
    this.broadcast();
    for (const p of this.S.players) this.emit({ t: "hand", to: p.id, packs: this.hands[p.id] });
    this.after(BOOSTER_SECONDS * 1000, () => this.startShuffle());
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(3000 + Math.random() * 4000, () => this.setReady(b.id, true)));
  }

  /* ------------------- mélange commun puis distribution ------------------- */
  // Tous les boosters sont réunis et mélangés ensemble, puis chacun reçoit HAND_SIZE cartes du paquet mélangé.
  startShuffle() {
    if (this.S.phase !== "booster") return;
    if (this.variant === "bonus") return this.openFirstBonus(); // variante Bonus : pas de mélange commun ni de défausse
    this.clearTimers();
    const pool = shuffle(Object.values(this.hands).flatMap((packs) => packs.flatMap((p) => p.cards)));
    const order = shuffle(this.S.players);
    this.dealt = Object.fromEntries(order.map((p) => [p.id, []]));
    pool.forEach((card, k) => {
      const mine = this.dealt[order[k % order.length].id];
      if (mine.length < HAND_SIZE) mine.push(card);
    });
    this.S.deckSize = pool.length;
    this.resetReady();
    this.setPhase("shuffle", SHUFFLE_MS);
    this.broadcast();
    this.after(SHUFFLE_MS, () => this.startDiscard());
  }

  /* ----------------------------- défausse ----------------------------- */
  startDiscard() {
    if (this.S.phase !== "shuffle") return;
    this.clearTimers();
    this.discards = {};
    this.resetReady();
    this.setPhase("discard", DISCARD_SECONDS * 1000);
    this.broadcast();
    for (const p of this.S.players) this.emit({ t: "deal", to: p.id, cards: this.dealt[p.id] || [] });
    this.after(DISCARD_SECONDS * 1000, () => this.endDiscard());
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(4000 + Math.random() * 14000, () => {
      const ids = shuffle(this.handCards(b.id)).slice(0, 2).map((c) => c.id);
      this.discard(b.id, ids, true);
    }));
  }
  handCards(id) { return this.dealt[id] || []; }
  discard(id, ids, confirm) {
    if (this.S.phase !== "discard" || !this.player(id)) return;
    const own = new Set(this.handCards(id).map((c) => c.id));
    const clean = [...new Set(ids)].filter((x) => own.has(x)).slice(0, 2);
    this.discards[id] = clean;
    this.player(id).ready = !!confirm && clean.length === 2;
    this.broadcast();
    this.checkAdvance();
  }
  // Chacun retire 2 cartes de sa main ; toutes les cartes gardées sont rassemblées et remélangées en un seul paquet.
  endDiscard() {
    if (this.S.phase !== "discard") return;
    this.clearTimers();
    const kept = [];
    for (const p of this.S.players) {
      const cards = this.handCards(p.id);
      let out = [...(this.discards[p.id] || [])];
      const rest = shuffle(cards.filter((c) => !out.includes(c.id))); // défausse aléatoire si le temps est écoulé
      while (out.length < 2 && rest.length) out.push(rest.pop().id);
      kept.push(...cards.filter((c) => !out.includes(c.id)));
      this.emit({ t: "deck", to: p.id, discarded: cards.filter((c) => out.includes(c.id)) });
    }
    this.gameDeck = shuffle(kept);
    this.S.deckSize = this.gameDeck.length;
    this.setPhase("countdown", COUNTDOWN_MS);
    this.broadcast();
    this.after(COUNTDOWN_MS, () => this.startTimesUp());
  }

  /* ------------------------- Time's Up : les manches ------------------------- */
  // 3 manches avec le même paquet. Un joueur fait deviner à son équipe pendant le temps imparti : swipe droite = trouvé (+1),
  // swipe gauche = passer (la carte part au fond du paquet). Pas de remélange entre les tours, remélange entre les manches.
  // Si le paquet est vidé en cours de tour, le temps restant est conservé : le même joueur rejoue au début de la manche suivante.
  startTimesUp() {
    if (this.S.phase !== "countdown") return;
    this.allCards = [...this.gameDeck];
    this.tuTurn = 0; this.tuPtr = {}; this.tuCarry = 0; this.tuRoundTeam = {};
    this.S.tu = { round: 0, total: TU_ROUNDS, rule: null, team: 0, playerId: null, validated: [], deckLeft: 0, teamScores: {}, roundScores: [], carry: false };
    this.startRound();
  }
  startRound() {
    if (!["countdown", "tu_roundend", "bonus"].includes(this.S.phase)) return;
    this.clearTimers();
    const tu = this.S.tu;
    tu.round += 1;
    tu.rule = TU_ROUND_RULES[Math.min(tu.round, TU_ROUND_RULES.length) - 1];
    this.deck = shuffle(this.allCards);
    this.tuRoundTeam = {};
    this.resetReady();
    const same = this.tuCarry >= TU_MIN_CARRY_MS && this.player(tu.playerId);
    tu.carry = Boolean(same);
    if (same) this.startTurn(this.player(tu.playerId), this.tuCarry);
    else this.startTurn(this.nextPlayer(), this.S.settings.roundSeconds * 1000);
    this.tuCarry = 0;
  }
  nextPlayer() {
    const teams = [...new Set(this.S.players.map((p) => p.team))].sort((a, b) => a - b);
    const team = teams[this.tuTurn % teams.length];
    const members = this.S.players.filter((p) => p.team === team).sort((a, b) => a.joinedAt - b.joinedAt);
    const idx = this.tuPtr[team] || 0;
    this.tuPtr[team] = idx + 1;
    this.tuTurn += 1;
    return members[idx % members.length];
  }
  startTurn(p, ms) {
    const tu = this.S.tu;
    this.turnMs = ms;
    this.ps(p.id).turns = (this.ps(p.id).turns || 0) + 1;
    Object.assign(tu, { team: p.team, playerId: p.id, validated: [], deckLeft: this.deck.length, turnMs: ms, turnNo: (tu.turnNo || 0) + 1 });
    if (!tu.fx) tu.fx = { n: 0, kind: null, name: "" };
    this.setPhase("tu_ready", TU_READY_SECONDS * 1000);
    this.broadcast();
    this.after(TU_READY_SECONDS * 1000, () => this.endTurn("idle"));
    if (p.bot) this.after(1200, () => this.begin(p.id));
  }
  begin(id) {
    const tu = this.S.tu;
    if (this.S.phase !== "tu_ready" || id !== tu.playerId) return;
    this.clearTimers();
    tu.validated = [];
    this.setPhase("tu_play", this.turnMs);
    this.broadcast();
    this.sendQueue(id, 0);
    this.turnTimer = this.after(this.turnMs, () => this.endTurn("time"));
    if (this.player(id).bot) this.botSwipe(id);
  }
  tag(c) { const b = this.bonusMap[c.id]; return b ? { ...c, bonus: b } : c; }
  sendQueue(id, seq) { this.emit({ t: "queue", to: id, cards: this.deck.slice(0, 3).map((c) => this.tag(c)), seq, turn: this.S.tu.turnNo }); }
  // Bonus « temps » : on repousse la fin du tour (et la jauge s'allonge d'autant).
  extendTurn(ms) {
    if (!this.deadline || this.S.phase !== "tu_play") return;
    clearTimeout(this.turnTimer); this.timers.delete(this.turnTimer);
    this.deadline += ms; this.turnMs += ms; this.S.tu.turnMs = this.turnMs;
    this.turnTimer = this.after(Math.max(0, this.deadline - Date.now()), () => this.endTurn("time"));
  }
  swipe(id, cardId, ok, seq = 0) {
    const tu = this.S.tu;
    if (this.S.phase !== "tu_play" || id !== tu.playerId) return;
    const top = this.deck[0];
    if (!top || top.id !== cardId) return this.sendQueue(id, seq); // pas synchro : on renvoie les vraies cartes
    if (ok) {
      this.deck.shift();
      const card = top;
      const bonus = this.bonusMap[card.id] || null;
      const pts = bonus === "score" ? SCORE_BONUS_PTS : 1;
      tu.teamScores[tu.team] = (tu.teamScores[tu.team] || 0) + pts;
      this.tuRoundTeam[tu.team] = (this.tuRoundTeam[tu.team] || 0) + pts;
      tu.validated.push({ n: card.name, b: bonus });
      this.ps(id).found = (this.ps(id).found || 0) + 1;
      if (bonus) tu.fx = { n: (tu.fx ? tu.fx.n : 0) + 1, kind: bonus, name: card.name };
      if (bonus === "time") this.extendTurn(TIME_BONUS_MS);
      tu.deckLeft = this.deck.length;
      if (!this.deck.length) { this.broadcast(); return this.endTurn("empty"); }
      this.broadcast();
    } else {
      this.deck.push(this.deck.shift()); // passée : au fond du paquet
      this.ps(id).passed = (this.ps(id).passed || 0) + 1;
    }
    this.sendQueue(id, seq);
  }
  endTurn(reason) {
    const tu = this.S.tu;
    if (!tu || !["tu_ready", "tu_play"].includes(this.S.phase)) return;
    const left = this.deadline ? Math.max(0, this.deadline - Date.now()) : 0;
    this.clearTimers();
    const emptied = reason === "empty";
    this.tuCarry = emptied ? left : 0;
    tu.endReason = reason;
    this.setPhase("tu_turnend", TU_TURNEND_MS);
    this.broadcast();
    this.after(TU_TURNEND_MS, () => (emptied ? this.endTuRound() : this.startTurn(this.nextPlayer(), this.S.settings.roundSeconds * 1000)));
  }
  endTuRound() {
    const tu = this.S.tu;
    tu.roundScores.push({ ...this.tuRoundTeam });
    this.resetReady();
    if (tu.round >= tu.total) {
      this.tuCarry = 0;
      this.setPhase("done", null);
      this.broadcast();
      return;
    }
    this.setPhase("tu_roundend", TU_ROUNDEND_SECONDS * 1000);
    this.broadcast();
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(800 + Math.random() * 1500, () => this.setReady(b.id, true)));
    this.after(TU_ROUNDEND_SECONDS * 1000, () => this.afterRoundEnd());
  }
  botSwipe(id) {
    if (this.S.phase !== "tu_play" || this.S.tu.playerId !== id) return;
    this.after((FAST ? 350 : 1500) + Math.random() * (FAST ? 500 : 3500), () => {
      if (this.S.phase !== "tu_play" || !this.deck[0]) return;
      this.swipe(id, this.deck[0].id, Math.random() < 0.7);
      this.botSwipe(id);
    });
  }

  /* ------------------------ variante « Bonus » ------------------------ */
  // Après les boosters (2 × 10 cartes), chacun voit ses 20 cartes et place jusqu'à 2 bonus (« temps » : +10 s, « score » : 3 points
  // au lieu de 1). Les bonus profitent à n'importe quelle équipe qui réussit la carte, et ne valent que pour la manche.
  // Aucune carte n'est écartée. Entre deux manches, chacun reçoit 20 autres cartes du paquet et repose ses bonus.
  openFirstBonus() {
    this.clearTimers();
    this.dealt = Object.fromEntries(this.S.players.map((p) => [p.id, (this.hands[p.id] || []).flatMap((pk) => pk.cards)]));
    this.allCards = Object.values(this.dealt).flat();
    this.handTarget = Math.max(1, ...Object.values(this.dealt).map((c) => c.length));
    this.S.deckSize = this.allCards.length;
    this.openBonus(1);
  }
  openBonus(round) {
    this.clearTimers();
    this.bonusPicks = {};
    this.S.bonus = { round, total: TU_ROUNDS, picked: {}, stats: null };
    this.resetReady();
    for (const p of this.S.players) this.emit({ t: "deal", to: p.id, cards: this.dealt[p.id] || [] });
    this.setPhase("bonus", BONUS_SECONDS * 1000);
    this.broadcast();
    this.after(BONUS_SECONDS * 1000, () => this.endBonus());
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(1200 + Math.random() * 4000, () => {
      const cards = shuffle(this.dealt[b.id] || []).slice(0, Math.random() < 0.15 ? 0 : BONUS_SLOTS);
      const picks = {};
      cards.forEach((c, k) => { picks[c.id] = k % 2 ? "score" : "time"; });
      this.setBonus(b.id, picks, true);
    }));
  }
  setBonus(id, picks, confirm) {
    if (this.S.phase !== "bonus" || !this.player(id) || !picks || typeof picks !== "object") return;
    const own = new Set((this.dealt[id] || []).map((c) => c.id));
    const clean = {};
    for (const [cid, kind] of Object.entries(picks)) {
      if (Object.keys(clean).length >= BONUS_SLOTS) break;
      if (own.has(cid) && (kind === "time" || kind === "score")) clean[cid] = kind;
    }
    this.bonusPicks[id] = clean;
    this.S.bonus.picked[id] = Object.keys(clean).length;
    this.player(id).ready = !!confirm;
    this.broadcast();
    this.checkAdvance();
  }
  endBonus() {
    if (this.S.phase !== "bonus") return;
    this.clearTimers();
    this.bonusMap = {};
    const stats = { time: 0, score: 0 };
    for (const p of this.S.players) {
      for (const [cid, kind] of Object.entries(this.bonusPicks[p.id] || {})) { this.bonusMap[cid] = kind; stats[kind] += 1; }
    }
    this.S.bonus.stats = stats;
    if (this.S.bonus.round > 1) return this.startRound();
    // première manche : tout est mélangé puis on lance la partie (aucune carte écartée)
    this.gameDeck = shuffle(this.allCards);
    this.setPhase("shuffle", SHUFFLE_MS);
    this.broadcast();
    this.after(SHUFFLE_MS, () => {
      if (this.S.phase !== "shuffle") return;
      this.setPhase("countdown", COUNTDOWN_MS);
      this.broadcast();
      this.after(COUNTDOWN_MS, () => this.startTimesUp());
    });
  }
  afterRoundEnd() {
    if (this.S.phase !== "tu_roundend") return;
    if (this.variant !== "bonus") return this.startRound();
    this.redeal();
    this.openBonus(this.S.tu.round + 1);
  }
  // Nouvelle distribution : chacun reçoit des cartes du paquet qu'il n'avait PAS la manche précédente (si c'est possible).
  redeal() {
    const ps = this.S.players;
    const prev = {};
    for (const [pid, cards] of Object.entries(this.dealt)) for (const c of cards) prev[c.id] = pid;
    const size = Math.max(1, Math.min(this.handTarget, Math.floor(this.allCards.length / ps.length)));
    for (let attempt = 0; attempt < 400; attempt++) {
      const out = Object.fromEntries(ps.map((p) => [p.id, []]));
      let ok = true;
      for (const c of shuffle(this.allCards)) {
        if (ps.every((p) => out[p.id].length >= size)) break;
        const cands = ps.filter((p) => out[p.id].length < size && p.id !== prev[c.id]);
        if (!cands.length) { ok = false; break; }
        out[pick(cands).id].push(c);
      }
      if (ok && ps.every((p) => out[p.id].length === size)) { this.dealt = out; return; }
    }
    // repli (très peu de joueurs ou de cartes) : simple distribution
    const pool = shuffle(this.allCards);
    this.dealt = Object.fromEntries(ps.map((p, k) => [p.id, pool.slice(k * size, (k + 1) * size)]));
  }

  /* ------------------------------- Blind test ------------------------------- */
  // Un extrait de la playlist se joue à un instant aléatoire ; chacun tape titre et/ou artiste. Le créateur seul connaît la réponse
  // (elle n'est envoyée à personne avant la révélation). Chaque partie trouvée (titre, artiste) rapporte la moitié des points :
  // points fixes + vitesse (temps restant) + bonus d'ordre d'arrivée ; la série compte les morceaux trouvés en entier.
  setPlaylist(by, pl) {
    if (by !== this.S.hostId || this.S.phase !== "lobby") return;
    // seules les adresses autorisées (Deezer, Wikimedia, démo…) sont gardées : voir lib/safeUrl.js
    this.playlist = (pl && pl.tracks ? pl.tracks : [])
      .map((t) => t && { ...t, preview: safeUrl(t.preview, { allowDemo: true }), cover: safeUrl(t.cover) })
      .filter((t) => t && t.preview);
    this.S.playlist = this.playlist.length ? { name: String(pl.name || "Playlist").slice(0, 60), count: this.playlist.length, cover: safeUrl(pl.cover), source: String(pl.source || "").slice(0, 20), missing: pl.missing || 0 } : null;
    this.broadcast();
  }
  // « unité » qui marque : le joueur (solo, ou équipes avec somme) ou l'équipe (équipes avec score partagé)
  btUnit(id) {
    const p = this.player(id), s = this.S.settings;
    return s.btTeams && s.btScoring === "shared" ? "t" + p.team : id;
  }
  btUnits() { return [...new Set(this.S.players.map((p) => this.btUnit(p.id)))]; }
  startBlind() {
    this.clearTimers();
    const s = this.S.settings;
    const total = Math.min(s.btSongs, this.playlist.length);
    this.btQueue = shuffle(this.playlist); // les `total` premiers sont joués, les suivants servent de secours
    this.btNextP = null;
    this.S.bt = { n: 0, total, guessMs: s.btGuess * 1000, oneGuess: s.btOneGuess, manual: s.btManual, teams: s.btTeams, scoring: s.btScoring, audio: s.btAudio,
      play: null, preload: null, feed: [], scores: {}, streaks: {}, reveal: null };
    for (const u of this.btUnits()) { this.S.bt.scores[u] = 0; this.S.bt.streaks[u] = 0; }
    this.prepareNext();
    this.nextSong();
  }
  // Prochain morceau : adresse d'extrait redemandée juste avant (elles expirent) ; un morceau sans extrait est sauté.
  async pickTrack() {
    while (this.btQueue.length) {
      let t = this.btQueue.shift();
      try { t = await this.fresh(t); } catch { /* on garde les anciennes données */ }
      if (t) t = { ...t, preview: safeUrl(t.preview, { allowDemo: true }), cover: safeUrl(t.cover) };
      if (t && t.preview) return t;
    }
    return null;
  }
  prepareNext() {
    const bt = this.S.bt;
    if (!bt || bt.n + 1 > bt.total) { this.btNextP = null; return; }
    const p = (this.btNextP = this.pickTrack());
    p.then((t) => { if (this.dead || this.btNextP !== p || !this.S.bt) return; this.S.bt.preload = t ? t.preview : null; this.broadcast(); });
  }
  async nextSong() {
    const bt = this.S.bt;
    if (!bt || this.dead) return;
    if (bt.n >= bt.total) return this.finishBlind();
    const p = this.btNextP || this.pickTrack();
    this.btNextP = null;
    const stamp = (this.btStamp = (this.btStamp || 0) + 1);
    const track = await p;
    if (this.dead || stamp !== this.btStamp || !this.S.bt) return;
    if (!track) return this.finishBlind();
    this.clearTimers();
    const g = bt.guessMs;
    const offset = Math.floor(Math.random() * Math.max(0, BT_PREVIEW_S * 1000 - g)) / 1000;
    this.btTrack = track; this.btFound = {}; this.btMine = {}; this.btGuessN = {}; this.btLast = {}; this.btTimes = {}; this.btStartAt = Date.now();
    bt.n += 1; bt.feed = []; bt.reveal = null; bt.preload = null;
    bt.play = { url: track.preview, offset, token: bt.n };
    this.setPhase("bt_play", g);
    this.broadcast();
    this.after(g, () => this.endSong("time"));
    this.prepareNext();
    for (const b of this.S.players.filter((x) => x.bot)) this.botGuess(b, track, g);
  }
  guess(id, text) {
    const bt = this.S.bt;
    if (this.S.phase !== "bt_play" || !bt || !this.player(id) || !this.btTrack) return;
    const now = Date.now();
    if (now - (this.btLast[id] || 0) < 250) return;
    this.btLast[id] = now;
    if (bt.oneGuess && (this.btGuessN[id] || 0) >= 1) return;
    const n = (this.btGuessN[id] = (this.btGuessN[id] || 0) + 1);
    const r = judge(String(text || "").slice(0, 140), this.btTrack);
    const u = this.btUnit(id), p = this.player(id);
    const st = (this.btFound[u] ||= { title: null, artist: null, pts: 0 });
    const mine = (this.btMine[id] ||= { title: false, artist: false });
    const remaining = this.deadline ? Math.max(0, (this.deadline - now) / bt.guessMs) : 0;
    let gained = 0; const parts = [];
    for (const part of ["title", "artist"]) {
      if (r[part] !== "full") continue;
      if (!mine[part]) ((this.btTimes[id] ||= {})[part] = now - (this.btStartAt || now)); // temps de réponse perso
      mine[part] = true;
      if (st[part]) continue;
      const rank = Object.values(this.btFound).filter((x) => x[part]).length + 1;
      const pts = partPoints(remaining, rank);
      st[part] = { by: id, rank, pts };
      st.pts += pts; gained += pts; parts.push(part);
    }
    if (gained) {
      bt.scores[u] = (bt.scores[u] || 0) + gained;
      bt.feed.push({ k: n + ":" + id + ":" + now, pid: id, name: p.name, team: p.team, parts, pts: gained });
      this.broadcast();
    }
    this.emit({ t: "fb", to: id, n, title: r.title, artist: r.artist, gained, mine: { ...mine } });
    this.btCheckDone();
  }
  btCheckDone() {
    if (this.S.phase !== "bt_play" || this.btEnding) return;
    const bt = this.S.bt;
    const allFound = this.btUnits().every((u) => this.btFound[u] && this.btFound[u].title && this.btFound[u].artist);
    const allSpent = bt.oneGuess && this.S.players.every((p) => (this.btGuessN[p.id] || 0) >= 1);
    if (!allFound && !allSpent) return;
    this.btEnding = true;
    this.after(allFound ? 1400 : 900, () => { this.btEnding = false; this.endSong(allFound ? "all" : "spent"); });
  }
  endSong(reason) {
    const bt = this.S.bt;
    if (this.S.phase !== "bt_play" || !bt) return;
    this.clearTimers(); this.btEnding = false;
    const results = [];
    for (const u of this.btUnits()) {
      const st = this.btFound[u] || {};
      const full = Boolean(st.title && st.artist), half = !full && Boolean(st.title || st.artist);
      let bonus = 0;
      if (full) { bt.streaks[u] = (bt.streaks[u] || 0) + 1; bonus = streakBonus(bt.streaks[u]); bt.scores[u] = (bt.scores[u] || 0) + bonus; }
      else if (!half) bt.streaks[u] = 0; // une demi-réponse garde la série sans la faire monter
      results.push({ u, title: Boolean(st.title), artist: Boolean(st.artist), pts: (st.pts || 0) + bonus, bonus, streak: bt.streaks[u] || 0 });
    }
    results.sort((a, b) => b.pts - a.pts);
    for (const p of this.S.players) { // statistiques de profil, par joueur
      const s = this.ps(p.id), m = (this.btMine || {})[p.id] || {}, tm = (this.btTimes || {})[p.id] || {};
      s.songs = (s.songs || 0) + 1;
      if (m.title && m.artist) {
        const ms = Math.max(tm.title ?? 0, tm.artist ?? 0);
        s.full = (s.full || 0) + 1; s.msSum = (s.msSum || 0) + ms; s.msN = (s.msN || 0) + 1;
        s.fastest = s.fastest == null ? ms : Math.min(s.fastest, ms);
      } else if (m.title || m.artist) s.half = (s.half || 0) + 1;
      s.bestStreak = Math.max(s.bestStreak || 0, bt.streaks[this.btUnit(p.id)] || 0);
    }
    const t = this.btTrack;
    bt.play = null;
    bt.reveal = { title: cleanTitle(t.title) || t.title, full: t.title, artist: t.artists.join(", "), cover: t.cover || "", results, reason, last: bt.n >= bt.total };
    this.setPhase("bt_reveal", bt.manual ? null : BT_BREAK_SECONDS * 1000);
    this.broadcast();
    if (!bt.manual) this.after(BT_BREAK_SECONDS * 1000, () => this.nextSong());
  }
  // Mode manuel : le créateur touche l'écran pour lancer la suite (il peut aussi passer la pause en mode auto).
  btNext(by) {
    if (by !== this.S.hostId || this.S.phase !== "bt_reveal") return;
    this.clearTimers();
    this.nextSong();
  }
  finishBlind() {
    this.clearTimers();
    this.S.bt.play = null; this.S.bt.preload = null;
    this.setPhase("bt_final", null);
    this.broadcast();
  }
  // Bots de test : trouvent le titre et/ou l'artiste à des moments variés, parfois avec une faute de frappe.
  botGuess(b, track, g) {
    const title = cleanTitle(track.title), artist = track.artists[0];
    const typo = (x) => (Math.random() < 0.25 && x.length > 4 ? x.slice(0, 2) + x.slice(3) : x);
    const r = Math.random();
    const both = r < 0.4, onlyT = r >= 0.4 && r < 0.6, onlyA = r >= 0.6 && r < 0.75;
    const at = (frac) => g * (0.08 + frac * 0.8) * (FAST ? 0.6 : 1);
    if (both || onlyT) this.after(at(Math.random()), () => this.guess(b.id, typo(title)));
    if (both || onlyA) this.after(at(Math.random()), () => this.guess(b.id, typo(artist)));
    if (!both && !onlyT && !onlyA) this.after(at(Math.random()), () => this.guess(b.id, "je ne sais pas"));
  }

  /* ------------------------------ Qui est-ce ? ------------------------------ */
  // Une image s'affiche pour tout le monde en même temps ; en maintenant l'écran 3 s on déclare "j'ai trouvé".
  // Classement = ordre d'arrivée des déclarations ; points = nb de joueurs - rang + 1 ; les autres 0.
  startQuiEst() {
    this.clearTimers();
    this.qeUsed = new Set();
    this.qeToken = 0;
    this.S.qe = { round: 0, total: this.S.settings.rounds, t: {}, order: [], gain: {}, scores: Object.fromEntries(this.S.players.map((p) => [p.id, 0])) };
    this.nextRound();
  }
  // Chaque équipe a SA propre image (et pas forcément le même thème que les autres équipes).
  qeTeams() { return [...new Set(this.S.players.map((p) => p.team))].sort((a, b) => a - b); }
  nextRound() {
    const qe = this.S.qe;
    if (qe.round >= qe.total) return this.finishQuiEst();
    qe.round += 1;
    Object.assign(qe, { t: {}, order: [], gain: {} });
    this.qeCards = {}; this.qeCats = {}; this.qeResolved = false;
    this.resetReady();
    this.setPhase("qe_tap", QE_TAP_SECONDS * 1000);
    this.broadcast();
    this.after(QE_TAP_SECONDS * 1000, () => this.startCount(true));
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(1200 + Math.random() * 3500, () => this.setReady(b.id, true)));
    this.resolveCard(++this.qeToken);
  }
  // Pendant que les joueurs touchent l'écran, on cherche (sur Wikipédia) pour chaque équipe une carte tirée au hasard qui a une image.
  async resolveCard(token) {
    const teams = this.qeTeams();
    const per = teams.map((team) => {
      const drawn = drawPack("mixtes", this.qeUsed, 8).cards;
      for (const d of drawn) this.qeCats[d.id] = d.cat;
      return { team, cands: drawn.map((d) => CARD_BY_ID[d.id]) };
    });
    const hits = await Promise.all(per.map(async ({ team, cands }) => {
      let hit = cands.find((c) => c.image);
      hit = hit ? { card: hit, url: hit.image } : null;
      let why = "";
      if (!hit) {
        try {
          const r = await findFirstWithImage(cands);
          if (r && r.error) why = "network"; else if (r) hit = r; else why = "none";
        } catch { why = "network"; }
      }
      return { team, cands, hit, why };
    }));
    if (token !== this.qeToken || this.dead) return;
    this.finishResolve(hits, true);
  }
  finishResolve(hits, advance = true) {
    const qe = this.S.qe;
    if (!hits) { // pas le temps d'attendre la recherche : on prend le premier candidat de chaque équipe
      hits = this.qeTeams().map((team) => {
        const drawn = drawPack("mixtes", this.qeUsed, 1).cards;
        for (const d of drawn) this.qeCats[d.id] = d.cat;
        return { team, cands: drawn.map((d) => CARD_BY_ID[d.id]), hit: null, why: "" };
      });
    }
    for (const { team, cands, hit, why } of hits) {
      const chosen = hit ? hit.card : cands[0];
      cands.filter((c) => c !== chosen).forEach((c) => this.qeUsed.delete(c.id)); // les autres pourront resservir
      this.qeCards[team] = chosen;
      const okUrl = hit ? safeUrl(hit.url) : "";
      qe.t[team] = {
        url: okUrl,
        title: okUrl ? null : chosen.name, // pas d'image trouvée : on affichera le nom
        why: okUrl ? "" : (why || (hit ? "none" : "")), // "network" = Wikipédia injoignable, "none" = pas d'image pour ces cartes
        answer: null, cat: null,
      };
    }
    this.qeResolved = true;
    this.broadcast();
    if (advance) this.checkAdvance();
  }
  startCount(force = false) {
    if (this.S.phase !== "qe_tap") return;
    if (!this.qeResolved) {
      if (!force) return; // on attend la recherche d'image (elle relance checkAdvance)
      this.qeToken++; this.finishResolve(null, false);
    }
    this.clearTimers();
    this.setPhase("qe_count", QE_COUNT_MS);
    this.broadcast();
    this.after(QE_COUNT_MS, () => this.startPlay());
  }
  startPlay() {
    if (this.S.phase !== "qe_count") return;
    this.setPhase("qe_play", QE_PLAY_SECONDS * 1000);
    this.qeStartAt = Date.now(); this.qeTimes = {};
    this.broadcast();
    this.after(QE_PLAY_SECONDS * 1000, () => this.endRound());
    // les bots trouvent (ou pas) à des moments variés
    this.S.players.filter((p) => p.bot).forEach((b) => {
      if (Math.random() < 0.75) this.after(4000 + Math.random() * (QE_PLAY_SECONDS * 1000 - 9000), () => this.found(b.id));
    });
  }
  // L'image ne se charge pas chez un joueur : on affiche le nom à la place, pour son équipe seulement.
  imageFailed(id) {
    const qe = this.S.qe, p = this.player(id);
    if (!qe || !p || !["qe_count", "qe_play"].includes(this.S.phase)) return;
    const slot = qe.t[p.team], card = this.qeCards && this.qeCards[p.team];
    if (!slot || !card || slot.title) return;
    slot.title = card.name;
    this.broadcast();
  }
  found(id) {
    const qe = this.S.qe;
    if (this.S.phase !== "qe_play" || !this.player(id) || qe.order.includes(id)) return;
    qe.order.push(id);
    (this.qeTimes ||= {})[id] = Date.now() - (this.qeStartAt || Date.now());
    this.broadcast();
    this.checkAdvance();
  }
  endRound() {
    if (this.S.phase !== "qe_play") return;
    this.clearTimers();
    const qe = this.S.qe;
    const n = this.S.players.length;
    qe.order = qe.order.filter((id) => this.player(id));
    qe.order.forEach((id, k) => { qe.gain[id] = n - k; qe.scores[id] = (qe.scores[id] || 0) + (n - k); });
    for (const p of this.S.players) { // statistiques de profil : manches jouées, trouvées, première place, temps
      const s = this.ps(p.id), t = (this.qeTimes || {})[p.id];
      s.rounds = (s.rounds || 0) + 1;
      if (t != null) {
        s.found = (s.found || 0) + 1; s.msSum = (s.msSum || 0) + t; s.msN = (s.msN || 0) + 1;
        s.fastest = s.fastest == null ? t : Math.min(s.fastest, t);
        if (qe.order[0] === p.id) s.firsts = (s.firsts || 0) + 1;
      }
    }
    for (const [team, card] of Object.entries(this.qeCards || {})) { // la réponse de chaque équipe
      const slot = qe.t[team];
      if (!slot) continue;
      slot.answer = card.name;
      slot.cat = (this.qeCats && this.qeCats[card.id]) || card.cats[0];
    }
    this.setPhase("qe_result", QE_RESULT_MS);
    this.broadcast();
    this.after(QE_RESULT_MS, () => this.nextRound());
  }
  finishQuiEst() {
    this.clearTimers();
    this.setPhase("qe_final", null);
    this.broadcast();
  }

  /* ------------------------------- bots ------------------------------- */
  botVote(b) {
    const ids = [...CATEGORIES.map((c) => c.id), "random", "mixtes"];
    const first = pick(ids);
    this.after(2500 + Math.random() * 12000, () => {
      this.vote(b.id, Array.from({ length: this.rules.votes }, (_, k) => (k === 0 || Math.random() < 0.3 ? first : pick(ids))));
      this.after(600 + Math.random() * 3000, () => this.setReady(b.id, true));
    });
  }

  /* ------------- réseau : vérification des messages reçus ------------- */
  // Tout ce qui arrive du réseau passe ici : forme, taille, débit, signature, anti-rejeu — puis handle().
  take(id, cap = 30, perSec = 12) {
    const now = Date.now();
    const b = (this.buckets[id] ||= { n: cap, t: now });
    b.n = Math.min(cap, b.n + ((now - b.t) / 1000) * perSec); b.t = now;
    if (b.n < 1) return false;
    b.n -= 1;
    return true;
  }
  receive(msg) {
    try {
      if (!msg || typeof msg !== "object" || typeof msg.t !== "string" || typeof msg.from !== "string") return;
      const from = msg.from;
      if (from.length > 32 || from === this.S.hostId || from.startsWith("bot-")) return;
      if (JSON.stringify(msg).length > 1600) return;
      const known = Boolean(this.player(from));
      if (!this.take(known ? from : "?", known ? 30 : 60, known ? 12 : 15)) return;
      if (!known && msg.t !== "join") return;
      const prev = this.chains[known ? from : "?"] || Promise.resolve();
      const next = prev.then(() => this.verified(msg)).catch(() => {});
      if (known) this.chains[from] = next;
      else this.chains["?"] = next;
    } catch { /* message illisible : ignoré */ }
  }
  async verified(msg) {
    if (this.dead) return;
    const from = msg.from;
    if (this.signed) {
      if (msg.t === "join") {
        if (!validPk(msg.pk) || typeof msg.n !== "number" || !(await verifyMsg(msg.pk, msg))) return;
        if (this.player(from) && this.pks[from] !== msg.pk) return; // même identifiant, autre clé : refusé
        if (this.player(from) && !(msg.n > (this.lastN[from] || 0))) return;
        if (this.player(from)) this.lastN[from] = msg.n;
      } else {
        const pk = this.pks[from];
        if (!pk || typeof msg.n !== "number" || !(msg.n > (this.lastN[from] || 0))) return;
        if (!(await verifyMsg(pk, msg))) return;
        if (!(msg.n > (this.lastN[from] || 0))) return; // un message plus récent a été traité entre-temps
        this.lastN[from] = msg.n;
      }
    }
    const clean = sanitize(msg);
    if (!clean) return;
    if (clean.t === "join") {
      this.addPlayer({ id: from, name: clean.name, look: clean.look, pk: this.signed ? msg.pk : undefined });
      if (this.signed && this.player(from) && this.pks[from] === msg.pk) this.lastN[from] = Math.max(this.lastN[from] || 0, msg.n);
      return;
    }
    this.handle({ ...clean, from });
  }

  /* ---------------- entrée unique des messages clients ---------------- */
  handle(msg) {
    const from = msg.from;
    switch (msg.t) {
      case "join": return this.addPlayer({ id: from, name: msg.name, look: msg.look });
      case "leave": return this.leave(from);
      case "setTeam": return this.setTeam(from, msg.team);
      case "look": return this.setLook(from, msg.look);
      case "vote": return this.vote(from, msg.slots);
      case "ready": return this.setReady(from, msg.v);
      case "discard": return this.discard(from, msg.ids || [], msg.confirm);
      case "bonus": return this.setBonus(from, msg.picks, msg.confirm);
      case "guess": return this.guess(from, msg.text);
      case "btnext": return this.btNext(from);
      case "found": return this.found(from);
      case "begin": return this.begin(from);
      case "swipe": return this.swipe(from, msg.cardId, msg.ok, msg.seq);
      case "imgfail": return this.imageFailed(from);
      case "who": return this.broadcast();
      default:
    }
  }
}


const str = (v, n) => (typeof v === "string" && v.length <= n ? v : null);
const strList = (v, max, n) => (Array.isArray(v) && v.length <= max && v.every((x) => str(x, n) !== null) ? v : null);
/** Ne garde de chaque message que les champs attendus, avec le bon type et une taille raisonnable. */
function sanitize(m) {
  switch (m.t) {
    case "join": return { t: "join", name: cleanName(m.name), look: cleanLook(m.look) };
    case "look": return { t: "look", look: cleanLook(m.look) };
    case "leave": case "btnext": case "found": case "begin": case "imgfail": case "who": return { t: m.t };
    case "setTeam": return Number.isInteger(m.team) && m.team >= 0 && m.team < 8 ? { t: "setTeam", team: m.team } : null;
    case "vote": { const slots = Array.isArray(m.slots) && m.slots.length <= 5 ? m.slots.map((x) => str(x, 20)) : null; return slots ? { t: "vote", slots } : null; }
    case "ready": return typeof m.v === "boolean" ? { t: "ready", v: m.v } : null;
    case "discard": { const ids = strList(m.ids, 4, 60); return ids ? { t: "discard", ids, confirm: m.confirm === true } : null; }
    case "bonus": {
      if (!m.picks || typeof m.picks !== "object" || Array.isArray(m.picks)) return null;
      const picks = {};
      for (const [k, v] of Object.entries(m.picks).slice(0, 4)) if (k.length <= 60 && (v === "time" || v === "score")) picks[k] = v;
      return { t: "bonus", picks, confirm: m.confirm === true };
    }
    case "guess": return typeof m.text === "string" ? { t: "guess", text: m.text.slice(0, 200) } : null;
    case "swipe": return str(m.cardId, 60) !== null && typeof m.ok === "boolean" ? { t: "swipe", cardId: m.cardId, ok: m.ok, seq: Number.isInteger(m.seq) ? m.seq : 0 } : null;
    default: return null;
  }
}

export { BY_ID };
