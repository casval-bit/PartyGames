import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, Fuse, playerColor } from "../ui/parts.jsx";
import { CELEB_LEVELS, CELEB_PENALTY, golfName } from "../data/celeb.js";
import { CC_RESULT_SECONDS, CC_PLAY_SECONDS } from "../config.js";
import { vibrate } from "../lib/util.js";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const strokeClass = (n) => (n == null ? "" : n >= CELEB_PENALTY ? "out" : n <= 2 ? "great" : n <= 4 ? "ok" : "meh");

export default function Celeb({ room, me, api, onLeave }) {
  const cc = room.cc;
  const isHost = room.hostId === me.id;
  if (!cc) return null;
  return (
    <div className="ccroot">
      {room.phase === "cc_load" && <Load cc={cc} />}
      {room.phase === "cc_play" && <Play key={cc.round} room={room} me={me} api={api} />}
      {room.phase === "cc_result" && <Result room={room} me={me} api={api} isHost={isHost} />}
      {room.phase === "cc_final" && <Final room={room} me={me} api={api} isHost={isHost} onLeave={onLeave} />}
    </div>
  );
}

/* ------------------------------ photo pixellisée ------------------------------ */
// `blocks` = nombre de gros pixels sur le plus grand côté ; 0 = photo nette.
export function Pixel({ url, blocks, testid }) {
  const cv = useRef(null), imgRef = useRef(null);
  const [ready, setReady] = useState(false), [bad, setBad] = useState(false);
  useEffect(() => {
    setReady(false); setBad(false); imgRef.current = null;
    if (!url) return undefined;
    const im = new Image();
    im.onload = () => { imgRef.current = im; setReady(true); };
    im.onerror = () => setBad(true);
    im.src = url;
    return () => { im.onload = null; im.onerror = null; };
  }, [url]);
  useEffect(() => {
    const c = cv.current, im = imgRef.current;
    if (!c || !im || !ready) return;
    const iw = im.naturalWidth || 1, ih = im.naturalHeight || 1;
    const maxW = 360, maxH = 360, k = Math.min(maxW / iw, maxH / ih);
    const W = Math.max(1, Math.round(iw * k)), H = Math.max(1, Math.round(ih * k));
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!blocks) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, 0, 0, W, H); return; }
    const sw = Math.max(1, Math.round(iw >= ih ? blocks : (blocks * iw) / ih)), sh = Math.max(1, Math.round(iw >= ih ? (blocks * ih) / iw : blocks));
    const small = document.createElement("canvas");
    small.width = sw; small.height = sh;
    const sx = small.getContext("2d");
    sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = "high";
    sx.drawImage(im, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false; // gros pixels bien carrés
    ctx.drawImage(small, 0, 0, sw, sh, 0, 0, W, H);
  }, [ready, blocks]);
  return (
    <div className="ccimg" data-testid={testid || "cc-img"} data-blocks={blocks} data-ready={ready ? "1" : "0"}>
      {bad ? <div className="ccbad">Photo indisponible…</div> : <canvas ref={cv} width="360" height="240" aria-label={blocks ? "Photo pixellisée à deviner" : "Photo"} />}
      {!ready && !bad && <div className="ccloadimg" role="status">Chargement de la photo…</div>}
    </div>
  );
}

/* ------------------------------ 0. recherche de la photo ------------------------------ */
function Load({ cc }) {
  return (
    <div className="screen center" role="status">
      <div className="eyebrow">Célébrité · {cc.round}/{cc.total}</div>
      <div className="ccspin" aria-hidden="true">🔍</div>
      <h2 style={{ fontSize: "1.4rem" }}>Qui sera la prochaine célébrité ?</h2>
      <div className="wait">Recherche d'une photo<i /><i /><i /></div>
    </div>
  );
}

/* ------------------------------ 1. on devine ------------------------------ */
function Play({ room, me, api }) {
  const cc = room.cc;
  const pr = cc.prog[me.id] || { tries: 0, got: null, res: null };
  const done = pr.got != null;
  const [text, setText] = useState("");
  const [log, setLog] = useState([]); // mes propositions de la manche : { text, res }
  const waiting = useRef(false);
  const inp = useRef(null);
  const lvl = Math.min(pr.tries, CELEB_LEVELS.length - 1);
  // la réponse du créateur arrive : on note le verdict de ma dernière proposition
  useEffect(() => {
    if (!waiting.current) return;
    waiting.current = false;
    setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, res: pr.res } : x)));
  }, [pr.tries]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = (t) => {
    if (done || waiting.current) return;
    waiting.current = true;
    vibrate(20);
    setLog((l) => [...l, { text: t || "(je sèche)", res: null }]);
    setText("");
    api.ccGuess(t);
    if (inp.current) inp.current.focus();
  };
  const last = log[log.length - 1];
  const leftTries = CELEB_LEVELS.length - pr.tries;
  return (
    <div className="screen ccplay">
      <div className="row spread">
        <div>
          <div className="eyebrow">Célébrité · {cc.round}/{cc.total}</div>
          {cc.hint && <span className="cchint" data-testid="cc-hint">{cc.hint}</span>}
        </div>
        <div className="pbprog" aria-label="Progression des joueurs">
          {room.players.map((p) => {
            const q = cc.prog[p.id] || {};
            return (
              <span key={p.id} className={"pbp" + (q.got != null ? " done" : "")} title={p.name} style={{ "--tc": playerColor(p.ci) }}>
                <PlayerAvatar name={p.name} look={p.look} />
                <i>{q.got != null ? (q.got >= CELEB_PENALTY ? "✗" : "✓") : q.tries || 0}</i>
              </span>
            );
          })}
        </div>
      </div>
      <Fuse deadline={room.deadline} total={CC_PLAY_SECONDS} />
      <Pixel url={cc.url} blocks={done ? 0 : CELEB_LEVELS[lvl]} />
      <div className="ccdots" aria-label={`Essai ${Math.min(pr.tries + 1, CELEB_LEVELS.length)} sur ${CELEB_LEVELS.length}`}>
        {CELEB_LEVELS.map((_, i) => <i key={i} className={i < pr.tries ? "used" : i === pr.tries && !done ? "cur" : ""} />)}
        <span data-testid="cc-left">{done ? "" : `${leftTries} essai${leftTries > 1 ? "s" : ""} restant${leftTries > 1 ? "s" : ""}`}</span>
      </div>
      {log.length > 0 && (
        <ul className="ccguesses" data-testid="cc-log">
          {log.map((g, i) => <li key={i} className={g.res || ""}>{g.res === "close" ? "≈" : "✗"} {g.text}{g.res === "close" ? " · presque !" : ""}</li>)}
        </ul>
      )}
      {done ? (
        <div className={"ccdone " + strokeClass(pr.got)} role="status" data-testid="cc-done">
          {pr.got >= CELEB_PENALTY
            ? <><b>Raté !</b> <span>Tu n'as pas trouvé : {CELEB_PENALTY} coups de pénalité.</span></>
            : <><b>{golfName(pr.got)} !</b> <span>Trouvé en {pr.got} coup{pr.got > 1 ? "s" : ""}. Chut, les autres cherchent encore…</span></>}
        </div>
      ) : (
        <form className="ccform" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(text.trim()); }}>
          <input ref={inp} data-testid="cc-in" value={text} maxLength={60} autoComplete="off" autoCorrect="off" spellCheck="false" autoCapitalize="words" enterKeyHint="send"
            placeholder="Qui est-ce ?" onChange={(e) => setText(e.target.value)} />
          <button className="btn primary" data-testid="cc-send" type="submit" disabled={!text.trim()}>Proposer</button>
        </form>
      )}
      {!done && (
        <button className="btn small ghost" data-testid="cc-skip" onClick={() => send("")}>
          {pr.tries + 1 >= CELEB_LEVELS.length ? "Je sèche (dernier essai)" : "Je sèche : dévoiler un peu plus"}
        </button>
      )}
      {!done && last && last.res === "wrong" && <p className="muted ccnote" role="status">Raté ! La photo s'éclaircit.</p>}
    </div>
  );
}

/* ------------------------------ 2. la réponse ------------------------------ */
function Result({ room, me, api, isHost }) {
  const cc = room.cc;
  if (!cc.end) return null;
  const mine = (cc.prog[me.id] || {}).got;
  const rows = [...room.players].sort((a, b) => (cc.totals[a.id] || 0) - (cc.totals[b.id] || 0));
  return (
    <div className="screen ccresult">
      <div>
        <div className="eyebrow">Célébrité · {cc.round}/{cc.total}</div>
        <h2 className="ccname" data-testid="cc-answer">{cc.end.name}</h2>
        {mine != null && <div className={"ccmine " + strokeClass(mine)} data-testid="cc-mine">{mine >= CELEB_PENALTY ? `Pas trouvé : +${CELEB_PENALTY} coups` : `${golfName(mine)} · ${mine} coup${mine > 1 ? "s" : ""}`}</div>}
      </div>
      <Pixel url={cc.end.url} blocks={0} testid="cc-img-answer" />
      <div className="scroll">
        <ol className="rank ccstand">
          {rows.map((p, k) => {
            const g = (cc.prog[p.id] || {}).got;
            return (
              <li key={p.id} className={p.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 50}ms` }}>
                <span className="pos">{k + 1}</span>
                <span className="who"><PlayerAvatar name={p.name} look={p.look} />{p.id === me.id ? "Toi" : p.name}</span>
                <b className={"ccstroke " + strokeClass(g)}>{g == null ? "–" : g >= CELEB_PENALTY ? "+" + CELEB_PENALTY : g}</b>
                <small>{cc.totals[p.id] || 0} au total</small>
              </li>
            );
          })}
        </ol>
      </div>
      <Fuse deadline={room.deadline} total={CC_RESULT_SECONDS} />
      {isHost && <button className="btn small ghost" data-testid="cc-next" onClick={api.ccNext}>{cc.round >= cc.total ? "Voir le classement final" : "Célébrité suivante"}</button>}
    </div>
  );
}

/* ------------------------------ 3. classement ------------------------------ */
function Final({ room, me, api, isHost, onLeave }) {
  const cc = room.cc, F = cc.final || [];
  const byId = (id) => room.players.find((p) => p.id === id);
  const win = F.filter((r) => r.rank === 1);
  const top = F.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const winner = win.length === 1 ? byId(win[0].id) : null;
  return (
    <div className="screen mgfinal ccfinal">
      <div>
        <div className="eyebrow">Fin · {cc.total} célébrités · le moins de coups gagne</div>
        <h2 style={{ fontSize: "1.5rem" }} data-testid="cc-winner">{F.length < 2 ? `${F[0] ? F[0].total : 0} coups` : win.length > 1 ? "Égalité !" : winner && winner.id === me.id ? "Tu gagnes !" : `${winner ? winner.name : "?"} gagne`}</h2>
      </div>
      {F.length > 1 && (
        <div className="podium" aria-label="Podium">
          {order.map((r) => {
            const p = byId(r.id);
            if (!p) return null;
            return (
              <div key={r.id} className={"pod p" + Math.min(3, r.rank)} style={{ "--tc": playerColor(p.ci), "--tink": "#1d2457" }}>
                <PlayerAvatar name={p.name} look={p.look} showLv />
                <span className="who">{r.id === me.id ? "Toi" : p.name}</span>
                <div className="blk"><b>{r.total}</b><span>{MEDAL[r.rank] || ord(r.rank)}</span></div>
              </div>
            );
          })}
        </div>
      )}
      <div className="scroll">
        <ol className="rank">
          {F.map((r, k) => {
            const p = byId(r.id);
            if (!p) return null;
            return (
              <li key={r.id} className={"ccrow" + (r.id === me.id ? " me" : "")} style={{ animationDelay: `${k * 60}ms` }}>
                <span className="pos">{ord(r.rank)}</span>
                <span className="who"><PlayerAvatar name={p.name} look={p.look} />{r.id === me.id ? "Toi" : p.name}</span>
                <b className="gain">{r.total}</b><small>coups</small>
                <div className="cccard" aria-label="Coups par célébrité">
                  {(cc.hist[r.id] || []).map((n, i) => <i key={i} className={strokeClass(n)} title={cc.past[i] ? cc.past[i].name : ""}>{n >= CELEB_PENALTY ? "✗" : n}</i>)}
                </div>
              </li>
            );
          })}
        </ol>
        <h3 className="ccgallh">Les célébrités</h3>
        <ul className="ccgal">
          {cc.past.map((c, i) => (
            <li key={i}><img src={c.url} alt="" loading="lazy" /><span>{c.name}</span></li>
          ))}
        </ul>
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button>
        : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn small ghost" onClick={onLeave}>Quitter</button>
    </div>
  );
}
