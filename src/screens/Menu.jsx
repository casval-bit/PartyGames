import { useState } from "react";
import { ONLINE } from "../config.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Icon } from "../ui/Icon.jsx";
import { progressOf } from "../data/profile.js";

export default function Menu({ name, setName, notice, clearNotice, busy, onCreate, onJoinList, look, level, xp, onProfile, onStudio, acc, onAccount, onLab, onTrone }) {
  const [roomName, setRoomName] = useState("");
  const clean = name.trim();
  const pr = progressOf(xp || 0);
  return (
    <div className="screen menu">
      <div className="row spread">
        <div className="brand">
          <span className="brandmark" aria-hidden="true"><Icon name="scan" size={20} /></span>
          <h1>PARTY <b>HUB</b></h1>
        </div>
        <span className={"chip" + (ONLINE ? "" : " local")} title={ONLINE ? "Connecté à Supabase" : "Mode local : plusieurs onglets du même navigateur"}>
          <i />{ONLINE ? "En ligne" : "Mode local"}
        </span>
      </div>

      {notice && (
        <div className="toast" role="alert">
          <span>{notice}</span>
          <button className="iconbtn" onClick={clearNotice} aria-label="Fermer"><Icon name="close" size={18} /></button>
        </div>
      )}

      <div className="scroll menu-main">
        {/* carte d'identité : on touche pour le profil, le bouton pour personnaliser */}
        <div className="idmini">
          <button className="idmini-av scanv" onClick={onStudio || onProfile} aria-label="Personnaliser mon personnage" data-testid="menu-studio">
            <Avatar look={look} size={72} view="bust" />
          </button>
          <button className="idmini-txt" onClick={onProfile} aria-label="Mon profil">
            <span className="eyebrow">Carte d'identité</span>
            <strong>{clean || "Joueur"}</strong>
            <span className="idmini-lv"><span className="pill">Niveau {level}</span><span className="muted">{pr.max ? "max" : `${pr.into}/${pr.need} XP`}</span></span>
            <span className="bar2 blue" aria-hidden="true"><i style={{ width: `${Math.round((100 * pr.into) / pr.need)}%` }} /></span>
          </button>
          <button className="iconbtn" onClick={onProfile} aria-label="Stats et succès"><Icon name="chart" /></button>
        </div>
        {acc && acc.enabled && (
          <button className={"profbtn accbtn" + (acc.user ? " in" : "")} onClick={onAccount} data-testid="menu-account">
            <span className="accdot" aria-hidden="true"><Icon name={acc.user ? "check" : "mail"} size={18} /></span>
            <span><strong>{acc.user ? "Compte connecté" : "Se connecter"}</strong><small>{acc.user ? acc.user.email : "Sauvegarde ton niveau et ton personnage avec ton e-mail"}</small></span>
            <Icon name="next" />
          </button>
        )}
        <div className="field">
          <label className="eyebrow" htmlFor="pseudo">Ton pseudo</label>
          <input id="pseudo" value={name} maxLength={16} placeholder="Ex. Brice" autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="eyebrow" htmlFor="roomname">Nom du lobby (facultatif)</label>
          <input id="roomname" value={roomName} maxLength={24} placeholder={clean ? `Salon de ${clean}` : "Salon"} autoComplete="off" onChange={(e) => setRoomName(e.target.value)} />
        </div>
        <button className="bigbtn a" disabled={!clean || busy} onClick={() => onCreate(roomName.trim())} style={{ opacity: clean ? 1 : 0.45 }}>
          <span className="bigico" aria-hidden="true"><Icon name="plus" size={26} /></span>
          <strong>Créer une partie</strong>
          <span>Tu deviens le créateur du lobby</span>
        </button>
        <button className="bigbtn b" disabled={!clean || busy} onClick={onJoinList} style={{ opacity: clean ? 1 : 0.45 }}>
          <span className="bigico" aria-hidden="true"><Icon name="radar" size={26} /></span>
          <strong>Rejoindre une partie</strong>
          <span>Voir les lobbys ouverts autour de toi</span>
        </button>
        {onTrone && (
          <button className="bigbtn d" data-testid="menu-trone" onClick={onTrone}>
            <span className="bigico" aria-hidden="true"><Icon name="crown" size={26} /></span>
            <strong>Trône des Mondes</strong>
            <span>Tes cartes : decks, boosters, boutique, quêtes</span>
          </button>
        )}
        {onLab && (
          <button className="bigbtn c" data-testid="menu-lab" onClick={onLab}>
            <span className="bigico" aria-hidden="true"><Icon name="gamepad" size={26} /></span>
            <strong>Salle d'arcade</strong>
            <span>Tous les mini-jeux, seul contre des bots</span>
          </button>
        )}
      </div>
    </div>
  );
}
