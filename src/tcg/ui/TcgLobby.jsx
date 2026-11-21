// Lobby de Heavy is the Crown (appli du jeu seul) :
//  - avant d'être dans un salon : créer une partie (un code à donner à ses amis) ou rejoindre avec un code ;
//  - dans le salon : chaque joueur sur sa bannière (photo dans son cadre, pseudo, niveau, deck), places libres à remplir
//    (inviter un ami, ajouter un bot), mon deck, les réglages du créateur, le lancement ;
//  - toujours : la liste d'amis (qui est en ligne, inviter, ajouter par pseudo ou code ami) et le « ? » des règles.
import { useEffect, useMemo, useRef, useState } from "react";
import { FAMILY } from "../cards/index.js";
import { validateDeck } from "../deck.js";
import * as P from "../progress.js";
import { AG_GOALS, AG_TIMERS, AG_TITLES, AG_MAX } from "../../net/hostTrone.js";
import { Icon } from "../../ui/Icon.jsx";
import AccountBadge from "../../ui/AccountBadge.jsx";
import { sfx } from "../../lib/sfx.js";
import { cleanRoomCode } from "../../lib/util.js";
import { cleanFriendCode } from "../../lib/friends.js";
import { GAME_NAME } from "../rules.js";
import { PlayerBanner } from "./Banner.jsx";
import Portrait from "./Portrait.jsx";
import RulesGuide from "./RulesGuide.jsx";

const STATUS = { menu: "En ligne", lobby: "Dans un salon", game: "En partie" };

/** Copie un texte (code de salon, code ami) ; sinon le sélectionne pour un Ctrl+C. */
async function copyText(text, el) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch { /* rien */ }
    return false;
  }
}
function CopyCode({ code, label, testId }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  return (
    <span className="tl-code">
      {label && <small>{label}</small>}
      <b ref={ref} data-testid={testId}>{code}</b>
      <button className="iconbtn small" onClick={async () => { const r = await copyText(code, ref.current); setOk(r); sfx.select(); setTimeout(() => setOk(false), 1600); }} aria-label={`Copier ${code}`} title="Copier">
        <Icon name={ok ? "check" : "copy"} size={16} />
      </button>
    </span>
  );
}

/* ------------------------------ amis ------------------------------ */
/** Un joueur de la liste : photo, pseudo, et en dessous « En ligne / Dans un salon / Hors ligne » (ou un texte à soi : sub). */
function FriendRow({ f, status, right, sub }) {
  const st = status ? STATUS[status.st] || "En ligne" : null;
  return (
    <div className={"tl-friend" + (st ? " on" : "")}>
      <Portrait id={f.look && f.look.av} frame={(f.look && f.look.fr) || "bronze"} size={40} />
      <span className="tl-friend-t"><b>{f.pseudo}</b>{sub ? <small>{sub}</small> : <small><i className="tl-dot" aria-hidden="true" />{st || "Hors ligne"}</small>}</span>
      {right}
    </div>
  );
}

/** Le panneau des amis : mon code ami, ajouter (pseudo ou code), demandes reçues, liste (en ligne d'abord), inviter dans mon salon. */
export function FriendsPanel({ fr, acc, onAccount, room, myName, flash, compact = false }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState({});
  const [del, setDel] = useState(null);
  const known = useMemo(() => new Set([...fr.friends, ...fr.outgoing, ...fr.incoming].map((x) => x.uid)), [fr.friends, fr.outgoing, fr.incoming]);
  const inRoom = new Set(((room && room.players) || []).map((p) => p.tl && p.tl.fc).filter(Boolean));
  const list = [...fr.friends].sort((a, b) => (fr.onlineOf(b.code) ? 1 : 0) - (fr.onlineOf(a.code) ? 1 : 0) || a.pseudo.localeCompare(b.pseudo, "fr"));
  const search = async (e) => {
    e && e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try { setRes(await fr.search(q.trim())); } catch { setRes([]); }
    setBusy(false);
  };
  const ask = async (c) => {
    try { const r = await fr.request(c.uid); flash(r === "accepted" ? `${c.pseudo} et toi êtes maintenant amis !` : `Demande envoyée à ${c.pseudo}.`); sfx.apply(); } catch { flash("Impossible d'envoyer la demande pour l'instant."); }
  };
  const invite = (f) => {
    if (!room) return;
    if (fr.invite(f.code, room.id, myName)) { setSent((s) => ({ ...s, [f.code]: Date.now() })); flash(`Invitation envoyée à ${f.pseudo}.`); sfx.apply(); }
    else flash("Connexion aux amis en cours… réessaie dans un instant.");
  };
  let body;
  if (fr.state === "off") body = <p className="muted tl-note">Les amis ont besoin du mode en ligne (Supabase).</p>;
  else if (fr.state === "login") {
    body = (
      <div className="tl-login">
        <p className="muted tl-note">Connecte-toi à ton compte pour ajouter des amis, voir qui est en ligne et les inviter. En attendant, donne-leur le code du salon.</p>
        {acc && <AccountBadge acc={acc} onClick={onAccount} testId="tl-account" />}
      </div>
    );
  } else if (fr.state === "missing") body = <p className="muted tl-note">Les amis ne sont pas encore activés sur le serveur : exécute une fois <b>supabase/amis.sql</b> dans Supabase (voir le README). Le code du salon marche déjà.</p>;
  else if (fr.state === "loading") body = <p className="muted tl-note">Chargement des amis…</p>;
  else if (fr.state === "offline" || fr.state === "error") body = <p className="muted tl-note">Amis indisponibles pour l'instant (connexion ?). <button className="hts-link" onClick={fr.refresh}>Réessayer</button></p>;
  else {
    body = (
      <>
        {fr.me && <CopyCode code={fr.me.code} label="Ton code ami" testId="tl-mycode" />}
        <form className="tl-add" onSubmit={search}>
          <input className="hub-search" value={q} maxLength={20} placeholder="Pseudo ou code ami" onChange={(e) => { setQ(e.target.value); setRes(null); }} aria-label="Ajouter un ami : pseudo ou code ami" data-testid="tl-search" />
          <button className="btn small" type="submit" disabled={busy || !q.trim()}><Icon name="search" size={16} />Chercher</button>
        </form>
        {res && (
          <div className="tl-res">
            {res.length ? res.map((c) => (
              <FriendRow key={c.uid} f={c} sub={`Code ami ${c.code}${c.look && c.look.lv ? ` · niveau ${c.look.lv}` : ""}`} right={known.has(c.uid)
                ? <span className="pill dim">{fr.friends.some((x) => x.uid === c.uid) ? "Ami" : "Demandé"}</span>
                : <button className="btn small primary" onClick={() => ask(c)} data-testid={"tl-ask-" + c.code}><Icon name="plus" size={15} />Ajouter</button>} />
            )) : <p className="muted tl-note">Personne avec ce pseudo ou ce code.</p>}
          </div>
        )}
        {fr.incoming.length > 0 && (
          <div className="tl-req">
            <small className="tl-h">Demandes reçues</small>
            {fr.incoming.map((c) => (
              <FriendRow key={c.uid} f={c} status={fr.onlineOf(c.code)} right={<span className="row" style={{ gap: 6 }}>
                <button className="btn small good" onClick={async () => { await fr.accept(c.uid); flash(`${c.pseudo} est maintenant ton ami.`); sfx.win(); }} data-testid={"tl-accept-" + c.code}>Accepter</button>
                <button className="iconbtn small" onClick={() => fr.remove(c.uid)} aria-label={`Refuser ${c.pseudo}`}><Icon name="close" size={15} /></button>
              </span>} />
            ))}
          </div>
        )}
        <small className="tl-h">Amis <span>{list.filter((f) => fr.onlineOf(f.code)).length} en ligne · {list.length}</span></small>
        {list.length ? list.map((f) => {
          const on = fr.onlineOf(f.code);
          const here = inRoom.has(f.code);
          return (
            <FriendRow key={f.uid} f={f} status={on} right={<span className="row" style={{ gap: 6 }}>
              {room && !here && <button className="btn small" disabled={!on || Boolean(sent[f.code] && Date.now() - sent[f.code] < 8000)} onClick={() => invite(f)} title={on ? "L'inviter dans ce salon" : "Hors ligne"} data-testid={"tl-invite-" + f.code}><Icon name="mail" size={15} />{sent[f.code] ? "Invité" : "Inviter"}</button>}
              {here && <span className="pill ok">Dans le salon</span>}
              {!compact && (del === f.uid
                ? <button className="btn small" style={{ borderColor: "var(--danger)" }} onClick={() => { fr.remove(f.uid); setDel(null); }}>Retirer</button>
                : <button className="iconbtn small" onClick={() => setDel(f.uid)} aria-label={`Retirer ${f.pseudo} de mes amis`}><Icon name="trash" size={14} /></button>)}
            </span>} />
          );
        }) : <p className="muted tl-note">Pas encore d'amis : cherche-les par pseudo, ou donne-leur ton code ami.</p>}
        {fr.outgoing.length > 0 && <small className="muted tl-note">En attente : {fr.outgoing.map((c) => c.pseudo).join(", ")}</small>}
      </>
    );
  }
  return (
    <section className="tl-panel tl-friends" aria-label="Amis" data-testid="tl-friends">
      <h3><Icon name="users" size={17} />Amis</h3>
      {body}
    </section>
  );
}

/* ------------------------------ salon ------------------------------ */
/** Mon deck pour la partie : envoyé au créateur dès qu'il change (comme dans le lobby de Party Hub). */
function useSendDeck(room, me, net, t) {
  const own = useMemo(() => P.owned(t), [t]);
  const valid = useMemo(() => t.decks.filter((d) => validateDeck(d, own).ok), [t, own]);
  const deck = valid.find((d) => d.id === t.sel) || valid[0] || null;
  const mine = room && room.players.find((p) => p.id === me.id);
  const sentKey = useRef("");
  const key = deck ? JSON.stringify([deck.name, deck.fam, deck.pt, deck.cards, deck.plots]) : "";
  useEffect(() => {
    if (!room || room.phase !== "lobby" || !deck || (sentKey.current === key && mine && mine.agDeck)) return;
    sentKey.current = key;
    net.agDeck({ name: deck.name, fam: deck.fam, pt: deck.pt, cards: deck.cards, plots: deck.plots });
  }, [key, Boolean(mine && mine.agDeck), room && room.id, room && room.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return { valid, deck, mine };
}

function Slot({ p, me, isHost, hostId, onKick, onFriend, canFriend }) {
  const f = p.agDeck ? FAMILY[p.agDeck.fam] || FAMILY.neutre : null;
  return (
    <div className={"tl-slot" + (p.id === me.id ? " me" : "")} data-testid={"tl-slot-" + (p.bot ? "bot" : p.id === me.id ? "me" : "other")}>
      <PlayerBanner name={p.id === me.id ? `${p.name}` : p.name} look={p.tl || { lv: null }} w={150}>
        {p.id === hostId && <span className="tl-host" title="Créateur du salon"><Icon name="crown" size={13} stroke={2.2} />Créateur</span>}
      </PlayerBanner>
      <div className="tl-deck">
        {p.bot ? <span className="pill dim"><Icon name="bot" size={13} />Bot · deck au hasard</span>
          : p.agDeck ? <span className="tl-deck-n" style={{ "--fc": f.color }}><Icon name={f.icon} size={14} />{p.agDeck.name}</span>
          : <span className="pill pink">Choisit son deck…</span>}
      </div>
      <div className="tl-slot-acts">
        {canFriend && <button className="btn small ghost" onClick={onFriend} data-testid="tl-slot-friend"><Icon name="plus" size={14} />Ami</button>}
        {isHost && p.id !== me.id && <button className="iconbtn small" onClick={onKick} aria-label={`Exclure ${p.name}`} title="Exclure"><Icon name="close" size={14} /></button>}
      </div>
    </div>
  );
}

export default function TcgLobby({ room, me, net, isHost, t, setTcg, fr, acc, onAccount, notice, clearNotice, onBack, onDecks, onProfile, onCreate, onJoin, busy }) {
  const [code, setCode] = useState("");
  const [rules, setRules] = useState(false);
  const [toast, setToast] = useState("");
  const [friendsOpen, setFriendsOpen] = useState(false);
  const flash = (m) => { setToast(m); setTimeout(() => setToast((x) => (x === m ? "" : x)), 2800); };
  const { valid, deck, mine } = useSendDeck(room, me, net, t);
  const myName = me.name;

  // ------- avant le salon : créer ou rejoindre -------
  if (!room) {
    const c = cleanRoomCode(code);
    const df = deck ? FAMILY[deck.fam] || FAMILY.neutre : null;
    return (
      <>
      <div className="hub-bg" aria-hidden="true" />
      <div className="screen tl" data-testid="tcg-lobby-entry">
        <header className="tl-top">
          <button className="iconbtn" onClick={onBack} aria-label="Retour à l'accueil du jeu"><Icon name="back" /></button>
          <div className="hs-title"><small>{GAME_NAME}</small><h2>Jouer</h2></div>
          <span className="grow" />
          <button className="iconbtn tl-help" onClick={() => { setRules(true); sfx.open(); }} aria-label="Les règles du jeu" title="Les règles" data-testid="tl-rules"><Icon name="help" /></button>
        </header>
        <div className="tl-entry">
          <section className="tl-me" aria-label="Toi">
            <PlayerBanner name={myName} look={me.tl} w={176} />
            <div className="tl-me-deck">
              <small>Ton deck</small>
              {deck ? <span className="tl-deck-n" style={{ "--fc": df.color }}><Icon name={df.icon} size={14} />{deck.name}</span> : <span className="pill pink">Aucun deck prêt</span>}
            </div>
            <div className="tl-me-acts">
              <button className="btn small ghost" onClick={onDecks}><Icon name="layers" size={15} />Mes decks</button>
              {onProfile && <button className="btn small ghost" onClick={onProfile}><Icon name="flag" size={15} />Bannière</button>}
            </div>
          </section>
          <div className="tl-col">
            <section className="tl-panel tl-create">
              <span className="tl-big-i" aria-hidden="true"><Icon name="castle" size={30} stroke={1.6} /></span>
              <h3>Créer une partie</h3>
              <p className="muted">Ton salon reçoit un code : donne-le à tes amis, ou invite-les depuis ta liste. De 2 à {AG_MAX} joueurs ; ajoute des bots pour compléter ou pour t'entraîner.</p>
              <button className="btn primary" onClick={onCreate} disabled={busy} data-testid="tl-create"><Icon name="crown" size={18} />Créer le salon</button>
            </section>
            <section className="tl-panel tl-join">
              <h3><Icon name="ticket" size={17} />Rejoindre avec un code</h3>
              <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (c.length >= 6) onJoin(c); }}>
                <input className="hub-search tl-codein" value={code} maxLength={12} placeholder="Code du salon" autoCapitalize="characters" spellCheck={false} onChange={(e) => { setCode(e.target.value); if (notice) clearNotice(); }} aria-label="Code du salon" data-testid="tl-code" />
                <button className="btn" type="submit" disabled={busy || c.length < 6} data-testid="tl-join"><Icon name="next" size={18} />Rejoindre</button>
              </form>
              {notice && <p className="plerr" role="alert">{notice}</p>}
              {!P.playableDeck(t) && <p className="muted tl-note"><Icon name="alert" size={14} /> Tu n'as pas encore de deck prêt : <button className="hts-link" onClick={onDecks}>prépare-le</button> avant de jouer.</p>}
            </section>
          </div>
          <FriendsPanel fr={fr} acc={acc} onAccount={onAccount} room={null} myName={myName} flash={flash} />
        </div>
        {toast && <div className="toast hub-toast" role="status">{toast}</div>}
        {rules && <RulesGuide onClose={() => setRules(false)} />}
      </div>
      </>
    );
  }

  // ------- dans le salon -------
  const s = room.settings;
  const players = room.players;
  const humans = players.filter((p) => !p.bot);
  const canStart = players.length >= 2 && players.length <= AG_MAX && humans.every((p) => p.agDeck);
  const hint = players.length < 2 ? "Il faut au moins 2 joueurs : invite un ami ou ajoute un bot." : players.length > AG_MAX ? `${AG_MAX} joueurs au maximum.` : "Chaque joueur doit avoir choisi un deck valide.";
  const free = Math.max(0, AG_MAX - players.length);
  const friendCodes = new Set(fr.friends.map((f) => f.code));
  const addFriend = async (p) => {
    try {
      const found = (await fr.search(p.tl.fc)).find((c) => c.code === cleanFriendCode(p.tl.fc));
      if (!found) { flash("Ce joueur n'a pas de carte de joueur."); return; }
      const r = await fr.request(found.uid);
      flash(r === "accepted" ? `${p.name} et toi êtes maintenant amis !` : `Demande d'ami envoyée à ${p.name}.`); sfx.apply();
    } catch { flash("Impossible d'envoyer la demande pour l'instant."); }
  };
  return (
    <>
    <div className="hub-bg" aria-hidden="true" />
    <div className="screen tl tl-room" data-testid="tcg-lobby-room">
      <header className="tl-top">
        <button className="iconbtn" onClick={onBack} aria-label="Accueil du jeu (tu restes dans le salon)" title="Accueil du jeu"><Icon name="back" /></button>
        <div className="hs-title"><small>{GAME_NAME}</small><h2>Salon de {(players.find((p) => p.id === room.hostId) || { name: "?" }).name}</h2></div>
        <CopyCode code={room.id} label="Code à donner" testId="tl-roomcode" />
        <span className="grow" />
        <button className="btn small ghost tl-friends-btn" onClick={() => setFriendsOpen((v) => !v)} aria-pressed={friendsOpen}><Icon name="users" size={16} />Amis{fr.friends.some((f) => fr.onlineOf(f.code)) ? ` · ${fr.friends.filter((f) => fr.onlineOf(f.code)).length}` : ""}</button>
        <button className="iconbtn tl-help" onClick={() => { setRules(true); sfx.open(); }} aria-label="Les règles du jeu" title="Les règles" data-testid="tl-rules"><Icon name="help" /></button>
        <button className="btn small ghost" onClick={net.leave} data-testid="tl-leave"><Icon name="logout" size={16} />Quitter</button>
      </header>

      <div className={"tl-body" + (friendsOpen ? " withf" : "")}>
        <div className="tl-main">
          <div className="tl-slots">
            {players.map((p) => (
              <Slot key={p.id} p={p} me={me} isHost={isHost} hostId={room.hostId} onKick={() => net.kick(p.id)}
                canFriend={fr.state === "ok" && p.id !== me.id && !p.bot && p.tl && p.tl.fc && !friendCodes.has(p.tl.fc) && (!fr.me || fr.me.code !== p.tl.fc)}
                onFriend={() => addFriend(p)} />
            ))}
            {Array.from({ length: free }, (_, i) => (
              <div key={"free" + i} className="tl-slot free">
                <div className="tl-free" aria-hidden="true">
                  <svg viewBox="0 0 100 230" preserveAspectRatio="none"><path d="M1,9 H99 V228 L50,206 L1,228 Z" vectorEffect="non-scaling-stroke" /></svg>
                  <span><Icon name="user" size={30} stroke={1.4} /><small>Place libre</small></span>
                </div>
                <div className="tl-slot-acts col">
                  {fr.state === "ok" && <button className="btn small" onClick={() => setFriendsOpen(true)}><Icon name="mail" size={15} />Inviter un ami</button>}
                  {isHost && <button className="btn small ghost" onClick={() => { net.addBot(); sfx.select(); }} data-testid="tl-addbot"><Icon name="bot" size={15} />Ajouter un bot</button>}
                </div>
              </div>
            ))}
          </div>

          <div className="tl-under">
            <section className="tl-panel tl-mydeck">
              <h3><Icon name="layers" size={17} />Mon deck</h3>
              {valid.length ? (
                <div className="tl-decks">
                  {valid.map((d) => {
                    const f = FAMILY[d.fam] || FAMILY.neutre;
                    return <button key={d.id} className="tl-deckbtn" aria-pressed={deck && deck.id === d.id} style={{ "--fc": f.color }} onClick={() => { setTcg(P.selectDeck(t, d.id)); sfx.select(); }}><Icon name={f.icon} size={16} />{d.name}</button>;
                  })}
                </div>
              ) : <p className="plerr" role="alert">Aucun deck valide : complète un deck d'abord.</p>}
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button className="btn small ghost" onClick={onDecks}><Icon name="edit" size={15} />Mes decks</button>
                {mine && !mine.agDeck && deck && <span className="pill warn">Envoi du deck…</span>}
              </div>
            </section>
            <section className="tl-panel tl-settings">
              <h3><Icon name="settings" size={17} />Règles de la partie {isHost ? "" : <small>Le créateur les choisit</small>}</h3>
              <div className="tl-set">
                <small>Pouvoir pour gagner</small>
                <div className="seg">{AG_GOALS.map((n) => <button key={n} aria-pressed={s.agGoal === n} disabled={!isHost} onClick={() => net.setSettings({ agGoal: n })}><b>{n}</b><span>{n <= 10 ? "partie rapide" : "partie classique"}</span></button>)}</div>
              </div>
              <div className="tl-set">
                <small>Temps pour chaque décision</small>
                <div className="seg">{AG_TIMERS.map(([v, l]) => <button key={v} aria-pressed={s.agTimer === v} disabled={!isHost} onClick={() => net.setSettings({ agTimer: v })}>{l}</button>)}</div>
              </div>
              <div className="tl-set">
                <small>Titres, à 3 ou 4 joueurs</small>
                <div className="seg">{AG_TITLES.map(([v, l, sub]) => <button key={v} aria-pressed={(s.agTitles || "choix") === v} disabled={!isHost} onClick={() => net.setSettings({ agTitles: v })} data-testid={"tl-titles-" + v}><b className="w">{l}</b><span>{sub}</span></button>)}</div>
              </div>
            </section>
          </div>

          <div className="tl-start">
            {isHost
              ? <button className="btn primary tl-go" disabled={!canStart} onClick={() => { net.start(); sfx.apply(); }} data-testid="tl-start"><Icon name="swords" size={20} />Lancer la partie</button>
              : <div className="wait" role="status">Le créateur lance la partie<i /><i /><i /></div>}
            {isHost && !canStart && <p className="muted tl-note">{hint}</p>}
          </div>
        </div>
        {friendsOpen && <FriendsPanel fr={fr} acc={acc} onAccount={onAccount} room={room} myName={myName} flash={flash} compact />}
      </div>
      {toast && <div className="toast hub-toast" role="status">{toast}</div>}
      {rules && <RulesGuide onClose={() => setRules(false)} />}
    </div>
    </>
  );
}

/** Invitation reçue d'un ami : bandeau en haut de l'écran, « Rejoindre » ou fermer. */
export function InviteToast({ inv, onJoin, onClose }) {
  return (
    <div className="tl-invite" role="alert" data-testid="tl-invite-toast">
      <span className="tl-invite-i" aria-hidden="true"><Icon name="mail" size={18} /></span>
      <span className="grow"><b>{inv.name || "Un ami"}</b> t'invite dans son salon</span>
      <button className="btn small primary" onClick={onJoin} data-testid="tl-invite-join">Rejoindre</button>
      <button className="iconbtn small" onClick={onClose} aria-label="Ignorer l'invitation"><Icon name="close" size={15} /></button>
    </div>
  );
}

