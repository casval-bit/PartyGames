// Paramètres du Trône des Mondes (propres à ce jeu, sur cet appareil) : sons, volume, son au survol, animations,
// ouverture des boosters, plein écran sur PC. Le compte (connecté ou profil local) est rappelé en bas.
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { APPAREIL, DESKTOP, desktop } from "../../lib/device.js";
import { useFullscreen } from "../../lib/orientation.js";
import AccountBadge from "../../ui/AccountBadge.jsx";
import { setTcgPrefs, useTcgPrefs } from "../prefs.js";
import { canTest } from "../../config.js";
import { illustratedIds } from "./artStore.js";
import * as P from "../progress.js";

function Row({ icon, label, hint, children }) {
  return (
    <div className="tset-row">
      <span className="tset-l"><Icon name={icon} size={18} /><span><b>{label}</b>{hint && <small>{hint}</small>}</span></span>
      <div className="tset-c">{children}</div>
    </div>
  );
}
const Two = ({ value, a, b, onPick, disabled }) => (
  <div className="seg tset-seg">
    <button aria-pressed={value === a[0]} disabled={disabled} onClick={() => onPick(a[0])}>{a[1]}</button>
    <button aria-pressed={value === b[0]} disabled={disabled} onClick={() => onPick(b[0])}>{b[1]}</button>
  </div>
);

export default function TcgSettings({ onClose, acc, onAccount, onRules, t, setT, flash }) {
  const p = useTcgPrefs();
  const full = useFullscreen();
  const set = (patch, ping = true) => { setTcgPrefs(patch); if (ping) sfx.select(); };
  return (
    <div className="modalwrap" onClick={onClose}>
      <div className="modal tset" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Paramètres du Trône des Mondes">
        <div className="row spread">
          <h3 className="tset-h"><Icon name="settings" size={20} />Paramètres du jeu</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <p className="muted tset-note">Seulement pour le Trône des Mondes, sur {APPAREIL.ce}. Les autres jeux gardent les réglages de ton profil Party Hub.</p>

        <div className="tset-group">
          <span className="eyebrow">Son</span>
          <Row icon={p.sound ? "sound" : "mute"} label="Sons du jeu" hint="Boutons, boosters, cartes, partie">
            <Two value={p.sound} a={[true, "Oui"]} b={[false, "Coupés"]} onPick={(v) => { setTcgPrefs({ sound: v }); if (v) sfx.select(); }} />
          </Row>
          <Row icon="sound" label="Volume" hint={`${Math.round(p.volume * 100)} %`}>
            <input className="tset-range" type="range" min={0} max={100} step={5} value={Math.round(p.volume * 100)} disabled={!p.sound}
              onChange={(e) => setTcgPrefs({ volume: Number(e.target.value) / 100 })} onPointerUp={() => sfx.select()} onKeyUp={() => sfx.select()}
              style={{ "--v": `${Math.round(p.volume * 100)}%` }} aria-label="Volume des sons du jeu" />
          </Row>
          <Row icon="hand" label="Son au survol des boutons" hint="À la souris">
            <Two value={p.hover} a={[true, "Oui"]} b={[false, "Non"]} disabled={!p.sound} onPick={(v) => set({ hover: v })} />
          </Row>
        </div>

        <div className="tset-group">
          <span className="eyebrow">Affichage</span>
          <Row icon="sparkles" label="Animations" hint="Carte qui se retourne, vitrine qui flotte">
            <Two value={p.motion} a={["full", "Complètes"]} b={["reduced", "Réduites"]} onPick={(v) => set({ motion: v })} />
          </Row>
          <Row icon="gift" label="Ouverture des boosters" hint="Glisser pour déchirer, ou d'un coup">
            <Two value={p.tear} a={[true, "Déchirer"]} b={[false, "Directe"]} onPick={(v) => set({ tear: v })} />
          </Row>
          {DESKTOP && (
            <Row icon="scan" label="Plein écran" hint="Touche F11">
              <Two value={full} a={[true, "Oui"]} b={[false, "Non"]} onPick={(v) => { const d = desktop(); if (d) d.setFullscreen(v); }} />
            </Row>
          )}
        </div>

        {canTest(acc) && t && setT && (
          <div className="tset-group" data-testid="tset-tester">
            <span className="eyebrow">Testeur ({acc && acc.user ? acc.user.email : "profil local"})</span>
            <p className="muted tset-note">Seulement sur cet ordinateur (VITE_TESTEURS dans le fichier .env) : profil local, ou compte de la liste.{acc && acc.user ? " Sauvegardé sur ton compte." : ""}</p>
            <Row icon="gem" label="Éclats et jetons à volonté" hint={`Jamais moins de ${P.TEST_FLOOR.ec.toLocaleString("fr-FR")} Éclats et ${P.TEST_FLOOR.jet} jetons`}>
              <Two value={p.unlimited} a={[true, "Oui"]} b={[false, "Non"]} onPick={(v) => set({ unlimited: v })} />
            </Row>
            <div className="tset-test">
              <button className="btn small" onClick={() => { setT(P.testerGift(t, { ec: 10000 })); sfx.coin(); if (flash) flash("+10 000 Éclats"); }}><Icon name="gem" size={16} />+10 000 Éclats</button>
              <button className="btn small" onClick={() => { setT(P.testerGift(t, { jet: 50 })); sfx.coin(); if (flash) flash("+50 jetons de brillance"); }}><Icon name="sparkles" size={16} />+50 jetons</button>
              <button className="btn small" onClick={() => { setT(P.testerGift(t, { packs: { multi: 10 } })); sfx.apply(); if (flash) flash("+10 boosters Multivers"); }}><Icon name="gift" size={16} />+10 Multivers</button>
              <button className="btn small" onClick={() => { setT(P.testerGift(t, { packs: { prestige: 5 } })); sfx.apply(); if (flash) flash("+5 boosters Prestige"); }}><Icon name="gift" size={16} />+5 Prestige</button>
              <button className="btn small" data-testid="tset-unlock" onClick={() => {
                const ids = illustratedIds();
                const r = P.unlockCards(t, ids);
                setT(r.t); sfx.win();
                if (flash) flash(ids.length ? `${ids.length} cartes illustrées : ${r.added} débloquée${r.added > 1 ? "s" : ""} (2 exemplaires, 1 pour les cartes 7).` :"Aucune carte illustrée trouvée (dossier illustrations vide ?).");
              }}><Icon name="image" size={16} />Débloquer les cartes illustrées</button>
            </div>
          </div>
        )}

        <div className="tset-group">
          <span className="eyebrow">Compte</span>
          <AccountBadge acc={acc} onClick={onAccount ? () => { onClose(); onAccount(); } : undefined} testId="tset-account" />
        </div>
        {onRules && <button className="btn ghost" onClick={() => { onClose(); onRules(); }}><Icon name="book" size={18} />Règles du jeu</button>}
      </div>
    </div>
  );
}
