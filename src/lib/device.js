// Sur quoi tourne l'appli : téléphone (APK Android ou navigateur) ou appli PC (Electron, dossier desktop/, qui expose window.partyHubDesktop).
// Sert aux textes qui parlent de l'appareil (« ce téléphone » / « cet ordinateur ») et à l'affichage sur PC (classe html.desktop :
// pas de fausse tablette autour de l'appli, pas de rotation de l'écran de jeu, plein écran de la fenêtre).
export const DESKTOP = typeof window !== "undefined" && Boolean(window.partyHubDesktop);

export const APPAREIL = DESKTOP
  ? { ce: "cet ordinateur", Ce: "Cet ordinateur", ton: "ton ordinateur", le: "l'ordinateur", autre: "un autre appareil" }
  : { ce: "ce téléphone", Ce: "Ce téléphone", ton: "ton téléphone", le: "le téléphone", autre: "un autre téléphone" };

/** Appli PC : la fenêtre (plein écran ou non). Ailleurs : null. */
export const desktop = () => (DESKTOP ? window.partyHubDesktop : null);

/** Appli PC : rappel discret au lancement, pour sortir du plein écran. */
export function desktopHint() {
  const d = desktop();
  if (!d || typeof document === "undefined") return;
  d.isFullscreen().then((on) => {
    if (!on) return;
    const el = document.createElement("div");
    el.className = "deskhint";
    el.textContent = "Plein écran · F11 pour passer en fenêtre";
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 4200);
    setTimeout(() => el.remove(), 5000);
  }).catch(() => {});
}
