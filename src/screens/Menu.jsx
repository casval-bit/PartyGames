import { useState } from "react";
import { HourglassMark } from "../ui/parts.jsx";
import { ONLINE } from "../config.js";
import { Avatar } from "../ui/Avatar.jsx";

export default function Menu({ name, setName, notice, clearNotice, busy, onCreate, onJoinList, look, level, onProfile }) {
  const [roomName, setRoomName] = useState("");
  const clean = name.trim();
  return (
    <div className="screen">
      <div className="row spread">
        <div className="brand">
          <HourglassMark size={36} />
          <h1>PARTY <b>HUB</b></h1>
        </div>
        <span className={"chip" + (ONLINE ? "" : " local")} title={ONLINE ? "Connecté à Supabase" : "Mode local : plusieurs onglets du même navigateur"}>
          <i />{ONLINE ? "En ligne" : "Mode local"}
        </span>
      </div>

      {notice && (
        <div className="toast" role="alert">
          <span>{notice}</span>
          <button className="iconbtn" onClick={clearNotice} aria-label="Fermer">✕</button>
        </div>
      )}

      <div className="menu-main">
        <button className="profbtn" onClick={onProfile} aria-label="Mon profil">
          <Avatar look={look} size={44} />
          <span><strong>Mon profil</strong><small>Niveau {level} · avatar, stats et succès</small></span>
          <i aria-hidden="true">›</i>
        </button>
        <div className="field">
          <label className="eyebrow" htmlFor="pseudo">Ton pseudo</label>
          <input id="pseudo" value={name} maxLength={16} placeholder="Ex. Brice" autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="eyebrow" htmlFor="roomname">Nom du lobby (facultatif)</label>
          <input id="roomname" value={roomName} maxLength={24} placeholder={clean ? `Salon de ${clean}` : "Salon"} autoComplete="off" onChange={(e) => setRoomName(e.target.value)} />
        </div>
        <button className="bigbtn a" disabled={!clean || busy} onClick={() => onCreate(roomName.trim())} style={{ opacity: clean ? 1 : .45 }}>
          <strong>Créer une partie</strong>
          <span>Tu deviens le créateur du lobby</span>
        </button>
        <button className="bigbtn b" disabled={!clean || busy} onClick={onJoinList} style={{ opacity: clean ? 1 : .45 }}>
          <strong>Rejoindre une partie</strong>
          <span>Voir les lobbys ouverts autour de toi</span>
        </button>
      </div>
    </div>
  );
}
