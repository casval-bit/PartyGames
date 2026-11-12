// Petit pont vers l'appli web : elle sait qu'elle tourne sur ordinateur (textes « cet ordinateur », pas de fausse tablette,
// pas de rotation de l'écran de jeu) et peut passer la fenêtre en plein écran ou en fenêtre (réglages, bouton du Trône des Mondes).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("partyHubDesktop", {
  platform: process.platform,
  isFullscreen: () => ipcRenderer.invoke("ph:isFullscreen"),
  setFullscreen: (on) => ipcRenderer.invoke("ph:setFullscreen", Boolean(on)),
  onFullscreen: (fn) => {
    const f = (_e, on) => fn(Boolean(on));
    ipcRenderer.on("ph:fullscreen", f);
    return () => ipcRenderer.removeListener("ph:fullscreen", f);
  },
});
