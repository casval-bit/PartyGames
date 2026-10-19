import { useCallback, useEffect, useRef, useState } from "react";
import { cloud } from "./cloud.js";
import { mergeProfiles, sameProfile } from "../data/accountMerge.js";
import { emptyProfile } from "../data/profile.js";

// À qui appartient la copie locale du profil : l'identifiant du compte, ou rien (profil « invité » jamais synchronisé).
const OWNER = "ph-profile-owner";
const getOwner = () => { try { return localStorage.getItem(OWNER) || ""; } catch { return ""; } };
const setOwner = (v) => { try { v ? localStorage.setItem(OWNER, v) : localStorage.removeItem(OWNER); } catch { /* ignore */ } };

const PUSH_DELAY_MS = 1500;

/**
 * Compte du joueur et synchronisation du profil.
 *  - connexion : le profil du téléphone et celui du compte sont fusionnés (data/accountMerge.js), puis les deux sont mis à jour ;
 *  - ensuite chaque changement (partie terminée, avatar équipé, pseudo) est envoyé au compte 1,5 s après ;
 *  - déconnexion : seulement si tout est bien sauvegardé, puis le téléphone repart d'un profil vide (le compte garde tout).
 * Sans serveur configuré (cloud === null) : le hook ne fait rien et le profil reste local.
 */
export function useAccount({ profile, replaceProfile, name, setName }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!cloud);          // la session éventuelle a été lue
  const [sync, setSync] = useState("idle");            // idle | syncing | ok | error
  const [syncErr, setSyncErr] = useState("");
  const [tick, setTick] = useState(0);
  const live = useRef({}); live.current = { profile, name, user };
  const pulledFor = useRef(null);                      // compte dont le profil a été fusionné ici
  const pulling = useRef(false);
  const last = useRef("");                             // dernier état connu côté cloud
  const failed = useRef("");                           // état dont l'envoi a échoué (pas de nouvelle tentative en boucle)

  const snapOf = (p, n) => JSON.stringify([p, n.trim()]);

  useEffect(() => {
    if (!cloud) return undefined;
    const off = cloud.onChange((u) => {
      if (!u) { pulledFor.current = null; setUser(null); } else setUser((prev) => (prev && prev.id === u.id ? prev : u));
    });
    cloud.restore().then((u) => { if (u) setUser((prev) => prev || u); }).catch(() => {}).finally(() => setReady(true));
    return off;
  }, []);

  const pull = useCallback(async (u) => {
    if (pulling.current) return;
    pulling.current = true;
    setSync("syncing"); setSyncErr("");
    try {
      const remote = await cloud.load(u.id);
      const local = live.current.profile;
      const base = getOwner() && getOwner() !== u.id ? emptyProfile() : local; // la copie locale appartenait à un autre compte : on ne la mélange pas
      const merged = mergeProfiles(base, remote && remote.profile);
      if (!sameProfile(merged, local)) replaceProfile(merged);
      setOwner(u.id);
      const mine = live.current.name.trim();
      const pseudo = mine || (remote && remote.pseudo) || "";
      if (!mine && pseudo) setName(pseudo);
      if (!remote || !sameProfile(merged, remote.profile) || (remote.pseudo || "") !== pseudo) await cloud.save(u.id, merged, pseudo);
      last.current = snapOf(merged, pseudo); failed.current = "";
      pulledFor.current = u.id;
      setSync("ok");
    } catch (e) {
      setSync("error"); setSyncErr(e.message || "Synchronisation impossible.");
    } finally { pulling.current = false; }
  }, [replaceProfile, setName]);

  useEffect(() => { if (user && pulledFor.current !== user.id) pull(user); }, [user, tick, pull]);

  const push = useCallback(async () => {
    const { profile: p, name: n, user: u } = live.current;
    if (!u || pulledFor.current !== u.id) return true;
    const snap = snapOf(p, n);
    if (snap === last.current) return true;
    try { await cloud.save(u.id, p, n.trim()); last.current = snap; failed.current = ""; setSync("ok"); setSyncErr(""); return true; }
    catch (e) { failed.current = snap; setSync("error"); setSyncErr(e.message || "Sauvegarde impossible."); return false; }
  }, []);

  useEffect(() => {
    if (!user || pulledFor.current !== user.id) return undefined;
    const snap = snapOf(profile, name);
    if (snap === last.current || snap === failed.current) return undefined;
    const t = setTimeout(push, PUSH_DELAY_MS);
    return () => clearTimeout(t);
  }, [profile, name, user, sync, tick, push]);

  useEffect(() => { // on envoie tout de suite quand l'appli passe en arrière-plan ou que le réseau revient
    const flush = () => { if (document.visibilityState === "hidden") push(); };
    const back = () => { failed.current = ""; setTick((t) => t + 1); };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", push);
    window.addEventListener("online", back);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", push); window.removeEventListener("online", back); };
  }, [push]);

  const sendCode = useCallback((email) => cloud.sendCode(email), []);
  const verify = useCallback(async (email, code) => { const u = await cloud.verify(email, code); setUser(u); return u; }, []);
  const retry = useCallback(() => { failed.current = ""; setTick((t) => t + 1); }, []);
  const signOut = useCallback(async () => {
    const saved = await push();
    if (!saved) throw new Error("Ta progression n'a pas pu être sauvegardée : reste connecté jusqu'à retrouver Internet.");
    await cloud.signOut();
    pulledFor.current = null; last.current = ""; failed.current = ""; setOwner("");
    setUser(null); setSync("idle"); setSyncErr("");
    replaceProfile(emptyProfile());
  }, [push, replaceProfile]);

  return { enabled: Boolean(cloud), ready, user, sync, syncErr, sendCode, verify, signOut, retry };
}
