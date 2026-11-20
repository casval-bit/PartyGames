// L'orbe des Portails en 3D (three.js, chargé à la demande par PortalOrb.jsx). Une orbe de pierre qu'on brise, comme un Météno :
//   - la coquille : une sphère à facettes découpée en plaques irrégulières (chacune avec son épaisseur), de fines rainures entre
//     elles ; elle tourne sur elle-même dans tous les sens (l'axe de rotation change sans arrêt) ; des poussières d'étoiles autour ;
//   - charge(d) : elle accélère et tremble, des fissures de la couleur de la rareté partent du point touché et courent sur toute
//     la coquille ; à la fin les plaques s'écartent et la lumière du cœur passe entre elles ;
//   - burst() : la coquille éclate (les plaques volent en tournoyant avec des éclats de pierre, une onde, des étincelles) et le
//     cœur apparaît, de la couleur de la meilleure carte tirée ; exit() : le cœur grossit et remplit l'écran de lumière.
// Couleurs : celle du portail (reflet de la pierre, halo au repos) et celle de la rareté (fissures, lumière, cœur).
const TAU = Math.PI * 2;

/** Pseudo-hasard reproductible (la même orbe à chaque fois pour une graine donnée). */
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
/** Relief doux sur la sphère (somme de sinus) : bosses de la pierre, bords de plaques irréguliers. */
const bump = (x, y, z) => Math.sin(x * 5.1 + y * 1.7) * Math.cos(y * 4.3 - z * 2.2) * 0.5 + Math.sin(z * 6.7 + x * 2.9) * 0.3 + Math.sin((x + y + z) * 9.3) * 0.2;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function canvasTex(THREE, size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const radial = (THREE, stops) => canvasTex(THREE, 128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const raysTex = (THREE) => canvasTex(THREE, 512, (g, s) => {
  g.translate(s / 2, s / 2);
  for (let i = 0; i < 24; i++) {
    g.rotate(TAU / 24);
    const len = s / 2 * (i % 2 ? 0.72 : 1), w = i % 2 ? 7 : 13;
    const gr = g.createLinearGradient(0, 0, 0, -len);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.18, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-2, 0); g.lineTo(-w, -len); g.lineTo(w, -len); g.lineTo(2, 0); g.closePath(); g.fill();
  }
});

// fissures : un ruban posé sur la coquille le long de chaque bord de plaque ; aT = moment où la fissure arrive (0 au point touché)
const CRACK_VS = `
attribute vec3 aSide; attribute float aT; attribute float aU;
uniform float uW; uniform float uP; uniform float uS;
varying float vA; varying float vU;
void main() {
  vA = smoothstep(aT - 0.03, aT + 0.05, uP);
  vU = aU;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uS + aSide * uW, 1.0);
}`;
const CRACK_FS = `
uniform vec3 uC; uniform float uO; uniform float uG;
varying float vA; varying float vU;
void main() {
  float e = 1.0 - abs(vU);
  gl_FragColor = vec4(uC * mix(1.0, 0.45 + 2.2 * e, uG), vA * uO * mix(1.0, e * e, uG));
  #include <colorspace_fragment>
}`;
// le cœur : blanc brûlant au centre, la couleur de la rareté sur les bords, une lumière qui ondule
const CORE_VS = `
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
  gl_Position = projectionMatrix * mv;
}`;
const CORE_FS = `
uniform vec3 uC; uniform float uT; uniform float uI;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  float d = max(dot(normalize(vN), normalize(vV)), 0.0);
  float rr = 1.0 - d * d; // 0 au centre du disque, 1 sur le bord
  float s = sin(vP.x * 7.0 + uT * 2.3) * sin(vP.y * 6.0 - uT * 1.7) * sin(vP.z * 8.0 + uT * 1.3);
  vec3 c = mix(uC * 1.1, uC * 0.62, smoothstep(0.45, 1.0, rr));
  c = mix(mix(vec3(1.0), uC, 0.35), c, smoothstep(0.0, 0.2, rr));
  c += uC * s * 0.16 + mix(uC, vec3(1.0), 0.35) * pow(rr, 6.0) * 0.8;
  gl_FragColor = vec4(c * uI, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * L'orbe seule (sans caméra ni rendu) : group à poser dans une scène, charge/burst/exit pour l'animation, update(dt) à chaque image.
 * color : couleur du portail ; core : couleur de la rareté révélée ; tier : la rareté (rayons pour épique et légendaire).
 */
export function buildOrb(THREE, { color = "#7aa2ff", core: coreHex = "#c9d6ea", tier = "C", seed = 11, plates: K = 16 } = {}) {
  const R = rng(seed);
  const portal = new THREE.Color(color);
  const tc = new THREE.Color(coreHex);
  const group = new THREE.Group(), spin = new THREE.Group();
  group.add(spin);
  const anchor = new THREE.Vector3();
  const textures = [];

  // --- la sphère : sommets (sans doublons) et triangles
  const ico = new THREE.IcosahedronGeometry(1, 4);
  const pos = ico.getAttribute("position");
  const vid = new Map(), verts = [], tris = [];
  for (let t = 0; t < pos.count / 3; t++) {
    tris.push([0, 1, 2].map((k) => {
      const i = t * 3 + k, key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      if (!vid.has(key)) { vid.set(key, verts.length); verts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()); }
      return vid.get(key);
    }));
  }
  ico.dispose();
  const outer = verts.map((v) => v.clone().multiplyScalar(1 + 0.03 * bump(v.x * 2.1, v.y * 2.1, v.z * 2.1) + (R() - 0.5) * 0.035));
  const inner = verts.map((v) => v.clone().multiplyScalar(0.86 + 0.015 * bump(v.x * 3.3 + 4, v.y * 3.3, v.z * 3.3)));
  const ek = (a, b) => (a < b ? a * 4096 + b : b * 4096 + a);
  const edgeTris = new Map();
  tris.forEach(([a, b, c], ti) => { for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = ek(u, v); if (!edgeTris.has(k)) edgeTris.set(k, []); edgeTris.get(k).push(ti); } });

  // --- les plaques : chaque triangle va au germe le plus proche (germes répartis en spirale, bords rendus irréguliers)
  const seeds = Array.from({ length: K }, (_, k) => {
    const y = 1 - (2 * (k + 0.5)) / K, r = Math.sqrt(1 - y * y), a = k * 2.399963 + R() * 0.7;
    return new THREE.Vector3(Math.cos(a) * r, y + (R() - 0.5) * 0.2, Math.sin(a) * r).normalize();
  });
  const owner = tris.map(([a, b, c]) => {
    const m = verts[a].clone().add(verts[b]).add(verts[c]).normalize();
    let best = 0, bd = Infinity;
    seeds.forEach((s, k) => {
      const d = Math.acos(Math.max(-1, Math.min(1, m.dot(s)))) + 0.1 * bump(m.x * 3 + k, m.y * 3 - k * 0.7, m.z * 3 + k * 0.4);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  });

  // --- géométrie de chaque plaque : dessus (pierre), dessous (creux), et ses côtés le long des bords
  const stone = new THREE.Color("#4a4458").lerp(portal, 0.22);
  const plates = [];
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  for (let p = 0; p < K; p++) {
    const mine = [];
    owner.forEach((o, ti) => { if (o === p) mine.push(ti); });
    if (!mine.length) continue;
    const P = [], C = [];
    const shade = 0.78 + R() * 0.38;
    const push3 = (a, b, c, ref, col) => {
      tmp.subVectors(b, a); tmp2.subVectors(c, a); tmp.cross(tmp2);
      if (tmp.dot(ref) < 0) [b, c] = [c, b];
      for (const v of [a, b, c]) { P.push(v.x, v.y, v.z); C.push(col.r, col.g, col.b); }
    };
    for (const ti of mine) {
      const [i, j, k] = tris[ti];
      const cen = outer[i].clone().add(outer[j]).add(outer[k]).divideScalar(3);
      const top = stone.clone().multiplyScalar(shade * (0.9 + R() * 0.2));
      push3(outer[i], outer[j], outer[k], cen, top);
      push3(inner[i], inner[j], inner[k], cen.clone().negate(), stone.clone().multiplyScalar(0.55));
      for (const [u, v] of [[i, j], [j, k], [k, i]]) {
        const other = edgeTris.get(ek(u, v)).find((x) => x !== ti);
        if (owner[other] === p) continue;
        const ref = outer[u].clone().add(outer[v]).multiplyScalar(0.5).sub(cen);
        const side = stone.clone().multiplyScalar(0.7);
        push3(outer[u], outer[v], inner[v], ref, side);
        push3(outer[u], inner[v], inner[u], ref, side);
      }
    }
    // centrer la plaque sur elle-même : elle tournoie autour de son centre quand elle s'envole
    const c = new THREE.Vector3();
    for (let q = 0; q < P.length; q += 3) c.x += P[q], c.y += P[q + 1], c.z += P[q + 2];
    c.divideScalar(P.length / 3);
    for (let q = 0; q < P.length; q += 3) P[q] -= c.x, P[q + 1] -= c.y, P[q + 2] -= c.z;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.58, metalness: 0.32, emissive: portal, emissiveIntensity: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(c);
    spin.add(mesh);
    plates.push({ mesh, mat, home: c.clone(), dir: c.clone().normalize(), jit: R(), vel: new THREE.Vector3(), axis: new THREE.Vector3(1, 0, 0), av: 0 });
  }

  // --- fissures et rainures : un ruban le long de chaque bord entre deux plaques
  const cracks = [];
  edgeTris.forEach((ts, k) => { if (owner[ts[0]] !== owner[ts[1]]) cracks.push([Math.floor(k / 4096), k % 4096]); });
  const nV = cracks.length * 4;
  const cPos = new Float32Array(nV * 3), cSide = new Float32Array(nV * 3), cU = new Float32Array(nV), cT = new Float32Array(nV).fill(2), cN = cracks.map(() => R());
  const cIdx = [];
  cracks.forEach(([i, j], e) => {
    const A = outer[i], B = outer[j];
    const side = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().addVectors(A, B)).normalize();
    [[A, 1], [A, -1], [B, -1], [B, 1]].forEach(([Q, s], q) => {
      const o = (e * 4 + q) * 3;
      cPos[o] = Q.x * 1.004; cPos[o + 1] = Q.y * 1.004; cPos[o + 2] = Q.z * 1.004;
      cSide[o] = side.x * s; cSide[o + 1] = side.y * s; cSide[o + 2] = side.z * s;
      cU[e * 4 + q] = s;
    });
    const b = e * 4;
    cIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute("aSide", new THREE.BufferAttribute(cSide, 3));
  cGeo.setAttribute("aU", new THREE.BufferAttribute(cU, 1));
  cGeo.setAttribute("aT", new THREE.BufferAttribute(cT, 1));
  cGeo.setIndex(cIdx);
  const crackMat = ({ w, p, c, o, g, add }) => new THREE.ShaderMaterial({
    vertexShader: CRACK_VS, fragmentShader: CRACK_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uW: { value: w }, uP: { value: p }, uS: { value: 1 }, uC: { value: c }, uO: { value: o }, uG: { value: g } },
  });
  const groove = new THREE.Mesh(cGeo, crackMat({ w: 0.0075, p: 9, c: new THREE.Color("#07050c"), o: 0.55, g: 0 }));
  const glow = new THREE.Mesh(cGeo, crackMat({ w: 0.005, p: -1, c: tc.clone(), o: 1, g: 1, add: true }));
  const halo = new THREE.Mesh(cGeo, crackMat({ w: 0.03, p: -1, c: tc.clone(), o: 0.4, g: 1, add: true }));
  // au repos, une lueur de la couleur du portail filtre faiblement entre les plaques (quelque chose vit dedans)
  const seep = new THREE.Mesh(cGeo, crackMat({ w: 0.022, p: 9, c: portal.clone().lerp(new THREE.Color("#ffffff"), 0.25), o: 0.16, g: 1, add: true }));
  groove.renderOrder = 5; glow.renderOrder = 6; halo.renderOrder = 7; seep.renderOrder = 8;
  spin.add(groove, glow, halo, seep);
  const crackU = [glow.material.uniforms, halo.material.uniforms];

  // --- le cœur, sa lumière (qui éclaire le creux des plaques et passe entre elles) et son halo
  const coreMat = new THREE.ShaderMaterial({ vertexShader: CORE_VS, fragmentShader: CORE_FS, uniforms: { uC: { value: tc.clone() }, uT: { value: 0 }, uI: { value: 1 } } });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 32), coreMat);
  spin.add(core);
  const light = new THREE.PointLight(tc.clone(), 0, 5, 2);
  group.add(light);
  const dot = radial(THREE, [[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,.8)"], [0.55, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]]);
  textures.push(dot);
  const haloMat = new THREE.SpriteMaterial({ map: dot, color: portal.clone(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const haloSp = new THREE.Sprite(haloMat);
  haloSp.scale.setScalar(3.1);
  group.add(haloSp);
  const rays = tier === "E" || tier === "L" ? new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTex(THREE), color: tc.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })) : null;
  if (rays) { textures.push(rays.material.map); rays.scale.setScalar(tier === "L" ? 9 : 7); group.add(rays); }
  // légendaire : une seconde couronne de rayons dorés qui tourne dans l'autre sens
  const rays2 = tier === "L" ? new THREE.Sprite(new THREE.SpriteMaterial({ map: rays.material.map, color: new THREE.Color("#ffe08a"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })) : null;
  if (rays2) { rays2.scale.setScalar(6); rays2.material.rotation = 0.13; group.add(rays2); }
  const ringTex = radial(THREE, [[0, "rgba(255,255,255,0)"], [0.72, "rgba(255,255,255,0)"], [0.86, "rgba(255,255,255,1)"], [0.93, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]);
  textures.push(ringTex);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: ringTex, color: tc.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  group.add(ring);

  // --- poussières d'étoiles autour de l'orbe (au repos), étincelles de l'éclatement
  const motes = (() => {
    const n = 70, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ang = R() * TAU, r = 1.3 + R() * 0.7, h = (R() - 0.5) * 0.7;
      a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = h; a[i * 3 + 2] = Math.sin(ang) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color: portal.clone().lerp(new THREE.Color("#ffffff"), 0.45), size: 0.1, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = 0.35; m.rotation.z = -0.2;
    group.add(m);
    return m;
  })();
  const nS = 170, sPos = new Float32Array(nS * 3), sVel = new Float32Array(nS * 3), sCol = new Float32Array(nS * 3);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ map: dot, size: 0.11, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sparks.visible = false;
  group.add(sparks);
  // éclats de pierre : de petits morceaux qui partent plus vite que les plaques
  const nD = 34;
  const debris = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: stone, flatShading: true, roughness: 0.6, metalness: 0.3, transparent: true }), nD);
  const dState = Array.from({ length: nD }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), av: 4 + R() * 9, s: 0.5 + R() * 1.1 }));
  debris.visible = false;
  group.add(debris);

  // --- animation
  let phase = "idle", time = 0, ct = 0, bt = 0, et = -1, D = 1.2;
  const dq = new THREE.Quaternion(), w = new THREE.Vector3(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
  const tumble = (dt, speed) => {
    w.set(0.55 * Math.sin(0.31 * time) + 0.25, 0.7 * Math.cos(0.23 * time + 1) + 0.35, 0.45 * Math.sin(0.17 * time + 2));
    const ang = w.length() * speed * dt;
    if (ang > 0) { dq.setFromAxisAngle(w.normalize(), ang); spin.quaternion.premultiply(dq); }
  };

  function charge(d = 1.2) {
    if (phase !== "idle") return;
    phase = "charge"; ct = 0; D = Math.max(0.3, d);
    // les fissures partent du point de la coquille tourné vers nous
    const imp = new THREE.Vector3(0, 0, 1).applyQuaternion(spin.quaternion.clone().invert()).normalize();
    for (let v = 0; v < nV; v++) {
      const x = cPos[v * 3], y = cPos[v * 3 + 1], z = cPos[v * 3 + 2], l = Math.hypot(x, y, z);
      cT[v] = (Math.acos(Math.max(-1, Math.min(1, (x * imp.x + y * imp.y + z * imp.z) / l))) / Math.PI) * 0.9 + cN[Math.floor(v / 4)] * 0.1;
    }
    cGeo.attributes.aT.needsUpdate = true;
  }
  function burst() {
    if (phase === "burst" || phase === "exit") return;
    if (phase === "idle") charge(0.3);
    phase = "burst"; bt = 0;
    group.updateMatrixWorld(true);
    plates.forEach((p) => {
      group.attach(p.mesh);
      p.mat.transparent = true; p.mat.needsUpdate = true;
      const d = p.mesh.position.clone().normalize();
      const tan = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).cross(d).multiplyScalar(1.4);
      p.vel.copy(d).multiplyScalar(2.4 + R() * 2.4).add(tan);
      p.vel.z += 0.9;
      p.axis.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      p.av = 3 + R() * 6;
    });
    groove.visible = false; seep.visible = false;
    const white = new THREE.Color("#ffffff");
    for (let i = 0; i < nS; i++) {
      const u = R() * 2 - 1, a = R() * TAU, r = Math.sqrt(1 - u * u);
      const dx = Math.cos(a) * r, dy = u, dz = Math.sin(a) * r, sp = 1.6 + R() * 5;
      sPos[i * 3] = dx * 0.85; sPos[i * 3 + 1] = dy * 0.85; sPos[i * 3 + 2] = dz * 0.85;
      sVel[i * 3] = dx * sp; sVel[i * 3 + 1] = dy * sp; sVel[i * 3 + 2] = dz * sp;
      const col = tc.clone().lerp(white, R() * 0.6);
      sCol[i * 3] = col.r; sCol[i * 3 + 1] = col.g; sCol[i * 3 + 2] = col.b;
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
    sparks.visible = true;
    dState.forEach((s) => {
      const u = R() * 2 - 1, a = R() * TAU, r = Math.sqrt(1 - u * u);
      s.p.set(Math.cos(a) * r, u, Math.sin(a) * r).multiplyScalar(0.95);
      s.v.copy(s.p).multiplyScalar(3.5 + R() * 4.5); s.v.z += 1;
    });
    debris.visible = true;
  }
  function exit() { if (phase !== "burst") burst(); phase = "exit"; et = 0; }

  const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  function update(dt) {
    time += dt;
    group.scale.setScalar(time < 0.75 ? Math.max(0.01, backOut(time / 0.75)) : 1); // l'orbe apparaît
    coreMat.uniforms.uT.value = time;
    motes.rotation.y += dt * 0.25;
    if (phase === "idle" || phase === "charge") {
      if (phase === "charge") ct += dt;
      const k = phase === "charge" ? Math.min(1, ct / D) : 0;
      tumble(dt, 1 + 8 * k * k);
      const jit = 0.04 * k * k * k;
      group.position.set(anchor.x + (Math.random() - 0.5) * jit, anchor.y + Math.sin(time * 1.3) * 0.05 + (Math.random() - 0.5) * jit, anchor.z);
      const push = 0.055 * smooth(0.55, 1, k);
      plates.forEach((p) => p.mesh.position.copy(p.home).addScaledVector(p.dir, push * (0.6 + p.jit * 0.8)));
      groove.material.uniforms.uS.value = seep.material.uniforms.uS.value = 1 + push;
      seep.material.uniforms.uO.value = (0.11 + 0.06 * Math.sin(time * 1.7)) * (1 - smooth(0, 0.35, k));
      crackU.forEach((u) => { u.uS.value = 1 + push; u.uP.value = phase === "charge" ? k * 1.25 : -1; });
      crackU[0].uW.value = 0.005 + 0.011 * k;
      crackU[1].uW.value = 0.03 + 0.05 * k;
      light.intensity = 26 * smooth(0.25, 1, k);
      haloMat.color.copy(portal).lerp(tc, smooth(0.1, 0.8, k));
      haloMat.opacity = 0.32 + 0.45 * k;
      haloSp.scale.setScalar(3.1 + 0.5 * k + Math.sin(time * 2) * 0.05);
      motes.material.opacity = 0.85 * (1 - k * 0.6);
    } else {
      bt += dt;
      tumble(dt, 1 + 8 * Math.exp(-bt * 2.5));
      const shake = bt < 0.3 ? 0.06 * (1 - bt / 0.3) : 0;
      group.position.set(anchor.x + (Math.random() - 0.5) * shake, anchor.y + Math.sin(time * 1.3) * 0.05 + (Math.random() - 0.5) * shake, anchor.z);
      // la coquille vole en éclats
      const fade = 1 - smooth(0.35, 1.15, bt);
      plates.forEach((p) => {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.multiplyScalar(Math.exp(-0.8 * dt)); p.vel.y -= 1.4 * dt;
        dq.setFromAxisAngle(p.axis, p.av * dt); p.mesh.quaternion.premultiply(dq);
        p.mat.opacity = fade; p.mesh.visible = fade > 0.01;
      });
      crackU.forEach((u) => { u.uO.value = Math.max(0, 1 - bt / 0.18) * (u === crackU[1] ? 0.4 : 1); });
      dState.forEach((s, i) => {
        s.p.addScaledVector(s.v, dt); s.v.multiplyScalar(Math.exp(-1.1 * dt)); s.v.y -= 2 * dt;
        dq.setFromAxisAngle(s.axis, s.av * dt); s.q.premultiply(dq);
        debris.setMatrixAt(i, m4.compose(s.p, s.q, sc.copy(one).multiplyScalar(s.s)));
      });
      debris.instanceMatrix.needsUpdate = true;
      debris.material.opacity = fade;
      debris.visible = fade > 0.01;
      // étincelles
      for (let i = 0; i < nS * 3; i++) { sPos[i] += sVel[i] * dt; sVel[i] *= Math.exp(-2.4 * dt); }
      sGeo.attributes.position.needsUpdate = true;
      sparks.material.opacity = 1 - smooth(0.25, 1.4, bt);
      // le cœur jaillit (petit rebond), sa lumière, son halo, l'onde
      const pop = 1 - 0.28 * Math.exp(-6 * bt) * Math.cos(13 * bt);
      const ex = et >= 0 ? smooth(0, 0.42, (et += dt)) : 0;
      core.scale.setScalar(pop * (1 + 3.2 * ex * ex));
      coreMat.uniforms.uI.value = 1 + 0.5 * Math.exp(-3 * bt) + 0.06 * Math.sin(time * 6) + 0.4 * ex;
      light.intensity = 10 + 30 * Math.exp(-3 * bt);
      haloMat.color.copy(tc);
      haloMat.opacity = 0.9;
      haloSp.scale.setScalar((3.7 + 1.8 * Math.exp(-4 * bt) + 0.12 * Math.sin(time * 4)) * (1 + 2.6 * ex));
      const rr = Math.min(1, bt / 0.75);
      ring.scale.setScalar(1 + 4.5 * (1 - Math.pow(1 - rr, 3)));
      ring.material.opacity = 0.9 * (1 - rr);
      motes.material.opacity = Math.max(0, 0.34 * (1 - bt * 2));
      if (rays) { rays.material.opacity = (tier === "L" ? 0.75 : 0.4) * smooth(0.05, 0.45, bt) * (1 - ex); rays.material.rotation += dt * 0.35; }
      if (rays2) { rays2.material.opacity = 0.55 * smooth(0.15, 0.6, bt) * (1 - ex); rays2.material.rotation -= dt * 0.5; }
    }
  }

  function dispose() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    textures.forEach((t) => t.dispose());
  }

  return { group, anchor, charge, burst, exit, update, dispose, get phase() { return phase; } };
}

/** La scène complète sur une toile (fond transparent) : rendu, caméra, lumières, et l'orbe calée sur un point de l'écran. */
export function makeOrbStage(THREE, canvas, { color, core, tier, hi = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.5 : 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xc8d2ff, 0x1a120a, 1.1));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.8); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(color || "#7aa2ff"), 4); rim.position.set(3.5, -1, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xa9b8ff, 1.4); rim2.position.set(-4, -2, -3); scene.add(rim2);
  const fill = new THREE.DirectionalLight(0x8090ff, 0.5); fill.position.set(4, -3, 3); scene.add(fill);
  const orb = buildOrb(THREE, { color, core, tier });
  scene.add(orb.group);
  /** Toile de w × h pixels ; l'orbe (diamètre size pixels) centrée sur le point (cx, cy) de la toile. */
  const resize = (w, h, cx, cy, size) => {
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    camera.aspect = w / h;
    const hh = h / Math.max(40, size); // demi-hauteur visible (en unités, à la profondeur de l'orbe) : diamètre 2 = size pixels
    camera.position.set(0, 0, hh / Math.tan((camera.fov / 2) * Math.PI / 180));
    camera.updateProjectionMatrix();
    orb.anchor.set(((cx / w) * 2 - 1) * hh * camera.aspect, (1 - (cy / h) * 2) * hh, 0);
  };
  const frame = (dt) => { orb.update(dt); renderer.render(scene, camera); };
  const dispose = () => { orb.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* déjà perdu */ } };
  return { orb, resize, frame, dispose };
}
