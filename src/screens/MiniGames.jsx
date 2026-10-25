import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, Fuse, useNow, playerColor } from "../ui/parts.jsx";
import { GAME_COMPONENTS, MG_BY, playSeconds } from "../minigames/index.js";
import { MG_ASK_SECONDS } from "../config.js";
import { MG_SIDES, modeLabel } from "../minigames/meta.js";
import { beanColor, loadThree } from "../minigames/three/kit3d.jsx";

const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const nameOf = (room, me, id) => (id === me.id ? "Toi" : (room.players.find((p) => p.id === id) || {}).name || "?");

/** Les deux camps d'une manche en équipes (bleus / rouges), avec « ton équipe » mise en avant. */
function Sides({ room, me, mg, result }) {
  return (
    <div className="mgsides" data-testid="mg-sides">
      {MG_SIDES.map((sd) => {
        const members = room.players.filter((p) => mg.teams && mg.teams[p.id] === sd.id);
        const res = result && result.find((t) => t.t === sd.id);
        const mine = mg.teams && mg.teams[me.id] === sd.id;
        return (
          <div key={sd.id} className={"mgside" + (mine ? " mine" : "") + (res ? " " + res.result : "")} style={{ "--sc": sd.color, "--sink": sd.ink }}>
            <b>{sd.emoji} {sd.name}{mine ? " · ton équipe" : ""}</b>
            <div className="mem">{members.map((p) => <span key={p.id}><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>)}</div>
            {res && <em>{res.result === "win" ? "🏆 " : res.result === "tie" ? "🤝 " : ""}moyenne {String(res.avg).replace(".", ",")}</em>}
          </div>
        );
      })}
    </div>
  );
}

/** Classement provisoire (totaux) : affiché pendant les pauses. */
function Standings({ room, me, gain }) {
  const mg = room.mg, bd = room.bd;
  const val = (id) => (bd ? bd.coins[id] || 0 : mg.scores[id] || 0);
  const rows = [...room.players].sort((a, b) => (bd ? (bd.gems[b.id] || 0) - (bd.gems[a.id] || 0) : 0) || val(b.id) - val(a.id));
  return (
    <ol className="rank mgstand">
      {rows.map((p, k) => (
        <li key={p.id} className={p.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 50}ms` }}>
          <span className="pos">{k + 1}</span>
          <span className="who"><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
          {gain && gain[p.id] ? <b className="gain">+{gain[p.id]}</b> : <span />}
          <small>{bd ? `${bd.gems[p.id] || 0} 💎 · ${val(p.id)} 🪙` : `${val(p.id)} pts`}</small>
        </li>
      ))}
    </ol>
  );
}

export default function MiniGames({ room, me, api, onLeave }) {
  const mg = room.mg;
  const isHost = room.hostId === me.id;
  useEffect(() => { loadThree().catch(() => {}); }, []); // précharge la 3D pendant la présentation du premier jeu
  if (!mg) return null;
  return (
    <div className="mgroot">
      {room.phase === "mg_intro" && <Intro room={room} me={me} />}
      {room.phase === "mg_play" && <Play key={mg.step} room={room} me={me} api={api} />}
      {room.phase === "mg_result" && <Result room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "mg_ask" && <Ask key={mg.step} room={room} me={me} api={api} />}
      {room.phase === "mg_qreveal" && <QReveal key={mg.step} room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "mg_final" && <Final room={room} me={me} api={api} isHost={isHost} onLeave={onLeave} />}
    </div>
  );
}

/* ------------------------- 1. présentation + décompte ------------------------- */
function Intro({ room, me }) {
  const mg = room.mg, g = MG_BY[mg.game];
  const now = useNow(150);
  const left = Math.max(0, (room.deadline || now) - now);
  const cnt = left > 3000 ? "" : left > 0 ? String(Math.ceil(left / 1000)) : "GO";
  return (
    <div className="screen mgintro">
      <div className="row spread"><span className="eyebrow">Manche {mg.round} sur {mg.total}</span><span className="tc-chip">{g.tag}</span></div>
      {mg.mode !== "ffa" && <div className="mgmode" data-testid="mg-mode">{modeLabel(mg.mode)}</div>}
      <div className="mghero">
        <div className="mgemo" aria-hidden="true">{g.emoji}</div>
        <h2>{g.title}</h2>
        <p className="mgrule">{g.rule}</p>
      </div>
      <div className="mgcount" aria-live="off" key={cnt}>{cnt || "Prépare-toi"}</div>
      <div className="scroll">{mg.mode !== "ffa" && <Sides room={room} me={me} mg={mg} />}<Standings room={room} me={me} /></div>
    </div>
  );
}

/* ------------------------------ 2. on joue ------------------------------ */
function Play({ room, me, api }) {
  const mg = room.mg, g = MG_BY[mg.game], Game = GAME_COMPONENTS[mg.game];
  const [score, setScore] = useState(null);
  const sent = useRef(false);
  const finish = (s) => { if (sent.current) return; sent.current = true; setScore(s); api.mgScore(mg.step, s); };
  const total = room.players.length, done = mg.done.length;
  return (
    <div className="screen mgplay">
      <div className="row spread">
        <div className="mgtitle"><span aria-hidden="true">{g.emoji}</span> {g.title}</div>
        {mg.mode !== "ffa" && mg.teams && mg.teams[me.id] != null ? <span className="mgteamchip" style={{ "--sc": MG_SIDES[mg.teams[me.id]].color, "--sink": MG_SIDES[mg.teams[me.id]].ink }} data-testid="mg-myteam">{MG_SIDES[mg.teams[me.id]].emoji} {modeLabel(mg.mode)}</span> : <span className="eyebrow">{mg.round}/{mg.total}</span>}
      </div>
      {score == null ? (
        <div className="mgstage"><Game seed={mg.seed} seconds={playSeconds(g)} onFinish={finish} color={beanColor((room.players.find((p) => p.id === me.id) || {}).look)} look={(room.players.find((p) => p.id === me.id) || {}).look} /></div>
      ) : (
        <div className="mgdone" role="status" data-testid="mg-done">
          <div className="mgemo" aria-hidden="true">✔️</div>
          <h2>{g.fmt(score)}</h2>
          <p className="muted">Terminé ! On attend les autres ({done}/{total})</p>
          <div className="wait"><i /><i /><i /></div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- 3. classement de la manche ------------------------- */
function Result({ room, me, api, isHost }) {
  const mg = room.mg, L = mg.last, g = MG_BY[L.game];
  const mine = L.rows.find((r) => r.id === me.id);
  const team = L.mode !== "ffa" && L.teams;
  const myRes = team && mine && L.teams[mine.team] ? L.teams[mine.team].result : null;
  const title = team
    ? (myRes === "win" ? "Ton équipe gagne !" : myRes === "tie" ? "Égalité entre les équipes" : myRes === "lose" ? "Ton équipe perd…" : "Résultats")
    : (mine && mine.rank === 1 && !mine.dnf ? "Tu gagnes la manche !" : mine && !mine.dnf ? `Tu es ${ord(mine.rank)}` : "Résultats");
  return (
    <div className="screen mgresult">
      <div>
        <div className="eyebrow">{g.emoji} {g.title} · manche {mg.round}/{mg.total}{team ? ` · ${modeLabel(L.mode)}` : ""}</div>
        <h2 style={{ fontSize: "1.4rem" }} data-testid="mg-result-title">{title}</h2>
      </div>
      <div className="scroll">
        {team && <Sides room={room} me={me} mg={{ ...mg, teams: Object.fromEntries(L.rows.map((r) => [r.id, r.team])) }} result={L.teams} />}
        <ol className="rank">
          {L.rows.map((r, k) => {
            const p = room.players.find((x) => x.id === r.id);
            if (!p) return null;
            return (
              <li key={r.id} className={r.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 70}ms` }}>
                <span className="pos">{r.dnf ? "–" : team ? (r.rank === 1 ? "🏆" : "·") : MEDAL[r.rank] || ord(r.rank)}</span>
                <span className="who"><PlayerAvatar name={p.name} look={p.look} />{r.id === me.id ? "Toi" : p.name}</span>
                <b className="gain">{room.bd ? (r.coins ? `+${r.coins} 🪙` : "") : r.dnf || !r.pts ? "" : `+${r.pts}`}</b>
                <small>{r.dnf ? "pas fini" : g.fmt(r.s)}</small>
              </li>
            );
          })}
        </ol>
        <h3 className="mgh3">{room.bd ? "Gemmes et pièces" : "Total"}</h3>
        <Standings room={room} me={me} />
      </div>
      {isHost && <button className="btn small ghost" onClick={api.mgNext}>Passer la pause</button>}
    </div>
  );
}

/* ----------------------------- 4. test d'amitié ----------------------------- */
function Ask({ room, me, api }) {
  const mg = room.mg, q = mg.q;
  const [pick, setPick] = useState(null);
  const subject = room.players.find((p) => p.id === q.subject);
  const mine = q.subject === me.id;
  const choose = (i) => { if (pick != null) return; setPick(i); api.mgAnswer(mg.step, i); };
  return (
    <div className="screen mgask">
      <div className="row spread"><span className="eyebrow">Test d'amitié · question {mg.fq.i}/{mg.fq.n}</span><span className="tc-chip">Manche {mg.round}/{mg.total}</span></div>
      <Fuse deadline={room.deadline} total={MG_ASK_SECONDS} />
      <div className="mgwho">
        {subject && <PlayerAvatar name={subject.name} look={subject.look} />}
        <div>
          <b>{mine ? "C'est sur toi !" : `Sur ${subject ? subject.name : "?"}`}</b>
          <small>{mine ? "Réponds sincèrement, les autres vont deviner." : "Devine ce qu'il ou elle va répondre."}</small>
        </div>
      </div>
      <h2 className="mgq" data-testid="mg-question">{q.text}</h2>
      <div className="mgopts col">
        {q.opts.map((o, i) => <button key={i} className={"mgopt wide" + (pick === i ? " on" : "")} data-testid="mg-ans" disabled={pick != null} onClick={() => choose(i)}>{o}</button>)}
      </div>
      <div className="wait" role="status">{pick == null ? "Choisis une réponse" : `Réponse envoyée · ${mg.done.length}/${room.players.length}`}<i /><i /><i /></div>
    </div>
  );
}

function QReveal({ room, me, api, isHost }) {
  const mg = room.mg, q = mg.q, rv = q.reveal;
  const subject = room.players.find((p) => p.id === q.subject);
  const name = nameOf(room, me, q.subject);
  const iRight = rv.right.includes(me.id);
  return (
    <div className="screen mgask">
      <div className="row spread"><span className="eyebrow">Test d'amitié · question {mg.fq.i}/{mg.fq.n}</span></div>
      <h2 className="mgq">{q.text}</h2>
      {rv.voided ? (
        <div className="mgverdict ko"><b>Question annulée</b><span>{name === "Toi" ? "Tu n'as pas répondu" : `${name} n'a pas répondu`} à temps.</span></div>
      ) : (
        <>
          <div className="mgverdict ok"><b>{name === "Toi" ? "Tu as répondu" : `${name} a répondu`} : {q.opts[rv.answer]}</b>
            <span>{q.subject === me.id ? `${rv.right.length} personne${rv.right.length > 1 ? "s" : ""} t'ont bien deviné.` : iRight ? "Bien vu ! +3 points" : "Raté… tu avais dit : " + (rv.picks[me.id] != null ? q.opts[rv.picks[me.id]] : "rien")}</span></div>
          <ul className="mgpicks">
            {room.players.filter((p) => p.id !== q.subject).map((p) => (
              <li key={p.id} className={rv.right.includes(p.id) ? "ok" : "ko"}>
                <PlayerAvatar name={p.name} look={p.look} />
                <span>{p.id === me.id ? "Toi" : p.name}</span>
                <em>{rv.picks[p.id] != null ? q.opts[rv.picks[p.id]] : "—"}</em>
                <b>{rv.gain[p.id] ? `+${rv.gain[p.id]}` : ""}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="scroll"><Standings room={room} me={me} gain={rv.gain} /></div>
      {isHost && <button className="btn small ghost" onClick={api.mgNext}>Passer la pause</button>}
    </div>
  );
}

/* ------------------------------ 5. podium ------------------------------ */
function Final({ room, me, api, isHost, onLeave }) {
  const mg = room.mg, F = mg.final || [];
  const win = F.filter((r) => r.rank === 1);
  const mine = F.find((r) => r.id === me.id);
  const byId = (id) => room.players.find((p) => p.id === id);
  const top = F.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <div className="screen mgfinal">
      <div>
        <div className="eyebrow">Fin des mini-jeux · {mg.total} manches</div>
        <h2 style={{ fontSize: "1.5rem" }} data-testid="mg-winner">{room.players.length < 2 ? `Score final : ${mine ? mine.pts : 0} pts` : win.length > 1 ? "Égalité !" : win[0] && win[0].id === me.id ? "Tu gagnes !" : `${(byId(win[0] && win[0].id) || {}).name || "?"} gagne`}</h2>
      </div>
      <div className="podium" aria-label="Podium">
        {order.map((r) => {
          const p = byId(r.id);
          if (!p) return null;
          return (
            <div key={r.id} className={"pod p" + Math.min(3, r.rank)} style={{ "--tc": playerColor(p.ci), "--tink": "#1d2457" }}>
              <PlayerAvatar name={p.name} look={p.look} showLv />
              <span className="who">{r.id === me.id ? "Toi" : p.name}</span>
              <div className="blk"><b>{r.pts}</b><span>{MEDAL[r.rank] || ord(r.rank)}</span></div>
            </div>
          );
        })}
      </div>
      <div className="scroll">
        <ol className="rank">
          {F.map((r, k) => {
            const p = byId(r.id);
            if (!p) return null;
            return (
              <li key={r.id} className={r.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 60}ms` }}>
                <span className="pos">{ord(r.rank)}</span>
                <span className="who"><PlayerAvatar name={p.name} look={p.look} />{r.id === me.id ? "Toi" : p.name}</span>
                <b className="gain">{r.pts}</b><small>{r.wins} manche{r.wins > 1 ? "s" : ""} gagnée{r.wins > 1 ? "s" : ""}</small>
              </li>
            );
          })}
        </ol>
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
