import { useEffect, useRef, useState } from "react";
import { Fuse, PlayerAvatar, playerColor, teamStyle } from "../ui/parts.jsx";
import { TEAMS, BT_BREAK_SECONDS } from "../config.js";
import { createPlayer } from "../lib/audio.js";
import { vibrate } from "../lib/util.js";
import { safeUrl } from "../lib/safeUrl.js";

const plural = (n, a, b) => (n > 1 ? b : a);

/* ---------- qui marque : un joueur, ou une équipe quand le score est partagé ---------- */
const isTeamUnit = (bt) => bt.teams && bt.scoring === "shared";
function unitInfo(room, u) {
  const bt = room.bt;
  if (isTeamUnit(bt) && u[0] === "t") { const t = Number(u.slice(1)); return { key: u, label: `Équipe ${TEAMS[t].name}`, team: t, style: teamStyle(t) }; }
  const p = room.players.find((x) => x.id === u);
  return { key: u, label: p ? p.name : "?", team: p ? p.team : 0, p, style: bt.teams && p ? teamStyle(p.team) : { "--tc": playerColor(p ? p.ci : 0), "--tink": "#16101f" } };
}
/** Lignes du classement : joueurs (solo), équipes (score partagé) ou équipes = somme de leurs joueurs. */
function boardRows(room) {
  const bt = room.bt, sc = bt.scores;
  if (!bt.teams) return room.players.map((p) => ({ ...unitInfo(room, p.id), pts: sc[p.id] || 0, streak: bt.streaks[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
  if (bt.scoring === "shared") {
    const teams = [...new Set(room.players.map((p) => p.team))];
    return teams.map((t) => ({ ...unitInfo(room, "t" + t), pts: sc["t" + t] || 0, streak: bt.streaks["t" + t] || 0, members: room.players.filter((p) => p.team === t).map((p) => p.name) })).sort((a, b) => b.pts - a.pts);
  }
  const teams = [...new Set(room.players.map((p) => p.team))];
  return teams.map((t) => {
    const ms = room.players.filter((p) => p.team === t);
    return { key: "t" + t, label: `Équipe ${TEAMS[t].name}`, team: t, style: teamStyle(t), pts: ms.reduce((s, p) => s + (sc[p.id] || 0), 0), streak: 0, members: ms.map((p) => `${p.name} ${sc[p.id] || 0}`) };
  }).sort((a, b) => b.pts - a.pts);
}

const Flame = ({ n }) => (
  <span className="flame" title={`Série de ${n}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z" fill="currentColor" /></svg>{n}
  </span>
);
const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d={d} fill="currentColor" /></svg>;
const SPEAKER = "M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.200v2.100a7 7 0 0 1 0 13.400v2.100a9 9 0 0 0 0-17.600z";
const MUTED = "M3 9v6h4l5 4V5L7 9H3zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.400z";

export default function BlindTest({ room, me, api, feedback, onLeave }) {
  const bt = room.bt;
  const isHost = room.hostId === me.id;
  const player = useRef(null);
  if (!player.current) player.current = createPlayer();
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const shouldPlay = bt && (bt.audio === "all" || isHost);
  const token = bt && bt.play ? bt.play.token : 0;

  useEffect(() => { player.current.onBlocked(() => setBlocked(true)); return () => player.current.stop(); }, []);
  const start = () => {
    if (!bt || !bt.play) return;
    const elapsed = Math.max(0, bt.guessMs - Math.max(0, (room.deadline || Date.now()) - Date.now()));
    player.current.play(bt.play.url, bt.play.offset + elapsed / 1000, (bt.guessMs - elapsed) / 1000);
  };
  useEffect(() => {
    if (!shouldPlay) return;
    if (room.phase === "bt_play" && token) { setBlocked(false); start(); } else player.current.stop();
  }, [token, room.phase, shouldPlay]); // eslint-disable-line
  useEffect(() => { if (shouldPlay && bt && bt.preload) player.current.preload(bt.preload); }, [bt && bt.preload, shouldPlay]); // eslint-disable-line
  useEffect(() => { player.current.setMuted(muted); }, [muted]);

  const soundCtl = { blocked, muted, setMuted, shouldPlay, retry: () => { player.current.unlock(); setBlocked(false); start(); } };
  if (!bt) return null;
  return (
    <div className="bt-root" onPointerDown={() => player.current.unlock()}>
      {room.phase === "bt_play" && <Play key={bt.n} room={room} me={me} api={api} feedback={feedback} sound={soundCtl} />}
      {room.phase === "bt_reveal" && <Reveal room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "bt_final" && <Final room={room} me={me} api={api} isHost={isHost} onLeave={onLeave} />}
    </div>
  );
}

/* ------------------------------- 1. on écoute et on devine ------------------------------- */
function Play({ room, me, api, feedback, sound }) {
  const bt = room.bt;
  const [text, setText] = useState("");
  const [mine, setMine] = useState({ title: false, artist: false });
  const [flash, setFlash] = useState(null); // { kind, gained }
  const [spent, setSpent] = useState(false);
  const seen = useRef(feedback ? feedback.k : 0);
  const input = useRef(null);
  const meP = room.players.find((p) => p.id === me.id);

  useEffect(() => {
    if (!feedback || feedback.k === seen.current) return;
    seen.current = feedback.k;
    setMine(feedback.mine);
    const kind = feedback.gained > 0 ? "hit" : feedback.title === "full" || feedback.artist === "full" ? "dup" : feedback.title === "close" || feedback.artist === "close" ? "close" : "miss";
    setFlash({ kind, gained: feedback.gained, k: feedback.k, t: feedback.title, a: feedback.artist });
    vibrate(kind === "hit" ? [20, 40, 20] : kind === "close" ? 25 : 60);
  }, [feedback]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1700); return () => clearTimeout(t); }, [flash]);

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || spent) return;
    api.guess(v);
    setText("");
    if (bt.oneGuess) setSpent(true);
    input.current && input.current.focus();
  };
  const feed = bt.feed.filter((f) => !(isTeamUnit(bt) && f.team === meP?.team && f.pid !== me.id));
  const msg = flash && (flash.kind === "hit" ? `+${flash.gained}` : flash.kind === "close" ? "Presque !" : flash.kind === "dup" ? "Déjà validé" : "Raté");

  return (
    <div className="screen btplay">
      <div className="row spread">
        <div>
          <div className="eyebrow">Morceau {bt.n} sur {bt.total}</div>
          <h2 style={{ fontSize: "1.2rem" }}>{bt.oneGuess ? "Une seule réponse" : "Réponses illimitées"}</h2>
        </div>
        {sound.shouldPlay && (
          <button className="iconbtn" onClick={() => sound.setMuted(!sound.muted)} aria-label={sound.muted ? "Remettre le son" : "Couper le son"}>
            <Icon d={sound.muted ? MUTED : SPEAKER} />
          </button>
        )}
      </div>
      <Fuse deadline={room.deadline} total={Math.round(bt.guessMs / 1000)} />

      <div className={"eq" + (sound.shouldPlay && !sound.muted ? "" : " off")} aria-hidden="true">
        {Array.from({ length: 21 }, (_, i) => <i key={i} style={{ "--h": 35 + ((i * 37) % 60), "--d": `${(i * 137) % 900}ms` }} />)}
      </div>
      {!sound.shouldPlay && <p className="muted btnote">Le son sort du téléphone du créateur.</p>}
      {sound.shouldPlay && sound.blocked && (
        <button className="btn primary" onClick={sound.retry}>Touche pour activer le son</button>
      )}

      <div className="btchips">
        <span className={"btchip" + (mine.title ? " ok" : "")}>Titre {mine.title ? "✓" : "?"}</span>
        <span className={"btchip" + (mine.artist ? " ok" : "")}>Artiste {mine.artist ? "✓" : "?"}</span>
        {flash && <span key={flash.k} className={"btflash " + flash.kind}>{msg}</span>}
      </div>

      <div className="scroll">
        <ul className="btfeed">
          {feed.slice().reverse().map((f) => (
            <li key={f.k} style={bt.teams ? teamStyle(f.team) : { "--tc": playerColor(room.players.find((p) => p.id === f.pid)?.ci || 0), "--tink": "#16101f" }}>
              <PlayerAvatar name={f.name} look={(room.players.find((x) => x.id === f.pid) || {}).look} />
              <span><b>{f.pid === me.id ? "Toi" : f.name}</b> a trouvé {f.parts.length === 2 ? "le titre et l'artiste" : f.parts[0] === "title" ? "le titre" : "l'artiste"}</span>
              <em>+{f.pts}</em>
            </li>
          ))}
          {!feed.length && <li className="empty">Les bonnes réponses des autres apparaîtront ici.</li>}
        </ul>
      </div>

      <form className="btform" onSubmit={submit}>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={spent ? "Réponse envoyée" : "Titre et/ou artiste…"} disabled={spent}
          autoFocus enterKeyHint="send" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={120} aria-label="Ta réponse" />
        <button className="btn primary" disabled={spent || !text.trim()}>Envoyer</button>
      </form>
    </div>
  );
}

/* ------------------------------- 2. révélation + scores ------------------------------- */
function Board({ room }) {
  const rows = boardRows(room);
  const max = Math.max(1, ...rows.map((r) => r.pts));
  return (
    <div className="btboard">
      {rows.map((r, k) => (
        <div className="btrow" key={r.key} style={{ ...r.style, animationDelay: `${k * 70}ms` }}>
          <span className="rk">{k + 1}</span>
          <div className="mid">
            <div className="nm"><b>{r.label}</b>{r.streak >= 2 && <Flame n={r.streak} />}</div>
            <div className="bar"><i style={{ width: `${(r.pts / max) * 100}%` }} /></div>
            {r.members && <small>{r.members.join(" · ")}</small>}
          </div>
          <strong className="pts">{r.pts}</strong>
        </div>
      ))}
    </div>
  );
}

function Reveal({ room, me, api, isHost }) {
  const bt = room.bt, rv = bt.reveal;
  const [coverOk, setCoverOk] = useState(true);
  const left = Math.max(0, Math.ceil(((room.deadline || 0) - Date.now()) / 1000));
  const [, tick] = useState(0);
  useEffect(() => { if (bt.manual) return; const t = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(t); }, [bt.manual]);
  const meP = room.players.find((p) => p.id === me.id);
  const myUnit = isTeamUnit(bt) ? "t" + meP?.team : me.id;
  const mineRes = rv.results.find((r) => r.u === myUnit);
  const others = rv.results.filter((r) => r.pts > 0 || r.title || r.artist).slice(0, 6);

  return (
    <div className="screen btreveal">
      <div className="row spread">
        <div className="eyebrow">Morceau {bt.n} sur {bt.total}</div>
        {!bt.manual && left > 0 && left <= 3 && !rv.last && <span className="tc-chip">Suite dans {left}</span>}
      </div>
      <div className="btcover">
        <div className="vinyl" />
        {safeUrl(rv.cover) && coverOk ? <img src={safeUrl(rv.cover)} alt="" referrerPolicy="no-referrer" onError={() => setCoverOk(false)} /> : <div className="ph"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 3v10.600A4 4 0 1 0 14 17V7h4V3z" fill="currentColor" /></svg></div>}
      </div>
      <div className="btans">
        <h2>{rv.title}</h2>
        <p>{rv.artist}</p>
      </div>
      {!bt.manual && <Fuse deadline={room.deadline} total={BT_BREAK_SECONDS} />}
      <div className="scroll">
        {mineRes && (
          <div className={"btmine " + (mineRes.title && mineRes.artist ? "full" : mineRes.title || mineRes.artist ? "half" : "none")}>
            <b>{mineRes.title && mineRes.artist ? "Bien joué !" : mineRes.title ? "Titre trouvé" : mineRes.artist ? "Artiste trouvé" : "Pas cette fois"}</b>
            <span>+{mineRes.pts}{mineRes.bonus ? ` (dont ${mineRes.bonus} de série)` : ""}</span>
            {mineRes.streak >= 2 && <Flame n={mineRes.streak} />}
          </div>
        )}
        {others.length > 0 && (
          <ul className="btres">
            {others.map((r) => { const u = unitInfo(room, r.u); return (
              <li key={r.u} style={u.style}>
                <b>{u.label}</b>
                <span className="parts"><i className={r.title ? "on" : ""}>T</i><i className={r.artist ? "on" : ""}>A</i></span>
                <em>+{r.pts}</em>
              </li>); })}
          </ul>
        )}
        <div className="eyebrow" style={{ margin: "6px 0" }}>Classement</div>
        <Board room={room} />
      </div>
      {isHost ? (
        bt.manual ? (
          <button className="btnext" onClick={() => { vibrate(40); api.btNext(); }}><i /><b>{rv.last ? "Touche : classement final" : "Touche l'écran : morceau suivant"}</b></button>
        ) : (
          <button className="btn small ghost" onClick={api.btNext}>{rv.last ? "Voir le classement final" : "Passer la pause"}</button>
        )
      ) : bt.manual ? <div className="wait" role="status">Le créateur lance la suite<i /><i /><i /></div> : null}
    </div>
  );
}

/* ------------------------------- 3. fin de partie ------------------------------- */
function Final({ room, me, api, isHost, onLeave }) {
  const rows = boardRows(room);
  const top = rows.slice(0, 3);
  const tie = rows.length > 1 && rows[0].pts === rows[1].pts;
  const order = [1, 0, 2]; // 2e, 1er, 3e
  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Fin du blind test</div>
        <h2 style={{ fontSize: "1.5rem" }}>{tie ? "Égalité !" : `${rows[0].label} gagne`}</h2>
      </div>
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="podium">
          {order.filter((i) => top[i]).map((i) => (
            <div key={top[i].key} className={"pod p" + (i + 1)} style={top[i].style}>
              <span className="who">{top[i].label}</span>
              <div className="blk"><b>{i + 1}</b><span>{top[i].pts}</span></div>
            </div>
          ))}
        </div>
        <Board room={room} />
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
