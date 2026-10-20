// Outils communs des mini-jeux en 3D : chargement de three.js à la demande, scène, haricots à la Fall Guys, commandes tactiles.
import { useEffect, useRef, useState } from "react";
import { CO_BY, cleanLook } from "../../data/profile.js";

let threeP = null;
/** three.js n'est téléchargé (et analysé) qu'à la première partie 3D. */
export const loadThree = () => (threeP ||= import("three"));

/** Couleur du haricot d'un joueur : la couleur de son avatar (la première teinte si c'est un dégradé). */
export function beanColor(look) {
  const co = CO_BY[cleanLook(look).c];
  const m = co && /#[0-9a-f]{6}/i.exec(co.bg);
  return m ? m[0] : "#8b5cf6";
}
export const BOT_COLORS = ["#ff6b5e", "#2dd4a7", "#fbbf24", "#38bdf8", "#f472b6", "#a3e635"];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const wrapPi = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

/**
 * Zone 3D plein cadre. `setup({THREE, scene, camera, renderer, el, size})` construit la scène et renvoie `{update(dt, t), resize?(size), dispose?()}`.
 * `data-ready="1"` apparaît quand la première image est dessinée (les tests s'en servent).
 */
/** À brancher sur `<Stage3D onReady>` et sur le 3e argument de `useClock` : le chrono démarre quand la 3D s'affiche. */
export function useReady() {
  const [ready, setReady] = useState(false);
  return { ready, onReady: () => setReady(true) };
}
export function Stage3D({ setup, label, onFail, onReady }) {
  const box = useRef(null), setupRef = useRef(setup), failRef = useRef(onFail), readyRef = useRef(onReady);
  setupRef.current = setup; failRef.current = onFail; readyRef.current = onReady;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let dead = false, raf = 0, ctl = null, ro = null, renderer = null, scene = null;
    const fail = () => { if (!dead) { setFailed(true); failRef.current && failRef.current(); } };
    (async () => {
      let THREE;
      try { THREE = await loadThree(); } catch { return fail(); }
      if (dead) return;
      const el = box.current;
      if (!el) return;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); } catch { return fail(); }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
      el.insertBefore(renderer.domElement, el.firstChild);
      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 220);
      const size = { w: 1, h: 1 };
      const resize = () => {
        const r = el.getBoundingClientRect();
        size.w = Math.max(2, Math.round(r.width)); size.h = Math.max(2, Math.round(r.height));
        renderer.setSize(size.w, size.h, false);
        camera.aspect = size.w / size.h; camera.updateProjectionMatrix();
        ctl && ctl.resize && ctl.resize(size);
      };
      resize();
      try { ctl = setupRef.current({ THREE, scene, camera, renderer, el, size }); } catch (e) { console.error(e); return fail(); }
      resize();
      ro = new ResizeObserver(resize); ro.observe(el);
      let last = performance.now();
      const t0 = last;
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        ctl && ctl.update && ctl.update(dt, (now - t0) / 1000);
        renderer.render(scene, camera);
        if (!el.dataset.ready) { el.dataset.ready = "1"; readyRef.current && readyRef.current(); }
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      dead = true; cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      try { ctl && ctl.dispose && ctl.dispose(); } catch { /* déjà détruit */ }
      if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose && x.dispose()); });
      if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* sans objet */ } renderer.domElement.remove(); }
    };
  }, []);
  return (
    <div ref={box} className="mg3d" role="img" aria-label={label} data-testid="mg-3d">
      {failed && <div className="mg3dfail">La 3D n'est pas disponible sur cet appareil.<br />Score : 0</div>}
    </div>
  );
}

/** Ciel, brouillard et lumières « bonbon ». */
export function candyWorld(THREE, scene, { sky = 0x9fdcff, fog = [30, 90] } = {}) {
  scene.background = new THREE.Color(sky);
  if (fog) scene.fog = new THREE.Fog(sky, fog[0], fog[1]);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b9e6, 2.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  return sun;
}
const matCache = new WeakMap();
/** Matériau plastique brillant (mis en cache par scène/couleur). */
export function plastic(THREE, color, o = {}) {
  let m = matCache.get(THREE);
  if (!m) matCache.set(THREE, (m = new Map()));
  const key = color + (o.rough ?? "") + (o.emissive ?? "");
  if (!m.has(key)) m.set(key, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.5, metalness: 0.02, emissive: o.emissive ?? 0x000000 }));
  return m.get(key);
}
const inkMat = new WeakMap();
const outlineOf = (THREE) => { if (!inkMat.has(THREE)) inkMat.set(THREE, new THREE.MeshBasicMaterial({ color: 0x1d2457, side: THREE.BackSide })); return inkMat.get(THREE); };
/** Ajoute le contour noir épais (coque inversée) à un maillage, comme les dessins animés. */
export function withOutline(THREE, mesh, k = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, outlineOf(THREE));
  o.scale.setScalar(k);
  mesh.add(o);
  return mesh;
}
/** Boîte colorée avec contour. */
export function box(THREE, w, h, d, color, outline = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plastic(THREE, color));
  if (outline) withOutline(THREE, m, 1.04);
  return m;
}

/**
 * Haricot à la Fall Guys (corps capsule, yeux, bras et jambes qui bougent), orienté vers +Z.
 * `bean.anim({ run, air, stun, fall, cheer, t })` règle la pose ; `bean.group` se place dans la scène.
 */
export function makeBean(THREE, color = "#8b5cf6") {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const skin = plastic(THREE, color, { rough: 0.38 });
  const torso = withOutline(THREE, new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.5, 6, 16), skin));
  torso.position.y = 0.8;
  body.add(torso);
  const white = plastic(THREE, 0xffffff, { rough: 0.3 }), black = new THREE.MeshBasicMaterial({ color: 0x14183a });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), white);
    eye.position.set(s * 0.16, 0.2, 0.34); eye.scale.set(1, 1.15, 0.7);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), black);
    pup.position.set(0, -0.01, 0.1);
    eye.add(pup); torso.add(eye);
  }
  const limb = (r, len, x, y, rot) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = withOutline(THREE, new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), skin), 1.12);
    m.position.y = -len / 2 - r * 0.5;
    pivot.add(m); pivot.rotation.z = rot;
    body.add(pivot);
    return pivot;
  };
  const legs = [limb(0.13, 0.12, -0.18, 0.42, 0), limb(0.13, 0.12, 0.18, 0.42, 0)];
  const arms = [limb(0.09, 0.2, -0.46, 1.0, 0.25), limb(0.09, 0.2, 0.46, 1.0, -0.25)];
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03;
  group.add(shadow);
  const bean = {
    group, body, torso, legs, arms, shadow, color,
    /** Pose : run 0..1 (vitesse de course), air (saut), stun (étourdi), fall (en chute), cheer (victoire), t (temps en secondes). */
    anim({ run = 0, air = false, stun = false, fall = false, cheer = false, t = 0 } = {}) {
      const sw = Math.sin(t * 13) * 0.95 * run;
      if (air) { legs[0].rotation.x = -0.9; legs[1].rotation.x = 0.5; arms[0].rotation.z = 2.6; arms[1].rotation.z = -2.6; arms[0].rotation.x = arms[1].rotation.x = 0; body.rotation.x = 0.1; body.position.y = 0; }
      else if (cheer) { arms[0].rotation.z = 2.7 + Math.sin(t * 14) * 0.3; arms[1].rotation.z = -2.7 - Math.sin(t * 14 + 1) * 0.3; arms[0].rotation.x = arms[1].rotation.x = 0; legs[0].rotation.x = legs[1].rotation.x = 0; body.position.y = Math.abs(Math.sin(t * 7)) * 0.25; body.rotation.x = 0; }
      else if (stun) { body.rotation.z = Math.sin(t * 30) * 0.14; legs[0].rotation.x = legs[1].rotation.x = 0; arms[0].rotation.z = 1.3; arms[1].rotation.z = -1.3; arms[0].rotation.x = arms[1].rotation.x = 0; body.position.y = 0; }
      else if (fall) { arms[0].rotation.z = 2.4 + Math.sin(t * 20) * 0.4; arms[1].rotation.z = -2.4 - Math.sin(t * 20) * 0.4; legs[0].rotation.x = Math.sin(t * 18) * 0.7; legs[1].rotation.x = -Math.sin(t * 18) * 0.7; }
      else {
        legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
        arms[0].rotation.x = -sw * 0.9; arms[1].rotation.x = sw * 0.9;
        arms[0].rotation.z = 0.25 + run * 0.35; arms[1].rotation.z = -0.25 - run * 0.35;
        body.position.y = Math.abs(Math.sin(t * 13)) * 0.1 * run + Math.sin(t * 2.4) * 0.012;
        body.rotation.x = run * 0.18; body.rotation.z = 0;
      }
    },
    /** Écrase / étire le haricot (rebond au saut, à l'atterrissage). */
    squash(k) { body.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5); },
  };
  return bean;
}

/** Gros chiffres flottants (score, « +10 »…) : sprite de texte. */
export function textSprite(THREE, text, { color = "#ffffff", size = 64, w = 256, h = 128 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.font = `900 ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = size / 6; g.strokeStyle = "#1d2457"; g.strokeText(text, w / 2, h / 2);
  g.fillStyle = color; g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(w / h * 1.3, 1.3, 1);
  return sp;
}

/* ------------------------------ commandes ------------------------------ */
const KEYMAP = { ArrowLeft: "left", a: "left", q: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", z: "up", ArrowDown: "down", s: "down", " ": "act", Enter: "act" };
/** Clavier (tests et ordinateurs) : met à jour `keys.left/right/up/down/act`. Renvoie la fonction de nettoyage. */
export function bindKeys(keys) {
  const f = (v) => (e) => { const k = KEYMAP[e.key]; if (k) { keys[k] = v; if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault(); } };
  const d = f(true), u = f(false);
  window.addEventListener("keydown", d); window.addEventListener("keyup", u);
  return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
}
/** Joystick flottant : appuie n'importe où dans la zone, glisse. `vec.x`, `vec.y` ∈ [-1, 1] (y > 0 = vers le bas de l'écran). */
export function bindStick(el, vec, { onTap } = {}) {
  vec.x = 0; vec.y = 0;
  const base = document.createElement("div");
  base.className = "mgstick";
  const knob = document.createElement("i");
  base.appendChild(knob); el.appendChild(base);
  let id = null, ox = 0, oy = 0, t0 = 0, moved = 0;
  const R = 44;
  const down = (e) => {
    if (id != null) return;
    id = e.pointerId; ox = e.clientX; oy = e.clientY; t0 = performance.now(); moved = 0;
    const r = el.getBoundingClientRect();
    base.style.display = "block"; base.style.left = ox - r.left + "px"; base.style.top = oy - r.top + "px"; knob.style.transform = "translate(0,0)";
    try { el.setPointerCapture(id); } catch { /* ignoré */ }
    e.preventDefault();
  };
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    moved = Math.max(moved, d);
    dx *= k; dy *= k;
    vec.x = dx / R; vec.y = dy / R;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null; vec.x = 0; vec.y = 0; base.style.display = "none";
    if (onTap && moved < 10 && performance.now() - t0 < 350) onTap(e);
  };
  el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); base.remove(); };
}
/** Bouton tactile : `on(true)` à l'appui, `on(false)` au relâchement. */
export function HoldBtn({ children, on, label, testid, className = "" }) {
  return (
    <button className={"mgholdbtn " + className} aria-label={label} data-testid={testid}
      onPointerDown={(e) => { e.preventDefault(); on(true); }} onPointerUp={() => on(false)} onPointerLeave={() => on(false)} onPointerCancel={() => on(false)}>
      {children}
    </button>
  );
}

/** Mélange toujours le même hasard pour tous les joueurs : petit générateur à graine (copie de rng pour éviter l'import circulaire). */
export { rng, ri, rpick, useFinish, useScore, useClock, TimeBar, vib } from "../kit.jsx";
