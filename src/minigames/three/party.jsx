// Outils des mini-jeux d'arène « à la Pummel Party » : cadre commun, commandes, caméra qui s'adapte à l'écran, effets (éclats, ondes, textes flottants).
import { useState } from "react";
import { Stage3D, TimeBar, makeBean, textSprite, plastic, withOutline, bindKeys, bindStick, botLook, beanColor, BOT_COLORS, gridTexture } from "./kit3d.jsx";
import { Icon } from "../../ui/Icon.jsx";

// palette des mini-jeux (néons de la tablette) : mêmes noms que l'ancienne, teintes accordées au thème
export const COL = { pink: 0xff6aa8, yellow: 0xffc94a, cyan: 0x5ee1ff, purple: 0xb48cff, green: 0x5dff9a, orange: 0xff9a3c, red: 0xff5d73, white: 0xeef7ff, navy: 0x0d1a33, ice: 0xbfeaff, wood: 0x9a7350, stone: 0x5d6788, panel: 0x13233f, dark: 0x0b1426 };
export { BOT_COLORS, botLook, beanColor };

/** Cadre commun : chrono, score, scène 3D, puis les boutons. `chips` = pastilles des joueurs (voir `Chips`). */
export function Shell({ clock, score, rd, setup, label, onFail, pads, chips, padsClass = "" }) {
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{score}</div>
      {chips}
      <Stage3D onReady={rd.onReady} setup={setup} label={label} onFail={onFail} />
      {pads && <div className={"mgpads " + padsClass}>{pads}</div>}
    </div>
  );
}
/** Rangée de pastilles « qui est encore en jeu » : items = [{ key, color, text, on, dead }]. */
export function Chips({ items }) {
  return (
    <div className="mgchips" aria-hidden="true">
      {items.map((c) => <span key={c.key} className={"mgchip" + (c.dead ? " dead" : "") + (c.on ? " on" : "") + (c.me ? " me" : "")} style={{ "--c": c.color }}>{c.icon ? <Icon name={c.icon} size={13} /> : null}{c.text}</span>)}
    </div>
  );
}
/** Petit état React mis à jour seulement quand la valeur change (pour les pastilles). */
export function useSig(initial) {
  const [v, setV] = useState(initial);
  return [v, (n) => setV((o) => (JSON.stringify(o) === JSON.stringify(n) ? o : n))];
}

/**
 * Commandes d'un jeu d'arène : joystick flottant n'importe où dans la zone + clavier (tests, ordinateur).
 * `read()` donne { x, y, act, act2 } ; `act` / `act2` sont maintenus tant que le bouton est tenu (ou jusqu'à `pulse`).
 */
export function makeInput(el, { stick = true, onTap } = {}) {
  const vec = { x: 0, y: 0 }, keys = {}, held = { act: false, act2: false, left: false, right: false }, pulses = { act: 0, act2: 0 };
  const offKeys = bindKeys(keys);
  const k2 = (v) => (e) => { if (e.key === "x" || e.key === "Shift" || e.key === "e") { held.act2 = v; if (v) pulses.act2 = 0.12; } };
  const d2 = k2(true), u2 = k2(false);
  window.addEventListener("keydown", d2); window.addEventListener("keyup", u2);
  const offStick = stick ? bindStick(el, vec, { onTap }) : () => {};
  return {
    vec, keys,
    read() {
      const x = vec.x || (keys.right || held.right ? 1 : 0) - (keys.left || held.left ? 1 : 0), y = vec.y || (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      return { x, y, act: held.act || keys.act || pulses.act > 0, act2: held.act2 || pulses.act2 > 0 };
    },
    tick(dt) { pulses.act = Math.max(0, pulses.act - dt); pulses.act2 = Math.max(0, pulses.act2 - dt); },
    set(name, v) { held[name] = v; if (v && name in pulses) pulses[name] = 0.12; },
    pulse(name) { if (name in pulses) pulses[name] = 0.12; },
    dispose() { offKeys(); offStick(); window.removeEventListener("keydown", d2); window.removeEventListener("keyup", u2); },
  };
}

/**
 * Place la caméra pour voir une zone de demi-largeur `hw` et demi-profondeur `hd` autour de (cx, cz), quel que soit le format de l'écran.
 * `tilt` = inclinaison par rapport à la verticale (0 = vue de dessus).
 */
export function fitCamera(camera, size, { hw, hd, cx = 0, cz = 0, tilt = 0.5, pad = 1.06 } = {}) {
  const tv = Math.tan((camera.fov * Math.PI) / 360), th = tv * (size.w / size.h);
  const d = Math.max(hw / th, (hd * Math.cos(tilt)) / tv) * pad + hd * 0.25;
  camera.position.set(cx, d * Math.cos(tilt), cz + d * Math.sin(tilt));
  camera.lookAt(cx, 0, cz);
}

/** Haricot de jeu : le vrai personnage (ou un haricot de bot costumé), mis à l'échelle et ajouté à la scène. */
export function mkActor(THREE, scene, { color, look, scale = 1.3 }) {
  const b = makeBean(THREE, color, look);
  b.group.scale.setScalar(scale);
  scene.add(b.group);
  return b;
}
/** Les 4 apparences d'une partie : le joueur, puis 3 bots (toujours les mêmes, avec costumes). */
export function cast(color, look) {
  return [{ color: color || beanColor(), look, bot: false }, ...[0, 1, 2].map((i) => ({ color: BOT_COLORS[[0, 1, 3][i]], look: botLook(i), bot: true }))];
}

/* ------------------------------ effets ------------------------------ */
/** Éclats, ondes de choc et textes flottants. `fx.update(dt)` à chaque image, `fx.dispose()` à la fin. */
export function makeFx(THREE, scene) {
  const bits = [], rings = [], pops = [];
  const cube = new THREE.BoxGeometry(0.16, 0.16, 0.16), ringGeo = new THREE.RingGeometry(0.85, 1, 40);
  const basic = new Map();
  const mat = (c) => { if (!basic.has(c)) basic.set(c, new THREE.MeshBasicMaterial({ color: c })); return basic.get(c); };
  return {
    /** Gerbe d'éclats colorés. */
    burst(x, y, z, colors, n = 14, speed = 5, grav = 14) {
      const cs = Array.isArray(colors) ? colors : [colors];
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(cube, mat(cs[i % cs.length]));
        const a = Math.random() * 6.283, up = 0.4 + Math.random() * 0.9, sp = speed * (0.4 + Math.random() * 0.8);
        m.position.set(x, y, z); m.scale.setScalar(0.6 + Math.random() * 1.1);
        scene.add(m);
        bits.push({ m, vx: Math.cos(a) * sp, vy: up * speed * 0.9, vz: Math.sin(a) * sp, life: 0.7 + Math.random() * 0.5, grav, spin: (Math.random() - 0.5) * 12 });
      }
    },
    /** Onde de choc à plat sur le sol. */
    ring(x, z, color = 0xffffff, r0 = 0.4, r1 = 3, dur = 0.45, y = 0.08) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(r0);
      scene.add(m);
      rings.push({ m, r0, r1, dur, t: 0 });
    },
    /** Texte qui monte et s'efface (« +100 », « TOUCHÉ ! »). */
    pop(text, x, y, z, color = "#ffffff", scale = 1) {
      const sp = textSprite(THREE, text, { color });
      sp.position.set(x, y, z); sp.scale.multiplyScalar(scale); sp.renderOrder = 10;
      sp.material.depthTest = false;
      scene.add(sp);
      const rec = { sp, t: 0, y0: y };
      pops.push(rec);
      return rec;
    },
    update(dt) {
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life -= dt; b.vy -= b.grav * dt;
        b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
        b.m.rotation.x += b.spin * dt; b.m.rotation.z += b.spin * dt;
        if (b.m.position.y < 0.05) { b.m.position.y = 0.05; b.vy *= -0.3; b.vx *= 0.7; b.vz *= 0.7; }
        if (b.life <= 0) { scene.remove(b.m); bits.splice(i, 1); } else if (b.life < 0.25) b.m.scale.setScalar(Math.max(0.01, b.life * 4) * 0.8);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k)));
        r.m.material.opacity = 0.9 * (1 - k);
        if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); }
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt;
        p.sp.position.y = p.y0 + p.t * 1.6;
        p.sp.material.opacity = Math.min(1, (1 - p.t / 1.1) * 2.2);
        if (p.t >= 1.1) { scene.remove(p.sp); p.sp.material.map.dispose(); p.sp.material.dispose(); pops.splice(i, 1); }
      }
    },
    dispose() {
      for (const b of bits) scene.remove(b.m);
      for (const r of rings) { scene.remove(r.m); r.m.material.dispose(); }
      for (const p of pops) { scene.remove(p.sp); p.sp.material.map.dispose(); p.sp.material.dispose(); }
      bits.length = rings.length = pops.length = 0;
      cube.dispose(); ringGeo.dispose(); basic.forEach((m) => m.dispose());
    },
  };
}
/** Tremblement de caméra : `shake.add(0.4)` puis `shake.apply(camera, dt)` après avoir placé la caméra. */
export function makeShake() {
  let a = 0;
  return {
    add(v) { a = Math.min(1.2, a + v); },
    apply(camera, dt) { if (a > 0.005) { camera.position.x += (Math.random() - 0.5) * a * 0.7; camera.position.y += (Math.random() - 0.5) * a * 0.5; a *= Math.exp(-7 * dt); } },
  };
}
/** Plateau rond « bonbon » : disque épais, anneaux de couleur, liseré. Renvoie le groupe (échelle libre). */
export function discArena(THREE, { R = 6.2, color = COL.pink, ring = COL.yellow, stripes = [], bright = false } = {}) {
  const g = new THREE.Group();
  // plateau de données : dessus sombre teinté de la couleur du jeu, quadrillage lumineux, tranche métallique à liseré
  const tint = new THREE.Color(color), top = bright ? tint : new THREE.Color(COL.panel).lerp(tint, 0.22);
  const side = plastic(THREE, 0x0d1a33, { rough: 0.35 });
  const topMat = new THREE.MeshStandardMaterial({ color: top, roughness: 0.42, metalness: 0.15 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 0.8, 64), [side, topMat, side]);
  plat.position.y = -0.4; g.add(plat);
  const tex = gridTexture(THREE, { line: 2 }).clone(); tex.needsUpdate = true; tex.repeat.set(R * 1.1, R * 1.1); tex.center.set(0.5, 0.5);
  const grid = new THREE.Mesh(new THREE.CircleGeometry(R - 0.12, 64), new THREE.MeshBasicMaterial({ color: ring, map: tex, transparent: true, opacity: bright ? 0.25 : 0.32, depthWrite: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.006; g.add(grid);
  for (const [r0, r1, c] of stripes) {
    const st = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false }));
    st.rotation.x = -Math.PI / 2; st.position.y = 0.012; g.add(st);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.08, 8, 96), new THREE.MeshBasicMaterial({ color: ring }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.02; g.add(rim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.985, R * 0.975, 0.08, 64, 1, true), new THREE.MeshBasicMaterial({ color: ring, transparent: true, opacity: 0.85 }));
  band.position.y = -0.32; g.add(band);
  return g;
}
/** Mer de données loin sous l'arène (quadrillage du secteur) : l'arène flotte au-dessus du vide. */
export function abyss(THREE, scene, color, y = -6) {
  const Z = scene.userData.sector || { accent: 0x5ee1ff, ground: 0x0b1426 };
  const W = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshBasicMaterial({ color: Z.ground }));
  base.rotation.x = -Math.PI / 2; W.add(base);
  const tex = gridTexture(THREE).clone(); tex.needsUpdate = true; tex.repeat.set(80, 80);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshBasicMaterial({ color: Z.accent, map: tex, transparent: true, opacity: 0.4, depthWrite: false }));
  lines.rotation.x = -Math.PI / 2; lines.position.y = 0.02; W.add(lines);
  W.position.y = y; scene.add(W);
  return W;
}
