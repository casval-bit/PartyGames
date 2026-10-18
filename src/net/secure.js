// Identité signée : chaque téléphone fabrique une paire de clés (ECDSA P-256, WebCrypto) au lancement.
// La clé privée ne quitte jamais l'appareil (non exportable). Chaque message est signé : le créateur du lobby
// vérifie que « from » est bien celui qui a rejoint, et les joueurs vérifient que l'état vient bien du créateur.
// Résultat : impossible de se faire passer pour un autre joueur (ni pour le créateur) en écoutant le canal.
const subtle = typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;
export const SECURE_OK = Boolean(subtle);

const ALG = { name: "ECDSA", namedCurve: "P-256" };
const SIG = { name: "ECDSA", hash: "SHA-256" };
const enc = new TextEncoder();
const PK_RE = /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/;

const toB64 = (buf) => { let s = ""; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** JSON canonique (clés triées) : même texte avant et après le passage par le réseau. */
export function canon(v) {
  if (Array.isArray(v)) return "[" + v.map((x) => canon(x === undefined ? null : x)).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  }
  return JSON.stringify(v === undefined ? null : v) ?? "null";
}

export const validPk = (pk) => typeof pk === "string" && PK_RE.test(pk);

/** Nouvelle identité : { priv, pub } où pub = "x.y" (clé publique, texte court). */
export async function newIdentity() {
  if (!subtle) return null;
  const kp = await subtle.generateKey(ALG, false, ["sign", "verify"]);
  const jwk = await subtle.exportKey("jwk", kp.publicKey);
  return { priv: kp.privateKey, pub: jwk.x + "." + jwk.y };
}

const pubCache = new Map();
async function importPub(pk) {
  if (pubCache.has(pk)) return pubCache.get(pk);
  const [x, y] = pk.split(".");
  const key = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x, y, ext: true }, ALG, false, ["verify"]);
  if (pubCache.size > 200) pubCache.clear();
  pubCache.set(pk, key);
  return key;
}

/** Signature d'un message (le champ `sig` est exclu du texte signé). */
export async function signMsg(priv, msg) {
  const { sig: _s, ...body } = msg;
  return toB64(await subtle.sign(SIG, priv, enc.encode(canon(body))));
}

/** Vrai si `msg.sig` est une signature valide de `msg` par la clé publique `pk`. */
export async function verifyMsg(pk, msg) {
  try {
    if (!subtle || !validPk(pk) || typeof msg.sig !== "string" || msg.sig.length > 120) return false;
    const { sig, ...body } = msg;
    return await subtle.verify(SIG, await importPub(pk), fromB64(sig), enc.encode(canon(body)));
  } catch {
    return false;
  }
}
