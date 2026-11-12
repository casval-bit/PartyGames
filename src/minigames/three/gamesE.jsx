// Mini-jeux d'arène 3D « à la Pummel Party » (3/3) : pilotes de l'extrême, palets glacés, labyrinthe, boules de neige géantes.
import { useRef } from "react";
import { Icon } from "../../ui/Icon.jsx";
import { useReady, candyWorld, plastic, withOutline, makeBean, textSprite, HoldBtn, clamp, wrapPi, useFinish, useScore, useClock, vib } from "./kit3d.jsx";
import { Shell, Chips, useSig, makeInput, fitCamera, mkActor, cast, makeFx, makeShake, discArena, abyss, COL } from "./party.jsx";
import { createSky, SK } from "../sim/sky.js";
import { createPucks, PK, ringValue } from "../sim/pucks.js";
import { createMaze, MZ } from "../sim/maze.js";
import { createSnow, SN } from "../sim/snow.js";

const NAMES = ["Toi", "Rouge", "Vert", "Bleu"];
const RING_COLS = [COL.pink, COL.yellow, COL.cyan, COL.purple, COL.green, COL.orange];

/** Fusionne plusieurs géométries indexées en une seule (une mine = un seul objet à dessiner). */
function mergeGeos(THREE, list) {
  const pos = [], nor = [], idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx);
  return out;
}

/* ============================ Pilotes de l'extrême ============================ */
function makePlane(THREE, color, look) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = plastic(THREE, color, { rough: 0.35 }), white = plastic(THREE, 0xffffff, { rough: 0.4 }), dark = plastic(THREE, 0x2b2f5e), yellow = plastic(THREE, COL.yellow);
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.5, 6, 14), white); fus.rotation.x = Math.PI / 2; withOutline(THREE, fus, 1.07); body.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.09, 0.78), paint); wing.position.set(0, 0.02, 0.18); withOutline(THREE, wing, 1.05); body.add(wing);
  for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.8), white); tip.position.set(s * 1.1, 0.025, 0.18); body.add(tip); }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.435, 0.435, 0.3, 14, 1, true), paint); band.rotation.x = Math.PI / 2; band.position.z = -0.55; body.add(band);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.38), paint); tail.position.set(0, 0.12, -1.2); withOutline(THREE, tail, 1.06); body.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.42), paint); fin.position.set(0, 0.38, -1.2); withOutline(THREE, fin, 1.08); body.add(fin);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), yellow); hub.position.z = 1.6; body.add(hub);
  const prop = new THREE.Group(); prop.position.z = 1.66;
  for (const a of [0, Math.PI / 2]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.03), dark); bl.rotation.z = a; prop.add(bl); }
  const blur = new THREE.Mesh(new THREE.CircleGeometry(0.62, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); prop.add(blur);
  body.add(prop);
  const bean = makeBean(THREE, color, look); bean.group.scale.setScalar(0.56); bean.group.position.set(0, 0.04, 0.12);
  if (bean.shadow) bean.shadow.visible = false;
  body.add(bean.group);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.2, roughness: 0.1 })); glass.position.set(0, 0.46, 0.12); glass.scale.set(1, 1, 1.35); body.add(glass);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.4, 10), new THREE.MeshBasicMaterial({ color: 0xffa43c, transparent: true, opacity: 0.9 })); flame.rotation.x = -Math.PI / 2; flame.position.z = -2.0; flame.visible = false; body.add(flame);
  return { group: g, body, prop, flame, bean };
}

export function SkyPilots({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const [pct, setPct] = useSig(35);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "ice", fog: [60, 200] });
    camera.far = 260; camera.updateProjectionMatrix();
    const sim = createSky(seed, { seconds }), S = sim.S, C = S.course;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.turbo = (v) => input.set("act", v);
    const cs = cast(color, look);
    // mer, nuages, îles flottantes (recyclés autour de la caméra)
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x3fb6e8 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -17; scene.add(sea);
    const puffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true, emissive: 0x6d86c8, emissiveIntensity: 0.18 });
    const clouds = Array.from({ length: 26 }, (_, i) => {
      const g = new THREE.Group(), n = 3 + (i % 3);
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7 + (k % 2) * 0.7, 1), puffMat); m.position.set((k - n / 2) * 1.9, (k % 2) * 0.5, (k % 3) * 0.6); m.scale.y = 0.7; g.add(m); }
      const side = i % 2 ? 1 : -1;
      g.userData = { x: side * (13 + ((i * 7) % 17)), y: -2 + ((i * 5) % 14) - 3, z: -20 + i * 11 };
      scene.add(g); return g;
    });
    const isleTop = [0x79e08f, 0xff9fc9, 0xffd86b], isleG = new THREE.ConeGeometry(2.4, 3.6, 9), topG = new THREE.CylinderGeometry(2.6, 2.4, 0.9, 12);
    const isles = Array.from({ length: 9 }, (_, i) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(isleG, plastic(THREE, 0xb98a5e)); base.rotation.x = Math.PI; base.position.y = -1.6; g.add(base);
      const top = new THREE.Mesh(topG, plastic(THREE, isleTop[i % 3])); g.add(top);
      const tree = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), plastic(THREE, 0x2fbf71)); tree.position.set(0.5, 1.2, 0.2); g.add(tree);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), plastic(THREE, 0x8a5a2b)); trunk.position.set(0.5, 0.55, 0.2); g.add(trunk);
      g.userData = { x: (i % 2 ? 1 : -1) * (11 + ((i * 5) % 12)), y: -13 + ((i * 3) % 5), z: i * 29, s: 0.8 + (i % 3) * 0.35 };
      g.scale.setScalar(g.userData.s); scene.add(g); return g;
    });
    // traînées de vitesse
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const streaks = Array.from({ length: 46 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.4), streakMat); m.userData = { a: Math.random() * 6.283, r: 3 + Math.random() * 9, z: Math.random() * 60 }; scene.add(m); return m; });
    // anneaux
    const ringGeo = new THREE.TorusGeometry(SK.ring, 0.3, 10, 44), zoneGeo = new THREE.TorusGeometry(SK.perfect, 0.035, 6, 28);
    const zoneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const rings = C.rings.map((r) => {
      const g = new THREE.Group(); g.position.set(r.x, r.y, r.z);
      const mat = new THREE.MeshStandardMaterial({ color: RING_COLS[r.hue], roughness: 0.4, emissive: RING_COLS[r.hue], emissiveIntensity: 0.28, transparent: true });
      const t = new THREE.Mesh(ringGeo, mat); g.add(t);
      const zone = new THREE.Mesh(zoneGeo, zoneMat.clone()); g.add(zone);
      scene.add(g); return { g, mat, zone, st: "wait", t: 0 };
    });
    // mines
    const mineGeo = (() => {
      const list = [new THREE.SphereGeometry(0.85, 16, 12)];
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, -0.7, 0.7], [0, 0.7, -0.7], [0, -0.7, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]];
      const up = new THREE.Vector3(0, 1, 0);
      for (const d of dirs) {
        const c = new THREE.ConeGeometry(0.26, 0.7, 8), v = new THREE.Vector3(...d).normalize(), q = new THREE.Quaternion().setFromUnitVectors(up, v);
        c.applyMatrix4(new THREE.Matrix4().compose(v.clone().multiplyScalar(1.0), q, new THREE.Vector3(1, 1, 1)));
        list.push(c);
      }
      return mergeGeos(THREE, list);
    })();
    const mineMat = plastic(THREE, 0xff4d6d, { rough: 0.45, emissive: 0x4a0a1c });
    const mines = C.mines.map((m) => { const o = new THREE.Mesh(mineGeo, mineMat); withOutline(THREE, o, 1.06); o.position.set(m.x, m.y, m.z); scene.add(o); return o; });
    // boules d'énergie
    const orbMat = new THREE.MeshStandardMaterial({ color: 0x59e6ff, emissive: 0x1fb8e6, emissiveIntensity: 0.9, roughness: 0.25 });
    const orbs = C.orbs.map((b) => {
      const g = new THREE.Group(); g.position.set(b.x, b.y, b.z);
      g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.6), orbMat));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xbff3ff, transparent: true, opacity: 0.8 })); g.add(halo);
      scene.add(g); return { g, halo };
    });
    // avions
    const planes = S.P.map((o, i) => {
      const pl = makePlane(THREE, cs[i].color, cs[i].look);
      scene.add(pl.group);
      return { o, pl, spinAng: 0, spinRest: 0 };
    });
    const hud = [];
    const say = (text, dx, y, dz, col, k) => { const p = fx.pop(text, 0, y, 0, col, k); hud.push({ p, dx, dz }); };
    let cur = size, lastSig = "", lastScore = -1, finished = false, camX = 0, camY = 0, fov = 60, started = false;

    const sync = (dt, tt) => {
      const me = S.me;
      for (const e of S.events) {
        if (e.type === "ring") {
          const rg = rings[e.k];
          if (e.i === 0) {
            rg.st = "pass"; rg.t = 0;
            fx.burst(e.x, e.y, e.z, e.perfect ? [0xffd23f, 0xffffff, 0xff7eb6] : [0xffffff, 0x4cc9f0], e.perfect ? 22 : 12, 6, 3);
            say(e.perfect ? "PARFAIT +" + e.gain : "+" + e.gain, 0, me.y + 1.7, 7, e.perfect ? "#ffd23f" : "#ffffff", e.perfect ? 1.05 : 0.8);
            if (e.combo >= 3 && e.combo % 3 === 0) say("COMBO ×" + e.combo, 0, me.y + 2.8, 7.5, "#ff7eb6", 0.9);
            vib(e.perfect ? [12, 20, 12] : 10);
          }
        } else if (e.type === "miss") {
          if (e.i === 0) { const rg = rings[e.k]; rg.st = "miss"; rg.t = 0; say("RATÉ", 0, me.y + 1.7, 7, "#ff9aa8", 0.75); }
        } else if (e.type === "mine") {
          fx.burst(e.x, e.y, e.z, [0xff5d73, 0xffd23f, 0xffa43c, 0xffffff], e.i === 0 ? 34 : 18, 9, 5);
          if (e.i === 0) { shake.add(1.0); vib([80, 30, 100]); say("AÏE !", 0, me.y + 1.8, 7, "#ff5d73", 0.95); }
          planes[e.i].spinRest = 1;
        } else if (e.type === "orb") {
          fx.burst(e.x, e.y, e.z, [0x59e6ff, 0xffffff, 0xbff3ff], 12, 5, 2);
          if (e.i === 0) { say("TURBO +", 0, me.y + 1.7, 7, "#59e6ff", 0.8); vib(14); }
        }
      }
      S.events.length = 0;
      const cz = me.z;
      for (let i = hud.length - 1; i >= 0; i--) { const h = hud[i]; if (h.p.t >= 1.1) { hud.splice(i, 1); continue; } h.p.sp.position.x = camX + h.dx; h.p.sp.position.z = me.z + h.dz; }
      // anneaux, mines, orbes : seulement autour de nous
      for (const rg of rings) {
        const z = rg.g.position.z, vis = z > cz - 3 && z < cz + 190;
        rg.g.visible = vis; if (!vis) continue;
        if (rg.st === "pass") { rg.t += dt; const k = Math.min(1, rg.t / 0.5); rg.g.scale.setScalar(1 + k * 0.9); rg.mat.opacity = 1 - k; rg.zone.material.opacity = 0.55 * (1 - k); if (k >= 1) rg.g.visible = false; }
        else if (rg.st === "miss") { rg.t += dt; rg.mat.color.setHex(0x8a90a8); rg.mat.emissive.setHex(0x000000); rg.mat.opacity = Math.max(0, 0.6 - rg.t * 1.4); rg.zone.visible = false; if (rg.t > 0.45) rg.g.visible = false; }
      }
      const nxt = rings[me.next];
      if (nxt && nxt.st === "wait") { const k = 1 + Math.sin(tt * 9) * 0.05; nxt.g.scale.setScalar(k); nxt.mat.emissiveIntensity = 0.55 + Math.sin(tt * 9) * 0.25; }
      C.mines.forEach((m, i) => { const o = mines[i]; const vis = m.z > cz - 10 && m.z < cz + 190; o.visible = vis; if (vis) { o.rotation.y += dt * 1.3; o.rotation.x += dt * 0.7; } });
      C.orbs.forEach((b, i) => { const o = orbs[i]; const vis = !b.taken[0] && b.z > cz - 10 && b.z < cz + 190; o.g.visible = vis; if (vis) { o.g.rotation.y += dt * 2.6; o.g.position.y = b.y + Math.sin(tt * 3 + i) * 0.18; o.halo.rotation.x = tt * 1.5; } });
      // décor recyclé
      for (const c of clouds) { const u = c.userData; while (u.z < cz - 14) { u.z += 290; u.x = (u.x > 0 ? 1 : -1) * (13 + Math.random() * 17); } c.position.set(u.x, u.y, u.z); }
      for (const g of isles) { const u = g.userData; while (u.z < cz - 14) u.z += 260; g.position.set(u.x, u.y + Math.sin(tt * 0.8 + u.z) * 0.25, u.z); }
      sea.position.z = cz + 60; sea.position.x = 0;
      for (const m of streaks) { const u = m.userData; if (u.z < cz - 4) { u.z = cz + 40 + Math.random() * 50; u.a = Math.random() * 6.283; u.r = 2.6 + Math.random() * 9; } m.position.set(camX + Math.cos(u.a) * u.r, camY + 1.5 + Math.sin(u.a) * u.r * 0.7, u.z); m.scale.z = 0.6 + Math.max(0, me.v - SK.v0) * 0.09; }
      // avions
      for (const a of planes) {
        const { o, pl } = a;
        pl.group.position.set(o.x, o.y, o.z);
        if (o.spin > 0) { a.spinAng += dt * 15; } else if (a.spinAng > 0) { const rest = Math.ceil(a.spinAng / 6.2832) * 6.2832; a.spinAng += (rest - a.spinAng) * Math.min(1, dt * 10); if (rest - a.spinAng < 0.05) a.spinAng = 0; }
        pl.group.rotation.set(-o.pitch, 0, o.roll + a.spinAng, "YXZ");
        pl.prop.rotation.z += dt * 55;
        pl.flame.visible = o.turbo; if (o.turbo) { pl.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1); pl.flame.material.color.setHex(Math.random() < 0.5 ? 0xffa43c : 0xffe066); }
        pl.group.visible = !(o.inv > 0 && o.spin <= 0 && Math.sin(tt * 40) > 0.4);
        pl.bean.anim({ run: 0, cheer: o.turbo, t: tt + o.i });
        if (o.turbo && Math.random() < 0.5) fx.burst(o.x, o.y, o.z - 1.9, [0xffa43c, 0xffe066], 1, 2, 0);
        if (o.spin > 0 && Math.random() < 0.6) fx.burst(o.x, o.y, o.z - 1, [0x888888, 0xffd23f], 1, 2.5, 1);
      }
      // pastilles
      const order = S.P.slice().sort((p, q) => q.pts - p.pts || q.z - p.z);
      const sig = JSON.stringify(order.map((o) => [o.i, o.rings, o.combo >= 3 ? o.combo : 0]));
      if (sig !== lastSig) { lastSig = sig; setChips(order.map((o, r) => ({ key: o.i, color: cs[o.i].color, text: (r + 1) + (r ? "e " : "er ") + NAMES[o.i] + " ◎" + o.rings + (o.i === 0 && o.combo >= 3 ? " ×" + o.combo : ""), me: o.i === 0, on: r === 0 }))); }
      setPct(Math.round(me.energy * 20) * 5);
      const v = sim.score();
      if (v !== lastScore) { lastScore = v; sc.set(v); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        const me = S.me;
        if (!started) { started = true; say("GO !", 0, me.y + 1.8, 9, "#ffd23f", 1.3); }
        // caméra de poursuite, qui suit en douceur
        const k = 1 - Math.exp(-6 * dt);
        camX += (me.x * 0.62 - camX) * k; camY += (me.y * 0.5 - camY) * k;
        const turboK = clamp((me.v - SK.v0) / (SK.v0 * 0.5), 0, 1);
        fov += ((60 + turboK * 12 + (me.spin > 0 ? 6 : 0)) - fov) * (1 - Math.exp(-5 * dt));
        if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
        const back = 8.6 + turboK * 1.2;
        camera.position.set(camX, camY + 2.4, me.z - back);
        camera.lookAt(me.x * 0.55, me.y * 0.55 + 0.7, me.z + 14);
        sync(dt, tt);
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Pilotes de l'extrême : dirige l'avion pour traverser les anneaux, évite les mines, bouton pour le turbo" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Turbo" testid="sk-turbo" className="wide" on={(v) => act.turbo && act.turbo(v)}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icon name="bolt" /> Turbo
          <span aria-hidden="true" style={{ display: "inline-block", width: 76, height: 12, borderRadius: 8, background: "rgba(0,0,0,.28)", overflow: "hidden", border: "2px solid #3a2b00" }}><i style={{ display: "block", height: "100%", width: pct + "%", background: pct > 20 ? "#25b8e8" : "#ff5d73", transition: "width .15s" }} /></span>
        </span>
      </HoldBtn>} />
  );
}

/* ============================ Palets glacés ============================ */
export function IcePucks({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "ice", fog: [40, 115] });
    abyss(THREE, scene, 0x8fd3ff, -5);
    const sim = createPucks(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    const cs = cast(color, look);
    // plateau de glace + cible
    scene.add(discArena(THREE, { R: 6.3, color: 0xdff6ff, ring: COL.cyan }));
    const disc = (r0, r1, c, y) => { const m = new THREE.Mesh(r0 > 0 ? new THREE.RingGeometry(r0, r1, 56) : new THREE.CircleGeometry(r1, 56), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.05 })); m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); };
    disc(0, PK.ring[3], 0x9ed8ff, 0.012); disc(0, PK.ring[2], 0xffffff, 0.016); disc(0, PK.ring[1], 0xff6b81, 0.02); disc(0, PK.ring[0], 0xffd23f, 0.024);
    PK.ring.forEach((rr, k) => { const sp = textSprite(THREE, String(PK.val[k]), { color: k === 3 ? "#1d2457" : "#ffffff", size: 56, w: 128, h: 128 }); sp.scale.set(0.85, 0.85, 1); sp.position.set(k === 0 ? 0 : (PK.ring[k - 1] + rr) / 2, 0.06, k === 0 ? 0.02 : -0.02); sp.material.depthTest = false; sp.renderOrder = 2; sp.material.opacity = 0.85; scene.add(sp); });
    // sièges + haricots
    const seats = S.P.map((o, i) => {
      const a = o.a, g = new THREE.Group();
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.1), plastic(THREE, cs[i].color)); withOutline(THREE, ledge, 1.04); ledge.position.y = -0.2; g.add(ledge);
      g.position.set(Math.cos(a) * (PK.R + 1.35), 0, Math.sin(a) * (PK.R + 1.35)); g.rotation.y = -a + Math.PI / 2; scene.add(g);
      const b = mkActor(THREE, scene, cs[i]); b.group.scale.setScalar(1.55); b.group.position.set(Math.cos(a) * (PK.R + 1.35), 0.05, Math.sin(a) * (PK.R + 1.35)); b.group.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      return { b, lean: 0 };
    });
    // palets
    const baseG = new THREE.CylinderGeometry(0.55, 0.58, 0.3, 24), capG = new THREE.CylinderGeometry(0.4, 0.46, 0.14, 24), knobG = new THREE.TorusGeometry(0.19, 0.06, 8, 16), shadowG = new THREE.CircleGeometry(0.62, 20);
    const shadowM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
    const stones = new Map();
    const mkStone = (st) => {
      const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
      const base = new THREE.Mesh(baseG, plastic(THREE, cs[st.owner].color, { rough: 0.3 })); base.position.y = 0.17; withOutline(THREE, base, 1.06); inner.add(base);
      const cap = new THREE.Mesh(capG, plastic(THREE, 0xffffff, { rough: 0.25 })); cap.position.y = 0.37; inner.add(cap);
      const knob = new THREE.Mesh(knobG, plastic(THREE, COL.yellow)); knob.rotation.x = Math.PI / 2; knob.position.y = 0.5; inner.add(knob);
      const sh = new THREE.Mesh(shadowG, shadowM); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
      g.scale.setScalar(1.18); scene.add(g); return { g, inner, sh };
    };
    // visée du joueur : pointillés + repère d'arrivée
    const dots = Array.from({ length: 26 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); m.visible = false; scene.add(m); return m; });
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })); mark.rotation.x = -Math.PI / 2; mark.position.y = 0.05; mark.visible = false; scene.add(mark);
    const markDot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), mark.material); markDot.rotation.x = -Math.PI / 2; markDot.position.y = 0.05; markDot.visible = false; scene.add(markDot);
    let cur = size, lastSig = "", lastScore = -1, finished = false;

    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "throw") {
          seats[e.i].lean = 1;
          fx.burst(e.x, 0.5, e.z, [0xffffff, 0xbfeaff], 8, 3, 3);
          if (e.i === 0) vib(14);
        } else if (e.type === "hit") {
          const k = clamp(e.power / 8, 0.15, 1);
          fx.burst(e.x, 0.6, e.z, [0xffffff, 0xbfeaff, 0xffd23f], Math.round(6 + 14 * k), 3 + 5 * k, 6);
          if (e.power > 2.5) { shake.add(0.12 + 0.25 * k); fx.ring(e.x, e.z, 0xffffff, 0.3, 0.9 + k, 0.3, 0.05); }
        } else if (e.type === "out") {
          fx.burst(e.x, 0.4, e.z, [0x8fd3ff, 0xffffff, 0xbfeaff], 18, 5, 8);
          if (e.i === 0 && e.by == null) fx.pop("Oups…", clamp(e.x, -4, 4), 1.8, clamp(e.z, -4, 4), "#ff9aa8", 0.85);
        } else if (e.type === "ko") {
          if (e.i === 0) { fx.pop("ÉJECTÉ ! +10", clamp(e.x, -4, 4), 2.1, clamp(e.z, -4, 4), "#ffd23f", 1.05); vib([30, 20, 50]); shake.add(0.4); }
        }
      }
      S.events.length = 0;
      // palets
      const seen = new Set();
      for (const st of S.stones) {
        seen.add(st.id);
        let m = stones.get(st.id); if (!m) { m = mkStone(st); stones.set(st.id, m); }
        m.g.position.set(st.x, 0, st.z); m.inner.rotation.y = st.spin;
        if (st.out) { const f = st.fall; m.inner.position.y = -f * f * 9; m.inner.rotation.z = f * 3.5; m.inner.rotation.x = f * 2; m.g.scale.setScalar(Math.max(0.01, 1 - f * 0.9) * 1.18); m.sh.visible = false; }
      }
      for (const [id, m] of stones) if (!seen.has(id)) { scene.remove(m.g); stones.delete(id); }
      // haricots aux sièges
      S.P.forEach((o, i) => { const a = seats[i]; a.lean = Math.max(0, a.lean - dt * 3.2); a.b.anim({ run: 0, cheer: false, t: tt + i }); a.b.body.rotation.x = Math.sin(a.lean * Math.PI) * 0.55; a.b.body.position.y = 0; });
      // visée
      const me = S.me, aim = me.aim;
      const show = aim.on && me.left > 0 && aim.peak >= 0.3;
      if (show) {
        const stop = sim.stopPoint(me, aim.dx, aim.dz, aim.pow), L = Math.min(stop.d, 24), n = dots.length;
        for (let k = 0; k < n; k++) { const f = (k + 1) / n, d = L * f, x = me.sx + aim.dx * d, z = me.sz + aim.dz * d; dots[k].visible = Math.hypot(x, z) < PK.R + 0.4; dots[k].position.set(x, 0.12, z); dots[k].material.opacity = 0.95 - f * 0.4; }
        const inside = Math.hypot(stop.x, stop.z) < PK.R, val = ringValue(Math.hypot(stop.x, stop.z));
        mark.visible = markDot.visible = inside; mark.position.x = markDot.position.x = stop.x; mark.position.z = markDot.position.z = stop.z;
        mark.material.color.setHex(val >= 5 ? 0xffd23f : val > 0 ? 0x6be28e : 0xffffff);
        mark.scale.setScalar(1 + Math.sin(tt * 10) * 0.08);
      } else { for (const d of dots) d.visible = false; mark.visible = markDot.visible = false; }
      const sig = JSON.stringify(S.P.map((o) => [o.pts, o.left]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, text: NAMES[i] + " " + o.pts + " · ●" + o.left, me: i === 0, on: sim.rank(i) === 0 && o.pts > 0 }))); }
      const v = sim.score();
      if (v !== lastScore) { lastScore = v; sc.set(v); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        fitCamera(camera, cur, { hw: 8.7, hd: 8.4, tilt: 0.4 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Palets glacés : glisse vers la cible puis relâche pour lancer ; les palets qui tombent sont perdus" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<div className="mghint" role="note" style={{ flex: 1, textAlign: "center", font: "800 .95rem var(--display)", color: "var(--cream)", opacity: 0.9, padding: "10px 6px" }}><Icon name="hand" size={16} /> Glisse vers la cible, relâche pour lancer · plus tu pousses, plus ça va loin</div>} />
  );
}

/* ============================ Labyrinthe des gloutons ============================ */
const WALLS = [0x3b57f0, 0xd93a86, 0x14a07f, 0xdc8418, 0x7646ee];
const GHOST_COL = [0xff4d6d, 0xff9fe0, 0xffa43c];
function makeGhost(THREE, hex) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, emissive: hex, emissiveIntensity: 0.12 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); dome.position.y = 0.42; withOutline(THREE, dome, 1.08); body.add(dome);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.42, 16, 1, true), mat); skirt.position.y = 0.21; skirt.material.side = THREE.DoubleSide; body.add(skirt);
  const feet = [];
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat); f.position.set(Math.cos(a) * 0.25, 0.04, Math.sin(a) * 0.25); body.add(f); feet.push(f); }
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff }), black = new THREE.MeshBasicMaterial({ color: 0x14183a });
  const eyes = new THREE.Group(); eyes.position.set(0, 0.5, 0); g.add(eyes);
  const pupils = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), white); e.position.set(sx * 0.16, 0, 0.3); e.scale.set(1, 1.2, 0.7); const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), black); p.position.z = 0.08; e.add(p); eyes.add(e); pupils.push(p); }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
  return { group: g, body, mat, eyes, feet, pupils, hex };
}

export function MazeRun({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "core", fog: null });
    scene.traverse((o) => { if (o.isHemisphereLight) o.intensity = 1.35; if (o.isDirectionalLight) o.intensity = 1.35; });
    const sim = createMaze(seed, { seconds }), S = sim.S, { W, H } = S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    const cs = cast(color, look), wallCol = WALLS[seed % WALLS.length];
    // sol : damier discret
    const tex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#1a2160"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#212a78"; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 2, H / 2); t.magFilter = THREE.NearestFilter; return t; })();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.position.set((W - 1) / 2, 0, (H - 1) / 2); scene.add(floor);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.6, H + 1.2), plastic(THREE, 0x120d3a)); slab.position.set((W - 1) / 2, -0.32, (H - 1) / 2); scene.add(slab);
    // murs : un seul objet pour les blocs, un pour les chapeaux clairs, un pour les contours
    const boxAt = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; };
    const bl = [], cp = [], ol = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (S.grid[z][x] === 1) {
      bl.push(boxAt(0.96, 0.9, 0.96, x, 0.45, z)); cp.push(boxAt(0.8, 0.12, 0.8, x, 0.94, z)); ol.push(boxAt(1.04, 0.98, 1.04, x, 0.47, z));
    }
    const walls = new THREE.Mesh(mergeGeos(THREE, bl), plastic(THREE, wallCol, { rough: 0.45 })); scene.add(walls);
    const caps = new THREE.Mesh(mergeGeos(THREE, cp), plastic(THREE, 0xffffff, { rough: 0.35 })); caps.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(wallCol).lerp(new THREE.Color(0xffffff), 0.42), roughness: 0.35 }); scene.add(caps);
    scene.add(new THREE.Mesh(mergeGeos(THREE, ol), new THREE.MeshBasicMaterial({ color: 0x0b0a2e, side: THREE.BackSide })));
    // pastilles
    const tiles = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (S.pel[z][x] === 1 || S.pel[z][x] === 2) tiles.push([x, z]);
    const open = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (S.grid[z][x] === 0) open.push([x, z]);
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe58a, emissive: 0xffc933, emissiveIntensity: 0.7, roughness: 0.4 }), open.length);
    const idx = new Map(open.map(([x, z], i) => [x + "," + z, i]));
    const dummy = new THREE.Object3D();
    let dirty = true;
    const powers = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (S.pel[z][x] === 2) {
      const g = new THREE.Group(); g.position.set(x, 0.38, z);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff7eb6, emissiveIntensity: 0.9, roughness: 0.3 })); withOutline(THREE, b, 1.1); g.add(b);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff7eb6 })); halo.rotation.x = Math.PI / 2; g.add(halo);
      scene.add(g); powers.push({ g, halo, x, z });
    }
    scene.add(inst);
    // fantômes
    const ghosts = S.G.map((g, k) => { const m = makeGhost(THREE, GHOST_COL[k]); m.group.scale.setScalar(1.2); scene.add(m.group); return m; });
    // joueurs
    const players = S.A.map((o, i) => {
      const b = mkActor(THREE, scene, cs[i]); b.group.scale.setScalar(1.2);
      const aura = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f })); aura.rotation.x = Math.PI / 2; aura.position.y = 0.15; aura.visible = false; scene.add(aura);
      return { o, b, aura, rot: 0 };
    });
    let cur = size, lastSig = "", lastScore = -1, finished = false;

    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "pellet") { dirty = true; if (e.i === 0) { fx.burst(e.x, 0.4, e.z, [0xffd23f, 0xffffff], 3, 2, 3); } }
        else if (e.type === "spawnpel") dirty = true;
        else if (e.type === "power") { dirty = true; fx.ring(e.x, e.z, 0xff7eb6, 0.3, 2.6, 0.5); fx.burst(e.x, 0.5, e.z, [0xff7eb6, 0xffffff, 0xffd23f], 16, 5, 6); if (e.i === 0) { shake.add(0.35); vib(25); fx.pop("SUPER !", e.x, 2.0, e.z, "#ff7eb6", 1); } }
        else if (e.type === "eat") { fx.burst(e.x, 0.5, e.z, [0x4c7dff, 0xffffff, 0xffd23f], 16, 6, 6); fx.pop("+100", e.x, 1.8, e.z, "#ffd23f", e.i === 0 ? 1.2 : 0.8); if (e.i === 0) { shake.add(0.3); vib([20, 20, 30]); } }
        else if (e.type === "caught") { dirty = true; fx.burst(e.x, 0.6, e.z, [0xff5d73, 0xffd23f, 0xffffff], 20, 7, 6); fx.ring(e.x, e.z, 0xff5d73, 0.3, 2.2, 0.4); if (e.i === 0) { shake.add(0.8); vib([70, 30, 90]); fx.pop("AÏE ! −" + e.lost, e.x, 2.0, e.z, "#ff5d73", 1); } }
        else if (e.type === "steal") { fx.burst(e.x, 0.6, e.z, [0xffd23f, 0xffffff], 12, 5, 5); if (e.i === 0 || e.from === 0) fx.pop(e.i === 0 ? "VOLÉ +" + e.n : "−" + e.n, e.x, 1.9, e.z, e.i === 0 ? "#ffd23f" : "#ff9aa8", 0.95); }
      }
      S.events.length = 0;
      if (dirty) {
        dirty = false;
        open.forEach(([x, z], i) => { const v = S.pel[z][x]; dummy.position.set(x, 0.2, z); dummy.scale.setScalar(v === 1 ? 1 : 0.0001); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
        inst.instanceMatrix.needsUpdate = true;
      }
      for (const p of powers) { const on = S.pel[p.z][p.x] === 2; p.g.visible = on; if (on) { p.g.position.y = 0.38 + Math.sin(tt * 4 + p.x) * 0.06; p.g.scale.setScalar(1 + Math.sin(tt * 7) * 0.08); p.halo.rotation.z = tt * 2; } }
      // fantômes
      S.G.forEach((g, k) => {
        const m = ghosts[k], gr = m.group;
        gr.visible = true;
        gr.position.set(g.px, 0, g.pz);
        const face = g.dir ? Math.atan2(g.dir[0], g.dir[1]) : (m.face || 0); m.face = face;
        let rot = gr.rotation.y; rot += wrapPi(face - rot) * (1 - Math.exp(-12 * dt)); gr.rotation.y = rot;
        const fright = g.mode === "fright", eaten = g.mode === "eaten", wait = g.mode === "wait";
        m.body.visible = !eaten;
        const blink = fright && S.fright < 1.6 && Math.sin(tt * 16) > 0;
        const col = fright ? (blink ? 0xffffff : 0x3a56ff) : m.hex;
        m.mat.color.setHex(col); m.mat.emissive.setHex(fright ? (blink ? 0x666666 : 0x1a2a99) : col);
        m.body.position.y = Math.abs(Math.sin(tt * 9 + k)) * 0.07 + (wait ? Math.sin(tt * 3 + k) * 0.05 : 0);
        m.feet.forEach((f, j) => { f.position.y = 0.04 + Math.max(0, Math.sin(tt * 12 + j * 1.6)) * 0.1; });
        m.eyes.position.y = eaten ? 0.35 : 0.5 + m.body.position.y;
        m.pupils.forEach((p) => { p.position.x = 0; p.position.y = fright ? 0.03 : 0; });
      });
      // joueurs
      for (const a of players) {
        const { o, b } = a, g = b.group;
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-14 * dt));
        g.position.set(o.px, 0, o.pz); g.rotation.y = a.rot;
        g.visible = o.inv > 0 ? Math.sin(tt * 36) > -0.3 : true;
        b.anim({ run: o.moving ? 1 : 0, cheer: o.power > 0 && !o.moving, t: tt + o.i });
        a.aura.visible = o.power > 0; if (o.power > 0) { a.aura.position.set(o.px, 0.12, o.pz); a.aura.rotation.z = tt * 4; a.aura.scale.setScalar(1 + Math.sin(tt * 10) * 0.1); a.aura.material.color.setHex(o.power < 1.5 && Math.sin(tt * 20) > 0 ? 0xffffff : 0xffd23f); }
      }
      const sig = JSON.stringify(S.A.map((o) => [sim.scoreOf(o), o.power > 0]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.A.map((o, i) => ({ key: i, color: cs[i].color, icon: o.power > 0 ? "star" : null, text: NAMES[i] + " " + sim.scoreOf(o), me: i === 0, on: sim.rank(i) === 0 }))); }
      const v = sim.score();
      if (v !== lastScore) { lastScore = v; sc.set(v); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        fitCamera(camera, cur, { hw: W / 2 + 0.35, hd: H / 2 + 0.35, cx: (W - 1) / 2, cz: (H - 1) / 2, tilt: 0.2 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Labyrinthe des gloutons : glisse pour tourner, mange les pastilles, évite les fantômes" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<div className="mghint" role="note" style={{ flex: 1, textAlign: "center", font: "800 .95rem var(--display)", color: "var(--cream)", opacity: 0.9, padding: "10px 6px" }}><Icon name="hand" size={16} /> Glisse pour tourner · la grosse boule rose = invincible : mange les fantômes !</div>} />
  );
}

/* ============================ Boules de neige géantes ============================ */
export function SnowBalls({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "ice", fog: [45, 135] });
    abyss(THREE, scene, 0x8fd3ff, -6);
    const sim = createSnow(seed, { seconds }), S = sim.S, { R, N } = S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.dash = (v) => input.set("act", v);
    const cs = cast(color, look);
    // plateau + neige (texture de 48 × 48 pixels lissée : blanc = neige, vert = herbe mise à nu)
    const side = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.2, R * 0.95, 1.0, 56), plastic(THREE, 0xdbeaff)); side.position.y = -0.5; withOutline(THREE, side, 1.025); scene.add(side);
    const data = new Uint8Array(N * N * 4);
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    const top = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.01; scene.add(top);
    const rimR = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.12, 8, 64), plastic(THREE, COL.cyan)); rimR.rotation.x = Math.PI / 2; rimR.position.y = 0.02; scene.add(rimR);
    const paint = () => {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const v = S.snow[j * N + i], k = ((N - 1 - j) * N + i) * 4, t = Math.min(1, v * 1.15);
        data[k] = 96 + (246 - 96) * t; data[k + 1] = 178 + (250 - 178) * t; data[k + 2] = 96 + (255 - 96) * t; data[k + 3] = 255;
      }
      tex.needsUpdate = true;
    };
    paint();
    // sapins enneigés autour
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + 0.2, rr = R + 1.7 + (k % 3) * 0.3, g = new THREE.Group();
      for (let l = 0; l < 3; l++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.85 - l * 0.2, 1.0, 9), plastic(THREE, l === 2 ? 0x45c27c : 0x2fa86a)); c.position.y = 0.9 + l * 0.7; g.add(c); }
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 6), plastic(THREE, 0x8a5a2b)); tr.position.y = 0.25; g.add(tr);
      g.position.set(Math.sin(a) * rr, -0.6, Math.cos(a) * rr); g.scale.setScalar(0.8 + (k % 2) * 0.15); scene.add(g);
    }
    // boules
    const ballGeo = new THREE.IcosahedronGeometry(1, 2);
    const balls = S.P.map((o, i) => {
      const g = new THREE.Group(), ball = new THREE.Group(); g.add(ball);
      const core = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true, emissive: 0x7f9bd6, emissiveIntensity: 0.18 })); withOutline(THREE, core, 1.04); ball.add(core);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 8, 40), plastic(THREE, cs[i].color)); band.rotation.y = Math.PI / 2; ball.add(band);
      const band2 = band.clone(); band2.rotation.x = Math.PI / 2; band2.rotation.y = 0; ball.add(band2);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x1d2457, transparent: true, opacity: 0.2, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
      scene.add(g);
      const b = mkActor(THREE, scene, cs[i]); b.group.scale.setScalar(1.0);
      return { o, g, ball, sh, b, prevRoll: 0, rot: 0, fx: 0 };
    });
    let cur = size, lastSig = "", lastScore = -1, finished = false, paintT = 0;
    const axis = new THREE.Vector3(), qd = new THREE.Quaternion();

    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "hit") {
          const k = clamp(e.power / 7, 0.2, 1);
          fx.burst(e.x, 1.0, e.z, [0xffffff, 0xdfeeff, 0xbfeaff], Math.round(8 + 18 * k), 3 + 5 * k, 7);
          if (e.power > 3) { shake.add(0.15 + 0.3 * k); fx.ring(e.x, e.z, 0xffffff, 0.4, 1.4 + k, 0.35, 0.05); }
          if (e.take > 0.02) {
            if (e.small === 0) { fx.pop("−" + Math.round(e.take * 60), clamp(e.x, -4.5, 4.5), 2.8, clamp(e.z, -4.5, 4.5), "#ff9aa8", 0.9); vib([25, 15, 35]); }
            else if (e.big === 0) { fx.pop("+" + Math.round(e.take * 60), clamp(e.x, -4.5, 4.5), 2.8, clamp(e.z, -4.5, 4.5), "#8cf0a8", 0.9); vib(16); }
          }
        } else if (e.type === "dash") { fx.ring(e.x, e.z, 0xffffff, 0.5, 2.0, 0.3, 0.05); fx.burst(e.x, 0.6, e.z, [0xffffff, 0xdfeeff], 8, 4, 5); }
        else if (e.type === "fall") { fx.burst(e.x, 0.6, e.z, [0x8fd3ff, 0xffffff, 0xdfeeff], 22, 6, 9); if (e.i === 0) { shake.add(0.8); vib([100, 40, 100]); fx.pop("Aaah !", clamp(e.x, -4.5, 4.5), 2.2, clamp(e.z, -4.5, 4.5), "#ff9aa8", 1); } }
        else if (e.type === "ko") { if (e.i === 0) { fx.pop("ÉJECTÉ ! +40", clamp(e.x, -4.5, 4.5), 3.1, clamp(e.z, -4.5, 4.5), "#ffd23f", 1.1); vib([30, 20, 60]); shake.add(0.4); } }
        else if (e.type === "respawn") { fx.ring(e.x, e.z, 0xffffff, 0.3, 2.4, 0.5, 0.05); }
      }
      S.events.length = 0;
      paintT -= dt; if (paintT <= 0) { paintT = 0.1; paint(); }
      for (const a of balls) {
        const { o, g, b } = a;
        const d = o.roll - a.prevRoll; a.prevRoll = o.roll;
        const sp = Math.hypot(o.vx, o.vz);
        if (sp > 0.05 && d > 0) { axis.set(o.vz / sp, 0, -o.vx / sp); qd.setFromAxisAngle(axis, d); a.ball.quaternion.premultiply(qd); }
        a.ball.scale.setScalar(o.rho);
        g.position.set(o.x, o.rho, o.z);
        const bg = b.group;
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-12 * dt));
        a.sh.scale.setScalar(o.rho); a.sh.position.y = 0.03 - o.rho;
        if (!o.alive) {
          const f = o.fall;
          if (f > 0) { g.position.y = o.rho - f * f * 9; g.rotation.z = f * 1.5; a.sh.visible = false; const k = Math.max(0.01, 1 - f * 0.55); g.scale.setScalar(k); bg.visible = true; bg.position.set(o.x, o.rho * 2 - 0.1 - f * f * 9 + f * 1.5, o.z); bg.scale.setScalar(1.0 * k); bg.rotation.y += dt * 10; b.anim({ fall: true, t: tt }); if (f > 1.2) { g.visible = false; bg.visible = false; } }
          continue;
        }
        g.visible = bg.visible = true; g.rotation.z = 0; g.scale.setScalar(1); a.sh.visible = true;
        if (o.inv > 0) { const v = Math.sin(tt * 34) > -0.25; g.visible = v; bg.visible = v; }
        bg.position.set(o.x, o.rho * 2 - 0.14, o.z); bg.rotation.y = a.rot; bg.scale.setScalar(1.0);
        b.anim({ run: clamp(sp / 4, 0, 1), t: tt * (0.6 + Math.min(1.4, sp / 3)) + o.i });
        if (o.dash > 0 && Math.random() < 0.8) fx.burst(o.x - Math.sin(o.face) * o.rho, 0.5, o.z - Math.cos(o.face) * o.rho, [0xffffff, 0xdfeeff], 1, 2.2, 1);
        else if (sp > 2.5 && Math.random() < 0.18) fx.burst(o.x - Math.sin(o.face) * o.rho, 0.3, o.z - Math.cos(o.face) * o.rho, [0xffffff], 1, 1.2, 1);
      }
      const sig = JSON.stringify(S.P.map((o) => [sim.scoreOf(o), o.alive]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, text: NAMES[i] + " " + sim.scoreOf(o), dead: !o.alive, me: i === 0, on: sim.rank(o) === 0 }))); }
      const v = sim.score();
      if (v !== lastScore) { lastScore = v; sc.set(v); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        fitCamera(camera, cur, { hw: R + 0.9, hd: R + 0.8, tilt: 0.45 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); tex.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Boules de neige géantes : roule sur la neige pour grossir, pousse les petites boules hors du plateau" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Charge" testid="sn-dash" className="wide" on={(v) => act.dash && act.dash(v)}><Icon name="bolt" /> Charge !</HoldBtn>} />
  );
}
