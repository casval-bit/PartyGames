// Construit un personnage « haricot » 3D complet à partir de la chaîne `x` (voir schema.js).
// UN SEUL corps pour tout le monde : même taille, mêmes proportions, mêmes jambes, mêmes bras (body.js). Costumes et couleurs ne changent que l'apparence.
// Repère : pieds à y = 0, regarde vers +Z, hauteur ≈ 1,6.
// L'objet renvoyé a la même interface que le haricot des mini-jeux (group, body, anim, squash, shadow) : on peut l'y substituer.
import { kitOf } from "./kit.js";
import { partsOf } from "./schema.js";
import { surf } from "./head.js";
import { BEAN, LIMBS, profileOf, bodyGeo } from "./body.js";
import { ANIMALS } from "./animals.js";
import { addLegs, addArm } from "./limbs.js";
import { paintBody } from "./paint.js";
import { suitOf, addSuit } from "./costume.js";
import { addCritter, addTail } from "./critter.js";
import { addOutfit } from "./outfit.js";
import { addHair } from "./hair.js";
import { addGear } from "./gear.js";

const NONE = { id: "none", name: "" };

/**
 * @param M     { THREE, mergeGeometries, RoundedBoxGeometry } (voir render.js)
 * @param x     chaîne d'apparence
 * @param o     { shadow: true }
 */
export function makeFigure(M, x, o = {}) {
  const K = kitOf(M), { THREE, Bucket, textured } = K;
  let P = partsOf(x);
  const LEG_H = LIMBS.legH, bs = BEAN.bs, size = 1;                    // taille et proportions : toujours les mêmes
  const costume = ANIMALS[P.suit.id] || null;
  if (costume && costume.face) P = { ...P, ...Object.fromEntries(Object.entries(costume.face).map(([k, v]) => [k, { id: v, name: "" }])) };      // traits du visage imposés par le costume
  const prof = profileOf(BEAN);
  const col = {
    skin: P.skin.hex, skin2: P.skin2.hex, face: P.facec.hex, hair: P.hairc.hex, eye: P.eyec.hex, top: P.topc.hex, top2: P.top2.hex, bot: P.botc.hex, shoe: P.shoec.hex,
    hat: P.hatc.hex, gl: P.glc.hex, neck: P.neckc.hex, back: P.backc.hex, hand: P.handc.hex, suit: P.suitc.hex, suit2: P.suit2.hex,
  };

  const ctx = {
    K, P, col, prof, bs, size, tw: 1.25, headShape: "round", surf: (lon, lat, off = 0) => surf("round", lon, lat, off),
    B: {}, G: {}, fig: null, impliedNose: (costume && costume.impliedNose) || null,
  };
  if (costume && costume.faceC) col.face = costume.faceC;
  const suit = (ctx.suit = suitOf(ctx));
  if (suit && suit.hideLower) ctx.P = P = { ...P, mouth: NONE, beard: NONE, nose: NONE, face: NONE };
  ctx.limbC = suit ? suit.limb : col.skin;
  ctx.headC = suit && !suit.info.head ? suit.m : col.skin;         // couleur de la tête (celle du costume s'il couvre la tête) : sert aux museaux, oreilles et queues
  ctx.legC = suit ? suit.legs : col.skin;
  ctx.armC = suit ? suit.limb : col.skin;
  ctx.shoeC = suit && suit.shoe ? suit.shoe : col.shoe;
  const limbK = 1;

  /* ---- mesures (monde) : les mêmes pour tout le monde (LIMBS, body.js) ---- */
  const hipY = LIMBS.hipY, legX = LIMBS.legX;
  const lr = LIMBS.legR, ar = LIMBS.armR, arM = LIMBS.armRM, arW = LIMBS.armRW, ARM_U = LIMBS.armU, ARM_F = LIMBS.armF;
  // l'épaule est posée SUR la surface du corps (le bout du bras est à moitié enfoncé dedans) : le bras pousse du corps, il ne flotte pas à côté
  const shY = Math.max(prof.hb + 0.14, prof.yc - LIMBS.shoulderDrop), shX = bs * prof.rAt(shY) - LIMBS.shoulderEmbed, shWorldY = LEG_H + bs * shY;
  const spread = Math.max(0, Math.min(0.6, (prof.rAt(shY - 0.45) - prof.rAt(shY)) * bs * 2.2));      // ventre plus large que les épaules : les bras s'écartent
  ctx.rig = { hipY, lr, ar, arM, arW, ARM_U, ARM_F, limbK };
  Object.assign(ctx, { hipY, lr, ar, arM, arW, ARM_U, ARM_F, limbK, hr: 0.5 * bs, headCY: LEG_H + bs * prof.yc, rNeck: prof.rAt(prof.yc - 0.36) });

  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const parts = new THREE.Group();
  parts.scale.setScalar(size);
  body.add(parts);

  /* ---- groupes articulés ---- */
  const mkG = (name, parent, gx, gy, gz) => { const g = new THREE.Group(); g.position.set(gx, gy, gz); g.name = name; parent.add(g); ctx.G[name] = g; return g; };
  const trunk = mkG("torso", parts, 0, LEG_H, 0); trunk.scale.setScalar(bs);
  const headG = mkG("head", trunk, 0, prof.yc, 0);
  const neckG = mkG("neck", trunk, 0, prof.yc - 0.36, 0);
  const backY = prof.yc - 0.22, backG = mkG("back", trunk, 0, backY, -prof.rAt(backY) - 0.01); backG.scale.setScalar(1.35);
  const tailY = prof.hb + 0.04, tailG = mkG("tail", trunk, 0, tailY, -prof.rAt(tailY) + 0.05);
  const legs = [-1, 1].map((s) => mkG(s < 0 ? "legA" : "legB", parts, s * legX, hipY, 0));
  const arms = [-1, 1].map((s) => {
    const sh = mkG(s < 0 ? "armA" : "armB", parts, s * shX, shWorldY, 0);
    const el = mkG(s < 0 ? "foreA" : "foreB", sh, 0, -ARM_U, 0);
    const hand = mkG(s < 0 ? "handA" : "handB", el, 0, -ARM_F, 0);
    return { sh, el, hand, s };
  });
  const itemG = mkG("item", arms[1].hand, 0, 0, 0);   // objet tenu : s'étend le long de +Z de la main
  itemG.rotation.x = Math.PI / 2; itemG.scale.setScalar(1.3);
  const bk = (name) => (ctx.B[name] ||= new Bucket());

  /* ---- jambes et bras : toujours les mêmes (limbs.js) ---- */
  addLegs(ctx, legs, bk);
  for (const A of arms) addArm(ctx, A, bk);

  /* ---- corps : une surface, une texture peinte (couleur, motif, vêtements, costume, visage) ---- */
  const painted = paintBody(ctx);
  const tex = new THREE.CanvasTexture(painted.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  textured(bodyGeo(K, prof), tex, trunk);
  ctx.textures = [tex];

  /* ---- costume, museau/oreilles/cornes, queue, vêtements en volume, cheveux, accessoires ---- */
  addSuit(ctx);
  addCritter(ctx);
  const hasTail = addTail(ctx) !== null;
  addOutfit(ctx);
  addHair(ctx);
  addGear(ctx);

  /* ---- on monte tous les seaux dans leurs groupes ---- */
  for (const [name, bucket] of Object.entries(ctx.B)) { const g = ctx.G[name]; if (g) bucket.mount(g); }

  /* ---- ombre ---- */
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.scale.setScalar(size * Math.max(0.8, bs * 0.95));
  if (o.shadow !== false) root.add(shadow);

  /* ================================ animation ================================ */
  const poseId = P.pose.id, holding = P.hand.id !== "none";
  const A = arms, L = legs;
  const set = (a, sz, ez, sx = 0, ex = 0) => { a.sh.rotation.set(sx, 0, sz); a.el.rotation.set(ex, 0, ez); };
  const spr = spread;
  const mix = (a, b, k) => a + (b - a) * k;
  // pose de repos façon Fall Guys : les bras s'écartent du corps, le coude plie vers l'avant, les mains flottent devant les hanches
  const R0 = LIMBS.rest, RUN = { sz: 0.5, ez: 0.15, ex: -0.95, swing: 1 }, fl = 0;
  const rest = (br = 0) => ({ sz: R0.sz + spr + br * 0.015, ez: R0.ez, sx: R0.sx, ex: R0.ex });
  const put = (a, o) => set(a, a.s * o.sz, -a.s * o.ez, o.sx, o.ex);
  const fig = {
    group: root, body, torso: trunk, head: headG, legs, arms, shadow, color: col.top, scale: size, ctx, x,
    height: (LEG_H + bs * prof.top) * size,
    /** Pose : run 0..1, air (saut), stun, fall, cheer, t (secondes). Au repos, la pose choisie dans l'éditeur. */
    anim({ run = 0, air = false, stun = false, fall = false, cheer = false, t = 0, pose = poseId, look = 0 } = {}) {
      const lift = fl ? fl + Math.sin(t * 2.2) * 0.045 : 0;
      body.position.y = lift; body.rotation.set(0, 0, 0);
      trunk.rotation.set(0, look * 0.6, 0); trunk.scale.setScalar(bs); trunk.position.y = LEG_H;
      for (const l of L) l.rotation.set(0, 0, 0);
      tailG.rotation.set(0, 0, 0);
      if (hasTail) tailG.rotation.y = Math.sin(t * (run > 0.05 ? 14 : 3.2)) * (run > 0.05 ? 0.5 : 0.35);
      if (air) { if (L[0]) { L[0].rotation.x = -0.8; L[1].rotation.x = 0.5; } set(A[0], -2.5, 0.2); set(A[1], 2.5, -0.2); body.rotation.x = 0.1; return; }
      if (cheer) { const w = Math.sin(t * 14); set(A[0], -2.75 - w * 0.25, -0.2); set(A[1], 2.75 + Math.sin(t * 14 + 1) * 0.25, 0.2); body.position.y = lift + Math.abs(Math.sin(t * 7)) * 0.22; trunk.rotation.z = Math.sin(t * 7) * 0.12; return; }
      if (stun) { body.rotation.z = Math.sin(t * 30) * 0.14; set(A[0], -1.3, -0.3); set(A[1], 1.3, 0.3); trunk.rotation.z = Math.sin(t * 20) * 0.2; return; }
      if (fall) { set(A[0], -2.4 - Math.sin(t * 20) * 0.4, 0); set(A[1], 2.4 + Math.sin(t * 20) * 0.4, 0); if (L[0]) { L[0].rotation.x = Math.sin(t * 18) * 0.7; L[1].rotation.x = -Math.sin(t * 18) * 0.7; } return; }
      const sw = Math.sin(t * 13) * 0.95 * run;
      if (run > 0.05) {
        if (L[0]) { L[0].rotation.x = sw; L[1].rotation.x = -sw; }
        const k = Math.min(1, run * 2.5), r0 = rest(0), sw0 = sw * 0.9;
        put(A[0], { sz: mix(r0.sz, RUN.sz + spr, k), ez: mix(r0.ez, RUN.ez, k), sx: mix(r0.sx, -sw0 * RUN.swing - 0.2, k), ex: mix(r0.ex, RUN.ex, k) });
        put(A[1], { sz: mix(r0.sz, RUN.sz + spr, k), ez: mix(r0.ez, RUN.ez, k), sx: mix(r0.sx, sw0 * RUN.swing - 0.2, k), ex: mix(r0.ex, RUN.ex, k) });
        body.position.y = lift + Math.abs(Math.sin(t * 13)) * 0.1 * run; body.rotation.x = run * 0.16; trunk.rotation.z = Math.sin(t * 13) * 0.07 * run; return;
      }
      // repos : respiration, balancement + pose
      const br = Math.sin(t * 2.2);
      trunk.scale.set(bs * (1 - br * 0.008), bs * (1 + br * 0.014), bs * (1 - br * 0.008));
      trunk.rotation.z = Math.sin(t * 0.9) * 0.03;
      const R = rest(br);
      switch (pose) {
        case "wave": if (holding) { put(A[1], R); set(A[0], -2.55, -0.5 - Math.sin(t * 9) * 0.5); } else { put(A[0], R); set(A[1], 2.55, 0.5 + Math.sin(t * 9) * 0.5); } break;
        case "hips": set(A[0], -0.85 - spr, 1.4); set(A[1], 0.85 + spr, -1.4); break;
        case "flex": set(A[0], -1.5 + br * 0.05, -1.5); set(A[1], 1.5 - br * 0.05, 1.5); break;
        case "cheer": set(A[0], -2.7 - Math.sin(t * 5) * 0.2, -0.15); set(A[1], 2.7 + Math.sin(t * 5 + 1) * 0.2, 0.15); body.position.y = lift + Math.abs(Math.sin(t * 3)) * 0.05; break;
        case "think": put(A[0], R); set(A[1], 0.1 + spr, 0, -0.95, -1.9); trunk.rotation.z = 0.06; break;
        default: put(A[0], R); put(A[1], R);
      }
      if (holding && pose !== "cheer" && pose !== "flex") set(A[1], 0.55 + spr, 0.0, -0.3 + br * 0.02, -1.15);   // le bras droit tient l'objet devant lui
    },
    /** Écrase / étire le personnage (rebond au saut, à l'atterrissage). */
    squash(k) { body.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5); },
    dispose() {
      root.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
      for (const t of ctx.textures) t.dispose();
    },
  };
  ctx.fig = fig;
  fig.anim({});
  return fig;
}
