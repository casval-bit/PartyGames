import { useEffect, useRef, useState } from "react";
import { BY_ID } from "../data/categories.js";
import { PlayerAvatar, Fuse, teamStyle, useNow } from "../ui/parts.jsx";
import { QE_COUNT_MS, QE_HOLD_MS, QE_PLAY_SECONDS, QE_RESULT_MS, QE_TAP_SECONDS, TEAMS } from "../config.js";
import { vibrate } from "../lib/util.js";
import { safeUrl } from "../lib/safeUrl.js";

const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const GOOFY = [
  ["5", "Cinq ! C'est beaucoup, cinq."],
  ["4", "Quatre… ne cligne pas des yeux."],
  ["3", "Trois ! Sors ton regard de lynx."],
  ["2", "Deux… respire par le nez."],
  ["1", "Un ! Ça arrive, ça arrive !"],
];

export default function QuiEst({ room, me, api, onLeave }) {
  const qe = room.qe;
  // l'image est chargée pendant le tap et le décompte, pour qu'elle apparaisse instantanément
  useEffect(() => { if (qe && safeUrl(qe.url)) { const i = new Image(); i.referrerPolicy = "no-referrer"; i.src = safeUrl(qe.url); } }, [qe && qe.url]);
  if (!qe) return null;
  switch (room.phase) {
    case "qe_tap": return <Tap room={room} me={me} api={api} />;
    case "qe_count": return <Count room={room} />;
    case "qe_play": return <Play key={qe.round} room={room} me={me} api={api} />;
    case "qe_result": return <Result room={room} me={me} />;
    default: return <Final room={room} me={me} api={api} onLeave={onLeave} />;
  }
}

/* ---------------------------- 1. touche l'écran ---------------------------- */
function Tap({ room, me, api }) {
  const qe = room.qe;
  const meP = room.players.find((p) => p.id === me.id);
  const ready = Boolean(meP && meP.ready);
  return (
    <div className="qe-full qtap" onClick={() => { if (!ready) { vibrate(25); api.ready(true); } }} role="button" aria-label="Touche l'écran quand tu es prêt">
      <div className="qe-top">
        <span className="eyebrow">Image {qe.round} sur {qe.total}</span>
      </div>
      <div className="qe-mid">
        {ready ? (
          <>
            <div className="tapdone">Prêt ✓</div>
            <div className="waitlist">{room.players.map((p) => <span key={p.id} className={p.ready ? "ok" : ""}>{p.name}{p.ready ? " ✓" : ""}</span>)}</div>
            <div className="wait" role="status">On attend les autres<i /><i /><i /></div>
          </>
        ) : (
          <>
            <div className="tapring"><i /><i /><b>?</b></div>
            <h2 className="taptxt">Touche l'écran</h2>
            <p className="muted" style={{ fontWeight: 700 }}>quand tu es prêt à voir l'image</p>
          </>
        )}
      </div>
      <div className="qe-bot"><Fuse deadline={room.deadline} total={QE_TAP_SECONDS} /></div>
    </div>
  );
}

/* ------------------------- 2. décompte rigolo ------------------------- */
function Count({ room }) {
  const now = useNow(50);
  const el = QE_COUNT_MS - Math.max(0, (room.deadline || now) - now);
  const k = Math.min(5, Math.floor(el / 1000));
  const go = k >= 5;
  const [num, txt] = go ? ["GO", "REGARDE !"] : GOOFY[k];
  useEffect(() => { vibrate(go ? [40, 30, 80] : 20); }, [k]);
  return (
    <div className={"qe-full count c" + (go ? "go" : k)}>
      <div className="blobs" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ "--i": i, left: `${(i * 37) % 85}%`, top: `${(i * 53) % 78 + 4}%` }} />)}</div>
      <div className="goofy" key={k} style={{ "--rot": k % 2 ? "-9deg" : "8deg" }}>{num}</div>
      <p className="goofy-txt" key={"t" + k}>{txt}</p>
    </div>
  );
}

/* --------------------- 3. l'image + appui long 3 s --------------------- */
function Play({ room, me, api }) {
  const qe = room.qe;
  const rank = qe.order.indexOf(me.id) + 1;
  const [prog, setProg] = useState(0);
  const [bad, setBad] = useState(false);
  const raf = useRef(0);
  const sent = useRef(false);
  const now = useNow(200);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = (e) => {
    if (raf.current || sent.current) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const t0 = performance.now();
    vibrate(15);
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / QE_HOLD_MS);
      setProg(p);
      if (p >= 1) { raf.current = 0; sent.current = true; vibrate([60, 40, 60]); api.found(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (!raf.current) return;
    cancelAnimationFrame(raf.current); raf.current = 0; setProg(0);
  };

  if (rank > 0) {
    const mine = room.players.find((p) => p.id === me.id);
    return (
      <div className="qe-full found" style={teamStyle(mine ? mine.team : 0)}>
        <div className="foundbadge">{ord(rank)}</div>
        <h2>Trouvé !</h2>
        <p style={{ fontWeight: 800 }}>Les autres cherchent encore… ({qe.order.length}/{room.players.length})</p>
        <div className="waitlist">{room.players.map((p) => <span key={p.id} className={qe.order.includes(p.id) ? "ok" : ""}>{p.name}{qe.order.includes(p.id) ? " ✓" : ""}</span>)}</div>
      </div>
    );
  }

  const left = Math.max(0, (room.deadline || now) - now);
  return (
    <div className="qe-full play" onPointerDown={start} onPointerUp={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
      {qe.url && !bad ? (
        <>
          <img className="bg" src={safeUrl(qe.url)} alt="" draggable="false" referrerPolicy="no-referrer" />
          <img className="pic" src={safeUrl(qe.url)} alt="Qui est-ce ?" draggable="false" referrerPolicy="no-referrer" onError={() => { setBad(true); api.imageFailed(); }} />
        </>
      ) : (
        <Placeholder qe={qe} />
      )}
      <i className="thin" style={{ width: `${(left / (QE_PLAY_SECONDS * 1000)) * 100}%` }} />
      {prog > 0 && <div className="holdbar" aria-hidden="true"><i style={{ width: `${prog * 100}%` }} /></div>}
    </div>
  );
}

// Pas d'image (ou image qui ne charge pas) : on affiche le nom. Le décompte sert déjà à cacher son écran des autres.
// (Aucune catégorie ni indice : trouver de quoi il s'agit fait partie du jeu.)
function Placeholder({ qe }) {
  const len = (qe.title || "").length;
  return (
    <div className="qe-ph">
      {qe.title ? <h2 className={"phname " + (len > 22 ? "l" : "")}>{qe.title}</h2> : <b>?</b>}
      {qe.why === "network" && <small className="phwhy">Wikipédia est injoignable depuis cet écran (l'aperçu bloque le réseau) : le nom s'affiche à la place. Ouvre la vraie appli pour voir les images.</small>}
    </div>
  );
}

/* ------------------------ 4. la réponse + classement ------------------------ */
function Result({ room, me }) {
  const qe = room.qe;
  const cat = BY_ID[qe.cat];
  const byId = Object.fromEntries(room.players.map((p) => [p.id, p]));
  const found = qe.order.map((id) => byId[id]).filter(Boolean);
  const lost = room.players.filter((p) => !qe.order.includes(p.id));
  return (
    <div className="screen">
      <div className="row spread">
        <span className="eyebrow">Image {qe.round} sur {qe.total}</span>
        {cat && <span className="catchip" style={{ background: cat.color.startsWith("hsl") ? cat.color : "var(--cream-2)" }}>{cat.label}</span>}
      </div>
      <div className="answer">
        {safeUrl(qe.url) ? <img src={safeUrl(qe.url)} alt={qe.answer} draggable="false" referrerPolicy="no-referrer" /> : <div className="qe-ph small"><b>?</b></div>}
        <h2 className="ansname">{qe.answer}</h2>
      </div>
      <div className="scroll">
        <ol className="rank">
          {found.map((p, k) => (
            <li key={p.id} style={{ animationDelay: `${k * 110}ms` }}>
              <span className="pos">{ord(k + 1)}</span>
              <span className="who" style={teamStyle(p.team)}><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
              <b className="gain">+{qe.gain[p.id]}</b>
              <small>{qe.scores[p.id]} pts</small>
            </li>
          ))}
          {lost.map((p) => (
            <li key={p.id} className="miss">
              <span className="pos">–</span>
              <span className="who" style={teamStyle(p.team)}><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
              <span className="muted">n'a pas trouvé</span>
              <small>{qe.scores[p.id] || 0} pts</small>
            </li>
          ))}
        </ol>
      </div>
      <Fuse deadline={room.deadline} total={QE_RESULT_MS / 1000} />
    </div>
  );
}

/* ------------------------------ 5. fin de partie ------------------------------ */
function Final({ room, me, api, onLeave }) {
  const qe = room.qe;
  const players = [...room.players].sort((a, b) => (qe.scores[b.id] || 0) - (qe.scores[a.id] || 0));
  const teams = Array.from({ length: room.settings.teamCount }, (_, t) => ({
    t, pts: room.players.filter((p) => p.team === t).reduce((s, p) => s + (qe.scores[p.id] || 0), 0), n: room.players.filter((p) => p.team === t).length,
  })).filter((x) => x.n > 0).sort((a, b) => b.pts - a.pts);
  const isHost = room.hostId === me.id;
  return (
    <div className="screen">
      <div>
        <div className="eyebrow">Fin de la partie · {qe.total} images</div>
        <h2 style={{ fontSize: "1.5rem" }}>Équipe {TEAMS[teams[0].t].name} en tête</h2>
      </div>
      <div className="scroll" style={{ gap: 14, display: "flex", flexDirection: "column" }}>
        <div className="teamscores">
          {teams.map((x, k) => (
            <div key={x.t} className="ts" style={{ ...teamStyle(x.t), animationDelay: `${k * 120}ms` }}>
              <span>Équipe {TEAMS[x.t].name}</span><b>{x.pts}</b>
            </div>
          ))}
        </div>
        <ol className="rank">
          {players.map((p, k) => (
            <li key={p.id} style={{ animationDelay: `${300 + k * 90}ms` }}>
              <span className="pos">{ord(k + 1)}</span>
              <span className="who" style={teamStyle(p.team)}><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
              <b className="gain">{qe.scores[p.id] || 0}</b><small>pts</small>
            </li>
          ))}
        </ol>
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
