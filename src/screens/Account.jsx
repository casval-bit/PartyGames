import { useEffect, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { isEmail } from "../lib/cloud.js";
import { progressOf } from "../data/profile.js";

const RESEND_S = 30;

export default function Account({ acc, profile, onBack }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email"); // email | code
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const [confirmOut, setConfirmOut] = useState(false);
  const pr = progressOf(profile.xp);

  useEffect(() => { if (wait <= 0) return undefined; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const send = async () => {
    if (busy || !isEmail(email)) return;
    setBusy(true); setErr("");
    try { await acc.sendCode(email); setStep("code"); setCode(""); setWait(RESEND_S); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const check = async () => {
    if (busy || code.replace(/\D/g, "").length < 6) return;
    setBusy(true); setErr("");
    try { await acc.verify(email, code); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const out = async () => {
    setBusy(true); setErr("");
    try { await acc.signOut(); setConfirmOut(false); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const head = (
    <div className="row" style={{ gap: 10 }}>
      <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
      <div><div className="eyebrow">Compte</div><h2 style={{ fontSize: "1.25rem" }}>{acc.user ? "Connecté" : "Se connecter"}</h2></div>
    </div>
  );

  if (!acc.enabled) {
    return (
      <div className="screen acct">
        {head}
        <div className="acard">
          <h3>Comptes indisponibles</h3>
          <p>La connexion par e-mail a besoin du mode en ligne (Supabase). Tant qu'il n'est pas configuré, ton profil reste enregistré sur ce téléphone.</p>
        </div>
      </div>
    );
  }

  if (!acc.ready) return <div className="screen acct">{head}<div className="acard"><p>Chargement…</p></div></div>;

  if (acc.user) {
    const st = acc.sync === "ok" ? ["ok", "Progression sauvegardée"] : acc.sync === "error" ? ["bad", acc.syncErr || "Synchronisation impossible"] : ["wait", "Synchronisation…"];
    return (
      <div className="screen acct">
        {head}
        <div className="acard who">
          <Avatar look={profile.look} size={64} />
          <div>
            <b data-testid="acc-email">{acc.user.email}</b>
            <small>Niveau {pr.lv} · {profile.stats.played} partie{profile.stats.played > 1 ? "s" : ""}</small>
          </div>
        </div>
        <div className={"astate " + st[0]} role="status" data-testid="acc-sync"><i />{st[1]}</div>
        {acc.sync === "error" && <button className="btn small" onClick={acc.retry}>Réessayer</button>}
        <p className="muted pnote" style={{ textAlign: "left" }}>
          Ton niveau, tes statistiques, tes succès et ton avatar sont sauvegardés sur ton compte. Connecte-toi avec la même adresse sur un autre téléphone (ou après une réinstallation) pour les retrouver.
        </p>
        {err && <div className="toast" role="alert"><span>{err}</span></div>}
        {!confirmOut ? (
          <button className="btn ghost" onClick={() => { setErr(""); setConfirmOut(true); }}>Se déconnecter</button>
        ) : (
          <div className="acard">
            <p>Ce téléphone repartira d'un profil vide. Ton compte, lui, garde tout.</p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setConfirmOut(false)} disabled={busy}>Annuler</button>
              <button className="btn primary" style={{ flex: 1 }} onClick={out} disabled={busy}>Se déconnecter</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen acct">
      {head}
      <div className="acard">
        <h3>Garde ta progression</h3>
        <p>Connecte-toi avec ton e-mail : ton niveau, tes avatars et tes statistiques sont sauvegardés sur ton compte, pas sur le téléphone. Pas de mot de passe : on t'envoie un code.</p>
        {profile.stats.played > 0 && <p className="muted">Ta progression actuelle sur ce téléphone sera ajoutée à ton compte.</p>}
      </div>

      {step === "email" ? (
        <form className="afield" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="eyebrow" htmlFor="acc-mail">Ton adresse e-mail</label>
          <input id="acc-mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" maxLength={254}
            value={email} placeholder="toi@exemple.fr" onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" type="submit" disabled={busy || !isEmail(email)}>{busy ? "Envoi…" : "Recevoir le code"}</button>
        </form>
      ) : (
        <form className="afield" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <p className="muted">Code envoyé à <b>{email.trim()}</b>. Regarde aussi dans les spams.</p>
          <label className="eyebrow" htmlFor="acc-code">Code reçu par e-mail</label>
          <input id="acc-code" className="codein" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
            value={code} placeholder="••••••" onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button className="btn primary" type="submit" disabled={busy || code.length < 6}>{busy ? "Vérification…" : "Valider"}</button>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn small" type="button" style={{ flex: 1 }} disabled={busy || wait > 0} onClick={send}>{wait > 0 ? `Renvoyer (${wait} s)` : "Renvoyer le code"}</button>
            <button className="btn small ghost" type="button" style={{ flex: 1 }} onClick={() => { setStep("email"); setErr(""); }}>Changer d'adresse</button>
          </div>
        </form>
      )}
      {err && <div className="toast" role="alert" data-testid="acc-err"><span>{err}</span></div>}
    </div>
  );
}
