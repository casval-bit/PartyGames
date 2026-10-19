// Animation des boutons au clic : le bouton fait « gélatine » (écrasé puis rebondi) et quelques étoiles giclent du point touché.
// Une seule écoute globale : tous les boutons de l'appli en profitent sans rien changer aux écrans.
// Désactivée si le téléphone demande moins d'animations (prefers-reduced-motion). `data-nofx` sur un élément (ou un parent) l'exclut.
const TARGET = "button, [role='button'], a[href], summary, .itm";
const COLORS = ["#ffd23f", "#ff5a4d", "#3aa0ff", "#37d67a", "#ffffff", "#ff8fd0"];
const MAX_LIVE = 36;
let layer = null, live = 0, installed = false;

function getLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.className = "fx-layer";
  document.body.appendChild(layer);
  return layer;
}

export function burst(x, y, n = 8) {
  const host = getLayer();
  for (let i = 0; i < n && live < MAX_LIVE; i++) {
    const s = document.createElement("i");
    const size = 10 + Math.random() * 10;
    const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.7;
    const dist = 34 + Math.random() * 34;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 10; // un peu vers le haut
    const rot = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 200);
    s.className = "fx-star";
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${COLORS[(Math.random() * COLORS.length) | 0]}`;
    host.appendChild(s);
    live++;
    const done = () => { s.remove(); live--; };
    if (!s.animate) { done(); continue; }
    const at = (k, o) => `translate(-50%,-50%) translate(${dx * k}px,${dy * k + o}px) scale(${k < 1 ? 1 : 0.2}) rotate(${rot * k}deg)`;
    s.animate(
      [
        { transform: `translate(-50%,-50%) scale(.2)`, opacity: 1 },
        { transform: at(0.7, 0), opacity: 1, offset: 0.55 },
        { transform: at(1, 16), opacity: 0 },
      ],
      { duration: 480 + Math.random() * 180, easing: "cubic-bezier(.2,.8,.3,1)" },
    ).onfinish = done;
  }
}

function pop(el) {
  const r = el.getBoundingClientRect();
  if (r.width * r.height > 0.35 * innerWidth * innerHeight) return; // écran entier cliquable : on ne le déforme pas
  el.classList.remove("fx-pop");
  void el.offsetWidth; // relance l'animation si on reclique vite
  el.classList.add("fx-pop");
  setTimeout(() => el.classList.remove("fx-pop"), 480);
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
    const kb = !e.clientX && !e.clientY; // clic au clavier / lecteur d'écran : on part du centre du bouton
    pop(el);
    burst(kb ? r.left + r.width / 2 : e.clientX, kb ? r.top + r.height / 2 : e.clientY);
  }, true);
}
