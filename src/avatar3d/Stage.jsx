// Scène « scanner » du personnage : plateforme holographique (anneaux cyan, quadrillage, colonne de lumière, particules),
// le personnage en grand (on le fait tourner au doigt), cadrage par zone (tête, visage, torse, jambes, pieds) avec anneau de scan,
// points chauds projetés à l'écran, émotes, et re-matérialisation du bas vers le haut quand l'apparence change.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { loadKit, lightRig } from "./render.js";
import { cleanX } from "./schema.js";
import { EMOTE_BY } from "./emotes.js";

/** Cadrages par défaut (avant que le personnage soit prêt) ; ensuite chaque Doudou fournit les siens (fig.focus). */
export const FOCUS = {
  full: { y: 0.75, span: 1.9 },
  tete: { y: 1.15, span: 0.8 },
  visage: { y: 0.85, span: 0.95 },
  corps: { y: 0.55, span: 1.45 },
  dos: { y: 0.6, span: 1.5 },
  pieds: { y: 0.1, span: 0.95 },
};
/** Hauteurs balayées par l'anneau de scan pour chaque zone (fractions de la hauteur du personnage). */
const ZONE_Y = { tete: [0.62, 1.02], visage: [0.45, 0.82], corps: [0.08, 0.66], dos: [0.2, 0.8], pieds: [-0.02, 0.16], full: [-0.02, 1.04] };

function platform(THREE, scene) {
  const g = new THREE.Group(); scene.add(g);
  // disque quadrillé
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const x = cv.getContext("2d");
  const gr = x.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, "rgba(47,139,255,0.55)"); gr.addColorStop(0.7, "rgba(20,50,110,0.35)"); gr.addColorStop(1, "rgba(7,13,28,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = "rgba(94,225,255,0.22)"; x.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
  x.globalCompositeOperation = "destination-in"; const m = x.createRadialGradient(256, 256, 120, 256, 256, 256); m.addColorStop(0, "#000"); m.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = m; x.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; g.add(disc);
  const add = (inner, outer, op) => { const r = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96), new THREE.MeshBasicMaterial({ color: 0x5ee1ff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.006; g.add(r); return r; };
  const rings = [add(0.6, 0.615, 0.9), add(0.68, 0.685, 0.45), add(0.95, 0.958, 0.3)];
  // colonne de lumière
  const cc = document.createElement("canvas"); cc.width = 4; cc.height = 128; const y = cc.getContext("2d");
  const lg = y.createLinearGradient(0, 0, 0, 128); lg.addColorStop(0, "rgba(94,225,255,0)"); lg.addColorStop(0.75, "rgba(94,225,255,0.08)"); lg.addColorStop(1, "rgba(94,225,255,0.32)");
  y.fillStyle = lg; y.fillRect(0, 0, 4, 128);
  const ct = new THREE.CanvasTexture(cc);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.62, 2.3, 48, 1, true), new THREE.MeshBasicMaterial({ map: ct, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.15; g.add(beam);
  // particules qui montent
  const N = 70, pos = new Float32Array(N * 3), seed = [];
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 0.4; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 2.2; pos[i * 3 + 2] = Math.sin(a) * r; seed.push(0.15 + Math.random() * 0.35); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xbff3ff, size: 0.018, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  // anneau de scan (balaie de bas en haut)
  const scan = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.006, 6, 80), new THREE.MeshBasicMaterial({ color: 0xdffcff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scan.rotation.x = Math.PI / 2; g.add(scan);
  const scanGlow = new THREE.Mesh(new THREE.CircleGeometry(0.44, 48), new THREE.MeshBasicMaterial({ color: 0x5ee1ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  scanGlow.rotation.x = -Math.PI / 2; g.add(scanGlow);
  return {
    group: g, scan, scanGlow,
    update(dt, t) {
      rings[0].material.opacity = 0.7 + 0.25 * Math.sin(t * 2.4);
      rings[1].rotation.z = t * 0.3;
      beam.material.opacity = 0.75 + 0.2 * Math.sin(t * 1.3);
      const P = pg.attributes.position;
      for (let i = 0; i < N; i++) { let yy = P.getY(i) + dt * seed[i]; if (yy > 2.2) yy = 0; P.setY(i, yy); }
      P.needsUpdate = true;
    },
  };
}

/**
 * Personnage sur la plateforme du scanner.
 * props : x (apparence), zone (cadrage), sheet (0..1 : part de l'écran couverte en bas par la fenêtre), onHotspots(list), onReady
 * ref : { emote(id), scan(zone) }
 */
const AvatarStage = forwardRef(function AvatarStage({ x, zone = "full", sheet = 0, top = 0, bottom = 0, onHotspots, onReady, className = "" }, ref) {
  const box = useRef(null), st = useRef({ want: {} }), [failed, setFailed] = useState(false);
  st.current.want = { x: cleanX(x), zone, sheet, top, bottom, onHotspots };
  useImperativeHandle(ref, () => ({
    emote(id) { const S = st.current; if (EMOTE_BY[id]) { S.emote = id; S.emoteT = 0; } },
    scan(z) { const S = st.current; const r = ZONE_Y[z] || ZONE_Y.full, h = S.figH || 1.5; S.scanFx = { y0: r[0] * h, y1: r[1] * h, t: 0, d: 0.75 }; },
  }), []);
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
      renderer.localClippingEnabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab";
      el.insertBefore(renderer.domElement, el.firstChild);
      const scene = new THREE.Scene(); lightRig(THREE, scene, renderer, M, { rim: 0x5ee1ff, rimK: 2.2 });
      const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
      const plat = platform(THREE, scene);
      const holder = new THREE.Group(); scene.add(holder);
      let fig = null, shownX = "", yaw = 0.35, vyaw = 0, drag = null, old = null, mat = null;
      const cur = { y: FOCUS.full.y, span: FOCUS.full.span, a: 0, b: 0 };
      const size = { w: 2, h: 2 };
      const resize = () => { const r = el.getBoundingClientRect(); size.w = Math.max(2, r.width | 0); size.h = Math.max(2, r.height | 0); renderer.setSize(size.w, size.h, false); camera.aspect = size.w / size.h; camera.updateProjectionMatrix(); };
      resize(); ro = new ResizeObserver(resize); ro.observe(el);
      const cv = renderer.domElement;
      const down = (e) => { drag = { x: e.clientX, yaw }; vyaw = 0; cv.setPointerCapture?.(e.pointerId); cv.style.cursor = "grabbing"; };
      const move = (e) => { if (drag) { const n = drag.yaw + (e.clientX - drag.x) * 0.012; vyaw = n - yaw; yaw = n; } };
      const up = () => { drag = null; cv.style.cursor = "grab"; };
      cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      /** Re-matérialisation : le nouveau personnage apparaît sous un plan qui monte, l'ancien disparaît au-dessus. */
      const clipAll = (f, plane) => {
        const keep = [];
        f.group.traverse((m) => { if (!m.isMesh && !m.isSkinnedMesh) return; const mm = Array.isArray(m.material) ? m.material : [m.material]; const cl = mm.map((q) => { const c = q.clone(); c.clippingPlanes = [plane]; return c; }); keep.push([m, m.material]); m.material = Array.isArray(m.material) ? cl : cl[0]; });
        return () => { for (const [m, orig] of keep) { const cur2 = Array.isArray(m.material) ? m.material : [m.material]; cur2.forEach((c) => c.dispose()); m.material = orig; } };
      };
      let last = performance.now(), t = 0, readied = false;
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        const w = S.want;
        if (w.x !== shownX) {
          let nf = null;
          try { nf = M.makeFigure(M, w.x, { shadow: false }); } catch (e) { console.error(e); setFailed(true); return; }
          holder.add(nf.group);
          if (fig && !mat) {
            // effet : plan qui monte de 0 à 1,9
            const up1 = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), up2 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            mat = { t: 0, d: 1.1, oldFig: fig, restNew: clipAll(nf, up1), restOld: clipAll(fig, up2), p1: up1, p2: up2 };
            S.scanFx = { y0: -0.02, y1: (nf.height || 1.5) + 0.05, t: 0, d: 1.1, strong: true };
          } else if (fig) { holder.remove(fig.group); fig.dispose(); }
          fig = nf; shownX = w.x; el.dataset.x = w.x; S.figH = nf.height || 1.5;
        }
        if (!fig) return;
        // effet de matérialisation en cours
        if (mat) {
          mat.t += dt; const k = Math.min(1, mat.t / mat.d), h = -0.05 + k * ((fig.height || 1.5) + 0.12);
          mat.p1.constant = h; mat.p2.constant = -h;
          mat.oldFig.anim({ t, emote: S.emote, emoteT: S.emoteT });
          if (k >= 1) { mat.restNew(); mat.restOld(); holder.remove(mat.oldFig.group); mat.oldFig.dispose(); mat = null; }
        }
        // cadrage
        const f = (fig.focus && fig.focus[w.zone || "full"]) || FOCUS[w.zone] || FOCUS.full, kk = 1 - Math.pow(0.002, dt);
        const tb = Math.max(w.bottom || 0, (w.sheet || 0) * size.h), ta = w.top || 0;
        cur.y += (f.y - cur.y) * kk; cur.span += (f.span - cur.span) * kk; cur.a += (ta - cur.a) * kk; cur.b += (tb - cur.b) * kk;
        if (!drag) { yaw += vyaw; vyaw *= 0.9; }
        holder.rotation.y = yaw;
        if (S.emote) { S.emoteT += dt; if (S.emoteT > (EMOTE_BY[S.emote]?.dur || 2)) S.emote = null; }
        fig.anim({ t, emote: S.emote, emoteT: S.emoteT });
        plat.update(dt, t);
        // anneau de scan
        if (S.scanFx) {
          const s = S.scanFx; s.t += dt; const k = Math.min(1, s.t / s.d), yy = s.y0 + (s.y1 - s.y0) * k;
          plat.scan.position.y = yy; plat.scanGlow.position.y = yy;
          const op = Math.sin(Math.PI * k);
          plat.scan.material.opacity = op; plat.scanGlow.material.opacity = op * (s.strong ? 0.35 : 0.18);
          if (k >= 1) { S.scanFx = null; plat.scan.material.opacity = 0; plat.scanGlow.material.opacity = 0; }
        }
        // caméra : la zone est montrée dans la partie de l'écran que la fenêtre ne couvre pas
        // caméra : la zone tient dans la bande d'écran libre (entre la barre du haut et la fenêtre / la barre du bas)
        const fov = 26, aspect = camera.aspect, tv = Math.tan((fov * Math.PI) / 360);
        const band = Math.max(0.3, (size.h - cur.a - cur.b) / size.h);
        const width = cur.span * (w.zone === "full" || !w.zone ? 1.3 : 1.15);       // un Doudou est presque aussi large que haut : on garde de la marge
        const d = Math.max(cur.span / 2 / tv / band, width / 2 / (tv * aspect));
        camera.fov = fov;
        camera.position.set(0, cur.y + d * 0.03, d); camera.lookAt(0, cur.y, 0);
        camera.setViewOffset(size.w, size.h, 0, (cur.b - cur.a) / 2, size.w, size.h);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        // points chauds
        if (w.onHotspots && fig.anchors) {
          const list = [], p = new THREE.Vector3();
          for (const [id, a] of Object.entries(fig.anchors)) {
            a.getWorldPosition(p); p.project(camera);
            list.push({ id, x: (p.x * 0.5 + 0.5) * size.w, y: (-p.y * 0.5 + 0.5) * size.h, ok: p.z < 1 });
          }
          w.onHotspots(list);
        }
        if (!readied) { readied = true; el.dataset.ready = "1"; onReady && onReady(); }
      };
      raf = requestAnimationFrame(loop);
      S.cleanup = () => { cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); if (fig) fig.dispose(); if (mat) mat.oldFig.dispose(); scene.traverse((o) => { if (o.geometry && o !== fig) o.geometry.dispose(); }); };
    })();
    return () => {
      dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      try { st.current.cleanup && st.current.cleanup(); } catch { /* déjà nettoyé */ }
      if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* sans objet */ } renderer.domElement.remove(); }
    };
  }, []);
  return <div ref={box} className={"avstage " + className} data-testid="av-stage" role="img" aria-label="Ton personnage en 3D">{failed && <div className="av3fail">La 3D n'est pas disponible sur cet appareil.</div>}</div>;
});
export default AvatarStage;
