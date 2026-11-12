import { useEffect, useRef } from "react";
import { loadKit, lightRig, frameOf } from "../avatar3d/render.js";
import { randomX, DEFAULT_X, cleanX, setSlot, SLOT_BY } from "../avatar3d/schema.js";

/**
 * Banc d'essai du personnage (adresse « ?avlab ») : une rangée de personnages rendus côte à côte.
 * Paramètres : &n=8 (nombre au hasard) &seed=1 &view=full|bust|head|face|torso|legs|feet &yaw=0.4 &pose=run|air|cheer|stun|sit|…
 * &slot=hair (toutes les options d'un emplacement sur le même personnage) &x=H… (liste séparée par des virgules) &emote=wave&et=1.2 &t=0.3 &all=1 (toutes les pièces)
 */
export default function AvatarLab() {
  const ref = useRef(null);
  useEffect(() => {
    let dead = false;
    const q = new URLSearchParams(location.search);
    const n = Number(q.get("n") || 8), seed = Number(q.get("seed") || 1), view = q.get("view") || "full", yaw = Number(q.get("yaw") || 0.35);
    const pose = q.get("pose") || "", t = Number(q.get("t") || 0.3), emote = q.get("emote") || "", et = Number(q.get("et") || 1);
    const cols = Number(q.get("cols") || 4), cell = Number(q.get("cell") || 300);
    (async () => {
      const M = await loadKit(); if (dead) return;
      const { THREE } = M;
      let s = seed * 9973 + 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      let xs = [];
      if (q.get("x")) xs = q.get("x").split(",").map(cleanX);
      else if (q.get("slot")) { const sl = SLOT_BY[q.get("slot")], base = q.get("base") ? cleanX(q.get("base")) : DEFAULT_X; xs = sl.opts.map((_, i) => setSlot(base, sl.id, i)); }
      else { xs = [DEFAULT_X]; for (let i = 1; i < n; i++) xs.push(randomX(rnd, q.get("all") ? () => true : (r) => !r)); }
      const el = ref.current, rows = Math.ceil(xs.length / cols);
      const W = cols * cell, H = rows * Math.round(cell * (view === "full" ? 1.45 : 1));
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(0x0b1426, 1); renderer.setScissorTest(true);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene(); lightRig(THREE, scene, renderer, M);
      // réglages d'essai : &lk=0.8 (lumières ×0,8) &env=0 (sans reflets d'ambiance) &tm=1 (tone mapping ACES)
      if (q.get("lk")) scene.traverse((o) => { if (o.isLight && !o.isHemisphereLight) o.intensity *= Number(q.get("lk")); });
      if (q.get("hk")) scene.traverse((o) => { if (o.isHemisphereLight) o.intensity *= Number(q.get("hk")); });
      if (q.get("ei")) scene.environmentIntensity = Number(q.get("ei"));
      if (q.get("env") === "0") scene.environment = null;
      if (q.get("tm")) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = Number(q.get("tm")); }
      const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
      const ch = Math.round(cell * (view === "full" ? 1.45 : 1));
      xs.forEach((x, i) => {
        const f = M.makeFigure(M, x, { shadow: true });
        const o = { t };
        if (pose === "run") o.run = 1; else if (pose) o[pose] = true;
        if (emote) { o.emote = emote; o.emoteT = et; }
        f.anim(o);
        f.group.rotation.y = yaw;
        scene.add(f.group);
        const fr = frameOf(f, view);
        const cx = (i % cols) * cell, cy = H - (Math.floor(i / cols) + 1) * ch;
        renderer.setViewport(cx, cy, cell, ch); renderer.setScissor(cx, cy, cell, ch);
        cam.aspect = cell / ch; cam.fov = fr.fov;
        const d = cam.aspect < 1 ? fr.d / Math.max(0.6, cam.aspect) : fr.d;
        cam.updateProjectionMatrix(); cam.position.set(0, fr.y + d * 0.02, d); cam.lookAt(0, fr.y, 0);
        renderer.render(scene, cam);
        scene.remove(f.group); f.dispose();
      });
      el.dataset.ready = "1";
      window.__xs = xs;
    })().catch((e) => { console.error(e); if (ref.current) { ref.current.dataset.error = String(e && e.stack || e); ref.current.dataset.ready = "1"; } });
    return () => { dead = true; };
  }, []);
  return <div ref={ref} data-testid="avlab" style={{ background: "#0b1426", minHeight: "100vh" }} />;
}
