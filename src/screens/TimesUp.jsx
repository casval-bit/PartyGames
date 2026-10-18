import { useEffect, useRef, useState } from "react";
import { GameCard, Fuse, PlayerAvatar, teamStyle } from "../ui/parts.jsx";
import { TEAMS, TU_READY_SECONDS, TU_ROUNDEND_SECONDS, TU_ROUND_RULES, TIME_BONUS_S, SCORE_BONUS_PTS } from "../config.js";
import { vibrate } from "../lib/util.js";

const plural = (n, a, b) => (n > 1 ? b : a);

export default function TimesUp({ room, me, api, queue, onLeave }) {
  const tu = room.tu;
  if (!tu) return null;
  const mine = tu.playerId === me.id;
  switch (room.phase) {
    case "tu_ready": return <Ready room={room} mine={mine} api={api} />;
    case "tu_play": return mine ? <Cards key={tu.turnNo} room={room} api={api} queue={queue} /> : <Watch room={room} />;
    case "tu_turnend": return <TurnEnd room={room} />;
    case "tu_roundend": return <RoundEnd room={room} me={me} api={api} />;
    default: return <Final room={room} me={me} api={api} onLeave={onLeave} />;
  }
}

const teamsOf = (room) => [...new Set(room.players.map((p) => p.team))].sort((a, b) => a - b);
const total = (tu, t) => tu.teamScores[t] || 0;
const pointsOf = (v) => v.reduce((s, x) => s + (x.b === "score" ? SCORE_BONUS_PTS : 1), 0);

/** Petit éclat « +10 s » / « +3 » quand une carte bonus est réussie (tu.fx.n augmente à chaque bonus). */
function BonusPop({ fx }) {
  const first = useRef(fx ? fx.n : 0);
  if (!fx || fx.n === first.current) return null;
  return (
    <div key={fx.n} className={"bpop " + fx.kind} aria-live="polite">
      <b>{fx.kind === "time" ? `+${TIME_BONUS_S} s` : `+${SCORE_BONUS_PTS}`}</b>
      <span>{fx.name}</span>
    </div>
  );
}

/* ------------------- 1. "Tour de l'équipe X, joueur Y" ------------------- */
function Ready({ room, mine, api }) {
  const tu = room.tu;
  const who = room.players.find((p) => p.id === tu.playerId);
  const secs = Math.round(tu.turnMs / 1000);
  return (
    <div className="qe-full tready" style={teamStyle(tu.team)} onClick={() => mine && (vibrate(30), api.begin())} role={mine ? "button" : undefined} aria-label={mine ? "Touche l'écran pour commencer ton tour" : undefined}>
      <div className="trtop">
        <span className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>{tu.rule.title} sur {tu.total} · {secs} s{tu.carry ? " (temps restant)" : ""}</span>
        <p className="trrule">{tu.rule.rule}</p>
      </div>
      <div className="trmid">
        <h2>Tour de l'équipe {TEAMS[tu.team].name}</h2>
        <div className="who">{who ? who.name : "?"}</div>
        {mine ? (
          <>
            <div className="taphere"><i /><b>Touche l'écran</b></div>
            <p style={{ fontWeight: 800 }}>quand tu es prêt : cache bien ton écran !</p>
          </>
        ) : (
          <p style={{ fontWeight: 800 }}>{who ? who.name : "Un joueur"} va faire deviner son équipe.<br />Ne regardez pas son écran.</p>
        )}
      </div>
      <div className="trbot">Il reste {tu.deckLeft} {plural(tu.deckLeft, "carte", "cartes")} dans le paquet</div>
    </div>
  );
}

/* ------------- 2a. le joueur qui fait deviner : cartes à swiper ------------- */
function Cards({ room, api, queue }) {
  const tu = room.tu;
  const [q, setQ] = useState([]);       // 3 prochaines cartes (copie locale du serveur, avancée tout de suite à chaque swipe)
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState([]); // cartes en train de s'envoler
  const seq = useRef(0);
  const start = useRef(null);
  const dxRef = useRef(0); // valeur courante du glissement (le state peut avoir un rendu de retard sur un swipe rapide)

  // le serveur renvoie les vraies prochaines cartes ; on n'applique que la réponse au dernier swipe fait
  useEffect(() => {
    if (queue && queue.turn === tu.turnNo && queue.seq === seq.current) setQ(queue.cards);
  }, [queue, tu.turnNo]);

  const top = q[0];
  const commit = (ok) => {
    if (!top) return;
    seq.current += 1;
    const k = seq.current;
    api.swipe(top.id, ok, k);
    vibrate(ok ? [18, 30, 18] : 14);
    setGone((g) => [...g, { k, card: top, ok, x: dxRef.current }]);
    setTimeout(() => setGone((g) => g.filter((x) => x.k !== k)), 230);
    setQ((prev) => { const [first, ...rest] = prev; return !ok && prev.length < 3 ? [...rest, first] : rest; }); // petit paquet : la carte passée revient au fond
    dxRef.current = 0; setDx(0);
  };
  const down = (e) => { dxRef.current = 0; start.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } };
  const move = (e) => { if (start.current != null) { dxRef.current = e.clientX - start.current; setDx(dxRef.current); } };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    const d = dxRef.current;
    if (Math.abs(d) > 80) commit(d > 0); else { dxRef.current = 0; setDx(0); }
  };

  const p = Math.min(1, Math.abs(dx) / 80);
  return (
    <div className="qe-full tcards" style={teamStyle(tu.team)}>
      <div className="tc-top">
        <span className="tc-chip">{tu.validated.length} {plural(tu.validated.length, "trouvée", "trouvées")}</span>
        <BonusPop fx={tu.fx} />
        <span className="eyebrow">{tu.rule.title} · {tu.deckLeft} {plural(tu.deckLeft, "carte", "cartes")} restantes</span>
      </div>
      <div className="tc-stage">
        <div className="tc-hint l" style={{ opacity: dx < 0 ? p : 0 }}>PASSER</div>
        <div className="tc-hint r" style={{ opacity: dx > 0 ? p : 0 }}>TROUVÉ</div>
        {q.length > 1 && <div className="tc-next" aria-hidden="true" />}
        {top ? (
          <div key={top.id + ":" + seq.current} className={"tc-card" + (start.current != null ? " drag" : "")}
            style={{ transform: `translateX(${dx}px) rotate(${dx / 16}deg)` }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <GameCard card={top} up bonus={top.bonus} className="static" />
          </div>
        ) : <div className="muted" style={{ fontWeight: 800 }}>…</div>}
        {gone.map((g) => (
          <div key={g.k} className={"tc-card gone " + (g.ok ? "r" : "l")} style={{ "--x0": `${g.x}px` }} aria-hidden="true">
            <GameCard card={g.card} up bonus={g.card.bonus} className="static" />
          </div>
        ))}
      </div>
      <div className="tc-bot">
        <p className="tc-legend"><span>← passer</span><span>trouvé →</span></p>
        <div className="minifuse"><Fuse deadline={room.deadline} total={Math.round(tu.turnMs / 1000)} /></div>
      </div>
    </div>
  );
}

/* -------- 2b. les autres : chrono + noms des cartes trouvées -------- */
function Watch({ room }) {
  const tu = room.tu;
  const who = room.players.find((p) => p.id === tu.playerId);
  const list = [...tu.validated].reverse();
  return (
    <div className="screen twatch">
      <div className="row spread">
        <div>
          <div className="eyebrow">{tu.rule.title} sur {tu.total}</div>
          <h2 style={{ fontSize: "1.2rem" }}>{who ? who.name : "?"} fait deviner</h2>
        </div>
        <span className="tc-chip" style={teamStyle(tu.team)}>Équipe {TEAMS[tu.team].name}</span>
      </div>
      <Fuse deadline={room.deadline} total={Math.round(tu.turnMs / 1000)} />
      <BonusPop fx={tu.fx} />
      <div className="tw-count" style={teamStyle(tu.team)}><b key={tu.validated.length}>{tu.validated.length}</b><span>{plural(tu.validated.length, "carte trouvée", "cartes trouvées")}</span></div>
      <div className="scroll">
        <ul className="tw-list">
          {list.map((v, i) => <li key={v.n + i} className={v.b ? "bn-" + v.b : ""} style={teamStyle(tu.team)}>{v.n}{v.b && <small>{v.b === "time" ? `+${TIME_BONUS_S} s` : `+${SCORE_BONUS_PTS} pts`}</small>}</li>)}
          {!list.length && <li className="empty">Les cartes validées apparaîtront ici.</li>}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------- 3. récap de fin de tour ----------------------- */
function TurnEnd({ room }) {
  const tu = room.tu;
  const n = tu.validated.length;
  const pts = pointsOf(tu.validated);
  const title = tu.endReason === "empty" ? "Paquet épuisé !" : tu.endReason === "time" ? "Temps écoulé !" : "Tour passé";
  return (
    <div className="qe-full tend" style={teamStyle(tu.team)}>
      <div className="trmid">
        <p className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>{tu.rule.title}</p>
        <h2>{title}</h2>
        <div className="bignum" key={pts}>+{pts}</div>
        <p style={{ fontWeight: 800 }}>{plural(n, "carte trouvée", "cartes trouvées")}{pts !== n ? ` · ${pts} points` : ""} pour l'équipe {TEAMS[tu.team].name}</p>
        {n > 0 && <div className="tend-list">{tu.validated.map((v, i) => <span key={v.n + i} className={v.b ? "bn-" + v.b : ""}>{v.n}</span>)}</div>}
      </div>
      <div className="trbot">{tu.endReason === "empty" ? "Fin de la manche…" : "Au tour de l'équipe suivante…"}</div>
    </div>
  );
}

function Scores({ room }) {
  const tu = room.tu;
  const teams = teamsOf(room).sort((a, b) => total(tu, b) - total(tu, a));
  return (
    <div className="teamscores">
      {teams.map((t, k) => (
        <div key={t} className="ts" style={{ ...teamStyle(t), animationDelay: `${k * 120}ms` }}>
          <span>Équipe {TEAMS[t].name}</span>
          <b>{total(tu, t)}</b>
          <small>{tu.roundScores.map((r) => r[t] || 0).join(" + ")}</small>
        </div>
      ))}
    </div>
  );
}

/* ------------------------- 4. scores entre deux manches ------------------------- */
function RoundEnd({ room, me, api }) {
  const tu = room.tu;
  const next = TU_ROUND_RULES[Math.min(tu.round, TU_ROUND_RULES.length - 1)];
  const meP = room.players.find((p) => p.id === me.id);
  const ready = Boolean(meP && meP.ready);
  return (
    <div className="screen">
      <div>
        <div className="eyebrow">{tu.rule.title} terminée</div>
        <h2 style={{ fontSize: "1.5rem" }}>Les scores</h2>
      </div>
      <Scores room={room} />
      <div className="nextrule">
        <div className="eyebrow">À suivre · {next.title}</div>
        <p>{next.rule}</p>
        <p className="muted" style={{ fontWeight: 700, fontSize: ".85rem" }}>{room.settings.variant === "bonus" ? "Ensuite : 20 nouvelles cartes pour chacun, et tu repose tes bonus." : "Même paquet, remélangé."}</p>
      </div>
      <div className="grow" />
      <Fuse deadline={room.deadline} total={TU_ROUNDEND_SECONDS} />
      {ready ? (
        <div className="waitlist">{room.players.map((p) => <span key={p.id} className={p.ready ? "ok" : ""}>{p.name}{p.ready ? " ✓" : ""}</span>)}</div>
      ) : (
        <button className="btn good" onClick={() => api.ready(true)}>Prêt pour la suite</button>
      )}
    </div>
  );
}

/* ------------------------------ 5. fin de partie ------------------------------ */
function Final({ room, me, api, onLeave }) {
  const tu = room.tu;
  const teams = teamsOf(room).sort((a, b) => total(tu, b) - total(tu, a));
  const tie = teams.length > 1 && total(tu, teams[0]) === total(tu, teams[1]);
  const isHost = room.hostId === me.id;
  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Fin de la partie</div>
        <h2 style={{ fontSize: "1.5rem" }}>{tie ? "Égalité !" : `Équipe ${TEAMS[teams[0]].name} gagne`}</h2>
      </div>
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Scores room={room} />
        <div className="muted" style={{ fontWeight: 700, fontSize: ".85rem" }}>Détail sous chaque score : {tu.roundScores.map((_, i) => `manche ${i + 1}`).join(" + ")}.</div>
        <div className="waitlist">{room.players.map((p) => (
          <span key={p.id} style={teamStyle(p.team)}><PlayerAvatar name={p.name} look={p.look} /> {p.id === me.id ? "Toi" : p.name}</span>
        ))}</div>
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
