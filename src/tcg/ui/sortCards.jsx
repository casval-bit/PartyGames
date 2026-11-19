// Tri des cartes, partagé par l'album, la collection et l'outil de deck : un critère (famille, coût, force, rareté, nom,
// exemplaires) et un sens (croissant ou décroissant), gardés sur l'appareil. Chaque critère donne aussi les groupes
// affichés en en-têtes dans l'album (« Coût 5 », « Force 3 », « Légendaire »…).
import { FAMILY, PLAYABLE } from "../cards/index.js";
import { RARITY, RARITY_ORDER } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";

const FAM_ORDER = [...PLAYABLE.map((f) => f.id), "neutre"];
const TYPE_ORDER = ["char", "loc", "obj", "evt"];

/** Les critères ; dir = le sens par défaut (1 croissant, −1 décroissant), up / down = les mots du bouton de sens. */
export const SORTS = [
  { id: "fam", label: "Famille", dir: 1, up: "Coût ↑", down: "Coût ↓", hint: "famille par famille, puis le coût" },
  { id: "cost", label: "Coût", dir: 1, up: "Croissant", down: "Décroissant" },
  { id: "str", label: "Force", dir: -1, up: "Croissante", down: "Décroissante" },
  { id: "rar", label: "Rareté", dir: -1, up: "Communes d'abord", down: "Légendaires d'abord" },
  { id: "name", label: "Nom", dir: 1, up: "A → Z", down: "Z → A" },
  { id: "own", label: "Exemplaires", dir: -1, up: "Moins d'abord", down: "Plus d'abord" },
];
const BY = Object.fromEntries(SORTS.map((s) => [s.id, s]));

const fi = (d) => { const i = FAM_ORDER.indexOf(d.fam); return i < 0 ? 99 : i; };
const ti = (d) => TYPE_ORDER.indexOf(d.type);
const ri = (d) => RARITY_ORDER.indexOf(d.r);
const nm = (a, b) => a.name.localeCompare(b.name, "fr") || (a.title || "").localeCompare(b.title || "", "fr") || a.id.localeCompare(b.id);

/** La fonction de tri d'un critère et d'un sens ; count(d) = exemplaires possédés (pour « Exemplaires »). */
export function cardSorter(k, dir = 1, count = () => 0) {
  const s = dir < 0 ? -1 : 1;
  switch (k) {
    case "cost": return (a, b) => s * (a.cost - b.cost) || ti(a) - ti(b) || nm(a, b);
    // les personnages (qui ont une force) d'abord, puis les autres cartes par coût
    case "str": return (a, b) => (a.type === "char" ? 0 : 1) - (b.type === "char" ? 0 : 1) || s * ((a.str || 0) - (b.str || 0)) || s * (a.cost - b.cost) || nm(a, b);
    case "rar": return (a, b) => s * (ri(a) - ri(b)) || b.cost - a.cost || nm(a, b);
    case "name": return (a, b) => s * a.name.localeCompare(b.name, "fr") || a.cost - b.cost || a.id.localeCompare(b.id);
    case "own": return (a, b) => s * (count(a) - count(b)) || b.cost - a.cost || nm(a, b);
    default: return (a, b) => fi(a) - fi(b) || ti(a) - ti(b) || s * (a.cost - b.cost) || nm(a, b); // famille, type, puis le coût dans le sens choisi
  }
}

/** Le groupe d'une carte pour ce critère (les en-têtes de l'album) : clé, titre, icône, couleur. */
export function cardGroup(k, d, count = () => 0) {
  switch (k) {
    case "cost": return { g: "c" + d.cost, label: `Coût ${d.cost}`, icon: "coins" };
    case "str": return d.type === "char" ? { g: "s" + d.str, label: `Force ${d.str}`, icon: "swords" } : { g: "s-", label: "Sans force : lieux, objets, événements", icon: "layers" };
    case "rar": return { g: "r" + d.r, label: RARITY[d.r].name, icon: "gem", color: RARITY[d.r].gem };
    case "name": { const l = d.name.normalize("NFD")[0].toUpperCase(); return { g: "n" + l, label: /[A-Z]/.test(l) ? l : "#", icon: "book" }; }
    case "own": { const n = count(d); return { g: "o" + n, label: n ? `${n} exemplaire${n > 1 ? "s" : ""}` : "Pas encore à toi", icon: "layers" }; }
    default: { const f = FAMILY[d.fam] || FAMILY.neutre; return { g: "f" + d.fam, label: f.name, icon: f.icon, color: f.color }; }
  }
}

const KEY = "trone-tri2";
/** Le tri gardé sur l'appareil ({ k, dir }) ; l'ancien réglage (famille ou coût) est repris. */
export function loadSort() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && BY[v.k]) return { k: v.k, dir: v.dir < 0 ? -1 : 1 };
    if (localStorage.getItem("trone-tri") === "cost") return { k: "cost", dir: 1 };
  } catch { /* stockage indisponible */ }
  return { k: "fam", dir: 1 };
}
export function saveSort(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* stockage indisponible */ } }

/** Le choix du tri : le critère, et le bouton du sens juste à côté (« Coût · Décroissant »). */
export function SortPick({ value, onChange, keys, testid = "sort" }) {
  const list = keys ? SORTS.filter((s) => keys.includes(s.id)) : SORTS;
  const cur = BY[value.k] || SORTS[0];
  const set = (v) => { onChange(v); saveSort(v); sfx.select(); };
  return (
    <div className="sortpick" role="group" aria-label="Trier les cartes">
      <label className="sortpick-k">
        <small>Trier par</small>
        <select value={cur.id} onChange={(e) => set({ k: e.target.value, dir: BY[e.target.value].dir })} aria-label="Critère de tri" data-testid={testid + "-k"}>
          {list.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <button className="sortpick-d" onClick={() => set({ k: cur.id, dir: -value.dir })} aria-label={`Sens : ${value.dir < 0 ? cur.down : cur.up}, changer`} data-testid={testid + "-dir"}>
        <Icon name={value.dir < 0 ? "sortdown" : "sortup"} size={17} /><span>{value.dir < 0 ? cur.down : cur.up}</span>
      </button>
    </div>
  );
}
