// Doudous : garde-robe 3D. Couvre-chefs (posés au sommet de la tête), lunettes (sur les yeux peints), cou, dos,
// tenues (une couche de tissu qui épouse le corps, peinte par paintOutfit), chaussures (sur les pieds).
// Tout est construit à partir de la forme du corps (ctx.shape) : chaque espèce porte les mêmes pièces à sa taille.
import { paintOutfit, mix, lum } from "./doudou-paint.js";

const PI = Math.PI, TAU = PI * 2;

export function addGear(ctx) {
  const { THREE, M, shape, sp, P, core, feet, arms, soft, own, geo, faceAt, E, L, tc, Lc, C, tube, orient, grid } = ctx;
  const H = sp.H, Rx = sp.Rx;
  const anims = [];
  const mat = (hex, o) => soft(THREE, hex, o);
  const mesh = (g, m) => new THREE.Mesh(geo(g), m);
  const sphere = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
  const hatC = P.hatc.hex, glC = P.glc.hex, neckC = P.neckc.hex, backC = P.backc.hex, outC = P.outc.hex, out2 = P.out2.hex, shoeC = P.shoec.hex;
  const gold = mat("#e8b84a", { r: 0.28, m: 0.75 }), silver = mat("#d8dee9", { r: 0.25, m: 0.8 });
  const canvasTex = (w, h, draw) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; own.push(t); return t; };
  const own2 = (m) => (own.push(m), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const rot = (o, x, y, z) => { o.rotation.set(x, y, z); return o; };

  /* ---------------- repères de la tête ---------------- */
  const yB = H * 0.86, tB = shape.tAtY(yB), rB = shape.rxAt(tB), k = rB / 0.38;      // base des chapeaux
  const head = new THREE.Group(); head.position.set(0, yB, 0); head.scale.setScalar(k); core.add(head);
  const faceY = shape.pos(0, tc)[1];
  const yNeck = faceY + L.mouthY - 0.1 * Rx, tN = shape.tAtY(yNeck);
  /** Point de la tête (repère du groupe « head ») : angle φ, hauteur (fraction de H), décalé de off le long de la normale. */
  const onHead = (phi, yf, off = 0) => { const t = shape.tAtY(yf * H), p = shape.pos(phi, t), n = shape.normal(phi, t); return { p: [(p[0] + n[0] * off) / k, (p[1] + n[1] * off - yB) / k, (p[2] + n[2] * off) / k], n }; };
  const ring = (t, off) => { const p = shape.pos(PI / 2, t), q = shape.pos(0, t); return { rx: Math.abs(p[0]) + off, rz: Math.abs(q[2]) + off, y: p[1] }; };
  const torusAt = (t, off, tubeR, m, arc = TAU) => {
    const r = ring(t, off), g = new THREE.TorusGeometry(1, tubeR, 10, 64, arc);
    g.rotateX(PI / 2); g.scale(r.rx, 1, r.rz);
    const o = mesh(g, m); o.position.y = r.y; return o;
  };

  /* ================================ COUVRE-CHEFS ================================ */
  const hat = P.hat.id, hm = mat(hatC, { r: 0.65 }), hmDark = mat(mix(hatC, "#000000", 0.25), { r: 0.65 });
  const dome = (rx, ry, rz, m, y = -0.03) => { const o = mesh(new THREE.SphereGeometry(1, 36, 16, 0, TAU, 0, PI / 2), m); o.scale.set(rx, ry, rz); o.position.y = y; return o; };
  const disc = (r, h, m, y) => { const o = mesh(new THREE.CylinderGeometry(r, r, h, 48), m); o.position.y = y; return o; };
  const bend = (g, kx, kz = 0, h = 1) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) + kx * y * y); p.setZ(i, p.getZ(i) + kz * y * y); } g.computeVertexNormals(); return g; };
  const hatParts = [];
  const add = (...o) => { for (const x of o) { head.add(x); hatParts.push(x); } };
  switch (hat) {
    case "casquette": {
      add(dome(0.41, 0.25, 0.4, hm));
      const brim = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32, 1, false, -PI / 2, PI), hmDark); brim.scale.set(1.05, 1, 1.1); brim.position.set(0, -0.01, 0.22); brim.rotation.x = 0.12; add(brim);
      add(at(mesh(sphere(0.035), hmDark), 0, 0.23, 0));
      break;
    }
    case "bonnet": case "pompon": {
      add(dome(0.425, 0.33, 0.415, hm));
      const cuff = mesh(new THREE.TorusGeometry(0.405, 0.06, 12, 48), hmDark); cuff.rotation.x = PI / 2; cuff.scale.set(1, 0.98, 1.4); cuff.position.y = 0.0; add(cuff);
      if (hat === "pompon") { const pp = mesh(sphere(0.1, 18, 14), mat(mix(hatC, "#ffffff", 0.75), { r: 0.85 })); pp.position.y = 0.34; add(pp); }
      break;
    }
    case "beret": { const b = mesh(sphere(1, 32, 16), hm); b.scale.set(0.45, 0.17, 0.44); b.position.set(0.05, 0.08, 0.0); b.rotation.z = -0.22; add(b); const st = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.06, 8), hm); st.position.set(0.0, 0.26, 0.0); st.rotation.z = -0.22; add(st); break; }
    case "noeud": {
      const q = onHead(0.62, 0.9, 0.03), g = new THREE.Group(); g.position.set(q.p[0], q.p[1], q.p[2]); g.rotation.set(-0.15, 0.55, -0.4);
      for (const s of [-1, 1]) { const l = mesh(sphere(1, 20, 14), hm); l.scale.set(0.13, 0.085, 0.05); l.position.x = s * 0.11; l.rotation.z = s * 0.35; g.add(l); }
      g.add(mesh(sphere(0.048), hmDark)); add(g); break;
    }
    case "fleur": {
      const q = onHead(0.72, 0.84, 0.02), g = new THREE.Group(); g.position.set(q.p[0], q.p[1], q.p[2]); orient(THREE, g, [0, 1, 0], [q.n[0], q.n[1] * 0.3, q.n[2]]); g.rotateY(0.15);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU, p2 = mesh(sphere(1, 16, 10), hm); p2.scale.set(0.07, 0.05, 0.02); p2.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0); p2.rotation.z = a; g.add(p2); }
      g.add(at(mesh(sphere(0.04), mat("#ffd24a", { r: 0.5 })), 0, 0, 0.02)); add(g); break;
    }
    case "pousse": {
      const green = mat("#62c46a", { r: 0.55 });
      const st = mesh(tube([[0, 0.0, 0], [0.01, 0.12, 0], [0.04, 0.24, 0.01]], () => 0.018, 10, 8), green); st.position.y = 0.1; add(st);
      for (const s of [-1, 1]) { const lf = mesh(sphere(1, 16, 10), green); lf.scale.set(0.1, 0.035, 0.055); lf.position.set(0.04 + s * 0.08, 0.36, 0.01); lf.rotation.z = s * 0.45; add(lf); }
      break;
    }
    case "fete": {
      const tex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = hatC; g.fillRect(0, 0, w, h); g.fillStyle = "#ffffff"; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 24, 0); g.lineTo(i * 24 + 12, 0); g.lineTo(i * 24 + 52, h); g.lineTo(i * 24 + 40, h); g.closePath(); g.fill(); } });
      const m = own2(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
      const g = new THREE.Group(); g.position.set(0.06, 0.12, 0); g.rotation.z = -0.18;
      const cone = mesh(new THREE.ConeGeometry(0.17, 0.38, 32, 1, true), m); cone.position.y = 0.19; g.add(cone);
      const pp = mesh(sphere(0.055), mat("#ffffff", { r: 0.8 })); pp.position.y = 0.39; g.add(pp); add(g); break;
    }
    case "antennes": {
      const band = mesh(new THREE.TorusGeometry(0.4, 0.022, 8, 40, PI), hm); band.position.y = -0.02; band.rotation.y = 0; band.scale.set(1.02, 1.12, 1); add(band);
      for (const s of [-1, 1]) {
        const a = mesh(tube([[s * 0.2, 0.3, 0], [s * 0.26, 0.42, 0.02], [s * 0.22, 0.55, 0.0], [s * 0.3, 0.64, 0.02]], () => 0.014, 20, 6), hmDark); add(a);
        const b = mesh(sphere(0.055), hm); b.position.set(s * 0.3, 0.66, 0.02); add(b); anims.push((t) => { b.position.y = 0.66 + Math.sin(t * 5 + s) * 0.015; });
      }
      break;
    }
    case "paille": case "cowboy": {
      const straw = hat === "paille" ? mat("#e8c77a", { r: 0.75 }) : hm;
      const brimG = new THREE.CylinderGeometry(hat === "paille" ? 0.64 : 0.6, hat === "paille" ? 0.64 : 0.6, 0.025, 48, 1);
      if (hat === "cowboy") { const p2 = brimG.attributes.position; for (let i = 0; i < p2.count; i++) { const x = p2.getX(i) / 0.6; p2.setY(i, p2.getY(i) + x * x * x * x * 0.16); } brimG.computeVertexNormals(); }
      const brim = mesh(brimG, straw); brim.position.y = 0.03; add(brim);
      const crown = mesh(new THREE.CylinderGeometry(hat === "paille" ? 0.33 : 0.3, 0.37, hat === "paille" ? 0.17 : 0.24, 36), straw); crown.position.y = hat === "paille" ? 0.11 : 0.15; add(crown);
      const top = mesh(new THREE.SphereGeometry(1, 30, 10, 0, TAU, 0, PI / 2), straw); top.scale.set(hat === "paille" ? 0.33 : 0.3, 0.06, hat === "paille" ? 0.33 : 0.3); top.position.y = hat === "paille" ? 0.195 : 0.27; add(top);
      const band = mesh(new THREE.CylinderGeometry(0.372, 0.375, 0.05, 36, 1, true), hat === "paille" ? hm : hmDark); band.position.y = 0.05; add(band);
      break;
    }
    case "bandeau": {
      const t = shape.tAtY(faceY + E.ry * 1.95), r = ring(t, 0.012);
      const b = new THREE.TorusGeometry(1, 0.045, 10, 64); b.rotateX(PI / 2); b.scale(r.rx, 1.25, r.rz);
      const o = mesh(b, hm); o.position.y = r.y; core.add(o);
      for (const s of [-1, 1]) { const tl = mesh(sphere(1, 14, 10), hm); tl.scale.set(0.035, 0.11, 0.025); tl.position.set(s * 0.07, r.y - 0.08, -r.rz - 0.01); tl.rotation.z = s * 0.4; core.add(tl); }
      break;
    }
    case "mage": case "sorciere": {
      const witch = hat === "sorciere";
      add(disc(witch ? 0.7 : 0.56, 0.025, hm, 0.03));
      const h = witch ? 0.8 : 0.68, r0 = witch ? 0.31 : 0.35, bx = witch ? -0.26 : -0.18, bz = witch ? -0.1 : -0.02;
      const cone = mesh(tube([[0, 0, 0], [0, h * 0.45, 0], [bx * 0.35, h * 0.78, bz * 0.4], [bx, h, bz]], (u) => r0 * Math.pow(1 - u, 1.05) + 0.004, 40, 28), hm); cone.position.y = 0.02; add(cone);
      const band = mesh(new THREE.CylinderGeometry(witch ? 0.292 : 0.33, witch ? 0.3 : 0.34, 0.07, 36, 1, true), witch ? mat("#2d2b36", { r: 0.6 }) : mat(mix(hatC, "#ffd24a", 0.7), { r: 0.5 })); band.position.y = 0.07; add(band);
      if (witch) { const bk = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.02), gold); bk.position.set(0, 0.07, 0.3); add(bk); }
      else for (let i = 0; i < 3; i++) { const s2 = mesh(new THREE.OctahedronGeometry(0.035), mat("#ffe27a", { r: 0.3, e: 0x664400 })); s2.position.set(Math.sin(i * 2.1) * 0.2, 0.18 + i * 0.12, Math.cos(i * 2.1) * 0.2 * 0.9 + 0.02); add(s2); }
      break;
    }
    case "chef": {
      const white = mat("#fbfbf7", { r: 0.85 });
      add(at(mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.15, 36), white), 0, 0.07, 0));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, b = mesh(sphere(0.17, 18, 14), white); b.position.set(Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.17); add(b); }
      add(at(mesh(sphere(0.2, 18, 14), white), 0, 0.32, 0));
      break;
    }
    case "pirate": {
      const b = mesh(new THREE.SphereGeometry(1, 40, 16, 0, TAU, 0, PI / 2), hm); b.scale.set(0.66, 0.3, 0.2); b.position.y = 0.02; add(b);
      const tr = mesh(new THREE.TorusGeometry(1, 0.035, 8, 48, PI), gold); tr.scale.set(0.66, 0.3, 1); tr.position.set(0, 0.02, 0.0); tr.scale.z = 3.5; add(tr);
      const ck = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), mat("#fbfbf7", { r: 0.6 })); ck.rotation.x = PI / 2; ck.position.set(0, 0.16, 0.17); add(ck);
      break;
    }
    case "hautdeforme": {
      add(disc(0.48, 0.03, hm, 0.03));
      add(at(mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.44, 36), hm), 0, 0.25, 0));
      add(at(mesh(new THREE.CylinderGeometry(0.302, 0.305, 0.07, 36, 1, true), mat("#e5494f", { r: 0.55 })), 0, 0.09, 0));
      break;
    }
    case "cornes": for (const s of [-1, 1]) { const q = onHead(s * 0.3, 0.93, -0.02), c2 = mesh(tube([[0, 0, 0], [s * 0.035, 0.13, 0.01], [s * 0.12, 0.24, -0.02]], (u) => 0.075 * (1 - u * 0.92), 14, 12), hm); c2.position.set(q.p[0], q.p[1], q.p[2]); add(c2); } break;
    case "tiare": {
      const band = mesh(new THREE.TorusGeometry(0.4, 0.018, 8, 40, PI), gold); band.rotation.set(0, PI, 0); band.rotation.x = -0.35; band.position.set(0, 0.0, 0.0); band.scale.set(1.03, 0.4, 1); add(band);
      const gem = mesh(new THREE.OctahedronGeometry(0.06), mat(hatC, { r: 0.15, e: 0x222222 })); gem.position.set(0, 0.15, 0.33); gem.scale.set(0.8, 1.2, 0.5); add(gem);
      for (const s of [-1, 1]) { const g2 = mesh(new THREE.OctahedronGeometry(0.035), mat(hatC, { r: 0.15 })); g2.position.set(s * 0.2, 0.08, 0.28); add(g2); }
      break;
    }
    case "casque": {
      const band = mesh(new THREE.TorusGeometry(0.47, 0.035, 10, 40, PI), hm); band.position.y = -0.02; band.scale.set(1.0, 1.12, 1); add(band);
      for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 24), hm); cup.rotation.z = PI / 2; cup.position.set(s * 0.47, -0.05, 0); add(cup); const pad = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), mat("#2d2b36", { r: 0.7 })); pad.rotation.z = PI / 2; pad.position.set(s * 0.42, -0.05, 0); add(pad); }
      break;
    }
    case "aureole": { const h2 = mesh(new THREE.TorusGeometry(0.26, 0.032, 10, 48), mat("#ffe27a", { r: 0.3, e: 0x8a6a10 })); h2.rotation.x = PI / 2 - 0.15; h2.position.y = 0.42; add(h2); anims.push((t) => { h2.position.y = 0.42 + Math.sin(t * 2.4) * 0.025; }); break; }
    case "couronne": {
      const g = new THREE.CylinderGeometry(0.3, 0.28, 0.2, 40, 4, true), p2 = g.attributes.position;
      for (let i = 0; i < p2.count; i++) { if (p2.getY(i) > 0.09) { const a = Math.atan2(p2.getZ(i), p2.getX(i)); p2.setY(i, 0.1 + 0.08 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3)); } }
      g.computeVertexNormals();
      const cr = mesh(g, new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.28, metalness: 0.75, side: THREE.DoubleSide })); own.push(cr.material); cr.position.y = 0.12; cr.rotation.x = -0.08; add(cr);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + PI / 2, gm = mesh(sphere(0.03), mat(i % 2 ? "#e5494f" : "#5ea8ff", { r: 0.2 })); gm.position.set(Math.cos(a) * 0.295, 0.1, Math.sin(a) * 0.295); add(gm); }
      break;
    }
    case "aviateur": {
      const t = shape.tAtY(faceY + E.ry * 2.0), r = ring(t, 0.015);
      const strap = new THREE.TorusGeometry(1, 0.03, 8, 64); strap.rotateX(PI / 2); strap.scale(r.rx, 1.4, r.rz);
      const o = mesh(strap, hm); o.position.y = r.y; core.add(o);
      for (const s of [-1, 1]) {
        const phi = s * 0.36, p = shape.pos(phi, t), n = shape.normal(phi, t), gl = new THREE.Group();
        gl.position.set(p[0] + n[0] * 0.04, p[1] + n[1] * 0.04, p[2] + n[2] * 0.04); orient(THREE, gl, [n[0], n[1], n[2]], [0, 1, 0]);
        const rim = mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.06, 24), mat("#8c5c45", { r: 0.5 })); gl.add(rim);
        const lens = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.065, 24), mat("#7fd0ff", { r: 0.1, m: 0.3 })); gl.add(lens); core.add(gl);
      }
      break;
    }
    default: break;
  }

  /* ================================ LUNETTES ================================ */
  const gl = P.glasses.id;
  if (gl !== "aucune" && gl !== "masque") {
    const fm = mat(glC, { r: 0.35, m: 0.2 });
    const lensR = Math.max(E.rx, E.ry) * 1.24;
    const eyes = [-1, 1].map((s) => faceAt(s * E.ex, 0));
    const lift = 0.05 * (Rx / 0.6);
    const shapePath = (kind, r) => {
      const pts = [];
      if (kind === "carrees" || kind === "soleil") { for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU, c = Math.cos(a), s = Math.sin(a); const p = 4, x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p), y = Math.sign(s) * Math.pow(Math.abs(s), 2 / p); pts.push([x * r * 1.08, y * r * 0.88]); } }
      else if (kind === "etoiles") { for (let i = 0; i < 10; i++) { const a = PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.55 : r * 1.12; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } }
      else if (kind === "coeurs") { for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([x / 16 * r, y / 16 * r + r * 0.12]); } }
      else for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      return pts;
    };
    const lensFor = (kind) => {
      const pts = shapePath(kind, lensR);
      const frame = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)), true, kind === "etoiles" ? "catmullrom" : "centripetal", kind === "etoiles" ? 0.05 : 0.5), pts.length * 2, 0.014 * (Rx / 0.6), 6, true);
      let lens = null;
      if (kind === "soleil" || kind === "etoiles" || kind === "coeurs") {
        const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
        lens = new THREE.ShapeGeometry(sh, 16);
      }
      return { frame, lens };
    };
    const kind = gl === "monocle" ? "rondes" : gl === "visiere" ? null : gl;
    if (kind) {
      const { frame, lens } = lensFor(kind); geo(frame); if (lens) geo(lens);
      const lensMat = kind === "soleil" ? own2(new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.88 }))
        : own2(new THREE.MeshStandardMaterial({ color: kind === "coeurs" ? 0xff7fae : mix(glC, "#ffffff", 0.3), roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }));
      eyes.forEach((e, i) => {
        if (gl === "monocle" && i === 0) return;
        const g = new THREE.Group(); g.position.set(e.p[0] + e.n[0] * lift, e.p[1] + e.n[1] * lift, e.p[2] + e.n[2] * lift);
        orient(THREE, g, [0, 1, 0], [e.n[0], 0, e.n[2]]);
        g.add(new THREE.Mesh(frame, fm)); if (lens) { const l = new THREE.Mesh(lens, lensMat); l.position.z = -0.004; l.renderOrder = 3; g.add(l); }
        core.add(g);
      });
      const a = eyes[0].p, b = eyes[1].p;
      if (gl !== "monocle") {
        const bridge = mesh(tube([[a[0] + lensR * 0.95, a[1] + 0.01, a[2] + lift * 1.1], [0, a[1] + 0.04, a[2] + lift * 1.6], [b[0] - lensR * 0.95, b[1] + 0.01, b[2] + lift * 1.1]], () => 0.012 * (Rx / 0.6), 12, 6), fm); core.add(bridge);
        for (const [s, e] of [[-1, eyes[0]], [1, eyes[1]]]) {
          const phiA = e.phi + s * (lensR / shape.rxAt(e.t)) * 0.95, pts = [];
          for (let i = 0; i <= 6; i++) { const u = i / 6, phi = phiA + (s * 1.5 - phiA) * u, t = e.t + 0.012 * u, p = shape.pos(phi, t), n = shape.normal(phi, t), o = lift * (1 - u) + 0.018 * u; pts.push([p[0] + n[0] * o, p[1] + n[1] * o, p[2] + n[2] * o]); }
          core.add(mesh(tube(pts, () => 0.011 * (Rx / 0.6), 16, 6), fm));
        }
      } else {
        const e = eyes[1].p;
        core.add(mesh(tube([[e[0] + lensR * 0.7, e[1] - lensR * 0.6, e[2] + lift], [e[0] + lensR * 1.2, e[1] - lensR * 2.2, e[2] + 0.02], [e[0] + lensR * 0.8, e[1] - lensR * 3.4, e[2] - 0.04]], () => 0.007, 16, 5), gold));
      }
    }
    if (gl === "visiere") {
      const tA = tc - (E.ry * 1.25) / Lc, tZ = tc + (E.ry * 1.3) / Lc, pw = Math.min(1.35, Math.asin(Math.min(0.97, (E.ex + E.rx * 2.1) / shape.rxAt(tc))));
      const v = mesh(grid(THREE, shape, -pw, pw, tA, tZ, 36, 10, () => 0.05 * (Rx / 0.6)), own2(new THREE.MeshStandardMaterial({ color: 0x5ee1ff, emissive: 0x2f8bff, emissiveIntensity: 0.6, transparent: true, opacity: 0.42, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })));
      v.renderOrder = 3; core.add(v);
      for (const tt of [tA, tZ]) { const pts = []; for (let i = 0; i <= 24; i++) { const phi = -pw + (2 * pw * i) / 24, p = shape.pos(phi, tt), n = shape.normal(phi, tt); pts.push([p[0] + n[0] * 0.05, p[1] + n[1] * 0.05, p[2] + n[2] * 0.05]); } core.add(mesh(tube(pts, () => 0.012, 40, 6), mat(glC, { r: 0.3, m: 0.4 }))); }
    }
  }

  /* ================================ TENUES ================================ */
  const outfit = P.outfit.id;
  const DEF = {
    tshirt: [0.13, 1, 0, true], sweat: [0.06, 1, 0, true], salopette: [0.04, 0.97, 0, false], mariniere: [0.1, 1, 0, true], robe: [0.03, 1, 0.12, false],
    pyjama: [0.04, 1, 0, true], explorateur: [0.06, 1, 0, true], uniforme: [0.06, 1, 0, true], smoking: [0.05, 1, 0, true], ninja: [0.04, 1, 0, true],
    mage: [0.01, 1, 0.1, true], elfe: [0.08, 1, 0.05, true], numerique: [0.03, 1, 0, true], gothique: [0.01, 1, 0.13, true], pilote: [0.08, 1, 0, true],
    kimono: [0.02, 1, 0.06, true], armure: [0.1, 1, 0, true], heros: [0.04, 1, 0, true], royal: [0.0, 1, 0.08, true],
  };
  let sleeveMat = null;
  if (DEF[outfit]) {
    const [yb, ytk, flare, sleeves] = DEF[outfit];
    const t0 = Math.max(0.02, shape.tAtY(Math.max(0.01, yb * H))), t1 = Math.min(tN * ytk + (1 - ytk) * tN, tN);
    const c1 = outfit === "smoking" && P.outc.id === "5ea8ff" ? "#2d2b36" : outC;
    const W = 512, HH = 256;
    const T = { W, H: HH, t0, t1, X: (phi) => ((phi + PI) / TAU) * W, Y: (t) => (1 - (t - t0) / (t1 - t0)) * HH };
    const cv = document.createElement("canvas"); cv.width = W; cv.height = HH;
    const glowCv = paintOutfit(cv.getContext("2d"), T, outfit, c1, out2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; own.push(tex);
    let gtex = null; if (glowCv) { gtex = new THREE.CanvasTexture(glowCv); gtex.colorSpace = THREE.SRGBColorSpace; own.push(gtex); }
    const armor = outfit === "armure";
    const cm = own2(new THREE.MeshStandardMaterial({ map: tex, roughness: armor ? 0.3 : 0.78, metalness: armor ? 0.55 : 0, envMapIntensity: armor ? 0.9 : 0.25, emissive: gtex ? 0xffffff : 0x000000, emissiveMap: gtex, emissiveIntensity: gtex ? 1 : 0, side: THREE.DoubleSide }));
    const thick = 0.014 * (Rx / 0.6);
    const off = (phi, t) => thick + flare * Math.pow(Math.max(0, (0.42 - t) / 0.42), 1.6) * (Rx / 0.6);
    const shell = mesh(grid(THREE, shape, -PI, PI, t0, t1, 72, 24, off), cm);
    // UV : la grille couvre t0..t1 → v de 0 à 1 (la texture est peinte dans ce repère)
    core.add(shell);
    // ourlet du col (cache l'épaisseur)
    const neckHem = torusAt(t1, thick * 0.6, 0.016 * (Rx / 0.6), mat(outfit === "smoking" ? "#f7f4ee" : mix(c1, "#000000", 0.12), { r: 0.7 }));
    core.add(neckHem);
    if (sleeves) sleeveMat = mat(outfit === "numerique" ? "#121a33" : outfit === "smoking" ? c1 : armor ? "#c9d2e3" : outfit === "mariniere" ? out2 : c1, { r: armor ? 0.3 : 0.75, m: armor ? 0.55 : 0 });
    if (outfit === "sweat") { const hood = torusAt(t1, 0.05, 0.07 * (Rx / 0.6), mat(mix(c1, "#000000", 0.08), { r: 0.8 }), PI * 1.1); hood.rotation.y = PI; hood.position.y += 0.02; core.add(hood); }
    if (outfit === "pilote" || outfit === "royal") core.add(torusAt(t1, 0.03, 0.05 * (Rx / 0.6), mat(outfit === "royal" ? "#f7f4ee" : "#e9dcc4", { r: 0.95 })));
    if (outfit === "explorateur" || outfit === "heros" || outfit === "ninja" || outfit === "elfe") { const tb = shape.tAtY(H * (outfit === "heros" ? 0.24 : 0.27)); core.add(torusAt(tb, thick + 0.012, 0.03 * (Rx / 0.6), mat(outfit === "heros" ? out2 : outfit === "ninja" ? out2 : "#6b4a2a", { r: 0.6 }))); }
    if (armor) for (const s of [-1, 1]) { const a = arms[s > 0 ? 1 : 0]; if (!a) continue; const pd = mesh(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, PI / 2), mat("#d8dee9", { r: 0.28, m: 0.75 })); pd.scale.set(0.12 * (Rx / 0.6), 0.09 * (Rx / 0.6), 0.12 * (Rx / 0.6)); pd.position.set(a.position.x * 1.02, a.position.y - 0.01, a.position.z); pd.rotation.z = -s * 0.5; core.add(pd); }
  }
  if (sleeveMat) for (const a of arms) a.children[0].material = sleeveMat;

  /* ================================ COU ================================ */
  const neck = P.neck.id, nm = mat(neckC, { r: 0.7 });
  const front = (t, off) => { const p = shape.pos(0, t), n = shape.normal(0, t); return [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off]; };
  if (neck === "echarpe") {
    const tex = canvasTex(256, 32, (g, w, h) => { g.fillStyle = neckC; g.fillRect(0, 0, w, h); g.fillStyle = mix(neckC, "#ffffff", 0.75); for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h); });
    const sm2 = own2(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    const sc = torusAt(tN, 0.045, 0.07 * (Rx / 0.6), sm2); core.add(sc);
    const tl = mesh(new THREE.CapsuleGeometry(0.065, 0.24, 6, 12), sm2); const fp = shape.pos(0.42, tN - 0.07), fn = shape.normal(0.42, tN - 0.07);
    tl.position.set(fp[0] + fn[0] * 0.09, fp[1] - 0.06, fp[2] + fn[2] * 0.09); tl.scale.set(1.15, 1, 0.45); tl.rotation.set(-0.15, 0.4, -0.12); core.add(tl);
  }
  if (neck === "papillon") {
    const p = front(tN, 0.02), g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
    for (const s of [-1, 1]) { const w = mesh(new THREE.ConeGeometry(0.07, 0.13, 16), nm); w.rotation.z = s * PI / 2; w.position.x = s * 0.07; w.scale.set(1, 1, 0.5); g.add(w); }
    g.add(mesh(sphere(0.035), nm)); core.add(g);
  }
  if (neck === "grelot" || neck === "medaille") {
    core.add(torusAt(tN, 0.012, 0.022 * (Rx / 0.6), nm));
    const p = front(tN - 0.05, 0.04);
    if (neck === "grelot") { const b = mesh(sphere(0.07, 20, 14), gold); b.position.set(p[0], p[1] - 0.02, p[2]); core.add(b); }
    else { const md = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 28), gold); md.rotation.x = PI / 2 - 0.25; md.position.set(p[0], p[1] - 0.06, p[2] + 0.01); core.add(md); const st2 = mesh(new THREE.OctahedronGeometry(0.035), mat("#fff3c4", { r: 0.2, m: 0.6 })); st2.position.set(p[0], p[1] - 0.06, p[2] + 0.025); core.add(st2); }
  }
  if (neck === "perles") {
    const r = ring(tN - 0.02, 0.03), n = 26, inst = new THREE.InstancedMesh(geo(sphere(0.026, 12, 10)), mat("#f7f1e6", { r: 0.25, m: 0.15 }), n), Mx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, drop = Math.max(0, Math.cos(a)) * 0.05; Mx.makeTranslation(Math.sin(a) * r.rx, r.y - drop, Math.cos(a) * r.rz); inst.setMatrixAt(i, Mx); }
    core.add(inst);
  }
  if (neck === "bandana" || neck === "col" || neck === "cravate") {
    const tLo = neck === "cravate" ? tN - 0.24 : tN - 0.15, pw = neck === "col" ? PI : neck === "cravate" ? 0.2 : 0.8;
    const tex = canvasTex(256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      if (neck === "bandana") { g.fillStyle = neckC; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2, h); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,0.85)"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(((i * 53) % w), ((i * 37) % (h * 0.6)), 4, 0, TAU); g.fill(); } g.globalCompositeOperation = "destination-in"; g.fillStyle = "#000"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2, h); g.closePath(); g.fill(); }
      if (neck === "col") {
        // grand rabat dans le dos, deux revers qui se rejoignent en V devant
        g.fillStyle = "#f7f4ee"; g.fillRect(0, 0, w * 0.3, h * 0.9); g.fillRect(w * 0.7, 0, w * 0.3, h * 0.9);
        g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.42, 0); g.lineTo(w * 0.5, h * 0.95); g.lineTo(w * 0.58, 0); g.lineTo(w * 0.7, 0); g.lineTo(w * 0.7, h * 0.9); g.lineTo(w * 0.5, h); g.lineTo(w * 0.3, h * 0.9); g.closePath(); g.fill();
        g.globalCompositeOperation = "destination-out"; g.beginPath(); g.moveTo(w * 0.36, 0); g.lineTo(w * 0.5, h * 0.82); g.lineTo(w * 0.64, 0); g.closePath(); g.fill(); g.globalCompositeOperation = "source-over";
        g.strokeStyle = neckC; g.lineWidth = 6; g.beginPath(); g.moveTo(0, h * 0.74); g.lineTo(w * 0.3, h * 0.74); g.lineTo(w * 0.5, h * 0.9); g.lineTo(w * 0.7, h * 0.74); g.lineTo(w, h * 0.74); g.stroke();
      }
      if (neck === "cravate") { g.fillStyle = neckC; g.beginPath(); g.moveTo(w * 0.38, 0); g.lineTo(w * 0.62, 0); g.lineTo(w * 0.56, h * 0.16); g.lineTo(w * 0.72, h * 0.82); g.lineTo(w / 2, h); g.lineTo(w * 0.28, h * 0.82); g.lineTo(w * 0.44, h * 0.16); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,0.25)"; for (let y = 20; y < h; y += 22) g.fillRect(0, y, w, 6); g.globalCompositeOperation = "destination-in"; g.fillStyle = "#000"; g.beginPath(); g.moveTo(w * 0.38, 0); g.lineTo(w * 0.62, 0); g.lineTo(w * 0.56, h * 0.16); g.lineTo(w * 0.72, h * 0.82); g.lineTo(w / 2, h); g.lineTo(w * 0.28, h * 0.82); g.lineTo(w * 0.44, h * 0.16); g.closePath(); g.fill(); }
    });
    const m2 = own2(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.8, side: THREE.DoubleSide }));
    const base = neck === "col" ? -PI : -pw;
    const g2 = grid(THREE, shape, neck === "col" ? -PI : -pw, neck === "col" ? PI : pw, tLo, tN, neck === "col" ? 72 : 16, 12, () => 0.03 * (Rx / 0.6));
    void base;
    const o = mesh(g2, m2); o.renderOrder = 1; core.add(o);
    if (neck === "col") { const kn = mesh(sphere(0.045), mat(neckC, { r: 0.6 })); const p = front(tN - 0.07, 0.045); kn.position.set(p[0], p[1], p[2]); core.add(kn); }
    if (neck === "cravate") core.add(torusAt(tN, 0.02, 0.018 * (Rx / 0.6), mat("#f7f4ee", { r: 0.7 })));
  }

  /* ================================ DOS ================================ */
  const back = P.back.id, bm = mat(backC, { r: 0.65 });
  const tBk = shape.tAtY(H * 0.5), pb = shape.pos(PI, tBk), backZ = pb[2];
  const wings = [];
  if (back === "sac") {
    const rb = M.RoundedBoxGeometry ? new M.RoundedBoxGeometry(0.44 * (Rx / 0.6), 0.46 * (Rx / 0.6), 0.2, 4, 0.07) : new THREE.BoxGeometry(0.44, 0.46, 0.2);
    const bag = mesh(rb, bm); bag.position.set(0, H * 0.46, backZ - 0.06); core.add(bag);
    const pk = mesh(M.RoundedBoxGeometry ? new M.RoundedBoxGeometry(0.3 * (Rx / 0.6), 0.18, 0.08, 3, 0.04) : new THREE.BoxGeometry(0.3, 0.18, 0.08), mat(mix(backC, "#000000", 0.15), { r: 0.65 })); pk.position.set(0, H * 0.4, backZ - 0.17); core.add(pk);
    for (const s of [-1, 1]) { const sp2 = []; for (let i = 0; i <= 8; i++) { const a = PI - s * (0.35 + i * 0.13); const t = tN + 0.02 - i * 0.012; const p = shape.pos(a, t), n = shape.normal(a, t); sp2.push([p[0] + n[0] * 0.03, p[1] + n[1] * 0.03, p[2] + n[2] * 0.03]); } core.add(mesh(tube(sp2, () => 0.022, 16, 6, 0.5), mat(mix(backC, "#000000", 0.25), { r: 0.7 }))); }
  }
  if (back === "cape") {
    const tTop = tN + 0.01, pw = 1.45, nu = 24, nv = 16, Pp = [], Uv = [], Ii = [];
    for (let j = 0; j <= nv; j++) { const v = j / nv; for (let i = 0; i <= nu; i++) { const u = i / nu, phi = PI - pw + u * 2 * pw; const t = tTop - v * (tTop - 0.06); const p = shape.pos(phi, t), n = shape.normal(phi, t); const o = 0.035 + v * v * 0.16; Pp.push(p[0] + n[0] * o, Math.max(0.04, p[1] - v * 0.04), p[2] + n[2] * o); Uv.push(u, 1 - v); } }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; Ii.push(a, d, b, a, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(Uv, 2)); g.setIndex(Ii); g.computeVertexNormals();
    const cm = own2(new THREE.MeshStandardMaterial({ color: backC, roughness: 0.75, side: THREE.DoubleSide }));
    const cape = mesh(g, cm); core.add(cape);
    core.add(torusAt(tN, 0.03, 0.022 * (Rx / 0.6), gold, PI * 0.9));
    core.children[core.children.length - 1].rotation.y = PI / 2 + 0.16;
  }
  if (back === "carquois") {
    const g = new THREE.Group(); g.position.set(0.05, H * 0.5, backZ - 0.1); g.rotation.set(-0.15, 0, -0.45);
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.46, 18), mat("#8c5c45", { r: 0.7 })));
    g.add(at(mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.06, 18), bm), 0, 0.12, 0));
    for (let i = 0; i < 3; i++) { const ar = new THREE.Group(); ar.position.set((i - 1) * 0.035, 0.27, (i % 2) * 0.03); ar.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), mat("#d9b98a", { r: 0.6 }))); const fl = mesh(new THREE.ConeGeometry(0.03, 0.07, 3), mat("#f7f4ee", { r: 0.6 })); fl.position.y = 0.1; ar.add(fl); g.add(ar); }
    core.add(g);
  }
  if (back === "epee") {
    const g = new THREE.Group(); g.position.set(0, H * 0.52, backZ - 0.07); g.rotation.set(0, 0, 0.6);
    g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.62, 0.018), silver), 0, 0.05, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.24, 0.045, 0.05), gold), 0, -0.27, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 10), mat(backC, { r: 0.6 })), 0, -0.36, 0));
    g.add(at(mesh(sphere(0.035), gold), 0, -0.44, 0));
    core.add(g);
  }
  if (back === "bouclier") {
    const g = new THREE.Group(); g.position.set(0, H * 0.45, backZ - 0.05);
    g.add(rot(mesh(new THREE.CylinderGeometry(0.3 * (Rx / 0.6), 0.3 * (Rx / 0.6), 0.05, 36), bm), PI / 2, 0, 0));
    const rim = mesh(new THREE.TorusGeometry(0.3 * (Rx / 0.6), 0.025, 8, 40), silver); rim.position.z = -0.02; g.add(rim);
    const boss = mesh(sphere(0.08), gold); boss.position.z = -0.04; boss.scale.z = 0.6; g.add(boss);
    core.add(g);
  }
  if (back === "jetpack") {
    const g = new THREE.Group(); g.position.set(0, H * 0.48, backZ - 0.06);
    const flames = [];
    for (const s of [-1, 1]) {
      const c2 = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.34, 20), silver); c2.position.x = s * 0.1; g.add(c2);
      const cap = mesh(sphere(0.085, 18, 10), mat(backC, { r: 0.4 })); cap.position.set(s * 0.1, 0.17, 0); g.add(cap);
      const nz = mesh(new THREE.ConeGeometry(0.07, 0.08, 16, 1, true), mat("#545a6b", { r: 0.4, m: 0.5 })); nz.position.set(s * 0.1, -0.21, 0); nz.rotation.x = PI; g.add(nz);
      const fl = mesh(new THREE.ConeGeometry(0.055, 0.22, 14), own2(new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.85 }))); fl.position.set(s * 0.1, -0.34, 0); fl.rotation.x = PI; g.add(fl); flames.push(fl);
    }
    core.add(g);
    anims.push((t, s) => { const on = s.air || s.fall || s.hop > 0.05; for (const f of flames) { f.visible = on; f.scale.set(1, 0.8 + Math.random() * 0.5, 1); } });
  }
  const wingShape = (kind) => {
    const s = new THREE.Shape();
    if (kind === "fee") { s.moveTo(0, 0); s.bezierCurveTo(0.12, 0.3, 0.42, 0.42, 0.46, 0.2); s.bezierCurveTo(0.48, 0.05, 0.2, 0.0, 0, 0); s.moveTo(0, -0.02); s.bezierCurveTo(0.2, -0.04, 0.34, -0.12, 0.3, -0.22); s.bezierCurveTo(0.24, -0.3, 0.08, -0.16, 0, -0.02); }
    else if (kind === "chauvesouris") { s.moveTo(0, 0.05); s.lineTo(0.14, 0.24); s.lineTo(0.5, 0.2); s.quadraticCurveTo(0.44, 0.06, 0.48, -0.05); s.quadraticCurveTo(0.38, -0.02, 0.34, -0.12); s.quadraticCurveTo(0.26, -0.06, 0.2, -0.16); s.quadraticCurveTo(0.12, -0.05, 0, -0.06); s.closePath(); }
    return new THREE.ShapeGeometry(s, 24);
  };
  if (back === "fee" || back === "chauvesouris") {
    const fairy = back === "fee";
    const wm = own2(new THREE.MeshStandardMaterial({ color: fairy ? mix(backC, "#ffffff", 0.55) : mix(backC, "#000000", 0.35), emissive: fairy ? mix(backC, "#ffffff", 0.3) : "#000000", emissiveIntensity: fairy ? 0.35 : 0, transparent: fairy, opacity: fairy ? 0.62 : 1, roughness: 0.4, side: THREE.DoubleSide, depthWrite: !fairy }));
    const wg = geo(wingShape(back));
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(s * 0.06, H * 0.56, backZ - 0.05);
      const w = new THREE.Mesh(wg, wm); w.scale.set(s * (Rx / 0.6) * 1.15, (Rx / 0.6) * 1.15, 1); piv.add(w); piv.rotation.y = s * 0.9;
      core.add(piv); wings.push([piv, s]);
    }
    anims.push((t, st) => { const f = (st.air || st.fall ? 18 : 3.2), a = Math.sin(t * f) * (st.air ? 0.45 : 0.18); for (const [p, s] of wings) p.rotation.y = s * (0.9 + a); });
  }
  if (back === "ange") {
    const wm = mat("#fbfbf7", { r: 0.75 });
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(s * 0.07, H * 0.56, backZ - 0.05);
      for (let i = 0; i < 5; i++) { const f = mesh(sphere(1, 16, 10), wm); const L2 = 0.34 - i * 0.045; f.scale.set(L2, 0.055, 0.03); f.position.set(s * (L2 * 0.95), 0.12 - i * 0.065, 0); f.rotation.z = s * (0.35 - i * 0.18); piv.add(f); }
      piv.rotation.y = s * 0.85; piv.scale.setScalar(Rx / 0.6); core.add(piv); wings.push([piv, s]);
    }
    anims.push((t, st) => { const a = Math.sin(t * (st.air || st.fall ? 14 : 2.6)) * (st.air ? 0.4 : 0.14); for (const [p, s] of wings) p.rotation.y = s * (0.85 + a); });
  }

  /* ================================ CHAUSSURES ================================ */
  const shoe = P.shoes.id;
  if (shoe !== "nus" && feet.length) {
    const sm3 = mat(shoeC, { r: shoe === "pluie" ? 0.18 : 0.55 }), white = mat("#fbfbf7", { r: 0.6 }), dark = mat(mix(shoeC, "#000000", 0.35), { r: 0.55 });
    for (const f of feet) {
      const m = f.userData.foot, sc = m.scale;
      m.material = shoe === "pantoufles" ? mat(mix(shoeC, "#ffffff", 0.35), { r: 0.95 }) : sm3;
      if (shoe === "baskets" || shoe === "bottines" || shoe === "patins") { const sole = mesh(sphere(1, 22, 10), white); sole.scale.set(sc.x * 1.06, sc.y * 0.38, sc.z * 1.05); sole.position.y = -sc.y * 0.62; f.add(sole); }
      if (shoe === "baskets") for (let i = 0; i < 2; i++) { const l = mesh(new THREE.BoxGeometry(sc.x * 0.8, 0.012, 0.018), white); l.position.set(0, sc.y * 0.82, sc.z * (0.15 + i * 0.22)); l.rotation.x = -0.4; f.add(l); }
      if (shoe === "bottes" || shoe === "pluie" || shoe === "bottines" || shoe === "patins") { const h2 = shoe === "bottines" || shoe === "patins" ? 0.1 : 0.17; const sh = mesh(new THREE.CylinderGeometry(sc.x * 0.78, sc.x * 0.86, h2, 20), shoe === "pluie" ? sm3 : dark); sh.position.set(0, sc.y * 0.7 + h2 / 2 - 0.02, -sc.z * 0.25); f.add(sh); }
      if (shoe === "pantoufles") { const pp = mesh(sphere(sc.x * 0.55, 14, 10), mat("#fbfbf7", { r: 0.95 })); pp.position.set(0, sc.y * 0.7, sc.z * 0.62); f.add(pp); }
      if (shoe === "patins") for (const z of [-1, 1]) for (const x of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14), mat("#ff6aa8", { r: 0.4 })); w.rotation.z = PI / 2; w.position.set(x * sc.x * 0.6, -sc.y * 1.0, z * sc.z * 0.5); f.add(w); }
      if (shoe === "patins") f.userData.base.y += 0.035;
    }
  }

  return { anim: (t, s) => { for (const a of anims) a(t, s); }, lum };
}
