// Tests : signatures (secure.js) et liste blanche d'adresses (safeUrl.js). Lancer : node tools/test-secure.js
import { newIdentity, signMsg, verifyMsg, canon, validPk } from "../src/net/secure.js";
import { safeUrl } from "../src/lib/safeUrl.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

const a = await newIdentity(), b = await newIdentity();
ok(validPk(a.pub), "clé publique au bon format");
const msg = { t: "swipe", from: "p-1", cardId: "x", ok: true, seq: 3, n: 5 };
msg.sig = await signMsg(a.priv, msg);
ok(await verifyMsg(a.pub, msg), "signature valide acceptée");
ok(!(await verifyMsg(b.pub, msg)), "mauvaise clé refusée");
ok(!(await verifyMsg(a.pub, { ...msg, ok: false })), "message modifié refusé");
ok(!(await verifyMsg(a.pub, { ...msg, from: "p-2" })), "autre expéditeur refusé");
ok(!(await verifyMsg(a.pub, { ...msg, sig: "" })), "signature vide refusée");
ok(!(await verifyMsg("n'importe quoi", msg)), "clé mal formée refusée");
// le message passe par JSON (réseau) : la signature doit rester valide
ok(await verifyMsg(a.pub, JSON.parse(JSON.stringify(msg))), "valide après aller-retour JSON");
const withUndef = { t: "x", a: undefined, l: [1, undefined, "é\n"], n: 1 };
withUndef.sig = await signMsg(a.priv, withUndef);
ok(await verifyMsg(a.pub, JSON.parse(JSON.stringify(withUndef))), "undefined / unicode : toujours valide après JSON");
ok(canon({ b: 1, a: [2, { d: 1, c: 2 }] }) === '{"a":[2,{"c":2,"d":1}],"b":1}', "JSON canonique trié");

const yes = ["https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/x.jpg/640px-x.jpg", "https://cdns-images.dzcdn.net/images/cover/abc/250x250.jpg",
  "https://cdnt-preview.dzcdn.net/api/1/1/a/b/c.mp3", "https://e-cdns-images.dzcdn.net/x.jpg", "https://fr.wikipedia.org/x.png", "cards/ab.jpg", "/cards/ab.jpg"];
const no = ["http://upload.wikimedia.org/x.jpg", "https://evil.example.com/x.jpg", "https://dzcdn.net.evil.com/x.jpg", "https://evil.com/?https://dzcdn.net", "https://user:pw@dzcdn.net/x",
  "javascript:alert(1)", "data:text/html,hi", "//evil.com/x.jpg", "../x.jpg", "cards/../../x", "file:///etc/passwd", "https://notdzcdn.net/x", "", null, 5, "demo:3", "https://x.dzcdn.net/a b"];
yes.forEach((u) => ok(safeUrl(u) === u, "autorisé : " + u));
no.forEach((u) => ok(safeUrl(u) === "", "refusé : " + String(u)));
ok(safeUrl("demo:3", { allowDemo: true }) === "demo:3", "demo: autorisé pour l'audio");
ok(safeUrl("demo:abc", { allowDemo: true }) === "", "demo: mal formé refusé");
console.log(fail ? `\n${fail} échec(s)` : "\nTout est bon.");
process.exit(fail ? 1 : 0);
