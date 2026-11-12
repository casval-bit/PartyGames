// Mini-jeux d'arène 3D « à la Pummel Party » (1/3) : patate explosive, poseur de bombes, chars d'assaut, roi de la colline.
import { useRef } from "react";
import { Icon } from "../../ui/Icon.jsx";
import { useReady, candyWorld, plastic, withOutline, textSprite, HoldBtn, clamp, wrapPi, useFinish, useScore, useClock, vib, gridTexture } from "./kit3d.jsx";
import { Shell, Chips, useSig, makeInput, fitCamera, mkActor, cast, makeFx, makeShake, discArena, abyss, COL } from "./party.jsx";
import { createBombTag, BT } from "../sim/bombtag.js";
import { createBomber, BM } from "../sim/bomber.js";
import { createTanks, TK } from "../sim/tanks.js";
import { createCrown, CR } from "../sim/crown.js";

const NAMES = ["Toi", "Rouge", "Vert", "Bleu"];
const turn = (a, b, k) => a + wrapPi(b - a) * k;

/* ============================ Patate explosive ============================ */
export function BombTag({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "mountain", fog: [40, 95] });
    abyss(THREE, scene, 0xff9ccd, -7);
    const sim = createBombTag(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.dash = (v) => input.set("act", v);
    // décor
    const arena = discArena(THREE, { R: 6.3, color: COL.cyan, ring: COL.yellow, stripes: [[1.6, 1.85, COL.white], [3.7, 3.85, COL.white], [5.4, 5.6, COL.yellow]] });
    scene.add(arena);
    const post = new THREE.CylinderGeometry(0.22, 0.26, 0.8, 10);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2, m = new THREE.Mesh(post, plastic(THREE, i % 2 ? COL.red : COL.white));
      m.position.set(Math.sin(a) * 6.05, 0.4, Math.cos(a) * 6.05); withOutline(THREE, m, 1.08); scene.add(m);
    }
    // joueurs
    const cs = cast(color, look);
    const A = S.P.map((o, i) => ({ o, b: mkActor(THREE, scene, cs[i]), fly: null, gone: false, rot: o.face }));
    // bombe
    const bomb = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), new THREE.MeshStandardMaterial({ color: 0x1d2457, roughness: 0.35, emissive: 0x000000 }));
    withOutline(THREE, body, 1.08);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 10), plastic(THREE, COL.stone)); cap.position.y = 0.38;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f })); spark.position.set(0.05, 0.62, 0);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), plastic(THREE, COL.wood)); wick.position.set(0.02, 0.5, 0); wick.rotation.z = -0.3;
    bomb.add(body, cap, wick, spark);
    const nums = [3, 2, 1].map((n) => { const s = textSprite(THREE, String(n), { color: "#ffd23f", size: 84 }); s.position.y = 0.95; s.visible = false; s.material.depthTest = false; s.renderOrder = 9; bomb.add(s); return s; });
    scene.add(bomb);
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 36), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.y = 0.05; scene.add(mark);
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const sync = (dt, tt) => {
      // événements de la simulation -> effets
      for (const e of S.events) {
        const o = S.P[e.i ?? e.to];
        if (e.type === "tag") {
          const to = S.P[e.to];
          fx.ring(to.x, to.z, 0xffd23f, 0.5, 2.4, 0.4); fx.burst(to.x, 1.2, to.z, [0xffd23f, 0xffffff], 10, 4);
          fx.pop(e.to === 0 ? "À TOI !" : "Refilée !", clamp(to.x, -3.8, 3.8), 2.8, to.z, e.to === 0 ? "#ff5d73" : "#ffd23f");
          if (e.to === 0) { shake.add(0.35); vib(40); }
        } else if (e.type === "dash") {
          fx.burst(o.x, 0.15, o.z, 0xffffff, 6, 2.6, 4);
        } else if (e.type === "boom") {
          fx.burst(e.x, 1.1, e.z, [0xff5d73, 0xffa43c, 0xffd23f, 0xffffff], 36, 8);
          fx.ring(e.x, e.z, 0xffa43c, 0.6, 5.5, 0.6); fx.ring(e.x, e.z, 0xff5d73, 0.4, 3.2, 0.45);
          fx.pop(e.i === 0 ? "BOUM !" : "BOUM ! +100", clamp(e.x, -3.8, 3.8), 2.8, e.z, "#ff5d73", 1.2);
          shake.add(e.i === 0 ? 0.9 : 0.6); vib(e.i === 0 ? [90, 40, 120] : 30);
          const a = A[e.i]; a.fly = { vx: (Math.random() - 0.5) * 7, vy: 9, vz: (Math.random() - 0.5) * 7, t: 0 };
        } else if (e.type === "round") {
          fx.pop("Nouvelle bombe !", 0, 2.2, 0, "#ffffff", 1.1);
        }
      }
      S.events.length = 0;
      for (const a of A) {
        const { o, b } = a;
        if (a.gone) { b.group.visible = false; continue; }
        const g = b.group;
        if (a.fly) {                                           // projeté par l'explosion
          a.fly.t += dt; a.fly.vy -= 22 * dt;
          g.position.x += a.fly.vx * dt; g.position.y += a.fly.vy * dt; g.position.z += a.fly.vz * dt;
          g.rotation.y += dt * 9; g.rotation.x += dt * 5;
          b.anim({ fall: true, t: tt }); if (b.shadow) b.shadow.visible = false;
          if (a.fly.t > 1.5) a.gone = true;
          continue;
        }
        a.rot = turn(a.rot, o.face, 1 - Math.exp(-14 * dt));
        g.position.set(o.x, 0, o.z); g.rotation.y = a.rot;
        const holds = S.bomb.holder === o.i && o.alive;
        b.anim({ run: clamp(Math.hypot(o.vx, o.vz) / 5, 0, 1), stun: o.dash > 0, cheer: holds && Math.hypot(o.vx, o.vz) < 0.6, t: tt + o.i });
      }
      // la bombe suit son porteur
      const h = S.P[S.bomb.holder], bm = S.bomb;
      bomb.visible = Boolean(h && h.alive);
      mark.visible = bomb.visible;
      if (bomb.visible) {
        const urgency = 1 - clamp(bm.fuse / bm.fuse0, 0, 1);
        const rate = 7 + urgency * 26, pulse = 0.5 + 0.5 * Math.sin(tt * rate);
        bomb.position.set(h.x, 2.5 + Math.sin(tt * 6) * 0.06, h.z);
        bomb.scale.setScalar(1 + urgency * 0.35 + pulse * 0.12 * (0.4 + urgency));
        body.material.emissive.setRGB(urgency * pulse * 1.1, urgency * pulse * 0.1, 0);
        spark.visible = Math.sin(tt * 40) > -0.4; spark.scale.setScalar(0.8 + Math.random() * 0.7);
        const sec = Math.ceil(bm.fuse);
        nums.forEach((n, i) => { n.visible = sec <= 3 && sec === 3 - i; });
        mark.position.set(h.x, 0.05, h.z);
        mark.scale.setScalar(1 + pulse * 0.25 + urgency * 0.3);
        mark.material.color.setHex(h === S.me ? 0xff3b3b : 0xffa43c);
      }
      const sig = JSON.stringify(S.P.map((o) => [o.alive, S.bomb.holder === o.i]));
      if (sig !== lastSig) {
        lastSig = sig;
        setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, icon: S.bomb.holder === o.i && o.alive ? "bomb" : null, text: NAMES[i], on: S.bomb.holder === o.i && o.alive, dead: !o.alive, me: i === 0 })));
      }
      const s = sim.score();
      if (s !== lastScore && S.me.alive) { lastScore = s; sc.set(s); }
    };
    return {
      resize(sz) { cur = sz; },
      update(dt, tt) {
        const inp = input.read(); input.tick(dt);
        const n = dt > 0.034 ? 2 : 1;
        for (let i = 0; i < n; i++) sim.step(dt / n, inp);
        sync(dt, tt);
        fitCamera(camera, cur, { hw: 6.6, hd: 6.2, tilt: 0.62, cz: 0.4 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Patate explosive : glisse pour bouger, refile la bombe en touchant quelqu'un" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Foncer" testid="bt-dash" className="wide" on={(v) => act.dash && act.dash(v)}><Icon name="bolt" /> Foncer !</HoldBtn>} />
  );
}

/* ============================ Poseur de bombes ============================ */
const CS = 1.35;                                              // taille d'une case
const cellX = (cx) => (cx - (BM.W - 1) / 2) * CS, cellZ = (cz) => (cz - (BM.H - 1) / 2) * CS;
export function Bomber({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "forest", fog: [45, 105] });
    abyss(THREE, scene, 0x7fd0ff, -3);
    const sim = createBomber(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el, { stick: true }), fx = makeFx(THREE, scene), shake = makeShake();
    act.bomb = (v) => input.set("act", v);
    const grp = new THREE.Group(); scene.add(grp);
    // sol en damier, murs, piliers
    const tileGeo = new THREE.BoxGeometry(CS, 0.3, CS);
    for (let z = 0; z < S.H; z++) for (let x = 0; x < S.W; x++) {
      const wall = S.grid[z][x] === 1;
      const border = x === 0 || z === 0 || x === S.W - 1 || z === S.H - 1;
      const t = new THREE.Mesh(tileGeo, plastic(THREE, (x + z) % 2 ? 0x14283f : 0x18304a));
      t.position.set(cellX(x), -0.15, cellZ(z)); grp.add(t);
      if (wall) {
        const h = border ? 1.15 : 1.35;
        const w = new THREE.Mesh(new THREE.BoxGeometry(CS * 0.98, h, CS * 0.98), plastic(THREE, border ? 0x223a63 : COL.cyan, { emissive: border ? 0x000000 : 0x0b3a4a }));
        w.position.set(cellX(x), h / 2 - 0.02, cellZ(z)); withOutline(THREE, w, 1.03); grp.add(w);
        if (!border) { const cap = new THREE.Mesh(new THREE.BoxGeometry(CS * 0.7, 0.12, CS * 0.7), plastic(THREE, COL.white)); cap.position.y = h / 2 + 0.05; w.add(cap); }
      }
    }
    { const gt = gridTexture(THREE).clone(); gt.needsUpdate = true; gt.repeat.set(S.W, S.H); const gridOverlayBomber = new THREE.Mesh(new THREE.PlaneGeometry(S.W * CS, S.H * CS), new THREE.MeshBasicMaterial({ color: 0x47e08f, map: gt, transparent: true, opacity: 0.3, depthWrite: false })); gridOverlayBomber.rotation.x = -Math.PI / 2; gridOverlayBomber.position.set((cellX(0) + cellX(S.W - 1)) / 2, 0.006, (cellZ(0) + cellZ(S.H - 1)) / 2); grp.add(gridOverlayBomber); }
    // caisses
    const crateGeo = new THREE.BoxGeometry(CS * 0.9, CS * 0.9, CS * 0.9), plank = new THREE.BoxGeometry(CS * 0.94, 0.12, 0.12);
    const crates = new Map();
    const mkCrate = (x, z) => {
      const m = new THREE.Mesh(crateGeo, plastic(THREE, COL.orange)); m.position.set(cellX(x), CS * 0.45, cellZ(z)); withOutline(THREE, m, 1.04);
      for (const k of [0, 1]) { const p = new THREE.Mesh(plank, plastic(THREE, 0xb36b22)); p.position.set(0, (k ? 1 : -1) * CS * 0.28, CS * 0.46); m.add(p); }
      const x1 = new THREE.Mesh(new THREE.BoxGeometry(CS * 0.1, CS * 0.86, 0.1), plastic(THREE, 0xb36b22)); x1.position.z = CS * 0.46; m.add(x1);
      grp.add(m); crates.set(x + "," + z, m);
    };
    for (let z = 0; z < S.H; z++) for (let x = 0; x < S.W; x++) if (S.grid[z][x] === 2) mkCrate(x, z);
    // joueurs
    const cs = cast(color, look);
    const A = S.A.map((o, i) => ({ o, b: mkActor(THREE, scene, cs[i], 0.95), rot: 0, dead: 0 }));
    // bombes, flammes, objets
    const bombGeo = new THREE.SphereGeometry(0.46, 18, 14), bombMat = new THREE.MeshStandardMaterial({ color: 0x1d2457, roughness: 0.3, emissive: 0x000000 });
    const bombs = new Map(), flames = new Map(), items = new Map();
    const flameGeo = new THREE.BoxGeometry(CS * 0.92, 0.5, CS * 0.92), colGeo = new THREE.CylinderGeometry(0.42, 0.5, 1.5, 10, 1, true);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a }), colMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, depthWrite: false });
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const mkBomb = (b) => {
      const g = new THREE.Group(), m = new THREE.Mesh(bombGeo, bombMat.clone()); withOutline(THREE, m, 1.08); m.position.y = 0.5;
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sp.position.set(0.1, 1.05, 0);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 6), plastic(THREE, COL.wood)); wick.position.set(0.05, 0.95, 0); wick.rotation.z = -0.35;
      g.add(m, wick, sp); g.position.set(cellX(b.x), 0, cellZ(b.z)); scene.add(g);
      return { g, m, sp };
    };
    const mkItem = (it) => {
      const g = new THREE.Group();
      if (it.kind === "range") { const c = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 10), plastic(THREE, COL.red, { emissive: 0x551100 })); withOutline(THREE, c, 1.1); c.position.y = 0.55; g.add(c); }
      else { const c = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), plastic(THREE, COL.navy, { emissive: 0x112266 })); withOutline(THREE, c, 1.1); c.position.y = 0.5; g.add(c); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.12), plastic(THREE, COL.yellow)); pl.position.y = 1.0; const pl2 = pl.clone(); pl2.rotation.z = Math.PI / 2; g.add(pl, pl2); }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
      g.position.set(cellX(it.x), 0, cellZ(it.z)); scene.add(g);
      return g;
    };
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "boom") {
          for (const [x, z] of e.cells) fx.burst(cellX(x), 0.7, cellZ(z), [0xff8c1a, 0xffd23f, 0xffffff], 5, 4.5, 10);
          const me = S.me, d = Math.hypot(me.px - e.x, me.pz - e.z);
          shake.add(clamp(0.7 - d * 0.07, 0.12, 0.7)); if (d < 3 && me.alive) vib(25);
        } else if (e.type === "crate") {
          fx.burst(cellX(e.x), 0.8, cellZ(e.z), [COL.orange, 0xb36b22, 0xffe0a0], 12, 5, 16);
          if (e.i === 0) fx.pop("+8", cellX(e.x), 1.8, cellZ(e.z), "#ffd23f", 0.8);
        } else if (e.type === "place") {
          fx.ring(cellX(e.x), cellZ(e.z), 0xffffff, 0.3, 1.2, 0.3);
        } else if (e.type === "die") {
          const a = A[e.i]; a.dead = 0.001;
          fx.burst(cellX(Math.round(e.x)), 1.0, cellZ(Math.round(e.z)), [0xffd23f, 0xffffff, cs[e.i].color], 22, 7);
          fx.pop(e.i === 0 ? "AÏE !" : (e.by === 0 ? "ÉLIMINÉ ! +150" : "ÉLIMINÉ !"), cellX(clamp(Math.round(e.x), 1, S.W - 2)), 2.6, cellZ(Math.round(e.z)), e.by === 0 ? "#ffd23f" : "#ff5d73", 1.1);
          if (e.i === 0) { shake.add(0.9); vib([100, 40, 100]); }
        } else if (e.type === "item") {
          if (e.i === 0) { fx.pop(e.kind === "range" ? "Flamme +1" : "Bombe +1", cellX(e.x), 2.2, cellZ(e.z), "#ffffff", 0.9); vib(18); }
          fx.ring(cellX(e.x), cellZ(e.z), 0xffd23f, 0.3, 1.5, 0.35);
        }
      }
      S.events.length = 0;
      // caisses détruites
      for (const [k, m] of crates) { const [x, z] = k.split(",").map(Number); if (S.grid[z][x] !== 2) { grp.remove(m); crates.delete(k); } }
      // bombes
      for (const b of S.bombs) {
        let v = bombs.get(b); if (!v) { v = mkBomb(b); bombs.set(b, v); }
        const urg = 1 - clamp(b.t / BM.bombT, 0, 1), pulse = 0.5 + 0.5 * Math.sin(tt * (8 + urg * 28));
        v.g.scale.setScalar(1 + pulse * 0.1 * (0.5 + urg));
        v.m.material.emissive.setRGB(urg * pulse, urg * pulse * 0.12, 0);
        v.sp.visible = Math.sin(tt * 40) > -0.4;
      }
      for (const [b, v] of bombs) if (!S.bombs.includes(b)) { scene.remove(v.g); v.m.material.dispose(); bombs.delete(b); }
      // flammes
      for (const f of S.flames) {
        let v = flames.get(f);
        if (!v) { const g = new THREE.Group(), a = new THREE.Mesh(flameGeo, fireMat), c = new THREE.Mesh(colGeo, colMat.clone()); a.position.y = 0.25; c.position.y = 0.9; g.add(a, c); g.position.set(cellX(f.x), 0, cellZ(f.z)); scene.add(g); v = { g, c }; flames.set(f, v); }
        const k = clamp(f.t / BM.flameT, 0, 1);
        v.c.scale.set(0.7 + (1 - k) * 0.4, 0.6 + k * 0.7, 0.7 + (1 - k) * 0.4); v.c.material.opacity = 0.25 + 0.6 * k; v.g.rotation.y = tt * 3;
      }
      for (const [f, v] of flames) if (!S.flames.includes(f)) { scene.remove(v.g); v.c.material.dispose(); flames.delete(f); }
      // objets
      for (const it of S.items) { let g = items.get(it); if (!g) { g = mkItem(it); items.set(it, g); } g.rotation.y = tt * 2.4; g.position.y = Math.sin(tt * 4 + it.x) * 0.08; }
      for (const [it, g] of items) if (!S.items.includes(it)) { scene.remove(g); items.delete(it); }
      // joueurs
      for (const a of A) {
        const { o, b } = a, g = b.group;
        if (a.dead > 0) {                                       // éliminé : il tourne sur lui-même en rétrécissant
          a.dead += dt; const k = clamp(a.dead / 0.9, 0, 1);
          g.rotation.y += dt * 12; g.position.y = Math.sin(k * Math.PI) * 1.4; g.scale.setScalar(0.95 * (1 - k)); b.anim({ fall: true, t: tt });
          if (k >= 1) g.visible = false;
          continue;
        }
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-16 * dt));
        g.position.set(cellX(o.px), 0, cellZ(o.pz)); g.rotation.y = a.rot;
        b.anim({ run: o.moving ? 1 : 0, t: tt * 1.1 + o.i });
      }
      const sig = JSON.stringify(S.A.map((o) => [o.alive, o.kills]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.A.map((o, i) => ({ key: i, color: cs[i].color, icon: o.alive ? null : "skull", text: NAMES[i] + (o.kills ? " ×" + o.kills : ""), dead: !o.alive, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: (S.W * CS) / 2 + 0.25, hd: (S.H * CS) / 2 + 0.2, tilt: 0.42 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Poseur de bombes : glisse pour te déplacer, bouton pour poser une bombe" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Poser une bombe" testid="bm-bomb" className="wide" on={(v) => act.bomb && act.bomb(v)}><Icon name="bomb" /> Poser une bombe</HoldBtn>} />
  );
}

/* ============================ Chars d'assaut ============================ */
export function Tanks({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "desert", fog: [45, 105] });
    abyss(THREE, scene, 0x8fd4ff, -2.5);
    const sim = createTanks(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.fire = (v) => input.set("act", v);
    // sol à damier (une texture) + bordure + blocs
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const g2 = cv.getContext("2d"); g2.fillStyle = "#14243f"; g2.fillRect(0, 0, 128, 128); g2.fillStyle = "#1a2e50"; g2.fillRect(0, 0, 64, 64); g2.fillRect(64, 64, 64, 64); g2.strokeStyle = "rgba(255,174,74,0.55)"; g2.lineWidth = 2; g2.strokeRect(1, 1, 126, 126);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(TK.HX, TK.HZ); tex.magFilter = THREE.NearestFilter;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(TK.HX * 2, 0.5, TK.HZ * 2), [0, 1, 2, 3, 4, 5].map((k) => (k === 2 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }) : plastic(THREE, 0x223a63))));
    floor.position.y = -0.25; scene.add(floor);
    const rail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), plastic(THREE, 0x223a63, { emissive: 0x2a1400 })); m.position.set(x, 0.35, z); withOutline(THREE, m, 1.03); scene.add(m); };
    rail(TK.HX * 2 + 0.6, 0.3, 0, -TK.HZ - 0.15); rail(TK.HX * 2 + 0.6, 0.3, 0, TK.HZ + 0.15); rail(0.3, TK.HZ * 2, -TK.HX - 0.15, 0); rail(0.3, TK.HZ * 2, TK.HX + 0.15, 0);
    S.blocks.forEach((b, i) => {
      const w = b.x1 - b.x0, d = b.z1 - b.z0, m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.3, d), plastic(THREE, i % 2 ? COL.cyan : COL.yellow));
      m.position.set((b.x0 + b.x1) / 2, 0.65, (b.z0 + b.z1) / 2); withOutline(THREE, m, 1.03); scene.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.1, d * 0.78), plastic(THREE, COL.white)); cap.position.y = 0.68; m.add(cap);
    });
    // chars
    const cs = cast(color, look);
    const mkTank = (c, i) => {
      const g = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.45, emissive: 0x000000 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 1.5), hullMat); hull.position.y = 0.4; withOutline(THREE, hull, 1.05); g.add(hull);
      for (const sx of [-1, 1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 1.62), plastic(THREE, 0x2b2f5e)); tr.position.set(sx * 0.68, 0.22, 0); withOutline(THREE, tr, 1.06); g.add(tr); }
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.28, 16), hullMat); tur.position.y = 0.76; withOutline(THREE, tur, 1.07); g.add(tur);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.0, 10), plastic(THREE, 0x2b2f5e)); gun.rotation.x = Math.PI / 2; gun.position.set(0, 0.78, 0.75); withOutline(THREE, gun, 1.1); g.add(gun);
      const pips = [0, 1, 2].map((k) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b5c })); p.position.set((k - 1) * 0.4, 2.1, 0); g.add(p); return p; });
      const bean = mkActor(THREE, g, c, 0.62); bean.group.position.set(0, 0.7, -0.05);
      scene.add(g);
      return { g, hullMat, bean, pips, gun, rot: 0 };
    };
    const A = S.T.map((o, i) => ({ o, ...mkTank(cs[i], i), gone: false, dead: 0 }));
    const sight = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    sight.rotation.x = -Math.PI / 2; scene.add(sight);
    const sh = new THREE.SphereGeometry(TK.shellR * 1.25, 10, 8), shMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
    const shells = new Map();
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "shot") { fx.burst(e.x, 0.8, e.z, [0xfff3a0, 0xffa43c], 5, 3, 6); fx.ring(e.x, e.z, 0xfff3a0, 0.2, 0.9, 0.18, 0.7); if (e.i === 0) { shake.add(0.12); vib(10); } }
        else if (e.type === "bounce" || e.type === "spark") fx.burst(e.x, 0.6, e.z, [0xffffff, 0xffe066], 4, 3, 6);
        else if (e.type === "hit") {
          fx.burst(e.x, 0.8, e.z, [0xff5d73, 0xffd23f, 0xffffff], 12, 5);
          if (e.i === 0) { shake.add(0.5); vib(60); } else if (e.by === 0) vib(20);
        } else if (e.type === "boom") {
          fx.burst(e.x, 1, e.z, [0xff5d73, 0xffa43c, 0xffd23f, 0xffffff], 34, 8); fx.ring(e.x, e.z, 0xffa43c, 0.5, 4, 0.55);
          fx.pop(e.i === 0 ? "BOUM !" : (e.by === 0 ? "DÉTRUIT ! +100" : "DÉTRUIT !"), clamp(e.x, -3.6, 3.6), 2.8, e.z, e.by === 0 ? "#ffd23f" : "#ff5d73", 1.15);
          shake.add(e.i === 0 ? 0.9 : 0.5); if (e.i === 0) vib([100, 40, 120]);
          A[e.i].dead = 0.001;
        }
      }
      S.events.length = 0;
      for (const a of A) {
        const { o } = a;
        if (a.dead > 0) { a.dead += dt; a.g.position.y += dt * 2.5; a.g.rotation.z += dt * 5; a.g.scale.setScalar(Math.max(0.01, 1 - a.dead / 0.8)); if (a.dead > 0.8) a.g.visible = false; continue; }
        a.rot += wrapPi(o.heading - a.rot) * (1 - Math.exp(-22 * dt));
        a.g.position.set(o.x, 0, o.z); a.g.rotation.y = a.rot;
        a.hullMat.emissive.setRGB(o.hit > 0 ? 0.9 : 0, o.hit > 0 ? 0.9 : 0, o.hit > 0 ? 0.9 : 0);
        a.pips.forEach((p, k) => { p.visible = k < o.hp; p.position.y = 2.1 + Math.sin(tt * 4 + k) * 0.04; });
        for (const p of a.pips) { p.quaternion.copy(camera.quaternion); }
        const spd = Math.hypot(o.vx, o.vz);
        a.bean.anim({ run: 0, cheer: false, t: tt + o.i }); a.bean.group.position.y = 0.7 + Math.sin(tt * 14 + o.i) * 0.02 * Math.min(1, spd);
        a.gun.position.z = 0.75 - Math.max(0, o.cd - (TK.reload - 0.12)) * 1.6;
      }
      const me = S.me;
      sight.visible = me.alive; if (me.alive) { sight.position.set(me.x + Math.sin(me.heading) * 5.4, 0.12, me.z + Math.cos(me.heading) * 5.4); sight.rotation.z = -me.heading; }
      for (const s of S.shells) { let m = shells.get(s); if (!m) { m = new THREE.Mesh(sh, shMat); scene.add(m); shells.set(s, m); } m.position.set(s.x, 0.8, s.z); }
      for (const [s, m] of shells) if (!S.shells.includes(s)) { scene.remove(m); shells.delete(s); }
      const sig = JSON.stringify(S.T.map((o) => [o.hp, o.alive]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.T.map((o, i) => ({ key: i, color: cs[i].color, icon: o.alive ? "heart" : "skull", text: NAMES[i] + (o.alive ? " ×" + o.hp : ""), dead: !o.alive, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: TK.HX + 0.6, hd: TK.HZ + 0.4, tilt: 0.36 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); tex.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Chars d'assaut : glisse pour te déplacer (le char tire où il regarde), bouton pour tirer" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Tirer" testid="tk-fire" className="wide" on={(v) => act.fire && act.fire(v)}><Icon name="crosshair" /> Tirer</HoldBtn>} />
  );
}

/* ============================ Roi de la colline ============================ */
export function Crown({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "core", fog: [40, 100] });
    abyss(THREE, scene, 0xff7a45, -5);
    const sim = createCrown(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.dash = (v) => input.set("act", v);
    const arena = discArena(THREE, { R: 6.3, color: COL.purple, ring: COL.yellow, stripes: [[2.4, 2.55, COL.yellow], [4.4, 4.55, COL.white]] });
    scene.add(arena);
    // la zone dorée
    const zone = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(CR.ZR, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
    const zring = new THREE.Mesh(new THREE.TorusGeometry(CR.ZR, 0.09, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff })); zring.rotation.x = Math.PI / 2; zring.position.y = 0.05;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(CR.ZR, CR.ZR, 5, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 2.5;
    zone.add(disc, zring, beam); scene.add(zone);
    const nextZ = new THREE.Mesh(new THREE.RingGeometry(CR.ZR - 0.14, CR.ZR, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    nextZ.rotation.x = -Math.PI / 2; nextZ.position.y = 0.06; nextZ.visible = false; scene.add(nextZ);
    // la couronne
    const crown = new THREE.Group(), gold = plastic(THREE, 0xffc928, { rough: 0.25, emissive: 0x664400 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.2, 14), gold); withOutline(THREE, band, 1.1); crown.add(band);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283, c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8), gold); c.position.set(Math.sin(a) * 0.3, 0.22, Math.cos(a) * 0.3); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), plastic(THREE, COL.red)); b.position.y = 0.17; c.add(b); crown.add(c); }
    crown.visible = false; scene.add(crown);
    const cs = cast(color, look);
    const A = S.P.map((o, i) => ({ o, b: mkActor(THREE, scene, cs[i]), rot: 0, flame: 0 }));
    const marks = S.P.map((o, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 24), new THREE.MeshBasicMaterial({ color: cs[i].color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; scene.add(m); return m; });
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "dash") { const o = S.P[e.i]; fx.burst(o.x, 0.15, o.z, 0xffffff, 6, 2.6, 4); }
        else if (e.type === "hit") { fx.burst(e.x, 1.0, e.z, [0xffffff, 0xffd23f], 8, 4); if (e.i === 0) { shake.add(0.3); vib(35); } }
        else if (e.type === "fall") {
          const a = A[e.i]; fx.burst(e.x, 0.8, e.z, [cs[e.i].color, 0xffffff], 12, 5);
          fx.pop(e.i === 0 ? "Tombé !" : (e.by === 0 ? "KO ! +20" : "Plouf !"), clamp(e.x, -3.8, 3.8), 2.4, clamp(e.z, -4, 4), e.by === 0 ? "#ffd23f" : "#ffffff", 1);
          if (e.i === 0) { shake.add(0.6); vib([60, 30, 60]); } else if (e.by === 0) vib(30);
        } else if (e.type === "warn") fx.pop("Prochaine zone !", clamp(e.x, -3.6, 3.6), 1.6, e.z, "#ffffff", 0.9);
        else if (e.type === "move") { fx.ring(e.x, e.z, 0xffd23f, 0.5, CR.ZR + 1.2, 0.5); fx.burst(e.x, 0.4, e.z, [0xffd23f, 0xffffff], 14, 4); }
        else if (e.type === "respawn") { const o = S.P[e.i]; fx.ring(o.x, o.z, cs[e.i].color, 0.4, 2, 0.4); }
      }
      S.events.length = 0;
      // zone et couronne
      const who = S.who;
      zone.position.set(S.zone.x, 0, S.zone.z);
      const hex = who >= 0 ? new THREE.Color(cs[who].color) : new THREE.Color(who === -2 ? 0xff5d73 : 0xffd23f);
      disc.material.color.copy(hex); disc.material.opacity = 0.45 + 0.15 * Math.sin(tt * (who === -2 ? 14 : 4));
      beam.material.color.copy(hex);
      zring.scale.setScalar(1 + (who === -2 ? 0.02 * Math.sin(tt * 20) : 0));
      nextZ.visible = Boolean(S.next);
      if (S.next) { nextZ.position.set(S.next.x, 0.06, S.next.z); nextZ.material.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(tt * 12)); }
      const holder = who >= 0 ? S.P[who] : null;
      crown.visible = Boolean(holder && holder.alive);
      if (holder) { crown.position.set(holder.x, 2.45 + Math.sin(tt * 5) * 0.08, holder.z); crown.rotation.y = tt * 2.2; }
      for (const a of A) {
        const { o, b } = a, g = b.group;
        const m = marks[o.i];
        if (o.out) {
          g.position.set(o.x, o.y, o.z); g.rotation.y += dt * 8; g.rotation.x += dt * 4; b.anim({ fall: true, t: tt }); if (b.shadow) b.shadow.visible = false; m.visible = false;
          g.visible = o.y > -9; continue;
        }
        g.rotation.x = 0; g.visible = o.inv > 0 ? Math.sin(tt * 40) > -0.2 : true; if (b.shadow) b.shadow.visible = true;
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-14 * dt));
        g.position.set(o.x, 0, o.z); g.rotation.y = a.rot;
        b.anim({ run: clamp(Math.hypot(o.vx, o.vz) / 5, 0, 1), stun: o.dash > 0, cheer: who === o.i, t: tt + o.i });
        m.visible = o.i === 0; m.position.set(o.x, 0.06, o.z);
      }
      const sig = JSON.stringify(S.P.map((o) => [sim.pts(o), o.alive, S.who === o.i]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, icon: S.who === o.i ? "crown" : null, text: NAMES[i] + " " + sim.pts(o), on: S.who === o.i, dead: !o.alive, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: 6.7, hd: 6.2, tilt: 0.62, cz: 0.4 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Roi de la colline : reste seul dans la zone dorée, pousse les autres hors de l'arène" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Foncer" testid="cr-dash" className="wide" on={(v) => act.dash && act.dash(v)}><Icon name="bolt" /> Foncer !</HoldBtn>} />
  );
}
