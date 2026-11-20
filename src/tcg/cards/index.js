// Registre de toutes les cartes du Trône des Mondes : familles, cartes, scénarios, sous-groupes (types Pokémon, régions de League of Legends).
import { buildCards } from "./build.js";
import { compileAbility } from "../abilities.js";
import { FAMILY_BONUSES } from "../rules.js";
import * as lyoko from "./lyoko.js";
import * as umbrella from "./umbrella.js";
import * as toystory from "./toystory.js";
import * as onepiece from "./onepiece.js";
import * as pokemon from "./pokemon.js";
import * as starac from "./starac.js";
import * as citesdor from "./citesdor.js";
import * as legendaires from "./legendaires.js";
import * as capes from "./capes.js";
import * as hunger from "./hunger.js";
import * as bebop from "./bebop.js";
import * as horde from "./horde.js";
import * as elite from "./elite.js";
import * as teenwolf from "./teenwolf.js";
import * as marvel from "./marvel.js";
import * as dc from "./dc.js";
import * as stranger from "./stranger.js";
import * as scooby from "./scooby.js";
import * as lol from "./lol.js";
import * as hp from "./hp.js";
import * as sw from "./sw.js";
import * as got from "./got.js";
import * as lotr from "./lotr.js";
import * as narnia from "./narnia.js";
import * as ghibli from "./ghibli.js";
import * as gundam from "./gundam.js";
import * as jojo from "./jojo.js";
import * as neutral from "./neutral.js";
import * as plots from "./plots.js";
import { THEMES, MORE_THEMES } from "./themes.js";

const MODS = [lyoko, umbrella, toystory, onepiece, pokemon, starac, citesdor, legendaires, capes, hunger, bebop, horde, elite, teenwolf, marvel, dc, stranger, scooby, lol, hp, sw, got, lotr, narnia, ghibli, gundam, jojo];

export const FAMILIES = [];
export const FAMILY = {};
export const CARD = {};
export const ALL = [];      // toutes les cartes à collectionner (sans les scénarios)
export const PLOTS = [];    // scénarios (communs à tous)
export const STARTER_SPECS = [];
export const TYPE_BONUS = {}; // sous-groupes (type Pokémon, région de Runeterra…) : bonus de la famille selon le choix du deck
export const POKE_TYPES = []; // (ceux de la famille Pokémon)

const used = new Set();
function addFamily(m) {
  const famDef = { name: m.meta.name, type: "fam" };
  // bonus de famille désactivés (rules.js, FAMILY_BONUSES) : la famille n'a aucun effet, comme la carte de faction du Trône de Fer
  const abs = !FAMILY_BONUSES ? [] : String(m.meta.passive || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => compileAbility(s, famDef));
  const f = { ...m.meta, abs };
  FAMILIES.push(f);
  FAMILY[f.id] = f;
  for (const d of buildCards(f.id, m.cards, used)) { CARD[d.id] = d; ALL.push(d); }
  for (const s of m.starters || []) STARTER_SPECS.push({ ...s, fam: f.id });
  if (m.types) {
    f.types = [];
    for (const t of m.types) {
      if (TYPE_BONUS[t.id]) throw new Error(`Sous-groupe en double : ${t.id}`);
      const tb = { ...t, fam: f.id, abs: !FAMILY_BONUSES ? [] : String(t.bonus || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => compileAbility(s, { name: t.name, type: "fam" })) };
      TYPE_BONUS[t.id] = tb;
      f.types.push(tb);
      if (f.id === "pokemon") POKE_TYPES.push(tb);
    }
  }
}
for (const m of MODS) addFamily(m);
addFamily(neutral);
// les 8 decks à thème, faits à la main : les seuls proposés à un nouveau joueur (voir themes.js)
for (const t of THEMES) STARTER_SPECS.push({ ...t, theme: true });
// les autres decks à thème (régions, maîtres de type, amis, méchants…) : modèles de deck et adversaires bots, pas au premier lancement
for (const t of MORE_THEMES) STARTER_SPECS.push({ ...t, theme: true, extra: true });
for (const d of buildCards("plot", plots.cards, used)) { CARD[d.id] = d; PLOTS.push(d); }

/** Familles jouables (sans « Neutre »). */
export const PLAYABLE = FAMILIES.filter((f) => f.id !== "neutre");

/* ------------------------- cartes renommées, remplacées ou retirées -------------------------
   Les sauvegardes (collection, brillantes, decks, photo de profil) suivent : voir normalizeTcg dans progress.js. */
/** Même carte, nouvel identifiant (les illustrations importées suivent aussi). */
export const RENAMED = {
  // Pokémon, nouvelle échelle des coûts (16/11/2026) : la même carte à son nouveau coût
  "pokemon-reptincel-4": "pokemon-reptincel-3", "pokemon-pyroli-4": "pokemon-pyroli-5", "pokemon-carabaffe-4": "pokemon-carabaffe-3",
  "pokemon-aquali-4": "pokemon-aquali-5", "pokemon-herbizarre-4": "pokemon-herbizarre-3", "pokemon-voltali-4": "pokemon-voltali-3",
  "pokemon-givrali-4": "pokemon-givrali-3", "pokemon-mammochon-6": "pokemon-mammochon-5", "pokemon-machopeur-4": "pokemon-machopeur-3",
  "pokemon-nidoking-6": "pokemon-nidoking-5", "pokemon-rhinoferos-6": "pokemon-rhinoferos-5", "pokemon-mentali-4": "pokemon-mentali-3",
  "pokemon-cizayox-6": "pokemon-cizayox-5", "pokemon-grolem-6": "pokemon-grolem-5", "pokemon-onix-5": "pokemon-onix-4",
  "pokemon-draco-4": "pokemon-draco-3", "pokemon-noctali-4": "pokemon-noctali-3", "pokemon-steelix-6": "pokemon-steelix-5",
  "pokemon-ronflex-6": "pokemon-ronflex-5", "pokemon-miaouss-2": "pokemon-miaouss-4", "pokemon-giovanni-5": "pokemon-giovanni-7",
  "pokemon-n-5": "pokemon-n-harmonia-7-2", "pokemon-tcheren-3": "pokemon-tcheren-7", "pokemon-tcheren-6": "pokemon-tcheren-7", "pokemon-cynthia-6": "pokemon-cynthia-7",
  // Goyah, Maître de la Ligue d'Unys, passe à 7 comme les autres Maîtres (17/11/2026)
  "pokemon-goyah-6": "pokemon-goyah-7",
};
/** Carte remplacée par une autre à la même place : les exemplaires possédés deviennent la nouvelle carte. */
export const REPLACED = {
  "lyoko-aelita-stones-4": "lyoko-aelita-hopper-4", // Aelita Stones (même personnage, même coût) : une seule Aelita Hopper 4, L'elfe de Lyoko
  "lyoko-aelita-hopper-4-2": "lyoko-aelita-hopper-4", // Aelita Hopper 4 « Gardienne de Lyoko » (version de test du 13/11, fusionnée avec L'elfe)
  "lyoko-spectre-de-xana-2": "lyoko-ninjas-de-tyron-2",
  "lyoko-spectre-polymorphe-evt": "lyoko-champ-de-force-evt",
};
/** Cartes retirées du jeu (rareté, carte 7 toujours brillante) : chaque exemplaire possédé est remboursé en Éclats. */
export const RETIRED = {
  "lyoko-franz-hopper-7": { r: "L", seven: true },
  "lyoko-le-clone-de-william-3": { r: "U", seven: false },
  "lyoko-anthea-hopper-3": { r: "U", seven: false },
  "neutre-kym-ladell-4": { r: "R", seven: false }, // devenue Kym Ladell 7 (même image)
  "neutre-william-hawkes-4": { r: "R", seven: false }, // devenu William Hawkes 7 (même image)
};
/** Identifiant actuel d'une carte d'une ancienne sauvegarde (null si elle n'existe plus). */
export const currentId = (id) => { const k = RENAMED[id] || REPLACED[id] || id; return CARD[k] ? k : null; };
for (const [a, b] of Object.entries({ ...RENAMED, ...REPLACED })) if (CARD[a] || !CARD[b]) throw new Error(`Carte renommée ou remplacée invalide : ${a} -> ${b}`);
for (const id of Object.keys(RETIRED)) if (CARD[id]) throw new Error(`Carte retirée encore présente : ${id}`);

/** Sous-groupe choisi par un deck de cette famille (type Pokémon, région…), ou null. */
export const subOf = (fam, pt) => (pt && TYPE_BONUS[pt] && TYPE_BONUS[pt].fam === fam ? TYPE_BONUS[pt] : null);
/** Vrai si un deck de cette famille doit choisir un sous-groupe. */
export const hasSubs = (fam) => Boolean(FAMILY[fam] && FAMILY[fam].types && FAMILY[fam].types.length);
const SUB_DEFAULT = { one: "type", One: "Type", ask: "Quel type ?", help: "", pick: "Choisis un type pour ce deck.", not: "n'est pas de type" };
/** Les mots du sous-groupe d'une famille (« type », « région »…). */
export const subWords = (fam) => ({ ...SUB_DEFAULT, ...((FAMILY[fam] && FAMILY[fam].sub) || {}) });
/** Le genre d'un sous-groupe (« type », « région »…), avec une majuscule si cap : les Pokémon ont des types ET des régions. */
export const subKind = (fam, id, cap = false) => {
  const t = TYPE_BONUS[id], w = subWords(fam);
  return (t && (cap ? t.One : t.one)) || (cap ? w.One : w.one);
};
/** Les sous-groupes d'une famille rangés par genre : [{ kind, label, list }] (les types, puis les régions). */
export function subGroups(fam) {
  const f = FAMILY[fam];
  if (!f || !f.types) return [];
  const out = [];
  for (const t of f.types) {
    const kind = t.kind || "type";
    let g = out.find((x) => x.kind === kind);
    if (!g) { g = { kind, label: kind === "type" ? subWords(fam).One + "s" : (t.One || kind) + "s", list: [] }; out.push(g); }
    g.list.push(t);
  }
  return out;
}
const plainName = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Les traits tels que la carte les écrit sous l'image : ses traits, puis ses sous-groupes (type, région, maison…) qui n'y sont pas déjà. */
export function traitNames(d) {
  const out = [...((d && d.traits) || [])], seen = new Set(out.map(plainName));
  for (const id of (d && d.pt) || []) {
    const t = TYPE_BONUS[id], name = (t && (t.short || t.name)) || id;
    if (!seen.has(plainName(name))) { seen.add(plainName(name)); out.push(name); }
  }
  return out;
}
/** « type Feu/Vol · région Kanto » : les sous-groupes d'une carte, regroupés par genre. */
export function subLabel(fam, ids) {
  const parts = [];
  for (const id of ids || []) {
    const k = subKind(fam, id), name = TYPE_BONUS[id] ? TYPE_BONUS[id].name : id;
    const p = parts.find((x) => x.k === k);
    if (p) p.names.push(name); else parts.push({ k, names: [name] });
  }
  return parts.map((p) => `${p.k} ${p.names.join("/")}`).join(" · ");
}
