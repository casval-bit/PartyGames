// Deux transports interchangeables :
//  - Supabase Realtime (vrai multijoueur, aucune table à créer : seulement Broadcast + Presence)
//  - Local (BroadcastChannel) : plusieurs onglets du même navigateur, pour tester sans serveur
import { ONLINE } from "../config.js";

import { getSupa } from "./supa.js";

/* ---------------------------- Supabase ---------------------------- */
const supabaseTransport = {
  mode: "online",

  /** Écoute la liste des lobbys ouverts. cb(list). Renvoie stop(). */
  watchLobbies(cb) {
    let ch, dead = false;
    getSupa().then((sb) => {
      if (dead) return;
      ch = sb.channel("tu-lobbies");
      const push = () => {
        const st = ch.presenceState();
        const list = Object.values(st).flatMap((arr) => arr.slice(-1));
        cb(list.filter((x) => x && x.roomId));
      };
      ch.on("presence", { event: "sync" }, push).subscribe();
    });
    return () => { dead = true; ch && getSupa().then((sb) => sb.removeChannel(ch)); };
  },

  /** Publie un lobby dans la liste. */
  advertise(info) {
    let ch, ready = false, last = info, dead = false;
    getSupa().then((sb) => {
      if (dead) return;
      ch = sb.channel("tu-lobbies", { config: { presence: { key: info.roomId } } });
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") { ready = true; await ch.track(last); }
      });
    });
    return {
      update(next) { last = next; if (ready) ch.track(next); },
      stop() { dead = true; if (ch) { ch.untrack(); getSupa().then((sb) => sb.removeChannel(ch)); } },
    };
  },

  /** Ouvre le canal d'un salon. onMsg(msg). Résout {send, close}. */
  async room(roomId, onMsg) {
    const sb = await getSupa();
    const ch = sb.channel("room-" + roomId, { config: { broadcast: { self: false, ack: false } } });
    ch.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload));
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("Connexion impossible")), 8000);
      ch.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); res(); } });
    });
    return {
      send: (m) => ch.send({ type: "broadcast", event: "m", payload: m }),
      close: () => sb.removeChannel(ch),
    };
  },
};

/* ------------------------------ Local ------------------------------ */
const localTransport = {
  mode: "local",

  watchLobbies(cb) {
    const bc = new BroadcastChannel("tu-lobbies");
    const seen = new Map();
    const emit = () => {
      const now = Date.now();
      for (const [k, v] of seen) if (now - v.ts > 4000) seen.delete(k);
      cb([...seen.values()].map((v) => v.info));
    };
    bc.onmessage = (e) => {
      const { info, gone } = e.data || {};
      if (gone) seen.delete(gone);
      else if (info) seen.set(info.roomId, { info, ts: Date.now() });
      emit();
    };
    bc.postMessage({ hello: true });
    const iv = setInterval(emit, 1000);
    return () => { clearInterval(iv); bc.close(); };
  },

  advertise(info) {
    const bc = new BroadcastChannel("tu-lobbies");
    let last = info;
    const send = () => bc.postMessage({ info: last });
    bc.onmessage = (e) => { if (e.data && e.data.hello) send(); };
    send();
    const iv = setInterval(send, 1500);
    return {
      update(next) { last = next; send(); },
      stop() { clearInterval(iv); bc.postMessage({ gone: info.roomId }); bc.close(); },
    };
  },

  async room(roomId, onMsg) {
    const bc = new BroadcastChannel("tu-room-" + roomId);
    bc.onmessage = (e) => onMsg(e.data);
    return { send: (m) => bc.postMessage(m), close: () => bc.close() };
  },
};

export const transport = ONLINE ? supabaseTransport : localTransport;
