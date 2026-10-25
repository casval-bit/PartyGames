// Salle d'essai du Plateau 3D (adresse « ?bd3dlab ») : une partie fictive à 4 joueurs costumés, sans réseau.
// Réglages dans l'adresse : n (joueurs), cur (qui joue), pos=0,5,5,12 (cases), sub (pre|moving|order|gem|shop), sprint=1, gem=9, ov=1 (vue d'ensemble).
// Les boutons simulent ce que fait le moteur (un pas toutes les BD_STEP_MS) pour voir les sauts, les bulles et la gemme.
import { useEffect, useRef, useState } from "react";
import Board from "../screens/Board.jsx";
import { BD_LAYOUT } from "../data/board.js";
import { BD_STEP_MS } from "../config.js";
import { botLook } from "../minigames/three/kit3d.jsx";

const NAMES = ["Brice", "Léa", "Maximilien", "Zoé", "Karim", "Inès"];
const q = (k, d) => { try { return new URLSearchParams(location.search).get(k) ?? d; } catch { return d; } };

function makeRoom() {
  const n = Math.max(1, Math.min(6, +q("n", 4)));
  const players = Array.from({ length: n }, (_, i) => ({ id: "p" + i, name: NAMES[i], ci: i, look: { a: "a1", b: "b1", c: "c1", lv: 3 + i, x: botLook(i * 7 + 2).x } }));
  const posQ = (q("pos", "") || "").split(",").filter(Boolean).map(Number);
  const bd = {
    spaces: BD_LAYOUT.slice(), total: 8, round: 2, order: players.map((p) => p.id), rolls: {}, idx: 0, cur: "p" + Math.min(n - 1, +q("cur", 0)), sub: q("sub", "pre"), n: 1,
    pos: {}, coins: {}, gems: {}, items: {}, shield: {}, curse: {}, col: {}, gemAt: +q("gem", 9), sprint: q("sprint", "") === "1", roll: null, msg: null, feed: [{ k: 1, text: "Zoé a acheté une gemme" }, { k: 2, text: "Léa gagne 3 pièces" }], shop: null,
  };
  players.forEach((p, i) => {
    bd.pos[p.id] = posQ[i] ?? (i * 3) % 32; bd.coins[p.id] = 12 + i * 7; bd.gems[p.id] = i === 1 ? 1 : 0; bd.items[p.id] = i === 0 ? ["double", "shield"] : []; bd.shield[p.id] = i === 2; bd.curse[p.id] = null; bd.col[p.id] = i % 2; bd.rolls[p.id] = 3 + i * 2;
  });
  return { phase: "bd_turn", hostId: "p0", players, bd, deadline: Date.now() + 25000 };
}

export default function Board3DLab() {
  const [room, setRoom] = useState(makeRoom);
  const [log, setLog] = useState("");
  const timer = useRef(0);
  const me = { id: "p0", name: "Brice" };
  const api = { bdRoll: () => {}, bdGem: () => {}, bdShop: () => {}, backToLobby: () => {} };
  const upd = (fn) => setRoom((r) => { const bd = { ...r.bd, pos: { ...r.bd.pos }, coins: { ...r.bd.coins }, gems: { ...r.bd.gems } }; fn(bd, r); return { ...r, bd }; });
  const cur = room.bd.cur;
  useEffect(() => () => clearInterval(timer.current), []);

  const walk = (n) => {
    clearInterval(timer.current);
    let left = n;
    upd((bd) => { bd.sub = "moving"; bd.roll = { dice: [n], steps: n, k: bd.n + 1 }; bd.n += 1; bd.msg = null; });
    timer.current = setInterval(() => {
      upd((bd) => { bd.pos[bd.cur] = (bd.pos[bd.cur] + 1) % 32; });
      if (--left <= 0) {
        clearInterval(timer.current);
        setTimeout(() => upd((bd) => {
          const t = bd.spaces[bd.pos[bd.cur]];
          if (t === "blue") { bd.coins[bd.cur] += 3; bd.msg = { text: "Case bleue : +3 pièces", k: bd.n + 1 }; } else if (t === "red") { bd.coins[bd.cur] -= 3; bd.msg = { text: "Case rouge : −3 pièces", k: bd.n + 1 }; } else bd.msg = { text: "Arrivé sur " + t, k: bd.n + 1 };
          bd.sub = "land";
        }), BD_STEP_MS);
      }
    }, BD_STEP_MS);
  };
  const next = () => upd((bd) => { bd.cur = bd.order[(bd.order.indexOf(bd.cur) + 1) % bd.order.length]; bd.sub = "pre"; bd.roll = null; bd.msg = null; });
  const B = (label, fn, id) => <button key={label} className="btn small ghost" data-testid={id} onClick={fn}>{label}</button>;
  return (
    <div className="app" data-testid="bd3d-lab">
      <Board room={room} me={me} api={api} onLeave={() => {}} />
      <div className="row" style={{ gap: 6, flexWrap: "wrap", padding: "6px 14px 20px" }}>
        {B("Avancer 5", () => walk(5), "lab-walk5")}
        {B("Avancer 9", () => walk(9), "lab-walk9")}
        {B("Suivant", next, "lab-next")}
        {B("+3 🪙", () => upd((bd) => { bd.coins[bd.cur] += 3; }), "lab-coin")}
        {B("−3 🪙", () => upd((bd) => { bd.coins[bd.cur] -= 3; }), "lab-coinm")}
        {B("+1 💎", () => upd((bd) => { bd.gems[bd.cur] += 1; bd.gemAt = (bd.gemAt + 11) % 32 || 1; }), "lab-gem")}
        {B("Génie (téléport)", () => upd((bd) => { bd.pos[bd.cur] = bd.gemAt; }), "lab-warp")}
        {B("Sprint", () => upd((bd) => { bd.sprint = !bd.sprint; }), "lab-sprint")}
        {B("Ordre", () => upd((bd) => { bd.sub = bd.sub === "order" ? "pre" : "order"; }), "lab-order")}
        {B("Dé 7", () => upd((bd) => { bd.roll = { dice: [3, 4], steps: 7, k: bd.n + 1 }; bd.n += 1; bd.sub = "moving"; }), "lab-roll")}
        <small className="muted" data-testid="lab-log">{log || `joue : ${cur}`}</small>
      </div>
    </div>
  );
}
