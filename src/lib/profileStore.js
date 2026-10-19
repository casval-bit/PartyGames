// Copie locale du profil (localStorage) : c'est elle que l'appli lit et écrit, même hors ligne.
// Sans compte, elle ne vit que sur ce téléphone. Connecté par e-mail, elle est synchronisée avec le cloud
// (voir lib/useAccount.js) : le niveau, les stats et l'avatar suivent le joueur d'un téléphone à l'autre.
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
