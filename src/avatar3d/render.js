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
export function lightRig(THREE, scene, renderer, M) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b4d8, 1.05));
  const sun = new THREE.DirectionalLight(0xfff6ea, 2.1);
  sun.position.set(2.5, 4.5, 5);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc9d6ff, 1.1);
  rim.position.set(-4, 2.5, -3);
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
  }
}

/** Cadrage : où regarder et à quelle distance, d'après les dimensions réelles du personnage (chapeaux, ailes… compris). */
export function frameOf(fig, view) {
  const { THREE } = fig.ctx.K;
  fig.group.updateMatrixWorld(true);
  const hc = fig.ctx.headCY * fig.scale, hr = fig.ctx.hr * fig.scale, fov = view === "full" || view === "feet" ? 28 : 26;
  let top, bottom, w;
  if (view === "feet") {
    const b = new THREE.Box3().setFromObject(fig.group);
    top = b.min.y + (b.max.y - b.min.y) * 0.45; bottom = Math.min(0, b.min.y); w = (b.max.x - b.min.x) * 0.9;
  } else if (view === "full") {
    const b = new THREE.Box3().setFromObject(fig.group);
    top = b.max.y; bottom = Math.min(0, b.min.y); w = b.max.x - b.min.x;
  } else {
    const b = new THREE.Box3().setFromObject(fig.ctx.G.head);
    top = Math.max(b.max.y, hc + hr); bottom = hc - hr * (view === "head" ? 1.3 : 1.55); w = Math.max(2 * hr, b.max.x - b.min.x);
  }
  const span = Math.max(top - bottom, w) * 1.1, y = (top + bottom) / 2;
  return { y, d: span / 2 / Math.tan((fov * Math.PI) / 360), fov };
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
      fig.group.rotation.y = yaw;
      scene.add(fig.group);
      const f = frameOf(fig, view);
      renderer.setSize(size, size, false);
      camera.fov = f.fov; camera.aspect = 1; camera.near = 0.1; camera.far = 50; camera.updateProjectionMatrix();
      camera.position.set(f.d * 0.13, f.y + f.d * 0.05, f.d);
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
