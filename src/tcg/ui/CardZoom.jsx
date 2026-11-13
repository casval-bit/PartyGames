// Zoom sur une carte : grande carte (qui s'incline un peu sous le doigt ou la souris, reflet des brillantes), état en jeu,
// mots-clés expliqués, actions possibles, et illustration personnalisée (choisir une image depuis l'appareil).
// Depuis l'album, on feuillette les cartes (flèches, ou ← → au clavier) et les cartes pas encore obtenues restent grisées.
import { useEffect, useRef, useState } from "react";
import { CARD, FAMILY, TYPE_BONUS, subOf, subWords } from "../cards/index.js";
import { KEYWORDS, RARITY, CARD_TYPES, TYPE_NAME } from "../rules.js";
import { starterById } from "../deck.js";
import { alwaysFoil, shineCost } from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, FamilyFace, PlotFace, RichText, TYPE_ICON } from "./Card.jsx";
import { useArtSource, fileToArt, prepareArt, setArt, removeArt, artFile, remote, recentFile, rememberFile } from "./artStore.js";
import { cardColors } from "./art.js";
import { ONLINE } from "../../config.js";
import { APPAREIL } from "../../lib/device.js";

const KW_LONG = { celebre: "Célèbre", discret: "Discret", intimidation: "Intimidation", genie: "Génie", pillard: "Pillard", duel: "Duel" };

/**
 * Inclinaison de la carte zoomée : elle suit la souris (survol) ou le doigt (on la tient et on glisse), de quelques degrés,
 * et revient doucement en place quand on la lâche. Sans contact, elle oscille un peu toute seule (CSS : tzIdle).
 * Sur téléphone, incliner l'appareil fait aussi pencher la carte (gyroscope, quand le navigateur le donne).
 * Le reflet des brillantes suit le mouvement : --hi (0 à 1) monte avec l'inclinaison et quand on agite la carte, puis retombe ;
 * --fa oriente les bandes arc-en-ciel selon la direction, --sx / --sy placent l'éclat de lumière.
 */
function useTilt() {
  const ref = useRef(null);
  const held = useRef(false);
  const st = useRef({ x: 0.5, y: 0.5, t: 0, hi: 0, want: 0, raf: 0, base: null, last: 0 });
  const paint = () => {
    const el = ref.current, s = st.current;
    s.raf = 0;
    if (!el) return;
    s.hi += (s.want - s.hi) * 0.18;
    s.want *= held.current ? 0.985 : 0.93; // l'élan retombe tout seul
    el.style.setProperty("--hi", s.hi.toFixed(3));
    if (s.hi > 0.004 || s.want > 0.004) s.raf = requestAnimationFrame(paint);
  };
  const kick = () => { if (!st.current.raf) st.current.raf = requestAnimationFrame(paint); };
  const apply = (x, y, fromHand) => {
    const el = ref.current, s = st.current;
    if (!el) return;
    const now = performance.now(), dt = Math.max(8, now - (s.t || now - 16));
    const speed = Math.hypot(x - s.x, y - s.y) / dt * 1000; // largeur de carte par seconde
    s.x = x; s.y = y; s.t = now;
    const dx = x - 0.5, dy = y - 0.5, tilt = Math.min(1, Math.hypot(dx, dy) * 2.2);
    s.want = Math.min(1, Math.max(s.want, 0.25 + 0.55 * tilt + Math.min(0.5, speed * 0.12)));
    if (fromHand) el.classList.add("held");
    el.style.setProperty("--ry", `${dx * 20}deg`);
    el.style.setProperty("--rx", `${-dy * 16}deg`);
    el.style.setProperty("--fx", `${x * 100}%`); el.style.setProperty("--fy", `${y * 100}%`);
    el.style.setProperty("--sx", `${x * 100}%`); el.style.setProperty("--sy", `${y * 100}%`);
    el.style.setProperty("--fa", `${Math.round(115 + dx * 70 - dy * 40)}deg`);
    kick();
  };
  const set = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    apply(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("held");
    for (const k of ["--rx", "--ry"]) el.style.setProperty(k, "0deg");
    st.current.want = 0; kick();
  };
  // téléphone : l'inclinaison de l'appareil (par rapport à la position de départ) penche la carte et fait jouer le reflet
  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return undefined;
    const on = (e) => {
      if (held.current || e.beta == null || e.gamma == null) return;
      const s = st.current, now = performance.now();
      if (!s.base || now - s.last > 1500) s.base = { b: e.beta, g: e.gamma };
      s.last = now;
      const x = Math.min(1, Math.max(0, 0.5 + (e.gamma - s.base.g) / 50)), y = Math.min(1, Math.max(0, 0.5 + (e.beta - s.base.b) / 50));
      if (Math.abs(x - s.x) + Math.abs(y - s.y) > 0.004) apply(x, y, false);
    };
    window.addEventListener("deviceorientation", on);
    return () => { window.removeEventListener("deviceorientation", on); if (st.current.raf) cancelAnimationFrame(st.current.raf); };
  }, []);
  const down = (e) => { held.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* rien */ } set(e); };
  const move = (e) => { if (held.current || e.pointerType === "mouse") set(e); };
  const up = () => { held.current = false; reset(); };
  return { ref, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onPointerLeave: () => { if (!held.current) reset(); } };
}

/** Cadrage d'une image avant de l'enregistrer : on fait glisser l'image dans le cadre de l'illustration. */
function Framer({ draft, onMove }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const ratio = draft.box.w / draft.box.h;
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, fx: draft.fx, fy: draft.fy }; };
  const move = (e) => {
    const st = drag.current, el = ref.current;
    if (!st || !el) return;
    const bw = el.clientWidth, bh = el.clientHeight;
    const k = Math.max(bw / draft.iw, bh / draft.ih), ox = draft.iw * k - bw, oy = draft.ih * k - bh; // débord de l'image
    const c = (v) => Math.min(1, Math.max(0, v));
    onMove({ fx: ox > 1 ? c(st.fx - (e.clientX - st.x) / ox) : 0.5, fy: oy > 1 ? c(st.fy - (e.clientY - st.y) / oy) : 0.5 });
  };
  const up = () => { drag.current = null; };
  return (
    <div ref={ref} className="tz-frame" style={{ aspectRatio: String(ratio), maxWidth: ratio < 1 ? 230 : "100%", backgroundImage: `url("${draft.url}")`, backgroundPosition: `${draft.fx * 100}% ${draft.fy * 100}%` }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label="Aperçu du cadrage : fais glisser l'image" />
  );
}

function ArtTools({ d }) {
  const src = useArtSource(d.id);
  const custom = src === "me" || src === "remote"; // choisie sur un appareil (pas l'image intégrée à l'appli)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState(null); // image choisie, en cours de cadrage
  const draftUrl = draft ? draft.url : null;
  useEffect(() => () => { if (draftUrl) URL.revokeObjectURL(draftUrl); }, [draftUrl]); // libère l'aperçu quand on change d'image ou qu'on ferme
  const open = async (file) => {
    setBusy(true); setMsg("");
    try { setDraft(await prepareArt(file, d)); } catch (err) { setMsg(err.message || "Image refusée."); sfx.error(); }
    setBusy(false);
  };
  const pick = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) open(file);
  };
  const again = custom ? recentFile(d.id) : null; // image importée pendant cette session : on peut la recadrer
  const save = async () => {
    setBusy(true);
    try {
      const img = await fileToArt(draft.file, d, { fx: draft.fx, fy: draft.fy });
      const r = await setArt(d.id, img);
      rememberFile(d.id, draft.file);
      setMsg(r === "shared" ? "Illustration enregistrée et partagée avec tes amis." : ONLINE ? `Illustration enregistrée sur ${APPAREIL.ce} (connecte-toi à ton compte pour la partager).` : `Illustration enregistrée sur ${APPAREIL.ce}.`);
      setDraft(null);
      sfx.apply();
    } catch (err) { setMsg(err.message || "Image refusée."); sfx.error(); }
    setBusy(false);
  };
  return (
    <div className="tz-box">
      <h4>Illustration</h4>
      {draft ? (
        <>
          <p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Fais glisser l'image pour choisir ce qu'on voit sur la carte{d.r === "L" ? " (carte légendaire : l'illustration remplit toute la carte)" : ""}.</p>
          <Framer draft={draft} onMove={(f) => setDraft((x) => ({ ...x, ...f }))} />
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn small good" onClick={save} disabled={busy}><Icon name="check" size={16} />{busy ? "Enregistrement…" : "Valider le cadrage"}</button>
            <button className="btn small ghost" onClick={() => setDraft(null)} disabled={busy}><Icon name="close" size={16} />Annuler</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>
            {custom ? "Cette carte utilise une illustration choisie." : src === "bundle" ? "Illustration intégrée à l'appli (dossier illustrations du projet). Tu peux la remplacer ici par une autre image." : `Illustration générée par l'appli. Tu peux la remplacer par une image de ${APPAREIL.ton}.`}
            {" "}Pour en importer beaucoup d'un coup (Collection › Illustrations), nomme le fichier « {artFile(d)} ».
          </p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="btn small" style={{ cursor: "pointer" }} aria-disabled={busy}>
              <Icon name="image" size={16} />{busy ? "Préparation…" : src ? "Changer l'image" : "Choisir une image"}
              <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
            </label>
            {again && <button className="btn small" onClick={() => open(again)} disabled={busy}><Icon name="crop" size={16} />Recadrer</button>}
            {custom && <button className="btn small ghost" onClick={() => { removeArt(d.id); setMsg("Illustration retirée."); }}><Icon name="trash" size={16} />Retirer</button>}
          </div>
        </>
      )}
      {remote.state === "missing" && <p className="muted" style={{ margin: 0, fontSize: ".76rem" }}>Partage entre amis pas encore activé : il faut exécuter une fois supabase/tcg_art.sql (voir README).</p>}
      {msg && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--ok-pale)" }}>{msg}</p>}
    </div>
  );
}

/**
 * Carte zoomée. Props : id (carte ou scénario) | fam (+ pt) ; foil ; inst (pion en jeu) ; who (nom du contrôleur) ;
 * owned { n, f } ; acts [{ label, onClick, kind, disabled, icon }] ; art (outils d'illustration) ; onOpen(id) pour zoomer un objet attaché.
 * shine { jet, onShine } : jetons de brillance du joueur et rendre brillante cette carte (collection ; cartes de coût 0 à 6).
 * missing : carte pas encore obtenue (grisée) ; onPrev / onNext / pos : feuilleter (album).
 */
export default function CardZoom({ id, fam, pt, foil, missing = false, inst, who, owned, acts = [], art = false, note, onClose, onOpen, onPrev, onNext, pos, shine }) {
  const tilt = useTilt();
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) onPrev();
      else if (e.key === "ArrowRight" && onNext && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) onNext();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, onPrev, onNext]);
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
      <div className="tz-stage" onClick={(e) => e.stopPropagation()}>
        <div key={id || fam} className={"tz-card" + (plot ? " land" : "")} {...tilt}>
          {/* tranche de la carte (épaisseur en 3D), de la couleur de son cadre : voir .tz-3d dans tcg.css */}
          <div className={"tz-3d " + (plot ? "plot" : d ? `r-${d.r}${foil && !missing && !alwaysFoil(d) ? " lite" : ""}${missing ? " missing" : ""}` : "r-E")}
            style={{ "--fc": d && !plot ? cardColors(d).c : (f || FAMILY.neutre).color }}>
            {[1, 2, 3, 4, 5].map((z) => <i key={z} className={"tz-slab" + (z === 5 ? " lo" : "")} style={{ "--z": z }} aria-hidden="true" />)}
            {d ? (plot ? <PlotFace d={d} big /> : <CardFace d={d} big foil={foil && !missing} missing={missing} str={inst ? inst.s : undefined} tilt />) : <FamilyFace fam={fam} pt={pt} big />}
          </div>
        </div>
        {(onPrev || onNext) && (
          <div className="tz-nav">
            <button className="iconbtn" onClick={onPrev} disabled={!onPrev} aria-label="Carte précédente"><Icon name="back" /></button>
            {pos && <span>{pos}</span>}
            <button className="iconbtn" onClick={onNext} disabled={!onNext} aria-label="Carte suivante"><Icon name="next" /></button>
          </div>
        )}
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
              {(foil || alwaysFoil(d)) && !missing && <span className="pill tz-foil">{alwaysFoil(d) ? "Brillante (toutes les cartes 7)" : "Brillante"}</span>}
              {d.pt && d.pt.map((t) => <span key={t} className="pill" style={{ borderColor: (TYPE_BONUS[t] || {}).color }}>{subWords(d.fam).One} {(TYPE_BONUS[t] || {}).name || t}</span>)}
            </div>
            {d.type !== "plot" && d.cost >= 7
              ? <p style={{ margin: 0, fontSize: ".78rem", color: "var(--txt-2)" }}>Carte 7 unique : un seul exemplaire par deck.{d.uni ? ` Une seule version de ${d.name} par deck.` : ""}</p>
              : d.uni && <p style={{ margin: 0, fontSize: ".78rem", color: "var(--txt-2)" }}>Unique : un seul exemplaire en jeu ; une copie en plus devient un doublon (elle le sauve d'une mort). Une seule version de {d.name} par deck.</p>}
            {st && <p style={{ margin: 0, fontSize: ".78rem", color: "#ffe6a8" }}>Exclusive au deck de départ « {st.name} » : ne sort jamais des boosters.</p>}
            {missing
              ? <p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>{st ? "Pas encore dans ta collection." : "Pas encore dans ta collection : elle sort des boosters et passe parfois dans la boutique du jour."}</p>
              : owned && (alwaysFoil(d)
                ? <p style={{ margin: 0, fontSize: ".82rem" }}>Dans ta collection : <b>{(owned.n || 0) + (owned.f || 0)}</b> brillante{(owned.n || 0) + (owned.f || 0) > 1 ? "s" : ""}.</p>
                : <p style={{ margin: 0, fontSize: ".82rem" }}>Dans ta collection : <b>{owned.n || 0}</b> normale{(owned.n || 0) > 1 ? "s" : ""}{owned.f ? <>, <b>{owned.f}</b> brillante{owned.f > 1 ? "s" : ""}</> : null}.</p>)}
          </div>
        )}
        {shine && d && !plot && !missing && !alwaysFoil(d) && owned && (owned.n || 0) + (owned.f || 0) > 0 && (
          <div className="tz-box tz-shine" data-testid="tz-shine">
            <h4>Brillance</h4>
            {owned.f > 0
              ? <p style={{ margin: 0, fontSize: ".82rem" }}>Cette carte est déjà brillante dans ta collection.</p>
              : <>
                <p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Rends un exemplaire brillant avec des jetons de brillance (tu en as <b style={{ color: "var(--txt)" }}>{shine.jet}</b>). Ils se gagnent en recyclant tes doubles et dans chaque booster.</p>
                <button className="btn good small" disabled={shine.jet < shineCost(d)} onClick={() => shine.onShine(d.id)}>
                  <Icon name="sparkles" size={16} />Rendre brillante · {shineCost(d)} jeton{shineCost(d) > 1 ? "s" : ""}
                </button>
              </>}
          </div>
        )}
        {plot && <div className="tz-box"><h4>Scénario</h4><p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Revenu : l'or de la phase de Recrutement. Initiative : la plus haute choisit le premier joueur. Revendication : ce que coûte un défi perdu contre vous. Réserve : cartes gardées en main à la fin du round.</p></div>}
        {!d && <div className="tz-box"><h4>Famille</h4><p style={{ margin: 0, fontSize: ".82rem", color: "var(--txt-2)" }}>Cet effet est toujours actif pour le joueur de cette famille.</p>{subOf(fam, pt) && <p style={{ margin: 0, fontSize: ".82rem" }}>{subWords(fam).One} choisi{subWords(fam).fem ? "e" : ""} : <b>{subOf(fam, pt).name}</b> — <RichText text={subOf(fam, pt).abs.map((a) => a.text).join(" ")} /></p>}</div>}
        {art && d && !plot && <ArtTools key={d.id} d={d} />}
      </div>
    </div>
  );
}
