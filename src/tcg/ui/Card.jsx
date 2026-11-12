// Rendu des cartes du Trône des Mondes : carte complète (toutes tailles), scénario (paysage), dos, pion du plateau.
import { memo, useMemo } from "react";
import { CARD, FAMILY, TYPE_BONUS, subOf, subWords } from "../cards/index.js";
import { RARITY, KEYWORDS, TYPE_NAME, CARD_TYPES } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { cardArt, cardColors } from "./art.js";
import { useArt } from "./artStore.js";
import "./tcg.css";

export const TYPE_ICON = { combat: "sword", ruse: "mask", influence: "crown" };
const ICONS = ["combat", "ruse", "influence"];

/** Texte de carte : {combat} → pastille + mot, *Trait* → en italique coloré. */
/** Nom d'effet suivi d'un point, sauf s'il finit déjà par « ! », « ? » ou « … » (« Cours, Scooby ! »). */
const abName = (n) => (/[!?…]$/.test(n) ? n : `${n}.`);

export function RichText({ text }) {
  const parts = String(text || "").split(/(\{(?:combat|ruse|influence)\}|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    const m = /^\{(combat|ruse|influence)\}$/.exec(p);
    if (m) return <span key={i} style={{ whiteSpace: "nowrap" }}><span className={"rt-i " + m[1]}><Icon name={TYPE_ICON[m[1]]} size={10} stroke={2.4} /></span>{TYPE_NAME[m[1]]}</span>;
    if (p.length > 2 && p[0] === "*" && p[p.length - 1] === "*") return <span key={i} className="rt-t">{p.slice(1, -1)}</span>;
    return p;
  });
}
/** « Célèbre », « Embuscade (3) »… */
export const kwNames = (kw) => Object.entries(kw || {}).filter(([k]) => KEYWORDS[k]).map(([k, v]) => KEYWORDS[k].name + (typeof v === "number" ? ` (${v})` : ""));
export const abilityText = (d) => (d.abs || []).map((ab) => ({ name: ab.name, text: ab.text || "" })).filter((x) => x.text);
const famOf = (d) => FAMILY[d.type === "plot" ? d.univ : d.fam] || FAMILY.neutre;
const textLen = (d) => kwNames(d.kw).join(" ").length + abilityText(d).reduce((s, a) => s + a.text.length + a.name.length, 0) + (d.req ? 30 : 0);

function useCardArt(d, big, full) {
  const custom = useArt(d && d.id);
  const gen = useMemo(() => (custom || !d ? null : full ? cardArt(d, big ? 300 : 150, big ? 424 : 212, true) : cardArt(d, big ? 320 : 170, big ? 184 : 98)), [d, big, full, custom]);
  return custom || gen;
}
const styleOf = (d, w, extra) => {
  const c = cardColors(d);
  return { "--fc": c.c, "--fc2": c.c2, "--gem": (RARITY[d.r] || RARITY.C).gem, ...(w ? { width: typeof w === "number" ? w + "px" : w } : null), ...extra };
};

/**
 * Carte complète. d = définition (CARD[id]) ; w = largeur (px) ; big = illustration haute définition (zoom).
 * str = force actuelle (en jeu) ; isNew / own = badges de collection ; missing = carte non possédée.
 */
export const CardFace = memo(function CardFace({ d, w, big = false, foil = false, str, isNew, own, missing, dim, className = "", style, onClick, children, tilt, ...rest }) {
  const full = d && d.r === "L";
  const art = useCardArt(d, big || (typeof w === "number" && w > 170), full);
  if (!d) return null;
  if (d.type === "plot") return <PlotFace d={d} w={w} big={big} className={className} style={style} onClick={onClick} {...rest} />;
  const f = famOf(d);
  const abs = abilityText(d);
  const kws = kwNames(d.kw);
  const len = textLen(d);
  const n = d.name.length;
  const Tag = onClick ? "button" : "div";
  const s = str !== undefined && d.type === "char" ? str : d.str;
  return (
    <Tag className={`tc ${d.type} r-${d.r}${foil ? " foil" : ""}${missing ? " missing" : ""}${dim ? " dim" : ""}${tilt ? " tilt" : ""}${!abs.length && !kws.length && !d.req && d.r !== "L" ? " plain" : ""} ${className}`} style={styleOf(d, w, style)} onClick={onClick}
      aria-label={onClick ? `${d.name}${d.title ? ", " + d.title : ""}` : undefined} {...rest}>
      <span className="tc-fr" />
      <div className="tc-in">
        <div className="tc-head">
          <div className={"tc-name" + (n > 26 ? " n4" : n > 21 ? " n3" : n > 15 ? " n2" : "")}>{d.uni && <i className="tc-uni" aria-label="Unique" />}<span>{d.name}</span></div>
          {d.title && <div className="tc-sub">{d.title}</div>}
        </div>
        <div className="tc-art">
          {art && <img src={art} alt="" draggable={false} />}
          {d.type === "char" && <div className="tc-icons">{ICONS.filter((t) => d.icons[t]).map((t) => <i key={t} className={"tc-ic " + t} title={TYPE_NAME[t]}><Icon name={TYPE_ICON[t]} size={12} stroke={2.2} /></i>)}</div>}
          {d.pt && d.pt.length > 0 && <div className="tc-pts">{d.pt.map((t) => <span key={t} className="tc-pt" style={{ "--ptc": (TYPE_BONUS[t] || {}).color || "#888" }}>{(TYPE_BONUS[t] || {}).short || (TYPE_BONUS[t] || {}).name || t}</span>)}</div>}
        </div>
        <div className="tc-traits">{d.traits.length ? d.traits.join(". ") + "." : " "}</div>
        <div className={"tc-text" + (len > 215 ? " t3" : len > 150 ? " t2" : "")}>
          {kws.length > 0 && <div className="tc-kw">{kws.join(". ")}.</div>}
          {d.req && <div className="tc-req">Personnage <RichText text={`*${d.req}*`} /> uniquement.</div>}
          {abs.map((a, i) => <div key={i} className="tc-ab">{a.name && <b>{abName(a.name)} </b>}<RichText text={a.text} /></div>)}
          {d.flav && <div className="tc-flav">« {d.flav} »</div>}
        </div>
        <div className="tc-foot">
          <span className="tc-kind">{CARD_TYPES[d.type]}</span>
          <Icon name={f.icon} size={14} className="tc-fam" />
          <i className="tc-gem" title={(RARITY[d.r] || {}).name} />
        </div>
      </div>
      <span className="tc-cost">{d.cost}</span>
      {d.type === "char" && <span className={"tc-str" + (s > d.str ? " up" : s < d.str ? " down" : "")}>{s}</span>}
      {d.st && <span className="tc-st">Exclusive</span>}
      {isNew && <span className="tc-new">NEW</span>}
      {foil && !missing && <span className="tc-shine" aria-hidden="true" />}
      {own && <span className="tc-own">{own}</span>}
      {children}
    </Tag>
  );
});

/** Scénario (format paysage) : revenu, initiative, revendication, réserve. */
export const PlotFace = memo(function PlotFace({ d, w, big = false, used, sel, className = "", style, onClick, ...rest }) {
  const art = useCardArt(d, big, false);
  const f = famOf(d);
  const abs = abilityText(d);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`tp${used ? " used" : ""}${sel ? " pick" : ""} ${className}`} style={{ "--fc": f.color, ...(w ? { width: typeof w === "number" ? w + "px" : w } : null), ...style }} onClick={onClick} aria-label={onClick ? `Scénario ${d.name}` : undefined} {...rest}>
      <div className="tp-in">
        <div className="tp-art">{art && <img src={art} alt="" draggable={false} />}</div>
        <div className="tp-stats">
          <span className="tp-s inc" title="Revenu">{d.inc}<small>Or</small></span>
          <span className="tp-s ini" title="Initiative">{d.ini}<small>Init.</small></span>
          <span className="tp-s clm" title="Revendication">{d.clm}<small>Revend.</small></span>
          <span className="tp-s res" title="Réserve">{d.res}<small>Réserve</small></span>
        </div>
        <div className="tp-main">
          <div className="tp-name">{d.name}</div>
          <div className="tp-meta">
            <span className="tp-univ"><Icon name={f.icon} size={10} />{f.id === "neutre" ? "Tous les mondes" : f.short || f.name}</span>
            {d.traits.length > 0 && <span className="tp-traits">{d.traits.join(". ")}.</span>}
          </div>
          {abs.length ? abs.map((a, i) => <div key={i} className="tp-text">{a.name && <b>{abName(a.name)} </b>}<RichText text={a.text} /></div>) : <div className="tp-text empty">Pas d'effet : de l'or, de l'initiative, rien d'autre.</div>}
        </div>
      </div>
    </Tag>
  );
});

/** Dos de carte (booster, main adverse). glow = rareté qui brille à travers le dos (comme dans TCG Pocket). */
export function CardBack({ w, glow, className = "", style }) {
  return (
    <div className={`tc tc-back${glow ? " glow-" + glow : ""} ${className}`} style={{ ...(w ? { width: typeof w === "number" ? w + "px" : w } : null), ...style }} aria-hidden="true">
      <span className="tc-fr" />
      <div className="tb-ring"><Icon name="crown" size={40} stroke={1.6} /></div>
      <div className="tb-t">Trône des Mondes</div>
    </div>
  );
}

/** Carte de famille (effet permanent de la famille, + bonus du type Pokémon ou de la région choisis). */
export function FamilyFace({ fam, pt, w, big }) {
  const f = FAMILY[fam] || FAMILY.neutre;
  const tb = subOf(fam, pt);
  const d = useMemo(() => ({ id: `famille:${fam}:${pt || ""}`, type: "fam", fam, r: "E", name: f.name, artIcon: f.icon, pt: pt ? [pt] : [] }), [fam, pt, f]);
  const art = useCardArt(d, big, false);
  const abs = [...(f.abs || []), ...(tb ? tb.abs : [])].map((ab) => ({ name: ab.name, text: ab.text || "" }));
  return (
    <div className="tc r-E fam" style={styleOf(d, w)}>
      <span className="tc-fr" />
      <div className="tc-in">
        <div className="tc-head" style={{ paddingLeft: "4cqw" }}>
          <div className="tc-name"><span>{f.name}</span></div>
          <div className="tc-sub">Carte de famille{tb ? ` · ${subWords(fam).one} ${tb.name}` : ""}</div>
        </div>
        <div className="tc-art">{art && <img src={art} alt="" draggable={false} />}</div>
        <div className="tc-text t2" style={{ paddingTop: "2cqw" }}>
          <div className="tc-flav" style={{ marginTop: 0 }}>{f.desc}</div>
          {abs.map((a, i) => <div key={i} className="tc-ab">{a.name && <b>{abName(a.name)} </b>}<RichText text={a.text} /></div>)}
          {tb && tb.desc && <div className="tc-flav">{tb.desc}</div>}
        </div>
        <div className="tc-foot"><Icon name={f.icon} size={14} className="tc-fam" /><i className="tc-gem" /></div>
      </div>
    </div>
  );
}

const KW_SHORT = { celebre: "Célèbre", discret: "Discret", intimidation: "Intimid.", genie: "Génie", pillard: "Pillard", duel: "Duel" };
/** Carte posée sur la table (vue réseau : { u, d, k, pw, dup, att, s, ic, kw, fz, sil }). Elle pivote quand elle s'agenouille,
 *  les objets attachés dépassent en dessous, les doublons sont glissés derrière. */
export const Token = memo(function Token({ v, cls = "", w, onClick, enter }) {
  const d = CARD[v.d];
  const art = useCardArt(d, false, false);
  if (!d) return null;
  const c = cardColors(d);
  const loc = d.type !== "char";
  const att = v.att || [];
  return (
    <div className={"tt-slot" + (enter ? " enter" : "")} style={w ? { "--tw": w + "px" } : undefined}>
      <div className={"tt-rot" + (v.k ? " k" : "") + (/\bpick\b/.test(cls) ? " up" : "")} style={{ "--fc": c.c }}>
        {att.slice(0, 3).map((a, i) => { const ad = CARD[a.d]; return <span key={a.u} className="tt-under att" style={{ "--i": i + 1, "--ac": ad ? cardColors(ad).c : "#ffd166" }}><b>{ad ? ad.name : ""}</b></span>; })}
        {Array.from({ length: Math.min(2, v.dup || 0) }, (_, i) => <span key={"d" + i} className="tt-under dup" style={{ "--i": i + 1 }} />)}
        <button className={`tt ${cls}`} onClick={onClick} aria-label={`${d.name}${v.k ? ", agenouillé" : ""}${v.fz ? ", gelé" : ""}${v.sil ? ", neutralisé" : ""}${loc ? "" : `, force ${v.s}`}${v.pw ? `, ${v.pw} Pouvoir` : ""}${att.length ? `, ${att.length} objet(s)` : ""}`}>
          {art && <img src={art} alt="" draggable={false} />}
          {!loc && <span className="tt-ics">{ICONS.filter((t) => (v.ic || "").includes(t[0].toUpperCase())).map((t) => <i key={t} className={t}><Icon name={TYPE_ICON[t]} size={8} stroke={2.4} /></i>)}</span>}
          {v.pw > 0 && <span className="tt-pw"><Icon name="crown" size={8} stroke={2.6} />{v.pw}</span>}
          {(v.fz || v.sil) ? <span className="tt-tags"><span className="st">{v.sil ? "Neutralisé" : "Gelé"}</span></span>
            : (v.kw || []).length > 0 && <span className="tt-tags">{v.kw.slice(0, 1).map((k) => <span key={k} className="kw">{KW_SHORT[k] || k}</span>)}</span>}
          <span className={"tt-nm" + (loc ? " loc" : "")}>{d.name}</span>
          {!loc && <span className={"tt-str" + (v.s > d.str ? " up" : v.s < d.str ? " down" : "")}>{v.s}</span>}
        </button>
      </div>
    </div>
  );
});
