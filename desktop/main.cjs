// Party Hub en appli PC : la même appli que l'APK (le site construit par Vite, copié dans desktop/web), dans une fenêtre Electron.
// Les fichiers sont servis par une adresse interne fixe (app://party-hub/…), comme un vrai site sécurisé : le profil, les decks,
// les illustrations importées et la connexion au compte restent d'un lancement à l'autre.
// Au premier lancement, l'appli s'ouvre en plein écran (F11 pour passer en fenêtre) ; ensuite elle reprend la taille de la dernière fois.
const { app, BrowserWindow, Menu, ipcMain, net, protocol, screen, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const WEB = path.join(__dirname, "web");
const ORIGIN = "app://party-hub";
const BG = "#070d1c";
const ALLOWED = new Set(["clipboard-sanitized-write", "clipboard-read", "fullscreen", "pointerLock", "media", "notifications"]);
const BASE_H = 900; // hauteur (px) à partir de laquelle l'interface grossit avec la fenêtre

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required"); // blind test et frise : le son part sans clic
if (process.platform === "win32") app.setAppUserModelId("fr.brice.timesup");

let win = null;
let state = null; // { x, y, width, height, max, full, zoom }

/** Sert les fichiers de desktop/web, sans jamais sortir de ce dossier. */
function serveWeb() {
  protocol.handle("app", (req) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url).pathname); } catch { return new Response("Adresse invalide", { status: 400 }); }
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = path.join(WEB, rel);
    const inside = path.relative(WEB, file);
    if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) return new Response("Interdit", { status: 403 });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Introuvable", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

/* ---------------- fenêtre retrouvée au lancement suivant (taille, position, plein écran, zoom) ---------------- */
const stateFile = () => path.join(app.getPath("userData"), "fenetre.json");
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    if (s.x !== undefined) {
      const wa = screen.getDisplayMatching(s).workArea; // encore visible (écran débranché, résolution changée…) ?
      const seen = Math.min(s.x + s.width, wa.x + wa.width) - Math.max(s.x, wa.x) > 120 && Math.min(s.y + s.height, wa.y + wa.height) - Math.max(s.y, wa.y) > 80;
      if (!seen) { delete s.x; delete s.y; }
    }
    return s;
  } catch { return null; }
}
function saveState() {
  if (!win || win.isDestroyed()) return;
  state = { ...state, ...win.getNormalBounds(), max: win.isMaximized(), full: win.isFullScreen() };
  try { fs.writeFileSync(stateFile(), JSON.stringify(state)); } catch { /* pas grave */ }
}
const later = () => { clearTimeout(later.t); later.t = setTimeout(saveState, 400); };

/* ---------------- taille de l'interface : elle grandit avec la fenêtre, × le zoom choisi (Ctrl + / Ctrl - / Ctrl 0) ---------------- */
function applyZoom() {
  if (!win || win.isDestroyed()) return;
  const [, h] = win.getContentSize();
  const auto = Math.min(1.5, Math.max(1, h / BASE_H));
  win.webContents.setZoomFactor(Math.round(auto * (state.zoom || 1) * 100) / 100);
}
function zoomBy(step) {
  state.zoom = step === 0 ? 1 : Math.min(2, Math.max(0.6, Math.round(((state.zoom || 1) + step) * 10) / 10));
  applyZoom(); later();
}

/**
 * Comme l'APK (CapacitorHttp), l'appli peut lire des pages publiques qui n'autorisent pas les sites tiers (page « embed » d'une
 * playlist Spotify, pages de morceaux, API Deezer) : on ajoute l'autorisation CORS aux réponses qui n'en ont pas.
 * Seule l'appli tourne dans cette fenêtre (les liens extérieurs partent dans le navigateur), donc rien d'autre n'en profite.
 */
function relaxCors() {
  session.defaultSession.webRequest.onHeadersReceived({ urls: ["https://*/*", "http://*/*"] }, (d, cb) => {
    const h = d.responseHeaders || {};
    if (Object.keys(h).some((k) => k.toLowerCase() === "access-control-allow-origin")) return cb({});
    cb({ responseHeaders: { ...h, "Access-Control-Allow-Origin": ["*"], "Access-Control-Allow-Headers": ["*"], "Access-Control-Allow-Methods": ["GET, POST, PUT, PATCH, DELETE, OPTIONS"] } });
  });
}

/** Liens vers l'extérieur (page Spotify, Wikipédia…) : dans le navigateur de l'ordinateur, jamais dans la fenêtre du jeu. */
function openOutside(url) {
  if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
}

function createWindow() {
  state = loadState() || { full: true, zoom: 1 }; // premier lancement : plein écran
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const size = state.width ? { width: state.width, height: state.height } : { width: Math.min(1280, Math.round(wa.width * 0.92)), height: Math.min(820, Math.round(wa.height * 0.92)) };
  win = new BrowserWindow({
    ...size,
    ...(state.x !== undefined ? { x: state.x, y: state.y } : {}),
    minWidth: 380, minHeight: 600,
    show: false,
    fullscreen: Boolean(state.full),
    backgroundColor: BG,
    title: "Party Hub",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true, // menu caché : touche Alt pour l'afficher
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  if (state.max && !state.full) win.maximize();
  win.once("ready-to-show", () => win.show());
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: "deny" }; });
  wc.on("will-navigate", (e, url) => { if (!url.startsWith(ORIGIN + "/")) { e.preventDefault(); openOutside(url); } });
  wc.on("did-finish-load", () => { applyZoom(); wc.setVisualZoomLevelLimits(1, 1); }); // pas de zoom au pincement (écrans tactiles)
  wc.on("zoom-changed", (_e, dir) => zoomBy(dir === "in" ? 0.1 : -0.1)); // Ctrl + molette
  wc.on("before-input-event", (e, k) => { // Ctrl + / Ctrl - / Ctrl 0 (pavé numérique compris)
    if (k.type !== "keyDown" || !(k.control || k.meta) || k.alt) return;
    const step = k.key === "+" || k.key === "=" || k.code === "NumpadAdd" ? 0.1 : k.key === "-" || k.code === "NumpadSubtract" ? -0.1 : k.key === "0" || k.code === "Digit0" || k.code === "Numpad0" ? 0 : null;
    if (step !== null) { e.preventDefault(); zoomBy(step); }
  });
  for (const ev of ["resize", "maximize", "unmaximize"]) win.on(ev, () => { applyZoom(); later(); });
  win.on("move", later);
  for (const [ev, on] of [["enter-full-screen", true], ["leave-full-screen", false]]) win.on(ev, () => { applyZoom(); later(); wc.send("ph:fullscreen", on); });
  win.on("close", saveState);
  win.on("closed", () => { win = null; });

  if (process.env.PARTYHUB_SHOT) shoot(process.env.PARTYHUB_SHOT); // vérification automatique (capture puis fermeture)
  win.loadURL(ORIGIN + "/index.html");
}

/** Mode vérification : attend que l'appli soit affichée, enregistre une capture et les erreurs de la page, puis ferme. */
function shoot(out) {
  const logs = [];
  win.webContents.on("console-message", (e) => { if (e.level === "error" || e.level === "warning") logs.push(`${e.level} ${e.message}`); });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => logs.push(`échec ${code} ${desc} ${url}`));
  win.webContents.once("did-finish-load", () => setTimeout(async () => {
    try {
      if (process.env.PARTYHUB_JS) await win.webContents.executeJavaScript(process.env.PARTYHUB_JS);
      await new Promise((r) => setTimeout(r, Number(process.env.PARTYHUB_WAIT2 || 0)));
      const info = await win.webContents.executeJavaScript(`({ title: document.title, root: document.getElementById("root").children.length, shell: Boolean(document.querySelector(".shell")), desktop: document.documentElement.classList.contains("desktop"), origin: location.origin, ls: (() => { try { localStorage.setItem("ph-test", "1"); return localStorage.getItem("ph-test"); } catch (e) { return String(e); } })(), idb: typeof indexedDB, secure: window.isSecureContext, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio })`);
      info.zoom = win.webContents.getZoomFactor(); info.full = win.isFullScreen();
      const img = await win.webContents.capturePage();
      fs.writeFileSync(out, img.toPNG());
      fs.writeFileSync(out + ".json", JSON.stringify({ info, logs }, null, 1));
    } catch (err) { fs.writeFileSync(out + ".json", JSON.stringify({ err: String(err), logs })); }
    app.quit();
  }, Number(process.env.PARTYHUB_WAIT || 3500)));
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Party Hub", submenu: [{ role: "reload", label: "Recharger" }, { type: "separator" }, { role: "quit", label: "Quitter" }] },
    {
      label: "Affichage",
      submenu: [
        { role: "togglefullscreen", label: "Plein écran" },
        { type: "separator" },
        // raccourcis gérés au clavier (keys, plus bas), quelle que soit la disposition (AZERTY…) : le menu ne fait que les afficher
        { label: "Taille normale", accelerator: "CmdOrCtrl+0", registerAccelerator: false, click: () => zoomBy(0) },
        { label: "Agrandir", accelerator: "CmdOrCtrl+Plus", registerAccelerator: false, click: () => zoomBy(0.1) },
        { label: "Réduire", accelerator: "CmdOrCtrl+-", registerAccelerator: false, click: () => zoomBy(-0.1) },
        { type: "separator" },
        { role: "toggleDevTools", label: "Outils de développement" },
      ],
    },
  ]));
}

/** Plein écran demandé par l'appli (réglages, bouton de la partie du Trône) : seulement depuis ses propres pages. */
function ipc() {
  const ours = (e) => Boolean(e.senderFrame && e.senderFrame.url.startsWith(ORIGIN + "/"));
  ipcMain.handle("ph:isFullscreen", (e) => ours(e) && Boolean(win && win.isFullScreen()));
  ipcMain.handle("ph:setFullscreen", (e, on) => { if (ours(e) && win) win.setFullScreen(Boolean(on)); return Boolean(win && win.isFullScreen()); });
}

if (!app.requestSingleInstanceLock()) {
  app.quit(); // déjà ouverte : on la remet au premier plan (événement second-instance ci-dessous)
} else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ALLOWED.has(perm)));
    serveWeb();
    relaxCors();
    buildMenu();
    ipc();
    createWindow();
    app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
