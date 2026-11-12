// Mini-jeux 3D (livraison 4) : Guerre de peinture, Plateformes musicales, Traînées de lumière. Décor « secteur virtuel ».
import { useRef } from "react";
import { Icon } from "../../ui/Icon.jsx";
import { useReady, candyWorld, plastic, HoldBtn, clamp, wrapPi, useFinish, useScore, useClock, vib, gridTexture } from "./kit3d.jsx";
import { Shell, Chips, useSig, makeInput, fitCamera, mkActor, cast, makeFx, makeShake, discArena, abyss, COL } from "./party.jsx";
import { createPaint, PT } from "../sim/paint.js";
import { createChairs, CH } from "../sim/chairs.js";
import { createTrails, TR } from "../sim/trails.js";
import { sfx, makeTune } from "../../lib/sfx.js";

const NAMES = ["Toi", "Rouge", "Vert", "Bleu"];
// couleurs fixes des joueurs dans ces jeux (toi = jaune, puis les trois bots) : toujours bien distinctes
const PCOL = ["#ffd23f", "#ff5d5d", "#2ee6a8", "#3aa8ff"];
const colored = (color, look) => cast(color, look).map((c, i) => ({ ...c, color: PCOL[i] }));
/** Anneau lumineux au sol sous un joueur (sa couleur). */
function footRing(THREE, scene, color, r0 = 0.55, r1 = 0.72) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.07; scene.add(m);
  return m;
}

/* ============================== GUERRE DE PEINTURE ============================== */
export function PaintWar({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "mountain", fog: [40, 105] });
    abyss(THREE, scene, null, -6);
    const sim = createPaint(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.dash = (v) => input.set("act", v);
    const cs = colored(color, look), N = PT.N, H = PT.half;
    // socle sombre à liseré, puis les dalles (une instance par dalle, couleur = propriétaire)
    const base = new THREE.Mesh(new THREE.BoxGeometry(N + 0.7, 0.9, N + 0.7), plastic(THREE, 0x0d1a33, { rough: 0.35 }));
    base.position.y = -0.52; scene.add(base);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(N + 0.78, 0.07, N + 0.78), new THREE.MeshBasicMaterial({ color: 0xb3a6e6 }));
    edge.position.y = -0.12; scene.add(edge);
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.14, 0.9), new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.06 }), N * N);
    const neutral = new THREE.Color(0x1b2d52), cols = cs.map((c) => new THREE.Color(c.color)), M = new THREE.Matrix4();
    const pop = new Float32Array(N * N);
    const place = (k, s) => { M.makeScale(1, s, 1); M.setPosition((k % N) - H + 0.5, -0.07 + (s - 1) * 0.07, Math.floor(k / N) - H + 0.5); tiles.setMatrixAt(k, M); };
    for (let k = 0; k < N * N; k++) { place(k, 1); tiles.setColorAt(k, neutral); }
    tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true; scene.add(tiles);
    // le rouleau (bonus)
    const roller = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 20), plastic(THREE, 0xffffff, { rough: 0.3, emissive: 0x334455 })); drum.rotation.z = Math.PI / 2; roller.add(drum);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), plastic(THREE, 0xb3a6e6)); handle.position.set(0, 0.5, 0); roller.add(handle);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.86, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.55; roller.add(halo);
    roller.visible = false; scene.add(roller);
    const A = S.P.map((o, i) => ({ o, b: mkActor(THREE, scene, cs[i]), rot: o.face, ring: footRing(THREE, scene, cs[i].color), aura: footRing(THREE, scene, cs[i].color, 0.9, 1.25) }));
    let cur = size, lastSig = "", lastScore = -1, finished = false, dirty = false;
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "paint") { tiles.setColorAt(e.k, cols[e.i]); pop[e.k] = 1; dirty = true; }
        else if (e.type === "dash") { const o = S.P[e.i]; fx.burst(o.x, 0.25, o.z, [cs[e.i].color, 0xffffff], 9, 3.2, 8); }
        else if (e.type === "hit") { fx.burst(e.x, 0.9, e.z, [0xffffff, cs[e.by].color], 8, 4); if (e.i === 0) { shake.add(0.35); vib(35); sfx.bump(); } }
        else if (e.type === "roller") { fx.ring(e.x, e.z, 0xffffff, 0.4, 2.2, 0.5); fx.pop("Rouleau !", clamp(e.x, -4, 4), 1.8, e.z, "#ffffff", 0.9); }
        else if (e.type === "take") { fx.burst(e.x, 0.6, e.z, [cs[e.i].color, 0xffffff], 16, 5); if (e.i === 0) { fx.pop("Peinture XXL !", clamp(e.x, -4, 4), 2.2, e.z, "#ffd23f", 1); vib(30); sfx.apply(); } }
      }
      S.events.length = 0;
      for (let k = 0; k < N * N; k++) if (pop[k] > 0) { pop[k] = Math.max(0, pop[k] - dt * 5); place(k, 1 + Math.sin(pop[k] * Math.PI) * 1.6); dirty = true; }
      if (dirty) { tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true; dirty = false; }
      roller.visible = Boolean(S.roller);
      if (S.roller) { roller.position.set(S.roller.x, 0.7 + Math.sin(tt * 4) * 0.12, S.roller.z); roller.rotation.y = tt * 1.8; halo.material.opacity = 0.5 + 0.4 * Math.sin(tt * 8); }
      for (const a of A) {
        const { o, b } = a, g = b.group;
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-14 * dt));
        g.position.set(o.x, 0, o.z); g.rotation.y = a.rot;
        b.anim({ run: clamp(Math.hypot(o.vx, o.vz) / 5, 0, 1), stun: o.stun > 0, t: tt + o.i });
        a.ring.position.set(o.x, 0.08, o.z);
        a.aura.visible = o.roller > 0; if (a.aura.visible) { a.aura.position.set(o.x, 0.09, o.z); a.aura.scale.setScalar(1 + 0.15 * Math.sin(tt * 10)); }
      }
      const lead = sim.rank()[0];
      const sig = JSON.stringify(S.P.map((o) => sim.tiles(o)).concat(lead));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, icon: lead === i && sim.tiles(o) > 0 ? "crown" : null, text: NAMES[i] + " " + sim.tiles(o), on: lead === i, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: H + 0.9, hd: H + 0.9, tilt: 0.55, cz: 0.4 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Guerre de peinture : repeins un maximum de dalles à ta couleur" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Foncer" testid="pt-dash" className="wide" on={(v) => act.dash && act.dash(v)}><Icon name="bolt" /> Foncer !</HoldBtn>} />
  );
}

/* ============================== PLATEFORMES MUSICALES ============================== */
export function MusicPads({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "forest", fog: [40, 105] });
    abyss(THREE, scene, null, -6);
    const sim = createChairs(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake(), tune = makeTune();
    act.dash = (v) => input.set("act", v);
    const cs = colored(color, look), R = CH.R;
    scene.add(discArena(THREE, { R: R + 0.15, color: 0x47e08f, ring: 0x47e08f, stripes: [[2.2, 2.3, COL.white], [4.3, 4.4, COL.white]] }));
    // égaliseur tout autour : il danse tant que la musique joue
    const EQ = 36, eq = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 1, 0.34), new THREE.MeshBasicMaterial({ color: 0x47e08f }), EQ), M = new THREE.Matrix4();
    scene.add(eq);
    const eqH = new Float32Array(EQ);
    // les plateformes (créées au « STOP ! »)
    const padMeshes = new Map();
    const mkPad = () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(CH.padR, CH.padR, 0.16, 32), new THREE.MeshStandardMaterial({ color: 0xdffcff, emissive: 0x5ee1ff, emissiveIntensity: 0.6, roughness: 0.3 }));
      top.position.y = 0.08; g.add(top);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(CH.padR + 0.06, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.17; g.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(CH.padR * 0.95, CH.padR * 0.95, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ee1ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      beam.position.y = 2; g.add(beam);
      scene.add(g);
      return { g, top, ring, beam, owner: -2 };
    };
    const A = S.P.map((o, i) => ({ o, b: mkActor(THREE, scene, cs[i]), rot: o.face, ring: footRing(THREE, scene, cs[i].color), gone: 0 }));
    let cur = size, lastSig = "", lastScore = -1, finished = false, phase = "";
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "stop") { fx.pop("STOP !", 0, 2.6, 0, "#ffffff", 1.4); shake.add(0.2); sfx.stop(); vib(40); }
        else if (e.type === "music") fx.pop("Manche " + e.round, 0, 2.4, 0, "#c8ffe0", 1);
        else if (e.type === "seat") { fx.burst(e.x, 0.5, e.z, [cs[e.i].color, 0xffffff], 12, 4); fx.ring(e.x, e.z, cs[e.i].color, 0.4, 1.6, 0.35); if (e.i === 0) { sfx.apply(); vib(30); } }
        else if (e.type === "dash") { const o = S.P[e.i]; fx.burst(o.x, 0.25, o.z, 0xffffff, 6, 2.6, 4); }
        else if (e.type === "hit") { fx.burst(e.x, 1.0, e.z, [0xffffff, 0x47e08f], 8, 4); if (e.i === 0) { shake.add(0.3); vib(35); sfx.bump(); } }
        else if (e.type === "out") { fx.burst(e.x, 1.0, e.z, [cs[e.i].color, 0xdffcff], 22, 5, 3); fx.pop(e.i === 0 ? "Éliminé…" : NAMES[e.i] + " éliminé", clamp(e.x, -4, 4), 2.6, clamp(e.z, -4, 4), "#ffffff", 0.9); if (e.i === 0) { shake.add(0.5); vib([60, 40, 60]); } sfx.out(); }
        else if (e.type === "win") { const o = S.P[e.i]; fx.burst(o.x, 1.4, o.z, [0xffd23f, 0xffffff, cs[e.i].color], 26, 6); fx.pop(e.i === 0 ? "Victoire !" : NAMES[e.i] + " gagne", clamp(o.x, -4, 4), 3, o.z, "#ffd23f", 1.2); if (e.i === 0) sfx.win(); }
      }
      S.events.length = 0;
      if (S.phase !== phase) { phase = S.phase; if (phase === "music") tune.start(); else tune.stop(); }
      // égaliseur
      for (let k = 0; k < EQ; k++) {
        const a = (k / EQ) * Math.PI * 2, want = S.phase === "music" ? 0.4 + Math.abs(Math.sin(tt * (3 + (k % 5)) + k * 1.7)) * 1.8 : 0.15;
        eqH[k] += (want - eqH[k]) * Math.min(1, dt * 14);
        M.makeScale(1, eqH[k], 1); M.setPosition(Math.sin(a) * (R + 0.9), -0.2 + eqH[k] / 2, Math.cos(a) * (R + 0.9)); eq.setMatrixAt(k, M);
      }
      eq.instanceMatrix.needsUpdate = true;
      // plateformes
      for (const [p, m] of padMeshes) if (!S.pads.includes(p)) { scene.remove(m.g); padMeshes.delete(p); }
      for (const p of S.pads) {
        let m = padMeshes.get(p); if (!m) { m = mkPad(); padMeshes.set(p, m); }
        const k = Math.min(1, p.t / 0.35);
        m.g.position.set(p.x, -0.3 + k * 0.3, p.z); m.g.scale.setScalar(0.4 + 0.6 * k);
        if (m.owner !== p.owner) {
          m.owner = p.owner;
          const c = new THREE.Color(p.owner >= 0 ? cs[p.owner].color : 0x5ee1ff);
          m.top.material.emissive.copy(c); m.beam.material.color.copy(c); m.ring.material.color.set(p.owner >= 0 ? c : 0xffffff);
        }
        m.beam.material.opacity = p.owner >= 0 ? 0.1 : 0.16 + 0.1 * Math.sin(tt * 10);
      }
      for (const a of A) {
        const { o, b } = a, g = b.group;
        if (o.out) {                                           // dématérialisation : on rétrécit en scintillant puis on disparaît
          a.gone += dt; const k = Math.max(0, 1 - a.gone / 0.7);
          g.scale.setScalar(1.3 * k); g.visible = k > 0.02 && Math.sin(tt * 50) > -0.4; a.ring.visible = false; if (b.shadow) b.shadow.visible = false;
          continue;
        }
        a.rot += wrapPi(o.face - a.rot) * (1 - Math.exp(-14 * dt));
        g.position.set(o.x, o.seat >= 0 ? 0.16 : 0, o.z); g.rotation.y = a.rot;
        b.anim({ run: o.seat >= 0 ? 0 : clamp(Math.hypot(o.vx, o.vz) / 5, 0, 1), stun: o.stun > 0, cheer: o.seat >= 0 || S.winner === o.i, t: tt + o.i });
        a.ring.position.set(o.x, 0.08, o.z);
      }
      const sig = JSON.stringify(S.P.map((o) => [o.rounds, o.out, o.seat >= 0, S.winner]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.P.map((o, i) => ({ key: i, color: cs[i].color, icon: S.winner === i ? "crown" : o.out ? "skull" : null, text: NAMES[i] + " " + sim.pts(o), on: o.seat >= 0 || S.winner === i, dead: o.out, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: R + 1.4, hd: R + 1.2, tilt: 0.62, cz: 0.4 });
        shake.apply(camera, dt);
        fx.update(dt);
        // éliminé : on montre la sortie puis on termine (ton score ne bougera plus)
        const outLong = S.me.out && S.me.outT > 2.2;
        if ((S.done || outLong) && !finished) { finished = true; tune.stop(); sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { tune.stop(); input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Plateformes musicales : au STOP, monte sur une plateforme avant les autres" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Foncer" testid="ch-dash" className="wide" on={(v) => act.dash && act.dash(v)}><Icon name="bolt" /> Foncer !</HoldBtn>} />
  );
}

/* ============================== TRAÎNÉES DE LUMIÈRE ============================== */
export function LightTrails({ seed, seconds, onFinish, color, look }) {
  const finish = useFinish(onFinish), sc = useScore(), act = useRef({}).current, simRef = useRef(null);
  const [chips, setChips] = useSig([]);
  const rd = useReady();
  const clock = useClock(seconds, () => finish(simRef.current ? simRef.current.score() : 0), rd.ready);
  const setup = ({ THREE, scene, camera, el, size }) => {
    candyWorld(THREE, scene, { zone: "core", fog: [40, 110] });
    abyss(THREE, scene, null, -7);
    const sim = createTrails(seed, { seconds }), S = sim.S;
    simRef.current = sim;
    const input = makeInput(el), fx = makeFx(THREE, scene), shake = makeShake();
    act.boost = (v) => input.set("act", v);
    const cs = colored(color, look), G = TR.G, C = TR.cell, W = G * C, half = W / 2;
    // le plateau : dalle sombre quadrillée (une case = une case de la grille), bord lumineux
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.5, W + 0.4), plastic(THREE, 0x0d1a33, { rough: 0.4 }));
    floor.position.y = -0.27; scene.add(floor);
    const tex = gridTexture(THREE, { line: 3 }).clone(); tex.needsUpdate = true; tex.repeat.set(G / 2, G / 2);
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({ color: 0x5ee1ff, map: tex, transparent: true, opacity: 0.35, depthWrite: false }));
    grid.rotation.x = -Math.PI / 2; grid.position.y = 0.002; scene.add(grid);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x5ee1ff, transparent: true, opacity: 0.55 });
    for (const [x, z, w, d] of [[0, -half - 0.1, W + 0.4, 0.12], [0, half + 0.1, W + 0.4, 0.12], [-half - 0.1, 0, 0.12, W + 0.4], [half + 0.1, 0, 0.12, W + 0.4]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), wallMat); m.position.set(x, 0.25, z); scene.add(m);
    }
    // traînées : un mur fin par case parcourue (orienté dans le sens du trajet), plus un bout qui s'étire jusqu'à la planche
    const cap = G * G, segGeo = new THREE.BoxGeometry(0.16, 0.72, C * 1.02), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
    const trails = cs.map((c) => { const m = new THREE.InstancedMesh(segGeo, new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.85 }), cap); m.count = 0; m.frustumCulled = false; scene.add(m); return m; });
    const stretch = cs.map((c) => { const m = new THREE.Mesh(segGeo, new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.85 })); scene.add(m); return m; });
    const ang = (d) => Math.atan2(sim.DIRS[d][0], sim.DIRS[d][1]);
    const addSeg = (i, x0, z0, x1, z1) => {
      const m = trails[i]; if (m.count >= cap) return;
      const [ax, az] = sim.world(x0, z0), [bx, bz] = sim.world(x1, z1);
      Q.setFromAxisAngle(UP, Math.atan2(bx - ax, bz - az)); V.set((ax + bx) / 2, 0.36, (az + bz) / 2);
      M.compose(V, Q, SC); m.setMatrixAt(m.count++, M); m.instanceMatrix.needsUpdate = true;
    };
    // planches et pilotes
    const A = S.B.map((b, i) => {
      const board = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 1.05), plastic(THREE, 0x16284a, { rough: 0.3 })); deck.position.y = 0.14; board.add(deck);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 1.12), new THREE.MeshBasicMaterial({ color: cs[i].color })); glow.position.y = 0.09; board.add(glow);
      scene.add(board);
      const fig = mkActor(THREE, scene, cs[i]); fig.group.scale.setScalar(0.74);
      return { b, board, fig, last: [b.x, b.z], rot: ang(b.d), gone: 0 };
    });
    let cur = size, lastSig = "", lastScore = -1, finished = false;
    const sync = (dt, tt) => {
      for (const e of S.events) {
        if (e.type === "cell") { const a = A[e.i]; addSeg(e.i, a.last[0], a.last[1], e.x, e.z); a.last = [e.x, e.z]; }
        else if (e.type === "boost") { const b = S.B[e.i], [x, z] = sim.world(b.x, b.z); fx.burst(x, 0.3, z, [cs[e.i].color, 0xffffff], 8, 3, 6); if (e.i === 0) { vib(20); sfx.select(); } }
        else if (e.type === "crash") {
          const [x, z] = sim.world(e.x, e.z); fx.burst(x, 0.6, z, [cs[e.i].color, 0xffffff, 0xdffcff], 24, 6, 6); fx.ring(x, z, cs[e.i].color, 0.3, 2.4, 0.45);
          fx.pop(e.i === 0 ? "Choc !" : NAMES[e.i] + " sort", clamp(x, -5, 5), 1.8, clamp(z, -5, 5), "#ffffff", 0.9);
          if (e.i === 0) { shake.add(0.6); vib([70, 40, 70]); sfx.out(); } else sfx.bump();
        } else if (e.type === "kill" && e.i === 0) { const v = S.B[e.victim], [x, z] = sim.world(v.x, v.z); fx.pop("+" + TR.kill, clamp(x, -5, 5), 2.4, clamp(z, -5, 5), "#ffd23f", 1); }
        else if (e.type === "win") { const b = S.B[e.i], [x, z] = sim.world(b.x, b.z); fx.burst(x, 1, z, [0xffd23f, 0xffffff, cs[e.i].color], 26, 6); fx.pop(e.i === 0 ? "Dernier en lice !" : NAMES[e.i] + " gagne", clamp(x, -5, 5), 2.6, clamp(z, -5, 5), "#ffd23f", 1.1); if (e.i === 0) sfx.win(); }
      }
      S.events.length = 0;
      for (const a of A) {
        const { b, board, fig } = a, g = fig.group;
        const [dx, dz] = sim.DIRS[b.d], [cx, cz] = sim.world(b.x, b.z), p = b.alive ? Math.min(b.prog, 1) : 0;
        const x = cx + dx * p * C, z = cz + dz * p * C;
        a.rot += wrapPi(ang(b.d) - a.rot) * (1 - Math.exp(-18 * dt));
        board.position.set(x, b.alive ? 0.05 + Math.sin(tt * 6 + b.i) * 0.03 : 0.05, z); board.rotation.y = a.rot;
        // bout de traînée : de la dernière case jusqu'à la planche
        const st = stretch[b.i];
        st.visible = b.alive && p > 0.05;
        if (st.visible) { st.position.set((cx + x) / 2, 0.36, (cz + z) / 2); st.rotation.y = ang(b.d); st.scale.set(1, 1, Math.max(0.05, p)); }
        if (!b.alive) {
          a.gone += dt; const k = Math.max(0, 1 - a.gone / 0.6);
          g.visible = k > 0.02 && Math.sin(tt * 50) > -0.4; board.visible = g.visible; g.scale.setScalar(0.74 * k); if (fig.shadow) fig.shadow.visible = false;
          continue;
        }
        const lean = clamp(wrapPi(ang(b.d) - a.rot) * 1.6, -1, 1);
        g.position.set(x, 0.18, z); g.rotation.y = a.rot;
        fig.anim({ surf: lean, t: tt + b.i });
        board.rotation.z = -lean * 0.25;                               // la planche penche dans les virages
      }
      const sig = JSON.stringify(S.B.map((b) => [sim.pts(b), b.alive]));
      if (sig !== lastSig) { lastSig = sig; setChips(S.B.map((b, i) => ({ key: i, color: cs[i].color, icon: b.alive ? (S.last === i ? "crown" : null) : "skull", text: NAMES[i] + " " + sim.pts(b), on: S.last === i, dead: !b.alive, me: i === 0 }))); }
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
        fitCamera(camera, cur, { hw: half + 0.6, hd: half + 0.6, tilt: 0.5, cz: 0.3 });
        shake.apply(camera, dt);
        fx.update(dt);
        if (S.done && !finished) { finished = true; sc.set(sim.score()); finish(sim.score()); }
      },
      dispose() { input.dispose(); fx.dispose(); },
    };
  };
  return (
    <Shell clock={clock} score={sc.val} rd={rd} setup={setup} label="Traînées de lumière : tourne à angle droit, ne touche aucun mur de lumière" onFail={() => finish(0)}
      chips={<Chips items={chips} />}
      pads={<HoldBtn label="Turbo" testid="tr-boost" className="wide" on={(v) => act.boost && act.boost(v)}><Icon name="bolt" /> Turbo</HoldBtn>} />
  );
}
