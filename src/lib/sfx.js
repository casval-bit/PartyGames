// Sons d'interface synthétisés (aucun fichier) : bips sinus doux, glissandos, souffle filtré. Un son par animation importante,
// volume général bas. Coupés si l'utilisateur l'a demandé (réglage enregistré sur le téléphone).
// Un jeu peut avoir ses propres réglages (sons, volume, son au survol) : le Trône des Mondes les applique tant qu'il est ouvert
// (sfx.enter("tcg") au montage, la fonction renvoyée au démontage ; réglages passés par sfx.configure).
let ac = null, master = null, noiseBuf = null;
const KEY = "ph-sfx", HKEY = "ph-sfx-hover";
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
let enabled = read(KEY) !== "0";
let hoverOn = read(HKEY) !== "0";
const conf = {}; // réglages propres à un jeu : { tcg: { sound, volume, hover } }
const depth = {}; // nombre d'écrans ouverts de chaque jeu
let scope = null;
const cur = () => (scope && conf[scope]) || null;
const active = () => enabled && !(cur() && cur().sound === false);

function ctx() {
  if (!active() || typeof window === "undefined") return null;
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ac = new C(); } catch { return null; }
    master = ac.createGain(); master.connect(ac.destination);
  }
  const c = cur();
  master.gain.value = 0.07 * (c && Number.isFinite(c.volume) ? Math.max(0, Math.min(1, c.volume)) : 1);
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac.state === "running" ? ac : null;
}
function noise() {
  if (noiseBuf) return noiseBuf;
  const n = ac.sampleRate * 0.8, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf = b);
}
/** Bip sinus : fréquence f (Hz), durée d (s), volume v, glissando vers f2. */
function tone(f, d = 0.12, v = 0.6, f2 = null, type = "sine", delay = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
/** Souffle filtré (passe-bande qui glisse). */
function whoosh(d = 0.5, f0 = 600, f1 = 2400, v = 0.35, delay = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay, s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noise(); bp.type = "bandpass"; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.05);
}

let lastHover = 0;
export const sfx = {
  get on() { return enabled; },
  set(on) { enabled = !!on; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* stockage indisponible */ } },
  /** Son au survol des boutons (souris), réglage général. */
  get hoverOn() { return hoverOn; },
  setHover(on) { hoverOn = !!on; try { localStorage.setItem(HKEY, on ? "1" : "0"); } catch { /* stockage indisponible */ } },
  /** Réglages propres à un jeu (ex. "tcg") : { sound, volume (0 à 1), hover }. */
  configure(name, c) { conf[name] = { ...c }; },
  /** Un écran de ce jeu s'ouvre : ses réglages s'appliquent jusqu'à l'appel de la fonction renvoyée. */
  enter(name) {
    depth[name] = (depth[name] || 0) + 1; scope = name;
    return () => { depth[name] = Math.max(0, (depth[name] || 0) - 1); if (!depth[name] && scope === name) scope = null; };
  },
  get scope() { return scope; },
  /** Survol d'un bouton à la souris : petit « tic » cristallin (Party Hub) ou carte qui glisse (Trône des Mondes). */
  hover() {
    const c = cur(), on = c && typeof c.hover === "boolean" ? c.hover : hoverOn;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!on || now - lastHover < 55) return;
    lastHover = now;
    if (scope === "tcg") { whoosh(0.075, 2200, 5200, 0.16); tone(1320 + Math.random() * 90, 0.05, 0.07, 1560, "sine", 0.012); }
    else tone(1650 + Math.random() * 140, 0.045, 0.1, 2150, "sine");
  },
  /** Transitions d'écran : balayage de lumière (Party Hub), carte qui se retourne (Trône des Mondes). */
  sweep() { whoosh(0.42, 700, 3400, 0.16); tone(1180, 0.16, 0.06, 1560, "sine", 0.1); },
  cardFlip() { whoosh(0.26, 3000, 900, 0.22); tone(196, 0.12, 0.25, 150, "triangle", 0.2); tone(1480, 0.2, 0.08, 1760, "sine", 0.24); },
  /** Changement de section dans le Trône des Mondes : une carte qui glisse sur la table. */
  slide() { whoosh(0.18, 1600, 4200, 0.18); },
  /** À appeler dans un geste : débloque l'audio des navigateurs stricts. */
  unlock() { ctx(); },
  open() { tone(520, 0.1, 0.5, 780); tone(1040, 0.14, 0.25, null, "sine", 0.06); },
  close() { tone(700, 0.1, 0.4, 420); },
  select() { tone(880, 0.06, 0.35); },
  flip() { whoosh(0.22, 900, 2600, 0.25); tone(660, 0.08, 0.3, 990, "sine", 0.18); },
  apply() { tone(660, 0.09, 0.45); tone(990, 0.12, 0.45, null, "sine", 0.08); tone(1320, 0.18, 0.35, null, "sine", 0.16); },
  materialize() { whoosh(0.9, 300, 3200, 0.3); tone(240, 0.7, 0.25, 960, "sine", 0.05); tone(1560, 0.25, 0.12, null, "triangle", 0.62); },
  scan() { tone(1200, 0.5, 0.18, 1800, "sine"); },
  error() { tone(220, 0.16, 0.45, 160, "triangle"); },
  emote() { tone(780, 0.08, 0.35, 1170); },
  /** Mini-jeux : coup de sifflet du « STOP ! », petit choc, élimination, victoire. */
  stop() { tone(1180, 0.08, 0.5); tone(880, 0.24, 0.5, 440, "triangle", 0.08); },
  bump() { tone(180, 0.09, 0.4, 120, "triangle"); },
  out() { whoosh(0.5, 2400, 300, 0.25); tone(520, 0.35, 0.3, 130, "sine", 0.05); },
  win() { [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.16, 0.4, null, "sine", i * 0.09)); },
};

/**
 * Petite boucle musicale synthétisée (arpèges doux, gamme pentatonique) : `const m = makeTune(); m.start(); … m.stop();`.
 * Rien ne joue si les sons sont coupés. Utilisée par les plateformes musicales.
 */
export function makeTune({ bpm = 132 } = {}) {
  const notes = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 7, 12, 15, 12, 7, 5], bass = [0, 0, -5, -5, -2, -2, -7, -7];
  let timer = null, n = 0;
  const hz = (semi, base = 392) => base * Math.pow(2, semi / 12);
  const beat = () => {
    tone(hz(notes[n % notes.length]), 0.16, 0.32, null, "triangle");
    if (n % 2 === 0) tone(hz(bass[(n >> 1) % bass.length], 98), 0.26, 0.45, null, "sine");
    n++;
  };
  return {
    start() { if (timer) return; n = 0; beat(); timer = setInterval(beat, 60000 / bpm / 2); },
    stop() { if (timer) { clearInterval(timer); timer = null; } },
    get playing() { return Boolean(timer); },
  };
}
