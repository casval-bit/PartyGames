// Trône des Mondes : les Portails (invocations, façon gacha). Module pur : le calendrier et le contenu des deux bannières.
//
//   - deux portails ouverts en même temps, qui changent toutes les deux semaines (le dimanche à minuit, les mêmes pour tout le monde) :
//       * le Portail des Légendes : un thème qui traverse les univers, trois cartes 7 en vedette et quatre épiques à l'honneur ;
//       * le Monde à l'honneur : une famille et toutes ses cartes ; 1 à 3 de ses cartes 7 en vedette (selon la taille de la famille),
//         à choisir comme cible ; ses autres cartes 7 peuvent aussi sortir ;
//   - les tirages, les prix et la garantie sont dans progress.js (pull, PULL).
// Pour ajouter un thème : une ligne dans LEGENDS (3 cartes 7 de familles différentes de préférence, 4 épiques de coût 6 ou moins).
import { ALL, FAMILY, PLAYABLE } from "./cards/index.js";

export const PORTAL_DAYS = 14;
/** Premier jour des premiers portails (un dimanche) : ils changent ensuite tous les 14 jours, à minuit. */
export const PORTAL_START = "2026-11-15";

/** Les thèmes du Portail des Légendes, dans l'ordre où ils reviennent. */
export const LEGENDS = [
  { id: "tenebres", name: "Seigneurs des ténèbres", color: "#8b5cf6", tag: "Sauron, Dark Vador et Voldemort ouvrent les portes de l'ombre.",
    stars: ["lotr-sauron-7-2", "sw-dark-vador-7", "hp-lord-voldemort-7"], epics: ["lotr-le-roi-sorcier-d-angmar-6", "sw-dark-maul-5", "hp-bellatrix-lestrange-6", "legendaires-eternity-6"] },
  { id: "forts", name: "Les plus forts du monde", color: "#ef4444", tag: "Barbe Blanche, Hulk et Superman : qui frappe le plus fort ?",
    stars: ["onepiece-edward-newgate-7", "marvel-hulk-7", "dc-superman-7"], epics: ["pokemon-mackogneur-6", "got-gregor-clegane-6", "marvel-thor-6", "dc-black-adam-6"] },
  { id: "magie", name: "Magie suprême", color: "#38bdf8", tag: "Le Sorcier suprême, Gandalf le Blanc et le maître de la baguette de sureau.",
    stars: ["marvel-doctor-strange-7", "lotr-gandalf-7-2", "hp-albus-dumbledore-7-2"], epics: ["ghibli-hauru-6", "dc-le-spectre-6", "legendaires-tenebris-6", "lol-leblanc-5"] },
  { id: "dragons", name: "L'heure des dragons", color: "#f97316", tag: "Drogon, Méga-Dracaufeu X et Kaido prennent leur envol.",
    stars: ["got-drogon-7", "pokemon-dracaufeu-7-2", "onepiece-kaido-7"], epics: ["ghibli-haku-6", "pokemon-carchacrok-6", "got-daemon-targaryen-6", "hp-norbert-dragonneau-6"] },
  { id: "elus", name: "Les Élus", color: "#facc15", tag: "Harry, Luke et Frodon : la prophétie les attend.",
    stars: ["hp-harry-potter-7", "sw-luke-skywalker-7", "lotr-frodon-sacquet-7"], epics: ["sw-anakin-skywalker-6", "lyoko-aelita-hopper-5", "narnia-peter-pevensie-6", "lotr-samsagace-gamegie-5"] },
  { id: "temps", name: "Le temps s'arrête", color: "#a3e635", tag: "ZA WARUDO ! Dio, Numéro Cinq et Dialga jouent avec le temps.",
    stars: ["jojo-dio-brando-7-2", "umbrella-numero-cinq-7", "pokemon-dialga-7"], epics: ["jojo-diavolo-5", "jojo-enrico-pucci-5", "umbrella-numero-cinq-6", "lyoko-jeremie-belpois-6"] },
  { id: "genies", name: "Les génies", color: "#22d3ee", tag: "Iron Man, Lex Luthor et Jérémie : le génie a ses armes.",
    stars: ["marvel-iron-man-7", "dc-lex-luthor-7", "lyoko-jeremie-belpois-7"], epics: ["dc-brainiac-6", "umbrella-reginald-hargreeves-6", "jojo-rohan-kishibe-6", "citesdor-ambrosius-6"] },
  { id: "masques", name: "Sous le masque", color: "#94a3b8", tag: "Batman, Char et le Mandalorien ne montrent jamais leur visage.",
    stars: ["dc-batman-7", "gundam-char-aznable-7", "sw-din-djarin-7"], epics: ["sw-boba-fett-6", "gundam-zechs-merquise-6", "gundam-rau-le-creuset-6", "lol-shen-6"] },
  { id: "couronnes", name: "Rois et reines", color: "#eab308", tag: "Daenerys, Aragorn et Jadis réclament leur trône.",
    stars: ["got-daenerys-targaryen-7", "lotr-aragorn-7-2", "narnia-jadis-7"], epics: ["got-rhaenyra-targaryen-6", "lotr-theoden-6", "marvel-fleche-noire-6", "got-sansa-stark-6"] },
  { id: "pirates", name: "Pirates et capitaines", color: "#0ea5e9", tag: "Luffy, Mendoza et Euron hissent les voiles.",
    stars: ["onepiece-monkey-d-luffy-7", "citesdor-mendoza-7", "got-euron-greyjoy-7"], epics: ["onepiece-dracule-mihawk-6", "got-yara-greyjoy-5", "sw-han-solo-6", "onepiece-portgas-d-ace-5"] },
  { id: "nuit", name: "Créatures de la nuit", color: "#e11d48", tag: "Dio, Scott McCall et Darkrai sortent quand le soleil se couche.",
    stars: ["jojo-dio-brando-7", "teenwolf-scott-mccall-7", "pokemon-darkrai-7"], epics: ["teenwolf-deucalion-6", "teenwolf-le-nogitsune-6", "jojo-kars-5", "pokemon-ectoplasma-6"] },
  { id: "foret", name: "Esprits de la forêt", color: "#22c55e", tag: "Totoro, Zyra et Florizarre : la forêt se réveille.",
    stars: ["ghibli-totoro-7", "lol-zyra-7", "pokemon-florizarre-7"], epics: ["lotr-sylvebarbe-6", "ghibli-san-6", "lotr-tom-bombadil-5", "lol-nidalee-4"] },
  { id: "rebelles", name: "Les rebelles", color: "#f43f5e", tag: "Katniss, Sylas et Leia se lèvent contre le pouvoir.",
    stars: ["hunger-katniss-everdeen-7", "lol-sylas-7", "sw-leia-organa-7"], epics: ["lol-jinx-5", "got-mance-rayder-6", "sw-ahsoka-tano-5", "gundam-orga-itsuka-4"] },
  { id: "cosmos", name: "Dieux et cosmos", color: "#a855f7", tag: "Thanos, Darkseid et Arceus règnent sur l'univers.",
    stars: ["marvel-thanos-7", "dc-darkseid-7", "pokemon-arceus-7"], epics: ["marvel-le-surfer-d-argent-6", "dc-sinestro-6", "legendaires-kalandre-6", "lol-bard-6"] },
];

/** Familles du Monde à l'honneur, dans l'ordre (les nouvelles familles s'ajoutent à la fin ; Star Academy n'est jamais mise en avant). */
const MONDE_FIRST = ["jojo", "onepiece", "hp", "sw", "marvel", "pokemon", "lotr", "got", "dc", "lyoko", "lol", "gundam", "ghibli", "stranger",
  "scooby", "narnia", "toystory", "umbrella", "hunger", "bebop", "teenwolf", "legendaires", "capes", "citesdor", "horde", "elite"];
const NEVER = new Set(["starac"]);
export const MONDES = [...MONDE_FIRST.filter((f) => FAMILY[f]), ...PLAYABLE.map((f) => f.id).filter((f) => !MONDE_FIRST.includes(f) && !NEVER.has(f))];

const collectible = (d) => d.type !== "plot" && !d.st;
/** Cartes 7 d'une famille (elles peuvent toutes sortir du Monde à l'honneur). */
export const famSevens = (fam) => ALL.filter((d) => d.fam === fam && collectible(d) && d.cost >= 7).map((d) => d.id);
/** Nombre de vedettes du Monde à l'honneur selon le nombre de cartes 7 de la famille : 3 pour une grande famille (8 ou plus), 2 (4 à 7), 1 (3 ou moins). */
export const starCount = (n) => (n >= 8 ? 3 : n >= 4 ? 2 : 1);
/** Vedettes du Monde à l'honneur la première fois que la famille passe (ensuite, ses autres cartes 7 prennent la suite). */
export const MONDE_STARS = {
  jojo: ["jojo-jotaro-kujo-7-2", "jojo-dio-brando-7-2", "jojo-giorno-giovanna-7-2"],
  onepiece: ["onepiece-monkey-d-luffy-7", "onepiece-shanks-7", "onepiece-roronoa-zoro-7"],
  hp: ["hp-harry-potter-7-2", "hp-severus-rogue-7", "hp-lord-voldemort-7-2"],
  sw: ["sw-yoda-7", "sw-dark-vador-7-2", "sw-rey-7"],
  marvel: ["marvel-thor-7", "marvel-captain-america-7", "marvel-spider-man-7"],
  pokemon: ["pokemon-pikachu-7", "pokemon-mewtwo-7-2", "pokemon-rayquaza-7"],
  lotr: ["lotr-aragorn-7", "lotr-galadriel-7", "lotr-gandalf-7"],
  got: ["got-jon-snow-7", "got-arya-stark-7-2", "got-cersei-lannister-7"],
  dc: ["dc-wonder-woman-7", "dc-flash-7", "dc-batman-7-2"],
  lyoko: ["lyoko-aelita-hopper-7-2", "lyoko-xana-7", "lyoko-ulrich-stern-7"],
  lol: ["lol-darius-7", "lol-viktor-7", "lol-veigar-7"],
  gundam: ["gundam-amuro-ray-7-2", "gundam-kira-yamato-7-2", "gundam-setsuna-f-seiei-7"],
  ghibli: ["ghibli-totoro-7-2", "ghibli-nausicaa-7"],
  stranger: ["stranger-onze-7", "stranger-vecna-7"],
  scooby: ["scooby-scooby-doo-7-2", "scooby-sammy-rogers-7", "scooby-vera-dinkley-7"],
  narnia: ["narnia-aslan-7-2"],
  toystory: ["toystory-woody-7-2", "toystory-buzz-l-eclair-7-2"],
  umbrella: ["umbrella-viktor-hargreeves-7", "umbrella-allison-hargreeves-7"],
  hunger: ["hunger-katniss-everdeen-7-2", "hunger-president-snow-7"],
  bebop: ["bebop-spike-spiegel-7"],
  teenwolf: ["teenwolf-derek-hale-7"],
  legendaires: ["legendaires-danael-7", "legendaires-darkhell-7"],
  capes: ["capes-armand-raynal-de-maupertuis-7"],
  citesdor: ["citesdor-esteban-7"],
  horde: ["horde-golgoth-7"],
  elite: ["elite-guzman-7"],
};
/**
 * Vedettes du Monde à l'honneur pour le cycle n (0 : premier passage de la famille) : starCount() cartes 7 de personnages différents,
 * d'abord celles de MONDE_STARS, puis les autres cartes 7 de la famille, à tour de rôle d'un passage à l'autre.
 */
export function mondeStars(fam, cycle = 0) {
  const all = famSevens(fam);
  if (!all.length) return [];
  const k = Math.min(3, starCount(all.length), all.length);
  const first = (MONDE_STARS[fam] || []).filter((id) => all.includes(id));
  const order = [...first, ...all.filter((id) => !first.includes(id))];
  const out = [];
  const name = (id) => ALL.find((d) => d.id === id).name;
  for (let i = 0; out.length < k && i < order.length; i++) {
    const id = order[(((cycle * k) % order.length) + i) % order.length];
    if (!out.some((x) => name(x) === name(id))) out.push(id);
  }
  for (let i = 0; out.length < k && i < order.length; i++) if (!out.includes(order[i])) out.push(order[i]);
  return out;
}

/* ------------------------------ calendrier ------------------------------ */
const dayNum = (day) => { const [y, m, d] = String(day).split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
const dayStr = (n) => { const d = new Date(n * 86400000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };
const START = dayNum(PORTAL_START);
const mod = (a, n) => ((a % n) + n) % n;
/** Numéro de la période de deux semaines d'un jour ("2026-11-15" → 0). */
export const periodOf = (day) => Math.floor((dayNum(day) - START) / PORTAL_DAYS);
/** Premier et dernier jour d'une période. */
export const periodDays = (p) => ({ from: dayStr(START + p * PORTAL_DAYS), to: dayStr(START + (p + 1) * PORTAL_DAYS - 1) });

/** Les deux portails d'une période : { p, from, to, leg, monde }. */
export function portalsAt(p) {
  const th = LEGENDS[mod(p, LEGENDS.length)];
  const fam = MONDES[mod(p, MONDES.length)];
  const f = FAMILY[fam];
  return {
    p, ...periodDays(p),
    leg: { kind: "leg", id: th.id, name: "Portail des Légendes", sub: th.name, tag: th.tag, color: th.color, stars: [...th.stars], epics: [...th.epics] },
    monde: { kind: "monde", id: `${fam}:${Math.floor(p / MONDES.length)}`, fam, name: "Monde à l'honneur", sub: f.name, tag: f.desc || "", color: f.color,
      stars: mondeStars(fam, Math.floor(p / MONDES.length)), sevens: famSevens(fam).length, epics: [] },
  };
}
/** Les portails ouverts ce jour-là. */
export const portalsOf = (day) => portalsAt(periodOf(day));
/** Temps restant (ms) avant que les portails changent : minuit après le dernier jour de la période. */
export function msToPortalChange(now = new Date()) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [y, m, d] = periodDays(periodOf(day)).to.split("-").map(Number);
  return new Date(y, m - 1, d + 1, 0, 0, 0, 0) - now;
}
