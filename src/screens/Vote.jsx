import { useState } from "react";
import { CatBattery, Fuse, playerColor, teamStyle } from "../ui/parts.jsx";
import { BY_ID, CATEGORIES, SPECIALS, rulesFor } from "../data/categories.js";
import { MAX_CELLS, VOTE_SECONDS } from "../config.js";
import { vibrate } from "../lib/util.js";

export default function Vote({ room, me, api }) {
  const R = rulesFor(room.settings);
  const VOTES_PER_PLAYER = R.votes, CARDS_PER_VOTE = R.cards;
  const [slots, setSlots] = useState(() => Array(VOTES_PER_PLAYER).fill(null));
  const meP = room.players.find((p) => p.id === me.id);
  const myColor = playerColor(meP?.ci);
  const ready = Boolean(meP?.ready);
  const full = slots.every(Boolean);

  const push = (next) => { setSlots(next); api.vote(next); };
  const choose = (id) => {
    if (ready) return;
    const i = slots.indexOf(null);
    if (i < 0) return vibrate(30);
    const next = slots.slice(); next[i] = id; push(next);
    vibrate(15);
  };
  const clear = (i) => { if (ready || !slots[i]) return; const next = slots.slice(); next[i] = null; push(next); };

  // Batterie d'une catégorie : mes votes (ma couleur) d'abord, puis les votes des autres (masqués jusqu'à la révélation).
  const cellsFor = (id) => {
    const mine = slots.filter((s) => s === id).length;
    const total = room.tally[id] || 0;
    const others = Math.max(0, total - mine);
    return { cells: [...Array(mine).fill(myColor), ...Array(others).fill("neutral")], total: Math.max(total, mine) };
  };

  const tile = (c, wide) => {
    const { cells, total } = cellsFor(c.id);
    return (
      <button key={c.id} className={"cat" + (wide ? " wide" : "")} style={{ background: c.color }} onClick={() => choose(c.id)} aria-label={`Voter ${c.label}`}>
        {total > 0 && <span className="n" key={total}>{total}</span>}
        <span className="lbl">{c.label}</span>
        <CatBattery cells={cells} total={total} />
      </button>
    );
  };

  return (
    <div className="screen">
      <div className="vote-top">
        <div>
          <div className="eyebrow">Choix des packs</div>
          <h2 style={{ fontSize: "1.2rem" }}>{`${VOTES_PER_PLAYER} votes · ${CARDS_PER_VOTE} cartes chacun`}</h2>
        </div>
        <Fuse deadline={room.deadline} total={VOTE_SECONDS} />
        <div className="mine" style={{ "--pc": myColor }}>
          <div className="eyebrow">Mes votes</div>
          <div className="myvotes">
            {slots.map((_, i) => (
              <button key={i} className={"mv" + (slots[i] ? " on" : "")} onClick={() => clear(i)} disabled={ready || !slots[i]} aria-label={slots[i] ? `Retirer ${BY_ID[slots[i]].label}` : `Vote ${i + 1} vide`}>
                {slots[i] ? <>{BY_ID[slots[i]].label}<b>✕</b></> : <>vote {i + 1}</>}
              </button>
            ))}
          </div>
        </div>
        <div className="legend" aria-label="Joueurs">
          {room.players.map((p) => (
            <span key={p.id} className="lg" style={{ "--pc": playerColor(p.ci) }}>
              <i />{p.id === me.id ? "Toi" : p.name}
              <small>{p.ready ? "✓" : `${room.votesCast[p.id] || 0}/${VOTES_PER_PLAYER}`}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="scroll">
        <p className="muted" style={{ fontSize: ".78rem", fontWeight: 700 }}>Chaque vote charge une barre (jusqu'à {MAX_CELLS}). Les couleurs des autres sont révélées à la fin.</p>
        <div className="cats">
          {SPECIALS.map((c) => tile(c, true))}
          {CATEGORIES.map((c) => tile(c))}
        </div>
      </div>

      {ready ? (
        <button className="btn" onClick={() => api.ready(false)}>Prêt ✓ · modifier</button>
      ) : (
        <button className="btn good" disabled={!full} onClick={() => api.ready(true)}>{full ? "Prêt !" : `Choisis ${VOTES_PER_PLAYER} packs`}</button>
      )}
    </div>
  );
}
