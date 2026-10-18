import { useState } from "react";
import { Fuse, GameCard } from "../ui/parts.jsx";
import { DISCARD_SECONDS } from "../config.js";
import { vibrate } from "../lib/util.js";

export default function Discard({ room, me, cards: dealt, api }) {
  const cards = dealt || [];
  const [sel, setSel] = useState([]);
  const meP = room.players.find((p) => p.id === me.id);
  const ready = Boolean(meP?.ready);

  const toggle = (id) => {
    if (ready) return;
    setSel((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : s;
      api.discard(next, false);
      return next;
    });
    vibrate(12);
  };
  const confirm = () => { api.discard(sel, true); vibrate(60); };

  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Défausse</div>
        <h2 style={{ fontSize: "1.2rem" }}>Retire 2 cartes · {sel.length}/2</h2>
        <p className="muted" style={{ fontSize: ".78rem", fontWeight: 700, marginTop: 2 }}>Ces {cards.length} cartes viennent du paquet commun. Après ça, tout est remélangé.</p>
      </div>
      <Fuse deadline={room.deadline} total={DISCARD_SECONDS} />
      <div className="scroll">
        <div className="dk">
          {cards.map((c, i) => {
            const picked = sel.includes(c.id);
            return <GameCard key={c.id} card={c} up i={i} className={"static" + (picked ? (ready ? " burn" : " pick") : "")} onClick={() => toggle(c.id)} />;
          })}
        </div>
        {ready && (
          <div className="waitlist">{room.players.map((p) => <span key={p.id} className={p.ready ? "ok" : ""}>{p.name}{p.ready ? " ✓" : ""}</span>)}</div>
        )}
      </div>
      {ready ? (
        <button className="btn" onClick={() => api.discard(sel, false)}>Modifier mon choix</button>
      ) : (
        <button className="btn good" disabled={sel.length !== 2} onClick={confirm}>{sel.length === 2 ? "Défausser ces 2 cartes" : "Choisis 2 cartes"}</button>
      )}
      <p className="muted" style={{ textAlign: "center", fontSize: ".8rem", fontWeight: 700 }}>Si le temps est écoulé, la défausse est tirée au sort.</p>
    </div>
  );
}
