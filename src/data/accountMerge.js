// Fusion de deux profils (celui du téléphone et celui du compte). Module pur : testé avec « node tools/test-account.js ».
//
// Règle : on garde le profil le plus avancé (plus d'XP, puis plus de parties) comme base, car ses statistiques sont
// cohérentes entre elles ; on lui ajoute tout ce que l'autre avait en plus (succès, historique, parties déjà comptées).
// On n'additionne JAMAIS les deux : le même profil peut exister en copie sur le téléphone et dans le cloud,
// et l'additionner compterait chaque partie deux fois.
import { normalizeProfile, fixLook, DEFAULT_LOOK } from "./profile.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
export const progressScore = (p) => p.xp * 1000 + p.stats.played;

/** Un profil sans aucune partie ni XP (téléphone neuf, ou compte tout juste créé). */
export const isBlank = (p) => {
  const n = normalizeProfile(p);
  return n.xp === 0 && n.stats.played === 0;
};

export function mergeProfiles(a, b) {
  const A = normalizeProfile(a), B = normalizeProfile(b);
  const [base, other] = progressScore(A) >= progressScore(B) ? [A, B] : [B, A];
  const out = clone(base);
  // un profil vide n'impose pas son apparence par défaut : si la base est vierge, on reprend l'apparence de l'autre
  if (isBlank(base) && !isBlank(other)) out.look = { ...DEFAULT_LOOK, ...other.look };
  for (const [k, t] of Object.entries(other.ach)) if (!out.ach[k]) out.ach[k] = t;
  out.seen = [...new Set([...out.seen, ...other.seen])].slice(0, 40);
  const hist = [...out.history, ...other.history];
  const sig = new Set();
  out.history = hist
    .filter((h) => h && typeof h === "object")
    .sort((x, y) => (y.t || 0) - (x.t || 0))
    .filter((h) => { const k = `${h.t}|${h.game}|${h.pts}`; if (sig.has(k)) return false; sig.add(k); return true; })
    .slice(0, 30);
  out.look = { ...out.look, ...fixLook(out) };
  return normalizeProfile(out);
}

/** Deux profils identiques (pour éviter des envois inutiles). */
export const sameProfile = (a, b) => JSON.stringify(normalizeProfile(a)) === JSON.stringify(normalizeProfile(b));
