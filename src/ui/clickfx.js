// Retour visuel au toucher, façon terminal holographique : une onde cyan part du point touché et quelques « pixels » s'en échappent.
// Une seule écoute globale : tous les boutons de l'appli en profitent sans rien changer aux écrans.
// Désactivée si le téléphone demande moins d'animations (prefers-reduced-motion). `data-nofx` sur un élément (ou un parent) l'exclut.
const TARGET = "button, [role='button'], a[href], summary, .itm";
const MAX_LIVE = 40;
let layer = null, live = 0, installed = false;

function getLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.className = "fx-layer";
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:95";
  document.body.appendChild(layer);
  return layer;
}
const add = (el, ms) => { getLayer().appendChild(el); live++; setTimeout(() => { el.remove(); live--; }, ms); };

/** Onde + pixels au point (x, y). */
export function burst(x, y, n = 6) {
  if (live > MAX_LIVE) return;
  const ring = document.createElement("i");
  ring.className = "fx-ring"; ring.style.left = x + "px"; ring.style.top = y + "px";
  add(ring, 480);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"), a = (Math.PI * 2 * i) / n + Math.random() * 0.6, d = 18 + Math.random() * 22;
    p.className = "fx-px";
    p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    add(p, 520);
  }
}

export function installClickFx() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  document.addEventListener("click", (e) => {
    if (reduce.matches) return;
    const el = e.target && e.target.closest ? e.target.closest(TARGET) : null;
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("[data-nofx]")) return;
    const r = el.getBoundingClientRect();
    const kb = !e.clientX && !e.clientY; // clic au clavier : on part du centre du bouton
    burst(kb ? r.left + r.width / 2 : e.clientX, kb ? r.top + r.height / 2 : e.clientY);
  }, true);
}
