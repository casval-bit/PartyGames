// Vêtements en volume : manches, chaussures énormes, bas (jambes de pantalon, jupes…), cols et capuches.
// (Le haut et le bas sont PEINTS sur le corps, voir paint.js.)
const GOLD = "#e6b33a", METAL = "#aeb6c8";

const SLEEVES = { tee: "short", hoodie: "long", tank: "none", jacket: "long", suit: "long", overalls: "none", hawaii: "short", stripes: "long", jersey: "short", vest: "none", labcoat: "long", armor: "plate", toga: "none", dress: "cap", kimono: "wide", tux: "long", spiked: "none" };

export function addOutfit(ctx) {
  const { K, P, col, prof, hipY, lr, ar, arM, arW, ARM_U, ARM_F, limbK } = ctx;
  const { sph, cap, cyl, cone, box, tor, shade } = K;
  const B = (n) => (ctx.B[n] ||= new K.Bucket());
  const S = ctx.suit, top = S ? "none" : P.top.id, bot = S ? "none" : P.bot.id;
  const c1 = col.top, c2 = col.top2, yc = prof.yc, hb = prof.hb;

  /* ---- manches ---- */
  const sleeveCol = { tee: c1, hoodie: c1, jacket: c1, suit: c1, hawaii: c1, stripes: c1, jersey: c1, labcoat: c2, armor: METAL, tux: c1, kimono: c1, dress: c1 }[top];
  for (const s of [-1, 1]) {
    const sh = B(s < 0 ? "armA" : "armB"), fo = B(s < 0 ? "foreA" : "foreB"), kind = SLEEVES[top];
    if (kind === "short") sh.add(cyl(ar + 0.025, ar + 0.032, 0.13, 12), sleeveCol, { p: [0, -0.06, 0] });
    if (kind === "cap") sh.add(cyl(ar + 0.025, ar + 0.03, 0.08, 12), sleeveCol, { p: [0, -0.035, 0] });
    if (kind === "long") {
      sh.add(cyl(ar + 0.025, ar + 0.03, ARM_U, 12), top === "stripes" ? c1 : sleeveCol, { p: [0, -ARM_U / 2, 0] });
      fo.add(cyl(arM + 0.024, arW + 0.026, ARM_F * 0.82, 12), sleeveCol, { p: [0, -ARM_F * 0.41, 0] });
      fo.add(cyl(arW + 0.032, arW + 0.032, 0.035, 12), shade(sleeveCol, -0.12), { p: [0, -ARM_F * 0.82, 0] });
    }
    if (kind === "wide") { sh.add(cone(0.18, 0.3, 14), sleeveCol, { p: [0, -0.15, 0], r: [Math.PI, 0, 0] }); sh.add(cone(0.22, 0.3, 14), sleeveCol, { p: [0, -0.2, 0], r: [Math.PI, 0, 0] }); }
    if (kind === "plate") { sh.add(sph(0.13 + 0.03, 1, 0.75, 1), METAL, { p: [0, 0.0, 0] }); sh.add(cyl(ar + 0.025, ar + 0.03, ARM_U * 0.8, 12), METAL, { p: [0, -ARM_U * 0.5, 0] }); fo.add(cyl(arM + 0.028, arW + 0.024, ARM_F * 0.7, 12), shade(METAL, -0.06), { p: [0, -ARM_F * 0.35, 0] }); }
    if (top === "jersey") sh.add(cyl(ar + 0.03, ar + 0.035, 0.035, 12), c2, { p: [0, -0.1, 0] });
    if (top === "spiked") { sh.add(sph(0.12, 1, 0.7, 1), shade(c1, -0.14), { p: [0, 0.0, 0] }); for (let i = 0; i < 3; i++) sh.add(cone(0.028, 0.14, 8), METAL, { p: [s * (0.03 + i * 0.03), 0.08 - i * 0.012, 0], r: [0, 0, -s * (0.5 + i * 0.35)] }); }
    if (top === "toga") sh.add(sph(0.09, 1.1, 0.8, 1), c2, { p: [0, 0.0, 0.0] });
  }

  /* ---- chaussures : plus de pieds (style Fall Guys) → ce sont des manchons qui habillent le bas de la jambe, le bout reste plat ---- */
  const sole = -hipY, shoe = ctx.shoeC, white = "#f4f1ea";
  for (const s of [-1, 1]) {
    const lg = B(s < 0 ? "legA" : "legB");
    const R0 = lr + 0.03;
    // manchon : bas à y = sole + lift, hauteur h, bord du bas arrondi
    const sleeve = (h, c, r = R0, edge = 0.05, lift = 0.0) => lg.add(K.pill(r, h, Math.min(edge, r * 0.55), 22), c, { p: [0, sole + lift + h + 0.012, 0] });
    const plate = (r, h, c) => sleeve(h, c, r, h * 0.5);
    const band = (y, r, c, t = 0.022) => lg.add(tor(r, t, Math.PI * 2, 24), c, { p: [0, sole + y, 0], r: [Math.PI / 2, 0, 0], ink: false });
    const tick = (y, w = 0.075, c = white) => lg.add(box(w, 0.014, 0.016, 0.006), c, { p: [0, sole + y, R0 + 0.004], ink: false });
    switch (P.shoes.id) {
      case "sneak": sleeve(0.15, shoe); plate(R0 + 0.014, 0.045, white); band(0.16, R0 + 0.002, white, 0.02); tick(0.07); tick(0.1); tick(0.13); break;
      case "boots": sleeve(0.26, shoe); plate(R0 + 0.02, 0.05, "#3a2a20"); band(0.27, R0 + 0.008, shade(shoe, 0.15), 0.028); break;
      case "rain": sleeve(0.32, "#ffd23a", R0 + 0.006); plate(R0 + 0.022, 0.05, "#2a2430"); band(0.33, R0 + 0.012, "#ffe680", 0.028); break;
      case "sandal": plate(R0 + 0.012, 0.035, "#7a5430"); band(0.075, lr + 0.012, shoe, 0.016); band(0.125, lr + 0.012, shoe, 0.016); break;
      case "bare": break;
      case "clown": sleeve(0.21, shoe, lr + 0.085, 0.09); plate(lr + 0.095, 0.05, white); band(0.22, lr + 0.08, shade(shoe, 0.25), 0.03); lg.add(sph(0.05, 1, 1, 1), shade(shoe, 0.25), { p: [0, sole + 0.14, lr + 0.085], ink: false }); break;
      case "flip": plate(lr + 0.11, 0.04, shoe); band(0.07, lr + 0.012, shade(shoe, -0.12), 0.02); break;
      case "hightop": sleeve(0.3, shoe); plate(R0 + 0.02, 0.05, white); band(0.31, R0 + 0.006, white, 0.026); tick(0.12); tick(0.18); tick(0.24); break;
      case "roller": sleeve(0.17, shoe, R0, 0.05, 0.1); lg.add(box(0.1, 0.04, 0.36, 0.015), "#3a3a44", { p: [0, sole + 0.095, 0] }); for (const z of [-0.12, 0, 0.12]) lg.add(cyl(0.052, 0.052, 0.055, 14), "#ffd23a", { p: [0, sole + 0.052, z], r: [0, 0, Math.PI / 2] }); break;
      case "slipper": sleeve(0.17, shoe, lr + 0.065, 0.08); for (const q of [-1, 1]) lg.add(cap(0.036, 0.16, 6), shoe, { p: [q * 0.075, sole + 0.27, 0.05], r: [-0.25, 0, -q * 0.3] }); lg.add(sph(0.03, 1, 1, 1), "#ffb3c8", { p: [0, sole + 0.11, lr + 0.07], ink: false }); break;
      case "paws": sleeve(0.17, shoe, lr + 0.05, 0.08); for (const q of [-1, 0, 1]) lg.add(sph(0.034, 1, 0.9, 0.7), shade(shoe, -0.25), { p: [q * 0.058, sole + 0.065, lr + 0.04], ink: false }); break;
      case "hoof": sleeve(0.15, "#3a3026", lr + 0.045, 0.05); band(0.16, lr + 0.02, shade(shoe, 0), 0.03); break;
    }
  }


  /* ---- bas : volumes (le motif est peint sur le corps) ---- */
  if (bot !== "none") {
    const legTop = -0.02, la = hipY - 0.18, tb = B("torso");
    const cover = (len, extra = 0.025, c = col.bot, flare = 0) => { for (const s of [-1, 1]) B(s < 0 ? "legA" : "legB").add(cyl(lr + extra, lr + extra + flare, len, 14), c, { p: [0, legTop - len / 2, 0] }); };
    switch (bot) {
      case "jeans": cover(la); for (const s of [-1, 1]) B(s < 0 ? "legA" : "legB").add(cyl(lr + 0.035, lr + 0.035, 0.04, 14), shade(col.bot, 0.1), { p: [0, legTop - la + 0.03, 0] }); break;
      case "shorts": cover(0.14, 0.03); break;
      case "trunks": cover(0.1, 0.028); break;
      case "greaves": cover(0.16, 0.03); for (const s of [-1, 1]) { const lg = B(s < 0 ? "legA" : "legB"); lg.add(cyl(lr + 0.035, lr + 0.025, 0.2, 12), METAL, { p: [0, legTop - la + 0.13, 0] }); lg.add(sph(0.08, 1, 0.8, 1), GOLD, { p: [0, legTop - la + 0.24, 0.07] }); } break;
      case "skirt": case "tutu": case "kilt": {
        const rt = prof.rAt(hb + 0.16) + 0.015, rb = rt + (bot === "tutu" ? 0.3 : bot === "kilt" ? 0.14 : 0.2), h = bot === "tutu" ? 0.2 : 0.3;
        tb.add(cyl(rt, rb, h, 28), col.bot, { p: [0, hb + 0.17 - h / 2, 0] });
        if (bot === "tutu") for (let i = 0; i < 2; i++) tb.add(cyl(rt + 0.1, rb + 0.06 + i * 0.03, 0.05, 28), shade(col.bot, 0.12 * (i + 1)), { p: [0, hb - 0.0 - i * 0.04, 0], ink: false });
        if (bot === "kilt") { for (let i = 0; i < 3; i++) tb.add(cyl(rb - 0.03 * (1 - i * 0.5), rb + 0.002 - 0.03 * (1 - i * 0.5), 0.025, 28), shade(col.bot, i % 2 ? 0.2 : -0.18), { p: [0, hb + 0.17 - h * (0.25 + i * 0.28), 0], ink: false }); tb.add(box(0.11, 0.12, 0.05, 0.02), "#7a5430", { p: [0, hb + 0.1, rt + 0.04] }); }
        break; }
    }
    if (bot === "skirt" || bot === "kilt") tb.add(tor(prof.rAt(hb + 0.17) + 0.02, 0.016, Math.PI * 2, 24), "#4a3524", { p: [0, hb + 0.17, 0], r: [Math.PI / 2, 0, 0], ink: false });
  }

  /* ---- hauts à volume : col, capuche, jupe de la robe… ---- */
  const t = B("torso"), neckY = yc - 0.36, rn = prof.rAt(neckY);
  switch (top) {
    case "hoodie": t.add(sph(0.3, 1.1, 0.75, 0.6), c1, { p: [0, neckY + 0.05, -rn * 0.88] }); t.add(tor(rn + 0.02, 0.04, Math.PI * 2, 24), c1, { p: [0, neckY, 0], r: [Math.PI / 2, 0, 0] }); break;
    case "jacket": case "suit": case "tux": case "labcoat": t.add(tor(rn + 0.02, 0.035, Math.PI * 2, 24), top === "labcoat" ? shade(c2, -0.06) : shade(c1, 0.08), { p: [0, neckY, 0], r: [Math.PI / 2, 0, 0] });
      if (top === "tux") { for (const s of [-1, 1]) t.add(cone(0.08, 0.14, 4), c2, { p: [s * 0.08, neckY - 0.02, rn + 0.04], r: [0, 0, s * Math.PI / 2], s: [1, 1, 0.6] }); t.add(sph(0.035, 1, 1, 0.8), shade(c2, -0.1), { p: [0, neckY - 0.02, rn + 0.05] }); }
      break;
    case "dress": { const rt = prof.rAt(prof.hb + 0.16) + 0.015; t.add(cyl(rt, rt + 0.26, 0.34, 28), c1, { p: [0, prof.hb + 0.0, 0] }); t.add(cyl(rt + 0.258, rt + 0.262, 0.05, 28), c2, { p: [0, prof.hb - 0.15, 0], ink: false }); break; }
    case "kimono": t.add(box(0.26, 0.2, 0.08, 0.04), c2, { p: [0, yc - 0.82, -prof.rAt(yc - 0.82) - 0.02] }); t.add(box(0.08, 0.26, 0.06, 0.03), c2, { p: [-0.05, yc - 1.0, -prof.rAt(yc - 1.0) - 0.04], r: [0, 0, 0.3] }); break;
    case "toga": t.add(sph(0.05, 1, 1, 1), GOLD, { p: [-0.27, neckY + 0.05, rn * 0.8] }); break;
    case "spiked": t.add(tor(rn + 0.02, 0.035, Math.PI * 2, 24), shade(c1, -0.2), { p: [0, neckY, 0], r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; t.add(cone(0.028, 0.09, 6), METAL, { p: [Math.sin(a) * (rn + 0.06), neckY, Math.cos(a) * (rn + 0.06)], r: [Math.PI / 2 * Math.cos(a), 0, -Math.PI / 2 * Math.sin(a)], inkw: 0.008 }); } break;
    case "armor": for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; t.add(box(0.12, 0.2, 0.03, 0.01), shade(METAL, -0.06), { p: [Math.sin(a) * (prof.rAt(prof.hb + 0.1) + 0.0), prof.hb + 0.0, Math.cos(a) * (prof.rAt(prof.hb + 0.1) + 0.0)], r: [0, a, 0] }); } break;
  }
  ctx.limbK = limbK;
}
