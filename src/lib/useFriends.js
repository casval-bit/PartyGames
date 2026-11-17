// Amis dans l'appli de Heavy is the Crown : ma carte de joueur publiée (pseudo, apparence, code ami), ma liste d'amis et
// les demandes, qui est en ligne, les invitations reçues. Il faut un compte (connexion par e-mail) ; sinon state = "login".
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { friendsApi } from "./friends.js";

const POLL_MS = 15000;
const INVITE_TTL_MS = 10 * 60 * 1000;

/**
 * user : le compte connecté (useAccount) ; pseudo, look : ma carte (look = { av, fr, bn, lv }) ; status : « menu », « lobby », « game ».
 * Renvoie { state, me, friends, incoming, outgoing, online, invites, refresh, search, request, accept, remove, invite, dismiss }.
 * state : off (pas de serveur), login (pas connecté), loading, ok, missing (supabase/amis.sql pas exécuté), offline, error.
 */
export function useFriends({ user, pseudo, look, status }) {
  const [me, setMe] = useState(null);
  const [lists, setLists] = useState({ friends: [], incoming: [], outgoing: [] });
  const [online, setOnline] = useState(() => new Map());
  const [invites, setInvites] = useState([]);
  const [state, setState] = useState(friendsApi ? "login" : "off");
  const uid = user && user.id;
  const lookKey = JSON.stringify([pseudo, look]);
  const live = useRef({}); live.current = { lists, uid };
  const pres = useRef(null);

  // ma carte de joueur : publiée à la connexion, puis à chaque changement de pseudo ou d'apparence (1 s après)
  useEffect(() => {
    if (!friendsApi) return undefined;
    if (!uid) { setMe(null); setState("login"); setLists({ friends: [], incoming: [], outgoing: [] }); return undefined; }
    let dead = false;
    setState((s) => (s === "ok" ? s : "loading"));
    const t = setTimeout(() => {
      friendsApi.publish(uid, { pseudo, look }).then((c) => { if (!dead) { setMe(c); setState("ok"); } })
        .catch((e) => { if (!dead) setState(e.state || "error"); });
    }, me ? 1000 : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [uid, lookKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const id = live.current.uid;
    if (!friendsApi || !id) return;
    try { setLists(await friendsApi.list(id)); } catch (e) { setState(e.state || "error"); }
  }, []);
  useEffect(() => {
    if (state !== "ok" || !uid) return undefined;
    refresh();
    const iv = setInterval(refresh, POLL_MS);
    return () => clearInterval(iv);
  }, [state, uid, refresh]);

  // en ligne : visible par son code ami tant que l'appli est ouverte ; invitations reçues de mes amis seulement
  const code = me && me.code;
  useEffect(() => {
    if (!friendsApi || !code) return undefined;
    const p = friendsApi.online(code, { st: status || "menu" }, {
      onSync: (map) => setOnline(map),
      onInvite: async (inv) => {
        if (!inv || !inv.room) return;
        let isFriend = live.current.lists.friends.some((f) => f.code === inv.from);
        if (!isFriend && live.current.uid) { // amitié toute récente (acceptée de l'autre côté) : on relit la liste avant de décider
          try { const l = await friendsApi.list(live.current.uid); setLists(l); isFriend = l.friends.some((f) => f.code === inv.from); } catch { /* hors ligne : ignorée */ }
        }
        if (!isFriend) return;
        setInvites((l) => [{ ...inv, k: `${inv.from}:${inv.room}`, at: Date.now() }, ...l.filter((x) => x.k !== `${inv.from}:${inv.room}` && Date.now() - x.at < INVITE_TTL_MS)].slice(0, 5));
      },
    });
    pres.current = p;
    return () => { p.stop(); if (pres.current === p) pres.current = null; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pres.current) pres.current.update({ st: status || "menu" }); }, [status]);

  const act = (fn) => async (...a) => {
    if (!friendsApi || !uid) return null;
    try { const r = await fn(...a); refresh(); return r; } catch (e) { setState(e.state || "error"); throw e; }
  };
  const api = useMemo(() => ({
    search: (q) => (friendsApi && uid ? friendsApi.search(uid, q) : Promise.resolve([])),
    request: act((other) => friendsApi.request(uid, other)),
    accept: act((other) => friendsApi.accept(uid, other)),
    remove: act((other) => friendsApi.remove(uid, other)),
    /** Invite un ami (son code) dans mon salon ; false si la présence n'est pas encore prête. */
    invite: (to, room, name) => Boolean(pres.current && pres.current.invite(to, { room, name })),
    dismiss: (k) => setInvites((l) => l.filter((x) => x.k !== k)),
  }), [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const onlineOf = useCallback((c) => online.get(c) || null, [online]);
  return { state, me, ...lists, online, onlineOf, invites, refresh, ...api };
}
