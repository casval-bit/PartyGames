// Décor 3D de l'écran titre et de l'accueil (three.js, chargé à part) : la salle et sa table ronde (tableWorld.js), et la caméra
// avec ses deux places :
//   - « title » : au-dessus de la table, qui tourne lentement (l'écran titre se pose par-dessus, assombri) ;
//   - « menu » : assise à la place du joueur, devant son plateau. À l'accueil, le vrai plateau (HubBoard, en CSS 3D) envoie sa
//     position à l'écran (événement « tcg-board ») et la caméra se cale pour que la table soit juste dessous.
// Le passage de « title » à « menu » est l'animation d'entrée dans le jeu (la caméra descend s'asseoir). Rien ne bouge si les
// animations sont réduites. Le rendu s'arrête quand le décor est caché (autre écran) ou que la fenêtre est en arrière-plan.
// Chargement : la salle se construit, ses shaders se compilent (compileAsync), puis la première image est dessinée hors de vue ;
// alors seulement la toile apparaît en fondu et onReady(true) prévient l'écran titre (onReady(false) si la 3D est impossible).
// Changer de deck ne reconstruit que la salle (pas le rendu WebGL) : pas d'écran noir quand la collection se synchronise.
import { useEffect, useRef } from "react";
import { DESKTOP } from "../../../lib/device.js";
import { onArtChange } from "../artStore.js";
import { buildTable, FRONT, TOP, TABLE_R } from "./tableWorld.js";
import "./table3d.css";

const TWEEN = 1.9; // secondes : la caméra qui descend s'asseoir
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const DEG = Math.PI / 180;
const keyOf = (d) => (d ? `${d.fam}|${Object.keys(d.cards || {}).slice(0, 12).join(",")}` : "");

export default function TableScene({ mode = "menu", active = true, deck = null, calm = false, onReady }) {
  const box = useRef(null);
  const st = useRef({ mode, active, calm, ready: onReady });
  st.current.mode = mode; st.current.active = active; st.current.calm = calm; st.current.ready = onReady;
  const api = useRef(null);
  const deckKey = keyOf(deck);

  useEffect(() => {
    let dead = false, raf = 0, ro = null, renderer = null, world = null, scene = null, offArt = null;
    const el = box.current;
    const fail = () => { if (!dead && st.current.ready) st.current.ready(false); };
    (async () => {
      let THREE, RB = null, ENV = null;
      try {
        THREE = await import("three");
        try { RB = (await import("three/examples/jsm/geometries/RoundedBoxGeometry.js")).RoundedBoxGeometry; } catch { RB = null; }
        try { ENV = (await import("three/examples/jsm/environments/RoomEnvironment.js")).RoomEnvironment; } catch { ENV = null; }
      } catch { fail(); return; }
      if (dead || !el) return;
      const dpr = window.devicePixelRatio || 1;
      const hi = DESKTOP || (window.innerWidth >= 900 && Math.min(window.innerWidth, window.innerHeight) >= 600);
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); } catch { fail(); return; }
      renderer.setPixelRatio(Math.min(dpr, hi ? 1.75 : 1.35));
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      if (hi) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.insertBefore(renderer.domElement, el.firstChild);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0706); // le noir chaud de la salle (comme les menus)
      scene.fog = new THREE.FogExp2(0x0a0706, 0.05);
      // un reflet de salle (faible) pour que l'or, le laiton et le vernis brillent sans tout éclairer
      if (ENV) {
        try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new ENV(), 0.04).texture; scene.environmentIntensity = 0.28; pm.dispose(); } catch { /* sans reflet */ }
      }
      // lumières : une grosse lampe chaude au-dessus de la table, un reflet de cheminée au fond, un peu de bleu de nuit
      scene.add(new THREE.HemisphereLight(0x8fa3d9, 0x2a1408, 0.75));
      const fill = new THREE.DirectionalLight(0x7d95d6, 0.35); fill.position.set(4, 7, 9); scene.add(fill);
      const spot = new THREE.SpotLight(0xffd2a0, 420, 0, 0.62, 0.8, 2);
      spot.position.set(0.3, 9.5, 1.0); spot.target.position.set(0, 0, 0.3);
      if (hi) { spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 4; spot.shadow.camera.far = 16; spot.shadow.bias = -0.0004; spot.shadow.radius = 5; }
      scene.add(spot, spot.target);
      const hearth = new THREE.PointLight(0xff8a3d, 60, 22, 2); hearth.position.set(-6.2, 1.2, -6.5); scene.add(hearth);

      const make = (d) => buildTable(THREE, { deck: d, quality: hi ? "high" : "low", RoundedBoxGeometry: RB });
      world = make(api.current ? api.current.deck : null);
      api.current.built = keyOf(api.current.deck);
      scene.add(world.group);
      offArt = onArtChange(() => world && world.refreshArt());

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 90);
      const size = { w: 1, h: 1 };
      const tgt = new THREE.Vector3(), v = new THREE.Vector3();
      // une place de caméra : autour d'un point visé (cible), angle horizontal (yaw), plongée (pitch), distance, ouverture, décalage de l'image
      const pose = { yaw: 0, pitch: 52 * DEG, dist: 13, tx: 0, ty: 0, tz: 0, fov: 34, ox: 0, oy: 0 };
      const apply = (p) => {
        camera.fov = p.fov;
        camera.position.set(p.tx + Math.sin(p.yaw) * Math.cos(p.pitch) * p.dist, p.ty + Math.sin(p.pitch) * p.dist, p.tz + Math.cos(p.yaw) * Math.cos(p.pitch) * p.dist);
        tgt.set(p.tx, p.ty, p.tz); camera.lookAt(tgt);
        if (p.ox || p.oy) camera.setViewOffset(size.w, size.h, p.ox, p.oy, size.w, size.h); else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
      };
      const project = (x, y, z) => { v.set(x, y, z).project(camera); return [(v.x + 1) / 2 * size.w, (1 - v.y) / 2 * size.h]; };

      // à l'écran titre : toute la table, d'assez haut, un peu plus bas que le milieu (le titre est au-dessus)
      const titlePose = (t) => {
        const portrait = size.h > size.w, fov = portrait ? 46 : 34;
        // assez loin pour voir toute la table en largeur (téléphone en hauteur : bien plus loin)
        const hh = Math.tan((fov * DEG) / 2) * (size.w / size.h);
        const dist = Math.max(13.5, (TABLE_R * 2.35) / (2 * hh));
        return { yaw: calmNow() ? 0.5 : t * 0.045, pitch: (portrait ? 60 : 50) * DEG, dist, tx: 0, ty: -0.4, tz: 0, fov, ox: 0, oy: -size.h * 0.07 };
      };
      // à l'accueil : assis devant son plateau ; calé sur le plateau en CSS s'il a donné sa place, sinon une place par défaut
      let rect = null;
      const menuPose = () => {
        const p = { yaw: 0, pitch: 45 * DEG, dist: 7.4, tx: FRONT.x, ty: TOP, tz: FRONT.z - FRONT.d * 0.04, fov: 30, ox: 0, oy: 0 };
        const portrait = size.h > size.w;
        if (portrait) { p.dist = 11; p.pitch = 47 * DEG; }
        const r = rect && rect.w > 40 && rect.h > 30 ? rect : { x: size.w * 0.2, y: size.h * 0.32, w: size.w * 0.6, h: size.h * 0.5 };
        const zn = FRONT.z + FRONT.d / 2, zf = FRONT.z - FRONT.d / 2, hw = FRONT.w / 2;
        for (let i = 0; i < 5; i++) {
          apply({ ...p, ox: 0, oy: 0 });
          const a = project(-hw, TOP, zn), b = project(hw, TOP, zn);
          const wpx = Math.abs(b[0] - a[0]);
          if (wpx > 1) p.dist = Math.max(3.5, Math.min(40, p.dist * (wpx / r.w)));
        }
        apply({ ...p, ox: 0, oy: 0 });
        const c = [project(-hw, TOP, zn), project(hw, TOP, zn), project(hw, TOP, zf), project(-hw, TOP, zf)];
        const cx = c.reduce((s, q) => s + q[0], 0) / 4, cy = c.reduce((s, q) => s + q[1], 0) / 4;
        p.ox = cx - (r.x + r.w / 2); p.oy = cy - (r.y + r.h / 2);
        return p;
      };
      const calmNow = () => st.current.calm || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

      const resize = () => {
        const r = el.getBoundingClientRect();
        size.w = Math.max(2, Math.round(r.width)); size.h = Math.max(2, Math.round(r.height));
        renderer.setSize(size.w, size.h, false);
        camera.aspect = size.w / size.h;
        dirty = true;
      };
      let dirty = true;
      resize();
      ro = new ResizeObserver(resize); ro.observe(el);
      const onBoard = (e) => { rect = e.detail || null; dirty = true; };
      window.addEventListener("tcg-board", onBoard);

      // l'état de la caméra : sa place actuelle, et le passage en cours d'une place à l'autre
      let shown = st.current.mode, tw = null, t0 = performance.now(), last = t0, frame = 0, front = shown === "menu" ? 0 : 1;
      const cur = { ...(shown === "menu" ? menuPose() : titlePose(0)) };
      world.setFront(front);
      // les shaders compilés d'avance (en parallèle quand le pilote le permet) : pas d'à-coup aux premières images
      apply(cur);
      try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch { /* compilés au premier rendu */ }
      if (dead) return;
      t0 = performance.now(); last = t0;
      let warm = 0; // images dessinées toile encore cachée (textures envoyées, ombres calculées), avant de l'afficher
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const s = st.current;
        if (!s.active || document.hidden) { last = now; return; }
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const t = (now - t0) / 1000;
        if (s.mode !== shown) {
          // changement de place : la caméra glisse (ou saute, si les animations sont réduites)
          const from = { ...cur };
          if (s.mode === "menu") { let y = from.yaw % (Math.PI * 2); if (y > Math.PI) y -= Math.PI * 2; if (y < -Math.PI) y += Math.PI * 2; from.yaw = y; }
          tw = calmNow() || !el.dataset.ready ? null : { from, k: 0 };
          shown = s.mode; dirty = true;
        }
        let target = shown === "menu" ? menuPose() : titlePose(t);
        if (tw) {
          // au temps des images (dt plafonné à 1/20 s) : un à-coup du reste de l'appli (l'accueil qui se monte) met la descente en
          // pause au lieu de la faire sauter ; sur un appareil lent elle dure à peine plus longtemps
          tw.k = Math.min(1, tw.k + dt / TWEEN);
          const e = ease(tw.k);
          for (const key of Object.keys(cur)) cur[key] = lerp(tw.from[key], target[key], e);
          if (tw.k >= 1) tw = null;
          dirty = true;
        } else if (shown === "title") {
          Object.assign(cur, target); dirty = true;
        } else {
          // à l'accueil : la caméra rejoint en douceur sa place (redimensionnement, plateau qui change de taille)
          let moved = false;
          for (const key of Object.keys(cur)) { const d = target[key] - cur[key]; if (Math.abs(d) > 1e-4) { cur[key] += d * Math.min(1, dt * 6); moved = true; } else cur[key] = target[key]; }
          if (moved) dirty = true;
        }
        // le plateau dessiné du premier plan s'efface quand la caméra arrive à sa place (le vrai plateau se pose dessus)
        const wantFront = shown === "menu" ? (tw && tw.k < 0.82 ? 1 : 0) : 1;
        if (wantFront !== front) { front = wantFront; world.setFront(front); dirty = true; }
        // la lampe vacille un peu (bougies) ; à 30 images par seconde quand rien d'autre ne bouge
        if (!calmNow()) { spot.intensity = 420 * (1 + 0.03 * Math.sin(t * 7.3) + 0.018 * Math.sin(t * 13.7 + 1.3)); hearth.intensity = 60 * (1 + 0.12 * Math.sin(t * 5.1) + 0.08 * Math.sin(t * 11.3)); }
        frame++;
        if (!dirty && (calmNow() || frame % 2)) return;
        apply(cur);
        scene.fog.density = 0.05 * Math.min(1, 13.5 / Math.max(1, cur.dist)); // de loin (téléphone), moins de brouillard
        renderer.render(scene, camera);
        dirty = false;
        if (!el.dataset.ready) { if (++warm >= 2) { el.dataset.ready = "1"; if (s.ready) s.ready(true); } else dirty = true; }
      };
      raf = requestAnimationFrame(loop);
      // un autre deck : seule la salle est refaite (le plateau du premier plan et les decks des voisins), au même endroit
      api.current.setDeck = (d) => {
        if (dead) return;
        const old = world;
        world = make(d); api.current.built = keyOf(d);
        world.setFront(front); scene.add(world.group);
        if (old) { scene.remove(old.group); try { old.dispose(); } catch { /* déjà libéré */ } }
        dirty = true;
      };
      api.current.cleanup = () => window.removeEventListener("tcg-board", onBoard);
    })();
    return () => {
      dead = true; cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (offArt) offArt();
      if (api.current && api.current.cleanup) api.current.cleanup();
      try { if (world) world.dispose(); } catch { /* déjà libéré */ }
      if (scene) { scene.traverse((o) => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); }); if (scene.environment) scene.environment.dispose(); }
      if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* sans objet */ } renderer.domElement.remove(); }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!api.current) api.current = {};
  api.current.deck = deck;
  useEffect(() => { const a = api.current; if (a.setDeck && a.built !== deckKey) a.setDeck(deck); }, [deckKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className={"t3d" + (mode === "title" ? " title" : "") + (active ? "" : " off")} aria-hidden="true">
      <i className="t3d-veil" />
    </div>
  );
}
