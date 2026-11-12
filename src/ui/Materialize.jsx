import { useEffect, useRef } from "react";
import { sfx } from "../lib/sfx.js";

/**
 * Effet signature « matérialisation » : un damier de blocs bleu nuit de 32 px couvre l'écran ; l'effet part du centre vers les bords.
 * Chaque bloc s'allume d'abord par son contour cyan, flashe blanc-cyan, puis disparaît du bas vers le haut en révélant l'interface (~1,3 s).
 * Rejoué chaque fois que `k` change (nouvel écran). Ne bloque jamais les touches (pointer-events: none).
 */
export default function Materialize({ k, sound = true }) {
  const ref = useRef(null), first = useRef(true);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const host = cv.parentElement || document.body, R = host.getBoundingClientRect();
    const W = Math.max(1, R.width), H = Math.max(1, R.height), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = 32, cols = Math.ceil(W / S), rows = Math.ceil(H / S), cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy);
    const blocks = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * S, y = j * S, d = Math.hypot(x + S / 2 - cx, y + S / 2 - cy) / maxD;
      blocks.push({ x, y, t0: d * 0.68 + Math.random() * 0.06 });
    }
    if (sound && !first.current) sfx.materialize();
    first.current = false;
    let raf = 0;
    const T0 = performance.now(), END = 0.68 + 0.06 + 0.6;
    const frame = (now) => {
      const t = (now - T0) / 1000;
      g.clearRect(0, 0, W, H);
      for (const b of blocks) {
        const u = t - b.t0;
        if (u >= 0.6) continue;
        if (u < 0) { g.fillStyle = "#070d1c"; g.fillRect(b.x, b.y, S, S); g.strokeStyle = "rgba(94,225,255,0.05)"; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, S - 1, S - 1); continue; }
        if (u < 0.3) {
          g.fillStyle = "#070d1c"; g.fillRect(b.x, b.y, S, S);
          const k = Math.min(1, u / 0.12);
          if (u > 0.14) { const f = 1 - Math.abs((u - 0.22) / 0.08); g.fillStyle = `rgba(223,252,255,${Math.max(0, f) * 0.85})`; g.fillRect(b.x + 1, b.y + 1, S - 2, S - 2); }
          g.strokeStyle = `rgba(94,225,255,${0.25 + 0.75 * k})`; g.lineWidth = 1.5; g.strokeRect(b.x + 1, b.y + 1, S - 2, S - 2);
          continue;
        }
        // disparition du bas vers le haut
        const k = (u - 0.3) / 0.3, h = S * (1 - k);
        g.fillStyle = `rgba(7,13,28,${0.9 - 0.4 * k})`; g.fillRect(b.x, b.y, S, h);
        g.fillStyle = `rgba(94,225,255,${0.8 * (1 - k)})`; g.fillRect(b.x, b.y + h - 1.5, S, 1.5);
      }
      if (t < END) raf = requestAnimationFrame(frame); else g.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); g.clearRect(0, 0, W, H); };
  }, [k]);
  return <canvas ref={ref} className="matfx" aria-hidden="true" />;
}
