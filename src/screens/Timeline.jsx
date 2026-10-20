import { useEffect, useRef, useState } from "react";
import { Fuse, PlayerAvatar, teamStyle } from "../ui/parts.jsx";
import { TEAMS, TL_PLACE_SECONDS, TL_REVEAL_SECONDS, TL_PREVIEW_S } from "../config.js";
import { createPlayer } from "../lib/audio.js";
import { vibrate } from "../lib/util.js";
import { safeUrl } from "../lib/safeUrl.js";

const SPEAKER = "M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.200v2.100a7 7 0 0 1 0 13.400v2.100a9 9 0 0 0 0-17.600z";
const MUTED = "M3 9v6h4l5 4V5L7 9H3zm13.600 3l2.700-2.700-1.400-1.400-2.700 2.700-2.700-2.700-1.400 1.400 2.700 2.700-2.700 2.700 1.400 1.400 2.700-2.700 2.700 2.700 1.400-1.400z";
const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d={d} fill="currentColor" /></svg>;

/** Une carte de la frise : l'année en grand, puis titre et artiste. */
function Card({ c, hot, ghost }) {
  return (
    <div className={"tlc" + (hot ? " hot" : "") + (ghost ? " ghost" : "")}>
      <b className="y">{c.y}</b>
      <span><strong>{c.t}</strong><small>{c.a}</small></span>
    </div>
  );
}

/** La frise d'une équipe, du plus ancien (haut) au plus récent (bas). `slots` : l'équipe joue, on peut toucher un emplacement. */
function Line({ cards, slots, pick, onPick, ghost, hotIdx }) {
  const Slot = ({ i }) => (
    <button className={"tls" + (pick === i ? " on" : "")} onClick={() => { vibrate(15); onPick(i); }} aria-label={`Placer ici (position ${i + 1})`} aria-pressed={pick === i}>
      {pick === i ? <span className="mystery"><i>♪</i>Ta carte mystère</span> : <span className="plus">+ ici</span>}
    </button>
  );
  return (
    <div className="tlline">
      {slots && <Slot i={0} />}
      {cards.map((c, i) => (
        <div key={c.id + ":" + i} className="tlitem">
          <Card c={c} hot={hotIdx === i} />
          {slots && <Slot i={i + 1} />}
        </div>
      ))}
      {ghost && <Card c={ghost} ghost />}
    </div>
  );
}

function TeamChips({ tl, room, viewTeam, setViewTeam }) {
  return (
    <div className="tlchips" role="tablist" aria-label="Frises des équipes">
      {tl.teams.map((t) => (
        <button key={t} role="tab" aria-selected={viewTeam === t} className={"tlchip" + (viewTeam === t ? " on" : "") + (tl.turn && tl.turn.team === t ? " turn" : "")} style={teamStyle(t)} onClick={() => setViewTeam(t)}>
          <b>{TEAMS[t].label}</b><span>{(tl.line[t] || []).length}/{tl.goal}</span>
        </button>
      ))}
    </div>
  );
}

export default function Timeline({ room, me, api, onLeave }) {
  const tl = room.tl;
  const isHost = room.hostId === me.id;
  const player = useRef(null);
  if (!player.current) player.current = createPlayer();
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const shouldPlay = tl && (tl.audio === "all" || isHost);
  const token = tl && tl.cur ? tl.cur.token : 0;

  useEffect(() => { player.current.onBlocked(() => setBlocked(true)); return () => player.current.stop(); }, []);
  const start = () => { if (tl && tl.cur) { const o = Math.max(0, Math.min(tl.cur.offset || 0, 25)); player.current.play(tl.cur.url, o, TL_PREVIEW_S - o); } };
  useEffect(() => {
    if (!shouldPlay) return;
    if (room.phase === "tl_play" && token) { setBlocked(false); start(); } else player.current.stop();
  }, [token, room.phase, shouldPlay]); // eslint-disable-line
  useEffect(() => { if (shouldPlay && tl && tl.preload) player.current.preload(tl.preload); }, [tl && tl.preload, shouldPlay]); // eslint-disable-line
  useEffect(() => { player.current.setMuted(muted); }, [muted]);

  if (!tl) return null;
  const sound = { blocked, muted, setMuted, shouldPlay, replay: () => { player.current.unlock(); setBlocked(false); start(); } };
  return (
    <div className="tl-root" onPointerDown={() => player.current.unlock()}>
      {room.phase === "tl_play" && <Play key={tl.cur ? tl.cur.token : "load"} room={room} me={me} api={api} sound={sound} />}
      {room.phase === "tl_reveal" && <Reveal key={tl.n} room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "tl_final" && <Final room={room} api={api} isHost={isHost} onLeave={onLeave} />}
    </div>
  );
}

/* --------------------------- 1. on écoute et on place --------------------------- */
function Play({ room, me, api, sound }) {
  const tl = room.tl;
  const turn = tl.turn;
  const [viewTeam, setViewTeam] = useState(turn ? turn.team : tl.teams[0]);
  const [pick, setPick] = useState(null);
  const mine = turn && turn.pid === me.id;
  const player = turn && room.players.find((p) => p.id === turn.pid);
  const myTeam = room.players.find((p) => p.id === me.id)?.team;
  useEffect(() => { if (turn) setViewTeam(turn.team); }, [turn && turn.team]); // eslint-disable-line

  if (!turn) {
    return (
      <div className="screen tlplay">
        <div><div className="eyebrow">Frise</div><h2 style={{ fontSize: "1.3rem" }}>Préparation des cartes…</h2></div>
        <div className="wait" role="status">On cherche l'année de sortie de chaque morceau<i /><i /><i /></div>
        <p className="muted btnote">Chaque morceau est vérifié sur MusicBrainz : ça prend quelques secondes.</p>
      </div>
    );
  }
  const cards = tl.line[viewTeam] || [];
  const canPlace = mine && viewTeam === turn.team;
  const sameTeam = myTeam === turn.team;
  const confirm = () => { if (pick == null) return; vibrate([20, 40, 20]); api.place(pick); };

  return (
    <div className="screen tlplay">
      <div className="row spread">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Équipe {TEAMS[turn.team].name} · objectif {tl.goal} cartes</div>
          <h2 style={{ fontSize: "1.2rem" }}>{mine ? "À toi de placer !" : `${player ? player.name : "?"} place la carte`}</h2>
        </div>
        {sound.shouldPlay && (
          <div className="row" style={{ gap: 8 }}>
            <button className="iconbtn" onClick={sound.replay} aria-label="Réécouter l'extrait">↻</button>
            <button className="iconbtn" onClick={() => sound.setMuted(!sound.muted)} aria-label={sound.muted ? "Remettre le son" : "Couper le son"}><Icon d={sound.muted ? MUTED : SPEAKER} /></button>
          </div>
        )}
      </div>
      <Fuse deadline={room.deadline} total={TL_PLACE_SECONDS} />
      {sound.shouldPlay && sound.blocked && <button className="btn primary" onClick={sound.replay}>Touche pour activer le son</button>}
      {!sound.shouldPlay && <p className="muted btnote">Le son sort du téléphone du créateur.</p>}
      <TeamChips tl={tl} room={room} viewTeam={viewTeam} setViewTeam={(t) => { setViewTeam(t); if (t !== turn.team) setPick(null); }} />
      <div className="scroll tlscroll">
        <Line cards={cards} slots={canPlace} pick={pick} onPick={setPick} />
        {viewTeam !== turn.team && <p className="muted btnote">Tu regardes la frise de l'équipe {TEAMS[viewTeam].name}.</p>}
      </div>
      {mine ? (
        <button className="btn primary" disabled={pick == null} onClick={confirm}>{pick == null ? "Touche un emplacement dans la frise" : "Valider ici"}</button>
      ) : (
        <div className="wait" role="status">{sameTeam ? "Aide ton équipe : discutez, c'est " + (player ? player.name : "?") + " qui valide" : "L'équipe " + TEAMS[turn.team].name + " réfléchit"}<i /><i /><i /></div>
      )}
    </div>
  );
}

/* --------------------------- 2. révélation de l'année --------------------------- */
function Reveal({ room, me, api, isHost }) {
  const tl = room.tl, rv = tl.reveal;
  const [coverOk, setCoverOk] = useState(true);
  const mineTurn = rv.pid === me.id;
  const cards = tl.line[rv.team] || [];
  const hotIdx = rv.ok ? rv.slot : -1;
  return (
    <div className="screen tlreveal">
      <div className="row spread">
        <div className="eyebrow">Équipe {TEAMS[rv.team].name} · {cards.length}/{tl.goal}</div>
        {rv.reason === "time" && <span className="tc-chip">Temps écoulé</span>}
        {rv.reason === "left" && <span className="tc-chip">Joueur parti</span>}
      </div>
      <div className="btcover">
        <div className="vinyl" />
        {safeUrl(rv.cover) && coverOk ? <img src={safeUrl(rv.cover)} alt="" referrerPolicy="no-referrer" onError={() => setCoverOk(false)} /> : <div className="ph"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 3v10.600A4 4 0 1 0 14 17V7h4V3z" fill="currentColor" /></svg></div>}
      </div>
      <div className="btans">
        <div className="tlyear" aria-label={`Année ${rv.year}`}>{rv.year}</div>
        <h2>{rv.title}</h2>
        <p>{rv.artist}</p>
        {rv.uncertain && <small className="muted">Date à vérifier : elle est peut-être légèrement différente.</small>}
      </div>
      <div className={"tlverdict " + (rv.ok ? "ok" : "ko")} role="status">
        <b>{rv.ok ? "Bien placé !" : "Raté…"}</b>
        <span>{rv.ok ? (mineTurn ? "La carte rejoint ta frise." : `${rv.name} a bien placé la carte.`) : "La carte est défaussée."}</span>
      </div>
      <div className="scroll tlscroll">
        <Line cards={cards} hotIdx={hotIdx} />
      </div>
      {!rv.last && <Fuse deadline={room.deadline} total={TL_REVEAL_SECONDS} />}
      {isHost && <button className="btn small ghost" onClick={api.tlNext}>{rv.last ? "Voir le résultat" : "Passer la pause"}</button>}
    </div>
  );
}

/* --------------------------- 3. fin de partie --------------------------- */
function Final({ room, api, isHost, onLeave }) {
  const tl = room.tl;
  const rows = tl.teams.map((t) => ({ t, n: (tl.line[t] || []).length })).sort((a, b) => b.n - a.n);
  const [open, setOpen] = useState(tl.winner != null ? tl.winner : rows[0].t);
  const tie = tl.winner == null;
  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Fin de la frise musicale</div>
        <h2 style={{ fontSize: "1.5rem" }}>{tie ? "Égalité !" : `L'équipe ${TEAMS[tl.winner].name} gagne`}</h2>
        {tl.ended === "deck" && <small className="muted">Plus de morceaux dans la playlist : la frise la plus longue l'emporte.</small>}
      </div>
      <div className="tlchips">
        {rows.map((r) => (
          <button key={r.t} className={"tlchip" + (open === r.t ? " on" : "") + (tl.winner === r.t ? " turn" : "")} style={teamStyle(r.t)} onClick={() => setOpen(r.t)}>
            <b>{TEAMS[r.t].label}</b><span>{r.n}/{tl.goal}</span>
          </button>
        ))}
      </div>
      <div className="scroll tlscroll"><Line cards={tl.line[open] || []} /></div>
      {tl.skipped > 0 && <p className="muted btnote">{tl.skipped} morceau{tl.skipped > 1 ? "x" : ""} écarté{tl.skipped > 1 ? "s" : ""} (année introuvable ou incertaine).</p>}
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
