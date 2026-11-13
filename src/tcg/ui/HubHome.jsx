// Accueil du Trône des Mondes, façon lobby de jeu de cartes :
//   - en haut : la photo de profil du jeu (bouton Profil), les boosters, les Éclats et les paramètres ;
//   - au centre : le plateau de jeu en 3D isométrique (HubBoard), posé avec le deck joué ;
//   - à gauche, « Tes cartes » : Mes decks (créer, choisir), Mes cartes (celles que tu possèdes), Album (toutes les cartes du jeu) ;
//   - à droite, « Boosters et défis » : Boosters, Boutique du jour, Quêtes ;
//   - en bas, au centre : Jouer, et le deck joué (Changer).
import { useEffect, useState } from "react";
import { ALL, FAMILY, subOf } from "../cards/index.js";
import { validateDeck } from "../deck.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import Portrait from "./Portrait.jsx";
import HubBoard from "./HubBoard.jsx";

const SHOP_KEY = "ph-tcg-shop-seen";
/** La boutique du jour a-t-elle été ouverte aujourd'hui sur cet appareil ? (pastille « nouveau ») */
export const shopSeenToday = () => { try { return localStorage.getItem(SHOP_KEY) === P.today(); } catch { return true; } };
export const markShopSeen = () => { try { localStorage.setItem(SHOP_KEY, P.today()); } catch { /* stockage indisponible */ } };
const fmtLeft = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`; };

/** Boosters à ouvrir et Éclats (la monnaie, le diamant) : en haut de l'accueil et de chaque partie du Trône des Mondes. */
export function HubCurrencies({ t, go, nPacks }) {
  return (
    <div className="hh-curs">
      <button className="hh-cur packs" onClick={() => go("packs")} title="Boosters à ouvrir" aria-label={`Boosters : ${nPacks} à ouvrir`}>
        <Icon name="gift" size={18} /><b>{nPacks}</b>
      </button>
      <button className="hh-cur ec" onClick={() => go("shop")} title="Éclats, la monnaie du jeu : boutique du jour et boosters" aria-label={`${t.ec} Éclats, ouvrir la boutique`}>
        <Icon name="gem" size={18} /><b>{t.ec.toLocaleString("fr-FR")}</b><span className="plus" aria-hidden="true"><Icon name="plus" size={13} stroke={2.4} /></span>
      </button>
    </div>
  );
}

/** Un bouton de partie : icône, nom, ce qu'on y fait, pastille éventuelle. */
/** Bouton d'une partie : icône, nom et ce qu'on y fait (phrase complète sur grand écran, version courte sur téléphone). */
function Nav({ id, icon, label, labelShort, sub, short, badge, tone, onClick }) {
  return (
    <button className={"hh-nb" + (tone ? " " + tone : "")} onClick={onClick} data-testid={"hub-nav-" + id}>
      <span className="hh-nb-i"><Icon name={icon} size={24} stroke={1.7} />{badge ? <i className="hh-badge">{badge}</i> : null}</span>
      <span className="hh-nb-t"><b><span className="l">{label}</span><span className="s">{labelShort || label}</span></b><small><span className="l">{sub}</span><span className="s">{short || sub}</span></small></span>
      <Icon name="next" size={18} className="hh-nb-go" />
    </button>
  );
}

export default function HubHome({ t, own, name, go, onClose, onPlay, inRoom, onSettings, onZoom, onFamily, onAlbum, nPacks, nQuests, calm }) {
  const lv = P.levelOf(t.xp);
  const deck = t.decks.find((d) => d.id === t.sel) || t.decks[0] || null;
  const v = deck ? validateDeck(deck, own) : null;
  const f = deck ? FAMILY[deck.fam] : null;
  const sub = deck ? subOf(deck.fam, deck.pt) : null;
  const nFr = P.newFrames(t).length;
  const [left, setLeft] = useState(P.msToMidnight());
  useEffect(() => { const iv = setInterval(() => setLeft(P.msToMidnight()), 30000); return () => clearInterval(iv); }, []);
  const distinct = Object.keys(own).length;
  return (
    <div className="hh" data-testid="hub-home">
      <header className="hh-top">
        <button className="iconbtn" onClick={onClose} aria-label={inRoom ? "Retour au lobby" : "Retour au menu"}><Icon name="back" /></button>
        <button className="hh-me" onClick={() => go("profile")} aria-label="Mon profil du Trône des Mondes" title="Mon profil du jeu" data-testid="hub-nav-profile">
          <Portrait id={P.avatarOf(t)} frame={P.frameOf(t)} size={54} />
          <span className="hh-me-txt">
            <b>{name || "Joueur"}</b>
            <span className="hh-lv"><em>Niv. {lv.lvl}</em><span className="bar2 gold"><i style={{ width: `${(100 * lv.cur) / lv.need}%` }} /></span></span>
          </span>
          <span className="hh-me-go"><Icon name="idcard" size={16} />Profil</span>
          {nFr > 0 && <i className="hh-badge" aria-label="Nouveau cadre débloqué">!</i>}
        </button>
        <span className="grow" />
        <HubCurrencies t={t} go={go} nPacks={nPacks} />
        <button className="iconbtn" onClick={onSettings} aria-label="Paramètres du jeu" title="Paramètres du jeu" data-testid="hub-settings"><Icon name="settings" /></button>
      </header>

      <div className="hh-logo">
        <span className="hh-crest" aria-hidden="true"><Icon name="crown" size={22} stroke={1.8} /></span>
        <span><small>Jeu de cartes</small><b>Trône des Mondes</b></span>
      </div>

      <section className="hh-stage" aria-label="Plateau de jeu">
        <HubBoard deck={deck} foil={(id) => (t.foil[id] || 0) > 0} onZoom={onZoom} onFamily={onFamily} calm={calm} />
      </section>

      <aside className="hh-side l" aria-label="Tes cartes">
        <span className="hh-side-h"><Icon name="layers" size={14} />Tes cartes</span>
        <Nav id="decks" icon="layers" label="Mes decks" sub="Créer, modifier et choisir le deck que tu joues en partie" short="Créer, choisir"
          badge={P.playableDeck(t) ? null : "!"} onClick={() => go("decks")} />
        <Nav id="coll" icon="library" label="Mes cartes" sub={`Les ${distinct.toLocaleString("fr-FR")} cartes que tu possèdes : doubles à recycler, illustrations`}
          short={`Tes ${distinct.toLocaleString("fr-FR")} cartes`} onClick={() => go("coll")} />
        <Nav id="album" icon="grid" label="Album" sub={`Les ${ALL.length.toLocaleString("fr-FR")} cartes du jeu ; celles qui te manquent sont en gris`}
          short="Tout le jeu" onClick={onAlbum} />
      </aside>

      <aside className="hh-side r" aria-label="Boosters et défis">
        <span className="hh-side-h"><Icon name="sparkles" size={14} />Boosters et défis</span>
        <Nav id="packs" icon="gift" label="Boosters" sub={nPacks ? `${nPacks} à ouvrir ; d'autres s'achètent avec tes Éclats` : "En acheter avec tes Éclats : 5 cartes chacun"}
          short={nPacks ? `${nPacks} à ouvrir` : "En acheter"} badge={nPacks || null} tone="vio" onClick={() => go("packs")} />
        <Nav id="shop" icon="store" label="Boutique du jour" labelShort="Boutique" sub={`6 cartes à l'unité, contre des Éclats. Nouvelles dans ${fmtLeft(left)}`}
          short="6 cartes à l'unité" badge={shopSeenToday() ? null : "•"} onClick={() => go("shop")} />
        <Nav id="quests" icon="trophy" label="Quêtes et succès" labelShort="Quêtes" sub={nQuests ? `${nQuests} récompense${nQuests > 1 ? "s" : ""} à récupérer ; quêtes du jour, niveaux, succès` : "Quêtes du jour, niveaux et succès : XP, Éclats, boosters"}
          short={nQuests ? `${nQuests} à récupérer` : "Du jour, succès"} badge={nQuests || null} onClick={() => go("quests")} />
      </aside>

      <div className="hh-play">
        <button className="hh-act play" onClick={onPlay} data-testid="hub-play">
          <span className="hh-act-i"><Icon name="swords" size={28} stroke={1.8} /></span>
          <span className="hh-act-t"><b>Jouer</b><small>{inRoom ? "Retour au lobby" : "Créer un lobby"}</small></span>
          <Icon name="next" size={22} className="hh-act-go" />
        </button>
        {deck ? (
          <button className="hh-deck" onClick={() => go("decks")} title="Changer de deck">
            <span className="hub-fam" style={{ "--fc": sub ? sub.color : f.color }}><Icon name={f.icon} size={16} /></span>
            <span className="hh-deck-t"><small>Deck joué</small><b>{deck.name}</b></span>
            {v && v.ok ? <span className="pill ok">Prêt</span> : <span className="pill pink">À compléter</span>}
            <span className="hh-deck-go"><Icon name="swap" size={15} />Changer</span>
          </button>
        ) : <button className="btn small" onClick={() => go("decks")}><Icon name="plus" size={16} />Créer un deck</button>}
      </div>
    </div>
  );
}
