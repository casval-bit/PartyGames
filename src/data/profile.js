// Profil du joueur : avatar, bordure, couleur, niveau, statistiques et succès.
// Calculé sur le téléphone (lib/profileStore.js) ; connecté par e-mail, il est aussi sauvegardé sur le compte (lib/useAccount.js).
// Ce module est « pur » (pas de DOM) pour pouvoir être testé avec Node : node tools/test-profile.js

/* ------------------------------ catalogues ------------------------------ */
// rule : null = gratuit · { lv } = niveau minimum · { ach } = succès à obtenir
const lv = (n) => ({ lv: n });
const ach = (id) => ({ ach: id });

// Icônes 24×24, une seule forme remplie (fill-rule evenodd : les « trous » sont dans le tracé).
export const AVATARS = [
  { id: "smile", name: "Sourire", rule: null, d: "M12 2a10 10 0 1 0 .01 0zM8.300 8.200a1.400 1.400 0 1 0 .01 0zM15.700 8.200a1.400 1.400 0 1 0 .01 0zM6.800 13.500h10.400a5.200 5.200 0 0 1-10.400 0z" },
  { id: "note", name: "Note", rule: null, d: "M12 3v10.600A4 4 0 1 0 14 17V7h4V3z" },
  { id: "star", name: "Étoile", rule: null, d: "M12 2l2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L12 17.800l-6.100 3.600 1.400-6.800L2.200 9.100l6.900-.8z" },
  { id: "bolt", name: "Éclair", rule: null, d: "M13 2L4 14h6l-1 8 9-12h-6z" },
  { id: "heart", name: "Cœur", rule: null, d: "M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11z" },
  { id: "dice", name: "Dé", rule: null, d: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 6.600a1.400 1.400 0 1 0 .01 0zM16 6.600a1.400 1.400 0 1 0 .01 0zM12 10.600a1.400 1.400 0 1 0 .01 0zM8 14.600a1.400 1.400 0 1 0 .01 0zM16 14.600a1.400 1.400 0 1 0 .01 0z" },
  { id: "flame", name: "Flamme", rule: lv(2), d: "M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z" },
  { id: "moon", name: "Lune", rule: lv(3), d: "M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z" },
  { id: "headphones", name: "Casque", rule: lv(4), d: "M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z" },
  { id: "ghost", name: "Fantôme", rule: lv(5), d: "M12 2a8 8 0 0 0-8 8v12l3-2.500L9.500 22 12 19.500 14.500 22 17 19.500 20 22V10a8 8 0 0 0-8-8zM9.500 8.200a1.600 1.600 0 1 0 .01 0zM14.500 8.200a1.600 1.600 0 1 0 .01 0z" },
  { id: "cat", name: "Chat", rule: lv(6), d: "M4 3l5 3.500h6L20 3v10a8 8 0 0 1-16 0zM8.500 11a1.300 1.300 0 1 0 .01 0zM15.500 11a1.300 1.300 0 1 0 .01 0zM10.500 14.500h3L12 16z" },
  { id: "sun", name: "Soleil", rule: lv(7), d: "M12 7a5 5 0 1 0 .01 0zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.200 5.600l1.400-1.400 2.100 2.100-1.400 1.400zM16.300 6.300l2.100-2.100 1.400 1.400-2.100 2.100zM4.200 18.400l2.100-2.100 1.400 1.400-2.100 2.100zM16.300 17.700l1.400-1.400 2.100 2.100-1.400 1.400z" },
  { id: "leaf", name: "Feuille", rule: lv(8), d: "M20 4C11 4 5 8.500 5 15c0 1.500.4 2.800 1 4 3-5 6.500-8 11-10-4 3-6 7-7 11 7 0 10-7 10-16z" },
  { id: "spade", name: "Pique", rule: lv(9), d: "M12 2C8 8 3 10 3 14.500a4.500 4.500 0 0 0 7.500 3.300L9.500 22h5l-1-4.200A4.500 4.500 0 0 0 21 14.500C21 10 16 8 12 2z" },
  { id: "vinyl", name: "Vinyle", rule: lv(10), d: "M12 2a10 10 0 1 0 .01 0zM12 8a4 4 0 1 1-.01 0zM12 11a1 1 0 1 0 .01 0z" },
  { id: "robot", name: "Robot", rule: lv(12), d: "M11 2h2v3h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5zM8.500 9a1.600 1.600 0 1 0 .01 0zM15.500 9a1.600 1.600 0 1 0 .01 0zM8 14.500h8v2H8z" },
  { id: "rocket", name: "Fusée", rule: lv(14), d: "M12 2c3 2 5 6 5 10l2 3v3l-3-1-2 2h-4l-2-2-3 1v-3l2-3c0-4 2-8 5-10zM12 7.500a2 2 0 1 0 .01 0z" },
  { id: "gem", name: "Gemme", rule: lv(16), d: "M6 3h12l4 6-10 13L2 9z" },
  { id: "mic", name: "Micro", rule: lv(18), d: "M12 2a3.500 3.500 0 0 0-3.500 3.500v6a3.500 3.500 0 0 0 7 0v-6A3.500 3.500 0 0 0 12 2zM5 11a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0zM11 18h2v3h-2zM8 21h8v1.500H8z" },
  { id: "crown", name: "Couronne", rule: lv(20), d: "M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z" },
  { id: "trophy", name: "Trophée", rule: ach("wins5"), d: "M7 3h10v5a5 5 0 0 1-10 0zM5 4H2v2a4 4 0 0 0 4 4zM19 4h3v2a4 4 0 0 1-4 4zM11 13h2v4h3v3H8v-3h3z" },
  { id: "eq", name: "Égaliseur", rule: ach("btSongs20"), d: "M3 9h3v6H3zM8 5h3v14H8zM13 8h3v8h-3zM18 11h3v2h-3z" },
  { id: "eye", name: "Œil de lynx", rule: ach("qeFirst10"), d: "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zM12 8a4 4 0 1 1-.01 0zM12 10.200a1.800 1.800 0 1 0 .01 0z" },
  { id: "hourglass", name: "Sablier", rule: ach("tuCards50"), d: "M6 2h12v2c0 4-4 5-4 8s4 4 4 8v2H6v-2c0-4 4-5 4-8S6 8 6 4z" },
  { id: "skull", name: "Crâne", rule: ach("streak3"), d: "M12 2a8 8 0 0 0-8 8c0 2.800 1.400 4.500 3 5.500V20h3v-2h4v2h3v-4.500c1.600-1 3-2.700 3-5.500a8 8 0 0 0-8-8zM9 9.200a1.800 1.800 0 1 0 .01 0zM15 9.200a1.800 1.800 0 1 0 .01 0z" },
];

// Bordures : rendues en CSS (classe .b-<id> dans styles.css).
export const BORDERS = [
  { id: "plain", name: "Simple", rule: null },
  { id: "double", name: "Double filet", rule: lv(2) },
  { id: "dash", name: "Pointillés", rule: lv(3) },
  { id: "neon", name: "Néon", rule: lv(5) },
  { id: "aurora", name: "Aurore", rule: lv(8) },
  { id: "royal", name: "Royale", rule: lv(15) },
  { id: "gold", name: "Or massif", rule: ach("wins25") },
  { id: "ember", name: "Braise", rule: ach("streak5") },
  { id: "holo", name: "Holographique", rule: ach("bonus3") },
  { id: "electric", name: "Électrique", rule: ach("btFast") },
];

export const COLORS = [
  { id: "violet", name: "Violet", bg: "#8b5cf6", ink: "#ffffff", rule: null },
  { id: "coral", name: "Corail", bg: "#ff6b5e", ink: "#2a0d0a", rule: null },
  { id: "mint", name: "Menthe", bg: "#2dd4a7", ink: "#04231a", rule: null },
  { id: "sky", name: "Ciel", bg: "#38bdf8", ink: "#04202e", rule: null },
  { id: "sun", name: "Soleil", bg: "#fbbf24", ink: "#2b1d00", rule: null },
  { id: "rose", name: "Rose", bg: "#f472b6", ink: "#33071c", rule: lv(2) },
  { id: "lime", name: "Citron vert", bg: "#a3e635", ink: "#1c2a03", rule: lv(4) },
  { id: "ocean", name: "Océan", bg: "linear-gradient(135deg,#06b6d4,#3b82f6 60%,#6366f1)", ink: "#ffffff", rule: lv(6) },
  { id: "ember", name: "Brasier", bg: "linear-gradient(135deg,#f97316,#ef4444 60%,#be123c)", ink: "#ffffff", rule: lv(9) },
  { id: "grape", name: "Raisin", bg: "linear-gradient(135deg,#a855f7,#6d28d9 60%,#312e81)", ink: "#ffffff", rule: lv(11) },
  { id: "aurora", name: "Aurore", bg: "linear-gradient(135deg,#34d399,#22d3ee 50%,#a78bfa)", ink: "#06202a", rule: lv(13) },
  { id: "mono", name: "Encre", bg: "linear-gradient(135deg,#27213a,#0f0b1a)", ink: "#f3e9c6", rule: lv(17) },
  { id: "candy", name: "Barbe à papa", bg: "linear-gradient(135deg,#f9a8d4,#c4b5fd 50%,#93c5fd)", ink: "#2d1b4e", rule: lv(20) },
  { id: "sunset", name: "Crépuscule", bg: "linear-gradient(160deg,#fde047,#fb923c 40%,#e11d48 80%,#6d28d9)", ink: "#ffffff", rule: ach("btStreak5") },
  { id: "galaxy", name: "Galaxie", bg: "radial-gradient(circle at 30% 25%,#7c3aed,#1e1b4b 65%,#020617)", ink: "#fde68a", rule: ach("allgames") },
  { id: "gold", name: "Or", bg: "linear-gradient(135deg,#fde68a,#f59e0b 50%,#b45309)", ink: "#3a2500", rule: ach("btPerfect") },
];

export const DEFAULT_LOOK = { a: "smile", b: "plain", c: "violet" };
const ID = (list) => new Set(list.map((x) => x.id));
const AV_IDS = ID(AVATARS), BD_IDS = ID(BORDERS), CO_IDS = ID(COLORS);
export const AV_BY = Object.fromEntries(AVATARS.map((x) => [x.id, x]));
export const BD_BY = Object.fromEntries(BORDERS.map((x) => [x.id, x]));
export const CO_BY = Object.fromEntries(COLORS.map((x) => [x.id, x]));

/** Apparence reçue du réseau : seuls des identifiants du catalogue sont acceptés (rien d'autre n'est jamais affiché). */
export function cleanLook(l) {
  const o = l && typeof l === "object" ? l : {};
  const n = Number.isInteger(o.lv) ? Math.max(1, Math.min(99, o.lv)) : 1;
  return {
    a: typeof o.a === "string" && AV_IDS.has(o.a) ? o.a : DEFAULT_LOOK.a,
    b: typeof o.b === "string" && BD_IDS.has(o.b) ? o.b : DEFAULT_LOOK.b,
    c: typeof o.c === "string" && CO_IDS.has(o.c) ? o.c : DEFAULT_LOOK.c,
    lv: n,
  };
}
/** Apparence aléatoire parmi les éléments gratuits (bots de test). */
export function randomFreeLook(rnd = Math.random) {
  const free = (l) => l.filter((x) => !x.rule);
  const p = (l) => free(l)[(rnd() * free(l).length) | 0].id;
  return { a: p(AVATARS), b: p(BORDERS), c: p(COLORS), lv: 1 + ((rnd() * 4) | 0) };
}

/* -------------------------------- niveaux -------------------------------- */
export const MAX_LEVEL = 50;
export const xpToNext = (n) => 100 + 30 * (n - 1);                     // XP à gagner pour passer du niveau n au suivant
export const xpAt = (L) => 100 * (L - 1) + 15 * (L - 1) * (L - 2);     // XP total nécessaire pour atteindre le niveau L
export function levelOf(xp) {
  let L = 1;
  while (L < MAX_LEVEL && xp >= xpAt(L + 1)) L++;
  return L;
}
export function progressOf(xp) {
  const L = levelOf(xp);
  if (L >= MAX_LEVEL) return { lv: L, into: 1, need: 1, max: true };
  return { lv: L, into: xp - xpAt(L), need: xpToNext(L), max: false };
}

/* --------------------------------- succès --------------------------------- */
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
export const ACHIEVEMENTS = [
  { id: "first", name: "Baptême du feu", desc: "Terminer une partie", xp: 20, prog: (s) => [s.played, 1] },
  { id: "games10", name: "Habitué", desc: "Terminer 10 parties", xp: 40, prog: (s) => [s.played, 10] },
  { id: "games50", name: "Marathonien", desc: "Terminer 50 parties", xp: 120, prog: (s) => [s.played, 50] },
  { id: "allgames", name: "Touche-à-tout", desc: "Jouer à trois jeux différents", xp: 50, prog: (s) => [Object.values(s.byGame).filter((g) => g.p > 0).length, 3] },
  { id: "wins5", name: "Habitué des podiums", desc: "Gagner 5 parties", xp: 50, prog: (s) => [s.wins, 5] },
  { id: "wins25", name: "Légende du salon", desc: "Gagner 25 parties", xp: 150, prog: (s) => [s.wins, 25] },
  { id: "streak3", name: "Série de 3", desc: "Gagner 3 parties d'affilée", xp: 60, prog: (s) => [s.bestWinStreak, 3] },
  { id: "streak5", name: "Imbattable", desc: "Gagner 5 parties d'affilée", xp: 120, prog: (s) => [s.bestWinStreak, 5] },
  { id: "btSongs20", name: "Oreille d'or", desc: "Trouver 20 morceaux en entier (blind test)", xp: 60, prog: (s) => [s.bt.full, 20] },
  { id: "btFast", name: "Éclair", desc: "Trouver titre + artiste en moins de 4 s (blind test)", xp: 60, prog: (s) => [s.bt.fastest != null && s.bt.fastest <= 4000 ? 1 : 0, 1] },
  { id: "btStreak5", name: "Sur une lancée", desc: "Série de 5 morceaux trouvés d'affilée (blind test)", xp: 80, prog: (s) => [s.bt.bestStreak, 5] },
  { id: "btPerfect", name: "Sans faute", desc: "Trouver tous les morceaux d'une partie de 5+ (blind test)", xp: 100, prog: (s) => [s.bt.perfect, 1] },
  { id: "qeFirst10", name: "Œil de lynx", desc: "Être le premier à trouver 10 fois (Qui est-ce ?)", xp: 70, prog: (s) => [s.qe.firsts, 10] },
  { id: "tuCards50", name: "Maître des mimes", desc: "Faire deviner 50 cartes (Time's Up)", xp: 70, prog: (s) => [s.tu.cards, 50] },
  { id: "bonus3", name: "Joueur de bonus", desc: "Jouer 3 parties en mode Bonus", xp: 50, prog: (s) => [s.tu.bonusGames, 3] },
];
export const ACH_BY = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/* ---------------------------------- profil ---------------------------------- */
const zero = () => ({ p: 0, w: 0, l: 0, d: 0, pts: 0, best: 0 });
export const emptyStats = () => ({
  played: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestWinStreak: 0,
  byGame: { timesup: zero(), quiest: zero(), blindtest: zero(), timeline: zero() },
  tu: { cards: 0, passes: 0, turns: 0, bonusGames: 0 },
  qe: { rounds: 0, found: 0, firsts: 0, msSum: 0, msN: 0, fastest: null },
  bt: { songs: 0, full: 0, half: 0, msSum: 0, msN: 0, fastest: null, bestStreak: 0, perfect: 0 },
  tl: { turns: 0, hits: 0 },
});
export const emptyProfile = () => ({ v: 1, look: { ...DEFAULT_LOOK }, xp: 0, stats: emptyStats(), ach: {}, history: [], seen: [] });

/** Remet un profil lu du stockage dans une forme valide (champs manquants, valeurs étranges). */
export function normalizeProfile(raw) {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const num = (v) => (Number.isFinite(v) ? v : 0);
  const merge = (a, b) => { for (const k of Object.keys(a)) if (b && typeof a[k] === "number") a[k] = num(b[k]); else if (b && (a[k] === null)) a[k] = Number.isFinite(b[k]) ? b[k] : null; return a; };
  const st = raw.stats || {};
  merge(base.stats, st);
  for (const g of Object.keys(base.stats.byGame)) merge(base.stats.byGame[g], (st.byGame || {})[g]);
  for (const k of ["tu", "qe", "bt", "tl"]) merge(base.stats[k], st[k]);
  base.xp = Math.max(0, num(raw.xp));
  base.look = { ...DEFAULT_LOOK, ...cleanLook(raw.look) }; delete base.look.lv;
  base.ach = raw.ach && typeof raw.ach === "object" ? Object.fromEntries(Object.entries(raw.ach).filter(([k]) => ACH_BY[k])) : {};
  base.history = Array.isArray(raw.history) ? raw.history.slice(0, 30) : [];
  base.seen = Array.isArray(raw.seen) ? raw.seen.filter((x) => typeof x === "string").slice(0, 40) : [];
  return base;
}

export const isUnlocked = (p, rule) => !rule || (rule.lv ? levelOf(p.xp) >= rule.lv : Boolean(p.ach[rule.ach]));
export function ruleText(rule) {
  if (!rule) return "Débloqué";
  return rule.lv ? `Niveau ${rule.lv}` : `Succès « ${ACH_BY[rule.ach].name} »`;
}
const allItems = () => [
  ...AVATARS.map((x) => ({ kind: "avatar", ...x })), ...BORDERS.map((x) => ({ kind: "border", ...x })), ...COLORS.map((x) => ({ kind: "color", ...x })),
];
const unlockedKeys = (p) => new Set(allItems().filter((i) => isUnlocked(p, i.rule)).map((i) => i.kind + ":" + i.id));

/** Les éléments débloqués par un succès (pour l'afficher dans la liste des succès). */
export const rewardsOf = (achId) => allItems().filter((i) => i.rule && i.rule.ach === achId);

/** Remet l'apparence choisie dans les éléments réellement débloqués. */
export function fixLook(p) {
  const L = { ...p.look };
  if (!isUnlocked(p, AV_BY[L.a]?.rule)) L.a = DEFAULT_LOOK.a;
  if (!isUnlocked(p, BD_BY[L.b]?.rule)) L.b = DEFAULT_LOOK.b;
  if (!isUnlocked(p, CO_BY[L.c]?.rule)) L.c = DEFAULT_LOOK.c;
  return L;
}

/* ------------------------ résumé d'une partie terminée ------------------------ */
const rankOf = (rows, key) => {
  const mine = rows.find((r) => r.key === key);
  if (!mine) return null;
  const better = rows.filter((r) => r.pts > mine.pts).length;
  const tiedTop = better === 0 && rows.some((r) => r !== mine && r.pts === mine.pts);
  return { rank: better + 1, of: rows.length, pts: mine.pts, result: rows.length < 2 ? "solo" : better === 0 ? (tiedTop ? "draw" : "win") : "loss" };
};

/**
 * Transforme l'état final d'une partie (room) en résumé pour CE joueur. Renvoie null si ce n'est pas une fin de partie.
 * `room.pstats[id]` = statistiques détaillées tenues par le créateur du lobby.
 */
export function summarize(room, meId) {
  if (!room || !meId) return null;
  const me = room.players.find((p) => p.id === meId);
  if (!me) return null;
  const ps = (room.pstats && room.pstats[meId]) || {};
  const key = `${room.id}:${room.gameNo || 0}`;
  if (room.phase === "done" && room.tu) {
    const teams = [...new Set(room.players.map((p) => p.team))];
    const r = rankOf(teams.map((t) => ({ key: "t" + t, pts: room.tu.teamScores[t] || 0 })), "t" + me.team);
    return { key, game: "timesup", bonus: room.settings.variant === "bonus", ...r, tu: { cards: ps.found || 0, passes: ps.passed || 0, turns: ps.turns || 0 } };
  }
  if (room.phase === "qe_final" && room.qe) {
    const r = rankOf(room.players.map((p) => ({ key: p.id, pts: room.qe.scores[p.id] || 0 })), meId);
    return { key, game: "quiest", ...r, qe: { rounds: ps.rounds || 0, found: ps.found || 0, firsts: ps.firsts || 0, msSum: ps.msSum || 0, msN: ps.msN || 0, fastest: ps.fastest ?? null } };
  }
  if (room.phase === "bt_final" && room.bt) {
    const bt = room.bt, sc = bt.scores || {};
    let rows;
    if (!bt.teams) rows = room.players.map((p) => ({ key: p.id, pts: sc[p.id] || 0 }));
    else {
      const teams = [...new Set(room.players.map((p) => p.team))];
      rows = teams.map((t) => ({ key: "t" + t, pts: bt.scoring === "shared" ? sc["t" + t] || 0 : room.players.filter((p) => p.team === t).reduce((s, p) => s + (sc[p.id] || 0), 0) }));
    }
    const r = rankOf(rows, bt.teams ? "t" + me.team : meId);
    return { key, game: "blindtest", teams: Boolean(bt.teams), ...r,
      bt: { songs: ps.songs || 0, full: ps.full || 0, half: ps.half || 0, msSum: ps.msSum || 0, msN: ps.msN || 0, fastest: ps.fastest ?? null, bestStreak: ps.bestStreak || 0 } };
  }
  if (room.phase === "tl_final" && room.tl) {
    const tl = room.tl;
    const teams = [...new Set(room.players.map((p) => p.team))];
    const r = rankOf(teams.map((t) => ({ key: "t" + t, pts: (tl.line[t] || []).length })), "t" + me.team);
    return { key, game: "timeline", ...r, tl: { turns: ps.turns || 0, hits: ps.hits || 0 } };
  }
  return null;
}

/* --------------------------- enregistrer une partie --------------------------- */
const clone = (o) => JSON.parse(JSON.stringify(o));
export function xpFor(s) {
  let xp = 20 + (s.result === "win" ? 30 : s.result === "draw" ? 10 : 0);
  if (s.game === "blindtest" && s.bt) xp += Math.min(30, s.bt.full * 2);
  if (s.game === "quiest" && s.qe) xp += Math.min(20, s.qe.found * 2);
  if (s.game === "timesup" && s.tu) xp += Math.min(30, s.tu.cards);
  if (s.game === "timeline" && s.tl) xp += Math.min(30, s.tl.hits * 3);
  return xp;
}

/**
 * Ajoute une partie terminée au profil. Renvoie { profile, gain } ou { profile, gain: null } si déjà comptée.
 * gain = { xp, lv0, lv1, ach: [succès obtenus], items: [{kind,id,name}] débloqués }.
 */
export function recordGame(profile, sum) {
  const p = clone(normalizeProfile(profile));
  if (!sum || p.seen.includes(sum.key)) return { profile: p, gain: null };
  const before = unlockedKeys(p), lv0 = levelOf(p.xp), achBefore = new Set(Object.keys(p.ach));
  const S = p.stats, G = S.byGame[sum.game];
  S.played++; G.p++;
  if (sum.result === "win") { S.wins++; G.w++; S.winStreak++; S.bestWinStreak = Math.max(S.bestWinStreak, S.winStreak); }
  else if (sum.result === "loss") { S.losses++; G.l++; S.winStreak = 0; }
  else if (sum.result === "draw") { S.draws++; G.d++; }
  G.pts += sum.pts || 0; G.best = Math.max(G.best, sum.pts || 0);
  if (sum.game === "timesup") {
    S.tu.cards += sum.tu.cards; S.tu.passes += sum.tu.passes; S.tu.turns += sum.tu.turns; if (sum.bonus) S.tu.bonusGames++;
  } else if (sum.game === "quiest") {
    const q = sum.qe; S.qe.rounds += q.rounds; S.qe.found += q.found; S.qe.firsts += q.firsts; S.qe.msSum += q.msSum; S.qe.msN += q.msN;
    if (q.fastest != null) S.qe.fastest = S.qe.fastest == null ? q.fastest : Math.min(S.qe.fastest, q.fastest);
  } else if (sum.game === "timeline") {
    S.tl.turns += sum.tl.turns; S.tl.hits += sum.tl.hits;
  } else if (sum.game === "blindtest") {
    const b = sum.bt, T = S.bt;
    T.songs += b.songs; T.full += b.full; T.half += b.half; T.msSum += b.msSum; T.msN += b.msN; T.bestStreak = Math.max(T.bestStreak, b.bestStreak);
    if (b.fastest != null) T.fastest = T.fastest == null ? b.fastest : Math.min(T.fastest, b.fastest);
    if (b.songs >= 5 && b.full === b.songs) T.perfect++;
  }
  let xp = xpFor(sum);
  p.history.unshift({ t: Date.now(), game: sum.game, result: sum.result, rank: sum.rank, of: sum.of, pts: sum.pts || 0 });
  p.history = p.history.slice(0, 30);
  p.seen.unshift(sum.key); p.seen = p.seen.slice(0, 40);
  // succès : leurs récompenses d'XP peuvent en débloquer d'autres, on répète jusqu'à stabilité
  p.xp += xp;
  for (let i = 0; i < 4; i++) {
    let added = 0;
    for (const a of ACHIEVEMENTS) {
      if (p.ach[a.id]) continue;
      const [cur, target] = a.prog(p.stats);
      if (cur >= target) { p.ach[a.id] = Date.now(); added += a.xp; }
    }
    if (!added) break;
    p.xp += added; xp += added;
  }
  const after = unlockedKeys(p);
  const items = allItems().filter((i) => after.has(i.kind + ":" + i.id) && !before.has(i.kind + ":" + i.id)).map((i) => ({ kind: i.kind, id: i.id, name: i.name }));
  return { profile: p, gain: { xp, lv0, lv1: levelOf(p.xp), ach: Object.keys(p.ach).filter((k) => !achBefore.has(k)), items, result: sum.result, game: sum.game } };
}

/** Pourcentage entier (ou null si rien à mesurer). */
export const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : null);
/** Durée en secondes avec une décimale : 3 421 ms -> "3,4 s". */
export const secs = (ms) => (ms == null ? "—" : (ms / 1000).toFixed(1).replace(".", ",") + " s");
