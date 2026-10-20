// Le créateur du lobby fait tourner ce moteur : il est la source de vérité.
// Les autres joueurs lui envoient des actions, il diffuse l'état public et envoie à chacun ses cartes en privé.
import { CATEGORIES, BY_ID, rulesFor } from "../data/categories.js";
import { drawPack, CARD_BY_ID, ALL_CARDS } from "../data/cards.js";
import { findFirstWithImage } from "../data/wikiImages.js";
import { freshTrack } from "../data/playlist.js";
import { resolveYear } from "../data/musicbrainz.js";
import { judge, cleanTitle, partPoints, streakBonus } from "../data/blindtest.js";
import { shuffle, pick, uid } from "../lib/util.js";
import { safeUrl } from "../lib/safeUrl.js";
import { verifyMsg, validPk } from "./secure.js";
import { cleanLook, randomFreeLook } from "../data/profile.js";
import {
  DEFAULT_PER_TEAM, VOTE_SECONDS, DISCARD_SECONDS, BOOSTER_SECONDS, REVEAL_MS, SHUFFLE_MS, COUNTDOWN_MS, HAND_SIZE,
  TU_ROUNDS, TU_READY_SECONDS, TU_TURNEND_MS, TU_ROUNDEND_SECONDS, TU_MIN_CARRY_MS, TU_ROUND_RULES, FAST,
  QE_ROUNDS_OPTIONS, QE_DEFAULT_ROUNDS, QE_TAP_SECONDS, QE_PICK_SECONDS, QE_DEFAULTS, QE_COUNT_MS, QE_PLAY_SECONDS, QE_RESULT_MS,
  BONUS_SECONDS, BONUS_SLOTS, TIME_BONUS_MS, SCORE_BONUS_PTS,
  BT_SONGS_OPTIONS, BT_GUESS_OPTIONS, BT_BREAK_SECONDS, BT_MAX_SOLO, BT_PREVIEW_S, BT_DEFAULTS, QUIT_VOTE_MS,
  TL_GOAL_OPTIONS, TL_MAX_OFFSET_S, TL_PLACE_SECONDS, TL_REVEAL_SECONDS, TL_DEFAULTS,
  GAMES, BD_ROUNDS_OPTIONS, BD_START_COINS, BD_GEM_COST, BD_DIE, BD_COLOR_COINS, BD_MINI_WIN, BD_ORDER_MS, bdSprintTurns, BD_MAX_ITEMS, BD_PRE_SECONDS, BD_CHOICE_SECONDS, BD_STEP_MS, BD_END_MS, BD_DEFAULTS, MG_ROUNDS_OPTIONS, MG_INTRO_MS, MG_RESULT_MS, MG_ASK_SECONDS, MG_QREVEAL_MS, MG_FRIEND_QS, MG_FRIEND_EVERY, MG_FRIEND_PTS, MG_DEFAULTS,
  PB_ROUNDS_OPTIONS, PB_SECONDS_OPTIONS, PB_INTRO_MS, PB_GRACE_MS, PB_STOP_MS, PB_VOTE_SECONDS, PB_RESULT_SECONDS, PB_DEFAULTS, PB_PLAY_SECONDS,
  CC_ROUNDS_OPTIONS, CC_LOAD_MS, CC_PLAY_SECONDS, CC_AFTER_FIRST_SECONDS, CC_RESULT_SECONDS, CC_DEFAULTS,
} from "../config.js";
import { isCeleb, celebCheck, celebHint, rankStrokes, CELEB_MAX_TRIES, CELEB_PENALTY } from "../data/celeb.js";
import { PB_LETTERS, PB_CATS, PB_CLASSIC, PB_CAT_COUNT, PB_UNIQUE, PB_SHARED, cleanAnswer, answerKey, startsWith, filled } from "../data/petitbac.js";
import { MINIGAMES, MG_BY, playSeconds, rankPoints, MG_GRACE_S, randomTeams, modeOf, teamAvg } from "../minigames/meta.js";
import { FRIEND_QS } from "../data/friendQs.js";
import { BD_SIZE, BD_LAYOUT, ITEMS, SPACE_INFO, HAPPENING, SHOP_POOL, randomItem } from "../data/board.js";

/** Pseudo : sans caractères de contrôle ni d'inversion de texte, 16 caractères au plus. */
export const cleanName = (n) => String(n ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff<>]/g, "").trim().slice(0, 16) || "Joueur";

const BOT_NAMES = ["Léa", "Hugo", "Nina", "Tom", "Inès", "Max", "Zoé", "Lucas", "Maëlle", "Noah", "Jade", "Eliott"];
const VOTE_IDS = new Set([...CATEGORIES.map((c) => c.id), "random", "mixtes"]);

export class HostEngine {
  /** @param {{roomId:string, name:string, host:{id:string,name:string}, emit:(msg:any)=>void}} o */
  constructor({ roomId, name, host, emit, fresh, signed, dates }) {
    this.emit = emit;
    this.signed = Boolean(signed);   // vrai : tout message réseau doit être signé par le joueur (voir secure.js)
    this.pks = {};                   // clé publique de chaque joueur : { id: "x.y" }
    this.lastN = {};                 // dernier compteur vu par joueur (anti-rejeu)
    this.buckets = {};               // limiteur de débit par expéditeur
    this.chains = {};                // file d'attente par expéditeur (vérification asynchrone, ordre conservé)
    this.fresh = fresh || freshTrack;
    this.dates = dates || resolveYear; // frise : année de première sortie d'un morceau (injectable pour les tests)
    this.playlist = [];  // blind test : morceaux importés (restent chez le créateur)
    this.btQueue = [];
    this.tlQueue = [];   // frise : morceaux restant à tirer (mélangés)
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
    this.quitCool = {};   // dernier vote proposé par joueur (anti-spam)
    this.quitTimer = null;
    this.state = {
      id: roomId,
      name,
      hostId: host.id,
      settings: { game: "timesup", variant: "classic", roundSeconds: 45, teamCount: 2, perTeam: DEFAULT_PER_TEAM, rounds: QE_DEFAULT_ROUNDS, ...QE_DEFAULTS, ...BT_DEFAULTS, ...TL_DEFAULTS, ...MG_DEFAULTS, ...BD_DEFAULTS, ...PB_DEFAULTS, ...CC_DEFAULTS },
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
      tl: null,     // frise musicale : voir « Frise musicale » plus bas
      mg: null,     // mini-jeux : voir « Mini-jeux » plus bas
      bd: null,     // plateau : voir « Plateau » plus bas
      pb: null,     // petit bac : voir « Petit bac » plus bas
      cc: null,     // célébrité (golf) : voir « Célébrité » plus bas
      quit: null,   // vote « retour au lobby » en cours : { by, yes: [ids], no: [ids], until, closed? }
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
  get capacity() { const s = this.S.settings; return (s.game === "blindtest" && !s.btTeams) || s.game === "party" || s.game === "board" || s.game === "petitbac" || s.game === "celeb" ? BT_MAX_SOLO : s.teamCount * s.perTeam; }
  get minPlayers() { const g = this.S.settings.game; return g === "blindtest" || g === "timeline" || g === "party" || g === "board" || g === "celeb" ? 1 : 2; }
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
    clearTimeout(this.quitTimer);
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
    this.quitCheck();
    if (this.S.phase !== "lobby" && this.S.players.length < this.minPlayers) return this.abort("Il n'y a plus assez de joueurs.");
    if (this.S.phase === "bt_play") this.btCheckDone();
    if (this.S.phase === "tl_play" && this.S.tl && this.S.tl.turn.pid === id) return this.tlResolve(null, "left");
    if (this.S.phase === "bd_turn" && this.S.bd && this.S.bd.cur === id) return this.bdNextTurn();
    if (this.S.phase === "cc_play" && this.S.cc) { delete this.S.cc.prog[id]; this.broadcast(); return this.ccCheckDone(); }
    if (this.S.phase === "pb_vote" && this.S.pb) { this.pbPurge(id); return this.pbCheckVote(); }
    if (this.S.phase === "mg_play") return this.mgCheckPlay();
    if (this.S.phase === "mg_ask" && this.S.mg && this.S.mg.q) return this.S.mg.q.subject === id ? this.mgAskEnd() : this.mgCheckAsk();
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
    if (GAMES.some((g) => g.id === patch.game)) s.game = patch.game;
    if (MG_ROUNDS_OPTIONS.includes(patch.mgRounds)) s.mgRounds = patch.mgRounds;
    if (CC_ROUNDS_OPTIONS.includes(patch.ccRounds)) s.ccRounds = patch.ccRounds;
    if (typeof patch.ccHint === "boolean") s.ccHint = patch.ccHint;
    if (PB_ROUNDS_OPTIONS.includes(patch.pbRounds)) s.pbRounds = patch.pbRounds;
    if (PB_SECONDS_OPTIONS.includes(patch.pbSeconds)) s.pbSeconds = patch.pbSeconds;
    if (patch.pbCats === "classic" || patch.pbCats === "mix") s.pbCats = patch.pbCats;
    if (BD_ROUNDS_OPTIONS.includes(patch.bdRounds)) s.bdRounds = patch.bdRounds;
    if (TL_GOAL_OPTIONS.includes(patch.tlGoal)) s.tlGoal = patch.tlGoal;
    if (patch.tlAudio === "all" || patch.tlAudio === "host") s.tlAudio = patch.tlAudio;
    if (typeof patch.tlUncertain === "boolean") s.tlUncertain = patch.tlUncertain;
    if (BT_SONGS_OPTIONS.includes(patch.btSongs)) s.btSongs = patch.btSongs;
    if (BT_GUESS_OPTIONS.includes(patch.btGuess)) s.btGuess = patch.btGuess;
    for (const k of ["btOneGuess", "btManual", "btTeams"]) if (typeof patch[k] === "boolean") s[k] = patch[k];
    if (patch.btScoring === "shared" || patch.btScoring === "sum") s.btScoring = patch.btScoring;
    if (patch.btAudio === "all" || patch.btAudio === "host") s.btAudio = patch.btAudio;
    if (patch.variant === "classic" || patch.variant === "bonus") s.variant = patch.variant;
    if (QE_ROUNDS_OPTIONS.includes(patch.rounds)) s.rounds = patch.rounds;
    if (patch.qeMode === "mixed" || patch.qeMode === "all" || patch.qeMode === "choose") s.qeMode = patch.qeMode;
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
    if (st.game === "timeline") {
      if (!this.playlist.length || !this.S.players.length) return;
      this.newGame();
      return this.startTimeline();
    }
    if (st.game === "celeb") {
      if (!this.S.players.length) return;
      this.newGame();
      return this.startCeleb();
    }
    if (st.game === "petitbac") {
      if (this.S.players.length < 2) return;
      this.newGame();
      return this.startPetitBac();
    }
    if (st.game === "board") {
      if (!this.S.players.length) return;
      this.newGame();
      return this.startBoard();
    }
    if (st.game === "party") {
      if (!this.S.players.length) return;
      this.newGame();
      return this.startParty();
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
    this.S.votesCast = {}; this.S.reveal = null; this.S.qe = null; this.S.tu = null; this.S.bonus = null; this.S.bt = null; this.S.tl = null; this.S.mg = null; this.S.bd = null; this.S.pb = null; this.S.cc = null; this.ccReset(); this.pbAns = {}; this.pbRej = {}; this.bdTraps = {}; this.mgSub = {}; this.mgAns = {}; this.tlCard = null; this.tlStamp = (this.tlStamp || 0) + 1; this.S.quit = null; clearTimeout(this.quitTimer); this.quitTimer = null; this.bonusMap = {}; this.bonusPicks = {}; this.resetReady();
    this.broadcast();
  }
  // Fin de partie (Time's Up, Qui est-ce ? ou Blind test) : le créateur ramène tout le monde au lobby, équipes conservées.
  backToLobby(by) {
    if (by !== this.S.hostId || !(["done", "qe_final", "bt_final", "tl_final", "mg_final", "bd_final", "pb_final", "cc_final"].includes(this.S.phase))) return;
    this.forceLobby();
  }
  // Retour immédiat au lobby, quelle que soit la phase (fin de partie ou vote des joueurs).
  forceLobby() {
    this.clearTimers();
    clearTimeout(this.quitTimer); this.quitTimer = null;
    this.qeToken = (this.qeToken || 0) + 1; this.btStamp = (this.btStamp || 0) + 1; // résultats asynchrones en cours : ignorés
    this.btEnding = false;
    this.tlStamp = (this.tlStamp || 0) + 1; this.tlCard = null; this.tlQueue = []; this.tlNextP = null;
    this.hands = {}; this.dealt = {}; this.discards = {}; this.gameDeck = []; this.votes = {};
    Object.assign(this.S, { votesCast: {}, tally: {}, reveal: null, tu: null, deckSize: 0, qe: null, bonus: null, bt: null, tl: null, mg: null, bd: null, pb: null, cc: null, quit: null, pstats: {} });
    this.ccReset();
    this.pbAns = {}; this.pbRej = {};
    this.bdTraps = {};
    this.mgSub = {}; this.mgAns = {};
    this.btQueue = []; this.btNextP = null;
    this.bonusMap = {}; this.bonusPicks = {};
    this.deck = []; this.allCards = [];
    this.resetReady();
    this.setPhase("lobby", null);
    this.broadcast();
  }

  /* ------------------- vote « quitter la partie » (majorité) ------------------- */
  // N'importe quel joueur peut proposer pendant une partie ; la majorité des joueurs humains (les bots ne votent pas) ramène tout le monde au lobby.
  quitVote(id, v) {
    const S = this.S, p = this.player(id);
    if (S.phase === "lobby" || !p || p.bot) return;
    let q = S.quit;
    if (q && q.closed) return;
    if (v === "start" || (!q && v === "yes")) {
      if (q) v = "yes";
      else {
        const now = Date.now();
        if (now < (this.quitCool[id] || 0)) return; // pas de harcèlement : une proposition toutes les 40 s par joueur
        this.quitCool[id] = now + 40000;
        q = S.quit = { by: id, yes: [id], no: [], until: now + QUIT_VOTE_MS };
        clearTimeout(this.quitTimer);
        this.quitTimer = setTimeout(() => this.quitEnd(false), QUIT_VOTE_MS);
      }
    }
    if (v === "yes" || v === "no") {
      q.yes = q.yes.filter((x) => x !== id); q.no = q.no.filter((x) => x !== id);
      (v === "yes" ? q.yes : q.no).push(id);
    }
    this.quitCheck();
  }
  quitCheck() {
    const q = this.S.quit;
    if (!q || q.closed) return;
    const hs = this.S.players.filter((p) => !p.bot).map((p) => p.id);
    q.yes = q.yes.filter((x) => hs.includes(x)); q.no = q.no.filter((x) => hs.includes(x));
    const need = Math.floor(hs.length / 2) + 1;
    if (q.yes.length >= need) return this.quitEnd(true);
    if (q.no.length > hs.length - need) return this.quitEnd(false);
    this.broadcast();
  }
  quitEnd(ok) {
    clearTimeout(this.quitTimer); this.quitTimer = null;
    if (!this.S.quit || this.dead) return;
    if (ok) return this.forceLobby();
    this.S.quit.closed = "refused"; // le résultat reste affiché 3 s
    this.broadcast();
    this.quitTimer = setTimeout(() => { this.quitTimer = null; if (this.S.quit && this.S.quit.closed) { this.S.quit = null; this.broadcast(); } }, 3000);
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
    if (ph === "qe_pick") return this.checkPick();
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
  // add = true : les morceaux s'ajoutent à la playlist déjà choisie (doublons ignorés) ; sinon elle est remplacée.
  setPlaylist(by, pl, add = false) {
    if (by !== this.S.hostId || this.S.phase !== "lobby") return;
    // seules les adresses autorisées (Deezer, Wikimedia, démo…) sont gardées : voir lib/safeUrl.js
    const incoming = (pl && pl.tracks ? pl.tracks : [])
      .map((t) => t && { ...t, preview: safeUrl(t.preview, { allowDemo: true }), cover: safeUrl(t.cover) })
      .filter((t) => t && t.preview);
    const prev = add && this.S.playlist ? this.S.playlist : null;
    const seen = new Set(prev ? this.playlist.map((t) => t.id) : []);
    const merged = (prev ? this.playlist : []).concat(incoming.filter((t) => !seen.has(t.id) && seen.add(t.id)));
    this.playlist = merged.slice(0, 3000);
    const lists = (prev ? prev.lists || 1 : 0) + (incoming.length ? 1 : 0);
    this.S.playlist = this.playlist.length ? {
      name: prev ? (lists > 1 ? `${prev.first || prev.name} + ${lists - 1} autre${lists > 2 ? "s" : ""}` : prev.name) : String(pl.name || "Playlist").slice(0, 60),
      first: prev ? prev.first || prev.name : String(pl.name || "Playlist").slice(0, 60),
      lists,
      count: this.playlist.length,
      cover: prev ? prev.cover : safeUrl(pl.cover),
      source: prev ? (prev.source === String(pl.source || "").slice(0, 20) ? prev.source : "Mélange") : String(pl.source || "").slice(0, 20),
      missing: (prev ? prev.missing || 0 : 0) + (pl.missing || 0),
    } : null;
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

  /* ---------------------------- Frise musicale ---------------------------- */
  // Chaque équipe a sa frise : une ligne de cartes rangées par année. À son tour, un joueur de l'équipe écoute un extrait
  // (titre et année cachés) et choisit où l'insérer. Bien placé (l'ordre des années reste croissant, égalité acceptée) :
  // la carte rejoint la frise ; sinon elle est défaussée. La première équipe qui atteint l'objectif (10 / 15 / 20) gagne.
  // Seul le créateur connaît l'année avant la révélation (`this.tlCard`) : elle n'est jamais dans l'état diffusé.
  tlTeams() { return [...new Set(this.S.players.map((p) => p.team))].sort((a, b) => a - b); }
  startTimeline() {
    this.clearTimers();
    const s = this.S.settings, teams = this.tlTeams();
    this.tlQueue = shuffle(this.playlist);
    this.tlNextP = null; this.tlCard = null; this.tlTurns = {}; this.tlSkipped = 0;
    const stamp = (this.tlStamp = (this.tlStamp || 0) + 1);
    this.S.tl = { goal: s.tlGoal, audio: s.tlAudio, teams, line: Object.fromEntries(teams.map((t) => [t, []])), n: 0,
      turn: null, cur: null, preload: null, reveal: null, winner: null, skipped: 0, loading: true };
    this.setPhase("tl_play", null);
    this.broadcast();
    this.tlBegin(stamp, teams);
  }
  // Une carte de départ par équipe (année visible), puis le premier tour.
  async tlBegin(stamp, teams) {
    for (const t of teams) {
      const c = await this.tlPickCard();
      if (this.dead || stamp !== this.tlStamp || !this.S.tl) return;
      if (!c) return this.abort("Pas assez de morceaux avec une date fiable. Ajoute une autre playlist ou accepte les dates incertaines.");
      this.S.tl.line[t].push(this.tlPublic(c));
    }
    this.S.tl.loading = false;
    this.tlPrepare();
    this.tlNextTurn();
  }
  tlPublic(c) { return { id: c.id, t: cleanTitle(c.title) || c.title, a: c.artists.join(", "), y: c.year }; }
  // Prochain morceau utilisable : extrait à jour, année trouvée (MusicBrainz + Deezer). Sans année fiable, il est écarté.
  async tlPickCard() {
    while (this.tlQueue.length) {
      let t = this.tlQueue.shift();
      try { t = await this.fresh(t); } catch { /* on garde les anciennes données */ }
      if (!t) continue;
      t = { ...t, preview: safeUrl(t.preview, { allowDemo: true }), cover: safeUrl(t.cover) };
      if (!t.preview) continue;
      let r = null;
      if (Number.isInteger(t.year)) r = { year: t.year, confident: true };
      else if (!String(t.preview).startsWith("demo:")) { try { r = await this.dates(t); } catch { r = null; } }
      if (!r || !r.year || (!r.confident && !this.S.settings.tlUncertain)) { this.tlSkipped++; if (this.S.tl) this.S.tl.skipped = this.tlSkipped; continue; }
      return { ...t, year: r.year, uncertain: !r.confident };
    }
    return null;
  }
  // Prépare la carte suivante pendant le tour en cours (les recherches de dates prennent quelques secondes).
  tlPrepare() {
    if (!this.S.tl) return;
    const stamp = this.tlStamp;
    const p = (this.tlNextP = this.tlPickCard());
    p.then((c) => { if (this.dead || stamp !== this.tlStamp || this.tlNextP !== p || !this.S.tl) return; this.S.tl.preload = c ? c.preview : null; this.broadcast(); });
  }
  async tlNextTurn() {
    const tl = this.S.tl;
    if (!tl || this.dead) return;
    const stamp = this.tlStamp;
    const p = this.tlNextP || this.tlPickCard();
    this.tlNextP = null;
    const card = await p;
    if (this.dead || stamp !== this.tlStamp || !this.S.tl) return;
    if (!card) return this.tlFinish();
    this.clearTimers();
    // équipe suivante (tour de rôle) puis joueur suivant dans cette équipe
    const teams = this.tlTeams();
    if (!teams.length) return;
    const team = teams[tl.n % teams.length];
    const members = this.S.players.filter((x) => x.team === team).sort((a, b) => a.joinedAt - b.joinedAt);
    const idx = (this.tlTurns[team] = (this.tlTurns[team] || 0) + 1) - 1;
    const pl = members[idx % members.length];
    for (const t of teams) if (!tl.line[t]) tl.line[t] = [];
    tl.n += 1;
    this.tlCard = card;
    tl.teams = teams;
    tl.turn = { team, pid: pl.id };
    tl.cur = { url: card.preview, token: tl.n, offset: Math.floor(Math.random() * (TL_MAX_OFFSET_S + 1)) }; // départ aléatoire dans l'extrait
    tl.reveal = null; tl.preload = null;
    this.setPhase("tl_play", TL_PLACE_SECONDS * 1000);
    this.broadcast();
    this.after(TL_PLACE_SECONDS * 1000, () => this.tlResolve(null, "time"));
    this.tlPrepare();
    if (pl.bot) this.tlBotPlace(pl, card);
  }
  tlPlace(by, slot) {
    const tl = this.S.tl;
    if (this.S.phase !== "tl_play" || !tl || !tl.turn || tl.turn.pid !== by || !this.tlCard) return;
    const line = tl.line[tl.turn.team];
    if (!Number.isInteger(slot) || slot < 0 || slot > line.length) return;
    this.tlResolve(slot, "placed");
  }
  tlResolve(slot, reason) {
    const tl = this.S.tl, card = this.tlCard;
    if (this.S.phase !== "tl_play" || !tl || !tl.turn || !card) return;
    this.clearTimers();
    this.tlCard = null;
    const { team, pid } = tl.turn, line = tl.line[team], pl = this.player(pid);
    let ok = false;
    if (slot != null) ok = (slot === 0 || line[slot - 1].y <= card.year) && (slot === line.length || card.year <= line[slot].y);
    if (ok) line.splice(slot, 0, this.tlPublic(card));
    if (pl) { const st = this.ps(pid); st.turns = (st.turns || 0) + 1; if (ok) st.hits = (st.hits || 0) + 1; }
    if (ok && line.length >= tl.goal) tl.winner = team;
    tl.cur = null;
    tl.reveal = { title: cleanTitle(card.title) || card.title, artist: card.artists.join(", "), year: card.year, uncertain: card.uncertain, cover: card.cover || "", slot, ok, team, pid, name: pl ? pl.name : "?", reason, last: tl.winner != null };
    this.setPhase("tl_reveal", TL_REVEAL_SECONDS * 1000);
    this.broadcast();
    this.after(TL_REVEAL_SECONDS * 1000, () => this.tlAfterReveal());
  }
  tlAfterReveal() {
    const tl = this.S.tl;
    if (this.S.phase !== "tl_reveal" || !tl) return;
    if (tl.winner != null) return this.tlFinish();
    this.clearTimers();
    this.tlNextTurn();
  }
  // Le créateur peut passer la pause de révélation.
  tlSkip(by) {
    if (by !== this.S.hostId || this.S.phase !== "tl_reveal") return;
    this.tlAfterReveal();
  }
  tlFinish() {
    const tl = this.S.tl;
    if (!tl) return;
    this.clearTimers();
    tl.cur = null; tl.preload = null; tl.loading = false;
    if (tl.winner == null) { // plus de morceaux : la frise la plus longue gagne (égalité : pas de vainqueur)
      const best = Math.max(...tl.teams.map((t) => tl.line[t].length));
      const top = tl.teams.filter((t) => tl.line[t].length === best);
      tl.winner = top.length === 1 ? top[0] : null;
      tl.ended = "deck";
    }
    this.setPhase("tl_final", null);
    this.broadcast();
  }
  // Bot de test : place la carte au bon endroit une fois sur deux, au hasard sinon.
  tlBotPlace(bot, card) {
    const stamp = this.tlStamp;
    this.after((FAST ? 1200 : 3500) + Math.random() * 1500, () => {
      const tl = this.S.tl;
      if (!tl || stamp !== this.tlStamp || !tl.turn || tl.turn.pid !== bot.id) return;
      const line = tl.line[tl.turn.team];
      let slot = Math.floor(Math.random() * (line.length + 1));
      if (Math.random() < 0.55) { slot = line.findIndex((c) => c.y > card.year); if (slot < 0) slot = line.length; }
      this.tlPlace(bot.id, slot);
    });
  }

  /* ------------------------------ Petit bac ------------------------------ */
  // Chaque manche : une lettre, six catégories. Tout le monde écrit en secret (les réponses restent chez le créateur jusqu'à la
  // fin) ; celui qui a tout rempli peut crier STOP (les autres ont alors quelques secondes). Puis toutes les réponses sont
  // dévoilées et chacun peut en contester : si plus de la moitié des AUTRES joueurs conteste une réponse, elle est refusée.
  // Réponse valide commençant par la lettre : 10 points si elle est unique, 5 si un autre joueur a la même, 0 sinon.
  startPetitBac() {
    this.clearTimers();
    const s = this.S.settings;
    const cats = s.pbCats === "mix" ? shuffle(PB_CATS.map((c) => c.id)).slice(0, PB_CAT_COUNT) : [...PB_CLASSIC];
    this.pbAns = {}; this.pbRej = {}; this.pbEndT = null; this.pbLetters = shuffle(PB_LETTERS);
    this.S.pb = { round: 0, total: s.pbRounds, cats, letter: null, seconds: PB_PLAY_SECONDS(s.pbSeconds), stop: null, prog: {}, rows: null, rej: {}, ok: [],
      scores: Object.fromEntries(this.S.players.map((p) => [p.id, 0])), last: null, final: null };
    this.pbNextRound();
  }
  pbNextRound() {
    const pb = this.S.pb;
    if (!pb || this.dead) return;
    this.clearTimers();
    if (pb.round >= pb.total) return this.pbFinish();
    pb.round += 1;
    pb.letter = this.pbLetters.pop();
    pb.stop = null; pb.prog = {}; pb.rows = null; pb.rej = {}; pb.ok = []; pb.last = null;
    this.pbAns = {}; this.pbRej = {};
    this.setPhase("pb_intro", PB_INTRO_MS);
    this.broadcast();
    this.after(PB_INTRO_MS, () => this.pbPlay());
  }
  pbPlay() {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_intro" || !pb) return;
    const ms = pb.seconds * 1000;
    this.setPhase("pb_play", ms);
    this.broadcast();
    this.pbEndT = this.after(ms + PB_GRACE_MS, () => this.pbEndPlay());
    for (const b of this.S.players.filter((p) => p.bot)) this.pbBot(b);
  }
  // Un joueur envoie l'ensemble de ses réponses (la dernière version remplace la précédente).
  pbAnswers(id, a) {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_play" || !pb || !this.player(id)) return;
    const list = pb.cats.map((_, i) => cleanAnswer(Array.isArray(a) ? a[i] : ""));
    this.pbAns[id] = list;
    const n = list.filter((x) => filled(x) && startsWith(x, pb.letter)).length;
    if (pb.prog[id] !== n) { pb.prog[id] = n; this.broadcast(); }
  }
  pbComplete(id) { const pb = this.S.pb, l = this.pbAns[id]; return Boolean(pb && l && l.length === pb.cats.length && l.every((x) => filled(x) && startsWith(x, pb.letter))); }
  // STOP : seulement si toutes les catégories sont remplies avec la bonne lettre. Les autres ont PB_STOP_MS pour finir.
  pbStop(by) {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_play" || !pb || pb.stop || !this.pbComplete(by)) return;
    const p = this.player(by);
    pb.stop = { by, name: p ? p.name : "?" };
    const left = this.deadline ? this.deadline - Date.now() : PB_STOP_MS;
    if (left > PB_STOP_MS) {
      this.deadline = Date.now() + PB_STOP_MS;
      if (this.pbEndT) { clearTimeout(this.pbEndT); this.timers.delete(this.pbEndT); }
      this.pbEndT = this.after(PB_STOP_MS + PB_GRACE_MS, () => this.pbEndPlay());
    }
    this.broadcast();
  }
  pbEndPlay() {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_play" || !pb) return;
    this.clearTimers();
    this.pbEndT = null;
    pb.rej = {}; pb.ok = []; this.pbRej = {};
    this.pbRefresh();
    this.setPhase("pb_vote", PB_VOTE_SECONDS * 1000);
    this.broadcast();
    this.after(PB_VOTE_SECONDS * 1000, () => this.pbEndVote());
  }
  // Une réponse est refusée si plus de la moitié des autres joueurs la conteste.
  pbRejected(c, pid) {
    const set = this.pbRej[c + ":" + pid];
    if (!set) return false;
    const votes = [...set].filter((v) => v !== pid && this.player(v)).length, others = this.S.players.length - 1;
    return others > 0 && votes * 2 > others;
  }
  /** Statut et points de chaque réponse : { c, items: [{ id, a, st: "ok" | "dup" | "empty" | "letter" | "out", pts }] } par catégorie. */
  pbCompute() {
    const pb = this.S.pb;
    return pb.cats.map((_, c) => {
      const items = this.S.players.map((p) => {
        const a = (this.pbAns[p.id] || [])[c] || "";
        const st = !filled(a) ? "empty" : !startsWith(a, pb.letter) ? "letter" : this.pbRejected(c, p.id) ? "out" : "ok";
        return { id: p.id, a, st, key: answerKey(a), pts: 0 };
      });
      const valid = items.filter((i) => i.st === "ok");
      for (const it of valid) { const same = valid.filter((v) => v.key === it.key).length; it.st = same > 1 ? "dup" : "ok"; it.pts = same > 1 ? PB_SHARED : PB_UNIQUE; }
      return { c, items: items.map(({ key, ...r }) => r) };
    });
  }
  pbRefresh() {
    const pb = this.S.pb;
    pb.rows = this.pbCompute();
    pb.rej = Object.fromEntries(Object.entries(this.pbRej).filter(([, v]) => v.size).map(([k, v]) => [k, [...v]]));
  }
  pbReject(by, c, pid, v) {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_vote" || !pb || !this.player(by) || !this.player(pid) || by === pid || !Number.isInteger(c) || c < 0 || c >= pb.cats.length) return;
    const a = (this.pbAns[pid] || [])[c] || "";
    if (!filled(a) || !startsWith(a, pb.letter)) return; // rien à contester : déjà refusée
    const set = (this.pbRej[c + ":" + pid] ||= new Set());
    if (v) set.add(by); else set.delete(by);
    this.pbRefresh();
    this.broadcast();
  }
  pbOk(by) {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_vote" || !pb || !this.player(by) || pb.ok.includes(by)) return;
    pb.ok.push(by);
    this.broadcast();
    this.pbCheckVote();
  }
  pbCheckVote() {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_vote" || !pb) return;
    if (this.S.players.filter((p) => !p.bot).every((p) => pb.ok.includes(p.id))) this.pbEndVote();
  }
  // Un joueur part pendant la contestation : ses réponses et ses contestations disparaissent.
  pbPurge(id) {
    const pb = this.S.pb;
    delete this.pbAns[id];
    for (const k of Object.keys(this.pbRej)) { if (k.endsWith(":" + id)) delete this.pbRej[k]; else this.pbRej[k].delete(id); }
    pb.ok = pb.ok.filter((x) => x !== id);
    this.pbRefresh();
    this.broadcast();
  }
  pbEndVote() {
    const pb = this.S.pb;
    if (this.S.phase !== "pb_vote" || !pb) return;
    this.clearTimers();
    const rows = this.pbCompute(), gain = {};
    for (const p of this.S.players) {
      let g = 0, valid = 0, uniq = 0;
      for (const r of rows) { const it = r.items.find((i) => i.id === p.id); if (it && it.pts) { g += it.pts; valid++; if (it.pts === PB_UNIQUE) uniq++; } }
      gain[p.id] = g; pb.scores[p.id] = (pb.scores[p.id] || 0) + g;
      const st = this.ps(p.id); st.pbRounds = (st.pbRounds || 0) + 1; st.pbValid = (st.pbValid || 0) + valid; st.pbUnique = (st.pbUnique || 0) + uniq;
    }
    pb.rows = rows;
    pb.last = { letter: pb.letter, rows, gain, stop: pb.stop };
    this.setPhase("pb_result", PB_RESULT_SECONDS * 1000);
    this.broadcast();
    this.after(PB_RESULT_SECONDS * 1000, () => this.pbNextRound());
  }
  pbNext(by) {
    if (by !== this.S.hostId || this.S.phase !== "pb_result") return;
    this.pbNextRound();
  }
  pbFinish() {
    const pb = this.S.pb;
    if (!pb) return;
    this.clearTimers();
    const rows = this.S.players.map((p) => ({ id: p.id, pts: pb.scores[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
    let rank = 0, prev = null;
    rows.forEach((r, i) => { if (r.pts !== prev) { rank = i + 1; prev = r.pts; } r.rank = rank; });
    pb.final = rows; pb.letter = null;
    this.setPhase("pb_final", null);
    this.broadcast();
  }
  // Bot de test : remplit une partie des catégories avec des mots inventés commençant par la bonne lettre.
  pbBot(b) {
    const pb = this.S.pb, L = pb.letter, syl = ["ra", "mi", "lo", "ta", "ne", "ba", "su", "do", "pi", "ka"];
    const pickSyl = () => syl[Math.floor(Math.random() * syl.length)];
    const ans = pb.cats.map(() => (Math.random() < 0.75 ? L + pickSyl() + pickSyl() : ""));
    const stamp = pb.round;
    this.after(FAST ? 1500 + Math.random() * 3000 : 8000 + Math.random() * 20000, () => { if (this.S.pb && this.S.pb.round === stamp) this.pbAnswers(b.id, ans); });
  }

  /* ------------------------------ Célébrité (golf) ------------------------------ */
  // 10 célébrités (ou personnages fictifs) tirées au hasard. Chaque manche, tout le monde voit la même photo, très pixellisée ;
  // chaque proposition fausse la rend plus nette (pour celui qui l'a faite). Trouvée à la n-ième proposition = n coups ; pas trouvée
  // après CELEB_MAX_TRIES propositions (ou à la fin du temps) = CELEB_PENALTY coups. Le total le plus BAS gagne, comme au golf.
  // La réponse reste chez le créateur (this.ccCard) jusqu'à la fin de la manche.
  ccReset() {
    this.ccGame = (this.ccGame || 0) + 1; // résultats asynchrones d'une partie précédente : ignorés
    this.ccCard = null; this.ccNextHit = null; this.ccUsed = new Set(); this.ccEndT = null; this.ccShort = false; this.ccFails = 0;
  }
  startCeleb() {
    this.clearTimers();
    this.ccReset();
    const total = this.S.settings.ccRounds;
    this.ccPool = ALL_CARDS.filter(isCeleb);
    this.S.cc = { round: 0, total, url: null, hint: null, showHint: this.S.settings.ccHint !== false, prog: {}, end: null, past: [], hist: {}, totals: {}, final: null, tries: CELEB_MAX_TRIES, penalty: CELEB_PENALTY };
    for (const p of this.S.players) { this.S.cc.hist[p.id] = []; this.S.cc.totals[p.id] = 0; }
    this.ccNextRound();
  }
  // Cherche (sur Wikipédia, depuis le téléphone du créateur) une célébrité de la liste qui a une photo.
  async ccFind(game) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let free = this.ccPool.filter((c) => !this.ccUsed.has(c.id));
      if (free.length < 8) { this.ccUsed = new Set(); free = this.ccPool; } // toute la liste a servi : on recommence
      const cands = shuffle(free).slice(0, 8);
      let hit = cands.find((c) => c.image && safeUrl(c.image));
      hit = hit ? { card: hit, url: hit.image } : null;
      if (!hit) {
        try {
          const r = await findFirstWithImage(cands);
          if (r && r.error) return null;
          hit = r;
        } catch { return null; }
      }
      if (game !== this.ccGame || this.dead) return null;
      for (const c of cands) this.ccUsed.add(c.id); // les 8 candidats ne reviendront pas de sitôt (même ceux sans photo)
      if (hit && safeUrl(hit.url)) return hit;
    }
    return null;
  }
  ccNextRound() {
    const cc = this.S.cc;
    if (!cc || this.dead) return;
    this.clearTimers();
    if (cc.round >= cc.total) return this.ccFinish();
    cc.round += 1;
    cc.url = null; cc.hint = null; cc.end = null; cc.prog = {};
    for (const p of this.S.players) cc.prog[p.id] = { tries: 0, got: null, res: null };
    this.ccShort = false;
    this.setPhase("cc_load", CC_LOAD_MS);
    this.broadcast();
    const game = this.ccGame, round = cc.round;
    const ready = this.ccNextHit; this.ccNextHit = null;
    const retry = () => {
      if (game !== this.ccGame || this.S.phase !== "cc_load" || !this.S.cc || this.S.cc.round !== round) return;
      this.ccFails += 1;
      if (this.ccFails >= 3) return this.abort("Impossible de trouver des photos (Wikipédia injoignable ?).");
      cc.round -= 1; // on refait la même manche
      this.ccNextRound();
    };
    this.after(CC_LOAD_MS, retry);
    (ready ? Promise.resolve(ready) : this.ccFind(game)).then((hit) => {
      if (game !== this.ccGame || this.S.phase !== "cc_load" || !this.S.cc || this.S.cc.round !== round) return;
      if (!hit) return retry();
      this.ccFails = 0;
      this.ccPlay(hit);
    });
  }
  ccPlay(hit) {
    const cc = this.S.cc;
    this.clearTimers();
    this.ccCard = hit.card;
    cc.url = safeUrl(hit.url);
    cc.hint = cc.showHint ? celebHint(hit.card) : null;
    const ms = CC_PLAY_SECONDS * 1000;
    this.setPhase("cc_play", ms);
    this.broadcast();
    this.ccEndT = this.after(ms, () => this.ccEndRound());
    // pendant que les joueurs cherchent, on prépare déjà la photo de la manche suivante
    if (cc.round < cc.total) { const game = this.ccGame; this.ccFind(game).then((h) => { if (game === this.ccGame && h) this.ccNextHit = h; }); }
    for (const b of this.S.players.filter((p) => p.bot)) this.ccBot(b);
  }
  ccGuess(id, text) {
    const cc = this.S.cc, pr = cc && cc.prog[id];
    if (this.S.phase !== "cc_play" || !pr || pr.got != null || !this.ccCard || !this.player(id)) return;
    text = String(text || "").trim().slice(0, 80);
    pr.tries += 1;
    const r = text ? celebCheck(text, this.ccCard.name) : null;
    if (r === "full") { pr.got = pr.tries; pr.res = "ok"; }
    else if (pr.tries >= CELEB_MAX_TRIES) { pr.got = CELEB_PENALTY; pr.res = "out"; }
    else pr.res = r === "close" ? "close" : text ? "wrong" : "pass";
    const st = this.ps(id);
    st.ccTries = (st.ccTries || 0) + 1;
    this.broadcast();
    if (pr.got != null) this.ccAfterDone();
  }
  // Quelqu'un a fini : s'il y en a d'autres, ils n'ont plus que quelques secondes ; si tout le monde a fini, on passe au résultat.
  ccAfterDone() {
    const cc = this.S.cc;
    if (this.ccCheckDone()) return;
    if (!this.ccShort && cc.round && Object.values(cc.prog).some((x) => x.got != null)) {
      this.ccShort = true;
      const left = this.deadline ? this.deadline - Date.now() : Infinity;
      const ms = CC_AFTER_FIRST_SECONDS * 1000;
      if (left > ms) {
        if (this.ccEndT) { clearTimeout(this.ccEndT); this.timers.delete(this.ccEndT); }
        this.deadline = Date.now() + ms;
        this.ccEndT = this.after(ms, () => this.ccEndRound());
        this.broadcast();
      }
    }
  }
  ccCheckDone() {
    const cc = this.S.cc;
    if (this.S.phase !== "cc_play" || !cc) return false;
    const rows = Object.values(cc.prog);
    if (rows.length && rows.every((x) => x.got != null)) { this.after(1200, () => this.ccEndRound()); return true; }
    if (!rows.length) { this.ccEndRound(); return true; }
    return false;
  }
  ccEndRound() {
    const cc = this.S.cc;
    if (this.S.phase !== "cc_play" || !cc || !this.ccCard) return;
    this.clearTimers();
    for (const p of this.S.players) {
      const pr = cc.prog[p.id] || (cc.prog[p.id] = { tries: 0, got: null, res: null });
      if (pr.got == null) { pr.got = CELEB_PENALTY; pr.res = "time"; }
      (cc.hist[p.id] ||= []).push(pr.got);
      cc.totals[p.id] = (cc.totals[p.id] || 0) + pr.got;
      const st = this.ps(p.id);
      st.ccRounds = (st.ccRounds || 0) + 1;
      if (pr.got < CELEB_PENALTY) { st.ccFound = (st.ccFound || 0) + 1; st.ccStrokes = (st.ccStrokes || 0) + pr.got; if (pr.got === 1) st.ccAces = (st.ccAces || 0) + 1; }
    }
    cc.end = { name: this.ccCard.name, url: cc.url };
    cc.past.push({ name: this.ccCard.name, url: cc.url });
    this.setPhase("cc_result", CC_RESULT_SECONDS * 1000);
    this.broadcast();
    this.after(CC_RESULT_SECONDS * 1000, () => this.ccNextRound());
  }
  ccNext(by) {
    if (by !== this.S.hostId || this.S.phase !== "cc_result") return;
    this.ccNextRound();
  }
  ccFinish() {
    const cc = this.S.cc;
    this.clearTimers();
    cc.final = rankStrokes(this.S.players.map((p) => ({ id: p.id, total: cc.totals[p.id] || 0 })));
    cc.url = null; cc.hint = null;
    this.setPhase("cc_final", null);
    this.broadcast();
  }
  // Bot de test : trouve (ou pas) la célébrité après un nombre d'essais tiré au hasard.
  ccBot(b) {
    const cc = this.S.cc, round = cc.round, game = this.ccGame;
    const fail = Math.random() < 0.2, target = fail ? CELEB_MAX_TRIES + 1 : 1 + Math.floor(Math.random() * CELEB_MAX_TRIES);
    let n = 0;
    const step = () => {
      if (game !== this.ccGame || this.S.phase !== "cc_play" || !this.S.cc || this.S.cc.round !== round || !this.player(b.id)) return;
      n += 1;
      this.ccGuess(b.id, n === target ? this.ccCard.name : "zzz");
      const pr = this.S.cc.prog[b.id];
      if (pr && pr.got == null) this.after((FAST ? 500 : 3000) + Math.random() * (FAST ? 1200 : 7000), step);
    };
    this.after((FAST ? 600 : 4000) + Math.random() * (FAST ? 1500 : 8000), step);
  }

  /* ------------------------------ Mini-jeux (« Party ») ------------------------------ */
  // Chaque manche est soit un mini-jeu (tout le monde joue la même partie en même temps ; chacun pour soi, ou en équipes
  // 2 contre 2 / 1 contre 3 / 1 contre 2 : score d'équipe = moyenne), soit un test d'amitié (quelques questions « plutôt… ? »
  // sur un joueur ; les autres devinent sa réponse).
  startParty() {
    this.clearTimers();
    const total = this.S.settings.mgRounds;
    let bag = [];
    const draw = () => { if (!bag.length) bag = shuffle(MINIGAMES.map((g) => g.id)); return bag.pop(); };
    this.mgPlan = Array.from({ length: total }, (_, r) => (this.S.players.length >= 2 && total >= MG_FRIEND_EVERY && r % MG_FRIEND_EVERY === MG_FRIEND_EVERY - 1 ? { kind: "friend" } : { kind: "mini", game: draw() }));
    this.mgSpare = draw;
    this.mgSub = {}; this.mgAns = {};
    this.S.mg = { round: 0, total, step: 0, kind: null, game: null, seed: 0, mode: "ffa", teams: null, done: [], scores: Object.fromEntries(this.S.players.map((p) => [p.id, 0])), wins: {}, last: null, q: null, fq: null, final: null };
    this.mgNextRound();
  }
  mgNextRound() {
    const mg = this.S.mg;
    if (!mg || this.dead) return;
    this.clearTimers();
    if (mg.round >= mg.total) return this.mgFinish();
    const plan = this.mgPlan[mg.round];
    mg.round += 1;
    if (plan.kind === "friend" && this.S.players.length >= 2) return this.mgStartFriend();
    this.mgSetup(plan.game || this.mgSpare(), this.mgTeams());
  }
  /** Répartition en équipes d'un mini-jeu hors plateau (au hasard ; remplaçable dans les tests). */
  mgTeams() { return randomTeams(this.S.players.map((p) => p.id)); }
  /** Prépare un mini-jeu (graine commune, équipes éventuelles) et lance la présentation. */
  mgSetup(game, teams) {
    const mg = this.S.mg, ids = this.S.players.map((p) => p.id);
    mg.kind = "mini"; mg.game = game; mg.seed = Math.floor(Math.random() * 2147483647);
    mg.mode = modeOf(teams, ids); mg.teams = mg.mode === "ffa" ? null : Object.fromEntries(ids.map((id) => [id, teams[id]]));
    mg.step += 1; mg.done = []; mg.last = null; mg.q = null; mg.fq = null;
    this.mgSub = {};
    this.setPhase("mg_intro", MG_INTRO_MS);
    this.broadcast();
    this.after(MG_INTRO_MS, () => this.mgPlay());
  }
  mgPlay() {
    const mg = this.S.mg;
    if (!mg || this.S.phase !== "mg_intro") return;
    const g = MG_BY[mg.game], secs = playSeconds(g), ms = (secs + MG_GRACE_S) * 1000;
    this.setPhase("mg_play", ms);
    this.broadcast();
    this.after(ms, () => this.mgPlayEnd());
    for (const b of this.S.players.filter((p) => p.bot)) {
      this.after(secs * 1000 * (0.4 + Math.random() * 0.5), () => this.mgSubmit(b.id, mg.step, g.max * (0.1 + Math.random() * 0.55)));
    }
    this.mgCheckPlay();
  }
  mgSubmit(id, step, s) {
    const mg = this.S.mg;
    if (this.S.phase !== "mg_play" || !mg || step !== mg.step || !this.player(id) || id in this.mgSub) return;
    this.mgSub[id] = Math.max(0, Math.min(MG_BY[mg.game].max, Math.round(Number(s)) || 0));
    mg.done.push(id);
    this.broadcast();
    this.mgCheckPlay();
  }
  mgCheckPlay() {
    if (this.S.phase !== "mg_play" || !this.S.mg) return;
    if (this.S.players.every((p) => p.id in this.mgSub)) this.mgPlayEnd();
  }
  mgPlayEnd() {
    const mg = this.S.mg;
    if (this.S.phase !== "mg_play" || !mg) return;
    this.clearTimers();
    const ids = this.S.players.map((p) => p.id), n = ids.length;
    const mode = modeOf(mg.teams, ids); // un camp peut s'être vidé (joueurs partis) : on retombe sur « chacun pour soi »
    let rows, teams = null, winners = new Set();
    if (mode === "ffa") {
      rows = ids.map((id) => ({ id, s: this.mgSub[id] ?? 0, dnf: !(id in this.mgSub) }));
      rows.sort((a, b) => (a.dnf - b.dnf) || (b.s - a.s));
      const played = rows.filter((r) => !r.dnf).length, top = rows.length ? rows[0].s : 0;
      let rank = 0, prev = null;
      rows.forEach((r, i) => {
        if (r.dnf) { r.rank = played + 1; r.pts = 0; r.coins = 0; return; }
        if (r.s !== prev) { rank = i + 1; prev = r.s; }
        r.rank = rank; r.pts = rankPoints(rank, n);
        r.coins = rank === 1 && top > 0 ? BD_MINI_WIN : 0; // Mario Party : seul le gagnant empoche les pièces
        if (rank === 1 && n >= 2 && top > 0) winners.add(r.id);
      });
    } else {
      const sides = [0, 1].map((t) => ids.filter((id) => mg.teams[id] === t));
      const avg = sides.map((s) => teamAvg(s, this.mgSub));
      const win = avg[0] === avg[1] ? -1 : avg[0] > avg[1] ? 0 : 1;
      teams = sides.map((s, t) => ({ t, ids: s, avg: Math.round(avg[t] * 10) / 10, result: win === -1 ? "tie" : win === t ? "win" : "lose" }));
      rows = ids.map((id) => {
        const t = mg.teams[id], res = teams[t].result;
        const pts = res === "win" ? BD_MINI_WIN : res === "tie" && avg[0] > 0 ? BD_MINI_WIN / 2 : 0;
        if (res === "win") winners.add(id);
        return { id, s: this.mgSub[id] ?? 0, dnf: !(id in this.mgSub), team: t, rank: res === "lose" ? 2 : 1, pts, coins: pts };
      });
      rows.sort((a, b) => (a.rank - b.rank) || (a.team - b.team) || (a.dnf - b.dnf) || (b.s - a.s));
    }
    for (const r of rows) {
      mg.scores[r.id] = (mg.scores[r.id] || 0) + r.pts;
      const st = this.ps(r.id);
      st.mgRounds = (st.mgRounds || 0) + 1;
      if (winners.has(r.id) && !r.dnf) { mg.wins[r.id] = (mg.wins[r.id] || 0) + 1; st.mgWins = (st.mgWins || 0) + 1; }
    }
    mg.last = { game: mg.game, mode, teams, rows: rows.map(({ id, s, rank, pts, coins, dnf, team }) => ({ id, s, rank, pts, coins, dnf, ...(team != null ? { team } : null) })) };
    const bd = this.S.bd;
    if (bd) { // plateau : les gagnants du mini-jeu empochent des pièces
      for (const r of rows) if (r.id in bd.coins) { bd.coins[r.id] += r.coins; bd.stat.mini[r.id] = (bd.stat.mini[r.id] || 0) + r.coins; }
      this.bdTouch();
    }
    this.setPhase("mg_result", MG_RESULT_MS);
    this.broadcast();
    this.after(MG_RESULT_MS, () => this.mgAfter());
  }
  // Test d'amitié : N questions, chacune sur un joueur différent (tirage à tour de rôle).
  mgStartFriend() {
    const mg = this.S.mg;
    const ids = shuffle(this.S.players.map((p) => p.id));
    const qs = shuffle(FRIEND_QS).slice(0, MG_FRIEND_QS);
    this.mgFriend = { qs: qs.map(([text, opts], i) => ({ text, opts, subject: ids[i % ids.length] })), i: -1 };
    mg.kind = "friend"; mg.game = null; mg.last = null; mg.mode = "ffa"; mg.teams = null;
    mg.fq = { n: this.mgFriend.qs.length, i: 0 };
    this.mgAskNext();
  }
  mgAskNext() {
    const mg = this.S.mg, f = this.mgFriend;
    if (!mg || !f || this.dead) return;
    this.clearTimers();
    f.i += 1;
    if (f.i >= f.qs.length || this.S.players.length < 2) return this.mgNextRound();
    const q = f.qs[f.i];
    if (!this.player(q.subject)) q.subject = pick(this.S.players).id;
    mg.step += 1; mg.done = []; mg.fq.i = f.i + 1;
    mg.q = { text: q.text, opts: q.opts, subject: q.subject, reveal: null };
    this.mgAns = {};
    this.setPhase("mg_ask", MG_ASK_SECONDS * 1000);
    this.broadcast();
    this.after(MG_ASK_SECONDS * 1000, () => this.mgAskEnd());
    for (const b of this.S.players.filter((p) => p.bot)) {
      this.after(800 + Math.random() * (MG_ASK_SECONDS * 400), () => this.mgAnswer(b.id, mg.step, Math.floor(Math.random() * q.opts.length)));
    }
  }
  mgAnswer(id, step, i) {
    const mg = this.S.mg;
    if (this.S.phase !== "mg_ask" || !mg || !mg.q || step !== mg.step || !this.player(id) || id in this.mgAns) return;
    if (!Number.isInteger(i) || i < 0 || i >= mg.q.opts.length) return;
    this.mgAns[id] = i;
    mg.done.push(id);
    this.broadcast();
    this.mgCheckAsk();
  }
  mgCheckAsk() {
    if (this.S.phase !== "mg_ask" || !this.S.mg) return;
    if (this.S.players.every((p) => p.id in this.mgAns)) this.mgAskEnd();
  }
  mgAskEnd() {
    const mg = this.S.mg;
    if (this.S.phase !== "mg_ask" || !mg || !mg.q) return;
    this.clearTimers();
    const q = mg.q, sub = q.subject, ans = this.mgAns, voided = !(sub in ans) || !this.player(sub);
    const right = [], gain = {};
    if (!voided) {
      for (const p of this.S.players) if (p.id !== sub && ans[p.id] === ans[sub]) { right.push(p.id); gain[p.id] = MG_FRIEND_PTS; }
      if (right.length) gain[sub] = Math.min(5, right.length);
      for (const p of this.S.players) {
        if (p.id === sub) continue;
        const st = this.ps(p.id);
        st.fqTotal = (st.fqTotal || 0) + 1;
        if (right.includes(p.id)) st.fqRight = (st.fqRight || 0) + 1;
      }
    }
    for (const [id, v] of Object.entries(gain)) mg.scores[id] = (mg.scores[id] || 0) + v;
    q.reveal = { answer: voided ? null : ans[sub], picks: voided ? {} : { ...ans }, right, gain, voided };
    this.setPhase("mg_qreveal", MG_QREVEAL_MS);
    this.broadcast();
    this.after(MG_QREVEAL_MS, () => this.mgAskNext());
  }
  // Le créateur peut passer les pauses (classement, révélation).
  mgSkip(by) {
    if (by !== this.S.hostId) return;
    if (this.S.phase === "mg_result") this.mgAfter();
    else if (this.S.phase === "mg_qreveal") this.mgAskNext();
  }
  mgAfter() { if (this.S.bd) this.bdNextRound(); else this.mgNextRound(); }
  mgFinish() {
    const mg = this.S.mg;
    if (!mg) return;
    this.clearTimers();
    const rows = this.S.players.map((p) => ({ id: p.id, pts: mg.scores[p.id] || 0, wins: mg.wins[p.id] || 0 })).sort((a, b) => b.pts - a.pts || b.wins - a.wins);
    let rank = 0, prev = null;
    rows.forEach((r, i) => { if (r.pts !== prev) { rank = i + 1; prev = r.pts; } r.rank = rank; });
    mg.final = rows; mg.kind = null; mg.q = null;
    this.setPhase("mg_final", null);
    this.broadcast();
  }

  /* ------------------------------ Plateau ------------------------------ */
  // Règles « à la Mario Party » : dé de 1 à 10, case bleue +3 / rouge −3, la gemme (étoile) coûte 20 pièces et change de case,
  // la couleur de la dernière case bleue/rouge de chacun décide du mini-jeu qui suit chaque tour de table (tous pareils : chacun
  // pour soi ; 2/2 ; 1/3), le gagnant du mini-jeu empoche 10 pièces, sprint final (pièces ×2), 3 gemmes bonus en fin de partie
  // (mini-jeux, pièces, surprises), départage aux gemmes puis aux pièces puis au dé.
  startBoard() {
    this.clearTimers();
    const total = this.S.settings.bdRounds, ids = this.S.players.map((p) => p.id);
    let bag = [];
    this.mgSpare = () => { if (!bag.length) bag = shuffle(MINIGAMES.map((g) => g.id)); return bag.pop(); };
    this.mgSub = {}; this.mgAns = {}; this.bdTraps = {}; this.bdK = 0; this.bdRemain = 0; this.bdDir = 1; this.bdSuit = false;
    this.S.mg = { round: 0, total, step: 0, kind: null, game: null, seed: 0, mode: "ffa", teams: null, done: [], scores: Object.fromEntries(ids.map((id) => [id, 0])), wins: {}, last: null, q: null, fq: null, final: null };
    // ordre de jeu : chacun lance le dé, le plus haut joue en premier
    const rolls = Object.fromEntries(ids.map((id) => [id, 1 + Math.floor(Math.random() * BD_DIE)]));
    const order = shuffle(ids).sort((a, b) => rolls[b] - rolls[a]);
    this.S.bd = {
      round: 0, total, order, rolls, idx: -1, cur: null, sub: "order", spaces: BD_LAYOUT, gemAt: 0, n: 0, sprint: false, forceSprint: false,
      pos: Object.fromEntries(ids.map((id) => [id, 0])), coins: Object.fromEntries(ids.map((id) => [id, BD_START_COINS])), gems: Object.fromEntries(ids.map((id) => [id, 0])),
      items: Object.fromEntries(ids.map((id) => [id, []])), shield: {}, curse: {}, col: Object.fromEntries(ids.map((id) => [id, Math.random() < 0.5 ? 0 : 1])),
      stat: { mini: {}, peak: Object.fromEntries(ids.map((id) => [id, BD_START_COINS])), hap: {} },
      roll: null, shop: null, shopKind: null, msg: null, feed: [], final: null, bonus: null,
    };
    this.bdMoveGem();
    this.setPhase("bd_turn", null);
    this.broadcast();
    this.after(BD_ORDER_MS, () => this.bdNextRound());
  }
  bdMoveGem() {
    const bd = this.S.bd, far = [];
    for (let i = 1; i < BD_SIZE; i++) if (i !== bd.gemAt && Math.min((i - bd.gemAt + BD_SIZE) % BD_SIZE, (bd.gemAt - i + BD_SIZE) % BD_SIZE) >= 8) far.push(i);
    bd.gemAt = pick(far);
  }
  bdSay(text) {
    const bd = this.S.bd, k = (this.bdK = (this.bdK || 0) + 1);
    bd.msg = { text, k };
    bd.feed = [...(bd.feed || []), { text, k }].slice(-4);
  }
  bdName(id) { const p = this.player(id); return p ? p.name : "?"; }
  /** Met à jour le record de pièces possédées (gemme bonus « pièces »). */
  bdTouch() {
    const bd = this.S.bd;
    if (!bd) return;
    for (const id of Object.keys(bd.coins)) bd.stat.peak[id] = Math.max(bd.stat.peak[id] || 0, bd.coins[id]);
  }
  bdNextRound() {
    const bd = this.S.bd;
    if (!bd || this.dead) return;
    bd.round += 1;
    if (bd.round > bd.total) return this.bdFinish();
    const sprint = bd.forceSprint || bd.round > bd.total - bdSprintTurns(bd.total);
    if (sprint && !bd.sprint) this.bdSay("🔥 Sprint final ! Les cases bleues et rouges comptent double.");
    bd.sprint = sprint;
    bd.idx = -1;
    this.bdNextTurn();
  }
  bdNextTurn() {
    const bd = this.S.bd;
    if (!bd || this.dead) return;
    this.clearTimers();
    bd.idx += 1;
    while (bd.idx < bd.order.length && !this.player(bd.order[bd.idx])) bd.idx += 1;
    if (bd.idx >= bd.order.length) return this.bdStartMini();
    bd.cur = bd.order[bd.idx]; bd.sub = "pre"; bd.roll = null; bd.shop = null; bd.n += 1;
    this.bdSuit = false;
    this.setPhase("bd_turn", BD_PRE_SECONDS * 1000);
    this.broadcast();
    const who = bd.cur;
    this.after(BD_PRE_SECONDS * 1000, () => this.bdRoll(who, -1, null));
    if (this.player(who).bot) this.after(900 + Math.random() * 1200, () => this.bdBotTurn(who));
  }
  bdBotTurn(id) {
    const bd = this.S.bd;
    if (!bd || bd.cur !== id || bd.sub !== "pre") return;
    let item = -1, target = null;
    const inv = bd.items[id];
    if (inv.length && Math.random() < 0.55) {
      item = Math.floor(Math.random() * inv.length);
      if (ITEMS[inv[item]].target) { const o = this.S.players.filter((p) => p.id !== id); if (o.length) target = pick(o).id; else item = -1; }
    }
    this.bdRoll(id, item, target);
  }
  /** Perd des pièces (le bouclier les protège une fois). */
  bdLose(id, n, why) {
    const bd = this.S.bd;
    if (this.bdBlocked(id, why)) return 0;
    const lost = Math.min(n, bd.coins[id]);
    bd.coins[id] -= lost;
    return lost;
  }
  /** Le bouclier de `id` bloque-t-il cette attaque ? (il est alors consommé) */
  bdBlocked(id, why) {
    const bd = this.S.bd;
    if (!bd.shield[id]) return false;
    delete bd.shield[id];
    this.bdSay(`🛡️ Le bouclier de ${this.bdName(id)} bloque : ${why}`);
    return true;
  }
  bdGive(id, forced) {
    const bd = this.S.bd, it = forced || randomItem();
    if (bd.items[id].length >= BD_MAX_ITEMS) { bd.coins[id] += 2; return null; }
    bd.items[id].push(it);
    return it;
  }
  /** Camp (0 bleu, 1 rouge) de chaque joueur d'après sa dernière case colorée (remplaçable dans les tests). */
  bdColors() { const bd = this.S.bd; return Object.fromEntries(this.S.players.map((p) => [p.id, bd.col[p.id] === 1 ? 1 : 0])); }
  bdOthers(id) { return this.S.players.filter((p) => p.id !== id); }
  bdRoll(by, itemIdx, target) {
    const bd = this.S.bd;
    if (this.S.phase !== "bd_turn" || !bd || bd.sub !== "pre" || by !== bd.cur) return;
    this.clearTimers();
    const inv = bd.items[by], me = this.bdName(by), D = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    const curse = bd.curse[by]; delete bd.curse[by];
    let count = 1, lo = 1, hi = BD_DIE, used = null, lamp = false;
    if (Number.isInteger(itemIdx) && itemIdx >= 0 && itemIdx < inv.length) {
      const id = inv[itemIdx], meta = ITEMS[id], tp = this.player(target);
      if (!meta.target || (tp && target !== by)) {
        inv.splice(itemIdx, 1); used = id;
        const who = tp ? tp.name : "";
        if (id === "double") count = 2;
        else if (id === "triple") count = 3;
        else if (id === "speed") { lo = 8; hi = 10; }
        else if (id === "shield") { bd.shield[by] = true; this.bdSay(`${me} lève son bouclier 🛡️`); }
        else if (id === "trap") { this.bdTraps[bd.pos[by]] = by; this.bdSay(`${me} pose un piège 🪤`); }
        else if (id === "warp") {
          const o = this.bdOthers(by);
          if (o.length) { const t = pick(o).id; [bd.pos[by], bd.pos[t]] = [bd.pos[t], bd.pos[by]]; this.bdSay(`🌀 ${me} se téléporte à la place de ${this.bdName(t)}`); }
        }
        else if (id === "swap") { [bd.pos[by], bd.pos[target]] = [bd.pos[target], bd.pos[by]]; this.bdSay(`🔄 ${me} échange sa place avec ${who}`); }
        else if (id === "lamp") { bd.pos[by] = bd.gemAt; lamp = true; this.bdSay(`🪔 Le génie emmène ${me} jusqu'à la gemme !`); }
        else if (id === "magnet") { bd.gemAt = (bd.pos[by] + D(3, 10)) % BD_SIZE || 1; this.bdSay(`🧲 ${me} attire la gemme vers lui`); }
        else if (id === "bag") { let n = 0; while (bd.items[by].length < BD_MAX_ITEMS && n < 3) { bd.items[by].push(randomItem()); n++; } this.bdSay(`🎒 ${me} fouille son sac : ${n} objet${n > 1 ? "s" : ""}`); }
        else if (id === "poison" || id === "reverse") {
          if (!this.bdBlocked(target, "malédiction évitée")) { bd.curse[target] = id === "poison" ? "slow" : "reverse"; this.bdSay(`${ITEMS[id].emoji} ${me} jette un sort à ${who}`); }
        }
        else if (id === "thief") { const got = this.bdLose(target, 5, "vol raté"); if (got) { bd.coins[by] += got; this.bdSay(`🦹 ${me} vole ${got} pièce${got > 1 ? "s" : ""} à ${who}`); } }
        else if (id === "plunder") {
          const loot = bd.items[target];
          if (loot.length && !this.bdBlocked(target, "pillage évité")) { const k = D(0, loot.length - 1), [it] = loot.splice(k, 1); bd.items[by].push(it); this.bdSay(`🧰 ${me} pille ${ITEMS[it].emoji} ${ITEMS[it].name} chez ${who}`); }
          else if (!loot.length) this.bdSay(`🧰 ${who} n'a rien à piller`);
        }
        else if (id === "ghost") {
          if (bd.gems[target] > 0 && !this.bdBlocked(target, "fantôme repoussé")) { bd.gems[target] -= 1; bd.gems[by] += 1; this.bdSay(`👻 ${me} vole une gemme à ${who} !`); }
          else if (bd.gems[target] <= 0) this.bdSay(`👻 ${who} n'a aucune gemme`);
        }
        else if (id === "phone") { this.bdSay(`📞 ${me} appelle le Gredin chez ${who}…`); this.bdBossEffect(target); }
        else if (id === "suit") { this.bdSuit = true; this.bdSay(`🦖 ${me} enfile le costume de monstre`); }
        else if (id === "watch") { bd.forceSprint = true; bd.sprint = true; this.bdSay("⌛ Le sablier se retourne : sprint final ! Pièces ×2"); }
        else if (id === "barter") { [bd.items[by], bd.items[target]] = [bd.items[target], bd.items[by]]; this.bdSay(`🔁 ${me} troque ses objets avec ${who}`); }
      }
    }
    if (curse === "slow") { lo = 1; hi = 3; }
    const dice = lamp ? [] : Array.from({ length: count }, () => D(lo, hi));
    const steps = dice.reduce((a, b) => a + b, 0);
    this.bdDir = curse === "reverse" && !lamp ? -1 : 1;
    bd.roll = { dice, steps, bonus: 0, item: used, back: this.bdDir < 0, curse: curse || null, k: bd.n };
    bd.sub = "moving";
    if (curse) this.bdSay(curse === "slow" ? `🍄 ${me} est affaibli : dé de 1 à 3` : `↩️ ${me} doit reculer !`);
    this.setPhase("bd_turn", null);
    this.broadcast();
    this.bdRemain = steps;
    const wait = used === "swap" || used === "warp" || lamp ? BD_STEP_MS * 3 : BD_STEP_MS * 2;
    if (lamp) this.after(wait, () => (bd.coins[by] >= BD_GEM_COST ? this.bdOfferGem() : this.bdMove()));
    else this.after(wait, () => this.bdMove());
  }
  bdMove() {
    const bd = this.S.bd;
    if (!bd || bd.sub !== "moving") return;
    if (this.bdRemain <= 0) return this.bdLand();
    const id = bd.cur;
    bd.pos[id] = (bd.pos[id] + this.bdDir + BD_SIZE) % BD_SIZE;
    this.bdRemain -= 1;
    if (this.bdSuit) {
      for (const p of this.bdOthers(id)) if (bd.pos[p.id] === bd.pos[id]) {
        const got = this.bdLose(p.id, 3, "costume repoussé");
        if (got) { bd.coins[id] += got; this.bdSay(`🦖 ${this.bdName(id)} croque ${got} pièce${got > 1 ? "s" : ""} à ${p.name}`); }
      }
    }
    if (bd.pos[id] === bd.gemAt && bd.coins[id] >= BD_GEM_COST) return this.bdOfferGem();
    this.broadcast();
    this.after(BD_STEP_MS, () => this.bdMove());
  }
  bdOfferGem() {
    const bd = this.S.bd, id = bd.cur;
    bd.sub = "gem";
    this.setPhase("bd_turn", BD_CHOICE_SECONDS * 1000);
    this.broadcast();
    this.after(BD_CHOICE_SECONDS * 1000, () => this.bdGem(id, false));
    if (this.player(id).bot) this.after(700, () => this.bdGem(id, true));
  }
  bdGem(by, v) {
    const bd = this.S.bd;
    if (this.S.phase !== "bd_turn" || !bd || bd.sub !== "gem" || by !== bd.cur) return;
    this.clearTimers();
    if (v === true && bd.coins[by] >= BD_GEM_COST) {
      bd.coins[by] -= BD_GEM_COST; bd.gems[by] += 1;
      this.bdSay(`💎 ${this.bdName(by)} achète une gemme !`);
      this.bdMoveGem();
    }
    bd.sub = "moving";
    this.setPhase("bd_turn", null);
    this.broadcast();
    this.after(BD_STEP_MS, () => this.bdMove());
  }
  bdLand() {
    const bd = this.S.bd, id = bd.cur, pos = bd.pos[id], type = bd.spaces[pos], name = this.bdName(id), k = bd.sprint ? 2 : 1, c3 = BD_COLOR_COINS * k;
    bd.sub = "land";
    if (this.bdTraps[pos] && this.bdTraps[pos] !== id) {
      const owner = this.bdTraps[pos]; delete this.bdTraps[pos];
      const lost = this.bdLose(id, 6, "piège évité");
      if (lost) this.bdSay(`🪤 ${name} tombe dans le piège de ${this.bdName(owner)} : −${lost}`);
      return this.bdEnd();
    }
    if (HAPPENING.has(type)) {
      bd.stat.hap[id] = (bd.stat.hap[id] || 0) + 1;
      if (type === "event") bd.col[id] = Math.random() < 0.5 ? 0 : 1; // comme dans Mario Party : une case « ? » compte au hasard bleue ou rouge
    }
    if (type === "blue") { bd.col[id] = 0; bd.coins[id] += c3; this.bdSay(`🔵 ${name} gagne ${c3} pièces`); }
    else if (type === "red") { bd.col[id] = 1; const l = this.bdLose(id, c3, "case rouge évitée"); if (l) this.bdSay(`🔴 ${name} perd ${l} pièce${l > 1 ? "s" : ""}`); }
    else if (type === "item") { const it = this.bdGive(id); this.bdSay(it ? `🎁 ${name} trouve : ${ITEMS[it].emoji} ${ITEMS[it].name}` : `🎁 Poches pleines : ${name} reçoit 2 pièces`); }
    else if (type === "event") return this.bdEvent();
    else if (type === "chance") this.bdChance();
    else if (type === "boss") { this.bdSay(`👹 Le Gredin surgit devant ${name} !`); this.bdBossEffect(id); }
    else if (type === "shop" || type === "shop2") {
      const kind = type === "shop" ? "a" : "b", offer = shuffle(SHOP_POOL[kind]).slice(0, 4), cheapest = Math.min(...offer.map((x) => ITEMS[x].price));
      if (bd.coins[id] < cheapest || bd.items[id].length >= BD_MAX_ITEMS) { this.bdSay(`${SPACE_INFO[type].emoji} ${name} passe devant le magasin (${bd.items[id].length >= BD_MAX_ITEMS ? "poches pleines" : "pas assez de pièces"})`); return this.bdEnd(); }
      bd.shop = offer; bd.shopKind = kind; bd.sub = "shop";
      this.setPhase("bd_turn", BD_CHOICE_SECONDS * 1000);
      this.broadcast();
      this.after(BD_CHOICE_SECONDS * 1000, () => this.bdShop(id, -1));
      if (this.player(id).bot) this.after(900, () => { const aff = offer.map((x, i) => i).filter((i) => ITEMS[offer[i]].price <= bd.coins[id]); this.bdShop(id, aff.length && Math.random() < 0.7 ? pick(aff) : -1); });
      return;
    }
    this.bdEnd();
  }
  bdShop(by, i) {
    const bd = this.S.bd;
    if (this.S.phase !== "bd_turn" || !bd || bd.sub !== "shop" || by !== bd.cur) return;
    this.clearTimers();
    const it = Number.isInteger(i) && i >= 0 && i < bd.shop.length ? bd.shop[i] : null;
    if (it && bd.coins[by] >= ITEMS[it].price && bd.items[by].length < BD_MAX_ITEMS) {
      bd.coins[by] -= ITEMS[it].price; bd.items[by].push(it);
      this.bdSay(`🛒 ${this.bdName(by)} achète ${ITEMS[it].emoji} ${ITEMS[it].name}`);
    }
    bd.shop = null; bd.shopKind = null;
    this.bdEnd();
  }
  /** Roulette de la case « coup de chance ». */
  bdChance() {
    const bd = this.S.bd, id = bd.cur, name = this.bdName(id), others = this.bdOthers(id);
    const k = Math.floor(Math.random() * 5);
    if (!others.length && k < 2) { bd.coins[id] += 12; return this.bdSay(`🎰 ${name} gagne le jackpot : +12 pièces`); }
    if (k === 0) { const o = pick(others); if (!this.bdBlocked(o.id, "échange refusé")) { [bd.coins[id], bd.coins[o.id]] = [bd.coins[o.id], bd.coins[id]]; this.bdSay(`🎰 ${name} échange toutes ses pièces avec ${o.name} !`); } }
    else if (k === 1) { const rich = others.reduce((a, b) => (bd.coins[b.id] > bd.coins[a.id] ? b : a)); const got = this.bdLose(rich.id, 8, "vol évité"); if (got) { bd.coins[id] += got; this.bdSay(`🎰 ${name} reçoit ${got} pièces de ${rich.name}, le plus riche`); } }
    else if (k === 2) { bd.coins[id] += 12; this.bdSay(`🎰 Jackpot : ${name} gagne 12 pièces !`); }
    else if (k === 3) { const poor = others.length ? others.reduce((a, b) => (bd.coins[b.id] < bd.coins[a.id] ? b : a)) : null; const given = Math.min(5, bd.coins[id]); if (poor && given) { bd.coins[id] -= given; bd.coins[poor.id] += given; this.bdSay(`🎰 ${name} offre ${given} pièces à ${poor.name}, le plus pauvre`); } else this.bdSay("🎰 Rien de spécial…"); }
    else { const it = this.bdGive(id); this.bdSay(it ? `🎰 Un objet pour ${name} : ${ITEMS[it].emoji} ${ITEMS[it].name}` : `🎰 Poches pleines : ${name} reçoit 2 pièces`); }
  }
  /** Événement du Gredin (case ou téléphone) sur le joueur `id`. */
  bdBossEffect(id) {
    const bd = this.S.bd, name = this.bdName(id), r = Math.random();
    if (r < 0.4) { const l = this.bdLose(id, 10, "le Gredin repart bredouille"); if (l) this.bdSay(`👹 Le Gredin vole ${l} pièces à ${name} !`); }
    else if (r < 0.6) {
      const all = this.S.players.map((p) => p.id), tot = all.reduce((a, x) => a + bd.coins[x], 0), each = Math.floor(tot / all.length);
      for (const x of all) bd.coins[x] = each;
      this.bdSay(`👹 Le Gredin redistribue tout : ${each} pièces pour chacun !`);
    }
    else if (r < 0.8) { bd.coins[id] += 6; this.bdSay(`👹 Le Gredin est de bonne humeur : +6 pièces pour ${name}`); }
    else if (bd.items[id].length) { if (!this.bdBlocked(id, "confiscation évitée")) { const n = bd.items[id].length; bd.items[id] = []; this.bdSay(`👹 Le Gredin confisque ${n} objet${n > 1 ? "s" : ""} à ${name} !`); } }
    else { bd.coins[id] += 4; this.bdSay(`👹 Le Gredin n'a rien à confisquer à ${name} et lui laisse 4 pièces`); }
  }
  bdEvent() {
    const bd = this.S.bd, id = bd.cur, name = this.bdName(id), all = this.S.players.map((p) => p.id);
    const k = Math.floor(Math.random() * 7);
    if (k === 0) { bd.coins[id] += 8; this.bdSay(`❓ ${name} trouve un trésor : +8 pièces`); }
    else if (k === 1) { const l = this.bdLose(id, 5, "mauvaise surprise évitée"); if (l) this.bdSay(`❓ ${name} se fait dévaliser : −${l} pièces`); }
    else if (k === 2) { for (const x of all) bd.coins[x] += 3; this.bdSay("❓ Pluie de pièces : tout le monde gagne 3 pièces !"); }
    else if (k === 3) { const it = this.bdGive(id); this.bdSay(it ? `❓ Un objet tombe du ciel : ${ITEMS[it].emoji} ${ITEMS[it].name}` : "❓ Poches pleines : +2 pièces"); }
    else if (k === 4) { bd.pos[id] = (bd.pos[id] + 3) % BD_SIZE; this.bdSay(`❓ Un coup de vent pousse ${name} de 3 cases !`); }
    else if (k === 5) { bd.pos[id] = (bd.pos[id] + BD_SIZE - 2) % BD_SIZE; this.bdSay(`❓ ${name} trébuche : recule de 2 cases`); }
    else {
      const last = all.reduce((a, b) => (bd.coins[b] < bd.coins[a] ? b : a), all[0]);
      bd.coins[last] += 8; this.bdSay(`❓ Coup de pouce : ${this.bdName(last)} (dernier) gagne 8 pièces`);
    }
    this.bdEnd();
  }
  bdEnd() {
    const bd = this.S.bd;
    bd.sub = "end";
    this.bdTouch();
    this.setPhase("bd_turn", null);
    this.broadcast();
    this.after(BD_END_MS, () => this.bdNextTurn());
  }
  bdStartMini() {
    const bd = this.S.bd, mg = this.S.mg;
    bd.cur = null; bd.sub = "mini";
    mg.round = bd.round; mg.total = bd.total;
    this.mgSetup(this.mgSpare(), this.bdColors()); // la couleur de chacun décide du mode
  }
  bdFinish() {
    const bd = this.S.bd;
    if (!bd) return;
    this.clearTimers();
    this.bdTouch();
    const ids = this.S.players.map((p) => p.id);
    // gemmes bonus (comme les étoiles bonus) : celui qui a le plus de… en reçoit une (égalité : chacun la sienne ; rien si personne n'a rien fait)
    const best = (map) => { const v = Math.max(0, ...ids.map((id) => map[id] || 0)); return v > 0 ? { v, ids: ids.filter((id) => (map[id] || 0) === v) } : { v: 0, ids: [] }; };
    const bonus = ids.length < 2 ? [] : [
      { key: "mini", emoji: "🎮", name: "Gemme des mini-jeux", desc: "le plus de pièces gagnées en mini-jeux", ...best(bd.stat.mini) },
      { key: "coins", emoji: "🪙", name: "Gemme de la fortune", desc: "le plus de pièces possédées à un moment", ...best(bd.stat.peak) },
      { key: "hap", emoji: "❓", name: "Gemme des surprises", desc: "le plus de cases « ? », chance et Gredin", ...best(bd.stat.hap) },
    ];
    for (const b of bonus) for (const id of b.ids) bd.gems[id] += 1;
    bd.bonus = bonus;
    // classement : gemmes, puis pièces, puis dé (jamais d'égalité)
    const rows = ids.map((id) => ({ id, gems: bd.gems[id] || 0, coins: bd.coins[id] || 0 })).sort((a, b) => b.gems - a.gems || b.coins - a.coins);
    for (let i = 0; i < rows.length;) {
      let j = i + 1;
      while (j < rows.length && rows[j].gems === rows[i].gems && rows[j].coins === rows[i].coins) j++;
      if (j - i > 1) {
        const grp = rows.slice(i, j);
        for (let t = 0; t < 30; t++) { grp.forEach((r) => (r.tb = 1 + Math.floor(Math.random() * BD_DIE))); if (new Set(grp.map((r) => r.tb)).size === grp.length) break; }
        if (new Set(grp.map((r) => r.tb)).size < grp.length) grp.forEach((r, x) => (r.tb = 100 - x));
        grp.sort((a, b) => b.tb - a.tb);
        grp.forEach((r, x) => (rows[i + x] = r));
      }
      i = j;
    }
    rows.forEach((r, i) => { r.rank = i + 1; });
    bd.final = rows; bd.sub = "final"; bd.cur = null;
    this.setPhase("bd_final", null);
    this.broadcast();
  }

  /* ------------------------------ Qui est-ce ? ------------------------------ */
  // Une image s'affiche pour tout le monde en même temps ; en maintenant l'écran 3 s on déclare "j'ai trouvé".
  // Classement = ordre d'arrivée des déclarations ; points = nb de joueurs - rang + 1 ; les autres 0.
  startQuiEst() {
    this.clearTimers();
    this.qeUsed = new Set();
    this.qeToken = 0; this.qePicks = {};
    this.S.qe = { round: 0, total: this.S.settings.rounds, t: {}, order: [], gain: {}, scores: Object.fromEntries(this.S.players.map((p) => [p.id, 0])) };
    this.nextRound();
  }
  // Chaque équipe a SA propre image (et pas forcément le même thème que les autres équipes).
  qeTeams() { return [...new Set(this.S.players.map((p) => p.team))].sort((a, b) => a - b); }
  nextRound() {
    const qe = this.S.qe;
    if (qe.round >= qe.total) return this.finishQuiEst();
    qe.round += 1;
    Object.assign(qe, { t: {}, order: [], gain: {}, pick: null });
    this.qeCards = {}; this.qeCats = {}; this.qeResolved = false; this.qePicks = {};
    if (this.S.settings.qeMode === "choose" && this.qeTeams().length >= 2) return this.startPick();
    this.beginTap();
  }
  beginTap() {
    const qe = this.S.qe;
    qe.pick = null;
    this.resetReady();
    this.setPhase("qe_tap", QE_TAP_SECONDS * 1000);
    this.broadcast();
    this.after(QE_TAP_SECONDS * 1000, () => this.startCount(true));
    this.S.players.filter((p) => p.bot).forEach((b) => this.after(1200 + Math.random() * 3500, () => this.setReady(b.id, true)));
    this.resolveCard(++this.qeToken);
  }
  // Mode « choisi par un adversaire » : avant chaque image, une équipe choisit la catégorie de la suivante (cycle tiré au hasard à chaque
  // manche : à 2 équipes A choisit pour B et B pour A). Dans l'équipe qui choisit, un joueur tiré au hasard s'en charge.
  startPick() {
    const teams = shuffle(this.qeTeams());
    const pairs = teams.map((team, i) => {
      const from = teams[(i + teams.length - 1) % teams.length];
      return { picker: pick(this.S.players.filter((p) => p.team === from)).id, team };
    });
    this.S.qe.pick = { pairs, done: [] };
    this.resetReady();
    this.setPhase("qe_pick", QE_PICK_SECONDS * 1000);
    this.broadcast();
    this.after(QE_PICK_SECONDS * 1000, () => this.endPick());
    const ids = [...CATEGORIES.map((c) => c.id), "mixtes"];
    for (const pr of pairs) if (this.player(pr.picker).bot) this.after(800 + Math.random() * 3000, () => this.qePick(pr.picker, pick(ids)));
  }
  qePick(id, cat) {
    const qe = this.S.qe, pk = qe && qe.pick;
    if (this.S.phase !== "qe_pick" || !pk || !this.player(id) || pk.done.includes(id)) return;
    const pair = pk.pairs.find((x) => x.picker === id);
    if (!pair || !(cat === "mixtes" || CATEGORIES.some((c) => c.id === cat))) return;
    this.qePicks[pair.team] = { cat, by: id };
    pk.done.push(id);
    this.broadcast();
    this.checkPick();
  }
  checkPick() {
    const pk = this.S.phase === "qe_pick" && this.S.qe.pick;
    if (pk && pk.pairs.every((x) => pk.done.includes(x.picker) || !this.player(x.picker))) this.endPick();
  }
  endPick() {
    if (this.S.phase !== "qe_pick") return;
    this.clearTimers();
    for (const { team } of this.S.qe.pick.pairs) if (!this.qePicks[team]) this.qePicks[team] = { cat: "random", by: null }; // pas de choix : au hasard
    this.beginTap();
  }
  // Tirage de n cartes pour une équipe selon le mode (catégorie choisie par l'adversaire, tout au hasard, ou mixte équilibré).
  qeDraw(team, n) {
    const pk = this.qePicks && this.qePicks[team];
    if (pk) return drawPack(pk.cat, this.qeUsed, n);
    return drawPack("mixtes", this.qeUsed, n, this.S.settings.qeMode === "all" ? { flat: true } : {});
  }
  // Pendant que les joueurs touchent l'écran, on cherche (sur Wikipédia) pour chaque équipe une carte tirée au hasard qui a une image.
  async resolveCard(token) {
    const teams = this.qeTeams();
    const per = teams.map((team) => {
      const drawn = this.qeDraw(team, 8).cards;
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
        const drawn = this.qeDraw(team, 1).cards;
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
        title: chosen.name, // le nom est toujours affiché avec l'image (sans le nom, c'était trop dur)
        why: okUrl ? "" : (why || (hit ? "none" : "")), // "network" = Wikipédia injoignable, "none" = pas d'image pour ces cartes
        answer: null, cat: null,
        by: (this.qePicks && this.qePicks[team] && this.qePicks[team].by) || null, // qui a choisi la catégorie (mode adversaire)
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
      case "place": return this.tlPlace(from, msg.slot);
      case "tlnext": return this.tlSkip(from);
      case "mgscore": return this.mgSubmit(from, msg.step, msg.s);
      case "mgans": return this.mgAnswer(from, msg.step, msg.i);
      case "mgnext": return this.mgSkip(from);
      case "ccguess": return this.ccGuess(from, msg.text);
      case "ccnext": return this.ccNext(from);
      case "pbans": return this.pbAnswers(from, msg.a);
      case "pbstop": return this.pbStop(from);
      case "pbrej": return this.pbReject(from, msg.c, msg.p, msg.v);
      case "pbok": return this.pbOk(from);
      case "pbnext": return this.pbNext(from);
      case "bdroll": return this.bdRoll(from, msg.item, msg.target);
      case "bdgem": return this.bdGem(from, msg.v);
      case "bdshop": return this.bdShop(from, msg.i);
      case "found": return this.found(from);
      case "qepick": return this.qePick(from, msg.cat);
      case "begin": return this.begin(from);
      case "swipe": return this.swipe(from, msg.cardId, msg.ok, msg.seq);
      case "imgfail": return this.imageFailed(from);
      case "quit": return this.quitVote(from, msg.v);
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
    case "leave": case "btnext": case "tlnext": case "mgnext": case "pbstop": case "ccnext": case "pbok": case "pbnext": case "found": case "begin": case "imgfail": case "who": return { t: m.t };
    case "setTeam": return Number.isInteger(m.team) && m.team >= 0 && m.team < 8 ? { t: "setTeam", team: m.team } : null;
    case "vote": { const slots = Array.isArray(m.slots) && m.slots.length <= 5 ? m.slots.map((x) => str(x, 20)) : null; return slots ? { t: "vote", slots } : null; }
    case "place": return Number.isInteger(m.slot) && m.slot >= 0 && m.slot <= 60 ? { t: "place", slot: m.slot } : null;
    case "mgscore": return Number.isInteger(m.step) && m.step >= 0 && m.step < 1e6 && Number.isFinite(m.s) ? { t: "mgscore", step: m.step, s: Math.max(0, Math.min(1e6, Math.round(m.s))) } : null;
    case "mgans": return Number.isInteger(m.step) && m.step >= 0 && m.step < 1e6 && Number.isInteger(m.i) && m.i >= 0 && m.i < 6 ? { t: "mgans", step: m.step, i: m.i } : null;
    case "bdroll": return { t: "bdroll", item: Number.isInteger(m.item) && m.item >= -1 && m.item < 4 ? m.item : -1, target: str(m.target, 32) };
    case "ccguess": return typeof m.text === "string" ? { t: "ccguess", text: m.text.slice(0, 80) } : null;
    case "pbans": { const a = strList(m.a, 8, 60); return a ? { t: "pbans", a } : null; }
    case "pbrej": return Number.isInteger(m.c) && m.c >= 0 && m.c < 8 && str(m.p, 32) !== null && typeof m.v === "boolean" ? { t: "pbrej", c: m.c, p: m.p, v: m.v } : null;
    case "qepick": return str(m.cat, 20) !== null && m.cat ? { t: "qepick", cat: m.cat } : null;
    case "bdgem": return typeof m.v === "boolean" ? { t: "bdgem", v: m.v } : null;
    case "bdshop": return Number.isInteger(m.i) && m.i >= -1 && m.i < 4 ? { t: "bdshop", i: m.i } : null;
    case "quit": return m.v === "start" || m.v === "yes" || m.v === "no" ? { t: "quit", v: m.v } : null;
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
