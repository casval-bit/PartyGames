// Mini-jeux 3D (2/2) : tunnel, cueillette de champis, safari photo, bowling.
import { useRef, useState } from "react";
import {
  Stage3D, useReady, candyWorld, plastic, withOutline, box, makeBean, textSprite, bindKeys, bindStick, HoldBtn, beanColor, BOT_COLORS,
  clamp, lerp, wrapPi, rng, ri, rpick, useFinish, useScore, useClock, TimeBar, vib,
} from "./kit3d.jsx";

const COL = { pink: 0xff7eb6, yellow: 0xffd23f, cyan: 0x4cc9f0, purple: 0xb185ff, green: 0x6be28e, orange: 0xff9a3c, red: 0xff5d73, white: 0xffffff, navy: 0x1d2457 };
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/* ============================ 1. Tunnel ============================ */
export function Tunnel({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ dist: 0 }).current, hold = useRef({ l: false, r: false }).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(Math.round(S.dist)), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xcdeeb0, fog: [14, 46] });
    camera.fov = 68; camera.updateProjectionMatrix();
    const R = 3.6, RB = R - 0.45, SEG = 6, N = 12;
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 32;
    const g = cv.getContext("2d");
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#7bdc7a" : "#5cc86b"; g.fillRect(i * 8, j * 16, 8, 16); }
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#ffd23f" : "#ff7eb6"; g.beginPath(); g.arc(10 + i * 21, 8 + (i % 2) * 16, 2.6, 0, 7); g.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.BackSide, roughness: 0.8 });
    const segs = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, SEG, 24, 1, true), wallMat); m.rotation.x = Math.PI / 2; m.position.z = i * SEG;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.1, 6, 30), plastic(THREE, i % 2 ? COL.white : COL.yellow)); ring.position.z = i * SEG + SEG / 2;
      scene.add(m, ring); segs.push({ m, ring });
    }
    const r = rng(seed), obs = [];
    let z = 30, n = 0;
    const at = (a) => new THREE.Vector3(Math.sin(a) * (R - 0.55), -Math.cos(a) * (R - 0.55), 0);
    while (z < 800) {
      const kind = r();
      const base = r() * Math.PI * 2, cnt = kind < 0.35 ? 1 : kind < 0.75 ? 2 : 3;
      for (let k = 0; k < cnt; k++) {
        const a = base + k * 0.62, m = box(THREE, 1.5, 1.5, 1.2, k % 2 ? COL.red : COL.orange);
        const p = at(a); m.position.set(p.x, p.y, z); m.rotation.z = a; scene.add(m); obs.push({ z, a, half: 0.3, mesh: m });
      }
      if (n > 6 && r() < 0.4) { const a = base + Math.PI; const m = box(THREE, 1.4, 1.4, 1.2, COL.purple); const p = at(a); m.position.set(p.x, p.y, z + 7); m.rotation.z = a; scene.add(m); obs.push({ z: z + 7, a, half: 0.28, mesh: m }); }
      z += Math.max(9, 17 - n * 0.3) + r() * 3; n++;
    }
    const bean = makeBean(THREE, color || beanColor()); scene.add(bean.group);
    const pop = textSprite(THREE, "Aïe !", { color: "#ffd23f" }); pop.visible = false; scene.add(pop);
    const P = { z: 0, a: 0, va: 0, speed: 0, stun: 0, inv: 0, t: 0 };
    const vec = { x: 0, y: 0 }, keys = {}, offKeys = bindKeys(keys), offStick = bindStick(el, vec);
    return {
      update(dt, tt) {
        P.t += dt;
        const steer = clamp((vec.x || 0) + (keys.right || hold.r ? 1 : 0) - (keys.left || hold.l ? 1 : 0), -1, 1);
        P.va = lerp(P.va, steer * 2.9, 1 - Math.exp(-dt * 10));
        P.a += P.va * dt;
        P.stun = Math.max(0, P.stun - dt); P.inv = Math.max(0, P.inv - dt);
        const base = 9 + Math.min(5.5, P.t * 0.18);
        P.speed = P.stun > 0 ? lerp(P.speed, 2.2, dt * 8) : lerp(P.speed, base, dt * 2.5);
        P.z += P.speed * dt;
        for (const o of obs) {
          if (P.inv > 0 || Math.abs(o.z - P.z) > 0.95) continue;
          if (Math.abs(wrapPi(P.a - o.a)) < o.half + 0.17) { P.stun = 0.7; P.inv = 1.5; P.speed = 0.8; P.z -= 1.3; vib([40, 30]); pop.visible = true; pop.userData.t = 0.8; }
        }
        S.dist = Math.max(S.dist, P.z);
        if (Math.floor(S.dist) !== sc.ref.current) sc.set(Math.floor(S.dist));
        const p = at(P.a);
        const pb = at(P.a).multiplyScalar((R - 0.06) / (R - 0.55));
        bean.group.position.set(pb.x, pb.y, P.z);
        bean.group.rotation.set(0, 0, P.a);
        bean.group.visible = P.inv <= 0 || Math.floor(tt * 14) % 2 === 0;
        bean.shadow.visible = false;
        bean.anim({ run: P.stun > 0 ? 0 : 1, stun: P.stun > 0, t: tt });
        if (pop.visible) { pop.userData.t -= dt; pop.position.set(p.x * 0.4, p.y * 0.4 + 0.6, P.z + 1.5); if (pop.userData.t <= 0) pop.visible = false; }
        for (const s of segs) if (s.m.position.z < P.z - SEG * 2.5) { s.m.position.z += N * SEG; s.ring.position.z += N * SEG; }
        // caméra dans le tube, légèrement vers le haricot, roulée comme lui
        camera.position.set(p.x * 0.34, p.y * 0.34, P.z - 5.2);
        camera.up.set(-Math.sin(P.a), Math.cos(P.a), 0);
        camera.lookAt(p.x * 0.1, p.y * 0.1, P.z + 10);
      },
      dispose() { offKeys(); offStick(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val} m</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Tunnel : glisse à gauche ou à droite pour tourner autour du tube" onFail={() => finish(0)} />
      <div className="mgpads three">
        <HoldBtn label="Tourner à gauche" testid="tn-left" on={(v) => { hold.l = v; }}>◀</HoldBtn>
        <HoldBtn label="Tourner à droite" testid="tn-right" on={(v) => { hold.r = v; }}>▶</HoldBtn>
      </div>
    </div>
  );
}

/* ============================ 2. Cueillette de champis ============================ */
export function Shroom({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ pts: 0 }).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(Math.max(0, S.pts)), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xbff0d0, fog: [20, 50] });
    const r = rng(seed);
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, 0.8, 40), plastic(THREE, 0x76d07a)); ground.position.y = -0.4; withOutline(THREE, ground, 1.015); scene.add(ground);
    for (let i = 0; i < 26; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), plastic(THREE, i % 2 ? 0x4fbf63 : 0x8fe08a)); const a = r() * 6.28, d = 3.2 + r() * 5.2; t.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d - 0.5); scene.add(t); }
    const SLOTS = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) SLOTS.push({ x: i * 2.9, z: j * 2.7 - 0.4, m: null });
    for (const s of SLOTS) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.1, 20), plastic(THREE, 0x8a5a2b)); h.position.set(s.x, 0.02, s.z); scene.add(h); }
    const capMat = (c) => plastic(THREE, c, { rough: 0.35 });
    const make = (gold) => {
      const g = new THREE.Group();
      const stem = withOutline(THREE, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.9, 12), plastic(THREE, 0xfff1d6)), 1.08); stem.position.y = 0.45;
      const cap = withOutline(THREE, new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat(gold ? 0xffc928 : 0xff5d73)), 1.05); cap.position.y = 0.85; cap.scale.set(1, 0.85, 1);
      g.add(stem, cap);
      for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), plastic(THREE, 0xffffff)); const a = i * 1.05, rr = 0.42 + (i % 2) * 0.2; d.position.set(Math.cos(a) * rr, Math.sqrt(Math.max(0.04, 0.7225 - rr * rr)) - 0.02, Math.sin(a) * rr); d.scale.y = 0.6; cap.add(d); }
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.8; g.add(hit); g.userData.hit = hit;
      const glow = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); glow.rotation.x = Math.PI / 2; glow.position.y = 0.06; glow.visible = false; g.add(glow);
      g.userData.cap = cap; g.userData.glow = glow;
      return g;
    };
    // calendrier des champis : tiré avec la graine (identique pour tous)
    const plan = []; let t = 0.6;
    while (t < seconds - 2.5) { plan.push({ t, gold: r() < 0.12, grow: 1.8 + r() * 1.5, win: 0.95 }); t += 0.5 + r() * 0.5; }
    const alive = [];
    let pi = 0;
    const bean = makeBean(THREE, color || beanColor()); bean.group.position.set(0, 0, 4.6); bean.group.rotation.y = Math.PI; scene.add(bean.group);
    let react = 0, reactKind = "";
    const flash = (txt, col, x, z) => { const sp = textSprite(THREE, txt, { color: col }); sp.position.set(x, 2.1, z); sp.userData.t = 0.8; scene.add(sp); alive.push({ sprite: sp }); };
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const onDown = (e) => {
      const rc = el.getBoundingClientRect();
      ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const live = alive.filter((a) => a.g && a.state !== "gone");
      const hits = ray.intersectObjects(live.map((a) => a.g.userData.hit), false);
      if (!hits.length) return;
      const a = live.find((x) => x.g.userData.hit === hits[0].object);
      const age = a.age;
      if (a.state === "grow") { S.pts -= 5; flash("−5", "#ff5d73", a.slot.x, a.slot.z); a.state = "wilt"; a.age = 0; react = 0.6; reactKind = "ko"; vib([30, 30]); }
      else if (a.state === "ripe") { const v = a.def.gold ? 30 : age < 0.45 ? 15 : 10; S.pts += v; flash(`+${v}`, a.def.gold ? "#ff9a3c" : "#ffd23f", a.slot.x, a.slot.z); a.state = "pick"; a.age = 0; react = 0.7; reactKind = "ok"; vib(12); }
      else if (a.state === "rot") { S.pts -= 8; flash("−8", "#b185ff", a.slot.x, a.slot.z); a.state = "wilt"; a.age = 0; react = 0.6; reactKind = "ko"; vib([30, 30]); }
      sc.set(Math.max(0, S.pts));
    };
    el.addEventListener("pointerdown", onDown);
    let clockT = 0;
    return {
      update(dt, tt) {
        clockT += dt;
        while (pi < plan.length && plan[pi].t <= clockT) {
          const free = SLOTS.filter((s) => !s.m);
          if (free.length) { const slot = free[Math.floor(r() * free.length)], g = make(plan[pi].gold); g.position.set(slot.x, 0, slot.z); g.scale.setScalar(0.01); g.rotation.y = r() * 6; scene.add(g); slot.m = true; alive.push({ g, slot, def: plan[pi], state: "grow", age: 0 }); }
          pi++;
        }
        for (const a of alive) {
          if (a.sprite) { a.sprite.userData.t -= dt; a.sprite.position.y += dt * 1.6; a.sprite.material.opacity = Math.max(0, a.sprite.userData.t / 0.8); if (a.sprite.userData.t <= 0) { a.sprite.removeFromParent(); a.state = "gone"; } continue; }
          a.age += dt;
          const g = a.g, cap = g.userData.cap, glow = g.userData.glow;
          if (a.state === "grow") { const k = clamp(a.age / a.def.grow, 0, 1); g.scale.setScalar(0.12 + 0.88 * easeOutBack(k)); if (a.age >= a.def.grow) { a.state = "ripe"; a.age = 0; } }
          else if (a.state === "ripe") { glow.visible = true; glow.scale.setScalar(1 + Math.sin(a.age * 14) * 0.08); glow.material.color.set(a.def.gold ? 0xffc928 : 0x6dff9a); g.position.y = Math.abs(Math.sin(a.age * 9)) * 0.14; if (a.age >= (a.def.gold ? 0.7 : a.def.win)) { a.state = "rot"; a.age = 0; glow.visible = false; cap.material = capMat(0x8a5fc7); } }
          else if (a.state === "rot") { g.rotation.z = Math.sin(a.age * 25) * 0.05; if (a.age >= 1.0) { a.state = "wilt"; a.age = 0; } }
          else if (a.state === "wilt" || a.state === "pick") { const k = clamp(a.age / 0.35, 0, 1); g.scale.setScalar(Math.max(0.001, 1 - k)); g.position.y = a.state === "pick" ? k * 2.2 : 0; glow.visible = false; if (k >= 1) { g.removeFromParent(); a.slot.m = null; a.state = "gone"; } }
        }
        for (let i = alive.length - 1; i >= 0; i--) if (alive[i].state === "gone") alive.splice(i, 1);
        react = Math.max(0, react - dt);
        bean.anim({ cheer: react > 0 && reactKind === "ok", stun: react > 0 && reactKind === "ko", t: tt });
        camera.position.set(0, 9.2, 8.4);
        camera.lookAt(0, 0, 0.6);
      },
      dispose() { el.removeEventListener("pointerdown", onDown); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Cueillette : touche les champignons quand ils brillent" onFail={() => finish(0)} />
      <p className="mgsub">Cueille le champi quand il brille en vert. Trop tôt ou trop tard : points perdus !</p>
    </div>
  );
}

/* ============================ 3. Safari photo ============================ */
const ANIMALS = [
  { id: "giraffe", emoji: "🦒", name: "la girafe" },
  { id: "elephant", emoji: "🐘", name: "l'éléphant" },
  { id: "zebra", emoji: "🦓", name: "le zèbre" },
  { id: "lion", emoji: "🦁", name: "le lion" },
];
export function Safari({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ pts: 0 }).current;
  const [target, setTarget] = useState(ANIMALS[0]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(Math.max(0, S.pts)), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xffdca0, fog: [26, 70] });
    camera.fov = 68; camera.updateProjectionMatrix();
    const r = rng(seed);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 40), plastic(THREE, 0xe9c46a, { rough: 0.9 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b0, fog: false })); sun.position.set(-18, 20, 52); scene.add(sun);
    for (let i = 0; i < 9; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(7 + r() * 5, 14, 8), plastic(THREE, i % 2 ? 0xd9a94c : 0xc99a3f, { rough: 1 })); const a = (i / 9) * 6.28; h.position.set(Math.sin(a) * 48, -3.5, Math.cos(a) * 48); h.scale.y = 0.55; scene.add(h); }
    const tree = (x, z) => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 3.2, 8), plastic(THREE, 0x8a5a2b)); t.position.y = 1.6; const c = withOutline(THREE, new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 8), plastic(THREE, 0x58b868)), 1.04); c.scale.set(1.5, 0.45, 1.5); c.position.y = 3.6; g.add(t, c); g.position.set(x, 0, z); scene.add(g); };
    for (let i = 0; i < 12; i++) { const a = r() * 6.28; tree(Math.sin(a) * (20 + r() * 14), Math.cos(a) * (20 + r() * 14)); }
    // buissons d'où sortent les animaux, répartis devant, sur les côtés et derrière le point de vue
    const BU = [];
    for (let i = 0; i < 12; i++) {
      const a = -0.85 + (i / 11) * 1.7 + (r() - 0.5) * 0.08, d = 10 + (i % 3) * 2.2 + r() * 1.5;
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const b = withOutline(THREE, new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.35, 12, 8), plastic(THREE, k % 2 ? 0x4aae5f : 0x62c773)), 1.05); b.position.set((k - 1) * 0.9, 0.6, (r() - 0.5) * 0.4); g.add(b); }
      g.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); scene.add(g); BU.push({ a, d, g, busy: false });
    }
    const body = (c, w, h, l) => withOutline(THREE, new THREE.Mesh(new THREE.BoxGeometry(w, h, l), plastic(THREE, c)), 1.05);
    const sph = (c, rad) => withOutline(THREE, new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 10), plastic(THREE, c)), 1.05);
    const build = (id) => {
      const g = new THREE.Group();
      const leg = (x, z, h, c, th = 0.2) => { const l = body(c, th, h, th); l.position.set(x, h / 2, z); g.add(l); };
      if (id === "giraffe") {
        const b = body(0xffc933, 1.1, 1.1, 2.0); b.position.y = 2.2; g.add(b);
        for (const [x, z] of [[-0.35, -0.8], [0.35, -0.8], [-0.35, 0.8], [0.35, 0.8]]) leg(x, z, 1.7, 0xffc933);
        const n = body(0xffc933, 0.45, 2.3, 0.45); n.position.set(0, 3.7, 0.8); n.rotation.x = -0.2; g.add(n);
        const h = body(0xffc933, 0.6, 0.55, 0.9); h.position.set(0, 4.95, 1.1); g.add(h);
        for (const s of [-1, 1]) { const o = sph(0xffc933, 0.12); o.position.set(s * 0.2, 5.35, 0.85); g.add(o); }
        for (let i = 0; i < 7; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), plastic(THREE, 0x9a5b1e)); sp.position.set(i % 2 ? 0.56 : -0.56, 2 + (i % 3) * 0.35, -0.6 + (i % 4) * 0.5); sp.scale.x = 0.4; g.add(sp); }
      } else if (id === "elephant") {
        const b = sph(0x9aa6b8, 1.35); b.position.y = 1.9; b.scale.set(1, 0.95, 1.25); g.add(b);
        for (const [x, z] of [[-0.7, -0.8], [0.7, -0.8], [-0.7, 0.8], [0.7, 0.8]]) leg(x, z, 1.2, 0x8795a8, 0.55);
        const h = sph(0x9aa6b8, 0.95); h.position.set(0, 2.5, 1.5); g.add(h);
        for (const s of [-1, 1]) { const e = sph(0xaab5c6, 0.8); e.scale.set(0.2, 1, 0.9); e.position.set(s * 1.0, 2.6, 1.3); g.add(e); const tk = body(0xfff6e0, 0.14, 0.14, 0.9); tk.position.set(s * 0.4, 1.9, 2.3); g.add(tk); }
        const tr = body(0x9aa6b8, 0.4, 1.7, 0.4); tr.position.set(0, 1.5, 2.35); tr.rotation.x = 0.3; g.add(tr);
      } else if (id === "zebra") {
        const b = body(0xffffff, 0.95, 1.0, 2.0); b.position.y = 1.6; g.add(b);
        for (let i = 0; i < 6; i++) { const st = body(0x1d2457, 1.0, 1.02, 0.14); st.position.set(0, 1.6, -0.8 + i * 0.32); g.add(st); }
        for (const [x, z] of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) leg(x, z, 1.1, 0xffffff);
        const n = body(0xffffff, 0.4, 0.9, 0.5); n.position.set(0, 2.4, 1.0); n.rotation.x = -0.5; g.add(n);
        const h = body(0xffffff, 0.5, 0.5, 0.9); h.position.set(0, 2.85, 1.45); g.add(h);
        for (let i = 0; i < 3; i++) { const st = body(0x1d2457, 0.52, 0.08, 0.5); st.position.set(0, 2.85 + (i - 1) * 0.15, 1.35); g.add(st); }
        const ta = body(0x1d2457, 0.1, 0.9, 0.1); ta.position.set(0, 1.4, -1.1); g.add(ta);
      } else {
        const b = sph(0xf0a040, 0.95); b.position.y = 1.2; b.scale.set(0.9, 0.85, 1.35); g.add(b);
        for (const [x, z] of [[-0.35, -0.7], [0.35, -0.7], [-0.35, 0.7], [0.35, 0.7]]) leg(x, z, 0.8, 0xe08f30, 0.3);
        const m = sph(0x8a4b1c, 0.85); m.position.set(0, 1.55, 1.0); g.add(m);
        const h = sph(0xf5b155, 0.52); h.position.set(0, 1.5, 1.45); g.add(h);
        for (const s of [-1, 1]) { const e = sph(0xffffff, 0.09); e.position.set(s * 0.2, 1.62, 1.9); g.add(e); const p = sph(0x14183a, 0.05); p.position.set(s * 0.2, 1.62, 1.97); g.add(p); }
        const ta = body(0xe08f30, 0.12, 0.12, 1.1); ta.position.set(0, 1.3, -1.4); ta.rotation.x = 0.5; g.add(ta);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(3, id === "giraffe" ? 6 : 3.2, 3.4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = id === "giraffe" ? 2.8 : 1.5; g.add(hit); g.userData.hit = hit;
      return g;
    };
    // programme : cible qui change toutes les 7 s, animaux tirés avec la graine (la cible revient régulièrement)
    const wins = [];
    let tw = 0, last = -1;
    while (tw < seconds) { let k; do { k = Math.floor(r() * ANIMALS.length); } while (k === last); last = k; wins.push({ t: tw, k }); tw += 7; }
    const pops = []; let tp = 0.7;
    while (tp < seconds - 1.8) {
      const w = [...wins].reverse().find((x) => x.t <= tp) || wins[0];
      const kind = r() < 0.42 ? w.k : Math.floor(r() * ANIMALS.length);
      pops.push({ t: tp, bush: Math.floor(r() * BU.length), k: kind, life: 2.2 + r() * 1.0 });
      tp += 0.5 + r() * 0.45;
    }
    const act = []; let pi = 0, clockT = 0, curWin = -1, yaw = -0.4, yawT = -0.4;
    const photo = document.createElement("div"); photo.className = "mgflash"; el.appendChild(photo);
    const mkPop = (def) => {
      const bu = BU[def.bush]; if (bu.busy) return;
      bu.busy = true;
      const an = build(ANIMALS[def.k].id); an.position.set(bu.g.position.x * 1.0, -3, bu.g.position.z * 1.0 + 0.1); an.rotation.y = Math.atan2(-bu.g.position.x, -bu.g.position.z); scene.add(an);
      act.push({ an, bu, def, age: 0, state: "up", y: -3 });
    };
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let dragging = null, moved = 0, startX = 0, startYaw = 0, sx = 0, sy = 0;
    const shoot = (cx, cy) => {
      const rc = el.getBoundingClientRect();
      ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      photo.classList.remove("on"); void photo.offsetWidth; photo.classList.add("on");
      const live = act.filter((a) => a.state === "stay");
      const hits = ray.intersectObjects(live.map((a) => a.an.userData.hit), false);
      if (!hits.length) return;
      const a = live.find((x) => x.an.userData.hit === hits[0].object);
      const good = ANIMALS[a.def.k].id === ANIMALS[wins[curWin < 0 ? 0 : curWin].k].id;
      S.pts += good ? 15 : -5; sc.set(Math.max(0, S.pts)); a.state = "down"; a.age = 0; vib(good ? 12 : [30, 30]);
      const sp = textSprite(THREE, good ? "+15" : "−5", { color: good ? "#ffd23f" : "#ff5d73" }); sp.position.copy(a.an.position); sp.position.y += 4; sp.userData.t = 0.8; scene.add(sp); act.push({ sprite: sp });
    };
    const down = (e) => { dragging = e.pointerId; moved = 0; sx = startX = e.clientX; sy = e.clientY; startYaw = yawT; try { el.setPointerCapture(dragging); } catch { /* ignoré */ } };
    const move = (e) => { if (e.pointerId !== dragging) return; moved = Math.max(moved, Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy)); yawT = clamp(startYaw - (e.clientX - startX) * 0.006, -1.0, 1.0); };
    const up = (e) => { if (e.pointerId !== dragging) return; dragging = null; if (moved < 12) shoot(e.clientX, e.clientY); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
    const keys = {}, offKeys = bindKeys(keys);
    return {
      update(dt) {
        clockT += dt;
        const wi = wins.reduce((acc, w, i) => (w.t <= clockT ? i : acc), 0);
        if (wi !== curWin) { curWin = wi; setTarget(ANIMALS[wins[wi].k]); }
        while (pi < pops.length && pops[pi].t <= clockT) mkPop(pops[pi++]);
        yawT += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * dt * 1.4; yawT = clamp(yawT, -1.0, 1.0);
        yaw = lerp(yaw, yawT, 1 - Math.exp(-dt * 10));
        for (const a of act) {
          if (a.sprite) { a.sprite.userData.t -= dt; a.sprite.position.y += dt * 1.8; a.sprite.material.opacity = Math.max(0, a.sprite.userData.t / 0.8); if (a.sprite.userData.t <= 0) { a.sprite.removeFromParent(); a.state = "gone"; } continue; }
          a.age += dt;
          if (a.state === "up") { a.y = lerp(-3, 0, clamp(a.age / 0.35, 0, 1)); if (a.age >= 0.35) { a.state = "stay"; a.age = 0; } }
          else if (a.state === "stay") { a.an.position.y = Math.sin(a.age * 6) * 0.05; a.y = a.an.position.y; if (a.age >= a.def.life) { a.state = "down"; a.age = 0; } }
          else if (a.state === "down") { a.y = lerp(0, -3, clamp(a.age / 0.3, 0, 1)); if (a.age >= 0.3) { a.an.removeFromParent(); a.bu.busy = false; a.state = "gone"; } }
          a.an.position.y = a.y;
        }
        for (let i = act.length - 1; i >= 0; i--) if (act[i].state === "gone") act.splice(i, 1);
        camera.position.set(0, 2.3, 0);
        camera.lookAt(Math.sin(yaw) * 10, 1.9, Math.cos(yaw) * 10);
      },
      dispose() { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); offKeys(); photo.remove(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgtarget" data-testid="safari-target" aria-live="polite"><span aria-hidden="true">{target.emoji}</span> Photographie <b>{target.name}</b> !</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Safari : glisse pour regarder autour de toi, touche un animal pour le photographier" onFail={() => finish(0)} />
      <p className="mgsub">Glisse pour regarder autour, touche la bonne bête pour la prendre en photo.</p>
    </div>
  );
}

/* ============================ 4. Bowling ============================ */
export function Bowling({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ pts: 0, done: false }).current;
  const [hint, setHint] = useState("Touche pour fixer la direction");
  const rd = useReady();
  const clock = useClock(seconds, () => finish(S.pts), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xd8c7ff, fog: [30, 70] });
    const r = rng(seed), ROLLS = 4, LANE_W = 3.4, Z0 = 0, ZP = 17;
    const lane = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.4, 24), plastic(THREE, 0xf0c27b, { rough: 0.35 })); lane.position.set(0, -0.2, 10.5); withOutline(THREE, lane, 1.01); scene.add(lane);
    for (const s of [-1, 1]) { const gut = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 24), plastic(THREE, 0x2a2f5e)); gut.position.set(s * (LANE_W / 2 + 0.38), -0.25, 10.5); scene.add(gut); const wall = box(THREE, 0.3, 0.9, 24, s > 0 ? COL.pink : COL.cyan); wall.position.set(s * (LANE_W / 2 + 0.9), 0.1, 10.5); scene.add(wall); }
    for (let i = 0; i < 9; i++) { const mk = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), plastic(THREE, 0x8a5a2b)); mk.rotation.x = -Math.PI / 2; mk.position.set((i - 4) * 0.3, 0.005, 6 + (i % 2) * 0.4); scene.add(mk); }
    const profile = [[0.02, 0], [0.2, 0.02], [0.24, 0.3], [0.17, 0.6], [0.1, 0.85], [0.14, 1.0], [0.15, 1.15], [0.1, 1.28], [0.0, 1.32]].map(([x, y]) => new THREE.Vector2(x, y));
    const pinGeo = new THREE.LatheGeometry(profile, 14), pinMat = plastic(THREE, 0xffffff, { rough: 0.25 }), stripe = plastic(THREE, COL.red);
    const pins = [];
    const rack = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) rack.push({ x: (k - row / 2) * 0.62, z: ZP + row * 0.55 });
    for (const p of rack) { const g = new THREE.Group(); const m = withOutline(THREE, new THREE.Mesh(pinGeo, pinMat), 1.06); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.07, 14), stripe); st.position.y = 1.0; m.add(st); g.add(m); g.position.set(p.x, 0, p.z); scene.add(g); pins.push({ g, x: p.x, z: p.z, down: false, vx: 0, vz: 0, t: 0, dirx: 0, dirz: 0 }); }
    const ball = withOutline(THREE, new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), plastic(THREE, COL.navy, { rough: 0.15 })), 1.06); ball.position.set(0, 0.34, Z0 + 1.2); scene.add(ball);
    for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); h.position.set((i - 1) * 0.1, 0.27 + (i === 1 ? 0.06 : 0), 0.28); ball.add(h); }
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 })); arrow.rotation.x = -Math.PI / 2; arrow.position.y = 0.03; scene.add(arrow);
    const bean = makeBean(THREE, color || beanColor()); bean.group.position.set(-3.5, 0, 13); bean.group.rotation.y = 0.9; scene.add(bean.group);
    // état de la manche
    const G = { state: "aim", roll: 0, ang: 0, pw: 0, t: 0, aimV: 0, bx: 0, drift: 0, ballT: 0, hitDone: false, after: 0, knocked: 0, cheer: 0 };
    const act = () => {
      if (G.state === "aim") { G.state = "power"; G.t = 0; setHint("Touche pour fixer la puissance (vise le vert)"); vib(8); }
      else if (G.state === "power") {
        G.state = "roll"; G.ballT = 0; G.hitDone = false; G.drift = (1 - G.pw) > 0.35 ? (r() < 0.5 ? -1 : 1) * (1 - G.pw - 0.35) * 2.4 : 0;
        G.speed = 9 + G.pw * 10; setHint("…"); vib(14);
      }
    };
    el.addEventListener("pointerdown", act);
    const keys = {}, offKeys = bindKeys(keys), prev = {};
    const knock = () => {
      const x = G.bx;
      let n = 0;
      for (const p of pins) if (!p.down && Math.abs(p.x - x) < 0.42) { p.down = true; p.t = 0; p.dirx = (p.x - x) * 1.4 + (r() - 0.5) * 0.6; p.dirz = 1; n++; }
      for (let pass = 0; pass < 2; pass++) for (const a of pins) if (a.down && a.t === 0) for (const b of pins) if (!b.down && Math.hypot(a.x - b.x, a.z - b.z) < 0.85 && r() < 0.72) { b.down = true; b.t = 0; b.dirx = (b.x - a.x) * 1.2; b.dirz = 1; n++; }
      return n;
    };
    const reset = () => { for (const p of pins) { p.down = false; p.g.position.set(p.x, 0, p.z); p.g.rotation.set(0, 0, 0); p.g.visible = true; p.t = 0; } ball.position.set(0, 0.34, Z0 + 1.2); G.state = "aim"; G.t = 0; setHint("Touche pour fixer la direction"); };
    return {
      update(dt, tt) {
        if ((keys.act || keys.up) && !prev.k) act();
        prev.k = keys.act || keys.up;
        G.cheer = Math.max(0, G.cheer - dt);
        if (G.state === "aim") {
          G.t += dt; G.ang = Math.sin(G.t * 2.3) * 0.105;
          arrow.visible = true; arrow.position.set(ball.position.x + Math.sin(G.ang) * 6, 0.03, ball.position.z + Math.cos(G.ang) * 6); arrow.rotation.z = G.ang;
          ball.position.x = 0;
        } else if (G.state === "power") {
          G.t += dt; G.pw = (Math.sin(G.t * 3.2 - Math.PI / 2) + 1) / 2; // 0 → 1 → 0
          arrow.position.set(Math.sin(G.ang) * 6, 0.03, Math.cos(G.ang) * 6 + 1.2); arrow.material.color.set(G.pw > 0.72 ? 0x6dff9a : G.pw > 0.45 ? 0xffd23f : 0xff5d73); arrow.scale.x = 0.6 + G.pw;
        } else if (G.state === "roll") {
          arrow.visible = false;
          G.ballT += dt; const d = G.ballT * G.speed;
          const frac = clamp(d / (ZP - Z0 - 1.2), 0, 1);
          ball.position.z = Z0 + 1.2 + d;
          ball.position.x = Math.tan(G.ang) * d + G.drift * frac * frac;
          ball.rotation.x += dt * 14;
          if (Math.abs(ball.position.x) > LANE_W / 2 + 0.2 && !G.hitDone) { ball.position.y = lerp(ball.position.y, 0.2, 0.2); }
          if (d >= ZP - Z0 - 1.2 && !G.hitDone) {
            G.hitDone = true; G.bx = ball.position.x;
            G.knocked = Math.abs(G.bx) > LANE_W / 2 ? 0 : knock();
            const n = pins.filter((p) => p.down).length;
            const v = n * 10 + (n === 10 ? 20 : 0);
            S.pts += v; sc.set(S.pts);
            G.cheer = n >= 7 ? 1.4 : 0; vib(n ? [20, 20, 20] : 5);
            const sp = textSprite(THREE, n === 10 ? "STRIKE !" : n ? `+${v}` : "Raté…", { color: n ? "#ffd23f" : "#ff5d73", w: 384 }); sp.position.set(0, 2.6, ZP - 2); scene.add(sp); G.sp = sp; G.spT = 1.4;
            setHint(n === 10 ? "Strike !" : n ? `${n} quille${n > 1 ? "s" : ""} !` : "Dans la rigole…");
            G.after = 0;
          }
          if (G.hitDone) { G.after += dt; if (ball.position.z < ZP + 2.6) ball.position.z += dt * 5; if (G.after > 1.8) { G.roll++; if (G.sp) { G.sp.removeFromParent(); G.sp = null; } if (G.roll >= ROLLS) { G.state = "end"; if (!S.done) { S.done = true; finish(S.pts); } } else reset(); } }
        }
        for (const p of pins) if (p.down) { p.t += dt; const k = clamp(p.t / 0.45, 0, 1); p.g.rotation.x = k * 1.5; p.g.rotation.z = -p.dirx * k * 0.9; p.g.position.z = p.z + p.dirz * k * 0.9; p.g.position.x = p.x + p.dirx * k * 0.5; p.g.position.y = Math.sin(k * Math.PI) * 0.3; if (p.t > 1.4) p.g.visible = false; }
        if (G.sp) { G.spT -= dt; G.sp.position.y += dt * 0.5; G.sp.material.opacity = Math.min(1, G.spT); }
        bean.anim({ cheer: G.cheer > 0, t: tt });
        camera.position.set(ball.position.x * 0.35, 3.1, clamp(ball.position.z - 5, -3.6, 8));
        camera.lookAt(0, 0.4, ZP - 1);
      },
      dispose() { el.removeEventListener("pointerdown", act); offKeys(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Bowling : touche l'écran deux fois, direction puis puissance" onFail={() => finish(0)} />
      <p className="mgsub" data-testid="bowling-hint" aria-live="polite">{hint}</p>
    </div>
  );
}
