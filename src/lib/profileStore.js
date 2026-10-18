// Le profil vit dans le téléphone (localStorage) : pas de compte, rien n'est envoyé à un serveur.
// Conséquence : le profil ne suit pas d'un téléphone à l'autre, et se perd si on efface les données de l'appli.
import { emptyProfile, normalizeProfile, fixLook } from "../data/profile.js";

const KEY = "ph-profile-v1";

export function loadProfile() {
  try {
    const p = normalizeProfile(JSON.parse(localStorage.getItem(KEY)));
    p.look = { ...p.look, ...fixLook(p) };
    return p;
  } catch {
    return emptyProfile();
  }
}
export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible : le profil reste en mémoire */ }
}
