// Jambes, bras et mains : UNE seule forme pour tout le monde (voir LIMBS dans body.js) — jamais modifiée par un costume.
// Repère : une jambe part de la hanche (y = 0) vers le bas, finit à plat avec un bord arrondi (pas de pied) ;
// un bras part de l'épaule vers le bas (-y), le coude et la main sont des groupes emboîtés.
// Les mains sont des plaques rectangulaires aux coins adoucis (pas de cylindres, pas de boules), comme des tranches de saumon sur des sushis : 3 doigts + 1 pouce.

/** Jambes : boudins qui descendent jusqu'au sol et finissent à plat (bord arrondi). */
export function addLegs(ctx, legs, bk) {
  const { K, rig } = ctx, { pill } = K;
  const la = rig.hipY - 0.01, col = ctx.legC;
  for (const L of legs) bk(L.name).add(pill(rig.lr, la, rig.lr * 0.42, 22), col);
}

/** Un bras complet : haut du bras, avant-bras, main. */
export function addArm(ctx, A, bk) {
  const { K, rig } = ctx, { taper, sph } = K, col = ctx.armC;
  const { ar: r0, arM: r1, arW: r2, ARM_U: U, ARM_F: F } = rig;
  const sh = bk(A.sh.name), el = bk(A.el.name);
  sh.add(sph(r0 * 1.04, 1, 1, 1), col);                          // épaule arrondie, à moitié dans le corps : raccord sans cassure
  sh.add(taper(r0, r1, U, 16), col);
  el.add(sph(r1 * 1.02, 1, 1, 1), col);                          // coude arrondi : pas de marche entre le bras et l'avant-bras
  if (F > 0.01) el.add(taper(r1, r2, F, 16), col);
  else el.add(sph(r1 * 0.98, 1, 1, 1), col);
  addHand(ctx, A, bk, col);
}

function addHand(ctx, A, bk, col) {
  const { K } = ctx, { box } = K, hb = bk(A.hand.name), sl = A.s;
  // paume plate + 3 doigts + pouce, tous rectangulaires
  hb.add(box(0.2, 0.105, 0.07, 0.03), col, { p: [0, -0.05, 0] });
  [[-1, 0.098], [0, 0.118], [1, 0.098]].forEach(([i, len]) => hb.add(box(0.066, len, 0.052, 0.024), col, { p: [i * 0.068, -(0.09 + len / 2 - 0.02), 0], r: [0, 0, i * 0.07] }));
  hb.add(box(0.07, 0.092, 0.054, 0.024), col, { p: [-sl * 0.115, -0.07, 0.012], r: [-0.25, 0, -sl * 0.6] });
}
