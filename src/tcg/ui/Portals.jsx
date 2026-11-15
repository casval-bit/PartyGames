// Trône des Mondes : les Portails (invocations, façon gacha), dans la boutique. Deux bannières ouvertes en même temps, qui changent
// toutes les deux semaines (voir portals.js) : le Portail des Légendes (un thème à travers les univers, trois cartes 7 en vedette)
// et le Monde à l'honneur (une famille et ses cartes 7, dont une à trois en vedette). Chacune a son onglet dans la boutique :
// on n'en montre qu'une à la fois, en grand (kind = "leg" ou "monde"). Les tirages sont dans progress.js (pull).
import { useEffect, useMemo, useState } from "react";
import { CARD, FAMILY } from "../cards/index.js";
import * as P from "../progress.js";
import { portalsOf, portalsAt, msToPortalChange, famSevens } from "../portals.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";

const fmtLeft = (ms) => {
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d >= 1 ? `${d} j ${h} h` : h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};
const fmtDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); };
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;

/** Ce que coûte une invocation : tickets d'abord, puis Éclats. */
function Cost({ c }) {
  return (
    <span className="pt-cost">
      {c.tk > 0 && <span><Icon name="ticket" size={14} />{c.tk}</span>}
      {c.ec > 0 && <span><Icon name="gem" size={14} />{c.ec.toLocaleString("fr-FR")}</span>}
    </span>
  );
}

/**
 * Une bannière, en grand : à gauche les vedettes (choix de la cible), les épiques à l'honneur ou les autres cartes 7 du monde ;
 * à droite ce que tu as (tickets, Éclats), la garantie et les boutons d'invocation.
 */
function Banner({ t, own, bn, left, onTarget, onPull, onZoom }) {
  const target = P.portalTarget(t, bn);
  const rest = P.pityLeft(t, bn.kind);
  const c1 = P.pullCost(t, 1), c10 = P.pullCost(t, 10);
  const f = bn.fam ? FAMILY[bn.fam] : null;
  const others = useMemo(() => (bn.kind === "monde" ? famSevens(bn.fam).filter((id) => !bn.stars.includes(id)) : []), [bn]);
  return (
    <section className={"pt pt-" + bn.kind} style={{ "--bc": bn.color }} data-testid={"portal-" + bn.kind}>
      <i className="pt-swirl" aria-hidden="true" />
      <header className="pt-head">
        <span className="pt-ico"><Icon name={f ? f.icon : "orbit"} size={26} stroke={1.6} /></span>
        <div className="pt-title"><small>{bn.name}</small><h3>{bn.sub}</h3>{bn.tag && <p>{bn.tag}</p>}</div>
        <span className="pt-left" title="Les portails changent toutes les deux semaines"><Icon name="hourglass" size={13} />{fmtLeft(left)}</span>
      </header>
      <div className="pt-cols">
        <div className="pt-show">
          <div className="pt-stars-h"><b>{bn.stars.length > 1 ? "Les vedettes" : "La vedette"}</b>
            <small>{bn.stars.length > 1 ? "Choisis ta cible : " : "Ta cible : "}une légendaire sur deux, garantie à la {P.PULL.pity}e invocation au plus tard.</small></div>
          <div className={"pt-stars n" + bn.stars.length}>
            {bn.stars.map((id) => (
              <div key={id} className={"pt-star" + (id === target ? " on" : "")}>
                <CardFace d={CARD[id]} onClick={() => onZoom(id, bn)} own={own[id] ? "possédée" : null} />
                {id === target ? <span className="pt-aim on"><Icon name="target" size={14} />Ta cible</span>
                  : <button className="pt-aim" onClick={() => onTarget(bn.kind, id)} aria-label={`Viser ${CARD[id].name}`}><Icon name="target" size={14} />Viser</button>}
              </div>
            ))}
          </div>
          {bn.epics.length > 0 && (
            <div className="pt-epics">
              <small>Épiques à l'honneur : une épique sur deux est l'une d'elles</small>
              <div>{bn.epics.map((id) => <CardFace key={id} d={CARD[id]} onClick={() => onZoom(id, null)} own={own[id] ? "possédée" : null} />)}</div>
            </div>
          )}
          {others.length > 0 && (
            <div className="pt-epics pt-others">
              <small>{others.length > 1 ? `Les ${others.length} autres cartes 7 de ce monde peuvent aussi sortir` : "L'autre carte 7 de ce monde peut aussi sortir"}</small>
              <div>{others.map((id) => <CardFace key={id} d={CARD[id]} onClick={() => onZoom(id, null)} own={own[id] ? "possédée" : null} />)}</div>
            </div>
          )}
        </div>
        <div className="pt-side">
          <div className="pt-wallet">
            <span className="pt-tk" title="Un ticket = une invocation"><Icon name="ticket" size={18} /><b>{t.tk.toLocaleString("fr-FR")}</b> {t.tk > 1 ? "tickets" : "ticket"}</span>
            <span className="pt-ec" title="Tes Éclats"><Icon name="gem" size={17} /><b>{t.ec.toLocaleString("fr-FR")}</b></span>
          </div>
          <div className="pt-pity">
            <div className="pt-pity-t"><Icon name="target" size={16} /><span><b>{CARD[target].name}</b>{CARD[target].title ? <em> · {CARD[target].title}</em> : null}</span>
              <small>garantie dans <b>{plural(rest, "invocation")}</b> au plus tard</small></div>
            <span className="bar2 gold"><i style={{ width: `${(100 * (P.PULL.pity - rest)) / P.PULL.pity}%` }} /></span>
          </div>
          <div className="pt-acts">
            <button className="btn pt-b1" disabled={t.ec < c1.ec} onClick={() => onPull(bn.kind, 1)} data-testid={`pull1-${bn.kind}`}><b>Invoquer ×1</b><Cost c={c1} /></button>
            <button className="btn primary pt-b10" disabled={t.ec < c10.ec} onClick={() => onPull(bn.kind, 10)} data-testid={`pull10-${bn.kind}`}><b>Invoquer ×10</b><Cost c={c10} /></button>
          </div>
          <small className="pt-fine">Les tickets passent avant les Éclats. Par 10 : une épique au moins, et {P.PULL.ec10} Éclats l'invocation au lieu de {P.PULL.ec}.</small>
        </div>
      </div>
    </section>
  );
}

export default function Portals({ t, setT, flash, onPull, kind = "leg" }) {
  const day = P.today();
  const cur = useMemo(() => portalsOf(day), [day]);
  const next = useMemo(() => portalsAt(cur.p + 1), [cur.p]);
  const bn = cur[kind] || cur.leg;
  const nx = next[bn.kind];
  const own = useMemo(() => P.owned(t), [t]);
  const [left, setLeft] = useState(msToPortalChange());
  const [zoom, setZoom] = useState(null);
  useEffect(() => { const iv = setInterval(() => setLeft(msToPortalChange()), 30000); return () => clearInterval(iv); }, []);
  const aim = (k, id) => { const r = P.setPortalTarget(t, k, id, day); if (r.error) { flash(r.error); return; } setT(r.t); sfx.select(); flash(`Nouvelle cible : ${CARD[id].name}`); };
  const gift = () => { const r = P.claimPortalGift(t); if (r.error) { flash(r.error); return; } setT(r.t); sfx.win(); flash(`+${r.tk} tickets de portail : à toi d'invoquer !`); };
  const zbn = zoom && zoom.bn;
  const ztarget = zbn ? P.portalTarget(t, zbn) : null;
  return (
    <div className={"hub-body pts pts-" + bn.kind}>
      {!t.por.gift && (
        <div className="pt-gift" data-testid="portal-gift">
          <span className="pt-gift-i"><Icon name="ticket" size={26} stroke={1.6} /></span>
          <div className="grow"><b>Les Portails s'ouvrent !</b><small>{P.PULL.gift} tickets de portail offerts pour tes premières invocations, dans l'un ou l'autre portail.</small></div>
          <button className="btn small primary" onClick={gift}>Récupérer</button>
        </div>
      )}
      <Banner t={t} own={own} bn={bn} left={left} onTarget={aim} onPull={onPull} onZoom={(id, b) => setZoom({ id, bn: b })} />
      <div className="pt-low">
        <div className="hub-sec pt-next">
          <h3>Ensuite <small>du {fmtDay(next.from)} au {fmtDay(next.to)}</small></h3>
          <div className="pt-next-row" style={{ "--bc": nx.color }}>
            <Icon name={nx.fam ? FAMILY[nx.fam].icon : "orbit"} size={18} />
            <span><b>{nx.sub}</b><small>{nx.name} : {nx.stars.map((id) => CARD[id].name).join(", ")}</small></span>
          </div>
          <p className="muted pt-when"><Icon name="hourglass" size={14} />Ce portail ferme dans {fmtLeft(left)}. Ta garantie est gardée d'un portail à l'autre.</p>
        </div>
        <div className="hub-sec pt-rules">
          <h3>Taux et règles</h3>
          <ul>
            <li>Chaque invocation : <b>Légendaire</b> (une carte 7) 2 %, <b>Épique</b> 10 %, <b>Rare</b> 38 %, <b>Peu commune</b> 50 %.</li>
            <li><b>Une légendaire sur deux est ta cible</b> ; les autres sont souvent les autres vedettes. Dans le Portail des Légendes, une épique sur deux est à l'honneur.</li>
            <li><b>Vedettes :</b> trois au plus par portail. Le Monde à l'honneur en a 3 pour une grande famille, 2 pour une moyenne, 1 pour une petite ; ses autres cartes 7 peuvent aussi sortir.</li>
            <li><b>Garantie :</b> ta cible arrive au plus tard à la {P.PULL.pity}e invocation dans ce portail. Le compteur repart à zéro quand tu l'obtiens, et il est gardé quand les portails changent.</li>
            <li><b>Par 10 :</b> {P.PULL.ec10} Éclats l'invocation au lieu de {P.PULL.ec}, et une épique au moins.</li>
            <li><b>Tickets de portail</b> (quêtes du jour, coffre du jour) : un ticket paie une invocation, dans l'un ou l'autre portail ; ils passent avant les Éclats.</li>
          </ul>
        </div>
      </div>
      {zoom && (
        <CardZoom id={zoom.id} foil={(t.foil[zoom.id] || 0) > 0 || CARD[zoom.id].cost >= 7} owned={{ n: t.coll[zoom.id] || 0, f: t.foil[zoom.id] || 0 }} onClose={() => setZoom(null)}
          acts={zbn ? [{ label: ztarget === zoom.id ? "C'est ta cible" : "En faire ma cible", icon: "target", kind: "primary", disabled: ztarget === zoom.id, onClick: () => { aim(zbn.kind, zoom.id); setZoom(null); } }] : []} />
      )}
    </div>
  );
}
