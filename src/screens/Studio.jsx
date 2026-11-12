// Personnalisation (« Scanner ») : le Doudou en grand sur sa plateforme, des zones à toucher (tête, visage, corps, dos, pieds).
// Toucher une zone : la caméra s'en approche, un anneau de scan la balaie et une fenêtre montre les apparences débloquées.
// On essaie (aperçu en direct), on applique, la fenêtre se ferme et le personnage reprend tout l'écran.
import { useMemo, useRef, useState } from "react";
import AvatarStage from "../avatar3d/Stage.jsx";
import { Avatar3DImg } from "../avatar3d/Avatar3D.jsx";
import { SLOTS, SLOT_BY, ZONES, ZONE_TABS, ZONE_VIEW, decodeX, encodeX, randomX, setSlot } from "../avatar3d/schema.js";
import { isUnlocked, ruleText, xOf } from "../data/profile.js";
import { Icon } from "../ui/Icon.jsx";
import EmoteWheel from "../ui/EmoteWheel.jsx";
import { sfx } from "../lib/sfx.js";
import "../avatar3d/studio.css";

const ZICON = { tete: "user", visage: "smile", corps: "shirt", dos: "backpack", pieds: "feet" };
const tabLabel = (t) => t.label || SLOT_BY[t.id].label;
const HOT_LEFT = new Set(["tete", "dos"]);

/** Une option de forme (vignette 3D de ton personnage avec la pièce) ou une pastille de couleur. */
function Opt({ slot, i, x, base, on, open, view, onPick }) {
  const o = slot.opts[i];
  if (slot.color) {
    return (
      <button className={"stsw" + (on ? " on" : "") + (open ? "" : " locked") + (o.hex ? "" : " auto")} style={o.hex ? { "--sw": o.hex } : undefined} aria-pressed={on} title={o.name}
        aria-label={o.name + (open ? "" : " (verrouillé)")} onClick={() => onPick(slot, i)}>
        {!open && <Icon name="lock" size={13} />}
      </button>
    );
  }
  return (
    <button className={"sttile" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} onClick={() => onPick(slot, i)} data-opt={slot.id + ":" + o.id}>
      <span className="sttimg scanv"><Avatar3DImg x={setSlot(base, slot.id, i)} view={view} size={150} fallback={<span className="stph" />} /></span>
      <span className="sttname">{o.name}</span>
      {!open && <span className="sttlock"><Icon name="lock" size={13} /></span>}
    </button>
  );
}

export default function Studio({ profile, equip, onClose }) {
  const saved = useMemo(() => xOf(profile.look), [profile.look]);
  const [px, setPx] = useState(saved);                 // aperçu (pas encore appliqué)
  const [zone, setZone] = useState(null);              // zone ouverte
  const [tab, setTab] = useState(0);
  const [hint, setHint] = useState("");
  const [wheel, setWheel] = useState(false);
  const stage = useRef(null), hot = useRef({}), undo = useRef([]);
  const arr = decodeX(px);
  const parts = SLOTS.filter((s) => !s.color), total = parts.reduce((n, s) => n + s.opts.length, 0), owned = parts.reduce((n, s) => n + s.opts.filter((o) => isUnlocked(profile, o.rule)).length, 0);

  const openZone = (z) => { setZone(z); setTab(0); setHint(""); sfx.open(); sfx.scan(); stage.current && stage.current.scan(z); };
  const closeZone = (apply) => {
    if (apply) {
      if (px !== saved) { undo.current.push(saved); equip({ x: px }); }
      sfx.apply(); stage.current && stage.current.scan("full");
    } else { setPx(saved); sfx.close(); }
    setZone(null); setHint("");
  };
  const pick = (slot, i) => {
    const o = slot.opts[i];
    if (!isUnlocked(profile, o.rule)) { setHint(`${o.name} : ${ruleText(o.rule)}`); sfx.error(); return; }
    const a = decodeX(px); a[SLOT_BY[slot.id].i] = i;
    setPx(encodeX(a)); sfx.select();
    setHint(`${slot.label} : ${o.name}`);
  };
  const random = () => { const r = randomX(Math.random, (rule) => isUnlocked(profile, rule)); undo.current.push(saved); equip({ x: r }); setPx(r); sfx.materialize(); };
  const back = () => { const p = undo.current.pop(); if (p) { equip({ x: p }); setPx(p); } };
  const onHot = (list) => {
    const first = list.length && hot.current[list[0].id];
    const W = first && first.parentElement ? first.parentElement.clientWidth : 0;
    for (const h of list) {
      const el = hot.current[h.id]; if (!el) continue;
      if (!el._lw) el._lw = ((el.querySelector("span") || {}).offsetWidth || 70) + 40;   // étiquette + trait
      // l'étiquette va du côté prévu, sauf si elle sortirait de l'écran (Doudou large, personnage tourné)
      let left = HOT_LEFT.has(h.id);
      if (left && h.x - el._lw < 4) left = false;
      else if (!left && W && h.x + el._lw > W - 4) left = true;
      el.classList.toggle("l", left);
      el.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px)`;
      el.style.opacity = h.ok ? "" : "0";
    }
  };
  const tabs = zone ? ZONE_TABS[zone] : [];
  const T = tabs[tab];
  const view = zone ? ZONE_VIEW[zone] : "full";
  const section = (sid) => {
    const s = SLOT_BY[sid], cur = arr[s.i];
    const order = s.opts.map((_, i) => i).sort((a, b) => (isUnlocked(profile, s.opts[b].rule) ? 1 : 0) - (isUnlocked(profile, s.opts[a].rule) ? 1 : 0) || a - b);
    const firstLocked = order.findIndex((i) => !isUnlocked(profile, s.opts[i].rule));
    return (
      <section className="stsec" key={sid} data-slot={sid}>
        <h4>{s.label}<small>{s.opts[cur].name}</small></h4>
        <div className={s.color ? "stsws" : "sttiles"}>
          {order.map((i, k) => (
            <span key={i} style={{ display: "contents" }}>
              {k === firstLocked && k > 0 && !s.color && <span className="stdiv"><Icon name="lock" size={12} /> À débloquer</span>}
              <Opt slot={s} i={i} x={px} base={px} on={cur === i} open={isUnlocked(profile, s.opts[i].rule)} view={sid === "espece" ? "bust" : view} onPick={pick} />
            </span>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className={"studio" + (zone ? " sheet-open" : "")} role="dialog" aria-label="Personnaliser mon personnage" data-testid="studio">
      <AvatarStage ref={stage} x={px} zone={zone || "full"} sheet={zone ? 0.6 : 0} top={64} bottom={zone ? 0 : 150} onHotspots={onHot} />

      <header className="st-top">
        <button className="iconbtn" onClick={() => (zone ? closeZone(false) : onClose())} aria-label="Retour" data-testid="studio-back"><Icon name="back" /></button>
        <div className="st-title"><span className="eyebrow">Scanner</span><b>Personnalisation</b></div>
        <span className="pill" title="Pièces débloquées">{owned}/{total}</span>
      </header>

      {!zone && (
        <div className="st-hots" aria-hidden="false">
          {ZONES.map((z) => (
            <button key={z.id} ref={(el) => { hot.current[z.id] = el; }} className={"st-hot" + (HOT_LEFT.has(z.id) ? " l" : "")} onClick={() => openZone(z.id)} data-testid={"zone-" + z.id} aria-label={"Modifier : " + z.label}>
              <i aria-hidden="true" /><span>{z.label}</span>
            </button>
          ))}
        </div>
      )}

      {!zone && (
        <footer className="st-bar">
          <nav className="st-zones">
            {ZONES.map((z) => <button key={z.id} onClick={() => openZone(z.id)}><Icon name={ZICON[z.id]} size={20} /><span>{z.label}</span></button>)}
          </nav>
          <div className="st-acts">
            <button className="iconbtn" onClick={back} disabled={!undo.current.length} aria-label="Annuler la dernière modification"><Icon name="undo" /></button>
            <button className="btn primary st-emote" onClick={() => setWheel(true)} data-testid="studio-emotes"><Icon name="smile" /> Émotes</button>
            <button className="iconbtn" onClick={random} aria-label="Personnage au hasard" data-testid="av-random"><Icon name="dice" /></button>
          </div>
        </footer>
      )}

      {zone && (
        <section className="st-sheet" data-testid="studio-sheet">
          <header className="st-sh-head">
            <span className="st-zico" aria-hidden="true"><Icon name={ZICON[zone]} size={20} /></span>
            <div><span className="eyebrow">Zone</span><b>{ZONES.find((z) => z.id === zone).label}</b></div>
            <button className="iconbtn" onClick={() => closeZone(false)} aria-label="Fermer sans appliquer"><Icon name="close" /></button>
          </header>
          {tabs.length > 1 && (
            <div className="st-tabs" role="tablist">
              {tabs.map((t, i) => <button key={t.id} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => { setTab(i); setHint(""); }}>{tabLabel(t)}</button>)}
            </div>
          )}
          <div className="st-body">
            {T && [T.id, ...(T.extra || []), ...(T.colors || [])].map(section)}
          </div>
          <footer className="st-sh-foot">
            <p className="st-hint" role="status">{hint || "Touche une apparence pour l'essayer."}</p>
            <div className="row">
              <button className="btn ghost" onClick={() => closeZone(false)}>Annuler</button>
              <button className="btn primary" onClick={() => closeZone(true)} data-testid="studio-apply"><Icon name="check" /> Appliquer</button>
            </div>
          </footer>
        </section>
      )}

      {wheel && <EmoteWheel onPick={(id) => { stage.current && stage.current.emote(id); setWheel(false); }} onClose={() => setWheel(false)} />}
    </div>
  );
}
