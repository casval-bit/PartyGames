// Décor 3D de l'accueil de Heavy is the Crown : une table ronde en bois dans une salle sombre, six chaises tout autour (sans
// personne), et trois joueurs installés : un plateau par joueur (ses personnages, sa rangée de cartes, sa pioche, son Or et son
// Pouvoir), devant sa place. Au milieu de la table, ce qui est commun : le trésor, les trois défis et la réserve de Pouvoir.
// Le plateau du premier plan est celui du joueur : à l'accueil, le vrai plateau (HubBoard, en CSS 3D, avec les cartes de son deck,
// qu'on touche pour les voir en grand) se pose par-dessus ; celui dessiné ici ne se voit qu'à l'écran titre. Les deux autres
// montrent d'autres decks à thème (ils changent chaque jour).
// Rien à télécharger : bois, feutre et dos de cartes sont dessinés ; les faces de cartes reprennent leurs illustrations.
import { CARD, FAMILY } from "../../cards/index.js";
import { themeStarters } from "../../deck.js";
import { RARITY_ORDER, TYPES, TYPE_ICON } from "../../rules.js";
import { cardArt } from "../art.js";
import { artNow } from "../artStore.js";
import { paintIcon } from "../../../ui/iconPaint.js";

export const TOP = 0.07; // hauteur du dessus de la table
export const TABLE_R = 3.65;
/** Le plateau d'un joueur (largeur, profondeur) et la distance de son centre au milieu de la table. */
const PB = { w: 2.6, d: 1.3, r: 2.62 };
/** L'empreinte du plateau du joueur : là où se pose le plateau de l'accueil (largeur x, profondeur z, centre). */
export const FRONT = { x: 0, z: PB.r, w: PB.w, d: PB.d };

const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hashStr = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function texOf(THREE, c, { repeat = null, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const mix = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

/* ------------------------------ textures dessinées ------------------------------ */
/** Bois de la table : des planches parallèles (veines, nœuds, joints), un bandeau plus sombre et un filet de laiton près du bord. */
function woodTop(S, seed = 7) {
  const c = canvas(S, S), g = c.getContext("2d"), r = rng(seed);
  const N = 14, pw = S / N;
  for (let i = 0; i < N; i++) {
    const x0 = i * pw, base = 0.85 + r() * 0.3;
    const hue = 24 + r() * 8, lum = 24 + r() * 8;
    g.fillStyle = `hsl(${hue} 52% ${lum * base}%)`; g.fillRect(x0, 0, pw + 1, S);
    // veines : de longues lignes ondulées le long de la planche
    for (let k = 0; k < 34; k++) {
      const x = x0 + r() * pw, amp = 1 + r() * pw * 0.08, fr = 1.5 + r() * 4, ph = r() * 6.28;
      g.strokeStyle = r() < 0.6 ? `rgba(30,14,4,${0.08 + r() * 0.16})` : `rgba(255,214,160,${0.04 + r() * 0.07})`;
      g.lineWidth = 0.6 + r() * 1.8; g.beginPath();
      for (let y = 0; y <= S; y += 8) { const xx = x + Math.sin((y / S) * fr * 6.28 + ph) * amp; if (y) g.lineTo(xx, y); else g.moveTo(xx, y); }
      g.stroke();
    }
    // un nœud de temps en temps
    if (r() < 0.55) {
      const kx = x0 + pw * (0.3 + r() * 0.4), ky = r() * S;
      for (let j = 7; j > 0; j--) { g.strokeStyle = `rgba(40,18,6,${0.12 + j * 0.03})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(kx, ky, j * pw * 0.022, j * pw * 0.06, 0, 0, 6.29); g.stroke(); }
    }
    // joint entre deux planches
    g.fillStyle = "rgba(12,5,1,.75)"; g.fillRect(x0, 0, 2, S);
    g.fillStyle = "rgba(255,220,170,.08)"; g.fillRect(x0 + 2, 0, 1.5, S);
  }
  // bandeau du bord, filet de laiton, et la patine (plus sombre vers le bord)
  const cx = S / 2;
  g.save(); g.beginPath(); g.arc(cx, cx, S * 0.5, 0, 6.29); g.arc(cx, cx, S * 0.455, 0, 6.29, true); g.fillStyle = "rgba(25,10,2,.55)"; g.fill(); g.restore();
  g.strokeStyle = "rgba(214,170,84,.85)"; g.lineWidth = S * 0.004; g.beginPath(); g.arc(cx, cx, S * 0.452, 0, 6.29); g.stroke();
  g.strokeStyle = "rgba(90,60,20,.9)"; g.lineWidth = S * 0.002; g.beginPath(); g.arc(cx, cx, S * 0.446, 0, 6.29); g.stroke();
  const vg = g.createRadialGradient(cx, cx, S * 0.15, cx, cx, S * 0.5);
  vg.addColorStop(0, "rgba(255,226,180,.07)"); vg.addColorStop(0.75, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)");
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  return c;
}
/** Plancher sombre (planches), répété. */
function woodFloor(S, seed = 3) {
  const c = canvas(S, S), g = c.getContext("2d"), r = rng(seed);
  const N = 6, ph = S / N;
  for (let i = 0; i < N; i++) {
    const y0 = i * ph, off = r() * S;
    g.fillStyle = `hsl(${20 + r() * 6} 35% ${9 + r() * 4}%)`; g.fillRect(0, y0, S, ph);
    for (let k = 0; k < 24; k++) {
      const y = y0 + r() * ph; g.strokeStyle = `rgba(0,0,0,${0.15 + r() * 0.2})`; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (r() - 0.5) * 4); g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,.7)"; g.fillRect(0, y0, S, 2); g.fillRect(off, y0, 2, ph);
  }
  return c;
}
/** Tapis de feutre d'un plateau : couleur de la famille, grain du feutre, liseré doré, blason en filigrane, ligne du milieu. */
function feltMat(W, H, color, icon, seed) {
  const c = canvas(W, H), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = mix(color, "#0b1630", 0.72); g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, H / 2, W * 0.05, W / 2, H / 2, W * 0.7);
  rg.addColorStop(0, "rgba(255,255,255,.1)"); rg.addColorStop(1, "rgba(0,0,0,.45)");
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H * 0.02; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.08)"; g.fillRect(r() * W, r() * H, 1.5, 1.5); }
  if (icon) paintIcon(g, icon, W / 2, H / 2, H * 0.42, { color: "rgba(255,226,170,.12)", stroke: 1.1 });
  const b = W * 0.03;
  g.strokeStyle = "#d9a93f"; g.lineWidth = W * 0.008; g.strokeRect(b, b, W - 2 * b, H - 2 * b);
  g.strokeStyle = "rgba(217,169,63,.45)"; g.lineWidth = W * 0.003; g.strokeRect(b * 1.7, b * 1.7, W - 3.4 * b, H - 3.4 * b);
  return c;
}
function roundRect(g, x, y, w, h, rr) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, rr); else g.rect(x, y, w, h); }
/** Dos de carte : bleu nuit, double cadre doré, la couronne au centre. */
function cardBack(W, H) {
  const c = canvas(W, H), g = c.getContext("2d");
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, "#16264d"); lg.addColorStop(1, "#0a1229");
  roundRect(g, 0, 0, W, H, W * 0.07); g.fillStyle = lg; g.fill();
  g.strokeStyle = "#d9a93f"; g.lineWidth = W * 0.035; roundRect(g, W * 0.06, W * 0.06, W * 0.88, H - W * 0.12, W * 0.05); g.stroke();
  g.strokeStyle = "rgba(217,169,63,.5)"; g.lineWidth = W * 0.012; roundRect(g, W * 0.12, W * 0.12, W * 0.76, H - W * 0.24, W * 0.04); g.stroke();
  const rg = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W * 0.42); rg.addColorStop(0, "rgba(255,209,102,.35)"); rg.addColorStop(1, "rgba(255,209,102,0)");
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  paintIcon(g, "crown", W / 2, H / 2, W * 0.46, { color: "#ffd166", stroke: 1.7, glow: 6 });
  return c;
}
/** Face d'une carte, simplifiée (vue de loin) : cadre aux couleurs de la famille, coût, nom, illustration, quelques lignes de texte. */
function cardFace(W, H, d, img) {
  const c = canvas(W, H), g = c.getContext("2d");
  const f = FAMILY[d.fam] || FAMILY.neutre, fc = f.color || "#5ee1ff";
  roundRect(g, 0, 0, W, H, W * 0.06); g.fillStyle = "#0d1630"; g.fill();
  g.strokeStyle = fc; g.lineWidth = W * 0.05; roundRect(g, W * 0.03, W * 0.03, W * 0.94, H - W * 0.06, W * 0.05); g.stroke();
  const ax = W * 0.08, ay = H * 0.15, aw = W * 0.84, ah = H * 0.45;
  if (img) {
    const k = Math.max(aw / img.width, ah / img.height), iw = img.width * k, ih = img.height * k;
    g.save(); g.beginPath(); g.rect(ax, ay, aw, ah); g.clip(); g.drawImage(img, ax + (aw - iw) / 2, ay + (ah - ih) / 2, iw, ih); g.restore();
  } else { const lg = g.createLinearGradient(0, ay, 0, ay + ah); lg.addColorStop(0, mix(fc, "#0d1630", 0.3)); lg.addColorStop(1, "#0d1630"); g.fillStyle = lg; g.fillRect(ax, ay, aw, ah); }
  g.fillStyle = mix(fc, "#0d1630", 0.55); g.fillRect(W * 0.06, H * 0.045, W * 0.88, H * 0.09);
  g.fillStyle = "#fff"; g.font = `700 ${Math.round(H * 0.055)}px Sora, Arial, sans-serif`; g.textBaseline = "middle";
  g.fillText(d.name.slice(0, 16), W * 0.24, H * 0.09, W * 0.68);
  g.beginPath(); g.arc(W * 0.14, H * 0.09, W * 0.085, 0, 6.29); g.fillStyle = "#ffd166"; g.fill();
  g.fillStyle = "#3a2600"; g.font = `800 ${Math.round(H * 0.06)}px Sora, Arial, sans-serif`; g.textAlign = "center"; g.fillText(String(d.cost), W * 0.14, H * 0.095); g.textAlign = "left";
  g.fillStyle = "rgba(220,230,255,.35)";
  for (let i = 0; i < 4; i++) g.fillRect(W * 0.12, H * (0.66 + i * 0.065), W * (i === 3 ? 0.45 : 0.76), H * 0.022);
  return c;
}

/** Dessus d'un jeton de défi : un disque de couleur, son icône en blanc. */
function medalTop(S, col, icon) {
  const c = canvas(S, S), g = c.getContext("2d");
  const rg = g.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, mix(col, "#ffffff", 0.45)); rg.addColorStop(0.7, col); rg.addColorStop(1, mix(col, "#000000", 0.45));
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(255,240,200,.85)"; g.lineWidth = S * 0.04; g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, 6.29); g.stroke();
  paintIcon(g, icon, S / 2, S / 2, S * 0.5, { color: "#ffffff", stroke: 2.2, glow: 4 });
  return c;
}
/** Le sceau de la réserve de Pouvoir : une couronne et « 15 ». */
function sealTop(S) {
  const c = canvas(S, S), g = c.getContext("2d");
  const rg = g.createRadialGradient(S * 0.4, S * 0.35, 4, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, "#3a2a10"); rg.addColorStop(1, "#140d04");
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.strokeStyle = "#d9a93f"; g.lineWidth = S * 0.05; g.beginPath(); g.arc(S / 2, S / 2, S * 0.43, 0, 6.29); g.stroke();
  paintIcon(g, "crown", S / 2, S * 0.4, S * 0.36, { color: "#ffd166", stroke: 2, glow: 4 });
  g.fillStyle = "#ffd166"; g.font = `800 ${Math.round(S * 0.22)}px Sora, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("15", S / 2, S * 0.7);
  return c;
}

/* ------------------------------ ce qu'on pose sur les plateaux ------------------------------ */
const byStrength = (a, b) => CARD[b].cost - CARD[a].cost || RARITY_ORDER.indexOf(CARD[b].r) - RARITY_ORDER.indexOf(CARD[a].r) || a.localeCompare(b);
/** Les personnages les plus forts d'un deck (une version par personnage), un lieu ou un objet, et un événement (la défausse). */
function showOf(deck, n) {
  const ids = Object.keys((deck && deck.cards) || {}).filter((id) => CARD[id]);
  const out = [], keys = new Set();
  for (const id of ids.filter((x) => CARD[x].type === "char").sort(byStrength)) { const k = CARD[id].key || id; if (keys.has(k)) continue; keys.add(k); out.push(id); if (out.length === n) break; }
  const extra = ids.filter((x) => CARD[x].type === "loc" || CARD[x].type === "obj").sort(byStrength)[0];
  const disc = ids.filter((x) => CARD[x].type === "evt").sort(byStrength)[0];
  return { chars: out, extra: extra || null, disc: disc || null };
}
/** Les decks des deux autres joueurs : des decks à thème d'autres familles (pas la même pour les deux), les mêmes toute la journée. */
function otherDecks(fam) {
  const d = new Date(), r = rng(hashStr(`${fam || ""}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
  const list = themeStarters().filter((s) => s.fam !== fam);
  const out = [];
  while (list.length && out.length < 2) {
    const s = list.splice(Math.floor(r() * list.length), 1)[0];
    if (!out.some((o) => o.fam === s.fam)) out.push(s);
  }
  return out;
}

/**
 * Construit la salle : renvoie { group, front, update(dt, t), setFront(a), dispose }.
 * opt : deck (le deck joué, pour le plateau du premier plan à l'écran titre), quality ("high" : ombres et grandes textures, ou "low"),
 * calm (aucune animation), RoundedBoxGeometry (facultatif).
 */
export function buildTable(THREE, opt = {}) {
  const hi = opt.quality !== "low";
  const own = []; // textures et matières à libérer
  const keep = (x) => { own.push(x); return x; };
  const group = new THREE.Group();
  const shadowy = (o, cast = true, recv = true) => { o.castShadow = hi && cast; o.receiveShadow = hi && recv; return o; };

  // ---------- la salle : plancher, ombre portée de la table ----------
  const floorTex = keep(texOf(THREE, woodFloor(hi ? 512 : 256), { repeat: [7, 7] }));
  const floor = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, color: 0x9a8a80 }))), false, true);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.45; group.add(floor);

  // ---------- la table ronde ----------
  const topTex = keep(texOf(THREE, woodTop(hi ? 1024 : 512), { aniso: 8 }));
  const wood = keep(new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.5 }));
  const woodDark = keep(new THREE.MeshStandardMaterial({ color: 0x2c170a, roughness: 0.6 }));
  const topMat = keep(new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.55, clearcoat: hi ? 0.35 : 0, clearcoatRoughness: 0.45 }));
  const top = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.14, 96), [wood, topMat, woodDark]), true, true);
  group.add(top);
  const rim = shadowy(new THREE.Mesh(new THREE.TorusGeometry(TABLE_R, 0.085, 14, 120), wood), true, false);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.035; group.add(rim);
  const apron = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R * 0.93, TABLE_R * 0.9, 0.36, 64, 1, true), woodDark), true, false);
  apron.position.y = -0.24; group.add(apron);
  const foot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.05, 2.1, 32), woodDark), true, false);
  foot.position.y = -1.42; group.add(foot);

  // ---------- les chaises (sans personne), tirées un peu de travers ----------
  const velvet = keep(new THREE.MeshStandardMaterial({ color: 0x6a1622, roughness: 0.92 }));
  const chairWood = keep(new THREE.MeshStandardMaterial({ color: 0x3b2110, roughness: 0.55 }));
  const brass = keep(new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.35 }));
  const box = (w, h, d) => (opt.RoundedBoxGeometry ? new opt.RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.25) : new THREE.BoxGeometry(w, h, d));
  const chairGeo = {
    seat: box(1.0, 0.14, 0.95), cushion: box(0.86, 0.1, 0.8), leg: new THREE.CylinderGeometry(0.055, 0.045, 1.55, 10),
    post: box(0.11, 2.1, 0.11), rail: box(1.02, 0.2, 0.1), panel: box(0.78, 1.05, 0.06), knob: new THREE.SphereGeometry(0.075, 12, 10),
  };
  const chair = () => {
    const c = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = shadowy(new THREE.Mesh(geo, mat), true, true); m.position.set(x, y, z); c.add(m); return m; };
    add(chairGeo.seat, chairWood, 0, 0, 0);
    add(chairGeo.cushion, velvet, 0, 0.11, 0.02);
    for (const [x, z] of [[-0.42, -0.4], [0.42, -0.4], [-0.42, 0.4], [0.42, 0.4]]) add(chairGeo.leg, chairWood, x, -0.8, z);
    add(chairGeo.post, chairWood, -0.45, 0.98, -0.42); add(chairGeo.post, chairWood, 0.45, 0.98, -0.42);
    add(chairGeo.rail, chairWood, 0, 1.92, -0.42);
    add(chairGeo.panel, velvet, 0, 1.18, -0.42);
    add(chairGeo.knob, brass, -0.45, 2.08, -0.42); add(chairGeo.knob, brass, 0.45, 2.08, -0.42);
    return c;
  };
  const rc = rng(11);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (rc() - 0.5) * 0.12, d = TABLE_R + 0.95 + rc() * 0.25;
    const c = chair();
    c.position.set(Math.sin(a) * d, -0.78, Math.cos(a) * d);
    c.rotation.y = a + Math.PI + (rc() - 0.5) * 0.25; // face à la table (le dossier vers l'extérieur)
    group.add(c);
  }

  // ---------- les plateaux ----------
  const S = hi ? 256 : 160;
  const backTex = keep(texOf(THREE, cardBack(S, Math.round(S * 1.4))));
  const backMat = keep(new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.6 }));
  const edgeMat = keep(new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.8 }));
  const CW = 0.3, CH = 0.42;
  const cardGeo = new THREE.PlaneGeometry(CW, CH);
  const faces = []; // { mat, d, w, h } : les faces à redessiner quand leur illustration arrive
  const faceMat = (id) => {
    const d = CARD[id];
    const W = S, H = Math.round(S * 1.4);
    const m = keep(new THREE.MeshStandardMaterial({ roughness: 0.55 }));
    const draw = (img) => { const t = texOf(THREE, cardFace(W, H, d, img)); if (m.map) m.map.dispose(); m.map = t; m.needsUpdate = true; };
    draw(null);
    const load = () => {
      const src = artNow(id) || cardArt(d, 240, 170);
      if (!src) return false;
      const im = new Image(); im.onload = () => { if (!m.userData.dead) draw(im); }; im.src = src;
      return Boolean(artNow(id));
    };
    faces.push({ m, load, real: load() });
    return m;
  };
  const coinGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.024, 22);
  const coinMat = keep(new THREE.MeshStandardMaterial({ color: 0xe6b54a, metalness: 0.75, roughness: 0.3, emissive: 0x2a1800 }));
  const powGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.034, 18);
  const powMat = keep(new THREE.MeshStandardMaterial({ color: 0xb52233, metalness: 0.3, roughness: 0.45 }));
  const coins = [], pows = [];

  /**
   * Le plateau d'un joueur, vu depuis sa place (+z vers lui, -z vers le milieu de la table) : ses personnages en ligne (l'un
   * agenouillé, des jetons de Pouvoir sur le premier), puis sa rangée : scénario, lieu ou objet, pioche (une pile), défausse ;
   * son Or à droite.
   */
  function board({ w, d, icon, color, show, seed }) {
    const b = new THREE.Group(), r = rng(seed);
    const base = shadowy(new THREE.Mesh(box(w + 0.16, 0.05, d + 0.16), woodDark), true, true); base.position.y = TOP + 0.025; b.add(base);
    const tw = hi ? 640 : 384;
    const matTex = keep(texOf(THREE, feltMat(tw, Math.round(tw * d / w), color, icon, seed), { aniso: 8 }));
    const mat = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(w, d), keep(new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.95 }))), false, true);
    mat.rotation.x = -Math.PI / 2; mat.position.y = TOP + 0.052; b.add(mat);
    const y0 = TOP + 0.056;
    const lay = (m, x, z, rot = 0, lift = 0) => {
      const c = shadowy(new THREE.Mesh(cardGeo, m), true, false);
      c.rotation.x = -Math.PI / 2; c.rotation.z = rot; c.position.set(x, y0 + lift, z); b.add(c); return c;
    };
    // ses personnages : une ligne côté milieu de la table
    const n = show.chars.length, gap = Math.min(0.42, (w - 0.9) / Math.max(1, n));
    show.chars.forEach((id, i) => lay(faceMat(id), (i - (n - 1) / 2) * gap - 0.12, -d * 0.2, i === 1 ? -Math.PI / 2 : (r() - 0.5) * 0.06, i * 0.0006));
    // sa rangée, côté joueur : scénario (face cachée), lieu ou objet, pioche, défausse
    const zb = d * 0.24;
    lay(backMat, -w / 2 + 0.3, zb, Math.PI / 2 + (r() - 0.5) * 0.05);
    if (show.extra) lay(faceMat(show.extra), -w / 2 + 0.78, zb, (r() - 0.5) * 0.06);
    const h = 0.006 * 12;
    const pile = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CW, h, CH), [edgeMat, edgeMat, backMat, edgeMat, edgeMat, edgeMat]), true, true);
    pile.position.set(w / 2 - 0.78, y0 + h / 2, zb); pile.rotation.y = (r() - 0.5) * 0.06; b.add(pile);
    if (show.disc) lay(faceMat(show.disc), w / 2 - 0.36, zb, (r() - 0.5) * 0.1);
    // son Or (deux petites piles), son Pouvoir sur le premier personnage
    const stack = (x, z, k) => { for (let i = 0; i < k; i++) coins.push({ b, x: x + (r() - 0.5) * 0.012, y: y0 + 0.012 + i * 0.024, z: z + (r() - 0.5) * 0.012 }); };
    stack(w / 2 - 0.3, -d * 0.24, 4 + Math.floor(r() * 3)); stack(w / 2 - 0.14, -d * 0.12, 2 + Math.floor(r() * 2));
    if (n) for (let i = 0; i < 2; i++) pows.push({ b, x: -(n - 1) / 2 * gap - 0.12 + (i - 0.5) * 0.13, y: y0 + 0.017 + 0.001, z: -d * 0.2 + 0.1 });
    return b;
  }

  const fam = opt.deck ? opt.deck.fam : null;
  const others = otherDecks(fam);
  const fOf = (s) => FAMILY[s && s.fam] || FAMILY.neutre;
  const boards = [];
  // les deux autres joueurs, à un tiers de tour de chaque côté ; chaque plateau tourné vers sa place
  others.forEach((D, k) => {
    const a = (k ? -1 : 1) * (Math.PI * 2) / 3;
    const bd = board({ w: PB.w, d: PB.d, color: fOf(D).color, icon: fOf(D).icon, show: showOf(D, 4), seed: 40 + k });
    bd.position.set(Math.sin(a) * PB.r, 0, Math.cos(a) * PB.r); bd.rotation.y = a;
    group.add(bd); boards.push(bd);
  });
  // le plateau du joueur (seulement à l'écran titre : à l'accueil, le vrai plateau se pose par-dessus)
  const front = board({ w: FRONT.w, d: FRONT.d, color: fOf(opt.deck).color, icon: fOf(opt.deck).icon, show: showOf(opt.deck, 4), seed: 21 });
  front.position.set(FRONT.x, 0, FRONT.z);
  group.add(front);

  // le milieu de la table, commun à tous : le trésor (piles d'Or), les trois défis, la réserve de Pouvoir
  const mid = new THREE.Group();
  const rm = rng(5);
  for (const [x, z, k] of [[-0.75, -0.05, 7], [-0.55, 0.22, 5], [-0.9, 0.25, 4], [-0.42, -0.2, 3]]) for (let i = 0; i < k; i++) coins.push({ b: mid, x: x + (rm() - 0.5) * 0.014, y: TOP + 0.012 + i * 0.024, z: z + (rm() - 0.5) * 0.014 });
  const medalGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32);
  const MED = { combat: "#e0436a", ruse: "#2bb673", influence: "#8b5cf6" };
  TYPES.forEach((ty, i) => {
    const t = keep(texOf(THREE, medalTop(hi ? 192 : 128, MED[ty], TYPE_ICON[ty])));
    const side = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(MED[ty]).multiplyScalar(0.55), metalness: 0.4, roughness: 0.4 }));
    const topM = keep(new THREE.MeshStandardMaterial({ map: t, metalness: 0.25, roughness: 0.35 }));
    const m = shadowy(new THREE.Mesh(medalGeo, [side, topM, side]), true, true);
    m.position.set((i - 1) * 0.5, TOP + 0.03, -0.62 + Math.abs(i - 1) * 0.1); m.rotation.y = Math.PI / 2; mid.add(m); // l'icône droite, vue de sa place
  });
  const seal = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 36), [woodDark, keep(new THREE.MeshStandardMaterial({ map: keep(texOf(THREE, sealTop(hi ? 256 : 160))), roughness: 0.45, metalness: 0.2 })), woodDark]), true, true);
  seal.position.set(0.72, TOP + 0.04, 0.12); seal.rotation.y = Math.PI / 2; mid.add(seal);
  for (let i = 0; i < 6; i++) pows.push({ b: mid, x: 0.72 + Math.cos(i * 1.05) * 0.42, y: TOP + 0.017, z: 0.12 + Math.sin(i * 1.05) * 0.42 });
  group.add(mid);

  // pièces et jetons : une seule forme dessinée plusieurs fois
  group.updateMatrixWorld(true);
  const inst = (geo, mat, list) => {
    if (!list.length) return null;
    const im = shadowy(new THREE.InstancedMesh(geo, mat, list.length), true, true);
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    list.forEach((p, i) => { v.set(p.x, p.y, p.z); p.b.localToWorld(v); m.makeTranslation(v.x, v.y, v.z); im.setMatrixAt(i, m); });
    group.add(im); return im;
  };
  const coinsMesh = inst(coinGeo, coinMat, coins.filter((c) => c.b !== front));
  const powsMesh = inst(powGeo, powMat, pows.filter((c) => c.b !== front));
  const frontTok = [inst(coinGeo, coinMat, coins.filter((c) => c.b === front)), inst(powGeo, powMat, pows.filter((c) => c.b === front))].filter(Boolean);

  // le plateau du premier plan s'efface quand le vrai plateau se pose dessus (0 = caché, 1 = visible)
  const frontMats = new Set();
  front.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => frontMats.add(m)); });
  let frontA = 1;
  const setFront = (a) => {
    frontA = a;
    const vis = a > 0.01;
    front.visible = vis; frontTok.forEach((m) => { m.visible = vis; });
  };

  return {
    group, front, boards, coinsMesh, powsMesh,
    setFront, frontAlpha: () => frontA,
    /** Les illustrations intégrées arrivent après coup (liste chargée en tâche de fond) : on redessine les faces concernées. */
    refreshArt() { for (const f of faces) if (!f.real) f.real = f.load(); },
    dispose() {
      for (const f of faces) f.m.userData.dead = true;
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      for (const x of own) { if (x.map) x.map.dispose(); x.dispose && x.dispose(); }
      for (const f of faces) if (f.m.map) f.m.map.dispose();
    },
  };
}
