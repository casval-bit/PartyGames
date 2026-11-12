// Chargement de three.js à la demande + rendu des miniatures (une image PNG par apparence, mise en cache).
import { cleanX } from "./schema.js";

let kitP = null;
/** three.js + les 2 utilitaires de géométrie, téléchargés au premier avatar affiché. */
export const loadKit = () => (kitP ||= Promise.all([
  import("three"),
  import("three/examples/jsm/utils/BufferGeometryUtils.js"),
  import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
  import("three/examples/jsm/environments/RoomEnvironment.js"),
  import("./build.js"),
]).then(([THREE, bg, rb, re, b]) => ({ THREE, mergeGeometries: bg.mergeGeometries, RoundedBoxGeometry: rb.RoundedBoxGeometry, RoomEnvironment: re.RoomEnvironment, makeFigure: b.makeFigure })));

/** Lumières communes : ciel doux + soleil + contre-jour, et un petit décor de studio pour les reflets du plastique (calculé une seule fois par rendu). */
const envs = new WeakMap();
export function lightRig(THREE, scene, renderer, M, o = {}) {
  scene.add(new THREE.HemisphereLight(0xf2f4ff, 0x3a4660, 0.72));
  const sun = new THREE.DirectionalLight(0xfff3e6, 1.45);
  sun.position.set(2.2, 4.2, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.3);
  fill.position.set(-3.5, 1.5, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(o.rim ?? 0x8fdcff, o.rimK ?? 1.2);
  rim.position.set(-2.5, 3, -4);
  scene.add(rim);
  if (renderer && M && M.RoomEnvironment) {
    let tex = envs.get(renderer);
    if (!tex) {
      const pm = new THREE.PMREMGenerator(renderer);
      tex = pm.fromScene(new M.RoomEnvironment(), 0.04).texture;
      pm.dispose();
      envs.set(renderer, tex);
    }
    scene.environment = tex;
    scene.environmentIntensity = o.env ?? 0.4;     // reflets d'ambiance discrets : les couleurs restent franches
  }
}

/** Cadrage : où regarder et à quelle distance. view : "full" (en pied), "bust" (portrait), "head", "face", "torso", "legs", "feet", "back" (de dos). */
export function frameOf(fig, view) {
  const { THREE } = fig.ctx.K;
  const fov = 26, dist = (span) => (span / 2) / Math.tan((fov * Math.PI) / 360);
  const D = fig.dims || { H: 1.2, Rx: 0.6, top: 1.5, faceY: 0.85 };
  const at = (y, span) => ({ y, d: dist(span), fov });
  switch (view) {
    case "head": return at((D.faceY + D.top) / 2 - 0.03, Math.max(0.3, D.top - D.faceY) * 1.9 + D.Rx * 0.55);
    case "face": return at(D.faceY - D.Rx * 0.1, D.Rx * 2.05);
    case "bust": return at(D.top * 0.53, Math.max(D.top, D.Rx * 2.1) * 1.08);
    case "torso": return at(D.H * 0.42, D.H * 1.12);
    case "legs": case "feet": return at(0.13, D.Rx * 1.8);
    default: {
      fig.group.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(fig.core || fig.group);
      const top = Math.max(b.max.y, D.top), bottom = Math.min(0, b.min.y), w = b.max.x - b.min.x;
      const span = Math.max(top - bottom, w) * 1.08;
      return { y: (top + bottom) / 2, d: dist(span), fov };
    }
  }
}

let R = null, failed = false;
const cache = new Map(), subs = new Map();
let chain = Promise.resolve();

export const avatarsAvailable = () => !failed;

async function shared() {
  if (R) return R;
  const M = await loadKit();
  const { THREE } = M;
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  lightRig(THREE, scene, renderer, M);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  R = { M, THREE, renderer, scene, camera, canvas };
  return R;
}

/** PNG (data URL) de l'avatar `x`. view : "bust" | "head" | "full". size : pixels (carré). */
export function avatarImage(x, view = "bust", size = 192, yaw = 0) {
  const cx = cleanX(x), key = cx + "|" + view + "|" + size + (yaw ? "|" + yaw : "");
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (failed) return Promise.resolve(null);
  const p = chain.then(async () => {
    if (cache.has(key)) return cache.get(key);
    try {
      const S = await shared();
      const { THREE, renderer, scene, camera } = S;
      const fig = S.M.makeFigure(S.M, cx, { shadow: false });
      fig.anim({ t: 0.4 });
      fig.group.rotation.y = yaw + (view === "back" ? Math.PI * 0.82 : 0);
      scene.add(fig.group);
      const f = frameOf(fig, view);
      renderer.setSize(size, size, false);
      camera.fov = f.fov; camera.aspect = 1; camera.near = 0.1; camera.far = 50; camera.updateProjectionMatrix();
      camera.position.set(f.d * 0.1, f.y + f.d * 0.03, f.d);
      camera.lookAt(0, f.y, 0);
      renderer.render(scene, camera);
      const url = S.canvas.toDataURL("image/png");
      scene.remove(fig.group); fig.dispose();
      cache.set(key, url);
      if (cache.size > 400) cache.delete(cache.keys().next().value);
      return url;
    } catch (e) {
      console.error("avatar3d", e);
      failed = true;
      return null;
    }
  });
  chain = p.catch(() => null);
  return p;
}

export const cachedImage = (x, view = "bust", size = 192, yaw = 0) => cache.get(cleanX(x) + "|" + view + "|" + size + (yaw ? "|" + yaw : "")) || null;
