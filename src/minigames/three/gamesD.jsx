// Mini-jeux d'arène 3D « à la Pummel Party » (2/3) : Grand Prix de karts, canons en cercle.
import { useRef } from "react";
import { Icon } from "../../ui/Icon.jsx";
import { useReady, candyWorld, plastic, withOutline, textSprite, HoldBtn, clamp, wrapPi, useFinish, useScore, useClock, vib } from "./kit3d.jsx";
import { Shell, Chips, useSig, makeInput, fitCamera, mkActor, cast, makeFx, makeShake, discArena, abyss, COL } from "./party.jsx";
import { createKart, KT } from "../sim/kart.js";
import { createCannons, CN } from "../sim/cannons.js";

const NAMES = ["Toi", "Rouge", "Vert", "Bleu"];

/** Ruban collé au circuit : de `offA` à `offB` (décalage latéral), avec une couleur par morceau. `skip(i)` supprime un morceau. */
function strip(THREE, T, offA, offB, y0, y1, colorOf, skip) {
  const { P, M } = T, pos = [], col = [], idx = [];
  let n = 0;
  for (let i = 0; i < M; i++) {
    if (skip && skip(i)) continue;
    const p = P[i], q = P[(i + 1) % M], c = new THREE.Color(colorOf(i));
    const v = (pt, off, y) => { pos.push(pt.x + pt.nx * off, y, pt.z + pt.nz * off); col.push(c.r, c.g, c.b); };
    v(p, offA, y0); v(p, offB, y1); v(q, offA, y0); v(q, offB, y1);
    idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2, n, n + 2, n + 1, n + 1, n + 2, n + 3);
    n += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
}
const chevronTex = (THREE) => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"); g.fillStyle = "#20c06b"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#eaffef"; g.lineWidth = 16; g.lineCap = "round"; g.lineJoin = "round";
  for (const y of [92, 52, 12]) { g.beginPath(); g.moveTo(24, y + 26); g.lineTo(64, y); g.lineTo(104, y + 26); g.stroke(); }
  const t = new THREE.CanvasTexture(c); return t;
};
const boxTex = (THREE) => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, "#ff7eb6"); gr.addColorStop(0.5, "#ffd23f"); gr.addColorStop(1, "#4cc9f0"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.font = "800 96px Sora, Segoe UI, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 10; g.strokeStyle = "#1d2457"; g.strokeText("?", 64, 70); g.fillStyle = "#fff"; g.fillText("?", 64, 70);
  return new THREE.CanvasTexture(c);
};

/* ============================ Grand Prix de karts ============================ */
export function KartRace({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const [item, setItem] = useSig("");
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "desert", fog: [38, 100] });
    const sim = createKart(seed, { seconds }), S = sim.S, T = S.track, { P, M } = T;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.steer = (d, v) => input.set(d, v);
    act.item = (v) => input.set("act", v);
    scene.add(camera);
    // sol, route, bordures, glissières
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1f140c, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
    const road = strip(THREE, T, -KT.W, KT.W, 0.02, 0.02, (i) => (Math.floor(i / 5) % 2 ? 0x1b2b4a : 0x203356)); scene.add(road);
    const dash = strip(THREE, T, -0.09, 0.09, 0.035, 0.035, () => 0xffffff, (i) => i % 10 > 4); scene.add(dash);
    for (const s of [-1, 1]) {
      scene.add(strip(THREE, T, s * KT.W, s * (KT.W + 0.6), 0.03, 0.03, (i) => (Math.floor(i / 3) % 2 ? 0xffae4a : 0x2a3a5a)));
      const wl = KT.WALL + 0.35;
      scene.add(strip(THREE, T, s * wl, s * wl, 0, 0.65, (i) => (Math.floor(i / 4) % 2 ? 0xffae4a : 0x5ee1ff)));
    }
    // arche de départ + damier
    const p0 = P[0], arch = new THREE.Group(), chk = document.createElement("canvas"); chk.width = 256; chk.height = 64;
    { const g = chk.getContext("2d"); for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#1d2457" : "#ffffff"; g.fillRect(x * 16, y * 16, 16, 16); } }
    const ctex = new THREE.CanvasTexture(chk);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(KT.WALL * 2 + 1.2, 0.9, 0.3), [plastic(THREE, COL.white), plastic(THREE, COL.white), plastic(THREE, COL.white), plastic(THREE, COL.white), new THREE.MeshStandardMaterial({ map: ctex }), new THREE.MeshStandardMaterial({ map: ctex })]);
    banner.position.y = 4.1; arch.add(banner);
    for (const s of [-1, 1]) { const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), plastic(THREE, COL.purple)); pil.position.set(s * (KT.WALL + 0.45), 2.1, 0); withOutline(THREE, pil, 1.08); arch.add(pil); }
    arch.position.set(p0.x, 0, p0.z); arch.rotation.y = Math.atan2(p0.tx, p0.tz); scene.add(arch);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(KT.W * 2, 0.9), new THREE.MeshBasicMaterial({ map: ctex })); line.position.set(p0.x, 0.045, p0.z);
    line.rotation.order = "YXZ"; line.rotation.set(-Math.PI / 2, Math.atan2(p0.tx, p0.tz), 0); scene.add(line);
    // décor : arbres et ballons dans l'herbe, loin de la route
    let seedD = seed * 7919 + 13; const rd2 = () => ((seedD = (seedD * 1664525 + 1013904223) >>> 0) / 4294967296);
    const treeG = new THREE.CylinderGeometry(0.16, 0.2, 1.1, 8), leafG = new THREE.ConeGeometry(0.9, 2.0, 9);
    for (let k = 0, placed = 0; k < 400 && placed < 46; k++) {
      const i = Math.floor(rd2() * M), p = P[i], off = (rd2() < 0.5 ? -1 : 1) * (KT.WALL + 3 + rd2() * 14);
      const x = p.x + p.nx * off, z = p.z + p.nz * off;
      if (P.some((q) => Math.hypot(q.x - x, q.z - z) < KT.WALL + 2.6)) continue;
      const g = new THREE.Group(), tr = new THREE.Mesh(treeG, plastic(THREE, COL.wood)); tr.position.y = 0.55;
      const lf = new THREE.Mesh(leafG, plastic(THREE, [COL.green, 0x4fd18a, COL.cyan, COL.yellow][placed % 4])); lf.position.y = 2.0; withOutline(THREE, lf, 1.06); g.add(tr, lf);
      g.position.set(x, 0, z); g.scale.setScalar(0.8 + rd2() * 0.9); scene.add(g); placed++;
    }
    // tremplins d'accélération, boîtes à objets, bananes
    const ctexChev = chevronTex(THREE), bt = boxTex(THREE);
    for (const pd of S.pads) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshBasicMaterial({ map: ctexChev })); m.rotation.order = "YXZ"; m.rotation.set(-Math.PI / 2, Math.atan2(pd.tx, pd.tz) + Math.PI, 0); m.position.set(pd.x, 0.05, pd.z); scene.add(m); }
    const boxGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95), boxMat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.3, emissive: 0x332244 });
    const boxMeshes = S.boxes.map((b) => b.spots.map((s) => { const m = new THREE.Mesh(boxGeo, boxMat); withOutline(THREE, m, 1.07); m.position.set(s.x, 1.0, s.z); scene.add(m); return m; }));
    const banG = new THREE.TorusGeometry(0.34, 0.13, 8, 14, Math.PI * 1.3), banMat = plastic(THREE, 0xffd23f);
    const bananas = new Map();
    // karts
    const cs = cast(color, look);
    const mkKart = (c) => {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const mat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.4 });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.34, 2.0), mat); chassis.position.y = 0.42; withOutline(THREE, chassis, 1.05); body.add(chassis);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.26, 0.7), mat); nose.position.set(0, 0.38, 1.25); withOutline(THREE, nose, 1.07); body.add(nose);
      const spoil = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.34), plastic(THREE, 0x2b2f5e)); spoil.position.set(0, 0.98, -1.0); body.add(spoil);
      for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), plastic(THREE, 0x2b2f5e)); st.position.set(s * 0.45, 0.74, -1.0); body.add(st); }
      const wheels = [];
      for (const [x, z] of [[-0.72, 0.8], [0.72, 0.8], [-0.74, -0.8], [0.74, -0.8]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14), plastic(THREE, 0x2b2f5e)); w.rotation.z = Math.PI / 2; withOutline(THREE, w, 1.1);
        const piv = new THREE.Group(); piv.position.set(x, 0.34, z); piv.add(w); body.add(piv); wheels.push({ piv, w, front: z > 0 });
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), plastic(THREE, 0x2b2f5e)); seat.position.set(0, 0.7, -0.35); body.add(seat);
      const bean = mkActor(THREE, body, c, 0.66); bean.group.position.set(0, 0.52, -0.1);
      const flames = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xffa43c })); f.rotation.x = -Math.PI / 2; f.position.set(s * 0.35, 0.5, -1.55); f.visible = false; body.add(f); return f; });
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(0.95, 1.5, 1); sh.position.y = 0.06; g.add(sh);
      scene.add(g);
      return { g, body, bean, wheels, flames, mat };
    };
    const A = S.K.map((k, i) => ({ k, ...mkKart(cs[i]), spinA: 0 }));
    // compte à rebours (collé à la caméra)
    const cd = ["3", "2", "1", "GO !"].map((t, i) => { const s = textSprite(THREE, t, { color: i === 3 ? "#6be28e" : "#ffd23f", size: 100 }); s.position.set(0, 0.5, -4.2); s.visible = false; s.material.depthTest = false; s.renderOrder = 20; camera.add(s); return s; });
    let lastSig = "", lastScore = -1, finished = false, lastItem = "", camT = null, shown = -1;
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "boost") { const a = A[e.i]; fx.burst(a.k.x, 0.5, a.k.z, [0xffa43c, 0xffd23f], 10, 4); if (e.i === 0) { shake.add(0.25); vib(25); fx.pop(e.src === "pad" ? "Turbo !" : "Champi !", a.k.x, 2.4, a.k.z, "#6be28e", 0.9); } }
        else if (e.type === "item") { if (e.i === 0) { fx.pop(e.item === "boost" ? "Turbo !" : "Banane !", e.x, 2.4, e.z, "#ffffff", 0.9); vib(15); } fx.burst(e.x, 1, e.z, [0xff7eb6, 0xffd23f, 0x4cc9f0], 10, 4); }
        else if (e.type === "spin") { fx.burst(e.x, 0.6, e.z, [0xffd23f, 0xffffff], 12, 5); fx.pop(S.K[e.i] === S.me ? "Aïe !" : "Glissé !", S.K[e.i].x, 2.4, S.K[e.i].z, "#ff5d73", 1); if (e.i === 0) { shake.add(0.6); vib([60, 30, 60]); } }
        else if (e.type === "wall") { fx.burst(e.x, 0.7, e.z, [0xffffff, 0xffd23f], 6, 4); if (e.i === 0) { shake.add(0.3); vib(20); } }
        else if (e.type === "bump") { fx.burst(e.x, 0.7, e.z, [0xffffff], 5, 3); if (e.i === 0 || e.j === 0) { shake.add(0.2); vib(12); } }
      }
      S.events.length = 0;
      for (const a of A) {
        const { k } = a;
        a.g.position.set(k.x, 0, k.z); a.g.rotation.y = k.h;
        a.body.rotation.z = -k.steer * 0.1 * clamp(k.sp / 9, 0, 1); a.body.rotation.x = k.boost > 0 ? -0.06 : 0;
        a.body.position.y = Math.sin(tt * 30 + k.i) * 0.012 * clamp(k.sp / 9, 0, 1);
        for (const w of a.wheels) { w.w.rotation.x += k.sp * dt * 3; if (w.front) w.piv.rotation.y = -k.steer * 0.45; }
        a.flames.forEach((f) => { f.visible = k.boost > 0; f.scale.set(1, 0.7 + Math.random() * 0.5, 1); });
        a.bean.anim({ run: 0, stun: k.spin > 0, t: tt + k.i });
        if (k.spin > 0) a.body.rotation.z = Math.sin(tt * 30) * 0.08;
      }
      S.K.forEach((k) => { if (k.boost > 0 && Math.random() < 0.5) fx.burst(k.x - Math.sin(k.h) * 1.5, 0.45, k.z - Math.cos(k.h) * 1.5, [0xffa43c, 0xffd23f], 1, 1.4, 2); });
      S.boxes.forEach((b, bi) => b.spots.forEach((s, n) => { const m = boxMeshes[bi][n]; m.visible = b.on[n]; m.rotation.y = tt * 1.8; m.rotation.x = tt * 0.9; m.position.y = 1.0 + Math.sin(tt * 3 + bi + n) * 0.12; }));
      for (const b of S.bananas) { let m = bananas.get(b); if (!m) { m = new THREE.Mesh(banG, banMat); withOutline(THREE, m, 1.12); m.rotation.x = -Math.PI / 2; m.position.set(b.x, 0.25, b.z); scene.add(m); bananas.set(b, m); } m.rotation.z = b.x * 3; }
      for (const [b, m] of bananas) if (!S.bananas.includes(b)) { scene.remove(m); bananas.delete(b); }
      // compte à rebours
      const which = S.t < KT.go ? Math.min(2, Math.floor((S.t / KT.go) * 3)) : (S.t < KT.go + 0.7 ? 3 : -1);
      if (which !== shown) { shown = which; cd.forEach((s, i) => { s.visible = i === which; }); }
      // classement + objet
      const order = S.K.map((k, i) => ({ k, i })).sort((a, b) => b.k.prog - a.k.prog);
      const sig = JSON.stringify(order.map((o) => o.i)) + "|" + Math.max(1, Math.floor(S.me.prog) + 1);
      if (sig !== lastSig) { lastSig = sig; setChips(order.map((o, r) => ({ key: o.i, color: cs[o.i].color, text: (r + 1) + (r ? "e " : "er ") + NAMES[o.i] + (o.i === 0 ? " · T" + Math.max(1, Math.floor(S.me.prog) + 1) : ""), me: o.i === 0, on: r === 0 }))); }
      const it = S.me.item || ""; if (it !== lastItem) { lastItem = it; setItem(it); }
      const v = sim.score();
      if (v !== lastScore) { lastScore = v; sc.set(v); }
    };
    return {
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        // caméra poursuite
        const k = S.me, bx = Math.sin(k.h), bz = Math.cos(k.h);
        const want = { x: k.x - bx * 7.4 - (-bz) * 0, y: 4.5 + k.boost * 0.4, z: k.z - bz * 7.4 };
        if (!camT) { camPos.set(want.x, want.y, want.z); camLook.set(k.x + bx * 4, 0.6, k.z + bz * 4); camT = true; }
        const f = 1 - Math.exp(-5.5 * dt);
        camPos.x += (want.x - camPos.x) * f; camPos.y += (want.y - camPos.y) * f; camPos.z += (want.z - camPos.z) * f;
        camLook.x += (k.x + bx * 4.5 - camLook.x) * f * 1.4; camLook.z += (k.z + bz * 4.5 - camLook.z) * f * 1.4; camLook.y = 0.8;
        // la caméra reste dans le couloir des glissières (sinon on verrait le mur par l'arrière)
        { let bi = k.idx, bd = 1e9; for (let d = -26; d <= 26; d++) { const j = (((k.idx + d) % M) + M) % M, q = P[j], dd = (camPos.x - q.x) ** 2 + (camPos.z - q.z) ** 2; if (dd < bd) { bd = dd; bi = j; } }
          const q = P[bi], lat = (camPos.x - q.x) * q.nx + (camPos.z - q.z) * q.nz, lim = KT.WALL - 0.2;
          if (Math.abs(lat) > lim) { const sft = lat - Math.sign(lat) * lim; camPos.x -= q.nx * sft; camPos.z -= q.nz * sft; } }
        camera.position.copy(camPos); camera.lookAt(camLook);
        el.dataset.cam = [camPos.x, camPos.y, camPos.z, k.x, k.z, k.h, S.t].map((v) => v.toFixed(2)).join(",");
        const fov = 62 + clamp(k.sp / KT.vmax, 0, 1.6) * 6 + (k.boost > 0 ? 6 : 0);
        if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-6 * dt)); camera.updateProjectionMatrix(); }
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); ctexChev.dispose(); bt.dispose(); ctex.dispose(); scene.remove(camera); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Grand Prix : tourne avec les flèches ou en glissant, bouton pour utiliser l'objet" onFail={() => finish(0)}
      chips={<Chips items={chips} />} padsClass="three"
      pads={<>
        <HoldBtn label="Gauche" testid="kt-left" on={(v) => act.steer && act.steer("left", v)}><Icon name="back" size={26} /></HoldBtn>
        <HoldBtn label="Objet" testid="kt-item" className="wide" on={(v) => act.item && act.item(v)}>{item === "boost" ? <><Icon name="rocket" /> Turbo</> : item === "banana" ? <><Icon name="banana" /> Banane</> : <><Icon name="box" /> Objet</>}</HoldBtn>
        <HoldBtn label="Droite" testid="kt-right" on={(v) => act.steer && act.steer("right", v)}><Icon name="next" size={26} /></HoldBtn>
      </>} />
  );
}

/* ============================ Canons en cercle ============================ */
export function Cannons({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "mountain", fog: [40, 105] });
    abyss(THREE, scene, 0x5fb6ff, -4);
    const sim = createCannons(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.jump = (v) => v && input.pulse("act");
    scene.add(discArena(THREE, { R: 6.1, color: COL.cyan, ring: COL.yellow, stripes: [[1.2, 1.35, COL.white], [3.0, 3.15, COL.white], [4.8, 4.95, COL.white]] }));
    // canons
    const barrelMat = plastic(THREE, 0x2b2f5e), baseMat = plastic(THREE, COL.red);
    const cannons = S.cannons.map((c) => {
      const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.7, 14), baseMat); base.position.y = 0.35; withOutline(THREE, base, 1.05); g.add(base);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 1.8, 14), barrelMat); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 1.05, 0.5); withOutline(THREE, barrel, 1.06); pivot.add(barrel);
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.09, 8, 16), plastic(THREE, COL.yellow)); mouth.position.set(0, 1.05, 1.42); pivot.add(mouth);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), barrelMat); cap.position.set(0, 1.05, -0.4); pivot.add(cap);
      g.position.set(c.x, 0, c.z); pivot.rotation.y = Math.atan2(-c.x, -c.z); scene.add(g);
      return { g, pivot, barrel, baseAng: Math.atan2(-c.x, -c.z) };
    });
    // couloirs d'alerte
    const laneGeo = new THREE.PlaneGeometry(1.35, 15);
    const laneMeshes = new Map();
    const shellGeo = new THREE.SphereGeometry(CN.shellR, 16, 12), shellMat = plastic(THREE, 0x1d2457);
    const shells = new Map();
    const gem = new THREE.Group();
    { const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), plastic(THREE, COL.pink, { emissive: 0x7a1d4d })); o.position.y = 0.9; withOutline(THREE, o, 1.1); gem.add(o);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; gem.add(ring); gem.visible = false; scene.add(gem); }
    const cs = cast(color, look);
    const A = S.P.map((o, i) => {
      const b = mkActor(THREE, scene, cs[i]);
      const pips = [0, 1, 2].map((k) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b5c })); p.position.y = 2.7; scene.add(p); return p; });
      return { o, b, pips, rot: 0, fall: 0 };
    });
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "fire") { fx.burst(e.x * 0.85, 1.1, e.z * 0.85, [0xffffff, 0xffd23f, 0xffa43c], 10, 5, 4); fx.ring(e.x * 0.8, e.z * 0.8, 0xffd23f, 0.4, 1.6, 0.25, 1.0); shake.add(0.12); }
        else if (e.type === "hit") { const a = A[e.i]; fx.burst(e.x, 1.1, e.z, [0xff5d73, 0xffd23f, 0xffffff], 14, 6); fx.pop(e.i === 0 ? "AÏE !" : "Touché !", clamp(e.x, -3.8, 3.8), 2.9, e.z, "#ff5d73", 1); if (e.i === 0) { shake.add(0.7); vib([70, 30, 90]); } }
        else if (e.type === "out") { fx.burst(e.x, 1.1, e.z, [0xff5d73, 0xffd23f, 0xffffff, cs[e.i].color], 30, 8); fx.ring(e.x, e.z, 0xff5d73, 0.5, 3.5, 0.5); A[e.i].fall = 0.001; if (e.i === 0) { shake.add(0.9); vib([120, 40, 120]); } }
        else if (e.type === "pick") { fx.burst(e.x, 1, e.z, [0xff7eb6, 0xffffff, 0xffd23f], 12, 4.5); fx.ring(e.x, e.z, 0xff7eb6, 0.3, 1.8, 0.35); if (e.i === 0) { fx.pop("+25", e.x, 2.2, e.z, "#ffd23f", 1); vib(18); } }
        else if (e.type === "jump") { const o = S.P[e.i]; fx.ring(o.x, o.z, 0xffffff, 0.3, 1.4, 0.3); }
      }
      S.events.length = 0;
      // couloirs, boulets, canons
      for (const l of S.lanes) {
        let m = laneMeshes.get(l);
        if (!m) { m = new THREE.Mesh(laneGeo, new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })); m.rotation.order = "YXZ"; m.rotation.set(-Math.PI / 2, Math.atan2(l.dx, l.dz), 0); m.position.set(l.c.x + l.dx * 7.6, 0.07, l.c.z + l.dz * 7.6); scene.add(m); laneMeshes.set(l, m); }
        const k = clamp(l.t / l.tel, 0, 1);
        m.material.opacity = l.fired ? 0.18 : 0.22 + 0.45 * (0.5 + 0.5 * Math.sin(tt * (10 + 30 * k)));
        cannons[l.c.k].pivot.rotation.y = Math.atan2(l.dx, l.dz);
      }
      for (const [l, m] of laneMeshes) if (!S.lanes.includes(l)) { scene.remove(m); m.material.dispose(); laneMeshes.delete(l); }
      for (const c of S.cannons) { const cm = cannons[c.k]; cm.barrel.position.z = 0.5 - c.kick * 1.6; if (!S.lanes.some((l) => l.c === c)) cm.pivot.rotation.y = cm.baseAng; }
      for (const sh of S.shells) { let m = shells.get(sh); if (!m) { m = new THREE.Mesh(shellGeo, shellMat); withOutline(THREE, m, 1.1); scene.add(m); shells.set(sh, m); } m.position.set(sh.x, CN.shellR + 0.05, sh.z); m.rotation.x += dt * 14; if (Math.random() < 0.6) fx.burst(sh.x, 0.5, sh.z, [0xdddddd, 0xffa43c], 1, 1.2, 1); }
      for (const [sh, m] of shells) if (!S.shells.includes(sh)) { scene.remove(m); shells.delete(sh); }
      gem.visible = Boolean(S.gem);
      if (S.gem) { gem.position.set(S.gem.x, Math.sin(tt * 4) * 0.12, S.gem.z); gem.rotation.y = tt * 2.6; const late = S.gem.t > 5; gem.visible = !late || Math.sin(tt * 18) > -0.2; }
      // joueurs
      for (const a of A) {
        const { o, b } = a, g = b.group;
        if (a.fall > 0) { a.fall += dt; g.position.y += dt * 4 - a.fall * dt * 8; g.rotation.y += dt * 12; g.scale.setScalar(Math.max(0.01, 1.3 * (1 - a.fall / 0.9))); b.anim({ fall: true, t: tt }); a.pips.forEach((p) => { p.visible = false; }); if (a.fall > 0.9) g.visible = false; continue; }
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-14 * dt));
        g.position.set(o.x, o.jy, o.z); g.rotation.y = a.rot;
        g.visible = o.inv > 0 ? Math.sin(tt * 38) > -0.3 : true;
        if (b.shadow) { b.shadow.position.y = 0.03 - o.jy; b.shadow.scale.setScalar(Math.max(0.5, 1 - o.jy * 0.25)); }
        b.anim({ run: clamp(Math.hypot(o.vx, o.vz) / 5, 0, 1), air: o.jy > 0.15, stun: o.stun > 0, t: tt + o.i });
        a.pips.forEach((p, k) => { p.visible = k < o.lives; p.position.set(o.x + (k - 1) * 0.42, 2.75 + o.jy, o.z); });
      }
      const sig = JSON.stringify(S.P.map((o) => [o.lives, o.alive, o.gems]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, icon: o.alive ? "heart" : "skull", text: NAMES[i] + (o.alive ? " ×" + o.lives : "") + (o.gems ? " · " + o.gems : ""), dead: !o.alive, me: i === 0 }))); }
      const v = sim.score();
      if (v !== lastScore && (S.me.alive || !S.done)) { lastScore = v; sc.set(v); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        fitCamera(camera, cur, { hw: 7.6, hd: 7.2, tilt: 0.6 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Canons en cercle : glisse pour esquiver les boulets, bouton pour sauter par-dessus" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Sauter" testid="cn-jump" className="wide" on={(v) => act.jump && act.jump(v)}>⤴ Sauter !</HoldBtn>} />
  );
}
