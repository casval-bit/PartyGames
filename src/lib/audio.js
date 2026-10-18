import { safeUrl } from "./safeUrl.js";
// Lecture des extraits du blind test : un fichier MP3 (Deezer) ou, pour la démo, une mélodie synthétique.
let ctx = null;
const AC = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } return ctx; };

const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];
function playDemo(seed, offset, dur, muted, handle) {
  const ac = AC();
  if (!ac) return false;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const master = ac.createGain(); master.gain.value = muted ? 0 : 0.12; master.connect(ac.destination);
  handle.master = master;
  const step = 0.27, n = Math.ceil((dur + 0.5) / step), t0 = ac.currentTime + 0.05;
  const first = Math.floor(offset / step);
  for (let k = 0; k < n; k++) {
    const idx = first + k, r = Math.sin((seed + 1) * 12.9898 + idx * 78.233) * 43758.5453;
    const deg = SCALE[Math.floor((r - Math.floor(r)) * SCALE.length)];
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = seed % 2 ? "triangle" : "square";
    o.frequency.value = 220 * Math.pow(2, (deg + (seed % 5)) / 12);
    g.gain.setValueAtTime(0, t0 + k * step); g.gain.linearRampToValueAtTime(1, t0 + k * step + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + k * step + step * 0.9);
    o.connect(g); g.connect(master); o.start(t0 + k * step); o.stop(t0 + k * step + step);
    (handle.nodes ||= []).push(o);
  }
  return true;
}

export function createPlayer() {
  let el = null, timer = null, muted = false, blocked = () => {}, keep = [], demo = null;
  const stop = () => {
    clearTimeout(timer);
    if (el) { el.pause(); el.removeAttribute("src"); el.load(); el = null; }
    if (demo) { (demo.nodes || []).forEach((o) => { try { o.stop(); } catch { /* déjà arrêté */ } }); try { demo.master.disconnect(); } catch { /* ok */ } demo = null; }
  };
  return {
    stop,
    onBlocked(fn) { blocked = fn; },
    setMuted(b) { muted = b; if (el) el.muted = b; if (demo && demo.master) demo.master.gain.value = b ? 0 : 0.12; },
    /** À appeler dans un geste de l'utilisateur : débloque le son sur les navigateurs stricts. */
    unlock() { const ac = AC(); if (ac && ac.state === "suspended") ac.resume().catch(() => {}); },
    preload(url) {
      url = safeUrl(url, { allowDemo: true });
      if (!url || url.startsWith("demo:")) return;
      const a = new Audio(); a.preload = "auto"; a.src = url; keep = [a, ...keep].slice(0, 2);
    },
    /** Joue à partir de `offset` secondes, s'arrête tout seul après `dur` secondes. */
    play(url, offset, dur) {
      stop();
      url = safeUrl(url, { allowDemo: true }); // adresse hors liste blanche : on ne joue rien
      if (!url) return;
      if (url.startsWith("demo:")) {
        demo = {};
        if (!playDemo(Number(url.slice(5)) || 0, offset, dur, muted, demo)) blocked();
        else if (ctx && ctx.state !== "running") blocked();
        timer = setTimeout(stop, Math.max(0, dur) * 1000 + 300);
        return;
      }
      el = new Audio(); el.preload = "auto"; el.muted = muted; el.src = url;
      const t0 = Date.now();
      const go = () => {
        try { el.currentTime = Math.max(0, offset); } catch { /* sera ignoré */ }
        const p = el.play(); if (p && p.catch) p.catch(() => blocked());
      };
      el.addEventListener("loadedmetadata", go, { once: true });
      el.addEventListener("error", () => blocked("error"), { once: true });
      el.load();
      timer = setTimeout(stop, Math.max(0, dur) * 1000 + 300 - 0 * t0);
    },
  };
}
