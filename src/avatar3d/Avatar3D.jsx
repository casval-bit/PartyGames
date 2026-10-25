// Composants React de l'avatar 3D : miniature (image mise en cache) et vue vivante (tourne au doigt, change de cadrage).
import { useEffect, useRef, useState } from "react";
import "./avatar3d.css";
import { loadKit, lightRig, frameOf, avatarImage, cachedImage } from "./render.js";
import { cleanX } from "./schema.js";

/** Image de l'avatar `x` (null le temps du calcul, ou si la 3D est indisponible → l'appelant affiche l'icône 2D). */
export function useAvatarImg(x, view = "bust", size = 192, yaw = 0) {
  const key = cleanX(x) + "|" + view + "|" + size + "|" + yaw;
  const [img, setImg] = useState(() => cachedImage(x, view, size, yaw));
  useEffect(() => {
    let dead = false;
    const c = cachedImage(x, view, size, yaw);
    if (c) { setImg(c); return; }
    setImg(null);
    avatarImage(x, view, size, yaw).then((u) => { if (!dead) setImg(u); });
    return () => { dead = true; };
  }, [key]);
  return img;
}

/** Miniature 3D d'un avatar. `fallback` s'affiche pendant le calcul. */
export function Avatar3DImg({ x, view = "bust", size = 192, yaw = 0, className = "", fallback = null, alt = "" }) {
  const img = useAvatarImg(x, view, size, yaw);
  if (!img) return fallback;
  return <img className={"av3img " + className} src={img} alt={alt} draggable={false} width={size} height={size} />;
}

/**
 * Vue 3D vivante. `focus` : "body" | "bust" | "head" (cadrage, transition douce) · `pose` force une pose · `turn` : rotation automatique.
 * Glisser pour faire tourner le personnage.
 */
export function AvatarLive({ x, focus = "body", pose, turn = false, className = "", onReady }) {
  const box = useRef(null), st = useRef({}), [failed, setFailed] = useState(false);
  const xc = cleanX(x);
  st.current.want = { x: xc, focus, pose, turn };
  useEffect(() => {
    let dead = false, raf = 0, renderer = null, ro = null;
    const S = st.current;
    (async () => {
      let M;
      try { M = await loadKit(); } catch { return setFailed(true); }
      if (dead || !box.current) return;
      const { THREE } = M, el = box.current;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return setFailed(true); }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab";
      el.insertBefore(renderer.domElement, el.firstChild);
      const scene = new THREE.Scene(); lightRig(THREE, scene, renderer, M);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
      // sol : disque sombre sous les pieds
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; scene.add(disc);
      const holder = new THREE.Group(); scene.add(holder);
      let fig = null, shownX = "", yaw = 0.35, vyaw = 0, drag = null;
      const cur = { y: 1, d: 6 };
      const resize = () => { const r = el.getBoundingClientRect(), w = Math.max(2, r.width | 0), h = Math.max(2, r.height | 0); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
      resize(); ro = new ResizeObserver(resize); ro.observe(el);
      const down = (e) => { drag = { x: e.clientX, yaw }; vyaw = 0; renderer.domElement.setPointerCapture?.(e.pointerId); renderer.domElement.style.cursor = "grabbing"; };
      const move = (e) => { if (drag) { const nyaw = drag.yaw + (e.clientX - drag.x) * 0.012; vyaw = nyaw - yaw; yaw = nyaw; } };
      const up = () => { drag = null; renderer.domElement.style.cursor = "grab"; };
      const cv = renderer.domElement;
      cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      let last = performance.now(), t = 0, readied = false;
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        const w = S.want;
        if (w.x !== shownX) {
          if (fig) { holder.remove(fig.group); fig.dispose(); }
          try { fig = M.makeFigure(M, w.x, { shadow: false }); holder.add(fig.group); shownX = w.x; el.dataset.x = w.x; } catch (e) { console.error(e); setFailed(true); return; }
        }
        if (!fig) return;
        const f = frameOf(fig, w.focus === "face" ? "head" : w.focus === "body" ? "full" : w.focus);   // body | face | bust | feet
        const k = 1 - Math.pow(0.0015, dt);
        cur.y += (f.y - cur.y) * k; cur.d += (f.d - cur.d) * k;
        if (!drag) { yaw += vyaw; vyaw *= 0.9; if (w.turn) yaw += dt * 0.7; }
        holder.rotation.y = yaw;
        fig.anim({ t, pose: w.pose });
        const aspect = camera.aspect, d = aspect < 0.8 ? cur.d / Math.max(0.55, aspect * 1.25) : cur.d;
        camera.fov = f.fov; camera.updateProjectionMatrix();
        camera.position.set(0, cur.y + d * 0.04, d); camera.lookAt(0, cur.y, 0);
        disc.visible = w.focus === "body" || w.focus === "feet";
        renderer.render(scene, camera);
        if (!readied) { readied = true; el.dataset.ready = "1"; onReady && onReady(); }
      };
      raf = requestAnimationFrame(loop);
      S.cleanup = () => { cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); if (fig) fig.dispose(); };
    })();
    return () => {
      dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      try { st.current.cleanup && st.current.cleanup(); } catch { /* déjà nettoyé */ }
      if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* sans objet */ } renderer.domElement.remove(); }
    };
  }, []);
  return <div ref={box} className={"av3live " + className} data-testid="av3-live" role="img" aria-label="Aperçu 3D du personnage">{failed && <div className="av3fail">La 3D n'est pas disponible sur cet appareil.</div>}</div>;
}
