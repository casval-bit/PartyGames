import { useEffect, useState } from "react";
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT } from "../config.js";
import { startAuth, finishAuth, isConnected, disconnect, myPlaylists, playlistLines } from "../data/spotifyApi.js";
import { resolveLines } from "../data/playlist.js";

/** Blind test / Frise : le créateur se connecte à Spotify (une seule fois) et importe une de ses playlists en entier. */
export default function SpotifyPicker({ onImported, disabled }) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(isConnected());
  const [pasted, setPasted] = useState("");
  const [waiting, setWaiting] = useState(false); // la page Spotify est ouverte, on attend le code
  const [lists, setLists] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const opts = { clientId: SPOTIFY_CLIENT_ID };

  const fail = (e) => { setErr(e.message || String(e)); if (e.code === "auth") { setConnected(false); setLists(null); } setBusy(""); };
  const connect = async () => {
    setErr("");
    try { const url = await startAuth({ clientId: SPOTIFY_CLIENT_ID, redirect: SPOTIFY_REDIRECT }); window.open(url, "_blank"); setWaiting(true); }
    catch (e) { fail(e); }
  };
  const validate = async () => {
    setBusy("Connexion…"); setErr("");
    try { await finishAuth(pasted, { clientId: SPOTIFY_CLIENT_ID, redirect: SPOTIFY_REDIRECT }); setConnected(true); setWaiting(false); setPasted(""); setBusy(""); }
    catch (e) { fail(e); }
  };
  useEffect(() => {
    if (!open || !connected || lists) return;
    setBusy("Chargement de tes playlists…");
    myPlaylists(opts).then((l) => { setLists(l); setBusy(""); }).catch(fail);
  }, [open, connected]); // eslint-disable-line
  const pick = async (p) => {
    setErr(""); setBusy("Lecture de la playlist…");
    try {
      const lines = await playlistLines(p.id, opts, (a, b) => setBusy(`Lecture ${a}/${b}`));
      const { tracks, missing } = await resolveLines(lines, undefined, (a, b) => setBusy(`Extraits audio ${a}/${b}`));
      if (!tracks.length) throw new Error("Aucun morceau jouable trouvé.");
      onImported({ name: p.name, cover: p.cover, source: "Spotify", total: lines.length, tracks, missing: missing.length });
      setOpen(false); setBusy("");
    } catch (e) { fail(e); }
  };

  if (!SPOTIFY_CLIENT_ID) return null;
  if (!open) return <button className="btn small ghost" style={{ marginTop: 8 }} disabled={disabled} onClick={() => setOpen(true)}>Mes playlists Spotify</button>;
  return (
    <div className="spk" style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Mes playlists Spotify</div>
      {!connected ? (
        <>
          <button className="btn primary small" disabled={Boolean(busy)} onClick={connect}>Se connecter à Spotify</button>
          {waiting && (
            <>
              <p className="muted gnote">Autorise l'accès sur la page Spotify, copie le code qu'elle affiche, reviens ici et colle-le.</p>
              <textarea className="plin" rows={2} value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} placeholder="Code Spotify" aria-label="Code Spotify" />
              <button className="btn primary small" disabled={!pasted.trim() || Boolean(busy)} onClick={validate}>{busy || "Valider le code"}</button>
            </>
          )}
        </>
      ) : (
        <>
          {lists && !lists.length && <p className="muted gnote">Aucune playlist à toi trouvée (seules tes playlists et celles en collaboration sont lisibles).</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {(lists || []).map((p) => (
              <button key={p.id} className="btn small ghost" disabled={Boolean(busy)} onClick={() => pick(p)} style={{ textAlign: "left" }}>{p.name}{p.total ? ` · ${p.total}` : ""}</button>
            ))}
          </div>
          {busy && <p className="muted gnote" role="status">{busy}</p>}
          <button className="btn small ghost" style={{ marginTop: 6 }} disabled={Boolean(busy)} onClick={() => { disconnect(); setConnected(false); setLists(null); }}>Se déconnecter de Spotify</button>
        </>
      )}
      {err && <p className="plerr" role="alert">{err}</p>}
      <button className="btn small ghost" style={{ marginTop: 6 }} disabled={Boolean(busy)} onClick={() => { setOpen(false); setErr(""); }}>Fermer</button>
    </div>
  );
}
