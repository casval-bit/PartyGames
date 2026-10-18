import { CatBattery, playerColor } from "../ui/parts.jsx";
import { BY_ID } from "../data/categories.js";

export default function Reveal({ room, me }) {
  const rv = room.reveal || {};
  // pour chaque catégorie : une barre par vote, colorée par le joueur qui l'a posé (ordre d'arrivée)
  const byCat = {};
  for (const p of room.players) for (const id of rv[p.id] || []) (byCat[id] ||= []).push(playerColor(p.ci));
  const rows = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Révélation</div>
        <h2 style={{ fontSize: "1.4rem" }}>Qui a voté quoi ?</h2>
      </div>
      <div className="legend">
        {room.players.map((p) => (
          <span key={p.id} className="lg" style={{ "--pc": playerColor(p.ci) }}><i />{p.id === me.id ? "Toi" : p.name}</span>
        ))}
      </div>
      <div className="scroll">
        <div className="rgrid">
          {rows.map(([id, cells], k) => {
            const c = BY_ID[id];
            return (
              <div className="rcat" key={id} style={{ background: c.color, animationDelay: `${k * 120}ms` }}>
                <span className="n">{cells.length}</span>
                <span className="lbl">{c.label}</span>
                <CatBattery cells={cells} total={cells.length} delay={k * 120 + 250} />
              </div>
            );
          })}
        </div>
      </div>
      <p className="muted" style={{ textAlign: "center", fontWeight: 700 }}>{room.settings.game === "quiest" ? "La première image arrive…" : "Les boosters arrivent…"}</p>
    </div>
  );
}
