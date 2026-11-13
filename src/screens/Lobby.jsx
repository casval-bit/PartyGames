import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, teamStyle } from "../ui/parts.jsx";
import { GAMES, TU_VARIANTS, PER_TEAM_OPTIONS, QE_ROUNDS_OPTIONS, QE_MODES, ROUND_SECONDS_OPTIONS, SHOW_BOT_BUTTON, TEAMS, BT_SONGS_OPTIONS, BT_GUESS_OPTIONS, BT_MAX_SOLO, TL_GOAL_OPTIONS, MG_ROUNDS_OPTIONS, BD_ROUNDS_OPTIONS, PB_ROUNDS_OPTIONS, PB_SECONDS_OPTIONS, CC_ROUNDS_OPTIONS } from "../config.js";
import SpotifyPicker from "./SpotifyPicker.jsx";
import { importPlaylist, demoPlaylist, MAX_TRACKS, MAX_TEXT_LINES } from "../data/playlist.js";
import { safeUrl } from "../lib/safeUrl.js";
import { Icon } from "../ui/Icon.jsx";
import { MINIGAMES, MG_BY } from "../minigames/meta.js";
import { sfx } from "../lib/sfx.js";
import EmoteWheel, { EMOTE_ICON } from "../ui/EmoteWheel.jsx";
import { EMOTE_BY } from "../avatar3d/emotes.js";
import { FAMILY, TYPE_BONUS } from "../tcg/cards/index.js";
import { validateDeck } from "../tcg/deck.js";
import { normalizeTcg, owned as ownedOf, selectDeck } from "../tcg/progress.js";
import { AG_GOALS, AG_TIMERS, AG_MAX } from "../net/hostTrone.js";
import { LG_MAX } from "../net/hostLg.js";
import LoupSettings, { lgCanStart, lgStartHint } from "../lg/ui/LoupLobby.jsx";

/** Bulle d'émote à côté du nom : apparaît quand le joueur en envoie une (compteur emoteK), disparaît après 2,8 s. */
function EmoteBubble({ p }) {
  const k = p.emoteK || 0, first = useRef(k), [show, setShow] = useState(null);
  useEffect(() => {
    if (!k || k === first.current || !EMOTE_BY[p.emote]) return undefined;
    setShow({ id: p.emote, k }); sfx.emote();
    const t = setTimeout(() => setShow(null), 2800);
    return () => clearTimeout(t);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return <span className="ebub" key={show.k} data-testid="emote-bubble"><Icon name={EMOTE_ICON[show.id]} size={15} />{EMOTE_BY[show.id].name}</span>;
}

const GICON = { timesup: "hourglass", quiest: "eye", blindtest: "music", timeline: "history", party: "gamepad", board: "dice", petitbac: "edit", celeb: "image", trone: "crown", loupgarou: "moon" };

/** Trône des Mondes : le deck que je joue (envoyé au créateur dès qu'il change) et accès à ma collection. */
function TronePanel({ room, me, api, tcg, setTcg, onTrone }) {
  const t = normalizeTcg(tcg);
  const own = ownedOf(t);
  const valid = t.decks.filter((d) => validateDeck(d, own).ok);
  const deck = valid.find((d) => d.id === t.sel) || valid[0] || null;
  const mine = room.players.find((p) => p.id === me.id);
  const sentKey = useRef("");
  const key = deck ? JSON.stringify([deck.name, deck.fam, deck.pt, deck.cards, deck.plots]) : "";
  useEffect(() => {
    if (!deck || (sentKey.current === key && mine && mine.agDeck)) return;
    sentKey.current = key;
    api.agDeck({ name: deck.name, fam: deck.fam, pt: deck.pt, cards: deck.cards, plots: deck.plots });
  }, [key, Boolean(mine && mine.agDeck)]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t.starter) {
    return (
      <div className="gamepick">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Ton deck</div>
        <p className="muted gnote" style={{ marginTop: 0 }}>Tu n'as pas encore de cartes : choisis d'abord ton deck de départ (il débloque 50 cartes).</p>
        <button className="btn primary small" onClick={() => onTrone("decks")} data-testid="trone-starter"><Icon name="crown" size={18} />Choisir mon deck de départ</button>
      </div>
    );
  }
  return (
    <div className="gamepick">
      <div className="eyebrow" style={{ marginBottom: 6 }}>Ton deck</div>
      {valid.length ? (
        <div className="seg games">
          {valid.map((d) => {
            const f = FAMILY[d.fam];
            return <button key={d.id} aria-pressed={deck && deck.id === d.id} onClick={() => { if (setTcg) { setTcg(selectDeck(t, d.id)); sfx.select(); } }}><Icon name={f.icon} size={16} />{d.name}{d.pt && TYPE_BONUS[d.pt] ? ` (${TYPE_BONUS[d.pt].name})` : ""}</button>;
          })}
        </div>
      ) : <p className="plerr" role="alert">Aucun deck valide : complète un deck dans ta collection.</p>}
      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn small ghost" onClick={() => onTrone("decks")}><Icon name="layers" size={16} />Mes decks</button>
        <button className="btn small ghost" onClick={() => onTrone("packs")}><Icon name="gift" size={16} />Boosters</button>
        {mine && !mine.agDeck && deck && <span className="pill warn">Envoi du deck…</span>}
      </div>
    </div>
  );
}

/** Mini-jeux joués (mode Mini-jeux et Plateau) : tous, ou une sélection du créateur (au moins 3). */
function MiniPick({ settings, isHost, api }) {
  const [open, setOpen] = useState(false);
  const cur = Array.isArray(settings.mgPick) && settings.mgPick.length >= 3 ? settings.mgPick : [];
  const [sel, setSel] = useState(cur);
  const toggle = (id) => { sfx.select(); setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])); };
  return (
    <div className="mgpick">
      <div className="eyebrow" style={{ marginBottom: 6 }}>Mini-jeux joués</div>
      <div className="mgpick-row">
        <span className="pill">{cur.length ? `Sélection : ${cur.length} jeux` : `Tous les jeux (${MINIGAMES.length})`}</span>
        {isHost && <button className="btn small" onClick={() => { setSel(cur.length ? cur : MINIGAMES.map((g) => g.id)); setOpen(true); sfx.open(); }} data-testid="mg-pick"><Icon name="list" size={18} /> Choisir</button>}
      </div>
      {cur.length > 0 && <div className="mgpick-tags">{cur.map((id) => <span key={id} className="mgtag"><Icon name={MG_BY[id].icon} size={14} />{MG_BY[id].title}</span>)}</div>}
      {open && (
        <div className="modalwrap" onClick={() => setOpen(false)}>
          <div className="modal mgpick-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choisir les mini-jeux">
            <div className="row spread"><h3>Choisir les mini-jeux</h3><button className="iconbtn" onClick={() => setOpen(false)} aria-label="Fermer"><Icon name="close" /></button></div>
            <p className="muted" style={{ fontSize: ".82rem" }}>Coche au moins 3 jeux. Les manches tirent au hasard parmi eux, sans répétition rapprochée.</p>
            <div className="row" style={{ gap: 8 }}><button className="btn small ghost" onClick={() => setSel(MINIGAMES.map((g) => g.id))}>Tout cocher</button><button className="btn small ghost" onClick={() => setSel([])}>Tout décocher</button></div>
            <div className="mgpick-grid">
              {MINIGAMES.map((g) => {
                const on = sel.includes(g.id);
                return (
                  <button key={g.id} className={"mgpcard" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggle(g.id)} data-testid={"mgp-" + g.id}>
                    <span className="mgpico"><Icon name={g.icon} size={22} /></span>
                    <b>{g.title}</b><small>{g.tag} · {g.seconds} s</small>
                    <i className="mgpchk" aria-hidden="true">{on && <Icon name="check" size={14} />}</i>
                  </button>
                );
              })}
            </div>
            <button className="btn primary" disabled={sel.length > 0 && sel.length < 3} onClick={() => { api.setSettings({ mgPick: sel.length === MINIGAMES.length ? [] : sel }); setOpen(false); sfx.apply(); }} data-testid="mg-pick-ok">
              {sel.length > 0 && sel.length < 3 ? "Choisis au moins 3 jeux" : sel.length === 0 || sel.length === MINIGAMES.length ? "Jouer avec tous les jeux" : `Valider (${sel.length} jeux)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Blind test : le créateur importe une playlist (Deezer, liste texte, Spotify depuis l'APK) ou prend la démo. */
const MAX_TOTAL_LABEL = "3 000";
const SPOTIFY_CAP_MSG = "Spotify ne donne que les 100 premiers morceaux d'une playlist. Pour tout avoir : ouvre la playlist Spotify sur ordinateur, Ctrl+A puis Ctrl+C, et colle ici ; ou transfère-la sur Deezer (tunemymusic.com) et colle le lien Deezer.";
function PlaylistPanel({ room, isHost, api, spotify }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState("");
  const [err, setErr] = useState("");
  const [more, setMore] = useState(false);
  const pl = room.playlist;
  const run = async () => {
    setBusy(true); setErr(""); setProg("");
    try {
      const r = await importPlaylist(raw, (a, b) => setProg(`${a}/${b}`));
      api.setPlaylist(r, pl ? true : false); setRaw(""); setMore(false);
      if (r.capped) setErr(SPOTIFY_CAP_MSG);
    } catch (e) { setErr(e.message || String(e)); }
    setBusy(false); setProg("");
  };
  return (
    <div className="gamepick plp">
      <div className="eyebrow" style={{ marginBottom: 6 }}>Playlist</div>
      {pl && (
        <div className="plcard">
          {safeUrl(pl.cover) ? <img src={safeUrl(pl.cover)} alt="" referrerPolicy="no-referrer" /> : <span className="ph" />}
          <div><strong>{pl.name}</strong><small>{pl.count} morceaux jouables · {pl.source}{pl.missing ? ` · ${pl.missing} introuvables` : ""}</small></div>
          {isHost && <button className="btn small ghost" onClick={() => api.setPlaylist(null)}>Changer</button>}
        </div>
      )}
      {pl && isHost && !more && <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setMore(true)}>+ Ajouter une autre playlist</button>}
      {isHost && (!pl || more) && (
        <>
          <textarea className="plin" rows={3} value={raw} onChange={(e) => setRaw(e.target.value)} disabled={busy} spellCheck={false}
            placeholder={"Lien Deezer ou Spotify\nou une liste, une ligne par morceau :\nDaft Punk - Get Lucky"} aria-label="Playlist à importer" />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary small" disabled={busy || !raw.trim()} onClick={run}>{busy ? `Import… ${prog}` : pl ? "Ajouter" : "Importer"}</button>
            {!pl && <button className="btn small ghost" disabled={busy} onClick={() => api.setPlaylist(demoPlaylist())}>Playlist de démo</button>}
            {pl && <button className="btn small ghost" disabled={busy} onClick={() => { setMore(false); setErr(""); }}>Annuler</button>}
          </div>
          <SpotifyPicker disabled={busy} onImported={(r) => { api.setPlaylist(r, pl ? true : false); setMore(false); setErr(""); }} />
          {err && <p className="plerr" role="alert">{err}</p>}
          <p className="muted gnote">Colle le lien d'une playlist <b>Deezer</b> publique (jusqu'à {MAX_TRACKS} morceaux, extraits audio de 30 s), une liste « Artiste - Titre » ({MAX_TEXT_LINES} lignes max) ou un export CSV d'Exportify. Lien <b>Spotify</b> : lisible dans l'appli Android, mais Spotify ne donne que les <b>100 premiers morceaux</b>. Pour une grande playlist Spotify : sur ordinateur, ouvre-la, fais <b>Ctrl+A puis Ctrl+C</b> et colle ici (tous les liens de morceaux sont lus, sans limite de 100), ou transfère-la sur Deezer (tunemymusic.com). Tu peux ajouter autant de playlists que tu veux ({MAX_TOTAL_LABEL} morceaux au total).{spotify ? " L'année de chaque morceau est cherchée sur MusicBrainz." : ""}</p>
        </>
      )}
      {!pl && !isHost && <p className="muted gnote">Le créateur choisit la playlist…</p>}
    </div>
  );
}

const Seg = ({ value, options, onPick, disabled }) => (
  <div className="seg">
    {options.map(([v, label]) => <button key={String(v)} aria-pressed={value === v} disabled={disabled} onClick={() => onPick(v)}>{label}</button>)}
  </div>
);
const Field = ({ label, children }) => (<div><div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>{children}</div>);

export default function Lobby({ room, me, isHost, api, onLeave, onProfile, tcg, setTcg, onTrone }) {
  const { settings, players } = room;
  const myTeam = players.find((p) => p.id === me.id)?.team;
  const teamsUsed = new Set(players.map((p) => p.team)).size;
  const bt = settings.game === "blindtest";
  const tl = settings.game === "timeline";
  const board = settings.game === "board";
  const pbac = settings.game === "petitbac";
  const celeb = settings.game === "celeb";
  const trone = settings.game === "trone";
  const loup = settings.game === "loupgarou";
  const party = settings.game === "party" || board || pbac || celeb || trone || loup; // jeux sans équipes
  const soloBt = (bt && !settings.btTeams) || party; // pas d'équipes : liste de joueurs seule
  const canStart = loup ? lgCanStart(settings, players.length) : trone ? players.length >= 2 && players.length <= AG_MAX && players.every((p) => p.bot || p.agDeck) : pbac ? players.length >= 2 : party ? players.length >= 1 : bt ? Boolean(room.playlist) && players.length >= 1 && (soloBt || teamsUsed >= 2) : tl ? Boolean(room.playlist) && players.length >= 1 : players.length >= 2 && teamsUsed >= 2;
  const cap = loup ? LG_MAX : trone ? AG_MAX : soloBt ? BT_MAX_SOLO : settings.teamCount * settings.perTeam;
  const full = players.length >= cap;
  const [wheel, setWheel] = useState(false);
  const biggest = Math.max(...Array.from({ length: settings.teamCount }, (_, t) => players.filter((p) => p.team === t).length));

  return (
    <div className="screen lobby">
      <div className="row spread">
        <div className="row" style={{ minWidth: 0 }}>
          <button className="iconbtn" onClick={onLeave} aria-label="Quitter le lobby"><Icon name="back" /></button>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Lobby</div>
            <h2 style={{ fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h2>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="iconbtn" onClick={() => setWheel(true)} aria-label="Émotes" title="Émotes" data-testid="lobby-emotes"><Icon name="smile" /></button>
          {onProfile && <button className="iconbtn" onClick={onProfile} aria-label="Mon profil" title="Mon profil"><Icon name="user" /></button>}
          <span className="chip"><i />{players.length}/{cap}</span>
        </div>
      </div>

      {/* deux colonnes sur PC (jeu et réglages | joueurs) ; sur téléphone, une seule colonne : jeu, joueurs, réglages */}
      <div className="scroll lobby-scroll">
        <div className="lobby-a">
        <div className="gamepick">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Jeu</div>
          <div className="seg games">
            {GAMES.map((g) => (
              <button key={g.id} aria-pressed={settings.game === g.id} disabled={!isHost} onClick={() => api.setSettings({ game: g.id })}><Icon name={GICON[g.id] || "gamepad"} size={18} />{g.label}</button>
            ))}
          </div>
          <p className="muted gnote">{GAMES.find((g) => g.id === settings.game).note}</p>
          {settings.game === "timesup" && (
            <>
              <div className="eyebrow" style={{ margin: "10px 0 6px" }}>Mode</div>
              <div className="seg games">
                {TU_VARIANTS.map((v) => (
                  <button key={v.id} aria-pressed={(settings.variant || "classic") === v.id} disabled={!isHost} onClick={() => api.setSettings({ variant: v.id })}>{v.label}</button>
                ))}
              </div>
              <p className="muted gnote">{TU_VARIANTS.find((v) => v.id === (settings.variant || "classic")).note}</p>
            </>
          )}
        </div>
        {(bt || tl) && <PlaylistPanel room={room} isHost={isHost} api={api} spotify={tl} />}
        {trone && onTrone && <TronePanel room={room} me={me} api={api} tcg={tcg} setTcg={setTcg} onTrone={onTrone} />}
        </div>
        <div className="lobby-b">
        {soloBt && (
          <section className="team solo" style={{ "--tc": "var(--blue)", "--tink": "#fff" }} aria-label="Joueurs">
            <header>Joueurs<small>{players.length}/{cap}</small></header>
            {players.map((p) => (
              <div className={"pl" + (p.id === me.id ? " me" : "")} key={p.id}>
                <PlayerAvatar name={p.name} look={p.look} showLv /><span className="nm">{p.name}</span><EmoteBubble p={p} />{p.bot && <span className="tag">BOT</span>}
                {trone && !p.bot && (p.agDeck ? <span className="tag" title={p.agDeck.name}><Icon name={(FAMILY[p.agDeck.fam] || FAMILY.neutre).icon} size={12} /> {(FAMILY[p.agDeck.fam] || {}).short || ""}</span> : <span className="tag" style={{ color: "#ffd3e1" }}>sans deck</span>)}
                {p.id === room.hostId && <span className="crown">HÔTE</span>}
                {isHost && p.id !== me.id && <button className="x" onClick={() => api.kick(p.id)} aria-label={`Exclure ${p.name}`}><Icon name="close" size={14} /></button>}
              </div>
            ))}
          </section>
        )}
        {!soloBt && <div className="teams">
          {Array.from({ length: settings.teamCount }, (_, t) => {
            const members = players.filter((p) => p.team === t);
            const free = settings.perTeam - members.length;
            return (
              <section className="team" key={t} style={teamStyle(t)} aria-label={`Équipe ${TEAMS[t].name}`}>
                <header>Équipe {TEAMS[t].name}<small>{members.length}/{settings.perTeam}</small></header>
                {members.map((p) => (
                  <div className={"pl" + (p.id === me.id ? " me" : "")} key={p.id}>
                    <PlayerAvatar name={p.name} look={p.look} showLv />
                    <span className="nm">{p.name}</span><EmoteBubble p={p} />{p.bot && <span className="tag">BOT</span>}
                    {p.id === room.hostId && <span className="crown">HÔTE</span>}
                    {isHost && p.id !== me.id && (
                      <button className="x" onClick={() => api.kick(p.id)} aria-label={`Exclure ${p.name}`}><Icon name="close" size={14} /></button>
                    )}
                  </div>
                ))}
                {Array.from({ length: free }, (_, i) =>
                  myTeam !== t && i === 0 ? (
                    <button className="slot" key={"s" + i} onClick={() => api.setTeam(t)}>Passer ici</button>
                  ) : (
                    <div className="slot" key={"s" + i}>libre</div>
                  )
                )}
              </section>
            );
          })}
        </div>}
        </div>

        <div className="settings">
          {settings.game === "party" && (
            <Field label="Nombre de manches"><Seg value={settings.mgRounds} options={MG_ROUNDS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ mgRounds: v })} /></Field>
          )}
          {(settings.game === "party" || board) && <MiniPick settings={settings} isHost={isHost} api={api} />}
          {loup && <LoupSettings settings={settings} isHost={isHost} api={api} n={players.length} Field={Field} Seg={Seg} />}
          {trone && (
            <>
              <Field label="Objectif de Pouvoir"><Seg value={settings.agGoal} options={AG_GOALS.map((n) => [n, n === 10 ? "10 (partie rapide)" : `${n} (classique)`])} disabled={!isHost} onPick={(v) => api.setSettings({ agGoal: v })} /></Field>
              <Field label="Temps pour chaque décision"><Seg value={settings.agTimer} options={AG_TIMERS} disabled={!isHost} onPick={(v) => api.setSettings({ agTimer: v })} /></Field>
              <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>De 2 à 4 joueurs, chacun avec son deck. Trop long à décider : l'ordinateur joue le coup à ta place. Les bots prennent un deck de départ au hasard.</p>
            </>
          )}
          {celeb && (
            <>
              <Field label="Nombre de célébrités à deviner"><Seg value={settings.ccRounds} options={CC_ROUNDS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ ccRounds: v })} /></Field>
              <Field label="Indice (type de célébrité)"><Seg value={settings.ccHint !== false} options={[[true, "Oui"], [false, "Non, plus dur"]]} disabled={!isHost} onPick={(v) => api.setSettings({ ccHint: v })} /></Field>
              <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>La photo est très pixellisée et devient plus nette à chaque proposition. Trouvée du premier coup = 1 coup… pas trouvée = 10 coups de pénalité. Le moins de coups gagne, comme au golf. Chacun joue seul.</p>
            </>
          )}
          {pbac && (
            <>
              <Field label="Nombre de manches (une lettre par manche)"><Seg value={settings.pbRounds} options={PB_ROUNDS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ pbRounds: v })} /></Field>
              <Field label="Temps pour écrire"><Seg value={settings.pbSeconds} options={PB_SECONDS_OPTIONS.map((n) => [n, n + " s"])} disabled={!isHost} onPick={(v) => api.setSettings({ pbSeconds: v })} /></Field>
              <Field label="Catégories"><Seg value={settings.pbCats} options={[["classic", "Classiques (prénom, animal, pays…)"], ["mix", "Mélangées"]]} disabled={!isHost} onPick={(v) => api.setSettings({ pbCats: v })} /></Field>
            </>
          )}
          {board && (
            <Field label="Tours de table (un mini-jeu après chaque tour)"><Seg value={settings.bdRounds} options={BD_ROUNDS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ bdRounds: v })} /></Field>
          )}
          {tl && (
            <>
              <Field label="Objectif : cartes à aligner pour gagner"><Seg value={settings.tlGoal} options={TL_GOAL_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ tlGoal: v })} /></Field>
              <Field label="Son"><Seg value={settings.tlAudio} options={[["all", "Tous les téléphones"], ["host", "Celui du créateur"]]} disabled={!isHost} onPick={(v) => api.setSettings({ tlAudio: v })} /></Field>
              <Field label="Morceaux dont l'année est incertaine"><Seg value={settings.tlUncertain} options={[[false, "Écartés"], [true, "Acceptés"]]} disabled={!isHost} onPick={(v) => api.setSettings({ tlUncertain: v })} /></Field>
            </>
          )}
          {bt && (
            <>
              <Field label="Morceaux"><Seg value={settings.btSongs} options={BT_SONGS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ btSongs: v })} /></Field>
              <Field label="Temps pour répondre"><Seg value={settings.btGuess} options={BT_GUESS_OPTIONS.map((n) => [n, n + " s"])} disabled={!isHost} onPick={(v) => api.setSettings({ btGuess: v })} /></Field>
              <Field label="Réponses"><Seg value={settings.btOneGuess} options={[[false, "Illimitées"], [true, "Une seule"]]} disabled={!isHost} onPick={(v) => api.setSettings({ btOneGuess: v })} /></Field>
              <Field label="Entre deux morceaux (15 s de scores)"><Seg value={settings.btManual} options={[[false, "Automatique"], [true, "Je touche l'écran"]]} disabled={!isHost} onPick={(v) => api.setSettings({ btManual: v })} /></Field>
              <Field label="Son"><Seg value={settings.btAudio} options={[["all", "Tous les téléphones"], ["host", "Celui du créateur"]]} disabled={!isHost} onPick={(v) => api.setSettings({ btAudio: v })} /></Field>
              <Field label="Mode"><Seg value={settings.btTeams} options={[[false, "Chacun pour soi"], [true, "Par équipes"]]} disabled={!isHost} onPick={(v) => api.setSettings({ btTeams: v })} /></Field>
              {settings.btTeams && (
                <Field label="Score d'équipe"><Seg value={settings.btScoring} options={[["shared", "Partagé (1 seul compte)"], ["sum", "Somme des joueurs"]]} disabled={!isHost} onPick={(v) => api.setSettings({ btScoring: v })} /></Field>
              )}
            </>
          )}
          {settings.game === "quiest" ? (
            <>
            <Field label="Image à deviner">
              <Seg value={settings.qeMode || "mixed"} options={QE_MODES} disabled={!isHost} onPick={(v) => api.setSettings({ qeMode: v })} />
              <p className="muted gnote">{(settings.qeMode || "mixed") === "choose"
                ? "Avant chaque image, un joueur choisit la catégorie de l'image d'un autre (tiré au hasard à chaque manche). Il faut au moins 2 équipes."
                : (settings.qeMode || "mixed") === "all" ? "Une carte tirée au hasard parmi toutes celles qui existent." : "Une catégorie au hasard, puis une carte de cette catégorie (équilibré)."}</p>
            </Field>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Nombre d'images</div>
              <div className="seg">
                {QE_ROUNDS_OPTIONS.map((n) => (
                  <button key={n} aria-pressed={settings.rounds === n} disabled={!isHost} onClick={() => api.setSettings({ rounds: n })}>{n}</button>
                ))}
              </div>
            </div>
            </>
          ) : bt || tl || party ? null : (
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Temps par manche</div>
              <div className="seg">
                {ROUND_SECONDS_OPTIONS.map((s) => (
                  <button key={s} aria-pressed={settings.roundSeconds === s} disabled={!isHost} onClick={() => api.setSettings({ roundSeconds: s })}>{s} s</button>
                ))}
              </div>
            </div>
          )}
          {!party && (!bt || settings.btTeams) && <><div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Joueurs par équipe</div>
            <div className="seg">
              {PER_TEAM_OPTIONS.map((n) => (
                <button key={n} aria-pressed={settings.perTeam === n} disabled={!isHost || n < biggest} onClick={() => api.setSettings({ perTeam: n })}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Équipes</div>
            <div className="seg">
              {[2, 3, 4].map((n) => (
                <button key={n} aria-pressed={settings.teamCount === n} disabled={!isHost || players.length > n * settings.perTeam} onClick={() => api.setSettings({ teamCount: n })}>{n}</button>
              ))}
            </div>
          </div></>}
          {isHost && SHOW_BOT_BUTTON && (
            <button className="btn small ghost" disabled={full} onClick={api.addBot} data-testid="add-bot"><Icon name="bot" size={16} /> Ajouter un bot (test)</button>
          )}
        </div>
      </div>

      {isHost ? (
        <>
          {!canStart && <p className="muted" style={{ textAlign: "center", fontWeight: 700, fontSize: ".9rem" }}>{loup ? lgStartHint(settings, players.length) : trone ? (players.length < 2 ? "Il faut au moins 2 joueurs (ajoute un bot pour tester seul)." : players.length > AG_MAX ? `${AG_MAX} joueurs au maximum.` : "Chaque joueur doit avoir choisi un deck valide.") : pbac ? "Il faut au moins 2 joueurs (ajoute un bot pour tester seul)." : bt || tl ? (!room.playlist ? "Importe d'abord une playlist." : "Il faut au moins 2 équipes occupées.") : "Il faut au moins 2 joueurs, dans 2 équipes différentes."}</p>}
          <button className="btn primary" disabled={!canStart} onClick={api.start}>Lancer la partie</button>
        </>
      ) : (
        <div className="wait" role="status">En attente du créateur<i /><i /><i /></div>
      )}
      {wheel && <EmoteWheel onPick={(id) => { api.emote(id); setWheel(false); }} onClose={() => setWheel(false)} />}
    </div>
  );
}
