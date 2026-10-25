import { Component, lazy, Suspense, useState } from "react";
import { PlayerAvatar, Fuse, playerColor } from "../ui/parts.jsx";
import { BD_SIZE, SPACE_INFO, ITEMS } from "../data/board.js";
import { BD_PRE_SECONDS, BD_CHOICE_SECONDS, BD_GEM_COST, BD_MAX_ITEMS, BD_MINI_WIN, BD_DIE } from "../config.js";
import { MG_SIDES } from "../minigames/meta.js";

// Le plateau 3D est chargé à la demande (three.js pèse lourd) ; s'il ne peut pas s'afficher (pas de WebGL, chargement raté) : la grille 2D.
const Board3D = lazy(() => import("../board3d/Board3D.jsx"));
const read2d = () => { try { return /[?&]bd2d/.test(location.search) || localStorage.getItem("bd-2d") === "1"; } catch { return false; } };
const save2d = (v) => { try { v ? localStorage.setItem("bd-2d", "1") : localStorage.removeItem("bd-2d"); } catch { /* stockage indisponible */ } };
class Catch3D extends Component {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch(e) { console.error(e); this.props.onBad(); }
  render() { return this.state.bad ? null : this.props.children; }
}

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
/** Position d'une case dans la grille 9×9 : le plateau fait le tour du bord, dans le sens des aiguilles d'une montre. */
function cellXY(i) {
  if (i <= 8) return [1, i + 1];
  if (i <= 16) return [i - 7, 9];
  if (i <= 24) return [9, 9 - (i - 16)];
  return [9 - (i - 24), 1];
}
const nameOf = (room, me, id) => (id === me.id ? "Toi" : (room.players.find((p) => p.id === id) || {}).name || "?");

function Token({ p, on }) {
  return <i className={"bdtok" + (on ? " on" : "")} style={{ background: playerColor(p.ci) }} title={p.name}>{(p.name || "?").trim().charAt(0).toUpperCase()}</i>;
}

/** Le centre du plateau : ordre de départ, tour en cours, dés, message. Même contenu en 2D (au milieu de la grille) et en 3D (par-dessus la scène). */
function Mid({ room, me, round = true }) {
  const bd = room.bd, roll = bd.roll;
  if (bd.sub === "order") {
    return (
      <div className="bdorder" data-testid="bd-order">
        <b>Qui commence ?</b>
        {bd.order.map((id, k) => <span key={id}><em>{k + 1}</em>{nameOf(room, me, id)}<i className="die">{bd.rolls[id]}</i></span>)}
      </div>
    );
  }
  return (
    <>
      {round && <small>Tour {Math.min(bd.round, bd.total)}/{bd.total}{bd.sprint ? " · 🔥 sprint ×2" : ""}</small>}
      {roll && bd.sub !== "pre" ? (
        <div className="bddice" key={roll.k} aria-label={`Dé : ${roll.steps}`}>
          {roll.dice.map((d, k) => <span key={k} className="die">{d}</span>)}
          {roll.dice.length > 1 ? <b>= {roll.steps}</b> : null}
          {roll.back ? <em>↩️ recule</em> : null}
          {!roll.dice.length && roll.item ? <em>{ITEMS[roll.item].emoji}</em> : null}
        </div>
      ) : (
        <div className="bdwho">{bd.cur ? (bd.cur === me.id ? "À toi !" : `Tour de ${nameOf(room, me, bd.cur)}`) : ""}</div>
      )}
      {bd.msg && <p className="bdmsg" key={bd.msg.k} role="status" data-testid="bd-msg">{bd.msg.text}</p>}
    </>
  );
}

function BoardGrid({ room, me }) {
  const bd = room.bd;
  const at = {};
  for (const p of room.players) (at[bd.pos[p.id]] ||= []).push(p);
  const cur = bd.cur;
  return (
    <div className="bdboard" role="img" aria-label="Plateau de jeu">
      {Array.from({ length: BD_SIZE }, (_, i) => {
        const [r, c] = cellXY(i), t = bd.spaces[i], ps = at[i] || [];
        return (
          <div key={i} className={"bdcell " + t + (bd.gemAt === i ? " gem" : "") + (cur && bd.pos[cur] === i ? " here" : "")} style={{ gridRow: r, gridColumn: c }} data-pos={i} data-type={t}>
            <span className="ico" aria-hidden="true">{bd.gemAt === i ? "💎" : SPACE_INFO[t].emoji}</span>
            <span className="toks">{ps.slice(0, 4).map((p) => <Token key={p.id} p={p} on={p.id === cur} />)}{ps.length > 4 && <b>+{ps.length - 4}</b>}</span>
          </div>
        );
      })}
      <div className="bdmid"><Mid room={room} me={me} /></div>
    </div>
  );
}

function Strip({ room, me }) {
  const bd = room.bd;
  return (
    <div className="bdstrip" aria-label="Joueurs">
      {bd.order.map((id) => {
        const p = room.players.find((x) => x.id === id);
        if (!p) return null;
        return (
          <div key={id} className={"bdp" + (id === bd.cur ? " turn" : "") + (id === me.id ? " me" : "")} data-testid="bd-player">
            <div className="top"><PlayerAvatar name={p.name} look={p.look} /><b>{id === me.id ? "Toi" : p.name}</b><i className="bdcol" style={{ background: MG_SIDES[bd.col[id] === 1 ? 1 : 0].color }} title={`Camp ${MG_SIDES[bd.col[id] === 1 ? 1 : 0].name.toLowerCase()} (décide du mini-jeu)`} data-testid="bd-col" />{bd.shield[id] && <span title="Bouclier">🛡️</span>}{bd.curse[id] && <span title="Maudit">{bd.curse[id] === "slow" ? "🍄" : "↩️"}</span>}</div>
            <div className="num"><span data-testid="bd-coins">🪙 {bd.coins[id]}</span><span data-testid="bd-gems">💎 {bd.gems[id]}</span></div>
            <div className="its">{bd.items[id].length ? bd.items[id].map((it, k) => <span key={k} title={ITEMS[it].name}>{ITEMS[it].emoji}</span>) : <span className="muted">—</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="bdlegend">
      <h3>Comment ça marche</h3>
      <ul>
        <li><span>🎲</span><span><b>Dé de 1 à {BD_DIE}.</b> Chacun joue son tour, du plus haut dé de départ au plus bas.</span></li>
        <li><span>💎</span><span><b>Gemme : {BD_GEM_COST} pièces.</b> Arrête-toi ou passe dessus avec assez de pièces pour l'acheter. Elle change de case ensuite. Le plus de gemmes gagne, puis le plus de pièces, puis un dé.</span></li>
        <li><span>🔵🔴</span><span><b>Après chaque tour de table, un mini-jeu.</b> La couleur de ta dernière case bleue ou rouge décide du camp : tous pareils = chacun pour soi, sinon 2 contre 2, 1 contre 3… Les gagnants empochent {BD_MINI_WIN} pièces.</span></li>
        <li><span>🔥</span><span><b>Sprint final :</b> aux derniers tours, cases bleues et rouges ×2.</span></li>
        <li><span>🏆</span><span><b>3 gemmes bonus à la fin :</b> mini-jeux (pièces gagnées), fortune (record de pièces), surprises (cases ?, chance, Gredin).</span></li>
      </ul>
      <h3>Les cases</h3>
      <ul>{Object.entries(SPACE_INFO).map(([k, v]) => <li key={k}><span>{v.emoji}</span><span><b>{v.name}</b> {v.desc}</span></li>)}<li><span>💎</span><span><b>Gemme</b> la case où elle se trouve brille.</span></li></ul>
      <h3>Les objets ({BD_MAX_ITEMS} maximum)</h3>
      <ul>{Object.values(ITEMS).map((v) => <li key={v.name}><span>{v.emoji}</span><span><b>{v.name}</b> {v.desc}{v.price ? ` (${v.price} 🪙)` : " (rare)"}</span></li>)}</ul>
    </div>
  );
}

function Actions({ room, me, api }) {
  const bd = room.bd;
  const mine = bd.cur === me.id;
  const [sel, setSel] = useState(-1), [target, setTarget] = useState(null);
  const inv = bd.items[me.id] || [];
  const item = sel >= 0 ? ITEMS[inv[sel]] : null;
  const needTarget = item && item.target;
  const others = room.players.filter((p) => p.id !== me.id);
  const go = () => { api.bdRoll(sel, needTarget ? target : null); setSel(-1); setTarget(null); };
  const who = nameOf(room, me, bd.cur);

  if (bd.sub === "pre") {
    if (!mine) return <div className="wait" role="status">{who} prépare son lancer<i /><i /><i /></div>;
    return (
      <div className="bdact">
        {inv.length > 0 && (
          <div className="bditems" aria-label="Tes objets">
            {inv.map((it, k) => (
              <button key={k} className={"bditem" + (sel === k ? " on" : "")} aria-pressed={sel === k} data-testid="bd-item" onClick={() => { setSel(sel === k ? -1 : k); setTarget(null); }}>
                <span>{ITEMS[it].emoji}</span><b>{ITEMS[it].name}</b>
              </button>
            ))}
          </div>
        )}
        {item && <p className="muted bdnote">{item.desc}</p>}
        {needTarget && (
          <div className="bdtargets" aria-label="Choisis un joueur">
            {others.map((p) => <button key={p.id} className={"bdtg" + (target === p.id ? " on" : "")} data-testid="bd-target" onClick={() => setTarget(p.id)}>{p.name}</button>)}
          </div>
        )}
        <button className="btn primary bdroll" data-testid="bd-roll" disabled={needTarget && !target} onClick={go}>
          {item ? `${item.emoji} ${item.name} + lancer le dé 🎲` : "🎲 Lancer le dé"}
        </button>
      </div>
    );
  }
  if (bd.sub === "gem") {
    if (!mine) return <div className="wait" role="status">{who} peut acheter une gemme<i /><i /><i /></div>;
    return (
      <div className="bdact">
        <div className="bdoffer"><span aria-hidden="true">💎</span><div><b>Une gemme !</b><small>{BD_GEM_COST} pièces · tu en as {bd.coins[me.id]}</small></div></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" style={{ flex: 1 }} data-testid="bd-gem-yes" onClick={() => api.bdGem(true)}>Acheter</button>
          <button className="btn ghost" style={{ flex: 1 }} data-testid="bd-gem-no" onClick={() => api.bdGem(false)}>Non merci</button>
        </div>
      </div>
    );
  }
  if (bd.sub === "shop") {
    if (!mine) return <div className="wait" role="status">{who} est à la boutique<i /><i /><i /></div>;
    return (
      <div className="bdact">
        <div className="bdoffer"><span aria-hidden="true">{bd.shopKind === "b" ? "🏴‍☠️" : "🛒"}</span><div><b>{bd.shopKind === "b" ? "Marché noir" : "Boutique"}</b><small>tu as {bd.coins[me.id]} 🪙 · {inv.length}/{BD_MAX_ITEMS} objets</small></div></div>
        <div className="bdshop">
          {bd.shop.map((it, i) => <button key={i} className="bditem" data-testid="bd-shop" disabled={ITEMS[it].price > bd.coins[me.id] || inv.length >= BD_MAX_ITEMS} onClick={() => api.bdShop(i)}><span>{ITEMS[it].emoji}</span><b>{ITEMS[it].name}</b><small>{ITEMS[it].desc}</small><em>{ITEMS[it].price} 🪙</em></button>)}
        </div>
        <button className="btn small ghost" data-testid="bd-shop-skip" onClick={() => api.bdShop(-1)}>Passer</button>
      </div>
    );
  }
  return <div className="wait" role="status">{bd.sub === "order" ? "On tire l'ordre de jeu" : bd.sub === "moving" ? `${who} avance` : "Un instant"}<i /><i /><i /></div>;
}

function Feed({ bd }) {
  const f = (bd.feed || []).slice(0, -1).reverse();
  if (!f.length) return null;
  return <ul className="bdfeed" aria-label="Derniers événements">{f.map((m) => <li key={m.k}>{m.text}</li>)}</ul>;
}

/** Le plateau : en 3D par défaut, en 2D si l'appareil ne sait pas afficher la 3D (ou si le joueur l'a demandé : bouton « 2D » ou adresse ?bd2d). */
function BoardView({ room, me, flat, setFlat }) {
  const [broken, setBroken] = useState(false);
  if (flat || broken) return <BoardGrid room={room} me={me} />;
  return (
    <Catch3D onBad={() => setBroken(true)}>
      <Suspense fallback={<div className="bdboard b3d" data-testid="bd-3d-loading"><div className="b3load">Chargement du plateau<i /><i /><i /></div></div>}>
        <Board3D room={room} center={<Mid room={room} me={me} round={false} />} onFail={() => setBroken(true)} onFlat={() => { save2d(true); setFlat(true); }} />
      </Suspense>
    </Catch3D>
  );
}

export default function Board({ room, me, api, onLeave }) {
  const bd = room.bd;
  const [help, setHelp] = useState(false);
  const [flat, setFlat] = useState(read2d);
  if (!bd) return null;
  if (room.phase === "bd_final") return <Final room={room} me={me} api={api} onLeave={onLeave} />;
  const timed = ["pre", "gem", "shop"].includes(bd.sub);
  return (
    <div className="screen bdroot">
      <div className="row spread">
        <div className="eyebrow">Plateau · tour {bd.round}/{bd.total}</div>
        <div className="row" style={{ gap: 6 }}>
          {flat && <button className="iconbtn" data-testid="bd-3d-on" onClick={() => { save2d(false); setFlat(false); }} aria-label="Afficher le plateau en 3D">3D</button>}
          <button className="iconbtn" onClick={() => setHelp(!help)} aria-label="Règles" aria-pressed={help}>?</button>
        </div>
      </div>
      <div className="scroll bdscroll">
        {help ? <Legend /> : (
          <>
            <BoardView room={room} me={me} flat={flat} setFlat={setFlat} />
            {timed && <Fuse deadline={room.deadline} total={bd.sub === "pre" ? BD_PRE_SECONDS : BD_CHOICE_SECONDS} />}
            <Actions room={room} me={me} api={api} />
            <Feed bd={bd} />
            <Strip room={room} me={me} />
          </>
        )}
      </div>
    </div>
  );
}

function Final({ room, me, api, onLeave }) {
  const bd = room.bd, F = bd.final || [];
  const isHost = room.hostId === me.id;
  const win = F.filter((r) => r.rank === 1);
  const byId = (id) => room.players.find((p) => p.id === id);
  const top = F.slice(0, 3), order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const mine = F.find((r) => r.id === me.id);
  return (
    <div className="screen mgfinal">
      <div>
        <div className="eyebrow">Fin du plateau · {bd.total} tours</div>
        <h2 style={{ fontSize: "1.5rem" }} data-testid="bd-winner">{room.players.length < 2 ? `${mine ? mine.gems : 0} gemme${mine && mine.gems > 1 ? "s" : ""}` : win[0] && win[0].id === me.id ? "Tu gagnes !" : `${(byId(win[0] && win[0].id) || {}).name || "?"} gagne`}</h2>
      </div>
      <div className="podium" aria-label="Podium">
        {order.map((r) => {
          const p = byId(r.id);
          if (!p) return null;
          return (
            <div key={r.id} className={"pod p" + Math.min(3, r.rank)} style={{ "--tc": playerColor(p.ci), "--tink": "#1d2457" }}>
              <PlayerAvatar name={p.name} look={p.look} showLv />
              <span className="who">{r.id === me.id ? "Toi" : p.name}</span>
              <div className="blk"><b>{r.gems}💎</b><span>{MEDAL[r.rank] || ord(r.rank)}</span></div>
            </div>
          );
        })}
      </div>
      <div className="scroll">
        {(bd.bonus || []).length > 0 && (
          <div className="bdbonus" data-testid="bd-bonus">
            <h3 className="mgh3">Gemmes bonus</h3>
            {bd.bonus.map((b) => (
              <div key={b.key} className={"bdbn" + (b.ids.length ? "" : " none")}>
                <span aria-hidden="true">{b.emoji}</span>
                <div><b>{b.name}</b><small>{b.ids.length ? `${b.ids.map((id) => nameOf(room, me, id)).join(" et ")} · ${b.desc} (${b.v})` : "personne"}</small></div>
                {b.ids.length > 0 && <i>+1 💎</i>}
              </div>
            ))}
          </div>
        )}
        <ol className="rank">
          {F.map((r, k) => {
            const p = byId(r.id);
            if (!p) return null;
            return (
              <li key={r.id} className={r.id === me.id ? "me" : ""} style={{ animationDelay: `${k * 60}ms` }}>
                <span className="pos">{ord(r.rank)}</span>
                <span className="who"><PlayerAvatar name={p.name} look={p.look} />{r.id === me.id ? "Toi" : p.name}</span>
                <b className="gain">{r.gems} 💎</b><small>{r.coins} 🪙{r.tb ? ` · dé ${r.tb}` : ""}</small>
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
