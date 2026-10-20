import { useState } from "react";
import { PlayerAvatar, teamStyle } from "../ui/parts.jsx";
import { GAMES, TU_VARIANTS, PER_TEAM_OPTIONS, QE_ROUNDS_OPTIONS, QE_MODES, ROUND_SECONDS_OPTIONS, SHOW_BOT_BUTTON, TEAMS, BT_SONGS_OPTIONS, BT_GUESS_OPTIONS, BT_MAX_SOLO, TL_GOAL_OPTIONS, MG_ROUNDS_OPTIONS, BD_ROUNDS_OPTIONS, PB_ROUNDS_OPTIONS, PB_SECONDS_OPTIONS } from "../config.js";
import { importPlaylist, demoPlaylist, MAX_TRACKS, MAX_TEXT_LINES } from "../data/playlist.js";
import { safeUrl } from "../lib/safeUrl.js";

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

export default function Lobby({ room, me, isHost, api, onLeave, onProfile }) {
  const { settings, players } = room;
  const myTeam = players.find((p) => p.id === me.id)?.team;
  const teamsUsed = new Set(players.map((p) => p.team)).size;
  const bt = settings.game === "blindtest";
  const tl = settings.game === "timeline";
  const board = settings.game === "board";
  const pbac = settings.game === "petitbac";
  const party = settings.game === "party" || board || pbac; // jeux sans équipes
  const soloBt = (bt && !settings.btTeams) || party; // pas d'équipes : liste de joueurs seule
  const canStart = pbac ? players.length >= 2 : party ? players.length >= 1 : bt ? Boolean(room.playlist) && players.length >= 1 && (soloBt || teamsUsed >= 2) : tl ? Boolean(room.playlist) && players.length >= 1 : players.length >= 2 && teamsUsed >= 2;
  const cap = soloBt ? BT_MAX_SOLO : settings.teamCount * settings.perTeam;
  const full = players.length >= cap;
  const biggest = Math.max(...Array.from({ length: settings.teamCount }, (_, t) => players.filter((p) => p.team === t).length));

  return (
    <div className="screen">
      <div className="row spread">
        <div className="row" style={{ minWidth: 0 }}>
          <button className="iconbtn" onClick={onLeave} aria-label="Quitter le lobby">←</button>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Lobby</div>
            <h2 style={{ fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h2>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {onProfile && <button className="iconbtn" onClick={onProfile} aria-label="Mon profil" title="Mon profil">☺</button>}
          <span className="chip"><i />{players.length}/{cap}</span>
        </div>
      </div>

      <div className="scroll">
        <div className="gamepick">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Jeu</div>
          <div className="seg games">
            {GAMES.map((g) => (
              <button key={g.id} aria-pressed={settings.game === g.id} disabled={!isHost} onClick={() => api.setSettings({ game: g.id })}>{g.label}</button>
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
        {soloBt && (
          <section className="team solo" style={{ "--tc": "var(--blue)", "--tink": "#fff" }} aria-label="Joueurs">
            <header>Joueurs<small>{players.length}/{cap}</small></header>
            {players.map((p) => (
              <div className={"pl" + (p.id === me.id ? " me" : "")} key={p.id}>
                <PlayerAvatar name={p.name} look={p.look} showLv /><span className="nm">{p.name}</span>{p.bot && <span className="tag">BOT</span>}
                {p.id === room.hostId && <span className="crown">HÔTE</span>}
                {isHost && p.id !== me.id && <button className="x" onClick={() => api.kick(p.id)} aria-label={`Exclure ${p.name}`}>✕</button>}
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
                    <span className="nm">{p.name}</span>{p.bot && <span className="tag">BOT</span>}
                    {p.id === room.hostId && <span className="crown">HÔTE</span>}
                    {isHost && p.id !== me.id && (
                      <button className="x" onClick={() => api.kick(p.id)} aria-label={`Exclure ${p.name}`}>✕</button>
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

        <div className="settings">
          {settings.game === "party" && (
            <Field label="Nombre de manches"><Seg value={settings.mgRounds} options={MG_ROUNDS_OPTIONS.map((n) => [n, n])} disabled={!isHost} onPick={(v) => api.setSettings({ mgRounds: v })} /></Field>
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
            <button className="btn small ghost" disabled={full} onClick={api.addBot}>+ Ajouter un bot (test)</button>
          )}
        </div>
      </div>

      {isHost ? (
        <>
          {!canStart && <p className="muted" style={{ textAlign: "center", fontWeight: 700, fontSize: ".9rem" }}>{pbac ? "Il faut au moins 2 joueurs (ajoute un bot pour tester seul)." : bt || tl ? (!room.playlist ? "Importe d'abord une playlist." : "Il faut au moins 2 équipes occupées.") : "Il faut au moins 2 joueurs, dans 2 équipes différentes."}</p>}
          <button className="btn primary" disabled={!canStart} onClick={api.start}>Lancer la partie</button>
        </>
      ) : (
        <div className="wait" role="status">En attente du créateur<i /><i /><i /></div>
      )}
    </div>
  );
}
