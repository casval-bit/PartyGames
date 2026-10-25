// Plateau en 3D : une île de nuit, une boucle de 32 cases, et les avatars costumés des joueurs qui sautent de case en case.
// Ce composant ne PREND aucune décision : il lit l'état du jeu (`room.bd`, exactement comme la grille 2D) et l'anime. Le moteur n'a pas changé.
import { useRef, useState } from "react";
import { Stage3D, makeBean, beanColor, textSprite, clamp, wrapPi } from "../minigames/three/kit3d.jsx";
import { cleanX } from "../avatar3d/schema.js";
import { BD_STEP_MS } from "../config.js";
import { buildWorld } from "./world.js";
import { BD_N, slotOffset, pathBetween, extent } from "./layout.js";

const TILE_Y = 0.42;          // hauteur du dessus d'une case
const PAWN_K = 0.95;          // échelle du pion (le personnage fait 1,6 de haut ; une case fait 1,4 de large)
const HOP_H = 0.62;           // hauteur d'un saut
const ease = (k) => k * k * (3 - 2 * k);

/** Couleur d'un joueur (la même que sa pastille 2D : angle d'or). */
const hueOf = (ci = 0) => ((ci * 137.508 + 25) % 360);
const shortName = (s) => { const n = (s || "?").trim(); return n.length > 9 ? n.slice(0, 8) + "…" : n; };

export default function Board3D({ room, center, onFail, onFlat }) {
  const roomRef = useRef(room); roomRef.current = room;
  const [ov, setOv] = useState(false);
  const ctl = useRef({ ov: false }); ctl.current.ov = ov;
  const [ready, setReady] = useState(false);
  const bd = room.bd;

  const setup = ({ THREE, scene, camera, renderer, el, size }) => {
    const wrap = el.parentElement;
    const world = buildWorld(THREE, scene, roomRef.current.bd.spaces);
    const T = world.T, ext = extent(T);
    const own = [];                                              // textures de texte à libérer
    const pawns = new Map(), pops = [];
    const camPos = new THREE.Vector3(0, 24, 22), camLook = new THREE.Vector3(0, 0, 0), dPos = new THREE.Vector3(), dLook = new THREE.Vector3();
    const focus = new THREE.Vector3(T[0].x, TILE_Y, T[0].z);
    let lastGem = roomRef.current.bd.gemAt, sinceDs = 0;
    world.setGem(lastGem, false);
    camera.fov = 48; camera.far = 260; camera.updateProjectionMatrix();

    const tileXZ = (i) => ({ x: T[((i % BD_N) + BD_N) % BD_N].x, z: T[((i % BD_N) + BD_N) % BD_N].z });
    const sprite = (text, o) => { const s = textSprite(THREE, text, o); s.material.depthTest = false; s.renderOrder = 20; own.push(s.material.map); return s; };

    const makePawn = (p, idx, b) => {
      const ax = cleanX(p.look && p.look.x);
      const fig = makeBean(THREE, beanColor(p.look), { x: ax });
      fig.group.scale.setScalar(PAWN_K);
      scene.add(fig.group);
      const col = new THREE.Color().setHSL(hueOf(p.ci) / 360, 0.88, 0.62);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.56, 32), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; scene.add(ring);
      const tag = sprite(shortName(p.name), { size: 52, w: 400, h: 96, color: "#ffffff" });
      tag.scale.set(400 / 96 * 0.38, 0.38, 1); scene.add(tag);
      const at = b.pos[p.id] ?? 0, xz = tileXZ(at);
      return { id: p.id, idx, fig, ring, tag, col, tile: at, last: at, q: [], hop: null, x: xz.x, z: xz.z, y: TILE_Y, face: T[at % BD_N].ang, walk: 0, cheer: 0, land: 0, pend: [], phase: idx * 1.7, name: p.name, prev: { c: b.coins[p.id], g: b.gems[p.id] } };
    };
    const pop = (p, text, color, big) => {
      const s = sprite(text, { size: 70, w: 340, h: 120, color });
      s.scale.set(340 / 120 * (big ? 0.7 : 0.55), big ? 0.7 : 0.55, 1);
      scene.add(s); pops.push({ s, t: 0, p });
    };

    const reconcile = (dt, t) => {
      const R = roomRef.current, b = R.bd;
      if (!b) return;
      // pions : créer ceux qui manquent, retirer ceux qui sont partis
      R.players.forEach((p, i) => { if (!pawns.has(p.id) && b.pos[p.id] != null) pawns.set(p.id, makePawn(p, i, b)); });
      const here = new Set(R.players.map((p) => p.id));
      for (const [id, pw] of pawns) {
        if (here.has(id) && b.pos[id] != null) continue;           // joueur parti : son pion disparaît (comme son jeton en 2D)
        scene.remove(pw.fig.group, pw.ring, pw.tag);
        pw.fig.dispose && pw.fig.dispose(); pw.ring.geometry.dispose(); pw.ring.material.dispose(); pw.tag.material.dispose();
        pawns.delete(id);
      }
      // la gemme
      if (b.gemAt !== lastGem) { lastGem = b.gemAt; world.setGem(lastGem, true); }
      world.setMood(!!b.sprint);

      // cases occupées au repos : les pions qui partagent une case se mettent en cercle
      const occ = {};
      for (const pw of pawns.values()) if (!pw.hop && !pw.q.length) (occ[pw.tile] ||= []).push(pw);

      for (const pw of pawns.values()) {
        const tgt = b.pos[pw.id];
        if (tgt != null && tgt !== pw.last) {                   // le moteur a déplacé le pion : on construit le chemin case par case
          const { steps, jump } = pathBetween(pw.last, tgt, BD_N, 12);
          for (const to of steps) pw.q.push({ to, jump });
          pw.last = tgt;
        }
        const st = b.coins[pw.id], gm = b.gems[pw.id];            // pièces et gemmes gagnées / perdues : petites bulles au-dessus du pion
        if (st !== pw.prev.c) { const d = st - pw.prev.c; if (d) pw.pend.push({ text: (d > 0 ? "+" : "−") + Math.abs(d), color: d > 0 ? "#ffd34a" : "#ff6b7a" }); pw.prev.c = st; }
        if (gm !== pw.prev.g) { const d = gm - pw.prev.g; if (d) { pw.pend.push({ text: (d > 0 ? "+" : "−") + Math.abs(d) + " gemme", color: "#5df2ff", big: true }); if (d > 0) pw.cheer = 1.7; } pw.prev.g = gm; }

        // saut en cours / suivant
        const speed = pw.q.length > 2 ? 0.55 : 1;
        if (!pw.hop && pw.q.length) {
          const n = pw.q.shift(), dest = tileXZ(n.to);
          const dur = n.jump ? 0.85 : Math.max(0.07, Math.min(0.34, (BD_STEP_MS / 1000) * 0.78)) * speed;
          pw.hop = { fx: pw.x, fz: pw.z, tx: dest.x, tz: dest.z, to: n.to, k: 0, dur, h: n.jump ? 3.2 : HOP_H, jump: n.jump };
          pw.walk = 0.35;
        }
        let air = false, run = 0;
        if (pw.hop) {
          const h = pw.hop; h.k = Math.min(1, h.k + dt / h.dur);
          const e = h.jump ? ease(h.k) : h.k;
          pw.x = h.fx + (h.tx - h.fx) * e; pw.z = h.fz + (h.tz - h.fz) * e;
          pw.y = TILE_Y + 4 * h.h * h.k * (1 - h.k);
          const dx = h.tx - h.fx, dz = h.tz - h.fz;
          if (dx * dx + dz * dz > 0.01) pw.face += wrapPi(Math.atan2(dx, dz) - pw.face) * Math.min(1, dt * 16);
          air = h.k > 0.12 && h.k < 0.88; run = 0.6;
          if (h.jump) pw.face += dt * 9;                       // grand saut : le pion tourne sur lui-même
          if (h.k >= 1) { pw.tile = h.to; pw.hop = null; pw.land = 1; }
        } else {
          pw.walk = Math.max(0, pw.walk - dt);
          const list = occ[pw.tile] || [pw], rank = Math.max(0, list.indexOf(pw)), sl = slotOffset(rank, list.length, 0.5);
          pw.rank = list.length > 1 ? rank : 0;
          const home = tileXZ(pw.tile), k = Math.min(1, dt * 9);
          pw.x += (home.x + sl.x - pw.x) * k; pw.z += (home.z + sl.z - pw.z) * k; pw.y += (TILE_Y - pw.y) * k;
          // au repos : le pion regarde la caméra
          const want = Math.atan2(camera.position.x - pw.x, camera.position.z - pw.z);
          pw.face += wrapPi(want - pw.face) * Math.min(1, dt * 5);
          run = pw.walk > 0 ? 0.4 : 0;
          if (!pw.q.length) while (pw.pend.length) { const o = pw.pend.shift(); pop(pw, o.text, o.color, o.big); }
        }
        pw.land = Math.max(0, pw.land - dt * 5);
        pw.cheer = Math.max(0, pw.cheer - dt);
        const mine = b.cur === pw.id && b.sub === "pre";
        const bob = mine && !pw.hop ? Math.abs(Math.sin(t * 3.4 + pw.phase)) * 0.16 : 0;
        const g = pw.fig.group;
        g.position.set(pw.x, pw.y + bob, pw.z); g.rotation.y = pw.face;
        pw.fig.anim({ t: t + pw.phase, run: air ? 0 : run, air, cheer: pw.cheer > 0 && !pw.hop });
        if (pw.fig.squash) pw.fig.squash(pw.land * 0.16 * (pw.hop ? 0 : 1));
        pw.ring.position.set(pw.x, TILE_Y + 0.03, pw.z);
        const cur = b.cur === pw.id, rs = cur ? 1.12 + Math.sin(t * 6) * 0.08 : 0.9; pw.ring.scale.set(rs, rs, rs);
        pw.ring.material.opacity = cur ? 1 : 0.8;
        pw.tag.position.set(pw.x, pw.y + bob + 1.6 * PAWN_K + 0.45 + (pw.hop ? 0 : (pw.rank || 0) * 0.5), pw.z);
        const ts = cur ? 1.12 : 1; pw.tag.scale.set(400 / 96 * 0.38 * ts, 0.38 * ts, 1);
      }
      // bulles qui montent puis disparent
      for (let i = pops.length - 1; i >= 0; i--) {
        const o = pops[i]; o.t += dt;
        const k = o.t / 1.5, g = o.p.fig.group;
        o.s.position.set(g.position.x, g.position.y + 2.0 + o.t * 0.9, g.position.z);
        o.s.material.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
        if (k >= 1) { scene.remove(o.s); o.s.material.dispose(); pops.splice(i, 1); }
      }
      return b;
    };

    return {
      update(dt, t) {
        const b = reconcile(dt, t);
        if (!b) return;
        const cur = b.cur && pawns.get(b.cur);
        if (cur) { focus.x += (cur.x - focus.x) * Math.min(1, dt * 6); focus.z += (cur.z - focus.z) * Math.min(1, dt * 6); focus.y = 0.4; }
        world.setHere(cur ? cur.tile : 0);
        world.update(t, dt, { yaw: Math.atan2(camPos.x - camLook.x, camPos.z - camLook.z), follow: { x: focus.x, z: focus.z }, cam: ctl.current.ov || b.sub === "order" || !cur ? null : { x: camera.position.x, z: camera.position.z } });

        /* caméra : suit le joueur dont c'est le tour ; vue d'ensemble pendant le tirage de l'ordre, ou sur demande */
        const a = size.w / size.h, tanH = Math.tan((camera.fov * Math.PI) / 360);
        const overview = ctl.current.ov || b.sub === "order" || !cur;
        if (overview) {
          const portrait = a < 1.1, wid = (portrait ? ext.rz : ext.rx) + 2.4, hei = (portrait ? ext.rx : ext.rz) + 2.4, pitch = 1.0;
          const d = Math.max(wid / (tanH * a), (hei * Math.sin(pitch)) / tanH) * 1.32, yaw = portrait ? Math.PI / 2 : 0;
          dPos.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
          dLook.set(0, 0, 0.2);
        } else {
          const back = clamp(1 / (a * 1.05), 1, 1.35);
          const lag = Math.max(0, Math.hypot(cur.x - focus.x, cur.z - focus.z) - 2.2);        // grand saut : la caméra prend de la hauteur et recule pour ne pas traverser le décor
          dPos.set(focus.x, focus.y + 6.1 * back + lag * 1.6, focus.z + 5.0 * back + lag * 0.7);
          dLook.set(focus.x, focus.y + 0.5, focus.z - 0.2);
        }
        const k = 1 - Math.exp(-dt * 2.8);
        camPos.lerp(dPos, k); camLook.lerp(dLook, k);
        camera.position.copy(camPos); camera.lookAt(camLook);

        /* infos pour les tests automatiques */
        sinceDs += dt;
        if (sinceDs > 0.15) {
          sinceDs = 0;
          const list = [...pawns.values()];
          wrap.dataset.pawns = JSON.stringify(list.map((p) => ({ id: p.id, tile: p.tile, hop: !!p.hop || p.q.length > 0 })));
          wrap.dataset.moving = list.some((p) => p.hop || p.q.length) ? "1" : "0";
          wrap.dataset.curPos = cur ? String(cur.tile) : "";
          wrap.dataset.cam = overview ? "ov" : "follow";
          wrap.dataset.calls = String(renderer.info.render.calls);
        }
      },
      dispose() { world.dispose(); own.forEach((x) => x && x.dispose && x.dispose()); for (const p of pawns.values()) p.fig.dispose && p.fig.dispose(); },
    };
  };

  return (
    <div className="bdboard b3d" data-testid="bd-3d" data-ready={ready ? "1" : "0"} data-spaces={bd.spaces.join(",")} data-gem={bd.gemAt} data-cur={bd.cur || ""}>
      <Stage3D setup={setup} label="Plateau de jeu en 3D" onFail={onFail} onReady={() => setReady(true)} />
      <div className="b3top">
        <span className="b3pill" data-testid="bd-round">Tour {Math.min(bd.round, bd.total)}/{bd.total}{bd.sprint ? <b className="b3hot" title="Sprint final : pièces ×2">🔥 ×2</b> : null}</span>
        <span className="b3btns">
          <button className="b3btn" data-testid="bd-cam" aria-pressed={ov} aria-label={ov ? "Suivre le joueur" : "Voir tout le plateau"} title={ov ? "Suivre le joueur" : "Voir tout le plateau"} onClick={() => setOv(!ov)}>{ov ? "🎯" : "🗺️"}</button>
          <button className="b3btn" data-testid="bd-2d" onClick={onFlat} aria-label="Afficher le plateau en 2D">2D</button>
        </span>
      </div>
      <div className={"b3mid" + (bd.sub === "order" ? " order" : "")}>{center}</div>
    </div>
  );
}
