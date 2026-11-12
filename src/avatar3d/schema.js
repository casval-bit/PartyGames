// Personnage 3D = un « Doudou » (petite créature ronde) : catalogue de toutes les pièces personnalisables.
// Données pures (sans three.js) : utilisées par le réseau, le profil, le studio et les tests.
// L'apparence tient dans UNE chaîne : « C » puis un caractère (base 36) par emplacement (SLOTS), dans l'ordre ci-dessous.
// RÈGLE : on n'ajoute des options qu'à la FIN d'une liste et des emplacements qu'à la FIN de SLOTS (les profils existants ne changent pas).
// rule : null = gratuit · { lv } = niveau minimum · { ach } = succès à obtenir.
import { SPECIES, FUR, CLOTH, EYEC, PATTERNS, EYES, MOUTHS, BLUSH, DECO, HATS, GLASSES, NECKS, BACKS, OUTFITS, SHOES } from "./doudou-data.js";

export const VERSION = "C";
export { SPECIES, FUR, CLOTH, EYEC };

/* ------------------------------ emplacements ------------------------------ */
// zone : partie qu'on touche dans le studio (tete, visage, corps, dos, pieds)
const S = (id, zone, label, opts, def = 0, extra = {}) => ({ id, zone, label, opts, def, ...extra });
export const SLOTS = [
  S("espece", "tete", "Espèce", SPECIES),
  S("color", "corps", "Couleur", FUR, 0, { color: true }),
  S("motif", "corps", "Motif", PATTERNS),
  S("color2", "corps", "Couleur du motif", FUR, 17, { color: true }),
  S("eyes", "visage", "Yeux", EYES),
  S("eyec", "visage", "Couleur des yeux", EYEC, 0, { color: true }),
  S("mouth", "visage", "Bouche", MOUTHS),
  S("blush", "visage", "Joues", BLUSH),
  S("deco", "visage", "Détails", DECO),
  S("hat", "tete", "Couvre-chef", HATS),
  S("hatc", "tete", "Couleur du couvre-chef", CLOTH, 2, { color: true }),
  S("glasses", "visage", "Lunettes", GLASSES),
  S("glc", "visage", "Couleur des lunettes", CLOTH, 1, { color: true }),
  S("outfit", "corps", "Tenue", OUTFITS),
  S("outc", "corps", "Couleur de la tenue", CLOTH, 9, { color: true }),
  S("out2", "corps", "Couleur des détails", CLOTH, 0, { color: true }),
  S("neck", "corps", "Cou", NECKS),
  S("neckc", "corps", "Couleur du cou", CLOTH, 2, { color: true }),
  S("back", "dos", "Dos", BACKS),
  S("backc", "dos", "Couleur du dos", CLOTH, 2, { color: true }),
  S("shoes", "pieds", "Chaussures", SHOES),
  S("shoec", "pieds", "Couleur des chaussures", CLOTH, 2, { color: true }),
];
export const SLOT_BY = Object.fromEntries(SLOTS.map((s, i) => [s.id, { ...s, i }]));
/** Zones touchables sur le grand personnage (de haut en bas). */
export const ZONES = [
  { id: "tete", label: "Tête", hint: "Espèce, couvre-chef" },
  { id: "visage", label: "Visage", hint: "Yeux, bouche, joues, lunettes" },
  { id: "corps", label: "Corps", hint: "Couleur, motif, tenue, cou" },
  { id: "dos", label: "Dos", hint: "Sac, cape, ailes" },
  { id: "pieds", label: "Pieds", hint: "Chaussures" },
];
/**
 * Onglets de chaque zone dans la fenêtre de personnalisation.
 * id : emplacement principal · colors : emplacements de couleur liés · extra : autres emplacements dans le même onglet
 */
export const ZONE_TABS = {
  tete: [{ id: "espece" }, { id: "hat", colors: ["hatc"] }],
  visage: [{ id: "eyes", colors: ["eyec"] }, { id: "mouth" }, { id: "blush", extra: ["deco"], label: "Joues et détails" }, { id: "glasses", colors: ["glc"] }],
  corps: [{ id: "color", label: "Couleur" }, { id: "motif", colors: ["color2"] }, { id: "outfit", colors: ["outc", "out2"] }, { id: "neck", colors: ["neckc"] }],
  dos: [{ id: "back", colors: ["backc"] }],
  pieds: [{ id: "shoes", colors: ["shoec"] }],
};
/** Cadrage des vignettes d'une zone (pour les images des pièces). */
export const ZONE_VIEW = { tete: "head", visage: "face", corps: "full", dos: "back", pieds: "feet" };
const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
if (SLOTS.some((s) => s.opts.length > B36.length)) throw new Error("avatar3d : trop d'options dans un emplacement (max 36)");

/** Tableau d'entiers (un par emplacement) ⇄ chaîne compacte. */
export const encodeX = (arr) => VERSION + SLOTS.map((s, i) => B36[Math.max(0, Math.min(s.opts.length - 1, arr[i] | 0))]).join("");
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seeded = (seed) => { let s = seed || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
/** Chaîne reçue (réseau, stockage) → tableau valide. Une ancienne chaîne (humain, haricot) donne un Doudou tiré au sort, toujours le même. */
export function decodeX(str) {
  const t = typeof str === "string" ? str : "";
  if (t[0] !== VERSION) {
    if (!t) return defaultXArr();
    return decodeX(randomX(seeded(hash(t)), (r) => !r));
  }
  return SLOTS.map((s, i) => { const v = B36.indexOf(t[i + 1]); return v >= 0 && v < s.opts.length ? v : s.def; });
}
export const defaultXArr = () => SLOTS.map((s) => s.def);
export const DEFAULT_X = encodeX(defaultXArr());
export const cleanX = (str) => encodeX(decodeX(str));
/** Valeurs lisibles : { espece: option, color: option, … } */
export const partsOf = (str) => { const a = decodeX(str); return Object.fromEntries(SLOTS.map((s, i) => [s.id, s.opts[a[i]]])); };
export const setSlot = (str, slotId, idx) => { const a = decodeX(str); a[SLOT_BY[slotId].i] = idx; return encodeX(a); };
export const getSlot = (str, slotId) => decodeX(str)[SLOT_BY[slotId].i];

/** Doudou au hasard, mais harmonieux (motif clair sur pelage foncé et inversement, accessoires dosés). `allow(rule)` : pièces permises. */
export function randomX(rnd = Math.random, allow = (r) => !r) {
  const a = defaultXArr();
  const idx = (id) => SLOT_BY[id].i;
  const okList = (id, filter = () => true) => SLOT_BY[id].opts.map((x, k) => (allow(x.rule) && filter(x, k) ? k : -1)).filter((k) => k >= 0);
  const pick = (id, filter) => { const ok = okList(id, filter); if (ok.length) a[idx(id)] = ok[(rnd() * ok.length) | 0]; return a[idx(id)]; };
  const chance = (p) => rnd() < p;
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
  pick("espece");
  const col = SLOT_BY.color.opts[pick("color")];
  if (chance(0.55)) {
    pick("motif", (x) => x.id !== "uni" && x.id !== "galaxie" && x.id !== "arcenciel");
    const L0 = lum(col.hex);
    pick("color2", (x) => Math.abs(lum(x.hex) - L0) > 0.22);
  } else a[idx("motif")] = 0;
  pick("eyes", (x) => x.id !== "spirales" && x.id !== "led" && (x.id === "ronds" || x.id === "ovales" || chance(0.5)));
  pick("eyec"); pick("mouth", (x) => x.id !== "zigzag"); pick("blush", (x, k) => k !== 1 || chance(0.3));
  if (chance(0.25)) pick("deco", (x) => x.id !== "aucun");
  if (chance(0.4)) { pick("hat", (x) => x.id !== "aucun"); pick("hatc"); }
  if (chance(0.15)) { pick("glasses", (x) => x.id !== "aucune"); pick("glc"); }
  if (chance(0.45)) { pick("outfit", (x) => x.id !== "aucune"); pick("outc"); pick("out2"); }
  if (chance(0.2)) { pick("neck", (x) => x.id !== "aucun"); pick("neckc"); }
  if (chance(0.15)) { pick("back", (x) => x.id !== "aucun"); pick("backc"); }
  if (chance(0.5)) { pick("shoes", (x) => x.id !== "nus"); pick("shoec"); }
  return encodeX(a);
}
/** Ancien profil (sans personnage 3D) : un Doudou tiré d'après sa couleur d'avatar (toujours le même). */
export function legacyX(hex) { return randomX(seeded(hash(hex || "violet")), (r) => !r); }
/** Toutes les pièces à condition (récompenses de succès, cadenas) : [{ kind: "part", slot, id, name, rule }] */
export const PART_ITEMS = SLOTS.flatMap((s) => s.opts.filter((x) => x.rule).map((x) => ({ kind: "part", slot: s.id, id: s.id + ":" + x.id, name: x.name, rule: x.rule })));
