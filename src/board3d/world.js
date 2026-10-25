// Décor du Plateau 3D : île de nuit, boucle de 32 cases lumineuses, chemin fléché, torches, arbres, boutiques, donjon du Gredin, gemme.
// Rien ici ne connaît les règles du jeu : on donne les types de cases (`spaces`) et on pose le décor. Tout est fait de formes simples
// (mêmes matières « plastique » que les mini-jeux), pour rester fluide sur un téléphone.
import { trackPoints, BD_N, extent } from "./layout.js";
import { SPACE_INFO } from "../data/board.js";
import { plastic } from "../minigames/three/kit3d.jsx";

export const TYPE_COL = {
  start: [0xf5efdc, 0x9a927a], blue: [0x3aa4ff, 0x1b5fb0], red: [0xff5a70, 0xa82a3c], item: [0x86dc3a, 0x4a8a1a], event: [0xa06bff, 0x5a36a8],
  shop: [0xffb81f, 0xa86f00], shop2: [0x4a3470, 0x1d1236], chance: [0xff4fa3, 0xa01c64], boss: [0xd0203a, 0x560a14],
};
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Pastille dessinée sur le dessus d'une case : « + » / « − » pour les cases de pièces, l'émoji de la case pour les autres. */
function decalTexture(THREE, type) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "middle";
  if (type === "blue" || type === "red") {
    g.font = "400 110px 'Luckiest Guy', Rubik, sans-serif"; g.lineWidth = 12; g.strokeStyle = "rgba(10,5,25,.85)"; g.fillStyle = "#fff";
    const s = type === "blue" ? "+" : "−"; g.strokeText(s, 64, 70); g.fillText(s, 64, 70);
  } else {
    g.font = "84px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    g.fillText(SPACE_INFO[type].emoji, 64, 70);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/** Cube flottant couvert d'un émoji (cadeau, point d'interrogation, machine à sous). */
function emojiCube(THREE, emoji, bg) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(10,5,25,.9)"; g.lineWidth = 12; g.strokeRect(0, 0, 128, 128);
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = "74px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; g.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t });
  return new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), m);
}
/** Petit disque lumineux (étincelles, halo de la gemme). */
export function glowTexture(THREE) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Construit le monde. spaces : type de chaque case. Renvoie
 * { tiles, ext, update(t, dt, o), setGem(index, fly), setHere(index), setMood(sprint), dispose(), glow }.
 */
export function buildWorld(THREE, scene, spaces) {
  const T = trackPoints(BD_N), ext = extent(T), R = rng(7);
  const own = [];                                             // textures à libérer
  const mat = (c, o) => plastic(THREE, c, o);
  const root = new THREE.Group(); scene.add(root);
  const glow = glowTexture(THREE); own.push(glow);

  /* ciel de nuit, brume, lumières */
  const skyDay = new THREE.Color(0x1b1236), skyHot = new THREE.Color(0x3d1226);
  scene.background = skyDay.clone(); scene.fog = new THREE.Fog(skyDay.getHex(), 28, 78);
  const hemi = new THREE.HemisphereLight(0xb7acff, 0x3a2a66, 2.7); scene.add(hemi);
  const moonL = new THREE.DirectionalLight(0xdfe6ff, 2.6); moonL.position.set(-8, 16, 10); scene.add(moonL);
  const warm = new THREE.PointLight(0xffa24a, 18, 9, 1.6); warm.position.set(0, 3, 6); scene.add(warm);   // lueur chaude qui suit le joueur
  {
    const n = 320, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, e = 0.12 + R() * 1.2, r = 70; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r - 10; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.85, map: glow, depthWrite: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 18), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false }));
    moon.position.set(-34, 30, -52); scene.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffe9b0, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); halo.scale.set(22, 22, 1); halo.position.copy(moon.position); scene.add(halo);
  }

  /* île : dessus herbeux, flancs rocheux en pointe, quelques rochers qui flottent */
  const GR = 15;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(GR, GR - 0.8, 1.3, 56), [mat(0x2b2447), mat(0x3aa070, { rough: 0.9 }), mat(0x2b2447)]); top.position.y = -0.66; root.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(GR - 0.3, 0.32, 8, 64), mat(0x58c47a, { rough: 0.8 })); rim.rotation.x = Math.PI / 2; rim.position.y = -0.04; root.add(rim);
  const rock = new THREE.Mesh(new THREE.ConeGeometry(GR - 0.8, 11, 28, 1), mat(0x4a3a6e, { rough: 0.95 })); rock.rotation.x = Math.PI; rock.position.y = -7.2; root.add(rock);
  for (let i = 0; i < 7; i++) {
    const a = R() * Math.PI * 2, d = GR + 2 + R() * 7, s = 0.6 + R() * 1.4;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(i % 2 ? 0x5a4a82 : 0x3d3260, { rough: 0.95 }));
    m.position.set(Math.cos(a) * d, -3 - R() * 7, Math.sin(a) * d * 0.8); m.rotation.set(R() * 3, R() * 3, 0); root.add(m);
  }

  /* chemin : un tronçon entre deux cases + une flèche qui montre le sens de marche */
  const roadM = mat(0x5b4a8a, { rough: 0.8 }), arrowM = new THREE.MeshBasicMaterial({ color: 0xffd34a });
  for (let k = 0; k < BD_N; k++) {
    const a = T[k], b = T[(k + 1) % BD_N], len = Math.hypot(b.x - a.x, b.z - a.z);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, len), roadM);
    seg.position.set((a.x + b.x) / 2, 0.07, (a.z + b.z) / 2); seg.rotation.y = a.ang; root.add(seg);
    const ar = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 3), arrowM);
    ar.rotation.x = Math.PI / 2; ar.rotation.z = Math.PI; ar.position.set((a.x + b.x) / 2, 0.17, (a.z + b.z) / 2);
    const holder = new THREE.Group(); holder.position.copy(ar.position); ar.position.set(0, 0, 0); holder.rotation.y = a.ang; holder.add(ar); root.add(holder);
  }

  /* cases */
  const decals = {}, tiles = [], floaters = [], flames = [], decor = [], decalMeshes = [];
  const addDecor = (o, x, z) => { root.add(o); decor.push({ o, x, z, s0: o.scale.x, k: 1 }); };
  const outward = (k) => { const l = Math.hypot(T[k].x, T[k].z) || 1; return { x: T[k].x / l, z: T[k].z / l }; };
  for (let k = 0; k < BD_N; k++) {
    const type = spaces[k] || "blue", [cTop, cSide] = TYPE_COL[type] || TYPE_COL.blue;
    const g = new THREE.Group(); g.position.set(T[k].x, 0, T[k].z);
    const top2 = new THREE.MeshStandardMaterial({ color: cTop, roughness: 0.45, emissive: cTop, emissiveIntensity: 0.28 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.76, 0.4, 28), [mat(cSide, { rough: 0.6 }), top2, mat(cSide)]);
    body.position.y = 0.2; g.add(body);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 6, 28), new THREE.MeshBasicMaterial({ color: 0xfff2dc })); lip.rotation.x = Math.PI / 2; lip.position.y = 0.4; g.add(lip);
    if (!decals[type]) { decals[type] = decalTexture(THREE, type); own.push(decals[type]); }
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: decals[type], transparent: true, depthWrite: false }));
    d.rotation.x = -Math.PI / 2; d.position.y = 0.415; g.add(d); decalMeshes.push(d);
    root.add(g);
    tiles.push({ x: T[k].x, z: T[k].z, y: 0.4, ang: T[k].ang, type, group: g, top: top2 });
    const o = outward(k);
    if (type === "item" || type === "event" || type === "chance") {
      const cube = emojiCube(THREE, SPACE_INFO[type].emoji, type === "item" ? "#2d7a2a" : type === "event" ? "#5a36a8" : "#a01c64");
      cube.position.set(T[k].x, 1.35, T[k].z); root.add(cube); floaters.push({ m: cube, k, base: 1.35 });
    }
    if (type === "shop" || type === "shop2") {                  // petite échoppe sur le bord extérieur
      const hut = new THREE.Group(), dark = type === "shop2";
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 1.1), mat(dark ? 0x2a1d44 : 0xfff2dc)); wall.position.y = 0.5; hut.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 4), mat(dark ? 0x6b1030 : 0xff7a1a)); roof.rotation.y = Math.PI / 4; roof.position.y = 1.35; hut.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), mat(dark ? 0xffb81f : 0x7a4a1a)); door.position.set(0, 0.35, 0.57); hut.add(door);
      hut.position.set(T[k].x + o.x * 2.2, 0, T[k].z + o.z * 2.2); hut.rotation.y = Math.atan2(-o.x, -o.z); root.add(hut);
    }
    if (type === "boss") {                                       // piques du Gredin
      for (let i = 0; i < 3; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.04, 1.5 - i * 0.35, 5), mat(0x3a0a14));
        sp.position.set(T[k].x + o.x * (1.9 + i * 0.45) + (i - 1) * 0.5 * -o.z, 0.7 - i * 0.12, T[k].z + o.z * (1.9 + i * 0.45) + (i - 1) * 0.5 * o.x); root.add(sp);
      }
      const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff2a3a, transparent: true, opacity: 0.8, depthWrite: false })); eye.scale.set(2.2, 2.2, 1); eye.position.set(T[k].x, 0.9, T[k].z); root.add(eye);
    }
  }

  /* torches autour du chemin */
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffa23a }), poleM = mat(0x4a2f1a);
  for (let k = 1; k < BD_N; k += 3) {
    const o = outward(k), x = T[k].x + o.x * 1.25, z = T[k].z + o.z * 1.25;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6), poleM); pole.position.set(x, 0.55, z); root.add(pole);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), flameM); fl.scale.y = 1.4; fl.position.set(x, 1.25, z); root.add(fl);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff9a2a, transparent: true, opacity: 0.55, depthWrite: false })); halo.scale.set(1.6, 1.6, 1); halo.position.set(x, 1.3, z); root.add(halo);
    flames.push({ fl, halo, ph: R() * 6 });
  }

  /* arbres, champignons lumineux, rochers : jamais sur le chemin */
  const nearTrack = (x, z, d) => T.some((t) => Math.hypot(t.x - x, t.z - z) < d);
  const placed = [];
  const free = (x, z, d) => !nearTrack(x, z, d) && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.0) && Math.hypot(x, z) < GR - 1.5;
  const treeM = [mat(0x2fa37a, { rough: 0.8 }), mat(0x6a4fd1, { rough: 0.8 }), mat(0x39b58a, { rough: 0.8 })], trunkM = mat(0x5a3a22, { rough: 0.9 });
  let tries = 0;
  while (placed.length < 54 && tries++ < 900) {
    const k = (R() * BD_N) | 0, o = outward(k), inside = R() < 0.3, dd = inside ? -(2 + R() * 3.2) : 1.8 + R() * 4.5, lat = (R() - 0.5) * 3;
    const x = T[k].x + o.x * dd - o.z * lat, z = T[k].z + o.z * dd + o.x * lat;
    if (Math.hypot(x, z) < 4.6 || !free(x, z, 1.8)) continue;
    placed.push({ x, z });
    const r = R();
    if (r < 0.62) {
      const s = 0.8 + R() * 0.8, tr = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.7 * s, 6), trunkM); trunk.position.y = 0.35 * s; tr.add(trunk);
      const m = treeM[(R() * 3) | 0];
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((0.7 - i * 0.17) * s, 0.85 * s, 7), m); c.position.y = (0.85 + i * 0.5) * s; tr.add(c); }
      tr.position.set(x, 0, z); tr.rotation.y = R() * 6; addDecor(tr, x, z);
    } else if (r < 0.88) {
      const s = 0.5 + R() * 0.5, col = [0xff4fa3, 0x37e0f5, 0xb06bff][(R() * 3) | 0], mg = new THREE.Group();
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.5 * s, 8), mat(0xfff2dc)); st.position.y = 0.25 * s; mg.add(st);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.5 })); cap.position.y = 0.5 * s; mg.add(cap);
      mg.position.set(x, 0, z); addDecor(mg, x, z);
    } else {
      const s = 0.4 + R() * 0.6, rk = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(0x6a5a92, { rough: 0.95 })); rk.position.set(x, s * 0.5, z); rk.rotation.set(R() * 3, R() * 3, R() * 3); addDecor(rk, x, z);
    }
  }

  /* donjon du Gredin au centre : colline, tour, toit rouge, fenêtres allumées */
  {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.4, 20), mat(0x3b2a5c, { rough: 0.9 })); hill.position.y = 0.7; root.add(hill);
    const mk = (x, z, r, h, c, roofC) => {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), mat(c)); tw.position.set(x, 1.0 + h / 2, z); root.add(tw);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 2, 14), mat(roofC)); rf.position.set(x, 1.0 + h + r, z); root.add(rf);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0xffd34a })); w.position.set(x + Math.sin(a) * r * 1.02, 1.0 + h * (0.45 + 0.17 * i), z + Math.cos(a) * r * 1.02); w.rotation.y = a; root.add(w); }
    };
    mk(0, 0, 1.0, 3.6, 0x5a3a8a, 0x8a1c3a); mk(-1.7, 0.7, 0.55, 2.2, 0x4a2f78, 0x6b1030); mk(1.6, -0.5, 0.6, 2.6, 0x4a2f78, 0x6b1030);
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff3a4a, transparent: true, opacity: 0.45, depthWrite: false })); eye.scale.set(4.5, 4.5, 1); eye.position.set(0, 3.2, 0.4); root.add(eye);
  }

  /* gemme : cristal qui tourne, halo et petit anneau ; ring = case où se trouve le joueur dont c'est le tour */
  const gem = new THREE.Group(); root.add(gem);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), new THREE.MeshStandardMaterial({ color: 0x4af0ff, emissive: 0x1ec8ff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, flatShading: true }));
  crystal.scale.y = 1.55; gem.add(crystal);
  const gh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x4af0ff, transparent: true, opacity: 0.8, depthWrite: false })); gh.scale.set(2.6, 2.6, 1); gem.add(gh);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 4, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x4af0ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = -1.0; gem.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.95 })); ring.rotation.x = Math.PI / 2; root.add(ring);
  const G = { at: 0, from: null, k: 1, fx: 0, fz: 0 };
  const gemPos = (i) => ({ x: tiles[i].x, z: tiles[i].z });
  const setGem = (i, fly) => {
    if (G.at === i && G.k >= 1) return;
    const a = G.k >= 1 ? gemPos(G.at) : { x: G.cx, z: G.cz };
    G.fx = a.x; G.fz = a.z; G.at = i; G.k = fly ? 0 : 1;
    if (!fly) { const p = gemPos(i); gem.position.set(p.x, 1.55, p.z); }
  };
  let hereAt = 0;
  const setHere = (i) => { hereAt = i; };
  let mood = 0, moodT = 0;

  return {
    tiles, ext, glow, root, T,
    setGem, setHere, setMood(v) { moodT = v ? 1 : 0; },
    gemAt: () => G.at,
    gemWorld: () => ({ x: gem.position.x, y: gem.position.y, z: gem.position.z }),
    /** o : { follow: { x, z } (la lueur chaude suit ce point), cam: { x, z } | null (position de la caméra : le décor qui masque le joueur rapetisse) } */
    update(t, dt, o = {}) {
      const cam = o.cam, f = o.follow;
      if (o.yaw != null) for (const d of decalMeshes) d.rotation.z = o.yaw;                  // les dessins sur les cases restent à l'endroit, vus de face comme d'en haut
      let vx = 0, vz = 0, vl = 0;
      if (cam && f) { vx = f.x - cam.x; vz = f.z - cam.z; vl = vx * vx + vz * vz; }
      for (const d of decor) {
        let want = 1;
        if (cam && f) {
          const u = vl > 1e-6 ? clamp01(((d.x - cam.x) * vx + (d.z - cam.z) * vz) / vl) : 0;
          const dist = Math.hypot(d.x - (cam.x + vx * u), d.z - (cam.z + vz * u));      // distance au segment caméra → joueur
          want = clamp01((dist - 0.9) / 1.7);
          if (u >= 0.999) want = 1;                                                      // derrière le joueur : on ne touche à rien
        }
        d.k += (want - d.k) * Math.min(1, dt * 7);
        const sc = d.s0 * (0.04 + 0.96 * d.k); d.o.scale.setScalar(sc); d.o.visible = d.k > 0.06;
      }
      mood += (moodT - mood) * Math.min(1, dt * 1.6);
      scene.background.copy(skyDay).lerp(skyHot, mood); scene.fog.color.copy(scene.background);
      hemi.color.setHex(mood > 0.5 ? 0xff9a7a : 0xb7acff); moonL.color.setHex(mood > 0.5 ? 0xffc29a : 0xdfe6ff);
      for (const f of floaters) { f.m.position.y = f.base + Math.sin(t * 2 + f.k) * 0.12; f.m.rotation.y = t * 1.1 + f.k; }
      for (const f of flames) { const s = 1 + Math.sin(t * 11 + f.ph) * 0.18 + Math.sin(t * 23 + f.ph) * 0.1; f.fl.scale.set(s, 1.4 * s, s); f.halo.material.opacity = (0.45 + mood * 0.35) * (0.8 + 0.2 * Math.sin(t * 9 + f.ph)); }
      if (G.k < 1) {
        G.k = Math.min(1, G.k + dt / 0.9);
        const k = G.k, p = gemPos(G.at), e = k * k * (3 - 2 * k);
        G.cx = lerp(G.fx, p.x, e); G.cz = lerp(G.fz, p.z, e);
        gem.position.set(G.cx, 1.55 + Math.sin(Math.PI * k) * 3.2, G.cz);
      } else { const p = gemPos(G.at); gem.position.set(p.x, 1.55 + Math.sin(t * 2.2) * 0.14, p.z); G.cx = p.x; G.cz = p.z; }
      crystal.rotation.y = t * 1.6; gh.material.opacity = 0.65 + 0.2 * Math.sin(t * 3);
      const h = tiles[hereAt];
      if (h) { ring.position.set(h.x, 0.45, h.z); const s = 1 + 0.06 * Math.sin(t * 5); ring.scale.set(s, s, s); }
      if (o.follow) warm.position.set(o.follow.x, 2.6, o.follow.z);
      warm.intensity = 14 + mood * 10;
    },
    dispose() { own.forEach((x) => x.dispose && x.dispose()); },
  };
}
