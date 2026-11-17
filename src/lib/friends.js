// Amis de Heavy is the Crown : carte de joueur publique (pseudo, code ami, apparence), demandes d'ami, amitiés,
// présence en ligne et invitations dans un salon.
// Deux implémentations, même interface :
//  - Supabase : tables tcg_players et tcg_friends (supabase/amis.sql, à exécuter une fois), présence et invitations par
//    Realtime (canal « tcg-online », sans table) ; il faut être connecté à son compte ;
//  - simulée (tests automatiques, VITE_MOCK_AUTH) : localStorage + BroadcastChannel, entre onglets d'un même navigateur.
// En ligne, on se repère par son code ami (jamais par l'identifiant du compte ni par l'adresse e-mail).
import { ONLINE, MOCK_AUTH } from "../config.js";
import { getSupa } from "../net/supa.js";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newFriendCode = () => Array.from({ length: 8 }, () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]).join("");
export const isFriendCode = (s) => /^[A-Z0-9]{6,10}$/.test(String(s || ""));
/** Code ami tapé par un joueur : majuscules, sans espaces ni tirets. */
export const cleanFriendCode = (s) => String(s || "").toUpperCase().replace(/[\s-]/g, "");
const cleanLook = (l) => (l && typeof l === "object" ? { av: l.av || null, fr: l.fr || "bronze", bn: l.bn || "heraut", lv: Number(l.lv) || 1 } : null);
const card = (r) => (r ? { uid: r.user_id, code: r.code, pseudo: r.pseudo || "Joueur", look: cleanLook(r.look), seen: r.seen_at || null } : null);

/** Erreur Supabase -> état : « missing » si les tables n'existent pas encore (amis.sql pas exécuté). */
function stateOf(e) {
  const m = String((e && (e.message || e.details)) || "").toLowerCase(), c = String((e && e.code) || "");
  if (c === "42P01" || c === "PGRST205" || m.includes("does not exist") || m.includes("could not find the table")) return "missing";
  if (m.includes("failed to fetch") || m.includes("network")) return "offline";
  return "error";
}
const fail = (e) => { const err = new Error((e && e.message) || "Erreur"); err.state = stateOf(e); throw err; };

/* ------------------------------ vrai serveur ------------------------------ */
function realBackend() {
  return {
    mode: "online",
    /** Publie (ou met à jour) ma carte de joueur ; la crée avec un code ami unique la première fois. Renvoie la carte. */
    async publish(uid, { pseudo, look }) {
      const s = await getSupa();
      const { data: row, error } = await s.from("tcg_players").select("user_id,code,pseudo,look,seen_at").eq("user_id", uid).maybeSingle();
      if (error) fail(error);
      const now = new Date().toISOString();
      const patch = { pseudo: String(pseudo || "").slice(0, 16), look: cleanLook(look) || {}, seen_at: now, updated_at: now };
      if (row) {
        const { error: e2 } = await s.from("tcg_players").update(patch).eq("user_id", uid);
        if (e2) fail(e2);
        return card({ ...row, ...patch });
      }
      for (let i = 0; i < 5; i++) { // code déjà pris (très rare) : on en tire un autre
        const code = newFriendCode();
        const { error: e3 } = await s.from("tcg_players").insert({ user_id: uid, code, ...patch });
        if (!e3) return card({ user_id: uid, code, ...patch });
        if (String(e3.code) !== "23505") fail(e3);
      }
      throw new Error("Impossible de créer le code ami.");
    },
    /** Joueurs dont le pseudo commence par q, ou celui qui a ce code ami (12 au plus, sans moi). */
    async search(uid, q) {
      const s = await getSupa();
      const t = String(q || "").trim();
      if (!t) return [];
      const code = cleanFriendCode(t);
      let req = s.from("tcg_players").select("user_id,code,pseudo,look,seen_at").neq("user_id", uid).limit(12);
      const safe = t.replace(/[%_,()*\\]/g, ""); // caractères spéciaux des filtres retirés
      req = isFriendCode(code) ? req.or(`code.eq.${code},pseudo.ilike.${safe}*`) : req.ilike("pseudo", `${safe}%`);
      const { data, error } = await req;
      if (error) fail(error);
      return (data || []).map(card);
    },
    /** Mes amis, les demandes reçues et envoyées : { friends, incoming, outgoing } (cartes de joueur). */
    async list(uid) {
      const s = await getSupa();
      const { data: links, error } = await s.from("tcg_friends").select("a,b,status").or(`a.eq.${uid},b.eq.${uid}`);
      if (error) fail(error);
      const other = (l) => (l.a === uid ? l.b : l.a);
      const ids = [...new Set((links || []).map(other))];
      const by = {};
      if (ids.length) {
        const { data: rows, error: e2 } = await s.from("tcg_players").select("user_id,code,pseudo,look,seen_at").in("user_id", ids);
        if (e2) fail(e2);
        for (const r of rows || []) by[r.user_id] = card(r);
      }
      const out = { friends: [], incoming: [], outgoing: [] };
      for (const l of links || []) {
        const c = by[other(l)];
        if (!c) continue;
        if (l.status === "accepted") out.friends.push(c); else if (l.b === uid) out.incoming.push(c); else out.outgoing.push(c);
      }
      return out;
    },
    /** Demande d'ami ; si l'autre m'avait déjà demandé, on devient amis tout de suite. */
    async request(uid, other) {
      const s = await getSupa();
      const { data: back } = await s.from("tcg_friends").select("a,b,status").eq("a", other).eq("b", uid).maybeSingle();
      if (back) return this.accept(uid, other);
      const { error } = await s.from("tcg_friends").insert({ a: uid, b: other, status: "pending" });
      if (error && String(error.code) !== "23505") fail(error);
      return "sent";
    },
    async accept(uid, other) {
      const s = await getSupa();
      const { error } = await s.from("tcg_friends").update({ status: "accepted" }).eq("a", other).eq("b", uid);
      if (error) fail(error);
      return "accepted";
    },
    async remove(uid, other) {
      const s = await getSupa();
      const { error } = await s.from("tcg_friends").delete().or(`and(a.eq.${uid},b.eq.${other}),and(a.eq.${other},b.eq.${uid})`);
      if (error) fail(error);
    },
    /**
     * En ligne : je suis visible (par mon code ami) tant que l'appli est ouverte. onSync(Map code -> { st, room }) ;
     * onInvite({ from, name, room }). Renvoie { update(info), invite(toCode, { name, room }), stop() }.
     */
    online(code, info, { onSync, onInvite }) {
      let ch = null, ready = false, last = { c: code, ...info }, dead = false;
      getSupa().then((sb) => {
        if (dead) return;
        ch = sb.channel("tcg-online", { config: { presence: { key: code }, broadcast: { self: false } } });
        ch.on("presence", { event: "sync" }, () => {
          const st = ch.presenceState(), map = new Map();
          for (const [k, arr] of Object.entries(st)) { const x = arr[arr.length - 1]; if (x) map.set(k, { st: x.st || "menu", room: x.room || null }); }
          onSync(map);
        });
        ch.on("broadcast", { event: "inv" }, ({ payload }) => { if (payload && payload.to === code) onInvite(payload); });
        ch.subscribe(async (status) => { if (status === "SUBSCRIBED") { ready = true; await ch.track(last); } });
      });
      return {
        update(next) { last = { c: code, ...next }; if (ready) ch.track(last); },
        invite(to, p) { if (ready) ch.send({ type: "broadcast", event: "inv", payload: { to, from: code, name: String(p.name || "").slice(0, 16), room: p.room, at: Date.now() } }); return ready; },
        stop() { dead = true; if (ch) { const c = ch; ready = false; c.untrack().catch(() => {}).finally(() => getSupa().then((sb) => sb.removeChannel(c))); } },
      };
    },
  };
}

/* ------------------- simulé (tests automatiques seulement) ------------------- */
function mockBackend() {
  const KEY = "ph-mock-friends";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { players: {}, links: [] }; } catch { return { players: {}, links: [] }; } };
  const write = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } };
  const row = (d, uid) => (d.players[uid] ? { user_id: uid, ...d.players[uid] } : null);
  return {
    mode: "mock",
    async publish(uid, { pseudo, look }) {
      const d = read();
      const p = d.players[uid] || { code: newFriendCode() };
      d.players[uid] = { ...p, pseudo: String(pseudo || "").slice(0, 16), look: cleanLook(look) || {}, seen_at: new Date().toISOString() };
      write(d);
      return card(row(d, uid));
    },
    async search(uid, q) {
      const d = read(), t = String(q || "").trim().toLowerCase(), code = cleanFriendCode(q);
      if (!t) return [];
      return Object.keys(d.players).filter((k) => k !== uid && (d.players[k].code === code || String(d.players[k].pseudo || "").toLowerCase().startsWith(t))).slice(0, 12).map((k) => card(row(d, k)));
    },
    async list(uid) {
      const d = read(), out = { friends: [], incoming: [], outgoing: [] };
      for (const l of d.links) {
        if (l.a !== uid && l.b !== uid) continue;
        const c = card(row(d, l.a === uid ? l.b : l.a));
        if (!c) continue;
        if (l.status === "accepted") out.friends.push(c); else if (l.b === uid) out.incoming.push(c); else out.outgoing.push(c);
      }
      return out;
    },
    async request(uid, other) {
      const d = read();
      const back = d.links.find((l) => l.a === other && l.b === uid);
      if (back) { back.status = "accepted"; write(d); return "accepted"; }
      if (!d.links.some((l) => l.a === uid && l.b === other)) d.links.push({ a: uid, b: other, status: "pending" });
      write(d);
      return "sent";
    },
    async accept(uid, other) { const d = read(); const l = d.links.find((x) => x.a === other && x.b === uid); if (l) l.status = "accepted"; write(d); return "accepted"; },
    async remove(uid, other) { const d = read(); d.links = d.links.filter((l) => !((l.a === uid && l.b === other) || (l.a === other && l.b === uid))); write(d); },
    online(code, info, { onSync, onInvite }) {
      const bc = new BroadcastChannel("tcg-online-mock");
      const seen = new Map();
      let last = { c: code, ...info };
      const push = () => { const now = Date.now(), map = new Map(); for (const [k, v] of seen) if (now - v.ts < 5000) map.set(k, { st: v.st || "menu", room: v.room || null }); map.set(code, { st: last.st || "menu", room: last.room || null }); onSync(map); };
      bc.onmessage = (e) => {
        const m = e.data || {};
        if (m.kind === "here" && m.c) { seen.set(m.c, { ...m, ts: Date.now() }); push(); }
        else if (m.kind === "gone" && m.c) { seen.delete(m.c); push(); }
        else if (m.kind === "inv" && m.to === code) onInvite(m);
        else if (m.kind === "hello") bc.postMessage({ kind: "here", ...last });
      };
      const beat = () => bc.postMessage({ kind: "here", ...last });
      beat(); bc.postMessage({ kind: "hello" });
      const iv = setInterval(() => { beat(); push(); }, 1500);
      return {
        update(next) { last = { c: code, ...next }; beat(); push(); },
        invite(to, p) { bc.postMessage({ kind: "inv", to, from: code, name: String(p.name || "").slice(0, 16), room: p.room, at: Date.now() }); return true; },
        stop() { clearInterval(iv); bc.postMessage({ kind: "gone", c: code }); bc.close(); },
      };
    },
  };
}

/** null : pas de serveur (mode local sans compte), donc pas d'amis. */
export const friendsApi = MOCK_AUTH ? mockBackend() : ONLINE ? realBackend() : null;
