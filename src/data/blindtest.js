// Blind test : comparaison d'une réponse avec le titre / l'artiste, et barème des points.

// Minuscules, sans accents ni ponctuation (les lettres de toutes les écritures restent : japonais, coréen, cyrillique…).
export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/ø/g, "o").replace(/ł/g, "l").replace(/đ/g, "d")
    .replace(/(\p{L})!(\p{L})/gu, "$1i$2") // P!nk
    .replace(/(\p{L})\$/gu, "$1s")           // Ke$ha, A$AP
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const ARTICLES = new Set(["the", "a", "an", "le", "la", "les", "l", "un", "une", "el", "los", "las", "der", "die", "das"]);
const dropArticle = (n) => { const t = n.split(" "); return t.length > 1 && ARTICLES.has(t[0]) ? t.slice(1).join(" ") : n; };

/** « Get Lucky (feat. Pharrell) - Radio Edit » → « Get Lucky » */
export function cleanTitle(raw) {
  let t = String(raw || "");
  t = t.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
  t = t.split(/\s[-–—]\s/)[0];
  t = t.replace(/\b(feat|ft|featuring)\b.*$/i, "");
  return t.trim();
}

/** Les formes acceptées pour le titre (nettoyée, et complète sans les parenthèses). */
export function titleForms(raw) {
  const forms = new Set([dropArticle(norm(cleanTitle(raw))), dropArticle(norm(String(raw || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ")))]);
  forms.delete("");
  return [...forms];
}
export function artistForms(artists) {
  const out = new Set();
  for (const a of [].concat(artists || [])) for (const piece of String(a || "").split(/\s*(?:,|;|\/|\bfeat\.?\b|\bft\.?\b|\bx\b|&)\s*/i)) {
    const n = dropArticle(norm(piece)); if (n) out.add(n);
  }
  for (const a of [].concat(artists || [])) { const n = dropArticle(norm(a)); if (n) out.add(n); }
  return [...out];
}

export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Distance de Damerau : comme lev, mais deux lettres inversées (« lukcy ») ne comptent que pour UNE faute. */
export function dist(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let pp = null, prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
    }
    pp = prev; prev = cur;
  }
  return prev[n];
}

// ---- tolérance aux fautes, selon la longueur de la bonne réponse (sans espaces) ----
// Les mots courts doivent être exacts (« Hole » n'est pas « Halo »), les longs acceptent un peu plus de fautes.
//   1–4 lettres : 0 faute · 5–9 : 1 · 10–15 : 2 · 16 et + : 3
export const typoTolerance = (len) => (len <= 4 ? 0 : len <= 9 ? 1 : len <= 15 ? 2 : 3);
// « Presque ! » (aucun point) : une faute de plus que la tolérance, mais seulement pour les réponses assez longues
export const closeTolerance = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : len <= 9 ? 2 : len <= 15 ? 3 : 4);

// Petits mots qu'on a le droit d'oublier : « Rolling in Deep » = « Rolling in the Deep »
const FILLERS = new Set([...ARTICLES, "of", "and", "et", "de", "du", "des"]);
const coreOf = (n) => n.split(" ").filter((w) => !FILLERS.has(w)).join(" ");
const digitsOf = (s) => s.replace(/\D/g, "");

/** "full" : la bonne réponse (ou presque identique) ; "close" : presque (aucun point) ; null : non. Cherche la cible n'importe où dans la phrase tapée. */
export function matchForm(guessNorm, form) {
  if (!form || !guessNorm) return null;
  const variants = [[guessNorm.split(" "), form]];
  const fc = coreOf(form), gc = coreOf(guessNorm);
  if (fc && fc !== form && fc.replace(/ /g, "").length >= 5 && gc) variants.push([gc.split(" "), fc]);
  let close = false;
  for (const [gt, f] of variants) {
    const cf = f.replace(/ /g, ""), m = f.split(" ").length, tol = typoTolerance(cf.length), ctol = closeTolerance(cf.length);
    for (let len = Math.max(1, m - 1); len <= m + 1; len++) {
      for (let i = 0; i + len <= gt.length; i++) {
        const win = gt.slice(i, i + len).join(" ");
        if (win === f || dropArticle(win) === f) return "full";
        const cw = win.replace(/ /g, "");               // espaces et tirets ne comptent pas : « la mour » = « l'amour »
        if (cw === cf) return "full";
        if (Math.abs(cw.length - cf.length) > ctol || digitsOf(cw) !== digitsOf(cf)) continue; // un chiffre faux = mauvais morceau
        const d = dist(cw, cf);
        if (d <= tol) return "full";
        if (d <= ctol) close = true;
      }
    }
  }
  return close ? "close" : null;
}
function best(guessNorm, forms) {
  let res = null;
  for (const f of forms) {
    const r = matchForm(guessNorm, f);
    if (r === "full") return "full";
    if (r === "close") res = "close";
  }
  return res;
}
/** Compare une réponse libre au morceau : { title, artist } valant "full" | "close" | null. */
export function judge(text, track) {
  const g = norm(text);
  if (!g) return { title: null, artist: null };
  return { title: best(g, titleForms(track.title)), artist: best(g, artistForms(track.artists)) };
}

// ---- barème (par partie trouvée : titre OU artiste ; trouver les deux = points complets) ----
export const BT_PART_BASE = 300;          // points fixes d'une partie
export const BT_SPEED_MAX = 200;          // + jusqu'à 200 selon le temps restant au moment de la réponse
export const BT_RANK_BONUS = [100, 60, 30]; // + bonus selon l'ordre d'arrivée (1er, 2e, 3e)
export const BT_STREAK_STEP = 50;         // série : +50 × (série − 1) quand on trouve les DEUX, plafonné
export const BT_STREAK_CAP = 250;
export function partPoints(remaining, rank) {
  return BT_PART_BASE + Math.round(BT_SPEED_MAX * Math.max(0, Math.min(1, remaining))) + (BT_RANK_BONUS[rank - 1] || 0);
}
export const streakBonus = (streak) => Math.min(BT_STREAK_CAP, BT_STREAK_STEP * Math.max(0, streak - 1));
