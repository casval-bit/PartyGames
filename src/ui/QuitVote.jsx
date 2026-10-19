import { useEffect, useState } from "react";

/** Bouton « quitter la partie » + fenêtre de vote. La majorité des joueurs (hors bots) ramène tout le monde au lobby. */
export default function QuitVote({ room, me, api }) {
  const q = room.quit;
  const [armed, setArmed] = useState(false); // confirmation avant de lancer un vote
  const [, tick] = useState(0);
  useEffect(() => { if (!q) return; const t = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(t); }, [!!q]); // eslint-disable-line
  useEffect(() => { if (q) setArmed(false); }, [!!q]); // eslint-disable-line
  const humans = room.players.filter((p) => !p.bot);
  const need = Math.floor(humans.length / 2) + 1;
  const name = (id) => { const p = room.players.find((x) => x.id === id); return p ? p.name : "Un joueur"; };

  if (!q) {
    return (
      <>
        <button className="quitbtn" onClick={() => setArmed(true)} aria-label="Quitter la partie" title="Quitter la partie">⏏</button>
        {armed && (
          <div className="quitwrap" role="dialog" aria-modal="true" aria-label="Quitter la partie">
            <div className="quitcard">
              <h3>Retourner au lobby ?</h3>
              <p>{humans.length > 1 ? `Un vote est lancé : il faut ${need} « oui » sur ${humans.length} joueurs. La partie en cours est abandonnée.` : "La partie en cours est abandonnée."}</p>
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button className="btn primary" onClick={() => { api.quitVote("start"); setArmed(false); }}>{humans.length > 1 ? "Lancer le vote" : "Quitter la partie"}</button>
                <button className="btn ghost" onClick={() => setArmed(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const iVoted = q.yes.includes(me.id) || q.no.includes(me.id);
  const left = Math.max(0, Math.ceil((q.until - Date.now()) / 1000));
  return (
    <div className="quitwrap" role="alertdialog" aria-modal="true" aria-label="Vote pour quitter la partie">
      <div className="quitcard">
        {q.closed ? (
          <>
            <h3>Vote refusé</h3>
            <p>La partie continue.</p>
          </>
        ) : (
          <>
            <h3>{q.by === me.id ? "Tu proposes de quitter la partie" : `${name(q.by)} propose de quitter la partie`}</h3>
            <p>Retour au lobby pour tout le monde, avec les mêmes équipes.</p>
            <div className="quitcount" aria-live="polite">
              <span className="y">Oui {q.yes.length}</span>
              <span className="n">Non {q.no.length}</span>
              <small>il faut {need} oui · {left} s</small>
            </div>
            <div className="quitwho">{q.yes.length > 0 && <span>Oui : {q.yes.map(name).join(", ")}</span>}{q.no.length > 0 && <span>Non : {q.no.map(name).join(", ")}</span>}</div>
            {!iVoted ? (
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button className="btn primary" onClick={() => api.quitVote("yes")}>Oui, quitter</button>
                <button className="btn ghost" onClick={() => api.quitVote("no")}>Non, continuer</button>
              </div>
            ) : (
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <span className="muted">Vote enregistré — {q.yes.includes(me.id) ? "oui" : "non"}</span>
                <button className="btn small ghost" onClick={() => api.quitVote(q.yes.includes(me.id) ? "no" : "yes")}>Changer</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
