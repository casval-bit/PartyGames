import { useCallback, useEffect, useRef, useState } from "react";
import { loadProfile, saveProfile } from "./profileStore.js";
import { recordGame, summarize, levelOf, fixLook } from "../data/profile.js";

/** Profil local : apparence, XP, stats. Équiper un élément verrouillé est refusé. */
export function useProfile() {
  const [profile, setProfileState] = useState(loadProfile);
  const [gain, setGain] = useState(null);
  const ref = useRef(profile);

  const commit = useCallback((p) => { ref.current = p; setProfileState(p); saveProfile(p); }, []);

  const equip = useCallback((patch) => {
    const next = { ...ref.current, look: { ...ref.current.look, ...patch } };
    next.look = fixLook(next);
    commit(next);
    return next.look;
  }, [commit]);

  /** Compte la partie si `room` est une fin de partie (chaque partie = salon + numéro, comptée une seule fois). */
  const record = useCallback((room, meId) => {
    const sum = summarize(room, meId);
    if (!sum) return;
    const r = recordGame(ref.current, sum);
    if (!r.gain) return;
    commit(r.profile);
    setGain(r.gain);
  }, [commit]);

  const clearGain = useCallback(() => setGain(null), []);
  return { profile, gain, clearGain, equip, record, level: levelOf(profile.xp) };
}

/** À appeler avec la room courante : enregistre la partie dès qu'elle se termine. */
export function useGameRecorder(room, meId, record) {
  useEffect(() => {
    if (room) record(room, meId);
  }, [room && room.phase, room && room.gameNo, meId, record]); // eslint-disable-line react-hooks/exhaustive-deps
}
