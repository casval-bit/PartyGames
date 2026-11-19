// Album du Trône des Mondes : toutes les cartes qui existent, triées au choix (famille, coût, force, rareté, nom, exemplaires ;
// croissant ou décroissant), avec un en-tête par groupe (« Coût 5 », « Légendaire »…) et ses cartes obtenues.
// Celles qu'on n'a pas encore sont grisées mais s'ouvrent quand même en grand (toujours grisées) ; les brillantes qu'on possède
// scintillent. En grand, on feuillette l'album avec les flèches (ou ← → au clavier).
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL, FAMILY, PLAYABLE, traitNames } from "../cards/index.js";
import { RARITY, RARITY_ORDER, CARD_TYPES } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import { SortPick, cardSorter, cardGroup, loadSort } from "./sortCards.jsx";

const FAM_ORDER = [...PLAYABLE.map((f) => f.id), "neutre"];
const STEP = 72; // cartes ajoutées à l'affichage à chaque fois qu'on approche du bas
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const KEY = new Map(ALL.map((d) => [d.id, norm(`${d.name} ${d.title} ${traitNames(d).join(" ")}`)])); // « Kanto », « Gryffondor »… trouvent aussi leurs cartes
const SHOW = [["all", "Toutes"], ["own", "Obtenues"], ["miss", "Manquantes"], ["foil", "Brillantes"]];

export default function Album({ t, onClose, shine }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [show, setShow] = useState("all");
  const [type, setType] = useState("all");
  const [rar, setRar] = useState("all");
  const [sort, setSort] = useState(loadSort);
  const [lim, setLim] = useState(STEP);
  const [zoom, setZoom] = useState(null); // index dans la liste affichée
  const end = useRef(null);
  const body = useRef(null);
  const has = (id) => (t.coll[id] || 0) + (t.foil[id] || 0) > 0;
  const count = (d) => (t.coll[d.id] || 0) + (t.foil[d.id] || 0);
  const base = (d, s) => (fam === "all" || d.fam === fam) && (type === "all" || d.type === type) && (rar === "all" || d.r === rar) && (!s || KEY.get(d.id).includes(s));

  const list = useMemo(() => {
    const s = norm(q.trim());
    return ALL.filter((d) => base(d, s) && (show === "all" || (show === "own" ? has(d.id) : show === "miss" ? !has(d.id) : (t.foil[d.id] || 0) > 0)))
      .sort(cardSorter(sort.k, sort.dir, count));
  }, [q, fam, type, rar, show, sort, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // compteurs des en-têtes : toutes les cartes du groupe avec ces filtres, quel que soit le filtre « afficher »
  const counts = useMemo(() => {
    const m = {}, s = norm(q.trim());
    for (const d of ALL) {
      if (!base(d, s)) continue;
      const g = cardGroup(sort.k, d, count).g, x = (m[g] = m[g] || { n: 0, ok: 0 });
      x.n++; if (has(d.id)) x.ok++;
    }
    return m;
  }, [q, fam, type, rar, sort, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => ({ ok: ALL.filter((d) => has(d.id)).length, foil: ALL.filter((d) => (t.foil[d.id] || 0) > 0).length }), [t]); // eslint-disable-line react-hooks/exhaustive-deps

  // on affiche les cartes par paquets, au fil du défilement (2 000 cartes d'un coup seraient lourdes sur un téléphone)
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setLim((l) => l + STEP); }, { root: body.current, rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, lim]);
  useEffect(() => { setLim(STEP); if (body.current) body.current.scrollTop = 0; }, [q, fam, type, rar, show, sort]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && zoom === null) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [zoom, onClose]);

  const groups = [];
  for (const d of list.slice(0, lim)) {
    const gr = cardGroup(sort.k, d, count);
    if (!groups.length || groups[groups.length - 1].g !== gr.g) groups.push({ ...gr, cards: [] });
    groups[groups.length - 1].cards.push(d);
  }
  let idx = 0;
  const zd = zoom !== null ? list[zoom] : null;
  const go = (i) => { setZoom(i); if (i >= lim) setLim(i + STEP); sfx.select(); };

  return (
    <div className="alb" role="dialog" aria-label="Album : toutes les cartes">
      <div className="alb-top">
        <button className="iconbtn" onClick={onClose} aria-label="Retour"><Icon name="back" /></button>
        <div className="alb-title">
          <h2>Toutes les cartes</h2>
          <small>{total.ok} / {ALL.length} obtenues · {total.foil} brillante{total.foil > 1 ? "s" : ""}</small>
        </div>
      </div>
      <span className="bar2 blue alb-bar"><i style={{ width: `${(100 * total.ok) / ALL.length}%` }} /></span>
      <input className="hub-search" placeholder="Chercher un nom, un trait…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher une carte" />
      <div className="hub-filters">
        {SHOW.map(([v, label]) => <button key={v} aria-pressed={show === v} onClick={() => setShow(v)}>{label}</button>)}
        <select value={fam} onChange={(e) => setFam(e.target.value)} aria-label="Famille"><option value="all">Toutes les familles</option>{FAM_ORDER.map((f) => <option key={f} value={f}>{FAMILY[f].name}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="all">Tous types</option>{["char", "loc", "obj", "evt"].map((x) => <option key={x} value={x}>{CARD_TYPES[x]}</option>)}</select>
        <select value={rar} onChange={(e) => setRar(e.target.value)} aria-label="Rareté"><option value="all">Toutes raretés</option>{RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}</select>
      </div>
      <SortPick value={sort} onChange={setSort} testid="alb-sort" />
      <div className="alb-body" ref={body}>
        {groups.map(({ g, label, icon, color, cards }) => {
          const c = counts[g] || { n: 0, ok: 0 };
          return (
            <section key={g} className="alb-sec">
              <div className="alb-head" style={{ "--fc": color || "#ffd166" }}>
                <Icon name={icon} size={16} />
                <b>{label}</b>
                <small>{c.ok} / {c.n}</small>
                <span className="alb-mini"><i style={{ width: `${(100 * c.ok) / Math.max(1, c.n)}%` }} /></span>
              </div>
              <div className="alb-grid">
                {cards.map((d) => {
                  const i = idx++, n = t.coll[d.id] || 0, fo = t.foil[d.id] || 0;
                  return <CardFace key={d.id} d={d} foil={fo > 0} missing={!n && !fo} own={n || fo ? `×${n + fo}${fo ? " ✦" : ""}` : null} onClick={() => go(i)} />;
                })}
              </div>
            </section>
          );
        })}
        {list.length > lim && <div ref={end} className="alb-more"><button className="btn ghost small" onClick={() => setLim(lim + STEP * 2)}>Voir plus ({list.length - lim})</button></div>}
        {!list.length && <div className="hub-empty">{show === "foil" ? "Aucune carte brillante pour l'instant : les cartes 7 le sont toujours, et les autres se rendent brillantes avec des jetons de brillance (touche une de tes cartes)." : show === "own" ? "Aucune carte obtenue avec ces filtres." : show === "miss" ? "Tu as toutes les cartes de ce choix !" : "Aucune carte avec ces filtres."}</div>}
      </div>
      {zd && (
        <CardZoom id={zd.id} foil={(t.foil[zd.id] || 0) > 0} missing={!has(zd.id)} owned={{ n: t.coll[zd.id] || 0, f: t.foil[zd.id] || 0 }} art shine={shine}
          pos={`${zoom + 1} / ${list.length}`} onPrev={zoom > 0 ? () => go(zoom - 1) : undefined} onNext={zoom < list.length - 1 ? () => go(zoom + 1) : undefined}
          onClose={() => setZoom(null)} />
      )}
    </div>
  );
}
