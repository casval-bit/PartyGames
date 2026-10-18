import { PlayerAvatar, ShuffleStack, playerColor, useNow } from "../ui/parts.jsx";
import { HAND_SIZE, SHUFFLE_MS } from "../config.js";
import { useEffect } from "react";
import { vibrate } from "../lib/util.js";

const STEPS = [
  ["Tout le monde dépose ses boosters", "Les cartes sont rassemblées au centre"],
  ["On mélange le tout !", "Aucun deck ne reste intact"],
  ["Chacun reçoit {n} cartes", "Du paquet commun, au hasard"],
];

const STEPS_BONUS = [
  ["Toutes les cartes sont rassemblées", "Les 20 cartes de chacun, bonus compris"],
  ["On mélange le tout !", "Aucune carte n'est écartée"],
  ["Les cartes sont prêtes", "Chaque manche, tout est redistribué"],
];

export default function Shuffle({ room, me }) {
  const bonus = room.settings.variant === "bonus" && room.settings.game === "timesup";
  const now = useNow(120);
  const left = Math.max(0, (room.deadline || now) - now);
  const el = SHUFFLE_MS - left;
  const step = el < 1700 ? 0 : el < 4100 ? 1 : 2;
  const n = room.players.length;
  const total = room.deckSize || n * HAND_SIZE;
  const each = bonus ? Math.round(total / n) : HAND_SIZE;
  const [t1, t2] = (bonus ? STEPS_BONUS : STEPS)[step];

  useEffect(() => { vibrate(step === 1 ? [20, 30, 20, 30, 20, 30, 20] : 25); }, [step]);

  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Mélange commun · {total} cartes</div>
        <h2 style={{ fontSize: "1.3rem" }} key={step} className="swap">{t1.replace("{n}", HAND_SIZE)}</h2>
        <p className="muted" style={{ fontWeight: 700, marginTop: 4 }}>{t2}</p>
      </div>
      <div className={"shufstage s" + step} style={{ "--n": n, "--chip": n > 12 ? "30px" : "42px" }}>
        {room.players.map((p, k) => {
          const a = (k / n) * Math.PI * 2 - Math.PI / 2;
          return (
            <div key={p.id} className="sp" style={{ "--x": `${Math.cos(a).toFixed(3)}`, "--y": `${Math.sin(a).toFixed(3)}`, "--d": `${k * 70}ms`, "--pc": playerColor(p.ci) }}>
              <span className="pk"><i /><i /><i /></span>
              <span className="chipav"><PlayerAvatar name={p.name} look={p.look} /></span>
              {step === 2 && <b className="got" style={{ animationDelay: `${300 + k * 90}ms` }}>{each}</b>}
            </div>
          );
        })}
        <div className="center">
          <ShuffleStack mode={step === 0 ? "gather" : step === 1 ? "riffle" : "deal"} count={9} />
          {step === 2 && room.players.slice(0, 12).map((p, k) => {
            const a = (k / Math.min(n, 12)) * Math.PI * 2 - Math.PI / 2;
            return <i key={p.id} className="shot" style={{ "--x": Math.cos(a).toFixed(3), "--y": Math.sin(a).toFixed(3), animationDelay: `${k * 90}ms` }} />;
          })}
        </div>
      </div>
      <p className="muted" style={{ textAlign: "center", fontWeight: 700 }}>
        {bonus ? "Les bonus posés sont mélangés avec les autres cartes : impossible de les repérer à l'avance." : `Tu verras tes ${HAND_SIZE} cartes dans un instant — elles ne seront sans doute pas celles de tes boosters.`}
      </p>
    </div>
  );
}
