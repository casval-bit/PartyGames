// Doudous : dessin des textures (canvas 2D) — pelage et motifs, visage et expressions, tissus des tenues.
// Les coordonnées du visage sont en « unités monde » autour du centre des yeux ; F.px / F.sx / F.sy les convertissent en pixels.

const TAU = Math.PI * 2;
/** Petit générateur à graine (motifs identiques d'un rendu à l'autre). */
export const rng = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
/** Mélange deux couleurs hex (k = part de b). */
export const mix = (a, b, k) => { const A = hexToRgb(a), B = hexToRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
export const lum = (h) => { const [r, g, b] = hexToRgb(h); return (r * 0.3 + g * 0.59 + b * 0.11) / 255; };
const star = (g, x, y, r, n = 5, k = 0.45) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * k : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45); g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); g.closePath(); };
const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, TAU); };

/* ================================ PELAGE ================================ */
/**
 * Texture du corps (u = tour complet, avant au milieu ; v = du bas vers le haut). M = { W, H, front(φ)→x, y(t)→y, eyeT, faceHalf }
 * Renvoie aussi un canvas d'émission (lueur des motifs « circuit »/« galaxie ») ou null.
 */
export function paintBody(g, M, P, sp) {
  const { W, H } = M, c1 = P.color, c2 = P.color2, R = rng(7 + W);
  const X = (phi) => ((phi + Math.PI) / TAU) * W, Y = (t) => (1 - t) * H;
  g.fillStyle = c1; g.fillRect(0, 0, W, H);
  // léger dégradé : un peu plus clair en haut, un peu plus sombre en bas (volume)
  const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, "rgba(255,255,255,0)"); vg.addColorStop(0.55, "rgba(255,255,255,0)"); vg.addColorStop(1, "rgba(30,10,50,0.18)");
  let glow = null;
  const pat = P.motif;
  const soft = (x, y, rx, ry, col, edge = 0.18) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * (1 - edge), 0, 0, rx); gr.addColorStop(0, col); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore(); };
  const wrapDraw = (fn) => { fn(0); fn(-W); fn(W); };   // dessine aussi de l'autre côté de la couture
  if (pat === "ventre" || sp.belly) soft(X(0), Y(0.3), W * 0.17, H * 0.27, sp.belly && pat !== "ventre" ? "#f7f4ee" : c2, 0.12);
  if (pat === "chaussettes") { g.fillStyle = c2; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, Y(0.24) + Math.sin(x / W * TAU * 10) * 4); g.lineTo(W, H); g.closePath(); g.fill(); }
  if (pat === "degrade") { const gr = g.createLinearGradient(0, Y(0.85), 0, Y(0.12)); gr.addColorStop(0, rgba(c2, 0)); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  if (pat === "taches") for (let i = 0; i < 16; i++) { const x = R() * W, y = Y(0.1 + R() * 0.82), r = 14 + R() * 20; wrapDraw((o) => { g.fillStyle = c2; ell(g, x + o, y, r * (1.1 + R() * 0.4), r * 0.85, R() * 3); g.fill(); }); }
  if (pat === "rayures") {
    g.fillStyle = c2;
    for (let k = 0; k < 7; k++) {
      const t = 0.22 + k * 0.1, y = Y(t);
      for (const cx of [X(Math.PI * 0.999), X(-Math.PI * 0.999), X(Math.PI * 0.55), X(-Math.PI * 0.55)]) {
        g.beginPath(); g.moveTo(cx - 60, y); g.quadraticCurveTo(cx, y - 9, cx + 60, y + 2); g.quadraticCurveTo(cx, y + 2, cx - 60, y); g.fill();
      }
    }
    // rayures du dessus de la tête
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(X(k * 0.32) - 6, Y(0.995)); g.lineTo(X(k * 0.32) + 6, Y(0.995)); g.lineTo(X(k * 0.26), Y(0.86)); g.closePath(); g.fill(); }
  }
  if (pat === "pois") { g.fillStyle = c2; for (let j = 0; j < 7; j++) for (let i = 0; i < 16; i++) { const x = (i + (j % 2) * 0.5) / 16 * W, y = Y(0.1 + j * 0.13); ell(g, x, y, 6.5, 6.5 * 0.9); g.fill(); } }
  if (pat === "masque") { g.fillStyle = c2; const y = Y(M.eyeT); g.beginPath(); g.moveTo(X(-1.25), y); g.bezierCurveTo(X(-0.9), y - H * 0.11, X(-0.25), y - H * 0.1, X(0), y - H * 0.02); g.bezierCurveTo(X(0.25), y - H * 0.1, X(0.9), y - H * 0.11, X(1.25), y); g.bezierCurveTo(X(0.9), y + H * 0.12, X(0.3), y + H * 0.09, X(0), y + H * 0.03); g.bezierCurveTo(X(-0.3), y + H * 0.09, X(-0.9), y + H * 0.12, X(-1.25), y); g.fill(); }
  if (pat === "tricolore") {
    const c3 = lum(c1) > 0.5 ? mix(c2, "#2d2b36", 0.55) : mix(c2, "#ffffff", 0.5);
    for (const [phi, t, r, col] of [[2.4, 0.62, 40, c2], [-2.2, 0.35, 36, c3], [0.75, 0.86, 26, c3], [-0.95, 0.3, 32, c2], [1.1, 0.25, 28, c3], [3.0, 0.2, 30, c3], [-1.6, 0.75, 30, c2]]) wrapDraw((o) => { g.fillStyle = col; ell(g, X(phi) + o, Y(t), r * 1.3, r * 0.9, phi); g.fill(); });
  }
  if (pat === "etoiles") { g.fillStyle = c2; for (let i = 0; i < 26; i++) { const x = R() * W, y = Y(0.1 + R() * 0.82); wrapDraw((o) => { star(g, x + o, y, 8 + R() * 6); g.fill(); }); } }
  if (pat === "coeurs") { g.fillStyle = c2; for (let i = 0; i < 26; i++) { const x = R() * W, y = Y(0.1 + R() * 0.82); wrapDraw((o) => { heart(g, x + o, y, 8 + R() * 5); g.fill(); }); } }
  if (pat === "arcenciel") { const cols = ["#ff8fa8", "#ffb27a", "#ffe27a", "#9be59b", "#8fc8ff", "#c3a3ff"]; cols.forEach((col, k) => { g.fillStyle = rgba(col, 0.92); g.fillRect(0, Y(1 - k / cols.length), W, H / cols.length + 1); }); }
  if (pat === "galaxie") {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2a2160"); gr.addColorStop(1, "#120f2e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) soft(R() * W, R() * H, 40 + R() * 40, 26 + R() * 20, rgba(i % 2 ? c1 : c2, 0.55), 0.95);
  }
  if (pat === "circuit" || pat === "galaxie") {
    glow = document.createElement("canvas"); glow.width = W; glow.height = H;
    const e = glow.getContext("2d"); e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
    const draw = (gg, col, lw) => {
      gg.strokeStyle = col; gg.fillStyle = col; gg.lineWidth = lw; gg.lineCap = "round"; gg.lineJoin = "round";
      if (pat === "circuit") {
        const Q = rng(99);
        for (let i = 0; i < 14; i++) {
          let x = Q() * W, y = Y(0.08 + Q() * 0.8); gg.beginPath(); gg.moveTo(x, y);
          for (let k = 0; k < 3; k++) { if (k % 2) x += (Q() - 0.5) * 70; else y += (Q() - 0.5) * 40; gg.lineTo(x, y); }
          gg.stroke(); gg.beginPath(); gg.arc(x, y, lw * 1.6, 0, TAU); gg.fill();
        }
      } else { const Q = rng(5); for (let i = 0; i < 70; i++) { gg.beginPath(); gg.arc(Q() * W, Q() * H, (Q() < 0.15 ? 1.8 : 0.9) * lw, 0, TAU); gg.fill(); } }
    };
    draw(g, pat === "circuit" ? c2 : "#ffffff", pat === "circuit" ? 3.4 : 2.2); draw(e, pat === "circuit" ? c2 : "#ffffff", pat === "circuit" ? 3.4 : 2.2);
  }
  if (!sp.ghost) { g.fillStyle = vg; g.fillRect(0, 0, W, H); }
  return glow;
}

/* ================================ VISAGE ================================ */
const INK = "#3a2238";
/** Dessine un œil selon le style. (x, y) centre en px, rx/ry rayons en px, col = couleur du reflet bas. */
function eye(g, x, y, rx, ry, style, col, side) {
  if (style === "billes") { rx *= 0.55; ry *= 0.6; }
  if (style === "ovales") { rx *= 0.82; ry *= 1.08; }
  if (style === "led") {
    g.fillStyle = "#0d1a33"; g.beginPath(); g.roundRect(x - rx * 1.05, y - ry * 0.8, rx * 2.1, ry * 1.6, rx * 0.45); g.fill();
    g.shadowColor = col; g.shadowBlur = rx * 0.6; g.fillStyle = mix(col, "#ffffff", 0.35);
    g.beginPath(); g.roundRect(x - rx * 0.6, y - ry * 0.45, rx * 1.2, ry * 0.9, rx * 0.3); g.fill(); g.shadowBlur = 0;
    return;
  }
  if (style === "spirales") {
    g.fillStyle = "#fbf7ff"; ell(g, x, y, rx, ry); g.fill();
    g.strokeStyle = INK; g.lineWidth = rx * 0.16; g.lineCap = "round"; g.beginPath();
    for (let a = 0; a < TAU * 2.6; a += 0.2) { const k = a / (TAU * 2.6); g.lineTo(x + Math.cos(a * side) * rx * 0.85 * k, y + Math.sin(a * side) * ry * 0.85 * k); }
    g.stroke(); return;
  }
  if (style === "coeurs") { g.fillStyle = "#ff4f8b"; heart(g, x, y + ry * 0.2, rx * 1.05); g.fill(); g.fillStyle = "rgba(255,255,255,0.9)"; ell(g, x - rx * 0.38, y - ry * 0.25, rx * 0.22, ry * 0.16, -0.5); g.fill(); return; }
  // œil rond brillant : fond sombre, reflet coloré en bas, deux éclats blancs
  const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
  gr.addColorStop(0, "#1a1028"); gr.addColorStop(0.55, mix("#1a1028", col, 0.35)); gr.addColorStop(1, mix(col, "#ffffff", 0.15));
  g.fillStyle = gr; ell(g, x, y, rx, ry); g.fill();
  if (style === "felins") { g.fillStyle = "#0b0610"; ell(g, x, y, rx * 0.22, ry * 0.8); g.fill(); }
  if (style === "etoiles") { g.fillStyle = "#ffffff"; star(g, x - rx * 0.25, y - ry * 0.28, rx * 0.5, 4, 0.38); g.fill(); g.beginPath(); g.arc(x + rx * 0.35, y + ry * 0.38, rx * 0.13, 0, TAU); g.fill(); }
  else {
    g.fillStyle = "#ffffff"; ell(g, x - rx * 0.32 * side, y - ry * 0.34, rx * 0.36, ry * 0.3, -0.35 * side); g.fill();
    g.beginPath(); g.arc(x + rx * 0.34 * side, y + ry * 0.36, rx * 0.15, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.arc(x + rx * 0.05 * side, y - ry * 0.62, rx * 0.08, 0, TAU); g.fill();
  }
  if (style === "cils") {
    // trois cils qui partent du bord haut, côté extérieur de l'œil
    g.strokeStyle = INK; g.lineWidth = Math.max(1.5, rx * 0.13); g.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + side * (0.55 + k * 0.32), x0 = x + Math.cos(a) * rx * 0.98, y0 = y + Math.sin(a) * ry * 0.98;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * rx * 0.42 + side * rx * 0.08, y0 + Math.sin(a) * ry * 0.3 - ry * 0.06); g.stroke();
    }
  }
}
/** Paupière : couvre le haut de l'œil (endormi, en colère). */
function lid(g, x, y, rx, ry, k, ang, color) {
  g.save(); ell(g, x, y, rx * 1.04, ry * 1.04); g.clip();
  g.fillStyle = color; g.beginPath(); g.moveTo(x - rx * 1.3, y - ry * 1.3); g.lineTo(x + rx * 1.3, y - ry * 1.3);
  g.lineTo(x + rx * 1.3, y - ry + ry * 2 * k + ang * rx); g.lineTo(x - rx * 1.3, y - ry + ry * 2 * k - ang * rx); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = rx * 0.14; g.beginPath(); g.moveTo(x - rx * 1.3, y - ry + ry * 2 * k - ang * rx); g.lineTo(x + rx * 1.3, y - ry + ry * 2 * k + ang * rx); g.stroke();
  g.restore();
}
/** Arc fermé : « ^ » (joyeux, up = 1) ou « ‿ » (cligne, up = -1). */
function arcEye(g, x, y, rx, ry, up, lw) {
  g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = "round"; g.beginPath();
  if (up > 0) { g.moveTo(x - rx * 0.85, y + ry * 0.25); g.quadraticCurveTo(x, y - ry * 0.85, x + rx * 0.85, y + ry * 0.25); }
  else { g.moveTo(x - rx * 0.85, y - ry * 0.05); g.quadraticCurveTo(x, y + ry * 0.55, x + rx * 0.85, y - ry * 0.05); }
  g.stroke();
}

/**
 * Peint le visage (fond transparent) pour une expression : n (normal), blink, happy, sad, angry, wow, dizzy, love, wink.
 * F : { W, H, px(fx, fy) → [x, y], sx(fx, fy), sy, eye: { ex, rx, ry }, mouthY, mouthW, blush: { x, y, r }, noseY, style }
 */
export function paintFace(g, F, expr) {
  const S = F.style, sy = F.sy;
  g.clearRect(0, 0, F.W, F.H);
  const P = (fx, fy) => F.px(fx, fy), sxAt = (fx, fy) => F.sx(fx, fy);
  const E = F.eye, lw = Math.max(2, E.ry * sy * 0.17);
  // museau clair (ours, chiot)
  if (S.snout) { const [x, y] = P(0, F.snoutY); g.fillStyle = S.snoutC; ell(g, x, y, F.snoutR * sxAt(0, F.snoutY), F.snoutR * 0.72 * sy); g.fill(); }
  // contours d'yeux du hibou
  if (S.eyeRings) for (const s of [-1, 1]) { const [x, y] = P(s * E.ex, 0); g.fillStyle = S.ringC; ell(g, x, y, E.rx * 1.55 * sxAt(s * E.ex, 0), E.ry * 1.4 * sy); g.fill(); }
  // masque de héros (lunettes « masque ») : sous les yeux
  if (S.mask) {
    g.fillStyle = S.maskC; const [x0, y0] = P(-E.ex * 1.75, 0.02), [x1] = P(E.ex * 1.75, 0.02), h = E.ry * 1.25 * sy;
    g.beginPath(); g.moveTo(x0, y0 - h * 0.3); g.quadraticCurveTo((x0 + x1) / 2, y0 - h * 1.25, x1, y0 - h * 0.3); g.quadraticCurveTo(x1 + h * 0.2, y0 + h * 0.9, (x0 + x1) / 2 + h * 0.4, y0 + h * 0.55);
    g.quadraticCurveTo((x0 + x1) / 2, y0 + h * 0.2, (x0 + x1) / 2 - h * 0.4, y0 + h * 0.55); g.quadraticCurveTo(x0 - h * 0.2, y0 + h * 0.9, x0, y0 - h * 0.3); g.fill();
  }
  // joues
  if (S.blush) for (const s of [-1, 1]) {
    const [x, y] = P(s * F.blush.x, F.blush.y), r = F.blush.r * sxAt(s * F.blush.x, F.blush.y);
    if (S.blushStyle === "traits") { g.strokeStyle = rgba(S.blush, 0.9); g.lineWidth = lw * 0.6; g.lineCap = "round"; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * r * 0.45 - r * 0.15, y + r * 0.25); g.lineTo(x + k * r * 0.45 + r * 0.15, y - r * 0.25); g.stroke(); } }
    else { g.save(); g.translate(x, y); g.scale(1, 0.62); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, rgba(S.blush, 0.95)); gr.addColorStop(0.55, rgba(S.blush, 0.62)); gr.addColorStop(1, rgba(S.blush, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore(); }
  }
  // détails
  const d = S.deco;
  if (d === "rousseur") { g.fillStyle = rgba("#a0583a", 0.55); for (const s of [-1, 1]) for (const [a, b] of [[-0.05, 0.02], [0.05, -0.01], [0.0, -0.06], [0.1, 0.04], [-0.1, -0.04]]) { const [x, y] = P(s * (F.blush.x + a * 0.6), F.blush.y + b * 0.5 + 0.01); g.beginPath(); g.arc(x, y, lw * 0.32, 0, TAU); g.fill(); } }
  if (d === "moustaches") { g.strokeStyle = rgba(INK, 0.7); g.lineWidth = lw * 0.45; g.lineCap = "round"; for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { const [x, y] = P(s * (F.blush.x - 0.02), F.blush.y + k * 0.025); g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * F.blush.r * 1.6 * sxAt(0, 0), y + k * F.blush.r * 0.5 * sy); g.stroke(); } }
  if (d === "grain") { const [x, y] = P(F.blush.x * 0.7, F.blush.y - 0.05); g.fillStyle = INK; g.beginPath(); g.arc(x, y, lw * 0.45, 0, TAU); g.fill(); }
  if (d === "pansement") { const [x, y] = P(-F.blush.x * 1.05, F.blush.y + 0.02); const w = F.blush.r * 1.5 * sxAt(0, 0); g.save(); g.translate(x, y); g.rotate(-0.5); g.fillStyle = "#f3cf9e"; g.beginPath(); g.roundRect(-w / 2, -w * 0.2, w, w * 0.4, w * 0.2); g.fill(); g.fillStyle = "#e6b47c"; g.fillRect(-w * 0.16, -w * 0.2, w * 0.32, w * 0.4); g.restore(); }
  if (d === "etoile") { const [x, y] = P(F.blush.x * 1.1, F.blush.y + 0.04); g.fillStyle = "#ffd24a"; star(g, x, y, F.blush.r * 0.7 * sxAt(0, 0)); g.fill(); }
  if (d === "larme") { const [x, y] = P(E.ex * 1.05, -E.ry * 1.3); g.fillStyle = "#5ab8ff"; g.beginPath(); const r = lw * 1.1; g.moveTo(x, y - r * 2); g.quadraticCurveTo(x + r * 1.3, y, x, y + r); g.quadraticCurveTo(x - r * 1.3, y, x, y - r * 2); g.fill(); }
  if (d === "peinture") { g.strokeStyle = rgba("#e5494f", 0.9); g.lineWidth = lw * 1.1; g.lineCap = "round"; for (const s of [-1, 1]) for (const k of [0, 1]) { const [x, y] = P(s * (F.blush.x + 0.03), F.blush.y + 0.04 - k * 0.06); g.beginPath(); g.moveTo(x - s * F.blush.r * 0.6 * sxAt(0, 0), y); g.lineTo(x + s * F.blush.r * 0.6 * sxAt(0, 0), y); g.stroke(); } }
  if (d === "lunaire") { const [x, y] = P(0, E.ry * 1.75); const r = E.rx * 0.55 * sxAt(0, 0); g.fillStyle = "#ffd86b"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over"; }

  // yeux
  const style = S.eyes;
  for (const s of [-1, 1]) {
    const [x, y] = P(s * E.ex, 0), rx = E.rx * sxAt(s * E.ex, 0), ry = E.ry * sy;
    const closed = expr === "blink" || (expr === "wink" && s > 0);
    if (style === "rieurs" && expr !== "wow" && expr !== "dizzy" && expr !== "love") { arcEye(g, x, y, rx, ry, expr === "sad" ? -1 : 1, lw * 1.05); continue; }
    if (closed) { arcEye(g, x, y, rx, ry, -1, lw * 1.05); continue; }
    if (expr === "happy") { arcEye(g, x, y, rx, ry, 1, lw * 1.15); continue; }
    if (expr === "dizzy") { eye(g, x, y, rx, ry, "spirales", S.eyec, s); continue; }
    if (expr === "love") { eye(g, x, y, rx, ry, "coeurs", S.eyec, s); continue; }
    if (expr === "wow") { g.fillStyle = "#fbf7ff"; ell(g, x, y, rx * 0.95, ry * 0.95); g.fill(); g.strokeStyle = INK; g.lineWidth = lw * 0.7; g.stroke(); g.fillStyle = "#1a1028"; ell(g, x, y + ry * 0.05, rx * 0.4, ry * 0.42); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x - rx * 0.12, y - ry * 0.1, rx * 0.12, 0, TAU); g.fill(); continue; }
    eye(g, x, y, rx, ry, style, S.eyec, s);
    if (style === "endormis") lid(g, x, y, rx, ry, 0.5, 0, S.lidC);
    if (expr === "angry") lid(g, x, y, rx, ry, 0.36, -0.28 * s, S.lidC);
    if (expr === "sad") { lid(g, x, y, rx, ry, 0.22, 0.22 * s, S.lidC); }
  }
  // sourcils d'humeur (colère, tristesse)
  if (expr === "angry" || expr === "sad") {
    g.strokeStyle = INK; g.lineWidth = lw * 0.95; g.lineCap = "round";
    for (const s of [-1, 1]) { const [x, y] = P(s * E.ex, E.ry * 1.25); const w = E.rx * sxAt(s * E.ex, 0) * 0.8, k = expr === "angry" ? 1 : -1; g.beginPath(); g.moveTo(x - w, y - k * s * w * 0.35); g.lineTo(x + w, y + k * s * w * 0.35); g.stroke(); }
  }
  // larmes
  if (expr === "sad") for (const s of [-1, 1]) { const [x, y] = P(s * E.ex * 1.02, -E.ry * 0.95); g.fillStyle = "rgba(110,200,255,0.92)"; const r = E.rx * sxAt(0, 0) * 0.32; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x + r * 1.1, y + r * 0.6, x, y + r * 1.4); g.quadraticCurveTo(x - r * 1.1, y + r * 0.6, x, y - r); g.fill(); }

  // nez
  if (S.nose) {
    const [x, y] = P(0, F.noseY), r = F.noseR * sxAt(0, F.noseY);
    if (S.nose === "dots") { g.fillStyle = rgba(INK, 0.65); for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * 0.9, y, r * 0.35, 0, TAU); g.fill(); } }
    else { g.fillStyle = S.nose === "pink" ? "#ff9db5" : "#3a2632"; g.beginPath(); g.moveTo(x - r, y - r * 0.55); g.quadraticCurveTo(x, y - r * 0.85, x + r, y - r * 0.55); g.quadraticCurveTo(x + r * 0.2, y + r * 0.85, x, y + r * 0.8); g.quadraticCurveTo(x - r * 0.2, y + r * 0.85, x - r, y - r * 0.55); g.fill(); if (S.nose === "dark") { g.fillStyle = "rgba(255,255,255,0.6)"; ell(g, x - r * 0.3, y - r * 0.35, r * 0.28, r * 0.16); g.fill(); } }
  }
  // bouche
  if (!S.beak) {
    const m = expr === "happy" ? "grand" : expr === "wow" ? "o" : expr === "dizzy" ? "zigzag" : expr === "love" ? "sourire" : expr === "sad" ? "triste" : expr === "angry" ? "triste" : expr === "wink" ? "langue" : S.mouth;
    const [x, y] = P(0, F.mouthY), w = F.mouthW * sxAt(0, F.mouthY), h = w * 0.55;
    g.strokeStyle = INK; g.lineWidth = lw * 0.82; g.lineCap = "round"; g.lineJoin = "round";
    const open = (wk, hk, tongue = true) => {
      g.fillStyle = "#5a1f33"; g.beginPath(); g.moveTo(x - w * wk, y - h * 0.15); g.quadraticCurveTo(x, y - h * 0.32, x + w * wk, y - h * 0.15); g.quadraticCurveTo(x + w * wk * 0.8, y + h * hk, x, y + h * hk); g.quadraticCurveTo(x - w * wk * 0.8, y + h * hk, x - w * wk, y - h * 0.15); g.fill();
      if (tongue) { g.save(); g.clip(); g.fillStyle = "#ff7d9a"; ell(g, x, y + h * hk * 0.95, w * wk * 0.6, h * hk * 0.5); g.fill(); g.restore(); }
    };
    if (m === "chat") { g.beginPath(); g.moveTo(x - w * 0.62, y - h * 0.1); g.quadraticCurveTo(x - w * 0.32, y + h * 0.7, x, y); g.quadraticCurveTo(x + w * 0.32, y + h * 0.7, x + w * 0.62, y - h * 0.1); g.stroke(); }
    else if (m === "sourire") { g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.15); g.quadraticCurveTo(x, y + h * 0.75, x + w * 0.5, y - h * 0.15); g.stroke(); }
    else if (m === "grand") open(0.6, 1.25);
    else if (m === "o") { g.fillStyle = "#5a1f33"; ell(g, x, y + h * 0.1, w * 0.2, h * 0.32); g.fill(); }
    else if (m === "langue") { g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.1); g.quadraticCurveTo(x, y + h * 0.6, x + w * 0.5, y - h * 0.1); g.stroke(); g.fillStyle = "#ff7d9a"; g.beginPath(); g.moveTo(x - w * 0.18, y + h * 0.22); g.quadraticCurveTo(x - w * 0.2, y + h * 1.2, x + w * 0.02, y + h * 1.15); g.quadraticCurveTo(x + w * 0.2, y + h * 1.1, x + w * 0.18, y + h * 0.22); g.fill(); g.strokeStyle = rgba("#c23c5e", 0.6); g.lineWidth = lw * 0.4; g.beginPath(); g.moveTo(x, y + h * 0.35); g.lineTo(x, y + h * 0.85); g.stroke(); }
    else if (m === "croc") { g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.15); g.quadraticCurveTo(x, y + h * 0.7, x + w * 0.5, y - h * 0.15); g.stroke(); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(x + w * 0.12, y + h * 0.2); g.lineTo(x + w * 0.3, y + h * 0.12); g.lineTo(x + w * 0.22, y + h * 0.55); g.closePath(); g.fill(); g.lineWidth = lw * 0.3; g.stroke(); }
    else if (m === "dents") { g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.1); g.quadraticCurveTo(x - w * 0.25, y + h * 0.45, x, y); g.quadraticCurveTo(x + w * 0.25, y + h * 0.45, x + w * 0.5, y - h * 0.1); g.stroke(); g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(x - w * 0.16, y + h * 0.05, w * 0.32, h * 0.62, w * 0.05); g.fill(); g.lineWidth = lw * 0.4; g.stroke(); g.beginPath(); g.moveTo(x, y + h * 0.08); g.lineTo(x, y + h * 0.62); g.stroke(); }
    else if (m === "neutre") { g.beginPath(); g.moveTo(x - w * 0.28, y + h * 0.1); g.lineTo(x + w * 0.28, y + h * 0.1); g.stroke(); }
    else if (m === "bisou") { g.lineWidth = lw * 0.75; g.beginPath(); g.moveTo(x - w * 0.08, y - h * 0.35); g.quadraticCurveTo(x + w * 0.28, y - h * 0.1, x - w * 0.02, y + h * 0.15); g.quadraticCurveTo(x + w * 0.3, y + h * 0.4, x - w * 0.08, y + h * 0.65); g.stroke(); }
    else if (m === "zigzag") { g.beginPath(); for (let k = 0; k <= 6; k++) g.lineTo(x - w * 0.42 + k * w * 0.14, y + h * 0.15 + (k % 2 ? -h * 0.25 : h * 0.15)); g.stroke(); }
    else if (m === "triste") { g.beginPath(); g.moveTo(x - w * 0.4, y + h * 0.45); g.quadraticCurveTo(x, y - h * 0.25, x + w * 0.4, y + h * 0.45); g.stroke(); }
  }
}

/* ================================ TISSUS ================================ */
/**
 * Texture d'une tenue (bande qui fait le tour du corps). T = { W, H, X(φ) → x (avant au milieu), Y(t) → y, t0, t1 }.
 * c1 = couleur principale, c2 = détails. Renvoie éventuellement un canvas de lueur (combinaison numérique).
 */
export function paintOutfit(g, T, id, c1, c2) {
  const { W, H, X, Y } = T, R = rng(31);
  g.fillStyle = c1; g.fillRect(0, 0, W, H);
  const shade = lum(c1) > 0.55 ? "rgba(40,20,60,0.18)" : "rgba(255,255,255,0.14)";
  const line = (x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const band = (ta, tb, col) => { g.fillStyle = col; g.fillRect(0, Math.min(Y(ta), Y(tb)), W, Math.abs(Y(ta) - Y(tb))); };
  const vneck = (depth, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(X(-0.55), 0); g.lineTo(X(0), H * depth); g.lineTo(X(0.55), 0); g.closePath(); g.fill(); };
  let glow = null;
  switch (id) {
    case "tshirt": band(T.t1, T.t1 - 0.025, shade); g.fillStyle = c2; star(g, X(0), H * 0.42, H * 0.16); g.fill(); break;
    case "sweat":
      band(T.t0 + 0.04, T.t0, shade); g.fillStyle = shade; g.beginPath(); g.roundRect(X(-0.55), H * 0.48, X(0.55) - X(-0.55), H * 0.3, 12); g.fill();
      line(X(-0.12), 0, X(-0.14), H * 0.3, c2, 3); line(X(0.12), 0, X(0.14), H * 0.3, c2, 3);
      g.fillStyle = shade; g.beginPath(); g.ellipse(X(Math.PI * 0.999), 0, 70, H * 0.28, 0, 0, TAU); g.ellipse(X(-Math.PI * 0.999), 0, 70, H * 0.28, 0, 0, TAU); g.fill(); break;
    case "salopette":
      g.fillStyle = c2; g.fillRect(0, H * 0.52, W, H * 0.48);
      g.beginPath(); g.roundRect(X(-0.5), H * 0.12, X(0.5) - X(-0.5), H * 0.5, 10); g.fill();
      for (const s of [-1, 1]) { line(X(s * 0.42), H * 0.18, X(s * 1.6), 0, c2, 14); g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(X(s * 0.38), H * 0.2, 6, 0, TAU); g.fill(); }
      g.fillStyle = c1; g.fillRect(0, 0, W, H * 0.06); g.fillStyle = shade; g.beginPath(); g.roundRect(X(-0.28), H * 0.3, X(0.28) - X(-0.28), H * 0.16, 6); g.fill(); break;
    case "mariniere": for (let k = 0; k < 9; k++) band(T.t0 + (k + 0.5) * (T.t1 - T.t0) / 9.5, T.t0 + (k + 0.95) * (T.t1 - T.t0) / 9.5, c2); break;
    case "robe": band(T.t0 + 0.035, T.t0, c2); for (let x = 0; x < W; x += 18) { g.fillStyle = c2; g.beginPath(); g.arc(x, Y(T.t0 + 0.035), 7, 0, Math.PI); g.fill(); } g.fillStyle = c2; heart(g, X(0), H * 0.25, 9); g.fill(); break;
    case "pyjama": for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H; g.fillStyle = c2; star(g, x, y, 5, 4, 0.4); g.fill(); } band(T.t1, T.t1 - 0.03, shade); break;
    case "explorateur": band(T.t0 + 0.12, T.t0 + 0.09, "#6b4a2a"); g.fillStyle = "#c9a14a"; g.fillRect(X(-0.07), Y(T.t0 + 0.12), X(0.07) - X(-0.07), Y(T.t0 + 0.09) - Y(T.t0 + 0.12)); for (const s of [-1, 1]) { g.fillStyle = shade; g.beginPath(); g.roundRect(X(s * 0.42) - 26, H * 0.18, 52, H * 0.22, 6); g.fill(); line(X(s * 0.42) - 26, H * 0.22, X(s * 0.42) + 26, H * 0.22, c2, 2); } break;
    case "uniforme": vneck(0.42, "#f7f4ee"); vneck(0.3, c1); g.fillStyle = c2; g.beginPath(); g.moveTo(X(-0.12), H * 0.3); g.lineTo(X(0.12), H * 0.3); g.lineTo(X(0), H * 0.48); g.closePath(); g.fill(); g.fillStyle = "#f7f4ee"; g.fillRect(X(Math.PI * 0.75), 0, X(Math.PI) - X(Math.PI * 0.75), H * 0.3); g.fillRect(X(-Math.PI), 0, X(-Math.PI * 0.75) - X(-Math.PI), H * 0.3); line(0, H * 0.27, W, H * 0.27, c2, 3); break;
    case "smoking": g.fillStyle = "#f7f4ee"; g.beginPath(); g.moveTo(X(-0.4), 0); g.lineTo(X(0), H * 0.85); g.lineTo(X(0.4), 0); g.closePath(); g.fill(); for (let k = 0; k < 3; k++) { g.fillStyle = "#2d2b36"; g.beginPath(); g.arc(X(0), H * (0.3 + k * 0.17), 4, 0, TAU); g.fill(); } g.fillStyle = c2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0), H * 0.08); g.lineTo(X(s * 0.16), H * 0.0); g.lineTo(X(s * 0.16), H * 0.17); g.closePath(); g.fill(); } break;
    case "ninja": band(T.t0 + 0.13, T.t0 + 0.09, c2); vneck(0.35, shade); g.fillStyle = c2; g.beginPath(); g.moveTo(X(0.35), Y(T.t0 + 0.11)); g.lineTo(X(0.55), Y(T.t0 + 0.02)); g.lineTo(X(0.48), Y(T.t0 + 0.11)); g.closePath(); g.fill(); break;
    case "mage": g.fillStyle = c2; for (let i = 0; i < 14; i++) { const x = R() * W, y = H * (0.15 + R() * 0.8); if (i % 3) { star(g, x, y, 6, 5, 0.42); g.fill(); } else { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(x + 3, y - 2, 5.5, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over"; } } band(T.t0 + 0.03, T.t0, c2); line(0, H * 0.3, W, H * 0.3, c2, 5); break;
    case "elfe": band(T.t0 + 0.14, T.t0 + 0.1, "#6b4a2a"); vneck(0.32, c2); g.fillStyle = shade; for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 15, H - 22); g.lineTo(x + 30, H); g.fill(); } g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(X(0), Y(T.t0 + 0.12), 7, 0, TAU); g.fill(); break;
    case "numerique": {
      g.fillStyle = "#121a33"; g.fillRect(0, 0, W, H);
      glow = document.createElement("canvas"); glow.width = W; glow.height = H; const e = glow.getContext("2d"); e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
      const draw = (gg) => { gg.strokeStyle = c1; gg.fillStyle = c1; gg.lineWidth = 3; gg.lineCap = "round"; for (const s of [-1, 1]) { gg.beginPath(); gg.moveTo(X(s * 0.22), 0); gg.lineTo(X(s * 0.22), H * 0.45); gg.lineTo(X(s * 0.55), H * 0.7); gg.lineTo(X(s * 0.55), H); gg.stroke(); } gg.beginPath(); gg.moveTo(0, H * 0.62); gg.lineTo(W, H * 0.62); gg.stroke(); gg.beginPath(); gg.arc(X(0), H * 0.32, 12, 0, TAU); gg.stroke(); gg.beginPath(); gg.arc(X(0), H * 0.32, 4, 0, TAU); gg.fill(); };
      draw(g); draw(e); break;
    }
    case "gothique": vneck(0.18, "#f7f4ee"); g.fillStyle = "#f7f4ee"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(s * 0.55), 0); g.quadraticCurveTo(X(s * 0.5), H * 0.2, X(s * 0.05), H * 0.16); g.closePath(); g.fill(); } for (let k = 0; k < 4; k++) { g.fillStyle = c2; g.beginPath(); g.arc(X(0), H * (0.3 + k * 0.13), 4, 0, TAU); g.fill(); } band(T.t0 + 0.03, T.t0, c2); break;
    case "pilote": g.fillStyle = "#e9dcc4"; g.fillRect(0, 0, W, H * 0.12); for (let x = 0; x < W; x += 9) { g.fillStyle = "rgba(160,130,90,0.35)"; g.fillRect(x, 0, 3, H * 0.12); } line(X(0), H * 0.12, X(0), H, shade, 4); for (const s of [-1, 1]) { g.fillStyle = shade; g.beginPath(); g.roundRect(X(s * 0.45) - 22, H * 0.38, 44, H * 0.16, 6); g.fill(); } g.fillStyle = c2; star(g, X(0.5), H * 0.25, 9); g.fill(); break;
    case "kimono": g.fillStyle = c2; g.beginPath(); g.moveTo(X(-0.5), 0); g.lineTo(X(0.35), H * 0.55); g.lineTo(X(0.5), H * 0.55); g.lineTo(X(-0.35), 0); g.closePath(); g.fill(); band(T.t0 + 0.16, T.t0 + 0.1, c2); g.fillStyle = shade; for (let i = 0; i < 10; i++) { const x = R() * W, y = H * (0.6 + R() * 0.35); g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.5, 2, a, 0, TAU); } g.fill(); } break;
    case "armure": {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, mix(c1, "#ffffff", 0.35)); gr.addColorStop(1, mix(c1, "#000000", 0.25)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let k = 1; k < 4; k++) line(0, H * k * 0.25, W, H * k * 0.25, "rgba(0,0,0,0.25)", 2);
      g.fillStyle = c2; g.beginPath(); g.moveTo(X(0), H * 0.18); g.lineTo(X(0.12), H * 0.3); g.lineTo(X(0), H * 0.55); g.lineTo(X(-0.12), H * 0.3); g.closePath(); g.fill();
      for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc((i / 18) * W, H * 0.06, 2.5, 0, TAU); g.fill(); }
      break;
    }
    case "heros": band(T.t0 + 0.1, T.t0 + 0.065, c2); g.fillStyle = c2; g.beginPath(); g.arc(X(0), H * 0.35, H * 0.2, 0, TAU); g.fill(); g.fillStyle = c1; star(g, X(0), H * 0.35, H * 0.14); g.fill(); break;
    case "royal": { const fur = (y0, y1) => { g.fillStyle = "#f7f4ee"; g.fillRect(0, y0, W, y1 - y0); g.fillStyle = "#2d2b36"; for (let x = 6; x < W; x += 22) { g.beginPath(); g.ellipse(x, (y0 + y1) / 2, 2.5, 4.5, 0, 0, TAU); g.fill(); } }; fur(H * 0.86, H); g.fillStyle = "#f7f4ee"; g.fillRect(X(-0.08), 0, X(0.08) - X(-0.08), H); for (let k = 0; k < 4; k++) { g.fillStyle = "#e8b34a"; g.beginPath(); g.arc(X(0.14), H * (0.2 + k * 0.17), 4.5, 0, TAU); g.fill(); } fur(0, H * 0.1); break; }
    default: break;
  }
  return glow;
}
