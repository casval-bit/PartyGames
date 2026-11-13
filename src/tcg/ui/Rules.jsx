// Règles du Trône des Mondes, en bref (pour des amis qui n'ont jamais joué au Trône de Fer).
import { KEYWORDS, DECK_RULES as R } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";

export default function Rules({ onClose }) {
  return (
    <div className="tz-wrap" role="dialog" aria-label="Règles" onClick={onClose}>
      <button className="iconbtn tz-close" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
      <div className="tz-info" onClick={(e) => e.stopPropagation()} style={{ paddingTop: 30 }}>
        <h2>Comment on joue</h2>
        <div className="tz-box">
          <h4>Le but</h4>
          <p style={{ margin: 0 }}>Être le premier à réunir le <b>Pouvoir</b> demandé (15, ou 10 en partie rapide). On en gagne en remportant des défis, la Domination, et avec certains effets. De 2 à 4 joueurs.</p>
        </div>
        <div className="tz-box">
          <h4>Un round = 7 phases</h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            <li><b>Scénario</b> : chacun révèle en même temps un de ses 7 Scénarios. Il donne l'<b>or</b> du round, l'<b>initiative</b> (la plus haute choisit le premier joueur), la <b>revendication</b> et la <b>réserve</b>.</li>
            <li><b>Pioche</b> : 2 cartes chacun.</li>
            <li><b>Recrutement</b> : chacun à son tour dépense son or pour poser personnages, lieux et objets.</li>
            <li><b>Défis</b> : chacun à son tour peut lancer un défi de chaque type contre un adversaire.</li>
            <li><b>Domination</b> : force des personnages debout + or restant ; le plus fort gagne 1 Pouvoir.</li>
            <li><b>Redressement</b> : toutes les cartes se relèvent.</li>
            <li><b>Taxe</b> : l'or restant est perdu ; on ne garde en main que sa réserve.</li>
          </ol>
        </div>
        <div className="tz-box">
          <h4>Les défis</h4>
          <p style={{ margin: 0 }}>Un personnage ne peut attaquer ou défendre que s'il a l'<b>icône</b> du défi. Attaquer et défendre <b>agenouille</b> (il ne pourra plus servir ce round). On compare les forces : l'attaquant gagne à égalité, sauf à 0.</p>
          <p style={{ margin: 0 }}><b>Combat</b> : le perdant tue autant de ses personnages que la revendication. <b>Ruse</b> : il défausse des cartes de sa main au hasard. <b>Influence</b> : le gagnant lui prend du Pouvoir.</p>
          <p style={{ margin: 0 }}>Gagner un défi sans aucun défenseur : <b>+1 Pouvoir</b> en plus.</p>
        </div>
        <div className="tz-box">
          <h4>Personnages uniques</h4>
          <p style={{ margin: 0 }}>Un personnage unique n'existe qu'une fois en jeu ; un exemplaire en plus devient un <b>doublon</b> qui le sauve d'une mort. Un unique mort ne revient jamais.</p>
        </div>
        <div className="tz-box tz-kw">
          <h4>Mots-clés</h4>
          {Object.values(KEYWORDS).map((k) => <div key={k.name}><b>{k.name}</b> : {k.text}</div>)}
        </div>
        <div className="tz-box">
          <h4>Construire un deck</h4>
          <p style={{ margin: 0 }}>{R.size} cartes et {R.plots} Scénarios différents. {R.maxCopies} exemplaires au plus par carte, mais <b>une carte 7 est unique : un seul exemplaire</b>. <b>Une seule version par personnage</b> (sa version 5 ou sa version 7, pas les deux). Au plus {R.cost7} cartes de coût 7 ou plus, {R.cost6} de coût 6, {R.cost5} de coût 5. Au moins {R.minChars} personnages, au plus {R.maxObjEvt} objets et événements, {R.maxLocs} lieux. Jusqu'à {R.maxAlliance} cartes d'une famille alliée (sauf les cartes Fidèles). Les cartes Neutres vont partout.</p>
        </div>
      </div>
    </div>
  );
}
