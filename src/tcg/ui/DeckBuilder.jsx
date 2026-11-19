// Outil de deck de Heavy is the Crown. Toutes les familles se mélangent librement : seules comptent les règles de construction.
//  - un nouveau deck commence par « Comment veux-tu commencer ? » : un deck à thème, mes cartes d'une famille, ou un deck vide ;
//  - en haut, la prochaine étape en une phrase (« Ajoute encore 18 cartes, dont 6 personnages »), avec son bouton
//    (compléter, ouvrir les scénarios, enregistrer) ; toutes les règles cochées sont dans « Les règles » ;
//  - les cartes : recherche, type, et les autres filtres repliés dans « Filtres » ; sous chaque carte, « Ajouter »,
//    puis − 1/2 + une fois dans le deck (la carte est alors cerclée de vert) ;
//  - le deck : la liste par type avec − / + et la corbeille, le détail (familles, courbe) replié.
// Sur un grand écran, les cartes à gauche et le deck à droite ; sur un téléphone, trois onglets.
import { useMemo, useRef, useState } from "react";
import { ALL, CARD, FAMILY, FAMILIES, PLAYABLE, PLOTS, traitNames } from "../cards/index.js";
import { DECK_RULES as R, RARITY, RARITY_ORDER, copiesOf } from "../rules.js";
import { validateDeck, defaultPlots, fillDeck, themeStarters } from "../deck.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, PlotFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import { SortPick, cardSorter } from "./sortCards.jsx";
import { DESKTOP } from "../../lib/device.js";
import { useMedia, WIDE_QUERY } from "../../lib/useMedia.js";
import "./deckbuilder.css";

const ORDER = { char: 0, loc: 1, obj: 2, evt: 3 };
const TYPE_PL = { char: "Personnages", loc: "Lieux", obj: "Objets", evt: "Événements" };
const COSTS = [["all", "Tous"], ["01", "0-1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"]];
const costOk = (d, c) => c === "all" || (c === "01" ? d.cost <= 1 : c === "7" ? d.cost >= 7 : d.cost === Number(c));
const famOf = (d) => FAMILY[d.fam] || FAMILY.neutre;
const PAGE = 48;
const pl = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;

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
  if (!total) return null;
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

/** « Comment veux-tu commencer ? » : un deck à thème, mes cartes d'une famille, ou un deck vide. */
function StartPanel({ owned, onTheme, onAuto, onEmpty }) {
  const [pick, setPick] = useState(null);
  const themes = useMemo(() => themeStarters().map((s) => ({ s, miss: Object.entries(s.cards).reduce((k, [id, n]) => k + Math.max(0, n - (owned[id] || 0)), 0) })), [owned]);
  const fams = useMemo(() => {
    const m = {};
    for (const d of ALL) if ((owned[d.id] || 0) > 0) m[d.fam] = (m[d.fam] || 0) + 1;
    return PLAYABLE.filter((f) => m[f.id]).map((f) => ({ f, n: m[f.id] })).sort((a, b) => b.n - a.n);
  }, [owned]);
  const OPTS = [
    ["theme", "layers", "Partir d'un deck à thème", "Un deck tout prêt (Team Rocket, DC Comics, Hawkins…), que tu modifies ensuite."],
    ["auto", "sparkles", "Remplir avec mes cartes", "Choisis une famille : l'outil complète le deck avec tes meilleures cartes."],
    ["empty", "plus", "Deck vide", "Tu choisis toi-même chaque carte, de n'importe quelle famille."],
  ];
  return (
    <div className="dk-start" data-testid="dk-start">
      <div className="dk-start-h">
        <h2>Comment veux-tu commencer ?</h2>
        <p>Un deck, c'est <b>{R.size} cartes</b>, dont {R.minChars} personnages au moins, et <b>{R.plots} scénarios</b>. Toutes les familles peuvent se mélanger. Tu pourras tout changer ensuite.</p>
      </div>
      <div className="dk-start-opts">
        {OPTS.map(([k, ic, t, s]) => (
          <button key={k} className={"dk-opt" + (pick === k ? " on" : "")} onClick={() => { if (k === "empty") onEmpty(); else { setPick(pick === k ? null : k); sfx.select(); } }} data-testid={"dk-start-" + k}>
            <span className="dk-opt-i"><Icon name={ic} size={24} /></span>
            <span className="dk-opt-t"><b>{t}</b><small>{s}</small></span>
            <Icon name="next" size={18} />
          </button>
        ))}
      </div>
      {pick === "theme" && (
        <div className="dk-start-sub">
          {[[false, "Les decks de départ"], [true, "Les autres decks à thème"]].map(([extra, label]) => (
            <div key={label} className="dk-tplgrp">
              <small>{label}</small>
              <div className="dk-tpls">
                {themes.filter(({ s }) => Boolean(s.extra) === extra).map(({ s, miss }) => {
                  const f = FAMILY[s.fam] || FAMILY.neutre;
                  return (
                    <button key={s.id} className="dk-tpl" style={{ "--fc": f.color }} onClick={() => onTheme(s, miss)} title={s.desc} data-testid={"dk-tpl-" + s.id}>
                      <Icon name={f.icon} size={16} /><b>{s.name}</b><small className={miss ? "" : "ok"}>{miss ? `il te manque ${pl(miss, "carte")}` : "toutes à toi"}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {pick === "auto" && (
        <div className="dk-start-sub">
          {fams.length ? (
            <>
              <small className="dk-sub-h">Quelle famille au cœur du deck ? (les cartes neutres et d'autres familles complètent si besoin)</small>
              <div className="dk-autofams">
                {fams.map(({ f, n }) => (
                  <button key={f.id} className="dk-fam" style={{ "--fc": f.color }} onClick={() => onAuto(f.id)} data-testid={"dk-auto-" + f.id}>
                    <Icon name={f.icon} size={15} /><span>{f.name}</span><small>{pl(n, "carte")}</small>
                  </button>
                ))}
              </div>
            </>
          ) : <p className="muted">Tu n'as encore aucune carte de famille : ouvre des boosters, ou pars d'un deck à thème.</p>}
        </div>
      )}
    </div>
  );
}

export default function DeckBuilder({ deck: initial, owned, onSave, onCancel }) {
  const fresh = !initial.id && !Object.values(initial.cards || {}).some((n) => n > 0);
  const [deck, setDeck] = useState(() => ({ ...initial, cards: { ...initial.cards }, plots: [...(initial.plots || [])] }));
  const [start, setStart] = useState(fresh);
  const [tab, setTab] = useState("cards");
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [type, setType] = useState("all");
  const [cost, setCost] = useState("all");
  const [rar, setRar] = useState("all");
  const [mine, setMine] = useState(true);
  const [sort, setSort] = useState({ k: "cost", dir: 1 });
  const [filt, setFilt] = useState(false);
  const [lim, setLim] = useState(PAGE);
  const [zoom, setZoom] = useState(null);
  const [toast, setToast] = useState("");
  const [clear, setClear] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [pop, setPop] = useState(null);
  const popT = useRef(0);
  // grand écran (appli PC) : les cartes à gauche, le deck toujours visible à droite
  const wide = useMedia(WIDE_QUERY, DESKTOP);
  const cur = wide && tab === "deck" ? "cards" : tab;

  const v = useMemo(() => validateDeck(deck, owned), [deck, owned]);
  const c = v.counts;
  const keyOf = useMemo(() => { const m = {}; for (const [id, n] of Object.entries(deck.cards)) if (n > 0 && CARD[id]) (m[CARD[id].key] = m[CARD[id].key] || []).push(id); return m; }, [deck.cards]);
  const conflicted = useMemo(() => new Set(Object.values(keyOf).filter((l) => l.length > 1).flat()), [keyOf]);
  const main = v.fam && v.fam !== "neutre" ? FAMILY[v.fam] : null;

  const note = (m, err = false) => { const o = { m, err }; setToast(o); setTimeout(() => setToast((t) => (t === o ? "" : t)), 3600); };
  const flash = (m) => { note(m, true); sfx.error(); };
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
      setPop(id); clearTimeout(popT.current); popT.current = setTimeout(() => setPop(null), 650);
    } else sfx.close();
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
  const save = () => onSave(deck, v.ok);

  // ---------------- le départ ----------------
  const fromTheme = (s, miss) => {
    setDeck({ ...deck, name: s.name.slice(0, 32), cards: { ...s.cards }, plots: [...s.plots] });
    setStart(false); setTab(wide ? "cards" : "deck"); sfx.apply();
    note(miss ? `Deck « ${s.name} » chargé : il te manque ${pl(miss, "carte")}, signalées en rouge dans ton deck.` : `Deck « ${s.name} » chargé : modifie-le comme tu veux.`);
  };
  const fromFamily = (f) => {
    const r = fillDeck({ ...deck, cards: {}, fam: f }, { owned });
    const n = Object.values(r.added).reduce((s, x) => s + x, 0);
    if (!n) { flash("Aucune de tes cartes ne peut aller dans ce deck pour l'instant."); return; }
    const F = FAMILY[f];
    setDeck({ ...deck, name: deck.name === "Mon deck" || !deck.name ? `Deck ${F.short || F.name}`.slice(0, 32) : deck.name, cards: r.cards, plots: defaultPlots(f) });
    setStart(false); setTab(wide ? "cards" : "deck"); sfx.apply();
    note(r.missing ? `${pl(n, "carte")} de tes cartes, il en manque encore ${r.missing} : ouvre des boosters, ou ajoute des cartes d'autres familles.` : `Deck rempli avec tes cartes (${F.short || F.name} d'abord) : change ce que tu veux.`);
  };

  const inDeck = Object.entries(deck.cards).filter(([, n]) => n > 0).map(([id, n]) => ({ d: CARD[id], n })).filter((x) => x.d)
    .sort((a, b) => ORDER[a.d.type] - ORDER[b.d.type] || a.d.cost - b.d.cost || a.d.name.localeCompare(b.d.name, "fr"));
  const missing = inDeck.filter((x) => (owned[x.d.id] || 0) < x.n);
  const missN = missing.reduce((s, x) => s + x.n - (owned[x.d.id] || 0), 0);
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
    { k: "copies", label: `${R.maxCopies} exemplaires d'une carte au plus (1 pour les cartes 7)`, value: null, state: tooMany.length ? "bad" : "ok" },
    { k: "version", label: "Une seule version par personnage", value: null, state: conflicted.size ? "bad" : "ok" },
    { k: "plots", label: `${R.plots} scénarios différents`, value: `${deck.plots.length} / ${R.plots}`, state: plotsOk ? "ok" : deck.plots.length > R.plots ? "bad" : "todo" },
    ...(missing.length ? [{ k: "own", label: `Cartes possédées (il en manque ${missN})`, value: null, state: "bad" }] : []),
  ];

  // ---------------- la prochaine étape (une phrase, un bouton) ----------------
  const needChars = Math.max(0, R.minChars - c.chars);
  const otherErr = v.errors.find((e) => !/exactement|personnages \(actuellement|scénarios/.test(e));
  const cardsDone = c.total === R.size && !needChars && !otherErr;
  const step = c.total < R.size
    ? { tone: "todo", icon: "plus", text: `Ajoute encore ${pl(short, "carte")}${needChars ? `, dont ${pl(Math.min(needChars, short), "personnage")}` : ""}.`, act: { label: "Compléter avec mes cartes", icon: "sparkles", on: complete, tid: "db-fill" } }
    : c.total > R.size ? { tone: "bad", icon: "minus", text: `Retire ${pl(c.total - R.size, "carte")} : un deck en fait ${R.size}, pas une de plus.`, act: wide ? null : { label: "Voir mon deck", icon: "layers", on: () => setTab("deck") } }
    : needChars ? { tone: "bad", icon: "users", text: `Il faut ${R.minChars} personnages au moins : remplace ${pl(needChars, "carte")} par des personnages.` }
    : otherErr ? { tone: "bad", icon: "alert", text: otherErr }
    : !plotsOk ? { tone: "todo", icon: "scroll", text: deck.plots.length < R.plots ? `Plus que les scénarios : choisis-en encore ${R.plots - deck.plots.length}.` : `Choisis ${R.plots} scénarios différents.`, act: cur === "plots" ? null : { label: "Choisir les scénarios", icon: "scroll", on: () => setTab("plots") } }
    : { tone: "ok", icon: "check", text: "Ton deck est prêt : enregistre-le (bouton vert en haut) pour pouvoir le jouer.", act: null };
  const stepIdx = !cardsDone ? 0 : !plotsOk ? 1 : 2;

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
    return ALL.filter((d) => (!mine || (owned[d.id] || 0) > 0) && (fam === "all" || d.fam === fam) && (type === "all" || d.type === type)
      && costOk(d, cost) && (rar === "all" || d.r === rar)
      && (!s || d.name.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || traitNames(d).some((t) => t.toLowerCase().includes(s))))
      .sort(cardSorter(sort.k, sort.dir, (d) => owned[d.id] || 0));
  }, [q, fam, type, cost, rar, mine, sort, owned]);
  const resetPage = () => setLim(PAGE);
  // les filtres actifs (hors recherche et type, toujours visibles) : des pastilles qu'on retire d'un clic
  const chips = [
    fam !== "all" && { k: "fam", label: (FAMILY[fam] || FAMILY.neutre).short || FAMILY[fam].name, off: () => setFam("all") },
    cost !== "all" && { k: "cost", label: `Coût ${COSTS.find((x) => x[0] === cost)[1]}`, off: () => setCost("all") },
    rar !== "all" && { k: "rar", label: RARITY[rar].name, off: () => setRar("all") },
    !mine && { k: "mine", label: "Même les cartes pas à toi", off: () => setMine(true) },
  ].filter(Boolean);

  const cardsView = (
    <div className="dk-browse">
      <div className="dk-tools">
        <div className="dk-toolrow">
          <div className="dk-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder="Chercher un nom, un trait…" aria-label="Chercher une carte" data-testid="dk-search" />
            {q && <button className="iconbtn small" onClick={() => { setQ(""); resetPage(); }} aria-label="Effacer la recherche"><Icon name="close" size={14} /></button>}
          </div>
          <button className={"dk-filtbtn" + (filt ? " on" : "")} onClick={() => { setFilt(!filt); sfx.select(); }} aria-expanded={filt} data-testid="dk-filters">
            <Icon name="sliders" size={17} /><span>Filtres et tri</span>{chips.length > 0 && <b>{chips.length}</b>}
          </button>
        </div>
        <div className="dk-types" role="group" aria-label="Type de carte">
          {["all", "char", "loc", "obj", "evt"].map((x) => <button key={x} aria-pressed={type === x} onClick={() => { setType(x); resetPage(); }}>{x === "all" ? "Toutes" : TYPE_PL[x]}</button>)}
        </div>
        {filt && (
          <div className="dk-filtpanel">
            <label className="dk-switch"><input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); resetPage(); }} data-testid="dk-mine" /><i aria-hidden="true" /><span>Seulement mes cartes</span></label>
            <div className="dk-costs" role="group" aria-label="Coût">
              <small>Coût</small>
              {COSTS.map(([k, l]) => <button key={k} aria-pressed={cost === k} onClick={() => { setCost(k); resetPage(); }}>{l}</button>)}
            </div>
            <div className="dk-frow">
              <select value={rar} onChange={(e) => { setRar(e.target.value); resetPage(); }} aria-label="Rareté"><option value="all">Toutes raretés</option>{RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}</select>
              <SortPick value={sort} onChange={(s) => { setSort(s); resetPage(); }} testid="dk-sort" />
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
        )}
        {!filt && chips.length > 0 && (
          <div className="dk-chips">
            {chips.map((x) => <button key={x.k} onClick={() => { x.off(); resetPage(); }} aria-label={`Retirer le filtre ${x.label}`}>{x.label}<Icon name="close" size={12} /></button>)}
          </div>
        )}
      </div>
      <div className="dk-count"><b>{pool.length}</b> carte{pool.length > 1 ? "s" : ""}{mine ? " à toi" : ""}{chips.length || q.trim() || type !== "all" ? " avec ces filtres" : ""}
        <span className="dk-count-h">Touche une carte pour la lire en grand.</span>
      </div>
      <div className="dk-grid">
        {pool.slice(0, lim).map((d) => {
          const n = deck.cards[d.id] || 0;
          const have = owned[d.id] || 0;
          const other = n ? null : otherOf(d);
          const max = Math.min(copiesOf(d), have);
          return (
            <div key={d.id} className={"dk-tile" + (n ? " in" : "") + (other ? " blk" : "") + (!have ? " none" : "") + (pop === d.id ? " pop" : "")}>
              <div className="dk-tile-c">
                <CardFace d={d} onClick={() => setZoom(d.id)} dim={Boolean(other) || !have} />
                {n > 0 && <span className="dk-tile-b"><Icon name="check" size={12} stroke={3} />×{n}</span>}
              </div>
              {!have ? <span className="dk-act off">Pas encore à toi</span>
                : other ? <span className="dk-act off" title={`${CARD[other].name} (${CARD[other].cost}) est dans le deck : une seule version par personnage`}>Version {CARD[other].cost} déjà prise</span>
                : n ? (
                  <span className="dk-act qty">
                    <button onClick={() => setN(d.id, n - 1)} aria-label={`Retirer un ${d.name}`}><Icon name="minus" size={15} stroke={2.6} /></button>
                    <b>{n}<small>/{max}</small></b>
                    <button onClick={() => setN(d.id, n + 1)} disabled={n >= max} aria-label={`Ajouter un ${d.name}`} data-testid={"dk-add-" + d.id}><Icon name="plus" size={15} stroke={2.6} /></button>
                  </span>
                ) : <button className="dk-act add" onClick={() => setN(d.id, 1)} data-testid={"dk-add-" + d.id}><Icon name="plus" size={15} stroke={2.6} />Ajouter</button>}
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
      <div className="dk-deck-h">
        <h3><Icon name="layers" size={17} />Mon deck</h3>
        <span className={"dk-total" + (c.total === R.size ? " ok" : c.total > R.size ? " bad" : "")}><b>{c.total}</b>/{R.size}</span>
      </div>
      <div className="dk-kinds">
        <span className={c.chars >= R.minChars ? "ok" : ""}><b>{c.chars}</b> personnages <small>({R.minChars} au moins)</small></span>
        <span className={c.locs > R.maxLocs ? "bad" : ""}><b>{c.locs}</b> lieux <small>({R.maxLocs} au plus)</small></span>
        <span className={c.objEvt > R.maxObjEvt ? "bad" : ""}><b>{c.objEvt}</b> objets et événements <small>({R.maxObjEvt} au plus)</small></span>
      </div>
      {!inDeck.length ? (
        <div className="dk-empty">
          <Icon name="layers" size={30} />
          <b>Ton deck est vide</b>
          <span>Ajoute des cartes avec leur bouton <i className="dk-kbd"><Icon name="plus" size={12} stroke={3} />Ajouter</i>{wide ? ", à gauche" : " (onglet « Ajouter des cartes »)"}, ou laisse l'outil le remplir avec tes cartes.</span>
          <button className="btn small primary" onClick={complete}><Icon name="sparkles" size={16} />Compléter avec mes cartes</button>
        </div>
      ) : ["char", "loc", "obj", "evt"].map((ty) => {
        const l = inDeck.filter((x) => x.d.type === ty);
        if (!l.length) return null;
        return (
          <section key={ty} className="dk-list">
            <h4>{TYPE_PL[ty]} <small>{l.reduce((s, x) => s + x.n, 0)}</small></h4>
            {l.map(({ d, n }) => {
              const err = conflicted.has(d.id) || (owned[d.id] || 0) < n || n > copiesOf(d);
              return (
                <div key={d.id} className={"dk-line" + (err ? " err" : "") + (pop === d.id ? " pop" : "")} style={{ "--fc": famOf(d).color }}>
                  <span className="cost">{d.cost}</span>
                  <button className="nm" onClick={() => setZoom(d.id)}>
                    <b>{d.name}</b>
                    <small><Icon name={famOf(d).icon} size={11} /> {d.title || famOf(d).short || famOf(d).name}{d.type === "char" ? ` · Force ${d.str}` : ""}{(owned[d.id] || 0) < n ? " · pas à toi" : ""}</small>
                  </button>
                  <span className="q">
                    <button onClick={() => setN(d.id, n - 1)} aria-label={`Retirer un ${d.name}`}><Icon name="minus" size={14} stroke={2.6} /></button>
                    <b>{n}</b>
                    <button onClick={() => setN(d.id, n + 1)} disabled={n >= Math.min(copiesOf(d), owned[d.id] || 0)} aria-label={`Ajouter un ${d.name}`}><Icon name="plus" size={14} stroke={2.6} /></button>
                  </span>
                  <button className="del" onClick={() => setN(d.id, 0)} aria-label={`Enlever ${d.name} du deck`} title="Enlever du deck"><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
          </section>
        );
      })}
      {inDeck.length > 0 && (
        <section className="dk-more-box">
          <button className="dk-fold" onClick={() => setDetails(!details)} aria-expanded={details}><Icon name="chart" size={15} />Familles et courbe des coûts<Icon name={details ? "minus" : "plus"} size={14} /></button>
          {details && (
            <>
              <p className="dk-note">{main ? `Surtout ${main.short || main.name} : la famille ne donne aucun bonus, mélange comme tu veux.` : "Toutes les familles se mélangent, sans bonus de famille."}</p>
              <FamilyMix mix={v.mix} total={c.total} />
              <div className="db-curve" aria-label="Courbe des coûts des personnages">{curve.map((n, k) => <div key={k}><span>{n || ""}</span><i style={{ height: `${(n / cmax) * 36}px` }} /><span>{k}</span></div>)}</div>
            </>
          )}
        </section>
      )}
      {inDeck.length > 0 && (clear
        ? <div className="row dk-clear"><span className="muted">Retirer toutes les cartes ?</span><button className="btn small" style={{ borderColor: "var(--danger)" }} onClick={() => { setDeck({ ...deck, cards: {} }); setClear(false); sfx.apply(); }}>Oui, vider</button><button className="btn small ghost" onClick={() => setClear(false)}>Non</button></div>
        : <button className="btn small ghost dk-clear" onClick={() => setClear(true)}><Icon name="trash" size={15} />Vider le deck</button>)}
    </div>
  );

  // ---------------- les scénarios ----------------
  const plotsView = (
    <div className="dk-plots">
      <p className="dk-note">Les scénarios ne se collectionnent pas : ils sont tous à toi. Choisis-en <b>{R.plots} différents</b> ; tu en joues un par round. Touche un scénario pour le prendre ou le rendre.</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn small ghost" onClick={() => { setDeck({ ...deck, plots: defaultPlots(v.fam) }); sfx.apply(); }}><Icon name="sparkles" size={16} />Sélection conseillée</button>
        <button className="btn small ghost" onClick={() => setDeck({ ...deck, plots: [] })}>Tout retirer</button>
      </div>
      <div className="ag-grid plots" style={{ overflow: "visible" }}>
        {PLOTS.map((p) => <div key={p.id} className={"gi" + (deck.plots.includes(p.id) ? " pick" : "")}><PlotFace d={p} onClick={() => togglePlot(p.id)} sel={deck.plots.includes(p.id)} />{deck.plots.includes(p.id) && <i className="ck"><Icon name="check" size={16} /></i>}<button className="btn small ghost" style={{ minHeight: 30, padding: "2px 10px", fontSize: ".72rem" }} onClick={() => setZoom(p.id)}>Lire</button></div>)}
      </div>
    </div>
  );

  return (
    <div className={"screen hub dbx dkb" + (wide ? " wide" : "")} data-testid="deck-builder">
      <header className="dk-top">
        <button className="iconbtn" onClick={onCancel} aria-label="Annuler et revenir à mes decks"><Icon name="back" /></button>
        <label className="dk-name">
          <small>{start ? "Nouveau deck" : main ? <><Icon name={main.icon} size={12} /> {v.mix.filter((m) => m.fam !== "neutre").length > 1 ? `${v.mix.filter((m) => m.fam !== "neutre").length} familles · surtout ${main.short || main.name}` : main.name}</> : "Toutes les familles"}</small>
          <span className="dk-name-in"><input value={deck.name} maxLength={32} onChange={(e) => setDeck({ ...deck, name: e.target.value })} aria-label="Nom du deck" data-testid="dk-name" /><Icon name="edit" size={15} /></span>
        </label>
        {!start && <button className={"btn dk-save " + (v.ok ? "good" : "ghost")} onClick={save} data-testid="dk-save" title={v.ok ? "Enregistrer le deck" : "Le deck n'est pas encore jouable : il sera gardé en brouillon"}><Icon name="save" size={17} /><span className="dk-lg">{v.ok ? "Enregistrer" : "Garder en brouillon"}</span><span className="dk-sm">{v.ok ? "Enregistrer" : "Brouillon"}</span></button>}
      </header>

      {start ? (
        <div className="hub-body dk-startwrap">
          <StartPanel owned={owned} onTheme={fromTheme} onAuto={fromFamily} onEmpty={() => { setStart(false); sfx.select(); }} />
        </div>
      ) : (
        <>
          <div className={"dk-guide " + step.tone} data-testid="dk-guide">
            <ol className="dk-steps" aria-label="Étapes">
              {["Les cartes", "Les scénarios", "Enregistrer"].map((s, i) => (
                <li key={s} className={i < stepIdx ? "done" : i === stepIdx ? "cur" : ""}><i>{i < stepIdx ? <Icon name="check" size={12} stroke={3} /> : i + 1}</i><span>{s}</span></li>
              ))}
            </ol>
            <div className="dk-next">
              <span className="dk-next-i"><Icon name={step.icon} size={18} stroke={2.4} /></span>
              <p>{step.text}</p>
              <div className="dk-next-b">
                {step.act && <button className={"btn small " + (step.tone === "ok" ? "good" : "primary")} onClick={step.act.on} data-testid={step.act.tid}><Icon name={step.act.icon} size={16} />{step.act.label}</button>}
                <button className="btn small ghost" onClick={() => setRulesOpen(true)} data-testid="dk-rules"><Icon name="book" size={16} />Les règles</button>
              </div>
            </div>
            <span className="dk-prog" aria-hidden="true"><i style={{ width: `${Math.min(100, (100 * c.total) / R.size)}%` }} className={c.total > R.size ? "bad" : c.total === R.size ? "ok" : ""} /></span>
          </div>

          <div className="seg dk-tabs" role="tablist">
            <button role="tab" aria-selected={cur === "cards"} aria-pressed={cur === "cards"} onClick={() => setTab("cards")} data-testid="dk-tab-cards"><Icon name="plus" size={15} /><span className="dk-lg">Ajouter des cartes</span><span className="dk-sm">Ajouter</span></button>
            {!wide && <button role="tab" aria-selected={cur === "deck"} aria-pressed={cur === "deck"} onClick={() => setTab("deck")} data-testid="dk-tab-deck"><Icon name="layers" size={15} />Mon deck <b className="dk-tabn">{c.total}</b></button>}
            <button role="tab" aria-selected={cur === "plots"} aria-pressed={cur === "plots"} onClick={() => setTab("plots")} data-testid="dk-tab-plots"><Icon name="scroll" size={15} />Scénarios <b className="dk-tabn">{deck.plots.length}/{R.plots}</b></button>
          </div>

          <div className={wide ? "dk-cols" : "dk-one"}>
            <div className="hub-body dk-main" key={cur}>
              {cur === "cards" && cardsView}
              {cur === "deck" && deckView}
              {cur === "plots" && plotsView}
            </div>
            {wide && <aside className="hub-body dk-side" aria-label="Mon deck">{deckView}</aside>}
          </div>
        </>
      )}

      {rulesOpen && (
        <div className="modalwrap" onClick={() => setRulesOpen(false)}>
          <div className="modal dk-rulesm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Les règles du deck">
            <div className="row spread"><h3 style={{ margin: 0 }}><Icon name="book" size={18} /> Les règles du deck</h3><button className="iconbtn" onClick={() => setRulesOpen(false)} aria-label="Fermer"><Icon name="close" /></button></div>
            <p className="dk-intro">Mélange <b>toutes les familles</b> comme tu veux : seules ces règles comptent. Un deck qui ne les respecte pas est gardé en brouillon et ne peut pas être joué.</p>
            <ul className="dk-rules">{rules.map((r) => <Rule key={r.k} {...r} />)}</ul>
          </div>
        </div>
      )}
      {toast && <div className={"toast hub-toast db-toast" + (toast.err ? "" : " dk-info")} role="alert">{toast.m}</div>}
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
