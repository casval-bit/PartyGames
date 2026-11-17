// Créateur de deck de Heavy is the Crown. Toutes les familles se mélangent librement : seules comptent les règles de
// construction, affichées en direct et cochées quand elles sont respectées (un deck qui ne les respecte pas s'enregistre
// comme brouillon et ne peut pas être joué).
//  - les cartes : toutes les familles ou une seule, type, coût, rareté, recherche ; mes cartes ou toutes (celles qui manquent
//    sont grisées) ; + et − sur chaque carte ;
//  - le deck : les règles, la répartition par famille, la courbe des coûts, la liste ;
//  - les 7 scénarios, dans leur onglet.
// Sur un grand écran, les cartes à gauche et le deck à droite ; sur un téléphone, trois onglets.
import { useMemo, useState } from "react";
import { ALL, CARD, FAMILY, FAMILIES, PLOTS, traitNames } from "../cards/index.js";
import { DECK_RULES as R, RARITY, RARITY_ORDER, CARD_TYPES, copiesOf } from "../rules.js";
import { validateDeck, defaultPlots, fillDeck } from "../deck.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, PlotFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import { DESKTOP } from "../../lib/device.js";
import { useMedia, WIDE_QUERY } from "../../lib/useMedia.js";
import "./deckbuilder.css";

const ORDER = { char: 0, loc: 1, obj: 2, evt: 3 };
const TYPE_PL = { char: "Personnages", loc: "Lieux", obj: "Objets", evt: "Événements" };
const COSTS = [["all", "Tous"], ["01", "0-1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"]];
const costOk = (d, c) => c === "all" || (c === "01" ? d.cost <= 1 : c === "7" ? d.cost >= 7 : d.cost === Number(c));
const famOf = (d) => FAMILY[d.fam] || FAMILY.neutre;
const PAGE = 48;

/** Une règle de construction : respectée (ok), dépassée (bad) ou pas encore atteinte (todo). */
function Rule({ label, value, state }) {
  return (
    <li className={"dk-rule " + state}>
      <span className="dk-rule-i" aria-hidden="true"><Icon name={state === "ok" ? "check" : state === "bad" ? "close" : "dot"} size={13} stroke={2.6} /></span>
      <span className="dk-rule-t">{label}</span>
      {value != null && <b className="dk-rule-v">{value}</b>}
    </li>
  );
}

/** Répartition du deck par famille : une barre aux couleurs des familles, et leurs noms. */
function FamilyMix({ mix, total }) {
  if (!total) return <p className="muted dk-note">Aucune carte pour l'instant : ajoute celles que tu veux, de n'importe quelle famille.</p>;
  return (
    <div className="dk-mix">
      <div className="dk-mix-bar" aria-hidden="true">
        {mix.map((m) => <i key={m.fam} style={{ flexGrow: m.n, "--fc": (FAMILY[m.fam] || FAMILY.neutre).color }} title={`${(FAMILY[m.fam] || FAMILY.neutre).name} : ${m.n}`} />)}
      </div>
      <div className="dk-mix-list">
        {mix.map((m, i) => {
          const f = FAMILY[m.fam] || FAMILY.neutre;
          return <span key={m.fam} className={"dk-mix-f" + (i === 0 && m.fam !== "neutre" ? " main" : "")} style={{ "--fc": f.color }}><Icon name={f.icon} size={13} />{f.short || f.name}<b>{m.n}</b></span>;
        })}
      </div>
    </div>
  );
}

export default function DeckBuilder({ deck: initial, owned, onSave, onCancel }) {
  const [deck, setDeck] = useState(() => ({ ...initial, cards: { ...initial.cards }, plots: [...(initial.plots || [])] }));
  const [tab, setTab] = useState(Object.keys(initial.cards || {}).length ? "deck" : "cards");
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [type, setType] = useState("all");
  const [cost, setCost] = useState("all");
  const [rar, setRar] = useState("all");
  const [mine, setMine] = useState(true);
  const [sort, setSort] = useState("cost");
  const [lim, setLim] = useState(PAGE);
  const [zoom, setZoom] = useState(null);
  const [toast, setToast] = useState("");
  const [clear, setClear] = useState(false);
  // grand écran (appli PC) : les cartes à gauche, le deck toujours visible à droite
  const wide = useMedia(WIDE_QUERY, DESKTOP);
  const cur = wide && tab === "deck" ? "cards" : tab;

  const v = useMemo(() => validateDeck(deck, owned), [deck, owned]);
  const c = v.counts;
  const keyOf = useMemo(() => { const m = {}; for (const [id, n] of Object.entries(deck.cards)) if (n > 0 && CARD[id]) (m[CARD[id].key] = m[CARD[id].key] || []).push(id); return m; }, [deck.cards]);
  const conflicted = useMemo(() => new Set(Object.values(keyOf).filter((l) => l.length > 1).flat()), [keyOf]);
  const main = v.fam && v.fam !== "neutre" ? FAMILY[v.fam] : null;

  const note = (m) => { setToast(m); setTimeout(() => setToast((t) => (t === m ? "" : t)), 3200); };
  const flash = (m) => { note(m); sfx.error(); };
  // une autre version du même personnage déjà dans le deck (une seule par deck : Aelita 5 OU Aelita 7)
  const otherOf = (d) => (keyOf[d.key] || []).find((x) => x !== d.id) || null;
  const setN = (id, n) => {
    const d = CARD[id];
    const have = owned[id] || 0;
    const max = copiesOf(d);
    if (n > Math.min(max, have)) {
      flash(have < n ? (have ? `Tu n'as que ${have} exemplaire${have > 1 ? "s" : ""} de ${d.name}.` : `Tu n'as pas encore ${d.name} : elle sort des boosters, de la boutique ou des Portails.`)
        : d.cost >= 7 ? `${d.name} (7) est unique : un seul exemplaire par deck.` : `${R.maxCopies} exemplaires au maximum par carte.`);
      return;
    }
    if (n > (deck.cards[id] || 0)) {
      const other = otherOf(d);
      if (other) { flash(`Une seule version par personnage : ${CARD[other].name} (${CARD[other].cost}) est déjà dans le deck. Retire-la d'abord pour prendre ${d.name} (${d.cost}).`); return; }
      sfx.select();
    }
    const cards = { ...deck.cards };
    if (n <= 0) delete cards[id]; else cards[id] = n;
    setDeck({ ...deck, cards });
  };
  const short = R.size - c.total;
  // « Compléter » : les places libres avec des cartes possédées (celles de la famille la plus présente d'abord), et les
  // scénarios manquants avec la sélection conseillée
  const complete = () => {
    const r = fillDeck(deck, { owned });
    const n = Object.values(r.added).reduce((s, x) => s + x, 0);
    const plots = deck.plots.length < R.plots ? [...deck.plots, ...defaultPlots(v.fam).filter((p) => !deck.plots.includes(p))].slice(0, R.plots) : deck.plots;
    if (!n && plots === deck.plots) { flash(`Aucune de tes cartes ne peut compléter ce deck : il en manque ${short}. Ouvre des boosters !`); return; }
    setDeck({ ...deck, cards: r.cards, plots });
    sfx.apply();
    const s = n > 1 ? "s" : "";
    note(r.missing ? `${n} carte${s} ajoutée${s}, il en manque encore ${r.missing} : ouvre des boosters !` : n ? `${n} carte${s} ajoutée${s} : le deck fait ${R.size} cartes.` : "Scénarios complétés.");
  };
  const togglePlot = (id) => {
    const has = deck.plots.includes(id);
    if (!has && deck.plots.length >= R.plots) { flash(`${R.plots} scénarios au maximum : retires-en un d'abord.`); return; }
    setDeck({ ...deck, plots: has ? deck.plots.filter((x) => x !== id) : [...deck.plots, id] });
    sfx.select();
  };

  const inDeck = Object.entries(deck.cards).filter(([, n]) => n > 0).map(([id, n]) => ({ d: CARD[id], n })).filter((x) => x.d)
    .sort((a, b) => ORDER[a.d.type] - ORDER[b.d.type] || a.d.cost - b.d.cost || a.d.name.localeCompare(b.d.name, "fr"));
  const missing = inDeck.filter((x) => (owned[x.d.id] || 0) < x.n);
  const tooMany = inDeck.filter((x) => x.n > copiesOf(x.d));
  const curve = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => inDeck.filter((x) => x.d.type === "char" && (k === 7 ? x.d.cost >= 7 : x.d.cost === k)).reduce((s, x) => s + x.n, 0));
  const cmax = Math.max(1, ...curve);
  const plotsOk = deck.plots.length === R.plots && new Set(deck.plots).size === R.plots;
  const rules = [
    { k: "size", label: `${R.size} cartes`, value: `${c.total} / ${R.size}`, state: c.total === R.size ? "ok" : c.total > R.size ? "bad" : "todo" },
    { k: "chars", label: `${R.minChars} personnages au moins`, value: c.chars, state: c.chars >= R.minChars ? "ok" : "todo" },
    { k: "c7", label: `${R.cost7} cartes 7 au plus, une seule de chaque`, value: `${c.c7} / ${R.cost7}`, state: c.c7 > R.cost7 ? "bad" : "ok" },
    { k: "c6", label: `${R.cost6} cartes de coût 6 au plus`, value: `${c.c6} / ${R.cost6}`, state: c.c6 > R.cost6 ? "bad" : "ok" },
    { k: "c5", label: `${R.cost5} cartes de coût 5 au plus`, value: `${c.c5} / ${R.cost5}`, state: c.c5 > R.cost5 ? "bad" : "ok" },
    { k: "oe", label: `${R.maxObjEvt} objets et événements au plus`, value: `${c.objEvt} / ${R.maxObjEvt}`, state: c.objEvt > R.maxObjEvt ? "bad" : "ok" },
    { k: "locs", label: `${R.maxLocs} lieux au plus`, value: `${c.locs} / ${R.maxLocs}`, state: c.locs > R.maxLocs ? "bad" : "ok" },
    { k: "copies", label: `${R.maxCopies} exemplaires d'une carte au plus`, value: null, state: tooMany.length ? "bad" : "ok" },
    { k: "version", label: "Une seule version par personnage", value: null, state: conflicted.size ? "bad" : "ok" },
    { k: "plots", label: `${R.plots} scénarios différents`, value: `${deck.plots.length} / ${R.plots}`, state: plotsOk ? "ok" : deck.plots.length > R.plots ? "bad" : "todo" },
    ...(missing.length ? [{ k: "own", label: `Cartes possédées (il en manque ${missing.reduce((s, x) => s + x.n - (owned[x.d.id] || 0), 0)})`, value: null, state: "bad" }] : []),
  ];

  // ---------------- les cartes ----------------
  const famCount = useMemo(() => {
    const m = {};
    for (const d of ALL) if (!mine || (owned[d.id] || 0) > 0) m[d.fam] = (m[d.fam] || 0) + 1;
    return m;
  }, [owned, mine]);
  const famIdx = useMemo(() => Object.fromEntries(FAMILIES.map((f, i) => [f.id, i])), []);
  // les familles dont on a des cartes d'abord (dans l'ordre habituel), puis les autres
  const famList = useMemo(() => [...FAMILIES].sort((a, b) => (famCount[b.id] ? 1 : 0) - (famCount[a.id] ? 1 : 0) || famIdx[a.id] - famIdx[b.id]), [famCount, famIdx]);
  const pool = useMemo(() => {
    const s = q.trim().toLowerCase();
    const by = sort === "name" ? (a, b) => a.name.localeCompare(b.name, "fr") || a.cost - b.cost
      : sort === "fam" ? (a, b) => famIdx[a.fam] - famIdx[b.fam] || ORDER[a.type] - ORDER[b.type] || a.cost - b.cost || a.name.localeCompare(b.name, "fr")
      : (a, b) => a.cost - b.cost || ORDER[a.type] - ORDER[b.type] || a.name.localeCompare(b.name, "fr") || famIdx[a.fam] - famIdx[b.fam];
    return ALL.filter((d) => (!mine || (owned[d.id] || 0) > 0) && (fam === "all" || d.fam === fam) && (type === "all" || d.type === type)
      && costOk(d, cost) && (rar === "all" || d.r === rar)
      && (!s || d.name.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || traitNames(d).some((t) => t.toLowerCase().includes(s))))
      .sort(by);
  }, [q, fam, type, cost, rar, mine, sort, owned, famIdx]);
  const resetPage = () => setLim(PAGE);
  const filtered = fam !== "all" || type !== "all" || cost !== "all" || rar !== "all" || q.trim();

  const cardsView = (
    <div className="dk-browse">
      <div className="dk-tools">
        <div className="dk-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder="Chercher un nom, un titre, un trait…" aria-label="Chercher une carte" data-testid="dk-search" />
          {q && <button className="iconbtn small" onClick={() => { setQ(""); resetPage(); }} aria-label="Effacer la recherche"><Icon name="close" size={14} /></button>}
        </div>
        <div className="dk-row">
          <div className="seg dk-seg" role="group" aria-label="Type de carte">
            {["all", "char", "loc", "obj", "evt"].map((x) => <button key={x} aria-pressed={type === x} onClick={() => { setType(x); resetPage(); }}>{x === "all" ? "Tout" : TYPE_PL[x]}</button>)}
          </div>
          <label className="dk-mine"><input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); resetPage(); }} data-testid="dk-mine" />Seulement mes cartes</label>
        </div>
        <div className="dk-row">
          <div className="dk-costs" role="group" aria-label="Coût">
            <small>Coût</small>
            {COSTS.map(([k, l]) => <button key={k} aria-pressed={cost === k} onClick={() => { setCost(k); resetPage(); }}>{l}</button>)}
          </div>
          <select value={rar} onChange={(e) => { setRar(e.target.value); resetPage(); }} aria-label="Rareté"><option value="all">Toutes raretés</option>{RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}</select>
          <select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }} aria-label="Tri"><option value="cost">Tri par coût</option><option value="fam">Tri par famille</option><option value="name">Tri par nom</option></select>
        </div>
        <div className="dk-fams" role="group" aria-label="Famille">
          <button className={"dk-fam all" + (fam === "all" ? " on" : "")} aria-pressed={fam === "all"} onClick={() => { setFam("all"); resetPage(); }} data-testid="dk-fam-all">
            <Icon name="layers" size={15} /><span>Toutes les familles</span>
          </button>
          {famList.map((f) => (
            <button key={f.id} className={"dk-fam" + (fam === f.id ? " on" : "")} aria-pressed={fam === f.id} style={{ "--fc": f.color }} disabled={!famCount[f.id]}
              onClick={() => { setFam(fam === f.id ? "all" : f.id); resetPage(); }} title={f.name} data-testid={"dk-fam-" + f.id}>
              <Icon name={f.icon} size={15} /><span>{f.short || f.name}</span><small>{famCount[f.id] || 0}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="dk-count"><b>{pool.length}</b> carte{pool.length > 1 ? "s" : ""}{mine ? " à toi" : ""}{filtered ? " avec ces filtres" : ""}
        {filtered && <button className="hts-link" onClick={() => { setFam("all"); setType("all"); setCost("all"); setRar("all"); setQ(""); resetPage(); }}>tout afficher</button>}
      </div>
      <div className="dk-grid">
        {pool.slice(0, lim).map((d) => {
          const n = deck.cards[d.id] || 0;
          const have = owned[d.id] || 0;
          const other = n ? null : otherOf(d);
          const max = Math.min(copiesOf(d), have);
          return (
            <div key={d.id} className={"db-add dk-card" + (n ? " in" : "") + (other ? " blk" : "") + (!have ? " none" : "")}>
              <CardFace d={d} onClick={() => setZoom(d.id)} dim={Boolean(other) || !have} />
              {n > 0 && <span className="db-in" aria-hidden="true">×{n} dans le deck</span>}
              {other && <span className="db-in blk" title={`${CARD[other].name} (${CARD[other].cost}) est dans le deck : une seule version par personnage`}>Version {CARD[other].cost} dans le deck</span>}
              {!have && <span className="db-in blk dk-none">Pas encore à toi</span>}
              <div className="qty">
                <button onClick={() => setN(d.id, n - 1)} disabled={!n} aria-label={`Retirer ${d.name}`}><Icon name="minus" size={13} /></button>
                <span>{n}/{max}</span>
                <button className="add" onClick={() => setN(d.id, n + 1)} disabled={Boolean(other) || n >= max} aria-label={`Ajouter ${d.name}`} data-testid={"dk-add-" + d.id}><Icon name="plus" size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
      {pool.length > lim && <button className="btn ghost dk-more" onClick={() => setLim(lim + PAGE)}>Voir plus ({pool.length - lim})</button>}
      {!pool.length && <div className="hub-empty">{mine && !Object.keys(owned).length ? "Tu n'as encore aucune carte : ouvre des boosters !" : "Aucune carte avec ces filtres."}</div>}
    </div>
  );

  // ---------------- le deck ----------------
  const deckView = (
    <div className="dk-deck">
      <section className="dk-box dk-rules" aria-label="Règles du deck">
        <h3><Icon name="book" size={16} />Les règles <small>{v.ok ? "toutes respectées" : `${rules.filter((r) => r.state !== "ok").length} à régler`}</small></h3>
        <p className="dk-intro">Mélange <b>toutes les familles</b> comme tu veux : seules ces règles comptent.</p>
        <ul>{rules.map((r) => <Rule key={r.k} {...r} />)}</ul>
        {(short > 0 || deck.plots.length < R.plots) && <button className="btn small dk-fill" onClick={complete} data-testid="db-fill"><Icon name="sparkles" size={16} />Compléter avec mes cartes{short > 0 ? ` (${short})` : ""}</button>}
      </section>
      <section className="dk-box">
        <h3><Icon name="users" size={16} />Familles <small>{main ? `la plus présente : ${main.short || main.name} (sans effet en jeu)` : "aucun bonus de famille"}</small></h3>
        <FamilyMix mix={v.mix} total={c.total} />
      </section>
      <section className="dk-box">
        <h3><Icon name="chart" size={16} />Courbe des personnages</h3>
        <div className="db-curve" aria-label="Courbe des coûts des personnages">{curve.map((n, k) => <div key={k}><span>{n || ""}</span><i style={{ height: `${(n / cmax) * 36}px` }} /><span>{k === 7 ? "7" : k}</span></div>)}</div>
      </section>
      {["char", "loc", "obj", "evt"].map((ty) => {
        const l = inDeck.filter((x) => x.d.type === ty);
        if (!l.length) return null;
        return (
          <section key={ty} className="dk-box">
            <h3>{TYPE_PL[ty]} <small>{l.reduce((s, x) => s + x.n, 0)}</small></h3>
            <div className="db-list">
              {l.map(({ d, n }) => (
                <div key={d.id} className={"db-item" + (conflicted.has(d.id) || (owned[d.id] || 0) < n || n > copiesOf(d) ? " err" : "")} style={{ "--fc": famOf(d).color }}>
                  <span className="cost">{d.cost}</span>
                  <button className="nm" onClick={() => setZoom(d.id)}><b>{d.name}{d.title ? ` · ${d.title}` : ""}</b><small><Icon name={famOf(d).icon} size={11} /> {famOf(d).short || famOf(d).name}{d.type === "char" ? ` · Force ${d.str}` : ""}{traitNames(d).length ? ` · ${traitNames(d).join(", ")}` : ""}</small></button>
                  <i className="gem" style={{ background: RARITY[d.r].gem }} />
                  <span className="q"><button onClick={() => setN(d.id, n - 1)} aria-label={`Retirer ${d.name}`}><Icon name="minus" size={14} /></button><span>{n}</span><button onClick={() => setN(d.id, n + 1)} aria-label={`Ajouter ${d.name}`}><Icon name="plus" size={14} /></button></span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {inDeck.length > 0 && (clear
        ? <div className="row dk-clear"><span className="muted">Retirer toutes les cartes ?</span><button className="btn small" style={{ borderColor: "var(--danger)" }} onClick={() => { setDeck({ ...deck, cards: {} }); setClear(false); sfx.apply(); }}>Oui, vider</button><button className="btn small ghost" onClick={() => setClear(false)}>Non</button></div>
        : <button className="btn small ghost dk-clear" onClick={() => setClear(true)}><Icon name="trash" size={15} />Vider le deck</button>)}
    </div>
  );

  // ---------------- les scénarios ----------------
  const plotsView = (
    <div className="dk-plots">
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn small ghost" onClick={() => { setDeck({ ...deck, plots: defaultPlots(v.fam) }); sfx.apply(); }}><Icon name="sparkles" size={16} />Sélection conseillée</button>
        <button className="btn small ghost" onClick={() => setDeck({ ...deck, plots: [] })}>Tout retirer</button>
      </div>
      <p className="muted dk-note">Les scénarios ne se collectionnent pas : ils sont tous à toi. Choisis-en {R.plots} différents ; tu en joues un par round, et ils reviennent quand tu les as tous joués.</p>
      <div className="ag-grid plots" style={{ overflow: "visible" }}>
        {PLOTS.map((p) => <div key={p.id} className={"gi" + (deck.plots.includes(p.id) ? " pick" : "")}><PlotFace d={p} onClick={() => togglePlot(p.id)} sel={deck.plots.includes(p.id)} />{deck.plots.includes(p.id) && <i className="ck"><Icon name="check" size={16} /></i>}<button className="btn small ghost" style={{ minHeight: 30, padding: "2px 10px", fontSize: ".72rem" }} onClick={() => setZoom(p.id)}>Lire</button></div>)}
      </div>
    </div>
  );

  return (
    <div className={"screen hub dbx dkb" + (wide ? " wide" : "")} data-testid="deck-builder">
      <header className="dk-top">
        <button className="iconbtn" onClick={onCancel} aria-label="Annuler et revenir à mes decks"><Icon name="back" /></button>
        <div className="dk-name">
          <small>{main ? <><Icon name={main.icon} size={12} /> {v.mix.filter((m) => m.fam !== "neutre").length > 1 ? `${v.mix.filter((m) => m.fam !== "neutre").length} familles · surtout ${main.short || main.name}` : main.name}</> : "Nouveau deck · toutes les familles"}</small>
          <input value={deck.name} maxLength={32} onChange={(e) => setDeck({ ...deck, name: e.target.value })} aria-label="Nom du deck" data-testid="dk-name" />
        </div>
        <span className={"dk-total" + (c.total === R.size ? " ok" : c.total > R.size ? " bad" : "")}><b>{c.total}</b>/{R.size}</span>
        <button className={"btn " + (v.ok ? "good" : "")} onClick={() => onSave(deck, v.ok)} data-testid="dk-save"><Icon name="save" size={17} />{v.ok ? "Enregistrer" : "Brouillon"}</button>
      </header>

      <div className="seg dk-tabs" role="tablist">
        <button role="tab" aria-selected={cur === "cards"} aria-pressed={cur === "cards"} onClick={() => setTab("cards")} data-testid="dk-tab-cards">Ajouter des cartes</button>
        {!wide && <button role="tab" aria-selected={cur === "deck"} aria-pressed={cur === "deck"} onClick={() => setTab("deck")} data-testid="dk-tab-deck">Mon deck ({c.total})</button>}
        <button role="tab" aria-selected={cur === "plots"} aria-pressed={cur === "plots"} onClick={() => setTab("plots")} data-testid="dk-tab-plots">Scénarios ({deck.plots.length}/{R.plots})</button>
      </div>

      <div className={wide ? "dk-cols" : "dk-one"}>
        <div className="hub-body dk-main" key={cur}>
          {cur === "cards" && cardsView}
          {cur === "deck" && deckView}
          {cur === "plots" && plotsView}
        </div>
        {wide && <aside className="hub-body dk-side" aria-label="Mon deck">{deckView}</aside>}
      </div>

      {v.ok ? <div className="db-ok"><Icon name="check" size={18} />Deck valide : il peut être joué.</div> : (
        <div className="db-errs" role="alert">
          <b>Ce deck ne peut pas encore être joué :</b>
          {v.errors.slice(0, wide ? 3 : 2).map((e, i) => <span key={i}>• {e}</span>)}
          {v.errors.length > (wide ? 3 : 2) && <span>… et {v.errors.length - (wide ? 3 : 2)} autre(s).</span>}
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
