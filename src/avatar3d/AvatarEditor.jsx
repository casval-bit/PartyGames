// Éditeur du personnage 3D : aperçu vivant (on le fait tourner au doigt) + onglets de pièces + fond et bordure.
import { useMemo, useRef, useState } from "react";
import "./avatar3d.css";
import { AvatarLive } from "./Avatar3D.jsx";
import { SLOTS, SLOT_BY, TABS, decodeX, encodeX, randomX, DEFAULT_X, setSlot } from "./schema.js";
import { ANIMALS } from "./animals.js";
import { Avatar3DImg } from "./Avatar3D.jsx";
import { BORDERS, COLORS, isUnlocked, ruleText, xOf } from "../data/profile.js";
import { Avatar } from "../ui/Avatar.jsx";

const TAB_FOCUS = { body: "body", costume: "body", face: "face", head: "bust", outfit: "body", extra: "body", bg: "body" };
const SLOT_FOCUS = { facec: "face", patch: "face", eyes: "face", eyec: "face", brow: "face", mouth: "face", nose: "face", beard: "face", face: "face", glasses: "face", glc: "face",
  ears: "bust", crest: "bust", hair: "bust", hairc: "bust", hat: "bust", hatc: "bust", neck: "bust", neckc: "bust", shoes: "feet", shoec: "feet" };
const Lock = () => (
  <svg className="avlock" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" /></svg>
);

export default function AvatarEditor({ profile, equip, onClose }) {
  const x = useMemo(() => xOf(profile.look), [profile.look]);
  const [tab, setTab] = useState("body"), [hint, setHint] = useState(""), [turn, setTurn] = useState(false), [focus, setFocus] = useState("body");
  const undo = useRef([]);
  const arr = decodeX(x);
  const parts = SLOTS.filter((s) => !s.color), total = parts.reduce((n, s) => n + s.opts.length, 0), owned = parts.reduce((n, s) => n + s.opts.filter((o) => isUnlocked(profile, o.rule)).length, 0);

  const setX = (nx) => {
    if (nx === x) return;
    undo.current.push(x); if (undo.current.length > 40) undo.current.shift();
    equip({ x: nx });
  };
  const suitSlot = SLOT_BY.suit, suitId = suitSlot.opts[arr[suitSlot.i]].id;
  const fixedFace = (ANIMALS[suitId] && ANIMALS[suitId].face) || {};          // yeux, sourcils… imposés par le costume (ex. la grenouille)
  const FIXED_NAMES = { eyes: "yeux", patch: "visage", brow: "sourcils", mouth: "bouche" };
  const pick = (slot, idx) => {
    const opt = slot.opts[idx];
    if (!isUnlocked(profile, opt.rule)) { setHint(`${opt.name} : ${ruleText(opt.rule)}`); return; }
    if (fixedFace[slot.id]) { setHint(`Ce costume a ses propres ${FIXED_NAMES[slot.id] || "traits"} : ils ne changent pas.`); return; }
    const a = decodeX(x); a[SLOTS.indexOf(slot)] = idx;
    setHint(slot.id === "suit" && idx ? `${opt.name} : un costume posé par-dessus ton personnage, qui garde exactement la même taille.` : `${slot.label} : ${opt.name}`);
    setFocus(SLOT_FOCUS[slot.id] || TAB_FOCUS[slot.tab] || "body");
    setX(encodeX(a));
  };
  const random = () => { setX(randomX(Math.random, (r) => isUnlocked(profile, r))); setHint("Personnage tiré au hasard — réessaie jusqu'à ce qu'il te plaise !"); };
  const back = () => { const p = undo.current.pop(); if (p) { equip({ x: p }); setHint("Modification annulée."); } };
  const slots = SLOTS.filter((s) => s.tab === tab);

  return (
    <div className="ave" data-testid="avatar-editor" role="dialog" aria-label="Personnaliser mon personnage">
      <header className="avehead">
        <button className="iconbtn" onClick={onClose} aria-label="Fermer">←</button>
        <div className="avetitle"><div className="eyebrow">Mon personnage</div><b>{owned}/{total} pièces</b></div>
        <div className="aveact">
          <button className="avebtn" onClick={back} disabled={!undo.current.length} aria-label="Annuler" title="Annuler">↶</button>
          <button className="avebtn" onClick={() => setTurn((t) => !t)} aria-pressed={turn} aria-label="Faire tourner" title="Faire tourner">⟳</button>
          <button className="avebtn dice" onClick={random} data-testid="av-random" aria-label="Au hasard" title="Au hasard">🎲</button>
        </div>
      </header>

      <div className="avestage">
        <AvatarLive x={x} focus={focus} turn={turn} />
        <div className="avelook">Glisse pour tourner</div>
      </div>

      <nav className="avetabs" role="tablist">
        {[...TABS, { id: "bg", label: "Fond", emoji: "🎨" }].map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setHint(""); setFocus(TAB_FOCUS[t.id]); }} data-testid={"avtab-" + t.id}>
            <span aria-hidden="true">{t.emoji}</span><i>{t.label}</i>
          </button>
        ))}
      </nav>

      <div className="avepanel">
        <p className="avehint" role="status">{hint || "Touche une pièce pour l'essayer. Les cadenas se débloquent en montant de niveau ou avec des succès."}</p>
        {tab !== "bg" && slots.map((s) => (
          <section className={"avs" + (fixedFace[s.id] ? " fixed" : "")} key={s.id} data-slot={s.id}>
            <h4>{s.label}<small>{fixedFace[s.id] ? "fixe pour ce costume" : s.opts[arr[SLOTS.indexOf(s)]].name}</small></h4>
            {s.id === "suit" ? (
              <div className="avchars">
                {s.opts.map((o, i) => {
                  const open = isUnlocked(profile, o.rule), on = arr[SLOTS.indexOf(s)] === i;
                  return (
                    <button key={o.id} className={"avchar" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} aria-label={o.name + (open ? "" : " (verrouillé)")} data-suit={o.id} onClick={() => pick(s, i)}>
                      <Avatar3DImg x={setSlot(DEFAULT_X, "suit", i)} view="full" size={130} fallback={<span className="avcharph" />} />
                      {!open && <Lock />}
                      <span>{i ? o.name : "Sans costume"}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
            <div className={"avopts" + (s.color ? " col" : "")}>
              {s.opts.map((o, i) => {
                const open = isUnlocked(profile, o.rule), on = arr[SLOTS.indexOf(s)] === i;
                return s.color ? (
                  <button key={o.id} className={"avsw" + (on ? " on" : "") + (open ? "" : " locked") + (o.id === "auto" ? " auto" : o.id === "body" ? " same" : "")} style={o.hex ? { "--sw": o.hex } : undefined} aria-pressed={on} aria-label={o.name + (open ? "" : " (verrouillé)")} title={o.name} onClick={() => pick(s, i)}>{!open && <Lock />}</button>
                ) : (
                  <button key={o.id} className={"avch" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} onClick={() => pick(s, i)}>{!open && <Lock />}{o.name}</button>
                );
              })}
            </div>
            )}
          </section>
        ))}
        {tab === "bg" && <>
          <section className="avs"><h4>Couleur de fond</h4>
            <div className="avopts bgs">{COLORS.map((c) => {
              const open = isUnlocked(profile, c.rule), on = profile.look.c === c.id;
              return <button key={c.id} className={"avitm" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} aria-label={c.name + (open ? "" : " (verrouillé)")}
                onClick={() => { if (open) { equip({ c: c.id }); setHint(`${c.name} équipée.`); } else setHint(`${c.name} : ${ruleText(c.rule)}`); }}>
                <Avatar look={{ ...profile.look, c: c.id }} size={50} />{!open && <Lock />}<span>{c.name}</span></button>;
            })}</div>
          </section>
          <section className="avs"><h4>Bordure</h4>
            <div className="avopts bgs">{BORDERS.map((b) => {
              const open = isUnlocked(profile, b.rule), on = profile.look.b === b.id;
              return <button key={b.id} className={"avitm" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} aria-label={b.name + (open ? "" : " (verrouillé)")}
                onClick={() => { if (open) { equip({ b: b.id }); setHint(`${b.name} équipée.`); } else setHint(`${b.name} : ${ruleText(b.rule)}`); }}>
                <Avatar look={{ ...profile.look, b: b.id }} size={50} />{!open && <Lock />}<span>{b.name}</span></button>;
            })}</div>
          </section>
        </>}
        <button className="avreset" onClick={() => { setX(DEFAULT_X); setHint("Personnage remis à zéro."); }}>Repartir de zéro</button>
      </div>
    </div>
  );
}
