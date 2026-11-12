// Dessine une icône Lucide (trait fin) sur un canvas 2D : sert aux textures 3D (cases du plateau, panneaux) à la place des emoji.
import { iconOf } from "./Icon.jsx";

const cache = {};
/** Les tracés d'une icône (format Lucide : [balise, attributs]…), lus une fois. */
export function iconNode(name) {
  if (cache[name]) return cache[name];
  let node = [];
  try { const C = iconOf(name), el = C.render ? C.render({}, null) : null; node = (el && el.props && el.props.icon && el.props.icon.node) || []; } catch { node = []; }
  return (cache[name] = node);
}
const num = (v, d = 0) => (v == null ? d : Number(v));
/** Peint l'icône `name` centrée en (cx, cy), de taille `size` px. opts : color, stroke (épaisseur Lucide, 24 = taille de référence), glow (px). */
export function paintIcon(g, name, cx, cy, size, { color = "#ffffff", stroke = 1.8, glow = 0 } = {}) {
  const node = iconNode(name);
  if (!node.length || typeof Path2D === "undefined") return false;
  const k = size / 24;
  g.save();
  g.translate(cx - size / 2, cy - size / 2); g.scale(k, k);
  g.lineWidth = stroke; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = color;
  if (glow) { g.shadowColor = color; g.shadowBlur = glow / k; }
  for (const [tag, a] of node) {
    const p = new Path2D();
    if (tag === "path") p.addPath(new Path2D(a.d));
    else if (tag === "circle") p.arc(num(a.cx), num(a.cy), num(a.r), 0, Math.PI * 2);
    else if (tag === "ellipse") p.ellipse(num(a.cx), num(a.cy), num(a.rx), num(a.ry), 0, 0, Math.PI * 2);
    else if (tag === "rect") {
      const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height), r = num(a.rx, num(a.ry));
      if (r && p.roundRect) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h);
    } else if (tag === "line") { p.moveTo(num(a.x1), num(a.y1)); p.lineTo(num(a.x2), num(a.y2)); }
    else if (tag === "polyline" || tag === "polygon") {
      const pts = String(a.points || "").trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < pts.length; i += 2) (i ? p.lineTo(pts[i], pts[i + 1]) : p.moveTo(pts[i], pts[i + 1]));
      if (tag === "polygon") p.closePath();
    } else continue;
    if (a.fill && a.fill !== "none") { g.fillStyle = a.fill === "currentColor" ? color : a.fill; g.fill(p); }
    g.stroke(p);
  }
  g.restore();
  return true;
}
