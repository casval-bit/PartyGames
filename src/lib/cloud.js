// Compte joueur : connexion par e-mail (code à 6 chiffres envoyé par Supabase Auth) + profil sauvegardé dans la table `profiles`.
// Pas de mot de passe, pas de lien à ouvrir (un lien ne reviendrait pas dans l'appli Android) : on tape le code reçu.
// Les deux implémentations (réelle / simulée pour les tests) ont exactement la même interface.
import { ONLINE, MOCK_AUTH } from "../config.js";
import { getSupa } from "../net/supa.js";

export const isEmail = (s) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(String(s).trim());
const wrap = (e, fallback) => { const err = new Error(friendly(e) || fallback); err.code = e && (e.code || e.status); return err; };

/** Messages d'erreur Supabase -> français. */
export function friendly(e) {
  const m = String((e && e.message) || e || "").toLowerCase();
  const code = String((e && e.code) || "").toLowerCase();
  if (!m) return "";
  if (code === "over_email_send_rate_limit" || m.includes("rate limit") || m.includes("security purposes") || e.status === 429)
    return "Trop d'e-mails envoyés pour l'instant. Réessaie dans quelques minutes.";
  if (m.includes("not authorized") || m.includes("not part of the project"))
    return "Cette adresse n'est pas autorisée : le serveur d'e-mails de test n'envoie qu'aux membres du projet (voir README, « SMTP personnalisé »).";
  if (m.includes("expired") || m.includes("invalid") && m.includes("otp") || m.includes("token has expired") || m.includes("invalid token"))
    return "Code incorrect ou expiré. Redemande un code.";
  if (m.includes("invalid") && m.includes("email")) return "Adresse e-mail invalide.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) return "Pas de connexion à Internet.";
  return "Erreur : " + (e.message || m);
}

/* ------------------------------ vrai serveur ------------------------------ */
function realBackend() {
  const hasSession = () => { // évite de charger le client Supabase si personne n'a jamais ouvert de session
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true; } } catch { /* stockage indisponible */ }
    return false;
  };
  const user = (u) => (u ? { id: u.id, email: u.email || "" } : null);
  return {
    async restore() {
      if (!hasSession()) return null;
      const s = await getSupa();
      const { data } = await s.auth.getSession();
      return user(data && data.session && data.session.user);
    },
    onChange(cb) {
      let off = () => {}, dead = false;
      getSupa().then((s) => {
        if (dead) return;
        const { data } = s.auth.onAuthStateChange((ev, session) => { if (ev === "SIGNED_OUT") cb(null); else if (session) cb(user(session.user)); });
        off = () => data.subscription.unsubscribe();
      });
      return () => { dead = true; off(); };
    },
    async sendCode(email) {
      const s = await getSupa();
      const { error } = await s.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw wrap(error, "Envoi impossible.");
    },
    async verify(email, code) {
      const s = await getSupa();
      const { data, error } = await s.auth.verifyOtp({ email: email.trim(), token: String(code).replace(/\D/g, ""), type: "email" });
      if (error || !data || !data.user) throw wrap(error, "Code incorrect ou expiré.");
      return user(data.user);
    },
    async signOut() { const s = await getSupa(); await s.auth.signOut(); },
    async load(uid) {
      const s = await getSupa();
      const { data, error } = await s.from("profiles").select("data,pseudo,updated_at").eq("user_id", uid).maybeSingle();
      if (error) throw wrap(error, "Lecture du profil impossible.");
      return data ? { profile: data.data, pseudo: data.pseudo || "" } : null;
    },
    async save(uid, profile, pseudo) {
      const s = await getSupa();
      const { error } = await s.from("profiles").upsert({ user_id: uid, data: profile, pseudo: String(pseudo || "").slice(0, 16), updated_at: new Date().toISOString() });
      if (error) throw wrap(error, "Sauvegarde impossible.");
    },
  };
}

/* ------------------- faux serveur (tests automatiques seulement) ------------------- */
// « Cloud » gardé dans localStorage (clé ph-mock-cloud) pour pouvoir simuler un deuxième téléphone en recopiant cette clé.
function mockBackend() {
  const KEY = "ph-mock-cloud", SES = "ph-mock-session";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { users: {}, profiles: {} }; } catch { return { users: {}, profiles: {} }; } };
  const write = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } };
  const listeners = new Set();
  const fire = (u) => listeners.forEach((f) => f(u));
  const fail = () => { try { return localStorage.getItem("ph-mock-fail") === "1"; } catch { return false; } };
  let pending = null;
  return {
    async restore() { try { return JSON.parse(localStorage.getItem(SES)); } catch { return null; } },
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async sendCode(email) { if (fail()) throw new Error("Pas de connexion à Internet."); pending = email.trim().toLowerCase(); },
    async verify(email, code) {
      if (String(code).replace(/\D/g, "") !== "123456" || pending !== email.trim().toLowerCase()) throw new Error("Code incorrect ou expiré. Redemande un code.");
      const d = read(); const em = pending;
      const id = d.users[em] || ("u-" + em.replace(/[^a-z0-9]/g, ""));
      d.users[em] = id; write(d);
      const u = { id, email: em };
      localStorage.setItem(SES, JSON.stringify(u)); fire(u); return u;
    },
    async signOut() { localStorage.removeItem(SES); fire(null); },
    async load(uid) { if (fail()) throw new Error("Pas de connexion à Internet."); const r = read().profiles[uid]; return r ? { profile: r.data, pseudo: r.pseudo } : null; },
    async save(uid, profile, pseudo) { if (fail()) throw new Error("Pas de connexion à Internet."); const d = read(); d.profiles[uid] = { data: profile, pseudo: String(pseudo || "").slice(0, 16) }; write(d); },
  };
}

export const cloud = MOCK_AUTH ? mockBackend() : ONLINE ? realBackend() : null;
