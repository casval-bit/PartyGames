import { useCallback, useEffect, useRef, useState } from "react";
import { transport } from "./transport.js";
import { HostEngine } from "./hostEngine.js";
import { uid } from "../lib/util.js";
import { ONLINE } from "../config.js";
import { SECURE_OK, newIdentity, signMsg, verifyMsg, validPk } from "./secure.js";

const NO_CRYPTO = "Ce navigateur n'a pas de chiffrement (WebCrypto) : ouvre l'appli en HTTPS ou installe l'APK.";

/** Tout le réseau côté interface : créer / rejoindre un salon et agir dessus. */
export function useRoom(me) {
  const [room, setRoom] = useState(null);
  const [packs, setPacks] = useState(null);
  const [dealt, setDealt] = useState(null);
  const [queue, setQueue] = useState(null);
  const [discarded, setDiscarded] = useState(null);
  const [feedback, setFeedback] = useState(null); // blind test : réponse à ma dernière proposition
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const R = useRef({ engine: null, conn: null, ad: null, isHost: false, lastSeen: 0, joined: false, watch: null });
  const ID = useRef({ ident: null, n: Date.now(), out: Promise.resolve(), inn: Promise.resolve() });

  /** Identité (clés) de ce téléphone, créée à la demande. */
  const ensureIdentity = useCallback(async () => {
    if (!SECURE_OK) {
      if (ONLINE) throw new Error(NO_CRYPTO);
      return null; // test local sans réseau : pas de signature
    }
    if (!ID.current.ident) ID.current.ident = await newIdentity();
    return ID.current.ident;
  }, []);

  /** Envoie un message signé, dans l'ordre (la signature est asynchrone). */
  const sendSigned = useCallback((conn, msg, extra = {}) => {
    const I = ID.current;
    const run = async () => {
      const body = { ...msg, ...extra, n: ++I.n };
      if (I.ident) body.sig = await signMsg(I.ident.priv, body);
      conn.send(body);
    };
    I.out = I.out.then(run).catch(() => {});
    return I.out;
  }, []);

  const reset = useCallback(() => {
    const r = R.current;
    clearInterval(r.watch);
    if (r.engine) r.engine.destroy();
    if (r.ad) r.ad.stop();
    if (r.conn) { const c = r.conn, flush = ID.current.out; Promise.race([flush, new Promise((res) => setTimeout(res, 800))]).finally(() => c.close()); } // laisse partir le dernier message signé (ex. « closed »)
    R.current = { engine: null, conn: null, ad: null, isHost: false, lastSeen: 0, joined: false, watch: null, hostPk: null, hostN: 0 };
    ID.current.out = Promise.resolve(); ID.current.inn = Promise.resolve();
    setRoom(null); setPacks(null); setDealt(null); setDiscarded(null); setQueue(null); setFeedback(null);
  }, []);

  const apply = useCallback((msg) => {
    const r = R.current;
    if (msg.to && msg.to !== me.id) return;
    switch (msg.t) {
      case "state": {
        r.lastSeen = Date.now();
        const s = msg.state;
        const inRoom = s.players.some((p) => p.id === me.id);
        if (r.joined && !inRoom) { setNotice("Vous n'êtes plus dans ce lobby."); return reset(); }
        if (inRoom) r.joined = true;
        setRoom({ ...s, deadline: s.endsIn != null ? Date.now() + s.endsIn : null });
        if (s.phase === "lobby") { setPacks(null); setDealt(null); setDiscarded(null); setQueue(null); }
        break;
      }
      case "hand": setPacks(msg.packs); break;
      case "deal": setDealt(msg.cards); break;
      case "queue": setQueue({ cards: msg.cards, seq: msg.seq || 0, turn: msg.turn }); break;
      case "deck": setDiscarded(msg.discarded); break;
      case "fb": setFeedback({ ...msg, k: Date.now() + Math.random() }); break;
      case "kicked": setNotice("Le créateur vous a exclu du lobby."); reset(); break;
      case "denied": setNotice(msg.reason || "Impossible de rejoindre."); reset(); break;
      case "closed": if (!r.isHost) { setNotice("Le créateur a fermé le lobby."); reset(); } break;
      case "aborted": setNotice(msg.reason || "Partie interrompue."); break;
      default:
    }
  }, [me.id, reset]);

  /* --------------------------- créer un salon --------------------------- */
  const create = useCallback(async (roomName) => {
    if (R.current.conn) return;
    setBusy(true); setNotice("");
    try {
      const ident = await ensureIdentity();
      const roomId = uid(6);
      // tout ce qui arrive du réseau est vérifié (forme, débit, signature) par le moteur avant d'être pris en compte
      const conn = await transport.room(roomId, (msg) => {
        if (R.current.engine) R.current.engine.receive(msg);
      });
      const engine = new HostEngine({
        roomId, name: String(roomName || `Salon de ${me.name}`).slice(0, 30), host: { ...me, pk: ident && ident.pub }, signed: Boolean(ident),
        emit: (msg) => {
          apply(msg);
          if (!(msg.to && (msg.to === me.id || String(msg.to).startsWith("bot-")))) {
            sendSigned(conn, msg, ident && (msg.t === "state" || msg.t === "denied") ? { hpk: ident.pub } : {});
          }
          if (msg.t === "state") R.current.ad && R.current.ad.update(engine.lobbyInfo());
        },
      });
      const ad = transport.advertise(engine.lobbyInfo());
      R.current = { ...R.current, engine, conn, ad, isHost: true, joined: true };
      engine.broadcast();
    } catch (e) {
      setNotice("Impossible de créer le lobby : " + (e.message || e));
      reset();
    }
    setBusy(false);
  }, [apply, ensureIdentity, me, reset, sendSigned]);

  /* -------------------------- rejoindre un salon -------------------------- */
  const join = useCallback(async (roomId) => {
    if (R.current.conn) return;
    setBusy(true); setNotice("");
    try {
      const ident = await ensureIdentity();
      // Messages du créateur : on vérifie la signature (clé du créateur mémorisée au premier état reçu), puis l'ordre (anti-rejeu).
      const accept = async (msg) => {
        const r = R.current;
        if (!ident) return true; // test local sans WebCrypto
        if (!msg || typeof msg !== "object" || typeof msg.n !== "number") return false;
        if (!r.hostPk) {
          if (!(msg.t === "state" || msg.t === "denied") || !validPk(msg.hpk) || !(await verifyMsg(msg.hpk, msg))) return false;
          if (msg.t === "state") {
            const st = msg.state;
            if (!st || st.id !== roomId || typeof st.hostId !== "string" || !Array.isArray(st.players)) return false;
            r.hostPk = msg.hpk; r.hostN = msg.n;
          }
          return true;
        }
        if (!(msg.n > r.hostN) || !(await verifyMsg(r.hostPk, msg)) || !(msg.n > r.hostN)) return false;
        r.hostN = msg.n;
        return true;
      };
      const conn = await transport.room(roomId, (msg) => {
        if (!msg || typeof msg !== "object") return;
        ID.current.inn = ID.current.inn.then(async () => { if (R.current.conn && (await accept(msg))) apply(msg); }).catch(() => {});
      });
      R.current = { ...R.current, conn, isHost: false, joined: false, lastSeen: Date.now() };
      const send = () => sendSigned(conn, { t: "join", from: me.id, name: me.name, look: me.look }, ident ? { pk: ident.pub } : {});
      send();
      const retry = setInterval(send, 1500);
      const t0 = Date.now();
      await new Promise((res) => {
        const iv = setInterval(() => {
          if (R.current.joined || !R.current.conn || Date.now() - t0 > 7000) { clearInterval(iv); res(); }
        }, 150);
      });
      clearInterval(retry);
      if (R.current.conn && !R.current.joined) { setNotice("Lobby introuvable ou fermé."); reset(); }
      else if (R.current.conn) {
        R.current.watch = setInterval(() => {
          if (Date.now() - R.current.lastSeen > 16000) { setNotice("Connexion au créateur perdue."); reset(); }
        }, 3000);
      }
    } catch (e) {
      setNotice("Connexion impossible : " + (e.message || e));
      reset();
    }
    setBusy(false);
  }, [apply, ensureIdentity, me, reset, sendSigned]);

  const leave = useCallback(() => {
    const r = R.current;
    if (r.conn && !r.isHost) {
      // « je pars » est signé avant de couper la connexion (au plus 700 ms d'attente)
      Promise.race([sendSigned(r.conn, { t: "leave", from: me.id }), new Promise((res) => setTimeout(res, 700))]).finally(reset);
    } else reset();
  }, [me.id, reset, sendSigned]);

  useEffect(() => () => reset(), [reset]);

  /* ------------------------------ actions ------------------------------ */
  const act = useCallback((msg) => {
    const r = R.current;
    if (r.isHost) r.engine.handle({ ...msg, from: me.id });
    else if (r.conn) sendSigned(r.conn, { ...msg, from: me.id });
  }, [me.id, sendSigned]);

  const host = (fn) => (...a) => { const e = R.current.engine; if (e) fn(e, ...a); };
  const actions = {
    setTeam: (team) => act({ t: "setTeam", team }),
    setLook: (look) => act({ t: "look", look }),
    vote: (slots) => act({ t: "vote", slots }),
    ready: (v) => act({ t: "ready", v }),
    discard: (ids, confirm) => act({ t: "discard", ids, confirm }),
    bonus: (picks, confirm) => act({ t: "bonus", picks, confirm }),
    guess: (text) => act({ t: "guess", text }),
    btNext: () => act({ t: "btnext" }),
    setPlaylist: host((e, pl) => e.setPlaylist(me.id, pl)),
    found: () => act({ t: "found" }),
    begin: () => act({ t: "begin" }),
    swipe: (cardId, ok, seq) => act({ t: "swipe", cardId, ok, seq }),
    imageFailed: () => act({ t: "imgfail" }),
    backToLobby: host((e) => e.backToLobby(me.id)),
    kick: host((e, id) => e.kick(me.id, id)),
    setSettings: host((e, patch) => e.setSettings(me.id, patch)),
    addBot: host((e) => e.addBot()),
    start: host((e) => e.start(me.id)),
  };

  return {
    room, packs, dealt, queue, discarded, feedback, notice, busy,
    isHost: Boolean(room && room.hostId === me.id),
    clearNotice: () => setNotice(""),
    create, join, leave, ...actions,
  };
}
