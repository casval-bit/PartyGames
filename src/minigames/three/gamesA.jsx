// Mini-jeux 3D (1/2) : course d'obstacles, plancher qui s'effondre, arène de sumo, barre tournante, chasse aux pièces.
import { useRef } from "react";
import {
  Stage3D, useReady, candyWorld, plastic, withOutline, box, makeBean, textSprite, bindKeys, bindStick, HoldBtn, beanColor, BOT_COLORS,
  clamp, lerp, wrapPi, rng, ri, useFinish, useScore, useClock, TimeBar, vib,
} from "./kit3d.jsx";

const COL = { pink: 0xff7eb6, yellow: 0xffd23f, cyan: 0x4cc9f0, purple: 0xb185ff, green: 0x6be28e, orange: 0xff9a3c, red: 0xff5d73, white: 0xffffff, navy: 0x1d2457 };
const swipeDir = (el, on) => {
  let sx = 0, sy = 0, id = null;
  const d = (e) => { id = e.pointerId; sx = e.clientX; sy = e.clientY; };
  const u = (e) => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) on(dx < 0 ? "left" : "right");
    else if (dy < -26) on("up");
    else if (Math.abs(dx) < 14 && Math.abs(dy) < 14) on("tap");
  };
  el.addEventListener("pointerdown", d); el.addEventListener("pointerup", u);
  return () => { el.removeEventListener("pointerdown", d); el.removeEventListener("pointerup", u); };
};

/* ============================ 1. Course de haricots ============================ */
const LANES = [-2.2, 0, 2.2];
export function FgRun({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ dist: 0, over: false }).current, act = useRef({}).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(Math.round(S.dist)), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0x9fe3ff, fog: [28, 70] });
    const r = rng(seed), bean = makeBean(THREE, color || beanColor());
    scene.add(bean.group);
    const road = new THREE.Group(); scene.add(road);
    const tiles = [];
    for (let i = 0; i < 18; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 6), plastic(THREE, i % 2 ? 0xc9b6ff : 0xb095ff));
      t.position.set(0, -0.25, i * 6 - 12); road.add(t); tiles.push(t);
      for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 10), plastic(THREE, i % 2 ? COL.red : COL.white)); rail.rotation.x = Math.PI / 2; rail.position.set(s * 4, 0.2, 0); withOutline(THREE, rail, 1.12); t.add(rail); }
    }
    // obstacles : tirés avec la graine, donc identiques pour tous les joueurs
    const obs = [];
    let z = 26, n = 0;
    while (z < 700) {
      const kind = r() < 0.5 ? "wall" : r() < 0.6 ? "bar" : "combo";
      const free = ri(r, 0, 2), lanes = kind === "bar" ? [] : [0, 1, 2].filter((l) => l !== free && (r() < 0.8 || l === (free + 1) % 3));
      if (kind !== "bar" && !lanes.length) lanes.push((free + 1) % 3);
      const add = (zz, ls, bar) => {
        if (bar) { const m = box(THREE, 7.2, 0.55, 0.7, COL.orange); m.position.set(0, 0.27, zz); scene.add(m); obs.push({ z: zz, bar: true, mesh: m }); }
        else for (const l of ls) { const m = box(THREE, 1.9, 1.7, 1.1, l % 2 ? COL.red : COL.yellow); m.position.set(LANES[l], 0.85, zz); scene.add(m); obs.push({ z: zz, lane: l, mesh: m }); }
      };
      if (kind === "wall") add(z, lanes);
      else if (kind === "bar") add(z, [], true);
      else { add(z, lanes); add(z + 6.5, [], true); }
      z += Math.max(11, 20 - n * 0.35) + r() * 4; n++;
    }
    const pop = textSprite(THREE, "Aïe !", { color: "#ffd23f" });
    pop.visible = false; scene.add(pop);
    const P = { z: 0, x: 0, lane: 1, y: 0, vy: 0, stun: 0, inv: 0, speed: 0, t: 0 };
    const jump = () => { if (P.y <= 0.001 && P.stun <= 0) { P.vy = 9.2; vib(8); } };
    const go = (d) => { if (d === "left") P.lane = Math.max(0, P.lane - 1); else if (d === "right") P.lane = Math.min(2, P.lane + 1); else if (d === "up" || d === "tap") jump(); };
    act.go = go;
    const keys = {}, offKeys = bindKeys(keys), prevK = {};
    const offSw = swipeDir(el, go);
    return {
      update(dt, tt) {
        if (S.over) return;
        for (const k of ["left", "right", "up", "act"]) { if (keys[k] && !prevK[k]) go(k === "act" ? "up" : k); prevK[k] = keys[k]; }
        P.t += dt;
        const base = 8.5 + Math.min(5.5, P.t * 0.2);
        P.speed = P.stun > 0 ? lerp(P.speed, 1.5, dt * 8) : lerp(P.speed, base, dt * 2.2);
        P.stun = Math.max(0, P.stun - dt); P.inv = Math.max(0, P.inv - dt);
        P.z += P.speed * dt;
        P.x = lerp(P.x, LANES[P.lane], 1 - Math.exp(-dt * 14));
        P.vy -= 26 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0 && P.vy < 0) { if (P.vy < -4) bean.squash(0.25); P.vy = 0; }
        for (const o of obs) {
          if (P.inv > 0 || Math.abs(o.z - P.z) > 0.95) continue;
          const hit = o.bar ? P.y < 0.55 : Math.abs(P.x - LANES[o.lane]) < 1.35 && P.y < 1.4;
          if (hit) { P.stun = 0.8; P.inv = 1.6; P.speed = 0.5; P.z -= 1.4; S.dist = Math.max(0, S.dist - 6); vib([40, 30]); pop.visible = true; pop.position.set(P.x, 3, P.z); pop.userData.t = 0.9; }
        }
        if (pop.visible) { pop.userData.t -= dt; pop.position.y += dt * 1.4; if (pop.userData.t <= 0) pop.visible = false; }
        S.dist = Math.max(S.dist, P.z) - 0; // progression = le plus loin atteint (un obstacle fait reculer un peu)
        if (Math.floor(S.dist) !== sc.ref.current) sc.set(Math.floor(S.dist));
        bean.group.position.set(P.x, P.y, P.z);
        bean.group.visible = P.inv <= 0 || Math.floor(tt * 14) % 2 === 0;
        bean.shadow.position.y = 0.03 - P.y; bean.shadow.scale.setScalar(1 - Math.min(0.5, P.y * 0.3));
        bean.squash(Math.max(0, bean.body.scale.y < 1 ? (1 - bean.body.scale.y) * 0.8 : 0));
        bean.anim({ run: P.stun > 0 ? 0 : 1, air: P.y > 0.05, stun: P.stun > 0, t: tt });
        // route infinie : on recycle les dalles passées
        for (const t of tiles) if (t.position.z < P.z - 14) t.position.z += tiles.length * 6;
        camera.position.set(P.x * 0.55, 4.1, P.z - 6.6);
        camera.lookAt(P.x * 0.35, 1.1, P.z + 6);
      },
      dispose() { offKeys(); offSw(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val} m</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Course : glisse à gauche ou à droite, vers le haut pour sauter" onFail={() => finish(0)} />
      <div className="mgpads three">
        <HoldBtn label="Gauche" testid="run-left" on={(v) => v && act.go("left")}>◀</HoldBtn>
        <HoldBtn label="Sauter" testid="run-jump" on={(v) => v && act.go("up")}>⤒</HoldBtn>
        <HoldBtn label="Droite" testid="run-right" on={(v) => v && act.go("right")}>▶</HoldBtn>
      </div>
    </div>
  );
}

/* ============================ 2. Plancher fragile ============================ */
export function HexFall({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ t: 0, alive: true }).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(Math.round(S.t * 10) + (S.alive ? 40 : 0)), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xffc8e8, fog: [26, 60] });
    const r = rng(seed), N = 9, SZ = 2.2, half = (N * SZ) / 2 - SZ / 2;
    const pal = [COL.cyan, COL.pink, COL.yellow, COL.green, COL.purple];
    const tiles = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(SZ - 0.18, 0.6, SZ - 0.18), plastic(THREE, pal[(i + j) % pal.length]));
      withOutline(THREE, m, 1.03);
      m.position.set(i * SZ - half, -0.3, j * SZ - half); scene.add(m);
      tiles.push({ m, i, j, state: 0, timer: 0, vy: 0, base: m.position.clone() });
    }
    const at = (x, z) => { const i = Math.round((x + half) / SZ), j = Math.round((z + half) / SZ); return i < 0 || j < 0 || i >= N || j >= N ? null : tiles[i * N + j]; };
    const warn = (t, dur = 0.7) => { if (t && t.state === 0) { t.state = 1; t.timer = dur; } };
    const bean = makeBean(THREE, color || beanColor()); scene.add(bean.group);
    const P = { x: 0, z: 0, y: 0, vy: 0, fall: false, face: 0, vx: 0, vz: 0 };
    const bots = BOT_COLORS.slice(0, 3).map((c, k) => { const b = makeBean(THREE, c); scene.add(b.group); const o = { b, x: (k - 1) * 5, z: -4 + k * 3, y: 0, vy: 0, fall: false, tx: 0, tz: 0, wait: 0, face: 0 }; b.group.position.set(o.x, 0, o.z); return o; });
    const vec = { x: 0, y: 0 }, keys = {}, offKeys = bindKeys(keys), offStick = bindStick(el, vec);
    let acc = 0;
    return {
      update(dt, tt) {
        S.t += dt;
        // comportement des dalles
        acc -= dt;
        if (acc <= 0) { const solid = tiles.filter((t) => t.state === 0); if (solid.length) warn(solid[Math.floor(r() * solid.length)], 0.9); acc = Math.max(0.28, 1.15 - S.t * 0.032); }
        for (const t of tiles) {
          if (t.state === 1) { t.timer -= dt; t.m.position.x = t.base.x + (Math.random() - 0.5) * 0.08; t.m.material = plastic(THREE, COL.red, { emissive: 0x551018 }); if (t.timer <= 0) { t.state = 2; t.vy = 0; } }
          else if (t.state === 2) { t.vy -= 22 * dt; t.m.position.y += t.vy * dt; if (t.m.position.y < -18) { t.state = 3; t.m.visible = false; } }
        }
        const solidAt = (x, z) => { const t = at(x, z); return t && (t.state === 0 || t.state === 1) ? t : null; };
        // joueur
        const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), kz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        const ix = vec.x || kx, iz = vec.y || kz, m = Math.hypot(ix, iz);
        if (!P.fall) {
          const sp = 5.6, tx = m > 0.08 ? (ix / Math.max(1, m)) * sp : 0, tz = m > 0.08 ? (iz / Math.max(1, m)) * sp : 0;
          P.vx = lerp(P.vx, tx, 1 - Math.exp(-dt * 12)); P.vz = lerp(P.vz, tz, 1 - Math.exp(-dt * 12));
          P.x += P.vx * dt; P.z += P.vz * dt;
          if (m > 0.08) P.face = Math.atan2(ix, iz);
          const under = solidAt(P.x, P.z);
          if (under) { warn(under); } else if (S.alive) { P.fall = true; P.vy = 0; S.alive = false; vib([60, 40, 60]); setTimeout(() => finish(Math.round(S.t * 10)), 1100); }
        } else { P.vy -= 24 * dt; P.y += P.vy * dt; P.x += P.vx * dt * 0.5; P.z += P.vz * dt * 0.5; }
        bean.group.position.set(P.x, P.y, P.z);
        bean.group.rotation.y = P.face;
        bean.group.rotation.x = P.fall ? Math.min(1.2, -P.y * 0.08) : 0;
        bean.shadow.visible = !P.fall;
        bean.anim({ run: Math.min(1, Math.hypot(P.vx, P.vz) / 5), fall: P.fall, t: tt });
        // faux concurrents : ils marchent vers une dalle saine et tombent comme les autres
        for (const o of bots) {
          if (o.fall) { o.vy -= 24 * dt; o.y += o.vy * dt; o.b.group.position.y = o.y; o.b.anim({ fall: true, t: tt }); continue; }
          o.wait -= dt;
          const under = solidAt(o.x, o.z);
          if (o.wait <= 0 || (under && under.state === 1 && r() < 0.05)) { const cand = tiles.filter((t) => t.state === 0); if (cand.length) { const t = cand[Math.floor(r() * cand.length)]; o.tx = t.base.x; o.tz = t.base.z; } o.wait = 0.8 + r() * 1.6; }
          const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz);
          if (d > 0.2) { o.x += (dx / d) * 3.4 * dt; o.z += (dz / d) * 3.4 * dt; o.face = Math.atan2(dx, dz); }
          if (!under) { o.fall = true; o.vy = 0; }
          o.b.group.position.set(o.x, 0, o.z); o.b.group.rotation.y = o.face;
          o.b.anim({ run: d > 0.3 ? 1 : 0, t: tt + o.x });
        }
        if (Math.floor(S.t) * 10 !== sc.ref.current) sc.set(Math.floor(S.t) * 10);
        camera.position.set(P.x * 0.9, 9.5, P.z + 8);
        camera.lookAt(P.x * 0.9, 0, P.z - 0.5);
      },
      dispose() { offKeys(); offStick(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Plancher fragile : glisse pour te déplacer" onFail={() => finish(0)} />
      <p className="mgsub">Glisse le doigt pour courir : une dalle disparaît peu après ton passage !</p>
    </div>
  );
}

/* ============================ 3. Arène de sumo ============================ */
export function Sumo({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ t: 0, kills: 0, alive: true }).current, act = useRef({}).current;
  const calc = () => Math.round(S.t * 10) + S.kills * 40 + (S.alive ? 60 : 0);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(calc()), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xa9e6ff, fog: [30, 70] });
    const r = rng(seed), R0 = 6.2, R1 = 3.7, ARENA = new THREE.Group();
    scene.add(ARENA);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.7, 40), plastic(THREE, COL.pink)); plat.position.y = -0.35; withOutline(THREE, plat, 1.03);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), plastic(THREE, COL.yellow)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01;
    ARENA.add(plat, ring);
    const W = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x5fb6ff })); W.rotation.x = -Math.PI / 2; W.position.y = -6; scene.add(W);
    const mk = (c, x, z, bot) => { const b = makeBean(THREE, c); b.group.scale.setScalar(1.25); scene.add(b.group); return { b, x, z, vx: 0, vz: 0, y: 0, vy: 0, out: false, hidden: false, dash: 0, cd: 0, face: 0, bot, last: null, lastT: -9, think: 0, tx: 0, tz: 0 }; };
    const me = mk(color || beanColor(), 0, 3.2, false);
    const foes = [mk(BOT_COLORS[0], -3, -2.4, true), mk(BOT_COLORS[1], 3, -2.4, true), mk(BOT_COLORS[3], 0, -4.4, true)];
    const all = [me, ...foes];
    const vec = { x: 0, y: 0 }, keys = {}, offKeys = bindKeys(keys), offStick = bindStick(el, vec);
    const dash = (o) => { if (o.cd > 0 || o.out) return; o.dash = 0.28; o.cd = 1.3; const s = Math.hypot(o.vx, o.vz) || 1; const dx = Math.hypot(o.vx, o.vz) > 0.5 ? o.vx / s : Math.sin(o.face), dz = Math.hypot(o.vx, o.vz) > 0.5 ? o.vz / s : Math.cos(o.face); o.vx = dx * 12; o.vz = dz * 12; if (!o.bot) vib(12); };
    act.dash = () => dash(me);
    let endAt = null;
    return {
      update(dt, tt) {
        S.t += dt;
        const R = lerp(R0, R1, clamp(S.t / seconds, 0, 1));
        plat.scale.set(R, 1, R); ring.scale.set(R, R, 1);
        const ix = vec.x || (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iz = vec.y || (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (keys.act && me.cd <= 0) dash(me);
        for (const o of all) {
          if (o.out) { o.vy -= 22 * dt; o.y += o.vy * dt; o.x += o.vx * dt; o.z += o.vz * dt; if (o.y < -8) o.hidden = true; continue; }
          let ax = 0, az = 0;
          if (!o.bot) { const m = Math.hypot(ix, iz); if (m > 0.08) { ax = (ix / Math.max(1, m)) * 34; az = (iz / Math.max(1, m)) * 34; o.face = Math.atan2(ix, iz); } }
          else {
            o.think -= dt;
            if (o.think <= 0) { const cand = all.filter((x) => x !== o && !x.out); const t = cand.length ? (r() < 0.6 && !me.out ? me : cand[Math.floor(r() * cand.length)]) : null; o.tgt = t; o.think = 0.5 + r() * 0.7; }
            const t = o.tgt && !o.tgt.out ? o.tgt : null;
            const edge = Math.hypot(o.x, o.z);
            if (edge > R - 1.1) { ax = (-o.x / edge) * 30; az = (-o.z / edge) * 30; }
            else if (t) { const dx = t.x - o.x, dz = t.z - o.z, d = Math.hypot(dx, dz) || 1; ax = (dx / d) * 22; az = (dz / d) * 22; o.face = Math.atan2(dx, dz); if (d < 3 && o.cd <= 0 && r() < 0.03 + S.t * 0.001) dash(o); }
          }
          o.vx += ax * dt; o.vz += az * dt;
          const damp = Math.exp(-(o.dash > 0 ? 0.6 : 2.4) * dt); o.vx *= damp; o.vz *= damp;
          const sp = Math.hypot(o.vx, o.vz), cap = o.dash > 0 ? 14 : 6.2;
          if (sp > cap) { o.vx *= cap / sp; o.vz *= cap / sp; }
          o.dash = Math.max(0, o.dash - dt); o.cd = Math.max(0, o.cd - dt);
          o.x += o.vx * dt; o.z += o.vz * dt;
        }
        // collisions entre haricots : on se repousse, le dash pousse fort
        for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
          const p = all[a], q = all[b];
          if (p.out || q.out) continue;
          const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
          if (d < 1.4 && d > 0.001) {
            const nx = dx / d, nz = dz / d, ov = 1.4 - d;
            p.x -= nx * ov / 2; p.z -= nz * ov / 2; q.x += nx * ov / 2; q.z += nz * ov / 2;
            const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
            const kick = Math.max(0, -rv) + 1.5 + (p.dash > 0 ? 7 : 0) + (q.dash > 0 ? 7 : 0);
            const pw = (p.dash > 0 ? 1.8 : 1) / ((p.dash > 0 ? 1.8 : 1) + (q.dash > 0 ? 1.8 : 1));
            q.vx += nx * kick * pw * 1.2; q.vz += nz * kick * pw * 1.2; p.vx -= nx * kick * (1 - pw) * 1.2; p.vz -= nz * kick * (1 - pw) * 1.2;
            if (p.dash > 0 || q.dash > 0) { const hitter = p.dash > q.dash ? p : q, victim = hitter === p ? q : p; victim.last = hitter; victim.lastT = S.t; if (!hitter.bot || !victim.bot) vib(18); }
          }
        }
        for (const o of all) {
          if (!o.out && Math.hypot(o.x, o.z) > R + 0.2) {
            o.out = true; o.vy = 2;
            if (o.bot && o.last === me && S.t - o.lastT < 3) { S.kills++; vib([30, 30]); }
            if (!o.bot) { S.alive = false; vib([80, 40, 80]); endAt = S.t + 1.3; }
          }
          o.b.group.visible = !o.hidden;
          o.b.group.position.set(o.x, o.y, o.z);
          o.b.group.rotation.y = o.out ? o.b.group.rotation.y + dt * 6 : o.face;
          o.b.shadow.visible = !o.out;
          o.b.anim({ run: Math.min(1, Math.hypot(o.vx, o.vz) / 5), fall: o.out, stun: o.dash > 0, t: tt + o.x });
        }
        if (endAt != null && S.t >= endAt) { endAt = null; finish(calc()); }
        if (calc() !== sc.ref.current && S.alive) sc.set(calc());
        camera.position.set(0, 18, 11.5);
        camera.lookAt(0, 0, 0.6);
      },
      dispose() { offKeys(); offStick(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Sumo : glisse pour bouger, bouton pour foncer" onFail={() => finish(0)} />
      <div className="mgpads">
        <HoldBtn label="Foncer" testid="sumo-dash" className="wide" on={(v) => v && act.dash()}>💥 Foncer !</HoldBtn>
      </div>
    </div>
  );
}

/* ============================ 4. Barre tournante ============================ */
export function JumpClub({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ passes: 0, out: false }).current, act = useRef({}).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(S.passes), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xffe3a3, fog: [22, 55] });
    const r = rng(seed), RAD = 6;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x45c6ff })); water.rotation.x = -Math.PI / 2; water.position.y = -3; scene.add(water);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 0.8, 48), plastic(THREE, COL.cyan)); plat.position.y = -0.4; withOutline(THREE, plat, 1.015); scene.add(plat);
    for (let i = 0; i < 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1 + i * 0.95, 0.045, 6, 56), plastic(THREE, i % 2 ? COL.white : COL.yellow)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.4, 14), plastic(THREE, COL.pink)); pole.position.y = 0.7; withOutline(THREE, pole, 1.08); scene.add(pole);
    const arm = new THREE.Group(); arm.position.y = 0.52; scene.add(arm);
    for (let i = 0; i < 6; i++) { const seg = box(THREE, 2 * RAD / 6 - 0.04, 0.5, 0.5, i % 2 ? COL.white : COL.red); seg.position.x = -RAD + RAD / 6 + i * (2 * RAD / 6); arm.add(seg); }
    const PH = 0, RB = 3.6, mkAt = (a, c) => { const b = makeBean(THREE, c); b.group.position.set(Math.sin(a) * RB, 0, Math.cos(a) * RB); b.group.rotation.y = a + Math.PI; scene.add(b.group); return { b, a, x: Math.sin(a) * RB, z: Math.cos(a) * RB, y: 0, vy: 0, out: false, vx: 0, vz: 0, skill: 0.75 + r() * 0.2 }; };
    const me = mkAt(PH, color || beanColor());
    const foes = [1.3, 2.3, 3.4, 4.5, 5.4].map((a, k) => mkAt(a, BOT_COLORS[k % BOT_COLORS.length]));
    let th = 0, dir = 1, omega = 1.6, nextFlip = 5 + r() * 3, t = 0, lastK = Math.floor((0 - me.a) / Math.PI);
    const jump = (o) => { if (o.y <= 0.001 && !o.out) { o.vy = 8.4; if (o === me) vib(8); } };
    act.jump = () => jump(me);
    const keys = {}, offKeys = bindKeys(keys), prev = {};
    const onDown = () => jump(me);
    el.addEventListener("pointerdown", onDown);
    const HALF = 0.2; // demi-largeur de la barre vue depuis le centre, en radians
    const gap = (a) => { const d = Math.abs(wrapPi(th - a)); return Math.min(d, Math.PI - d); }; // écart angulaire entre la barre et la direction a
    return {
      update(dt, tt) {
        t += dt;
        if ((keys.act || keys.up) && !prev.j) jump(me);
        prev.j = keys.act || keys.up;
        omega = Math.min(3.5, 1.6 + t * 0.07);
        if (t > nextFlip) { dir = -dir; nextFlip = t + 5 + r() * 4; }
        th += dir * omega * dt;
        arm.rotation.y = th;
        for (const o of [me, ...foes]) {
          if (o.out) { o.vy -= 22 * dt; o.y += o.vy * dt; o.x += o.vx * dt; o.z += o.vz * dt; o.b.group.position.set(o.x, o.y, o.z); o.b.group.rotation.x += dt * 6; o.b.anim({ fall: true, t: tt }); continue; }
          const m = gap(o.a);
          if (o !== me) {
            const approaching = o.pm != null && m < o.pm;
            if (approaching && m < HALF + omega * 0.3 && !o.decided) { o.decided = true; o.will = Math.random() < o.skill; if (o.will) jump(o); }
            if (m > 0.9) o.decided = false;
            o.pm = m;
          }
          o.vy -= 24 * dt; o.y = Math.max(0, o.y + o.vy * dt); if (o.y === 0 && o.vy < 0) o.vy = 0;
          if (m < HALF && o.y < 0.55) {
            o.out = true; o.vy = 6; const sg = dir > 0 ? 1 : -1;
            o.vx = Math.cos(o.a) * 7 * sg + Math.sin(o.a) * 3; o.vz = -Math.sin(o.a) * 7 * sg + Math.cos(o.a) * 3;
            if (o === me) { S.out = true; vib([80, 40, 80]); setTimeout(() => finish(S.passes), 1200); }
          }
          o.b.group.position.set(o.x, o.y, o.z);
          o.b.anim({ air: o.y > 0.05, t: tt });
        }
        // une « passe » réussie : la barre vient de dépasser mon haricot sans l'avoir touché
        const k = Math.floor((th - me.a) / Math.PI);
        if (k !== lastK) { lastK = k; if (!S.out) { S.passes++; sc.set(S.passes); vib(10); } }
        camera.position.set(me.x * 1.7, 4.2, me.z * 1.7 + 0.5);
        camera.lookAt(0, 0.4, -0.2);
      },
      dispose() { offKeys(); el.removeEventListener("pointerdown", onDown); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Barre tournante : touche pour sauter" onFail={() => finish(0)} />
      <div className="mgpads"><HoldBtn label="Sauter" testid="jc-jump" className="wide" on={(v) => v && act.jump()}>⤒ Sauter</HoldBtn></div>
    </div>
  );
}

/* ============================ 5. Chasse aux pièces ============================ */
export function CoinChase({ seed, seconds, onFinish, color }) {
  const finish = useFinish(onFinish), sc = useScore();
  const S = useRef({ coins: 0 }).current;
  const rd = useReady();
  const clock = useClock(seconds, () => finish(S.coins * 10), rd.ready);
  const setup = ({ THREE, scene, camera, el }) => {
    candyWorld(THREE, scene, { sky: 0xb7f0c8, fog: [30, 70] });
    const r = rng(seed), R = 6.2;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 0.6, 48), plastic(THREE, COL.green)); floor.position.y = -0.3; withOutline(THREE, floor, 1.02); scene.add(floor);
    for (let i = 0; i < 5; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 1.2, 0.05, 6, 56), plastic(THREE, i % 2 ? 0x57d081 : 0x8ff0ad)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring); }
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20);
    const gold = plastic(THREE, 0xffc928, { rough: 0.25, emissive: 0x6b4a00 }), silver = plastic(THREE, 0xffd76a, { rough: 0.3 });
    const coins = [];
    const place = (c) => { let ok = false; for (let k = 0; k < 20 && !ok; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - 0.9); c.x = Math.cos(a) * d; c.z = Math.sin(a) * d; ok = Math.hypot(c.x - P.x, c.z - P.z) > 2; } c.big = r() < 0.12; c.m.scale.setScalar(c.big ? 1.5 : 1); c.m.material = c.big ? gold : silver; c.m.visible = true; };
    const bean = makeBean(THREE, color || beanColor()); bean.group.scale.setScalar(1.2); scene.add(bean.group);
    const P = { x: 0, z: 0, vx: 0, vz: 0, face: 0, stun: 0 };
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(coinGeo, silver); withOutline(THREE, m, 1.1); m.rotation.x = Math.PI / 2; const holder = new THREE.Group(); holder.add(m); scene.add(holder); const c = { m: holder, x: 0, z: 0, big: false, ph: r() * 6 }; holder.children[0].rotation.x = Math.PI / 2; coins.push(c); place(c); }
    const rocks = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), plastic(THREE, COL.red)); withOutline(THREE, m, 1.06); scene.add(m); const a = r() * 6.28; return { m, x: Math.cos(a) * 4, z: Math.sin(a) * 4, vx: Math.cos(a + 1.7) * (3 + k * 0.7), vz: Math.sin(a + 1.7) * (3 + k * 0.7) }; });
    const vec = { x: 0, y: 0 }, keys = {}, offKeys = bindKeys(keys), offStick = bindStick(el, vec);
    return {
      update(dt, tt) {
        const ix = vec.x || (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iz = vec.y || (keys.down ? 1 : 0) - (keys.up ? 1 : 0), m = Math.hypot(ix, iz);
        P.stun = Math.max(0, P.stun - dt);
        const sp = P.stun > 0 ? 1.2 : 6.4;
        P.vx = lerp(P.vx, m > 0.08 ? (ix / Math.max(1, m)) * sp : 0, 1 - Math.exp(-dt * 12)); P.vz = lerp(P.vz, m > 0.08 ? (iz / Math.max(1, m)) * sp : 0, 1 - Math.exp(-dt * 12));
        P.x += P.vx * dt; P.z += P.vz * dt;
        const d = Math.hypot(P.x, P.z); if (d > R) { P.x *= R / d; P.z *= R / d; }
        if (m > 0.08) P.face = Math.atan2(ix, iz);
        for (const c of coins) {
          c.m.position.set(c.x, 0.7 + Math.sin(tt * 3 + c.ph) * 0.12, c.z); c.m.rotation.y = tt * 3 + c.ph;
          if (Math.hypot(c.x - P.x, c.z - P.z) < (c.big ? 1.15 : 0.95)) { const v = c.big ? 3 : 1; S.coins += v; sc.set(S.coins * 10); const np = textSprite(THREE, `+${v * 10}`, { color: c.big ? "#ff9a3c" : "#ffd23f" }); np.position.set(c.x, 1.6, c.z); np.userData.t = 0.7; scene.add(np); S.pops = [...(S.pops || []), np]; vib(8); place(c); }
        }
        for (const p of S.pops || []) { p.userData.t -= dt; p.position.y += dt * 1.8; p.material.opacity = Math.max(0, p.userData.t / 0.7); if (p.userData.t <= 0) { p.removeFromParent(); p.userData.dead = true; } }
        S.pops = (S.pops || []).filter((p) => !p.userData.dead);
        for (const k of rocks) {
          k.x += k.vx * dt; k.z += k.vz * dt; const rr = Math.hypot(k.x, k.z);
          if (rr > R - 0.4) { const nx = k.x / rr, nz = k.z / rr, dot = k.vx * nx + k.vz * nz; k.vx -= 2 * dot * nx; k.vz -= 2 * dot * nz; k.x = nx * (R - 0.45); k.z = nz * (R - 0.45); }
          k.m.position.set(k.x, 0.75, k.z); k.m.rotation.x += dt * 4; k.m.rotation.z += dt * 3;
          if (P.stun <= 0 && Math.hypot(k.x - P.x, k.z - P.z) < 1.3) { P.stun = 1.1; vib([50, 30]); const nx = (P.x - k.x) || 0.01, nz = (P.z - k.z) || 0.01, nn = Math.hypot(nx, nz); P.vx = (nx / nn) * 9; P.vz = (nz / nn) * 9; }
        }
        bean.group.position.set(P.x, 0, P.z); bean.group.rotation.y = P.face; bean.group.visible = P.stun <= 0 || Math.floor(tt * 16) % 2 === 0;
        bean.anim({ run: Math.min(1, Math.hypot(P.vx, P.vz) / 5), stun: P.stun > 0, t: tt });
        camera.position.set(0, 17, 11);
        camera.lookAt(0, 0, 0.5);
      },
      dispose() { offKeys(); offStick(); },
    };
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Stage3D onReady={rd.onReady} setup={setup} label="Chasse aux pièces : glisse pour te déplacer" onFail={() => finish(0)} />
      <p className="mgsub">Ramasse les pièces, évite les boulets rouges !</p>
    </div>
  );
}
