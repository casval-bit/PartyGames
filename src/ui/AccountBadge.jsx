// À qui est la progression affichée : le compte connecté (e-mail, sauvegardé) ou un profil local de cet appareil (pas sauvegardé).
// Affiché sur la carte d'identité du menu et en haut du Trône des Mondes, pour ne jamais confondre les deux.
import { Icon } from "./Icon.jsx";
import { APPAREIL } from "../lib/device.js";

export function accountState(acc) {
  if (acc && acc.user) {
    const bad = acc.sync === "error";
    return { kind: bad ? "warn" : "ok", icon: bad ? "alert" : "check", title: "Compte connecté", sub: acc.user.email,
      hint: bad ? "Sauvegarde impossible pour l'instant : touche pour réessayer" : acc.sync === "syncing" ? "Synchronisation…" : "Progression sauvegardée sur ton compte" };
  }
  if (acc && acc.enabled) return { kind: "local", icon: "user", title: "Profil local, pas sauvegardé", sub: `Seulement sur ${APPAREIL.ce}`, hint: "Connecte-toi pour retrouver ta progression partout" };
  return { kind: "off", icon: "cloudoff", title: "Profil local (hors ligne)", sub: `Seulement sur ${APPAREIL.ce}`, hint: "Les comptes ont besoin du mode en ligne" };
}

/** compact : une ligne (en-têtes) ; sinon titre + e-mail ou explication. onClick : ouvre l'écran du compte. */
export default function AccountBadge({ acc, onClick, compact = false, testId = "acc-badge" }) {
  const s = accountState(acc);
  const can = Boolean(onClick && acc && acc.enabled);
  const Tag = can ? "button" : "div";
  const line = s.kind === "ok" ? s.sub : s.kind === "warn" ? "Pas sauvegardé pour l'instant" : s.sub;
  return (
    <Tag className={"accbadge " + s.kind + (compact ? " compact" : "")} onClick={can ? onClick : undefined} title={`${s.title} : ${s.sub}. ${s.hint}`} data-testid={testId}>
      <span className="ab-dot" aria-hidden="true"><Icon name={s.icon} size={compact ? 13 : 16} stroke={2} /></span>
      {compact
        ? <span className="ab-txt"><b>{s.kind === "ok" || s.kind === "warn" ? "Compte" : "Profil local"}</b><small>{s.kind === "ok" || s.kind === "warn" ? s.sub : "pas sauvegardé"}</small></span>
        : <span className="ab-txt"><b>{s.title}</b><small>{line}</small></span>}
      {can && !compact && (s.kind === "ok" || s.kind === "warn" ? <Icon name="next" size={18} className="ab-chev" /> : <span className="ab-go">Se connecter</span>)}
    </Tag>
  );
}
