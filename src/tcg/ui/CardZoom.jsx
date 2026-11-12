// Zoom sur une carte : grande carte (qui s'incline sous le doigt, reflet des brillantes), état en jeu, mots-clés expliqués,
// actions possibles, et illustration personnalisée (choisir une image depuis le téléphone).
import { useEffect, useRef, useState } from "react";
import { CARD, FAMILY, TYPE_BONUS, subOf, subWords } from "../cards/index.js";
import { KEYWORDS, RARITY, CARD_TYPES, TYPE_NAME } from "../rules.js";
import { starterById } from "../deck.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, FamilyFace, PlotFace, RichText, TYPE_ICON } from "./Card.jsx";
import { useArt, fileToArt, setArt, removeArt, artFile, remote } from "./artStore.js";
import { ONLINE } from "../../config.js";

const KW_LONG = { celebre: "Célèbre", discret: "Discret", intimidation: "Intimidation", genie: "Génie", pillard: "Pillard", duel: "Duel" };

function useTilt() {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--ry", `${(x - 0.5) * 22}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 18}deg`);
    el.style.setProperty("--fx", `${x * 100}%`); el.style.setProperty("--fy", `${y * 100}%`);
    el.style.setProperty("--sx", `${x * 100}%`); el.style.setProperty("--sy", `${y * 100}%`);
  };
  const leave = () => { const el = ref.current; if (el) for (const k of ["--rx", "--ry"]) el.style.setProperty(k, "0deg"); };
  return { ref, onPointerMove: move, onPointerDown: move, onPointerLeave: leave, onPointerUp: leave };
}

function ArtTools({ d }) {
  const custom = useArt(d.id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const img = await fileToArt(file);
      const r = await setArt(d.id, img);
      setMsg(r === "shared" ? "Illustration enregistrée et partagée avec tes amis." : ONLINE ? "Illustration enregistrée sur ce téléphone (connecte-toi à ton compte pour la partager)." : "Illustration enregistrée sur ce téléphone.");
      sfx.apply();
    } catch (err) { setMsg(err.message || "Image refusée."); sfx.error(); }
    setBusy(false);
  };
  return (
    <div className="tz-box">
      <h4>Illustration</h4>
      <p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>
        {custom ? "Cette carte utilise une illustration choisie." : "Illustration générée par l'appli. Tu peux la remplacer par une image de ton téléphone."}
        {" "}Pour en importer beaucoup d'un coup (Collection › Illustrations), nomme le fichier « {artFile(d)} ».
      </p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="btn small" style={{ cursor: "pointer" }} aria-disabled={busy}>
          <Icon name="image" size={16} />{busy ? "Préparation…" : custom ? "Changer l'image" : "Choisir une image"}
          <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
        </label>
        {custom && <button className="btn small ghost" onClick={() => { removeArt(d.id); setMsg("Illustration retirée."); }}><Icon name="trash" size={16} />Retirer</button>}
      </div>
      {remote.state === "missing" && <p className="muted" style={{ margin: 0, fontSize: ".76rem" }}>Partage entre amis pas encore activé : il faut exécuter une fois supabase/tcg_art.sql (voir README).</p>}
      {msg && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--ok-pale)" }}>{msg}</p>}
    </div>
  );
}

/**
 * Carte zoomée. Props : id (carte ou scénario) | fam (+ pt) ; foil ; inst (pion en jeu) ; who (nom du contrôleur) ;
 * owned { n, f } ; acts [{ label, onClick, kind, disabled, icon }] ; art (outils d'illustration) ; onOpen(id) pour zoomer un objet attaché.
 */
export default function CardZoom({ id, fam, pt, foil, inst, who, owned, acts = [], art = false, note, onClose, onOpen }) {
  const tilt = useTilt();
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const d = id ? CARD[id] : null;
  if (!d && !fam) return null;
  const plot = d && d.type === "plot";
  const f = d ? FAMILY[plot ? d.univ : d.fam] : FAMILY[fam];
  const kws = d ? Object.keys(d.kw || {}).filter((k) => KEYWORDS[k]) : [];
  const gained = inst && inst.kw ? inst.kw.filter((k) => !kws.includes(k)) : [];
  const st = d && d.st ? starterById(d.st) : null;
  return (
    <div className="tz-wrap" role="dialog" aria-label={d ? d.name : f.name} onClick={onClose}>
      <button className="iconbtn tz-close" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
      <div className={"tz-card" + (plot ? " land" : "")} onClick={(e) => e.stopPropagation()} {...tilt}>
        {d ? (plot ? <PlotFace d={d} big /> : <CardFace d={d} big foil={foil} str={inst ? inst.s : undefined} tilt />) : <FamilyFace fam={fam} pt={pt} big />}
      </div>
      <div className="tz-info" onClick={(e) => e.stopPropagation()}>
        {note && <div className="tz-box" style={{ borderColor: "rgba(94,225,255,.5)" }}>{note}</div>}
        {acts.length > 0 && (
          <div className="tz-acts">
            {acts.map((a, i) => <button key={i} className={"btn " + (a.kind || (i === 0 ? "primary" : "ghost"))} disabled={a.disabled} onClick={() => { a.onClick(); }}>{a.icon && <Icon name={a.icon} size={18} />}{a.label}</button>)}
          </div>
        )}
        {inst && d && (
          <div className="tz-box">
            <h4>En jeu{who ? ` · ${who}` : ""}</h4>
            <div className="tz-line">
              {d.type === "char" && <span className="pill">Force {inst.s}{inst.s !== d.str ? ` (imprimée ${d.str})` : ""}</span>}
              <span className={"pill " + (inst.k ? "warn" : "ok")}>{inst.k ? "Agenouillé" : "Debout"}</span>
              {inst.pw > 0 && <span className="pill vio">{inst.pw} Pouvoir</span>}
              {inst.dup > 0 && <span className="pill dim">{inst.dup} doublon{inst.dup > 1 ? "s" : ""} (le sauve d'une mort)</span>}
              {d.type === "char" && ["combat", "ruse", "influence"].map((t) => (inst.ic || "").includes(t[0].toUpperCase()) && <span key={t} className="pill dim"><Icon name={TYPE_ICON[t]} size={12} />{TYPE_NAME[t]}</span>)}
            </div>
            {inst.att && inst.att.length > 0 && (
              <>
                <h4 style={{ marginTop: 4 }}>Objets attachés</h4>
                <div className="tz-att">{inst.att.map((a) => <CardFace key={a.u} d={CARD[a.d]} w={92} onClick={onOpen ? () => onOpen(a.d) : undefined} />)}</div>
              </>
            )}
          </div>
        )}
        {(kws.length > 0 || gained.length > 0) && (
          <div className="tz-box tz-kw">
            <h4>Mots-clés</h4>
            {kws.map((k) => <div key={k}><b>{KEYWORDS[k].name}{typeof d.kw[k] === "number" ? ` (${d.kw[k]})` : ""}</b> : {KEYWORDS[k].text}</div>)}
            {gained.map((k) => <div key={k}><b>{KW_LONG[k] || k}</b> (gagné en cours de partie) : {(KEYWORDS[k] || {}).text}</div>)}
          </div>
        )}
        {d && !plot && (
          <div className="tz-box">
            <h4>Fiche</h4>
            <div className="tz-line">
              <span className="pill" style={{ background: `color-mix(in srgb, ${f.color} 25%, transparent)`, borderColor: f.color }}><Icon name={f.icon} size={12} />{f.name}</span>
              <span className="pill dim">{CARD_TYPES[d.type]}</span>
              <span className="pill" style={{ color: RARITY[d.r].gem, borderColor: RARITY[d.r].gem }}>{RARITY[d.r].name}</span>
              {d.uni && <span className="pill dim">Unique</span>}
              {d.pt && d.pt.map((t) => <span key={t} className="pill" style={{ borderColor: (TYPE_BONUS[t] || {}).color }}>{subWords(d.fam).One} {(TYPE_BONUS[t] || {}).name || t}</span>)}
            </div>
            {d.uni && <p style={{ margin: 0, fontSize: ".78rem", color: "var(--txt-2)" }}>Unique : un seul exemplaire en jeu ; une copie en plus devient un doublon (elle le sauve d'une mort). Une seule version de {d.name} par deck.</p>}
            {st && <p style={{ margin: 0, fontSize: ".78rem", color: "#ffe6a8" }}>Exclusive au deck de départ « {st.name} » : ne sort jamais des boosters.</p>}
            {owned && <p style={{ margin: 0, fontSize: ".82rem" }}>Dans ta collection : <b>{owned.n || 0}</b> normale{(owned.n || 0) > 1 ? "s" : ""}{owned.f ? <>, <b>{owned.f}</b> brillante{owned.f > 1 ? "s" : ""}</> : null}.</p>}
          </div>
        )}
        {plot && <div className="tz-box"><h4>Scénario</h4><p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Revenu : l'or de la phase de Recrutement. Initiative : la plus haute choisit le premier joueur. Revendication : ce que coûte un défi perdu contre vous. Réserve : cartes gardées en main à la fin du round.</p></div>}
        {!d && <div className="tz-box"><h4>Famille</h4><p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Cet effet est toujours actif pour le joueur de cette famille.</p>{subOf(fam, pt) && <p style={{ margin: 0, fontSize: ".82rem" }}>{subWords(fam).One} choisi{subWords(fam).fem ? "e" : ""} : <b>{subOf(fam, pt).name}</b> — <RichText text={subOf(fam, pt).abs.map((a) => a.text).join(" ")} /></p>}</div>}
        {art && d && !plot && <ArtTools d={d} />}
      </div>
    </div>
  );
}
