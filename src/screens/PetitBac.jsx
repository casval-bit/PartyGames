import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, Fuse, useNow, playerColor } from "../ui/parts.jsx";
import { PB_CAT_BY, PB_MAX_LEN, startsWith, filled } from "../data/petitbac.js";
import { PB_RESULT_SECONDS, PB_VOTE_SECONDS, PB_INTRO_MS } from "../config.js";
import { vibrate } from "../lib/util.js";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const catOf = (id) => PB_CAT_BY[id] || { id, name: id, emoji: "❔" };
const nameOf = (room, me, id) => (id === me.id ? "Toi" : (room.players.find((p) => p.id === id) || {}).name || "?");

export default function PetitBac({ room, me, api, onLeave }) {
  const pb = room.pb;
  const isHost = room.hostId === me.id;
  if (!pb) return null;
  return (
    <div className="pbroot">
      {room.phase === "pb_intro" && <Intro pb={pb} />}
      {room.phase === "pb_play" && <Play key={pb.round} room={room} me={me} api={api} />}
      {room.phase === "pb_vote" && <Vote key={pb.round} room={room} me={me} api={api} />}
      {room.phase === "pb_result" && <Result room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "pb_final" && <Final room={room} me={me} api={api} isHost={isHost} onLeave={onLeave} />}
    </div>
  );
}

/* ------------------------------ 1. la lettre ------------------------------ */
function Intro({ pb }) {
  return (
    <div className="screen center pbintro" role="status">
      <div className="eyebrow">Petit bac · manche {pb.round}/{pb.total}</div>
      <div className="pbletter big" data-testid="pb-letter" style={{ animationDuration: PB_INTRO_MS + "ms" }}><span>{pb.letter}</span></div>
      <h2 style={{ fontSize: "1.4rem" }}>Trouve un mot par catégorie !</h2>
      <ul className="pbcats">{pb.cats.map((id) => <li key={id}><span aria-hidden="true">{catOf(id).emoji}</span>{catOf(id).name}</li>)}</ul>
      <p className="muted">Les réponses restent secrètes jusqu'à la fin. 10 points si tu es seul à l'avoir trouvée, 5 si un autre a la même.</p>
    </div>
  );
}

/* ------------------------------ 2. écriture ------------------------------ */
function Play({ room, me, api }) {
  const pb = room.pb;
  const [vals, setVals] = useState(() => pb.cats.map(() => ""));
  const sent = useRef(""), timer = useRef(null), flushed = useRef(false);
  const now = useNow(250);
  const left = room.deadline ? room.deadline - now : pb.seconds * 1000;
  const send = (v) => {
    const key = JSON.stringify(v);
    if (key === sent.current) return;
    sent.current = key;
    api.pbAnswers(v);
  };
  const set = (i, text) => {
    const next = vals.map((x, k) => (k === i ? text.slice(0, PB_MAX_LEN) : x));
    setVals(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(next), 450);
  };
  // dernières secondes ou STOP d'un autre joueur : on envoie tout de suite ce qui est écrit
  useEffect(() => { if ((pb.stop || left < 2600) && !flushed.current) { flushed.current = true; clearTimeout(timer.current); send(vals); } }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  const ok = vals.map((v) => filled(v) && startsWith(v, pb.letter));
  const complete = ok.every(Boolean);
  const stop = () => { vibrate(40); clearTimeout(timer.current); send(vals); setTimeout(() => api.pbStop(), 60); };
  const mineStop = pb.stop && pb.stop.by === me.id;
  return (
    <div className="screen pbplay">
      <div className="row spread">
        <div><div className="eyebrow">Manche {pb.round}/{pb.total}</div><div className="pbtitle">Lettre <b className="pbletter small" data-testid="pb-letter"><span>{pb.letter}</span></b></div></div>
        <div className="pbprog" aria-label="Progression des joueurs">
          {room.players.map((p) => <span key={p.id} className={"pbp" + (pb.prog[p.id] === pb.cats.length ? " done" : "")} title={p.name} style={{ "--tc": playerColor(p.ci) }}><PlayerAvatar name={p.name} look={p.look} /><i>{pb.prog[p.id] || 0}</i></span>)}
        </div>
      </div>
      {pb.stop ? (
        <div className="pbstopbanner" role="alert" data-testid="pb-stopbanner">🛑 {mineStop ? "Tu as crié STOP !" : `${pb.stop.name} crie STOP !`} <small>Finis vite… {Math.max(0, Math.ceil(left / 1000))} s</small></div>
      ) : <Fuse deadline={room.deadline} total={pb.seconds} />}
      <div className="scroll pbscroll">
        <div className="pbform">
          {pb.cats.map((id, i) => {
            const c = catOf(id), v = vals[i], bad = v.trim() && !ok[i];
            return (
              <label key={id} className={"pbrow" + (ok[i] ? " ok" : bad ? " ko" : "")}>
                <span className="pbl"><span aria-hidden="true">{c.emoji}</span>{c.name}</span>
                <input data-testid={"pb-in-" + i} value={v} maxLength={PB_MAX_LEN} autoComplete="off" autoCorrect="off" spellCheck="false" autoCapitalize="words" enterKeyHint={i === pb.cats.length - 1 ? "done" : "next"}
                  placeholder={pb.letter + "…"} onChange={(e) => set(i, e.target.value)} onBlur={() => { clearTimeout(timer.current); send(vals); }} aria-invalid={bad ? "true" : undefined} />
                {bad ? <small className="pbhint">Doit commencer par {pb.letter}</small> : null}
              </label>
            );
          })}
        </div>
      </div>
      <button className="btn primary pbstop" data-testid="pb-stop" disabled={!complete || Boolean(pb.stop)} onClick={stop}>
        {pb.stop ? "STOP déjà crié" : complete ? "STOP !" : "STOP (remplis tout)"}
      </button>
    </div>
  );
}

/* --------------------------- cartes de réponses --------------------------- */
const BADGE = { ok: "+10", dup: "doublon", empty: "vide", letter: "mauvaise lettre", out: "refusée" };
function Cards({ room, me, pb, onReject, readOnly }) {
  return (
    <div className="pbcards">
      {pb.rows.map((row) => {
        const c = catOf(pb.cats[row.c]);
        return (
          <section className="pbcard" key={row.c} aria-label={c.name}>
            <h3><span aria-hidden="true">{c.emoji}</span> {c.name}</h3>
            <ul>
              {row.items.map((it) => {
                const p = room.players.find((x) => x.id === it.id);
                if (!p) return null;
                const voters = (pb.rej && pb.rej[row.c + ":" + it.id]) || [];
                const mine = voters.includes(me.id);
                const can = !readOnly && it.id !== me.id && it.st !== "empty" && it.st !== "letter";
                return (
                  <li key={it.id} className={"pbit " + it.st + (it.id === me.id ? " me" : "")}>
                    <span className="pbwho"><PlayerAvatar name={p.name} look={p.look} />{it.id === me.id ? "Toi" : p.name}</span>
                    <span className="pbans">{it.a ? it.a : "—"}</span>
                    <b className="pbbadge">{it.pts ? "+" + it.pts : BADGE[it.st]}{it.st === "dup" ? " doublon" : ""}</b>
                    {(voters.length > 0 || can) && (
                      <button className={"pbrej" + (mine ? " on" : "")} data-testid={`pb-rej-${row.c}-${it.id}`} disabled={!can} aria-pressed={mine}
                        aria-label={`Contester la réponse de ${p.name}`} onClick={() => { vibrate(15); onReject(row.c, it.id, !mine); }}>
                        ✋{voters.length ? <i>{voters.length}</i> : null}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------ 3. contestation ------------------------------ */
function Vote({ room, me, api }) {
  const pb = room.pb;
  const done = pb.ok.includes(me.id);
  const humans = room.players.filter((p) => !p.bot).length;
  return (
    <div className="screen pbvote">
      <div>
        <div className="eyebrow">Manche {pb.round}/{pb.total} · lettre {pb.letter}</div>
        <h2 style={{ fontSize: "1.3rem" }}>Toutes les réponses</h2>
        <p className="muted pbnote">Une réponse bidon ? Touche ✋ pour la contester : si plus de la moitié des autres joueurs la conteste, elle est refusée.</p>
      </div>
      <Fuse deadline={room.deadline} total={PB_VOTE_SECONDS} />
      <div className="scroll pbscroll"><Cards room={room} me={me} pb={pb} onReject={api.pbReject} /></div>
      <button className="btn good" data-testid="pb-ok" disabled={done} onClick={api.pbOk}>{done ? `En attente… ${pb.ok.length}/${humans}` : "Valider"}</button>
    </div>
  );
}

/* ------------------------------ 4. points de la manche ------------------------------ */
function Result({ room, me, api, isHost }) {
  const pb = room.pb, last = pb.last;
  if (!last) return null;
  const rows = [...room.players].sort((a, b) => (pb.scores[b.id] || 0) - (pb.scores[a.id] || 0));
  const stopper = last.stop ? nameOf(room, me, last.stop.by) : null;
  return (
    <div className="screen pbresult">
      <div>
        <div className="eyebrow">Manche {pb.round}/{pb.total} terminée · lettre {last.letter}</div>
        <h2 style={{ fontSize: "1.4rem" }}>{me.id && last.gain[me.id] != null ? `+${last.gain[me.id]} points` : "Résultats"}</h2>
        {stopper && <small className="muted">🛑 STOP crié par {stopper}</small>}
      </div>
      <div className="scroll">
        <ol className="rank mgstand">
          {rows.map((p, k) => (
            <li key={p.id} className={p.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 50}ms` }}>
              <span className="pos">{k + 1}</span>
              <span className="who"><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
              <b className="gain">+{last.gain[p.id] || 0}</b>
              <small>{pb.scores[p.id] || 0} pts</small>
            </li>
          ))}
        </ol>
        <details className="pbdetails">
          <summary>Revoir toutes les réponses</summary>
          <Cards room={room} me={me} pb={{ ...pb, rows: last.rows }} readOnly />
        </details>
      </div>
      <Fuse deadline={room.deadline} total={PB_RESULT_SECONDS} />
      {isHost && <button className="btn small ghost" data-testid="pb-next" onClick={api.pbNext}>{pb.round >= pb.total ? "Voir le classement final" : "Manche suivante"}</button>}
    </div>
  );
}

/* ------------------------------ 5. podium ------------------------------ */
function Final({ room, me, api, isHost, onLeave }) {
  const pb = room.pb, F = pb.final || [];
  const win = F.filter((r) => r.rank === 1);
  const byId = (id) => room.players.find((p) => p.id === id);
  const top = F.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const winner = win.length === 1 ? byId(win[0].id) : null;
  return (
    <div className="screen mgfinal pbfinal">
      <div>
        <div className="eyebrow">Fin du petit bac · {pb.total} manches</div>
        <h2 style={{ fontSize: "1.5rem" }} data-testid="pb-winner">{win.length > 1 ? "Égalité !" : winner && winner.id === me.id ? "Tu gagnes !" : `${winner ? winner.name : "?"} gagne`}</h2>
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
                <b className="gain">{r.pts}</b><small>pts</small>
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
