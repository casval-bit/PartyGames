// Accueil du Trône des Mondes : un écran de jeu épuré, façon lobby de jeu de cartes. En haut, la photo de profil du jeu,
// le niveau, les boosters et les Éclats ; au centre, la vitrine du deck joué ; en bas, les boutons vers chaque partie
// (profil, decks, collection, album, boutique, quêtes) et les deux grandes actions : Jouer et Boosters.
import { useMemo } from "react";
import { CARD, FAMILY, subOf } from "../cards/index.js";
import { RARITY_ORDER } from "../rules.js";
import { validateDeck } from "../deck.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { CardFace } from "./Card.jsx";
import Portrait from "./Portrait.jsx";

const SHOP_KEY = "ph-tcg-shop-seen";
/** La boutique du jour a-t-elle été ouverte aujourd'hui sur cet appareil ? (pastille « nouveau ») */
export const shopSeenToday = () => { try { return localStorage.getItem(SHOP_KEY) === P.today(); } catch { return true; } };
export const markShopSeen = () => { try { localStorage.setItem(SHOP_KEY, P.today()); } catch { /* stockage indisponible */ } };

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

/** Les trois personnages les plus forts du deck joué (deux versions d'un même personnage ne comptent qu'une fois). */
function showcase(t) {
  const deck = t.decks.find((d) => d.id === t.sel) || t.decks[0] || null;
  if (!deck) return { deck: null, ids: [] };
  const ids = Object.keys(deck.cards).filter((id) => CARD[id] && CARD[id].type === "char")
    .sort((a, b) => CARD[b].cost - CARD[a].cost || RARITY_ORDER.indexOf(CARD[b].r) - RARITY_ORDER.indexOf(CARD[a].r) || a.localeCompare(b));
  const out = [], keys = new Set();
  for (const id of ids) { const k = CARD[id].key || id; if (keys.has(k)) continue; keys.add(k); out.push(id); if (out.length === 3) break; }
  return { deck, ids: out };
}

export default function HubHome({ t, own, name, go, onClose, onPlay, inRoom, onSettings, onZoom, onAlbum, nPacks, nQuests }) {
  const lv = P.levelOf(t.xp);
  const { deck, ids } = useMemo(() => showcase(t), [t]);
  const v = deck ? validateDeck(deck, own) : null;
  const f = deck ? FAMILY[deck.fam] : null;
  const sub = deck ? subOf(deck.fam, deck.pt) : null;
  const nFr = P.newFrames(t).length;
  const nav = [
    { id: "profile", label: "Profil", icon: "user", badge: nFr ? "!" : null },
    { id: "decks", label: "Decks", icon: "layers", badge: P.playableDeck(t) ? null : "!" },
    { id: "coll", label: "Collection", icon: "library" },
    { id: "album", label: "Album", icon: "grid" },
    { id: "shop", label: "Boutique", icon: "store", badge: shopSeenToday() ? null : "•" },
    { id: "quests", label: "Quêtes", icon: "trophy", badge: nQuests || null },
  ];
  return (
    <div className="hh" data-testid="hub-home">
      <header className="hh-top">
        <button className="iconbtn" onClick={onClose} aria-label={inRoom ? "Retour au lobby" : "Retour au menu"}><Icon name="back" /></button>
        <button className="hh-me" onClick={() => go("profile")} aria-label="Mon profil du Trône des Mondes">
          <Portrait id={P.avatarOf(t)} frame={P.frameOf(t)} size={54} />
          <span className="hh-me-txt">
            <b>{name || "Joueur"}</b>
            <span className="hh-lv"><em>Niv. {lv.lvl}</em><span className="bar2 gold"><i style={{ width: `${(100 * lv.cur) / lv.need}%` }} /></span></span>
          </span>
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

      <section className="hh-stage" aria-label="Vitrine du deck joué">
        {ids.length > 0 ? (
          <div className="hh-show" style={f ? { "--fc": sub ? sub.color : f.color } : undefined}>
            {ids.map((id, i) => (
              <div key={id} className={"hh-slot s" + i}>
                <CardFace d={CARD[id]} foil={(t.foil[id] || 0) > 0} onClick={() => onZoom(id)} />
              </div>
            ))}
            <i className="hh-pedestal" aria-hidden="true" />
          </div>
        ) : <div className="hh-empty">Aucun personnage dans ton deck.</div>}
        <div className="hh-deck">
          {deck ? (
            <>
              <span className="hub-fam" style={{ "--fc": sub ? sub.color : f.color }}><Icon name={f.icon} size={20} /></span>
              <span className="hh-deck-t"><small>Deck joué</small><b>{deck.name}</b></span>
              {v && v.ok ? <span className="pill ok">Prêt</span> : <span className="pill pink">À compléter</span>}
              <button className="btn small ghost" onClick={() => go("decks")}><Icon name="swap" size={16} />Changer</button>
            </>
          ) : <button className="btn small" onClick={() => go("decks")}><Icon name="plus" size={16} />Créer un deck</button>}
        </div>
      </section>

      <nav className="hh-nav" aria-label="Trône des Mondes">
        {nav.map((n) => (
          <button key={n.id} className={"hh-nav-b n-" + n.id} onClick={() => (n.id === "album" ? onAlbum() : go(n.id))} data-testid={"hub-nav-" + n.id}>
            <span className="hh-nav-i"><Icon name={n.icon} size={26} stroke={1.7} />{n.badge && <i className="hh-badge">{n.badge}</i>}</span>
            <span className="hh-nav-l">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="hh-acts">
        <button className="hh-act play" onClick={onPlay} data-testid="hub-play">
          <span className="hh-act-i"><Icon name="swords" size={28} stroke={1.8} /></span>
          <span className="hh-act-t"><b>Jouer</b><small>{inRoom ? "Retour au lobby" : "Créer un lobby"}</small></span>
          <Icon name="next" size={22} className="hh-act-go" />
        </button>
        <button className="hh-act packs" onClick={() => go("packs")} data-testid="hub-boosters">
          <span className="hh-act-i"><Icon name="gift" size={28} stroke={1.8} />{nPacks > 0 && <i className="hh-badge">{nPacks}</i>}</span>
          <span className="hh-act-t"><b>Boosters</b><small>{nPacks ? `${nPacks} à ouvrir` : "En acheter"}</small></span>
          <Icon name="next" size={22} className="hh-act-go" />
        </button>
      </div>
    </div>
  );
}
