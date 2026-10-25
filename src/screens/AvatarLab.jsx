import { useEffect, useMemo, useRef } from "react";
import { loadKit, lightRig } from "../avatar3d/render.js";
import { Avatar3DImg, AvatarLive } from "../avatar3d/Avatar3D.jsx";
import { randomX, DEFAULT_X, cleanX, SLOT_BY, setSlot } from "../avatar3d/schema.js";

/** Empreinte du squelette d'un personnage (tout ce qui ne doit JAMAIS changer d'un costume à l'autre : taille, corps, jambes, bras). */
function skeleton(f) {
  const r = (v) => Math.round(v * 1e4) / 1e4, v3 = (o) => [r(o.position.x), r(o.position.y), r(o.position.z)];
  let body = null; f.torso.traverse((m) => { if (!body && m.isMesh && m.material && m.material.map) body = m; });
  body.geometry.computeBoundingBox(); const bb = body.geometry.boundingBox;
  return JSON.stringify({ height: r(f.height), scale: r(f.scale), torso: [r(f.torso.scale.x), r(f.torso.scale.y), r(f.torso.scale.z), r(f.torso.position.y)], head: v3(f.head),
    legs: f.legs.map(v3), arms: f.arms.map((a) => [v3(a.sh), v3(a.el), v3(a.hand)]), bodyBox: [bb.min, bb.max].map((p) => [r(p.x), r(p.y), r(p.z)]) });
}

/** Tous les costumes sur le même corps, alignés sur le même sol, à la même échelle (adresse « ?avlab&lineup=1 », ?pose=… ?yaw=…). */
function Lineup({ x, yaw, pose }) {
  const ref = useRef(null);
  useEffect(() => {
    let dead = false; const rends = [];
    (async () => {
      const M = await loadKit(); if (dead) return;
      const { THREE } = M, el = ref.current, W = 1800, H = 600;
      const all = SLOT_BY.suit.opts.map((o, i) => ({ o: { ...o, name: i ? o.name : "Sans costume" }, f: M.makeFigure(M, setSlot(x, "suit", i), { shadow: true }) }));
      window.__skeletons = all.map((it) => ({ name: it.o.name, sig: skeleton(it.f) }));
      for (const row of [all.slice(0, 8), all.slice(8, 16), all.slice(16)]) {
        const wrap = document.createElement("div"); wrap.style.cssText = `position:relative;width:${W}px;height:${H}px`; el.appendChild(wrap);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(1); renderer.setSize(W, H); wrap.appendChild(renderer.domElement); rends.push(renderer);
        const scene = new THREE.Scene(); lightRig(THREE, scene, renderer, M);
        let cx = 0; const names = [];
        for (const it of row) {
          const f = it.f; f.anim({ t: 0, pose }); f.group.rotation.y = yaw; f.group.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(f.group), w = b.max.x - b.min.x;
          f.group.position.x = cx + w / 2 - (b.min.x + b.max.x) / 2; scene.add(f.group);
          names.push({ name: it.o.name, x: cx + w / 2 }); cx += w + 0.25;
        }
        const total = cx - 0.25;
        for (const y of [1, 2]) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.4, y, -1), new THREE.Vector3(total + 0.4, y, -1)]); scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }))); }
        const fov = 14, aspect = W / H, cam = new THREE.PerspectiveCamera(fov, aspect, 1, 200), t = Math.tan((fov * Math.PI) / 360);
        const d = Math.max(1.5 / t, (total / 2 + 0.2) / aspect / t);
        cam.position.set(total / 2, 1.2, d); cam.lookAt(total / 2, 1.2, 0); cam.updateMatrixWorld();
        renderer.render(scene, cam);
        for (const n of names) {
          const v = new THREE.Vector3(n.x, 0, 0).project(cam), sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H, div = document.createElement("div");
          div.textContent = n.name; div.style.cssText = `position:absolute;left:${sx}px;top:${sy + 10}px;transform:translateX(-50%);font:800 15px Rubik,sans-serif;white-space:nowrap;color:#fff`;
          wrap.appendChild(div);
        }
      }
      el.dataset.ready = "1";
    })();
    return () => { dead = true; for (const r of rends) { r.dispose(); r.domElement.remove(); } };
  }, []);
  return <div ref={ref} data-testid="lineup" style={{ width: 1800 }} />;
}

/** Salle d'essai de l'avatar 3D (adresse « ?avlab »). ?x=… avatar précis · ?n=… avatars aléatoires · ?view=bust|head|full · ?seed=… · ?sheet=<emplacement> : toutes les options d'un emplacement. */
export default function AvatarLab() {
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const n = +(q.get("n") || 12), seed = +(q.get("seed") || 1), size = +(q.get("size") || 192);
  const x = q.get("x") ? cleanX(q.get("x")) : DEFAULT_X;
  const sheet = q.get("sheet");
  if (q.get("lineup")) return <div style={{ padding: 12, background: "#2a2438", minHeight: "100vh" }}><Lineup x={q.get("x") ? cleanX(q.get("x")) : DEFAULT_X} yaw={+(q.get("yaw") || 0)} pose={q.get("pose") || undefined} /></div>;
  const FACE = new Set(["eyes", "eyec", "brow", "nose", "mouth", "beard", "face", "ears", "crest"]), BUST = new Set(["hair", "hairc", "hat", "hatc", "glasses", "glc", "neck", "neckc"]);
  const view = q.get("view") || (sheet ? (FACE.has(sheet) ? "head" : BUST.has(sheet) ? "bust" : "full") : "bust");
  const list = useMemo(() => {
    if (q.get("xs")) return q.get("xs").split(",").map((v) => { const [xv, yv] = v.split("@"); return { x: cleanX(xv), label: v, yaw: yv === undefined ? undefined : +yv }; });
    if (q.get("x") && !sheet && !q.get("n")) return [{ x, label: x }];
    if (sheet) { const sl = SLOT_BY[sheet]; return sl.opts.map((o, i) => ({ x: setSlot(x, sheet, i), label: o.name })); }
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: n }, () => { const a = randomX(rnd, () => true); return { x: a, label: a }; });
  }, [n, seed, sheet, x]);
  return (
    <div style={{ padding: 12, background: q.get("bg") ? "#" + q.get("bg") : "#2a2438", minHeight: "100vh", color: "#fff" }} data-testid="avlab">
      {!q.get("nolive") && <div style={{ height: 480, position: "relative", marginBottom: 12 }}><AvatarLive x={x} focus={q.get("focus") || "body"} pose={q.get("pose") || undefined} turn={!!q.get("turn")} /></div>}
      <div style={{ display: "grid", gridTemplateColumns: q.get("cols") ? `repeat(${+q.get("cols")},1fr)` : `repeat(auto-fill,minmax(${size * 0.78}px,1fr))`, gap: 6 }}>
        {list.map((a, i) => <div key={i} style={{ background: q.get("cardbg") ? "#" + q.get("cardbg") : "#3a3350", borderRadius: 10 }}><Avatar3DImg x={a.x} view={view} size={size} yaw={a.yaw !== undefined ? a.yaw : +(q.get("yaw") || 0)} />{!q.get("nolabel") && <small style={{ fontSize: 11, opacity: 0.85, wordBreak: "break-all", display: "block", textAlign: "center" }}>{i}. {a.label}</small>}</div>)}
      </div>
    </div>
  );
}
