// Les règles de Heavy is the Crown en plusieurs pages (bouton « ? » du lobby et de l'accueil) : des onglets en haut,
// les boutons < et > (ou les flèches du clavier) pour passer d'une page à l'autre, Échap pour fermer.
// Écrit pour des amis qui n'ont jamais joué au jeu de cartes du Trône de Fer.
import { useEffect, useState } from "react";
import { KEYWORDS, DECK_RULES as R, TYPE_NAME, GAME_NAME, DEFAULT_GOAL } from "../rules.js";
import { CARD } from "../cards/index.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";

const PHASE_STEPS = [
  ["scroll", "Scénario", "Chacun révèle en même temps un de ses 7 scénarios : il donne l'or du round, l'initiative (la plus haute choisit qui joue en premier), la revendication et la réserve."],
  ["layers", "Pioche", "Chacun pioche 2 cartes."],
  ["coins", "Recrutement", "À tour de rôle, on dépense son or pour poser des personnages, des lieux et des objets."],
  ["swords", "Défis", "À tour de rôle, chacun peut lancer un défi de chaque type (Combat, Ruse, Influence) contre un adversaire."],
  ["crown", "Domination", "On compte la force des personnages debout + l'or qui reste : le plus fort gagne 1 Pouvoir."],
  ["reset", "Redressement", "Toutes les cartes agenouillées se relèvent."],
  ["hourglass", "Taxe", "L'or qui reste est perdu ; on ne garde en main que sa réserve (le surplus est défaussé)."],
];
const EXAMPLE = "dc-superman-7";

function Goal() {
  return (
    <>
      <p className="rg-lead">Sois le premier à réunir <b>{DEFAULT_GOAL} Pouvoir</b> (ou 10 en partie rapide). De 2 à 4 joueurs.</p>
      <div className="rg-grid">
        <div className="rg-tile"><Icon name="trophy" size={22} /><b>Gagner des défis</b><span>Un défi gagné sans aucun défenseur : +1 Pouvoir. Les personnages <b>Célèbres</b> en gagnent 1 de plus.</span></div>
        <div className="rg-tile"><Icon name="crown" size={22} /><b>La Domination</b><span>À la fin de chaque round, le joueur le plus fort sur la table gagne 1 Pouvoir.</span></div>
        <div className="rg-tile"><Icon name="handcoins" size={22} /><b>L'Influence</b><span>Gagner un défi d'Influence prend du Pouvoir à l'adversaire.</span></div>
        <div className="rg-tile"><Icon name="sparkles" size={22} /><b>Les effets</b><span>Certaines cartes rapportent du Pouvoir : lis bien leurs textes.</span></div>
      </div>
      <p className="muted rg-note">La partie s'arrête aussi après 20 rounds : le plus de Pouvoir gagne.</p>
    </>
  );
}
function Round() {
  return (
    <ol className="rg-phases">
      {PHASE_STEPS.map(([ic, name, txt], i) => (
        <li key={name}><span className="rg-ph-i"><Icon name={ic} size={18} /><em>{i + 1}</em></span><span><b>{name}</b><small>{txt}</small></span></li>
      ))}
    </ol>
  );
}
function Cards() {
  const d = CARD[EXAMPLE];
  return (
    <div className="rg-anat">
      {d && <div className="rg-card"><CardFace d={d} w={190} /></div>}
      <ul className="rg-list">
        <li><b>Coût</b> (en haut à gauche) : l'or à payer pour la poser. Les cartes 7 sont les plus puissantes : <b>une seule</b> par deck.</li>
        <li><b>Force</b> : ce qu'un personnage compte dans un défi et à la Domination.</li>
        <li><b>Icônes</b> : {Object.values(TYPE_NAME).join(", ")}. Un personnage ne participe qu'aux défis dont il a l'icône.</li>
        <li><b>Traits</b> (sous l'image) : Kryptonien, Jedi, Pokémon… D'autres cartes s'y réfèrent.</li>
        <li><b>Personnage unique</b> : un seul exemplaire en jeu. Un deuxième devient un <b>doublon</b> glissé dessous, qui le sauve une fois de la mort. Un unique mort ne revient jamais.</li>
        <li><b>Lieux</b> et <b>objets</b> restent en jeu ; les <b>événements</b> se jouent une fois, puis vont à la défausse.</li>
      </ul>
    </div>
  );
}
function Challenges() {
  return (
    <>
      <div className="rg-steps">
        <div><em>1</em><b>Attaquer</b><span>Choisis un type de défi et un adversaire, puis tes attaquants (avec l'icône du défi). Ils s'<b>agenouillent</b> : ils ne serviront plus ce round.</span></div>
        <div><em>2</em><b>Défendre</b><span>L'adversaire choisit ses défenseurs (avec la même icône) ; eux aussi s'agenouillent. Il peut ne pas défendre.</span></div>
        <div><em>3</em><b>Comparer</b><span>On additionne les forces. L'attaquant gagne à égalité, sauf si les deux font 0. Des événements peuvent tout changer.</span></div>
      </div>
      <div className="rg-grid">
        <div className="rg-tile c"><Icon name="sword" size={22} /><b>Combat</b><span>Le perdant tue autant de ses personnages que la revendication du scénario du gagnant.</span></div>
        <div className="rg-tile r"><Icon name="mask" size={22} /><b>Ruse</b><span>Le perdant défausse des cartes de sa main au hasard.</span></div>
        <div className="rg-tile i"><Icon name="crown" size={22} /><b>Influence</b><span>Le gagnant prend du Pouvoir au perdant.</span></div>
      </div>
    </>
  );
}
function Keywords() {
  return <div className="rg-kw">{Object.values(KEYWORDS).map((k) => <div key={k.name}><b>{k.name}</b><span>{k.text}</span></div>)}</div>;
}
function Deck() {
  const rules = [
    [`${R.size} cartes`, `et ${R.plots} scénarios différents`],
    [`${R.maxCopies} exemplaires`, "au plus par carte ; une carte 7 : un seul"],
    ["Une version", "par personnage (sa version 5 ou sa version 7, pas les deux)"],
    [`${R.minChars} personnages`, "au moins"],
    [`${R.cost7} cartes 7`, `au plus ; ${R.cost6} de coût 6, ${R.cost5} de coût 5`],
    [`${R.maxObjEvt} objets et événements`, `au plus ; ${R.maxLocs} lieux au plus`],
  ];
  return (
    <>
      <p className="rg-lead">Mélange <b>toutes les familles</b> comme tu veux : DC avec Star Wars, Pokémon avec Harry Potter… Seules ces règles comptent.</p>
      <div className="rg-rules">{rules.map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div>
      <p className="muted rg-note">Ta « carte de famille » (la famille la plus présente de ton deck) n'a aucun effet, comme la carte de faction du Trône de Fer : le Pouvoir gagné s'y pose. Les decks de départ sont prêts à jouer ; ensuite, tu crées les tiens dans « Mes decks ».</p>
    </>
  );
}
function Lobby() {
  return (
    <div className="rg-steps">
      <div><em>1</em><b>Le salon</b><span>« Créer le salon » donne un code de 6 lettres : envoie-le à tes amis, ils le tapent dans « Rejoindre ».</span></div>
      <div><em>2</em><b>Les amis</b><span>Connecté à ton compte, ajoute tes amis par pseudo ou par code ami, vois qui est en ligne et invite-les d'un clic.</span></div>
      <div><em>3</em><b>Les bots</b><span>Le créateur peut remplir les places libres avec des bots, pour s'entraîner ou compléter la table.</span></div>
      <div><em>4</em><b>C'est parti</b><span>Chacun choisit son deck, le créateur règle l'objectif et le temps de réflexion, puis lance. Si quelqu'un part, l'ordinateur joue à sa place.</span></div>
    </div>
  );
}

const PAGES = [
  { id: "but", icon: "trophy", name: "Le but", C: Goal },
  { id: "round", icon: "history", name: "Un round", C: Round },
  { id: "cartes", icon: "layers", name: "Les cartes", C: Cards },
  { id: "defis", icon: "swords", name: "Les défis", C: Challenges },
  { id: "mots", icon: "tag", name: "Mots-clés", C: Keywords },
  { id: "deck", icon: "library", name: "Ton deck", C: Deck },
  { id: "lobby", icon: "users", name: "Jouer à plusieurs", C: Lobby },
];

export default function RulesGuide({ onClose, start = 0 }) {
  const [i, setI] = useState(start);
  const go = (n) => { const k = Math.max(0, Math.min(PAGES.length - 1, n)); if (k !== i) { setI(k); sfx.select(); } };
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const pg = PAGES[i];
  return (
    <div className="rg-wrap" role="dialog" aria-label={`Règles de ${GAME_NAME}`} onClick={onClose} data-testid="rules-guide">
      <div className="rg" onClick={(e) => e.stopPropagation()}>
        <header className="rg-head">
          <span className="rg-head-i" aria-hidden="true"><Icon name="book" size={18} /></span>
          <div className="grow"><small>Règles de {GAME_NAME}</small><h2>{pg.name}</h2></div>
          <button className="iconbtn" onClick={onClose} aria-label="Fermer les règles" data-testid="rg-close"><Icon name="close" /></button>
        </header>
        <nav className="rg-tabs" role="tablist" aria-label="Pages des règles">
          {PAGES.map((p, k) => (
            <button key={p.id} role="tab" aria-selected={k === i} className={k === i ? "on" : k < i ? "seen" : ""} onClick={() => go(k)} data-testid={"rg-tab-" + p.id}>
              <Icon name={p.icon} size={15} /><span>{p.name}</span>
            </button>
          ))}
        </nav>
        <div className="rg-page" key={pg.id} role="tabpanel"><pg.C /></div>
        <footer className="rg-foot">
          <button className="btn rg-nav" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Page précédente" data-testid="rg-prev"><Icon name="back" size={20} /></button>
          <span className="rg-dots" aria-label={`Page ${i + 1} sur ${PAGES.length}`}>{PAGES.map((p, k) => <i key={p.id} className={k === i ? "on" : ""} />)}<em>{i + 1} / {PAGES.length}</em></span>
          {i < PAGES.length - 1
            ? <button className="btn primary rg-nav" onClick={() => go(i + 1)} aria-label="Page suivante" data-testid="rg-next"><Icon name="next" size={20} /></button>
            : <button className="btn primary" onClick={onClose} data-testid="rg-done"><Icon name="check" size={18} />Compris</button>}
        </footer>
      </div>
    </div>
  );
}
