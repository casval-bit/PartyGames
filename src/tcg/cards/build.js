// Fabrication des cartes à partir d'une écriture compacte (une ligne par carte dans les fichiers de famille).
//
//   ch(nom, sous-titre, coût, force, icônes "CRI", traits "A|B", mots-clés "celebre|embuscade:3", effets "a:1@Nom ; b", rareté, options)
//   loc(nom, sous-titre, coût, traits, mots-clés, effets, rareté, options)
//   obj(nom, sous-titre, coût, traits, mots-clés, effets, rareté, options)   options.req = trait exigé du porteur
//   ev(nom, sous-titre, coût, traits, effet, rareté, options)
//   plot(nom, univers, revenu, initiative, revendication, réserve, traits, effets, options)
//
// Options utiles : key (regroupe les versions d'un même personnage : une seule version par deck), uni:false (non unique),
// pt (types Pokémon, régions de League of Legends), st (exclusive au deck de départ indiqué : jamais dans les boosters), flav (citation),
// fem (accorde les textes au féminin ; par défaut d'après la liste de cards/gender.js).
import { compileAbility } from "../abilities.js";
import { FEM } from "./gender.js";
import { slug } from "../rules.js";

const list = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
const parseKw = (s) => {
  const kw = {};
  for (const k of list(s)) { const [id, v] = k.split(":"); kw[id.trim()] = v === undefined ? true : Number(v); }
  return kw;
};
const parseIcons = (s) => ({ combat: /C/.test(s || ""), ruse: /R/.test(s || ""), influence: /I/.test(s || "") });
const parseAb = (s) => String(s || "").split(";").map((x) => x.trim()).filter(Boolean);

export const ch = (name, title, cost, str, icons, traits, kw, ab, r, o = {}) => ({ type: "char", name, title, cost, str, icons, traits, kw, ab, r, ...o });
export const loc = (name, title, cost, traits, kw, ab, r, o = {}) => ({ type: "loc", name, title, cost, traits, kw, ab, r, ...o });
export const obj = (name, title, cost, traits, kw, ab, r, o = {}) => ({ type: "obj", name, title, cost, traits, kw, ab, r, ...o });
export const ev = (name, title, cost, traits, ab, r, o = {}) => ({ type: "evt", name, title, cost, traits, kw: "", ab, r, ...o });
export const plot = (name, univ, inc, ini, clm, res, traits, ab, o = {}) => ({ type: "plot", name, univ, inc, ini, clm, res, traits, kw: "", ab, r: "C", cost: 0, ...o });

/** Transforme les lignes compactes d'une famille en cartes complètes (identifiants stables, effets compilés). */
export function buildCards(fam, raw, used = new Set()) {
  const out = [];
  for (const x of raw) {
    const base = `${fam}-${slug(x.name)}-${x.type === "char" ? x.cost : x.type}`;
    let id = base, k = 2;
    while (used.has(id)) id = `${base}-${k++}`;
    used.add(id);
    const traits = list(x.traits);
    const pt = x.pt ? list(x.pt) : [];
    const d = {
      id, fam, type: x.type, name: x.name, title: x.title || "", key: x.key || `${fam}-${slug(x.name)}`,
      cost: x.cost || 0, str: x.str || 0, icons: parseIcons(x.icons), traits, pt,
      kw: parseKw(x.kw), r: x.r || "C", uni: x.type === "char" ? x.uni !== false : Boolean(x.uni),
      req: x.req || null, st: x.st || null, flav: x.flav || "", univ: x.univ || fam,
      inc: x.inc || 0, ini: x.ini || 0, clm: x.clm ?? 1, res: x.res || 6,
      fem: x.type === "char" ? Boolean(x.fem ?? FEM.has(x.name)) : false,
    };
    d.traitSet = new Set([...traits, ...pt].map((t) => t.toLowerCase()));
    d.abs = parseAb(x.ab).map((spec) => compileAbility(spec, d));
    if (d.type === "evt" && (!d.abs.length || d.abs[0].kind !== "evt")) throw new Error(`L'événement ${d.name} n'a pas d'effet d'événement`);
    d.loyal = d.kw.fidele !== undefined;
    out.push(d);
  }
  return out;
}
