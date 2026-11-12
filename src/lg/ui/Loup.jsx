// Loup-garou version Stranger Things : l'écran de partie (chaque joueur sur son téléphone).
// La nuit, chacun a quelque chose à toucher (personne ne peut deviner qui agit) ; le jour, on débat et on vote.
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLES, CAMPS } from "../roles.js";
import { CARD } from "../../tcg/cards/index.js";
import { cardArt } from "../../tcg/ui/art.js";
import { useArt } from "../../tcg/ui/artStore.js";
import { PlayerAvatar } from "../../ui/parts.jsx";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import "./lg.css";

const RAR = { village: "R", loups: "E", solo: "L" };
/** Carte du Trône des Mondes du personnage (son illustration), ou une carte fabriquée aux couleurs de Stranger Things. */
export function roleDef(role) {
  const d = ROLES[role];
  if (!d) return null;
  if (d.tcg && CARD[d.tcg]) return CARD[d.tcg];
  return { id: "lg-" + role, name: d.st, fam: "stranger", type: "char", r: RAR[d.camp] || "R", cost: 0 };
}
function RoleArt({ role, w = 120, h = 168, full = true, className = "" }) {
  const d = ROLES[role];
  const custom = useArt(d && d.tcg ? d.tcg : null);
  const src = useMemo(() => (custom ? null : cardArt(roleDef(role), w, h, full)), [role, w, h, full, custom]);
  return <img className={"lg-art " + className} src={custom || src || ""} alt="" draggable={false} />;
}
/** Carte de rôle carrée : l'illustration remplit le carré, le personnage et son rôle sont posés dessus.
 *  En grand (`big`), le pouvoir s'affiche sous la carte. */
export function RoleCard({ role, alias, big, onClick, dead, win }) {
  const d = ROLES[role];
  if (!d) return null;
  const camp = CAMPS[d.camp];
  const Tag = onClick ? "button" : "div";
  const card = (
    <Tag className={`lg-card${big ? " big" : ""}${dead ? " dead" : ""}${win ? " win" : ""}`} style={{ "--cc": camp.color }} onClick={onClick}>
      <RoleArt role={role} w={big ? 300 : 140} h={big ? 300 : 140} full />
      <span className="cp">{big ? camp.name : camp.tag}</span>
      <div className="lg-card-b">
        <b className="nm">{alias || d.st}</b>
        <span className="rl">{d.name}</span>
      </div>
    </Tag>
  );
  if (!big) return card;
  return (
    <div className="lg-cardbig" style={{ "--cc": camp.color }}>
      {card}
      <div className="lg-card-txt">
        {alias && <span className="sub">{d.st}</span>}
        <span className="sub">{d.sub}</span>
        <p className="pw">{d.power}</p>
      </div>
    </div>
  );
}

/* ------------------------------ petits morceaux ------------------------------ */
function useNow(active) {
  const [, setT] = useState(0);
  useEffect(() => { if (!active) return undefined; const iv = setInterval(() => setT((x) => x + 1), 250); return () => clearInterval(iv); }, [active]);
  return Date.now();
}
function Timer({ deadline }) {
  const now = useNow(Boolean(deadline));
  const total = useRef({ d: null, t: 0 });
  if (!deadline) return null;
  if (total.current.d !== deadline) total.current = { d: deadline, t: Math.max(1000, deadline - now) };
  const left = Math.max(0, deadline - now);
  const pct = Math.max(0, Math.min(100, (left / total.current.t) * 100));
  const s = Math.ceil(left / 1000);
  return (
    <div className={"lg-timer" + (s <= 10 ? " hot" : "")} role="timer" aria-label={`${s} secondes`}>
      <i style={{ width: pct + "%" }} /><span>{s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`}</span>
    </div>
  );
}
function Tile({ p, look, sel, onClick, disabled, badge, sub, me, cap, clan, small }) {
  const r = p.role && ROLES[p.role];
  return (
    <button className={`lg-tile${sel ? " sel" : ""}${!p.alive ? " dead" : ""}${me ? " me" : ""}${small ? " small" : ""}`} onClick={onClick} disabled={disabled || !onClick} aria-pressed={sel ? true : undefined} aria-label={`${p.name}${!p.alive ? " (mort)" : ""}`}>
      <span className="lg-av"><PlayerAvatar name={p.name} look={look} />{!p.alive && <span className="rip"><Icon name="skull" size={16} /></span>}{cap && <span className="capb" title="Capitaine"><Icon name="crown" size={13} /></span>}</span>
      <span className="nm">{p.name}{me ? " (toi)" : ""}</span>
      {r ? <span className="rl" style={{ color: CAMPS[r.camp].color }}>{p.alias || r.st}</span> : sub ? <span className="rl">{sub}</span> : null}
      {clan != null && <span className={"clan c" + clan}>{clan ? "Hellfire" : "Tigers"}</span>}
      {p.idiot && <span className="rl">Idiot révélé · ne vote plus</span>}
      {badge != null && badge !== 0 && <span className="lg-badge">{badge}</span>}
      {sel && <span className="ck"><Icon name="check" size={14} /></span>}
    </button>
  );
}

/* ------------------------------ questions ------------------------------ */
function PickPrompt({ q, lg, looks, meId, send, live, children, extraTop }) {
  const revisable = q.kind === "wolves" || q.kind === "vote" || q.kind === "cap";
  const mine = Array.isArray(q.mine) ? q.mine : [];
  const [sel, setSel] = useState(revisable ? mine : []);
  useEffect(() => { if (revisable) setSel(mine); }, [JSON.stringify(mine)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!revisable) setSel([]); }, [q.wid]); // eslint-disable-line react-hooks/exhaustive-deps
  const players = lg.players.filter((p) => q.opts.includes(p.id));
  const tap = (id) => {
    sfx.select();
    if (revisable) { const next = sel[0] === id ? [] : [id]; setSel(next); send(next.length ? { pick: next } : { skip: true }); return; }
    if (q.max === 1) setSel(sel[0] === id ? [] : [id]);
    else setSel(sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < q.max ? [...sel, id] : sel);
  };
  const counts = {};
  if (live) for (const v of Object.values(live)) if (v) counts[v] = (counts[v] || 0) + 1;
  const voters = {};
  if (live) for (const [k, v] of Object.entries(live)) if (v) (voters[v] = voters[v] || []).push(k);
  const name = (id) => (lg.players.find((p) => p.id === id) || {}).name || "?";
  return (
    <div className="lg-q">
      {extraTop}
      <div className="lg-grid">
        {players.map((p) => (
          <Tile key={p.id} p={p} look={looks[p.id]} me={p.id === meId} cap={lg.cap === p.id} sel={sel.includes(p.id)} onClick={() => tap(p.id)}
            badge={counts[p.id] ? counts[p.id] + (lg.vote && lg.vote.corbeau === p.id && q.kind === "vote" ? 2 : 0) : lg.vote && lg.vote.corbeau === p.id && q.kind === "vote" ? "+2" : null}
            sub={voters[p.id] ? voters[p.id].map(name).join(", ") : null} />
        ))}
      </div>
      {children}
      {!revisable && (
        <div className="lg-acts">
          {q.skip && <button className="lg-btn ghost" onClick={() => { sfx.select(); send({ skip: true }); }}>{q.kind === "dream" ? "Je dors" : "Ne rien faire"}</button>}
          <button className="lg-btn" disabled={sel.length < q.min || sel.length > q.max} onClick={() => { sfx.apply(); send({ pick: sel }); }}>Valider{q.max > 1 ? ` (${sel.length}/${q.max})` : ""}</button>
        </div>
      )}
      {revisable && <p className="lg-hint">{q.kind === "wolves" ? "Quand toute la meute vise la même victime, la nuit continue." : "Tu peux changer d'avis jusqu'à la fin du vote."}{sel.length ? "" : " (Aucun vote pour l'instant.)"}</p>}
    </div>
  );
}
function ComedienPrompt({ q, lg, looks, meId, send }) {
  const [power, setPower] = useState(null);
  const [t, setT] = useState(null);
  const players = lg.players.filter((p) => q.opts.includes(p.id) && (power === "salvateur" || p.id !== meId));
  return (
    <div className="lg-q">
      <div className="lg-chips">{q.choices.map((c) => <button key={c.v} aria-pressed={power === c.v} onClick={() => { setPower(c.v); sfx.select(); }}>{c.label}</button>)}</div>
      {power && <div className="lg-grid">{players.map((p) => <Tile key={p.id} p={p} look={looks[p.id]} me={p.id === meId} sel={t === p.id} onClick={() => { setT(p.id); sfx.select(); }} />)}</div>}
      <div className="lg-acts">
        <button className="lg-btn ghost" onClick={() => send({ skip: true })}>Pas cette nuit</button>
        <button className="lg-btn" disabled={!power || !t} onClick={() => { sfx.apply(); send({ v: power, pick: [t] }); }}>Jouer ce pouvoir</button>
      </div>
    </div>
  );
}
function WitchPrompt({ q, lg, looks, meId, send }) {
  const [save, setSave] = useState(null);
  const [kill, setKill] = useState(null);
  const name = (id) => (lg.players.find((p) => p.id === id) || {}).name || "?";
  return (
    <div className="lg-q">
      <div className="lg-pots">
        <span className={"pot" + (q.life ? "" : " used")}><Icon name="sparkle" size={16} />Potion de vie {q.life ? "" : "(utilisée)"}</span>
        <span className={"pot" + (q.death ? "" : " used")}><Icon name="skull" size={16} />Potion de mort {q.death ? "" : "(utilisée)"}</span>
      </div>
      {q.life && q.victims.length > 0 && (
        <div className="lg-sec"><h4>Sauver avec la potion de vie</h4>
          <div className="lg-chips">{q.victims.map((id) => <button key={id} aria-pressed={save === id} onClick={() => setSave(save === id ? null : id)}>{name(id)}{id === meId ? " (toi)" : ""}</button>)}</div>
        </div>
      )}
      {q.death && (
        <div className="lg-sec"><h4>Utiliser la potion de mort</h4>
          <div className="lg-grid">{lg.players.filter((p) => q.opts.includes(p.id)).map((p) => <Tile key={p.id} small p={p} look={looks[p.id]} sel={kill === p.id} onClick={() => setKill(kill === p.id ? null : p.id)} />)}</div>
        </div>
      )}
      <div className="lg-acts">
        <button className="lg-btn" onClick={() => { sfx.apply(); send({ ...(save ? { save } : {}), ...(kill ? { kill } : {}) }); }}>{save || kill ? "Valider" : "Ne rien faire"}</button>
      </div>
    </div>
  );
}
function DebatePrompt({ q, lg, looks, meId, send, priv }) {
  const [coup, setCoup] = useState(false);
  const [t, setT] = useState(null);
  const ready = q.mine && q.mine.ready;
  const has = (v) => q.choices.some((c) => c.v === v);
  if (coup) {
    const players = lg.players.filter((p) => q.opts.includes(p.id));
    return (
      <div className="lg-q">
        <p className="lg-warn">Coup de force : tu décides seul qui est éliminé. Si c'est une créature, tu deviens capitaine ; sinon, tu es éliminé aussi.</p>
        <div className="lg-grid">{players.map((p) => <Tile key={p.id} p={p} look={looks[p.id]} sel={t === p.id} onClick={() => setT(p.id)} />)}</div>
        <div className="lg-acts">
          <button className="lg-btn ghost" onClick={() => setCoup(false)}>Annuler</button>
          <button className="lg-btn danger" disabled={!t} onClick={() => { sfx.stop(); send({ v: "coup", pick: [t] }); }}>Exécuter</button>
        </div>
      </div>
    );
  }
  return (
    <div className="lg-q">
      {lg.debate && <p className="lg-hint">{lg.debate.ready} / {lg.debate.total} veulent passer au vote (il en faut plus de la moitié).</p>}
      <div className="lg-acts col">
        <button className={"lg-btn" + (ready ? " on" : "")} onClick={() => { sfx.select(); send({ v: ready ? "wait" : "ready" }); }}><Icon name={ready ? "check" : "flag"} size={18} />{ready ? "Prêt à voter (annuler)" : "Passer au vote"}</button>
        {has("word") && priv.word && !priv.word.said && <button className="lg-btn ghost" onClick={() => { sfx.apply(); send({ v: "word" }); }}><Icon name="megaphone" size={18} />Mot placé : « {priv.word.w} »</button>}
        {has("coup") && <button className="lg-btn danger ghost" onClick={() => setCoup(true)}><Icon name="crown" size={18} />Prendre le pouvoir (maire Kline)</button>}
      </div>
      <Board lg={lg} looks={looks} meId={meId} />
    </div>
  );
}
function SpyPrompt({ priv, lg, send, q }) {
  const counts = (priv.wolves && priv.wolves.counts) || {};
  const name = (id) => (lg.players.find((p) => p.id === id) || {}).name || "?";
  return (
    <div className="lg-q">
      <div className="lg-spy">
        <h4><Icon name="eye" size={16} />Ce que voit Erica dans les conduits</h4>
        {Object.keys(counts).length ? Object.entries(counts).map(([id, n]) => <div key={id} className="row spread"><span>{name(id)}</span><b>{n} vote{n > 1 ? "s" : ""}</b></div>) : <p className="lg-hint">La meute n'a encore choisi personne…</p>}
        {(priv.chat || []).filter((m) => m.spy).slice(-8).map((m) => <p key={m.n} className="msg"><b>???</b> {m.t}</p>)}
      </div>
      {!q.answered && <div className="lg-acts"><button className="lg-btn ghost" onClick={() => send({})}>Retourner dormir</button></div>}
    </div>
  );
}

function Prompt({ q, lg, looks, meId, send, priv }) {
  const head = (
    <div className="lg-qh">
      <h3>{q.title}</h3>
      {q.text && <p>{q.text}</p>}
    </div>
  );
  let body = null;
  if (q.kind === "role") {
    body = (
      <div className="lg-q center">
        <RoleCard role={priv.role} alias={priv.alias} big />
        {!q.answered ? <button className="lg-btn" onClick={() => { sfx.flip(); send({}); }}>C'est noté</button> : <p className="lg-hint">En attente des autres…</p>}
      </div>
    );
  } else if (q.kind === "spy") body = <SpyPrompt priv={priv} lg={lg} send={send} q={q} />;
  else if (q.type === "witch") body = <WitchPrompt q={q} lg={lg} looks={looks} meId={meId} send={send} />;
  else if (q.kind === "comedien") body = <ComedienPrompt q={q} lg={lg} looks={looks} meId={meId} send={send} />;
  else if (q.type === "debate") body = <DebatePrompt q={q} lg={lg} looks={looks} meId={meId} send={send} priv={priv} />;
  else if (q.type === "choice") body = <div className="lg-q"><div className="lg-acts col">{q.choices.map((c) => <button key={c.v} className="lg-btn" onClick={() => { sfx.apply(); send({ v: c.v }); }}>{c.label}</button>)}</div></div>;
  else if (q.type === "pick") {
    const live = q.kind === "wolves" ? priv.wolves && priv.wolves.votes : q.kind === "vote" || q.kind === "cap" ? lg.vote && lg.vote.votes : null;
    const pack = q.kind === "wolves" && priv.pack.length ? <p className="lg-hint">Ta meute : {priv.pack.map((id) => (lg.players.find((p) => p.id === id) || {}).name).join(", ")}</p> : null;
    body = <PickPrompt key={q.wid} q={q} lg={lg} looks={looks} meId={meId} send={send} live={live} extraTop={pack} />;
  }
  return <section className={"lg-prompt k-" + q.kind}>{q.kind !== "role" && head}{body}</section>;
}

/* ------------------------------ le plateau ------------------------------ */
function Board({ lg, looks, meId }) {
  const votes = lg.vote && lg.vote.votes ? lg.vote.votes : {};
  const counts = {};
  for (const v of Object.values(votes)) if (v) counts[v] = (counts[v] || 0) + 1;
  const waiting = lg.wait && lg.wait.who ? new Set(lg.wait.who) : null;
  return (
    <div className="lg-board">
      <div className="lg-grid">
        {lg.players.map((p) => <Tile key={p.id} p={p} look={looks[p.id]} me={p.id === meId} cap={lg.cap === p.id} clan={lg.sect ? lg.sect[p.id] : null} badge={counts[p.id] || null} sub={waiting && waiting.has(p.id) ? "réfléchit…" : null} />)}
      </div>
    </div>
  );
}
function Waiting({ lg }) {
  const w = lg.wait;
  if (!w) return null;
  return <p className="lg-wait"><span className="dots"><i /><i /><i /></span>{w.t === "night" ? "Hawkins dort… attends que les autres aient fini." : w.label || "En attente…"}{w.t !== "night" && w.left ? ` (${w.left})` : ""}</p>;
}

/* ------------------------------ panneaux ------------------------------ */
const CH_NAME = { day: "Village", pack: "La meute", lovers: "Amoureux", soeur: "Sœurs", frere: "Frères", dead: "Les morts" };
function ChatSheet({ lg, priv, api, meId, onClose }) {
  const chans = ["day", ...new Set((priv.chat || []).filter((m) => !m.spy).map((m) => m.ch)), ...(priv.write || [])].filter((c, i, a) => a.indexOf(c) === i && CH_NAME[c]);
  const [ch, setCh] = useState(chans.includes("pack") && lg.phase === "night" ? "pack" : "day");
  const [txt, setTxt] = useState("");
  const list = ch === "day" ? lg.chat : (priv.chat || []).filter((m) => m.ch === ch && !m.spy);
  const can = (priv.write || []).includes(ch);
  const end = useRef(null);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: "end" }); }, [list.length, ch]);
  const name = (id) => (lg.players.find((p) => p.id === id) || {}).name || "?";
  const sendMsg = () => { const t = txt.trim(); if (!t) return; api.lgChat(ch, t); setTxt(""); };
  return (
    <div className="lg-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row spread"><h3>Discussion</h3><button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button></div>
        <div className="lg-chips">{chans.map((c) => <button key={c} aria-pressed={ch === c} onClick={() => setCh(c)}>{CH_NAME[c]}</button>)}</div>
        <div className="lg-chat">
          {list.length ? list.map((m) => <p key={m.n} className={"msg" + (m.from === meId ? " me" : "")}><b>{name(m.from)}</b> {m.t}</p>) : <p className="lg-hint">Aucun message.</p>}
          <span ref={end} />
        </div>
        {can ? (
          <form className="lg-say" onSubmit={(e) => { e.preventDefault(); sendMsg(); }}>
            <input value={txt} maxLength={200} onChange={(e) => setTxt(e.target.value)} placeholder={ch === "day" ? "Écris au village…" : "Message secret…"} aria-label="Message" />
            <button className="lg-btn" type="submit" disabled={!txt.trim()} aria-label="Envoyer"><Icon name="play" size={18} /></button>
          </form>
        ) : <p className="lg-hint">{ch === "day" ? "On ne parle au village que le jour (et les morts se taisent)." : "Lecture seule."}</p>}
      </div>
    </div>
  );
}
function MeSheet({ priv, lg, onClose }) {
  const name = (id) => (lg.players.find((p) => p.id === id) || {}).name || "?";
  const facts = [];
  if (priv.infected) facts.push("Possédé par le Flagelleur mental : tu joues avec la meute.");
  if (priv.camp !== ROLES[priv.role].camp) facts.push(`Ton camp actuel : ${CAMPS[priv.camp].name}.`);
  if (priv.lover) facts.push(`Amoureux de ${name(priv.lover)}.`);
  if (priv.family.length) facts.push(`${priv.role === "soeur" ? "Ta sœur" : "Tes frères"} : ${priv.family.map(name).join(", ")}.`);
  if (priv.pack.length) facts.push(`Ta meute : ${priv.pack.map(name).join(", ")}.`);
  if (priv.charmedList.length) facts.push(`Sous le contrôle de Papa : ${priv.charmedList.map(name).join(", ")}.`);
  if (priv.pot) facts.push(`Potion de vie : ${priv.pot.life ? "disponible" : "utilisée"} · Potion de mort : ${priv.pot.death ? "disponible" : "utilisée"}.`);
  if (priv.comedien) facts.push(`Tes pouvoirs : ${priv.comedien.cards.map((c) => ROLES[c].st + (priv.comedien.used.includes(c) ? " (joué)" : "")).join(", ")}.`);
  if (priv.esModel) facts.push(`Ton modèle : ${name(priv.esModel)}.`);
  if (priv.merc) facts.push(`Ta cible du premier jour : ${name(priv.merc)}.`);
  if (priv.word) facts.push(`Ton mot du jour : « ${priv.word.w} » ${priv.word.said ? "(placé)" : "(pas encore placé)"}.`);
  if (priv.renardOn === false) facts.push("Le Cerebro est grillé : ton pouvoir est éteint.");
  if (priv.life === 2) facts.push("Tu peux encore survivre à une attaque de la meute.");
  if (priv.noPowers) facts.push("Hopper est tombé sous les coups du village : les habitants n'ont plus de pouvoirs.");
  if (priv.clan != null) facts.push(`Ton clan : ${priv.clan ? "le Hellfire Club" : "les Tigers"}.`);
  return (
    <div className="lg-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row spread"><h3>Mon rôle</h3><button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button></div>
        <div className="lg-me">
          <RoleCard role={priv.role} alias={priv.alias} big dead={!priv.alive} />
          <div className="lg-facts">
            <p className="goal"><b>Objectif :</b> {priv.camp === "solo" ? ROLES[priv.role].power : CAMPS[priv.camp].goal}</p>
            {facts.map((f, i) => <p key={i}>{f}</p>)}
            <h4>Ce que tu sais</h4>
            {priv.notes.length ? [...priv.notes].reverse().map((n) => <p key={n.n} className={"note k-" + n.k}>{n.t}</p>) : <p className="lg-hint">Rien pour l'instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
function RolesSheet({ lg, onClose }) {
  const compo = lg.compo ? Object.entries(lg.compo) : [];
  return (
    <div className="lg-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row spread"><h3>{compo.length ? "Les rôles de la partie" : "Les rôles"}</h3><button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button></div>
        {!compo.length && <p className="lg-hint">La composition est secrète dans cette partie.</p>}
        <div className="lg-roles">
          {compo.map(([id, n]) => (
            <div key={id} className="lg-role" style={{ "--cc": CAMPS[ROLES[id].camp].color }}>
              <RoleArt role={id} w={72} h={72} full={false} />
              <div><b>{ROLES[id].st}{n > 1 ? ` ×${n}` : ""}</b><span>{ROLES[id].name} · {CAMPS[ROLES[id].camp].name}</span><p>{ROLES[id].power}</p></div>
            </div>
          ))}
        </div>
        {lg.compo && Object.values(lg.compo).reduce((s, n) => s + n, 0) > lg.players.length && <p className="lg-hint">Max (Voleur) est en jeu : deux cartes restent au centre, certains rôles de la liste ne sont donc peut-être pas distribués.</p>}
      </div>
    </div>
  );
}
function LogSheet({ lg, onClose }) {
  return (
    <div className="lg-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row spread"><h3>Journal de Hawkins</h3><button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button></div>
        <div className="lg-log">{[...lg.log].reverse().map((l) => <p key={l.n} className={"k-" + l.k}>{l.t}</p>)}</div>
      </div>
    </div>
  );
}

/* ------------------------------ fin de partie ------------------------------ */
function EndScreen({ lg, looks, meId, isHost, api }) {
  const w = lg.winner || {};
  const me = lg.players.find((p) => p.id === meId);
  const col = w.camp === "village" ? CAMPS.village.color : w.camp === "loups" ? CAMPS.loups.color : w.camp === "lovers" ? "#ff6aa8" : CAMPS.solo.color;
  useEffect(() => { if (me && me.win) sfx.win(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="lg-end" style={{ "--wc": col }}>
      <div className="lg-banner"><span className="eyebrow">{me && me.win ? "Victoire !" : w.camp === "none" ? "Fin de partie" : "Défaite"}</span><h2>{w.title}</h2><p>{w.text}</p></div>
      <div className="lg-endgrid">
        {lg.players.map((p) => (
          <div key={p.id} className={"lg-endp" + (p.win ? " win" : "") + (p.alive ? "" : " dead")}>
            <RoleCard role={p.role} alias={p.alias} dead={!p.alive} win={p.win} />
            <span className="who"><PlayerAvatar name={p.name} look={looks[p.id]} /><b>{p.name}</b>{p.lover && <Icon name="heart" size={13} />}{p.infected && <Icon name="skull" size={13} />}</span>
          </div>
        ))}
      </div>
      {isHost ? <button className="lg-btn" onClick={api.backToLobby}>Retour au lobby</button> : <p className="lg-wait">Le créateur ramène tout le monde au lobby<span className="dots"><i /><i /><i /></span></p>}
    </div>
  );
}

/* ------------------------------ l'écran ------------------------------ */
export default function LoupGame({ room, me, api, priv, isHost }) {
  const lg = room.lg;
  const [sheet, setSheet] = useState(null);
  const [seenNotes, setSeenNotes] = useState(0);
  const [seenChat, setSeenChat] = useState(0);
  const [dawn, setDawn] = useState(null);
  const looks = useMemo(() => Object.fromEntries(room.players.map((p) => [p.id, p.look])), [room.players]);
  const night = lg && (lg.phase === "night" || lg.phase === "setup");
  const lastDay = useRef(0);
  // l'aube : qui est mort cette nuit
  useEffect(() => {
    if (!lg || lg.phase !== "day" || lg.day === lastDay.current) return;
    lastDay.current = lg.day;
    const dead = lg.morning.filter((m) => m.night).map((m) => lg.players.find((p) => p.id === m.id)).filter(Boolean);
    setDawn({ day: lg.day, dead });
    sfx.open();
  }, [lg && lg.phase, lg && lg.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = priv && priv.prompt;
  const qKey = q ? q.wid + ":" + q.kind : "";
  useEffect(() => { if (q && !q.answered && q.kind !== "dream") sfx.open(); }, [qKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lg || !priv) return <div className="lgx night"><p className="lg-wait">Les lumières clignotent…<span className="dots"><i /><i /><i /></span></p></div>;
  const send = (a) => api.lgAnswer(q.wid, a);
  const notesN = priv.notes.length;
  const chatN = lg.chat.length + (priv.chat || []).filter((m) => !m.spy).length;
  const showPrompt = q && (!q.answered || ["wolves", "vote", "cap", "debate", "spy"].includes(q.kind));
  const d = ROLES[priv.role];
  const stepTitle = lg.over ? "Fin de la partie" : lg.phase === "setup" ? "Distribution des rôles" : night ? `Nuit ${lg.night}` : `Jour ${lg.day}`;
  return (
    <div className={"lgx " + (night ? "night" : "day") + (priv.alive ? "" : " ghost")}>
      <header className="lg-top">
        <div className="lg-title"><Icon name={night ? "moon" : "sun"} size={20} /><div><b>{stepTitle}</b><small>{lg.over ? "" : lg.step}</small></div></div>
        {!priv.alive && !lg.over && <span className="lg-deadtag"><Icon name="skull" size={14} />Tu es mort</span>}
      </header>
      {!lg.over && <Timer deadline={room.deadline} />}
      <main className="lg-main">
        {lg.over ? <EndScreen lg={lg} looks={looks} meId={me.id} isHost={isHost} api={api} />
          : showPrompt ? <Prompt q={q} lg={lg} looks={looks} meId={me.id} send={send} priv={priv} />
            : (
              <>
                <Waiting lg={lg} />
                {lg.phase !== "setup" && <Board lg={lg} looks={looks} meId={me.id} />}
                <div className="lg-feed">{lg.log.slice(-6).reverse().map((l) => <p key={l.n} className={"k-" + l.k}>{l.t}</p>)}</div>
              </>
            )}
      </main>
      {!lg.over && (
        <nav className="lg-nav">
          <button onClick={() => { setSheet("me"); setSeenNotes(notesN); }} className="me" style={{ "--cc": CAMPS[priv.camp].color }}><RoleArt role={priv.role} w={44} h={44} full={false} /><span>{priv.alias || d.st}</span>{notesN > seenNotes && <i className="dot" />}</button>
          <button onClick={() => { setSheet("chat"); setSeenChat(chatN); }}><Icon name="megaphone" size={20} /><span>Discussion</span>{chatN > seenChat && <i className="dot" />}</button>
          <button onClick={() => setSheet("roles")}><Icon name="layers" size={20} /><span>Rôles</span></button>
          <button onClick={() => setSheet("log")}><Icon name="history" size={20} /><span>Journal</span></button>
        </nav>
      )}
      {sheet === "me" && <MeSheet priv={priv} lg={lg} onClose={() => setSheet(null)} />}
      {sheet === "chat" && <ChatSheet lg={lg} priv={priv} api={api} meId={me.id} onClose={() => { setSheet(null); setSeenChat(chatN); }} />}
      {sheet === "roles" && <RolesSheet lg={lg} onClose={() => setSheet(null)} />}
      {sheet === "log" && <LogSheet lg={lg} onClose={() => setSheet(null)} />}
      {dawn && !lg.over && (
        <div className="lg-dawn" onClick={() => setDawn(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">Jour {dawn.day}</span>
            <h2>{dawn.dead.length ? "Hawkins se réveille en deuil" : "Personne n'est mort cette nuit"}</h2>
            <div className="lg-dawn-cards">{dawn.dead.map((p) => <div key={p.id}><RoleCard role={p.role} alias={p.alias} dead /><b>{p.name}</b></div>)}</div>
            <button className="lg-btn" onClick={() => setDawn(null)}>Continuer</button>
          </div>
        </div>
      )}
    </div>
  );
}
