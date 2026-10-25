// Tests : tracé du plateau 3D (cases à égale distance, chemins des pions). Lancer : node tools/test-board3d.js
import { BD_N, trackPoints, spacing, extent, slotOffset, pathBetween } from "../src/board3d/layout.js";
import { BD_SIZE, BD_LAYOUT } from "../src/data/board.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

ok(BD_N === BD_SIZE && BD_LAYOUT.length === BD_SIZE, "le tracé 3D a autant de cases que le plateau du jeu (" + BD_SIZE + ")");
const T = trackPoints();
ok(T.length === BD_N && T.every((t) => Number.isFinite(t.x) && Number.isFinite(t.z) && Number.isFinite(t.ang)), "32 points valides");
const sp = spacing(T), mn = Math.min(...sp), mx = Math.max(...sp);
ok(mn > 1.4, "cases assez espacées pour des pions de 0,5 : écart minimum " + mn.toFixed(2));
ok(mx / mn < 1.08, "cases à égale distance (écart max/min " + (mx / mn).toFixed(3) + ")");
const E = extent(T);
ok(E.rx > 8 && E.rx < 13 && E.rz > 5 && E.rz < 10, "dimensions raisonnables : " + E.rx.toFixed(1) + " × " + E.rz.toFixed(1));
ok(T[0].z > 5 && Math.abs(T[0].x) < 0.5, "la case de départ est en bas (face à la caméra) : " + T[0].x.toFixed(2) + ", " + T[0].z.toFixed(2));
// sens horaire vu d'en haut (x droite, z vers le bas de l'écran) : de la case 0 (bas) la case 1 est à GAUCHE
ok(T[1].x < T[0].x, "le sens de marche va du bas vers la gauche, puis le haut, puis la droite");
// jamais deux cases confondues
let close = 1e9; for (let i = 0; i < BD_N; i++) for (let j = i + 1; j < BD_N; j++) close = Math.min(close, Math.hypot(T[i].x - T[j].x, T[i].z - T[j].z));
ok(close > 1.4, "aucune case ne touche une autre (même celles de part et d'autre de la boucle) : " + close.toFixed(2));

const s1 = slotOffset(0, 1); ok(s1.x === 0 && s1.z === 0, "un pion seul est au centre de sa case");
const offs = [0, 1, 2, 3].map((j) => slotOffset(j, 4));
ok(offs.every((o) => Math.hypot(o.x, o.z) > 0.3 && Math.hypot(o.x, o.z) < 0.4), "4 pions sur la même case : en cercle");
ok(new Set(offs.map((o) => o.x.toFixed(2) + o.z.toFixed(2))).size === 4, "…et chacun à sa place");

ok(pathBetween(5, 5).steps.length === 0, "pas de chemin si on ne bouge pas");
ok(JSON.stringify(pathBetween(5, 8).steps) === "[6,7,8]", "avancer de 3 : 3 sauts");
ok(JSON.stringify(pathBetween(30, 2).steps) === "[31,0,1,2]", "passer par la case 0 (la boucle)");
ok(JSON.stringify(pathBetween(8, 6).steps) === "[7,6]", "reculer de 2 : 2 sauts en arrière");
ok(pathBetween(0, 10).steps.length === 10 && !pathBetween(0, 10).jump, "10 cases : à pied");
const far = pathBetween(0, 16); ok(far.jump && far.steps.length === 1 && far.steps[0] === 16, "16 cases d'écart (téléporteur) : un seul grand saut");

console.log(fail ? "\n" + fail + " ÉCHEC(S)" : "\nTout est bon.");
process.exit(fail ? 1 : 0);
