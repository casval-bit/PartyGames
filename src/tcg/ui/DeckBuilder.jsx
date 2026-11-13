// Constructeur de deck : compteurs des règles en direct, erreurs en clair (un deck invalide ne peut pas être joué),
// ajout des cartes possédées (famille, neutres, une famille alliée), choix des 7 scénarios.
import { useMemo, useState } from "react";
import { ALL, CARD, FAMILY, PLAYABLE, PLOTS, subOf, subWords } from "../cards/index.js";
import { DECK_RULES as R, RARITY, CARD_TYPES, copiesOf } from "../rules.js";
import { validateDeck, defaultPlots, fillDeck } from "../deck.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, PlotFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import { DESKTOP } from "../../lib/device.js";
import { useMedia, WIDE_QUERY } from "../../lib/useMedia.js";

const ORDER = { char: 0, loc: 1, obj: 2, evt: 3 };
const TYPE_PL = { char: "Personnages", loc: "Lieux", obj: "Objets", evt: "Événements" };

function Count({ label, v, max, min, total }) {
  const bad = (max !== undefined && v > max) || (total !== undefined && v !== total) || (min !== undefined && v < min);
  const ok = total !== undefined ? v === total : min !== undefined ? v >= min : false;
  return <div className={"db-count" + (bad ? " bad" : ok ? " ok" : "")}><span>{v}{total !== undefined ? `/${total}` : max !== undefined ? `/${max}` : `/${min}+`}</span><small>{label}</small></div>;
}

export default function DeckBuilder({ deck: initial, owned, onSave, onCancel }) {
  const [deck, setDeck] = useState(() => ({ ...initial, cards: { ...initial.cards }, plots: [...(initial.plots || [])] }));
  const [tab, setTab] = useState("list");
  const [q, setQ] = useState("");
  const [src, setSrc] = useState(initial.fam);
  const [type, setType] = useState("all");
  const [zoom, setZoom] = useState(null);
  const [toast, setToast] = useState("");
  const [lim, setLim] = useState(40);
  // appli PC, fenêtre large : le deck reste affiché à droite pendant qu'on ajoute des cartes à gauche
  const wide = useMedia(WIDE_QUERY, DESKTOP);
  const cur = wide && tab === "list" ? "add" : tab;
  const fam = FAMILY[deck.fam];
  const v = useMemo(() => validateDeck(deck, owned), [deck, owned]);
  const c = v.counts || {};
  const keyOf = useMemo(() => { const m = {}; for (const [id, n] of Object.entries(deck.cards)) if (n > 0) (m[CARD[id].key] = m[CARD[id].key] || []).push(id); return m; }, [deck.cards]);

  const note = (m) => { setToast(m); setTimeout(() => setToast((t) => (t === m ? "" : t)), 3200); };
  const flash = (m) => { note(m); sfx.error(); };
  // « Compléter » : les places libres sont remplies avec des cartes possédées (celles du deck de départ de la famille d'abord),
  // et les scénarios manquants avec la sélection conseillée
  const short = R.size - (v.counts && v.counts.total ? v.counts.total : 0);
  const complete = () => {
    const r = fillDeck(deck, { owned });
    const n = Object.values(r.added).reduce((s, x) => s + x, 0);
    const plots = deck.plots.length < R.plots ? [...deck.plots, ...defaultPlots(deck.fam).filter((p) => !deck.plots.includes(p))].slice(0, R.plots) : deck.plots;
    if (!n && plots === deck.plots) { flash(`Aucune de tes cartes ne peut compléter ce deck : il en manque ${short}. Ouvre des boosters !`); return; }
    setDeck({ ...deck, cards: r.cards, plots });
    sfx.apply();
    const s = n > 1 ? "s" : "";
    note(r.missing ? `${n} carte${s} ajoutée${s}, il en manque encore ${r.missing} : ouvre des boosters !` : `${n} carte${s} ajoutée${s} : le deck fait ${R.size} cartes.`);
  };
  // une autre version du même personnage déjà dans le deck (une seule par deck : Aelita 5 OU Aelita 7)
  const otherOf = (d) => (keyOf[d.key] || []).find((x) => x !== d.id) || null;
  const setN = (id, n) => {
    const d = CARD[id];
    const have = owned[id] || 0;
    const max = copiesOf(d);
    if (n > Math.min(max, have)) {
      flash(have < n ? `Tu n'as que ${have} exemplaire${have > 1 ? "s" : ""} de ${d.name}.` : d.cost >= 7 ? `${d.name} (7) est unique : un seul exemplaire par deck.` : `${R.maxCopies} exemplaires au maximum par carte.`);
      return;
    }
    if (n > (deck.cards[id] || 0)) {
      const other = otherOf(d);
      if (other) { flash(`Une seule version par personnage : ${CARD[other].name} (${CARD[other].cost}) est déjà dans le deck. Retire-la d'abord pour prendre ${d.name} (${d.cost}).`); return; }
      if (d.fam !== deck.fam && d.fam !== "neutre" && d.loyal) { flash(`${d.name} est Fidèle : il ne rejoint pas une autre famille.`); return; }
      sfx.select();
    }
    const cards = { ...deck.cards };
    if (n <= 0) delete cards[id]; else cards[id] = n;
    setDeck({ ...deck, cards });
  };

  const inDeck = Object.entries(deck.cards).filter(([, n]) => n > 0).map(([id, n]) => ({ d: CARD[id], n })).filter((x) => x.d)
    .sort((a, b) => ORDER[a.d.type] - ORDER[b.d.type] || a.d.cost - b.d.cost || a.d.name.localeCompare(b.d.name));
  const conflicted = new Set(Object.values(keyOf).filter((l) => l.length > 1).flat());
  const subs = fam.types || [];
  const wrongType = (d) => subs.length > 0 && d.fam === deck.fam && d.pt.length && deck.pt && !d.pt.includes(deck.pt);

  const pool = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ALL.filter((d) => (owned[d.id] || 0) > 0)
      .filter((d) => (src === "all" ? d.fam === deck.fam || d.fam === "neutre" || !d.loyal : d.fam === src))
      .filter((d) => type === "all" || d.type === type)
      .filter((d) => !wrongType(d))
      .filter((d) => !s || d.name.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || d.traits.some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => (a.fam === deck.fam ? 0 : 1) - (b.fam === deck.fam ? 0 : 1) || ORDER[a.type] - ORDER[b.type] || a.cost - b.cost || a.name.localeCompare(b.name));
  }, [q, src, type, owned, deck.fam, deck.pt]); // eslint-disable-line react-hooks/exhaustive-deps

  const curve = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => inDeck.filter((x) => x.d.type === "char" && (k === 7 ? x.d.cost >= 7 : x.d.cost === k)).reduce((s, x) => s + x.n, 0));
  const cmax = Math.max(1, ...curve);
  const togglePlot = (id) => {
    const has = deck.plots.includes(id);
    if (!has && deck.plots.length >= R.plots) { flash(`${R.plots} scénarios au maximum : retires-en un d'abord.`); return; }
    setDeck({ ...deck, plots: has ? deck.plots.filter((x) => x !== id) : [...deck.plots, id] });
  };

  const listView = (
    <>
            <div className="db-curve" aria-label="Courbe des coûts des personnages">{curve.map((n, k) => <div key={k}><span>{n || ""}</span><i style={{ height: `${(n / cmax) * 36}px` }} /><span>{k === 7 ? "7+" : k}</span></div>)}</div>
            {["char", "loc", "obj", "evt"].map((ty) => {
              const l = inDeck.filter((x) => x.d.type === ty);
              if (!l.length) return null;
              return (
                <div key={ty} className="hub-sec">
                  <h3>{TYPE_PL[ty]} <small>{l.reduce((s, x) => s + x.n, 0)}</small></h3>
                  <div className="db-list">
                    {l.map(({ d, n }) => (
                      <div key={d.id} className={"db-item" + (conflicted.has(d.id) || wrongType(d) || (owned[d.id] || 0) < n ? " err" : "")} style={{ "--fc": (FAMILY[d.fam] || FAMILY.neutre).color }}>
                        <span className="cost">{d.cost}</span>
                        <button className="nm" onClick={() => setZoom(d.id)}><b>{d.name}{d.title ? ` · ${d.title}` : ""}</b><small>{d.fam !== deck.fam ? `${FAMILY[d.fam].short || FAMILY[d.fam].name} · ` : ""}{d.type === "char" ? `Force ${d.str} · ` : ""}{d.traits.join(", ")}</small></button>
                        <i className="gem" style={{ background: RARITY[d.r].gem }} />
                        <span className="q"><button onClick={() => setN(d.id, n - 1)} aria-label={`Retirer ${d.name}`}><Icon name="minus" size={14} /></button><span>{n}</span><button onClick={() => setN(d.id, n + 1)} aria-label={`Ajouter ${d.name}`}><Icon name="plus" size={14} /></button></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!inDeck.length && <div className="hub-empty">Deck vide : va dans « Ajouter ».</div>}
    </>
  );

  return (
    <div className={"screen hub" + (wide ? " dbx" : "")}>
      <div className="hub-top">
        <button className="iconbtn" onClick={onCancel} aria-label="Annuler"><Icon name="back" /></button>
        <div className="hub-title">
          <div className="eyebrow">{fam.name}{subOf(deck.fam, deck.pt) ? ` · ${subOf(deck.fam, deck.pt).name}` : ""}</div>
          <input className="hub-search" style={{ height: 38, fontWeight: 700 }} value={deck.name} maxLength={32} onChange={(e) => setDeck({ ...deck, name: e.target.value })} aria-label="Nom du deck" />
        </div>
        <button className={"btn small " + (v.ok ? "good" : "")} onClick={() => onSave(deck, v.ok)}><Icon name="save" size={16} />{v.ok ? "Valider" : "Brouillon"}</button>
      </div>

      <div className="db-counts">
        <Count label="Cartes" v={c.total || 0} total={R.size} />
        <Count label="Persos" v={c.chars || 0} min={R.minChars} />
        <Count label="Coût 7+" v={c.c7 || 0} max={R.cost7} />
        <Count label="Coût 6" v={c.c6 || 0} max={R.cost6} />
        <Count label="Coût 5" v={c.c5 || 0} max={R.cost5} />
        <Count label="Obj.+Évts" v={c.objEvt || 0} max={R.maxObjEvt} />
        <Count label="Lieux" v={c.locs || 0} max={R.maxLocs} />
        <Count label={v.alli ? `Alliés ${FAMILY[v.alli].short || ""}` : "Alliés"} v={c.alli || 0} max={R.maxAlliance} />
      </div>

      <div className="seg">
        {!wide && <button aria-pressed={cur === "list"} onClick={() => setTab("list")}>Mon deck ({c.total || 0})</button>}
        <button aria-pressed={cur === "add"} onClick={() => setTab("add")}>Ajouter{wide ? " des cartes" : ""}</button>
        <button aria-pressed={cur === "plots"} onClick={() => setTab("plots")}>Scénarios ({deck.plots.length}/{R.plots})</button>
      </div>

      <div className={wide ? "db-wide" : "db-one"}>
      <div className="hub-body">
        {subs.length > 0 && (
          <div className="hub-filters" aria-label={`${subWords(deck.fam).One} du deck`}>
            {subs.map((t) => <button key={t.id} aria-pressed={deck.pt === t.id} onClick={() => setDeck({ ...deck, pt: t.id })} style={deck.pt === t.id ? { borderColor: t.color, background: `color-mix(in srgb, ${t.color} 25%, transparent)` } : undefined}>{t.name}</button>)}
          </div>
        )}
        {cur === "list" && listView}
        {cur === "add" && (
          <>
            <input className="hub-search" placeholder="Chercher un nom, un trait…" value={q} onChange={(e) => { setQ(e.target.value); setLim(40); }} aria-label="Chercher" />
            <div className="hub-filters">
              <select value={src} onChange={(e) => { setSrc(e.target.value); setLim(40); }} aria-label="Famille">
                <option value={deck.fam}>{fam.name}</option>
                <option value="neutre">Neutres</option>
                <option value="all">Tout ce que je peux mettre</option>
                {PLAYABLE.filter((f) => f.id !== deck.fam).map((f) => <option key={f.id} value={f.id}>Alliés : {f.name}</option>)}
              </select>
              {["all", "char", "loc", "obj", "evt"].map((t) => <button key={t} aria-pressed={type === t} onClick={() => { setType(t); setLim(40); }}>{t === "all" ? "Tout" : CARD_TYPES[t]}</button>)}
            </div>
            {src !== deck.fam && src !== "neutre" && src !== "all" && <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>Alliance : jusqu'à {R.maxAlliance} cartes d'UNE autre famille, sauf ses cartes Fidèles.</p>}
            <div className="hub-grid">
              {pool.slice(0, lim).map((d) => {
                const n = deck.cards[d.id] || 0;
                const have = owned[d.id] || 0;
                const other = n ? null : otherOf(d);
                return (
                  <div key={d.id} className={"db-add" + (n ? " in" : "") + (other ? " blk" : "")}>
                    <CardFace d={d} onClick={() => setZoom(d.id)} dim={Boolean(other) || (d.fam !== deck.fam && d.fam !== "neutre" && d.loyal)} />
                    {n > 0 && <span className="db-in" aria-hidden="true">Dans le deck</span>}
                    {other && <span className="db-in blk" title={`${CARD[other].name} (${CARD[other].cost}) est dans le deck : une seule version par personnage`}>Version {CARD[other].cost} dans le deck</span>}
                    <div className="qty">
                      <button onClick={() => setN(d.id, n - 1)} disabled={!n} aria-label={`Retirer ${d.name}`}><Icon name="minus" size={13} /></button>
                      <span>{n}/{Math.min(copiesOf(d), have)}</span>
                      <button className="add" onClick={() => setN(d.id, n + 1)} disabled={Boolean(other)} aria-label={`Ajouter ${d.name}`}><Icon name="plus" size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {pool.length > lim && <button className="btn ghost" onClick={() => setLim(lim + 40)}>Voir plus ({pool.length - lim})</button>}
            {!pool.length && <div className="hub-empty">Aucune carte possédée ici. Ouvre des boosters pour en gagner !</div>}
          </>
        )}
        {cur === "plots" && (
          <>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn small ghost" onClick={() => setDeck({ ...deck, plots: defaultPlots(deck.fam) })}><Icon name="sparkles" size={16} />Sélection conseillée</button>
              <button className="btn small ghost" onClick={() => setDeck({ ...deck, plots: [] })}>Tout retirer</button>
            </div>
            <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>Les scénarios ne se collectionnent pas : ils sont tous à toi. Choisis-en 7 différents ; un par round, ils reviennent quand tu les as tous joués.</p>
            <div className="ag-grid plots" style={{ overflow: "visible" }}>
              {PLOTS.map((p) => <div key={p.id} className={"gi" + (deck.plots.includes(p.id) ? " pick" : "")}><PlotFace d={p} onClick={() => togglePlot(p.id)} sel={deck.plots.includes(p.id)} />{deck.plots.includes(p.id) && <i className="ck"><Icon name="check" size={16} /></i>}<button className="btn small ghost" style={{ minHeight: 30, padding: "2px 10px", fontSize: ".72rem" }} onClick={() => setZoom(p.id)}>Lire</button></div>)}
            </div>
          </>
        )}
      </div>
      {wide && (
        <aside className="hub-body db-side" aria-label="Mon deck">
          <h3 className="db-side-h">Mon deck <small>{c.total || 0} / {R.size} cartes</small></h3>
          {listView}
        </aside>
      )}
      </div>

      {v.ok ? <div className="db-ok"><Icon name="check" size={18} />Deck valide : il peut être joué.</div> : (
        <div className="db-errs" role="alert">
          <b>Ce deck ne peut pas encore être joué :</b>
          {v.errors.slice(0, 4).map((e, i) => <span key={i}>• {e}</span>)}
          {v.errors.length > 4 && <span>… et {v.errors.length - 4} autre(s).</span>}
          {(short > 0 || deck.plots.length < R.plots) && (
            <button className="btn small db-fill" onClick={complete} data-testid="db-fill"><Icon name="sparkles" size={16} />Compléter avec mes cartes{short > 0 ? ` (${short})` : ""}</button>
          )}
        </div>
      )}
      {toast && <div className="toast hub-toast db-toast" role="alert">{toast}</div>}
      {zoom && <CardZoom id={zoom} owned={CARD[zoom].type !== "plot" ? { n: owned[zoom] || 0 } : null} onClose={() => setZoom(null)}
        acts={CARD[zoom].type === "plot" ? [{ label: deck.plots.includes(zoom) ? "Retirer des scénarios" : "Ajouter aux scénarios", onClick: () => { togglePlot(zoom); setZoom(null); } }]
          : (owned[zoom] || 0) > 0 ? (() => {
            const d = CARD[zoom], n = deck.cards[zoom] || 0, max = Math.min(copiesOf(d), owned[zoom] || 0), other = n ? null : otherOf(d);
            const add = other ? { label: `${CARD[other].name} (${CARD[other].cost}) est déjà dans le deck`, icon: "close", disabled: true, onClick: () => {} }
              : { label: `Ajouter au deck (${n}/${max})`, icon: "plus", disabled: n >= max, onClick: () => setN(zoom, n + 1) };
            return [add, ...(n ? [{ label: "Retirer un exemplaire", icon: "minus", onClick: () => setN(zoom, n - 1) }] : [])];
          })() : []} />}
    </div>
  );
}
