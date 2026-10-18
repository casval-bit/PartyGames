import { ShuffleStack, useNow } from "../ui/parts.jsx";
import { useEffect } from "react";
import { vibrate } from "../lib/util.js";

export default function Countdown({ room }) {
  const now = useNow(100);
  const left = Math.max(0, (room.deadline || now) - now);
  const n = Math.ceil((left - 1200) / 1000); // 4200 ms => 3, 2, 1, puis "GO"
  const label = n >= 1 ? String(Math.min(3, n)) : "GO";

  useEffect(() => { vibrate(40); }, [label]);

  return (
    <div className="screen">
      <div className="cd">
        <p className="eyebrow">Paquet commun : {room.deckSize} cartes</p>
        <h2 style={{ fontSize: "1.5rem" }}>La partie va commencer</h2>
        <div className="cdshuf"><ShuffleStack mode="riffle" count={7} /><span>Cartes rassemblées et remélangées</span></div>
        <div className="ringwrap">
          <div className="num" key={label}>{label}</div>
        </div>
      </div>
    </div>
  );
}
