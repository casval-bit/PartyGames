// Album du Trône des Mondes : toutes les cartes qui existent, famille par famille (ou toutes familles mêlées par coût).
// Celles qu'on n'a pas encore sont grisées mais s'ouvrent quand même en grand (toujours grisées) ; les brillantes qu'on possède
// scintillent. En grand, on feuillette l'album avec les flèches (ou ← → au clavier).
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL, FAMILY, PLAYABLE } from "../cards/index.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import { loadTri, saveTri } from "./ArtList.jsx";

const FAM_ORDER = [...PLAYABLE.map((f) => f.id), "neutre"];
const TYPE_ORDER = ["char", "loc", "obj", "evt"];
const STEP = 72; // cartes ajoutées à l'affichage à chaque fois qu'on approche du bas
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const KEY = new Map(ALL.map((d) => [d.id, norm(`${d.name} ${d.title} ${d.traits.join(" ")}`)]));
// dans une famille : personnages par coût, puis lieux, objets, événements (comme un classeur)
const byFamily = (a, b) => FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam) || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  || a.cost - b.cost || a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id);
const byCost = (a, b) => a.cost - b.cost || a.name.localeCompare(b.name, "fr") || FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam) || a.id.localeCompare(b.id);
const SHOW = [["all", "Toutes"], ["own", "Obtenues"], ["miss", "Manquantes"], ["foil", "Brillantes"]];

export default function Album({ t, onClose, shine }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [show, setShow] = useState("all");
  const [tri, setTri] = useState(loadTri);
  const [lim, setLim] = useState(STEP);
  const [zoom, setZoom] = useState(null); // index dans la liste affichée
  const end = useRef(null);
  const body = useRef(null);
  const has = (id) => (t.coll[id] || 0) + (t.foil[id] || 0) > 0;
  const byFam = tri !== "cost";

  const list = useMemo(() => {
    const s = norm(q.trim());
    return ALL.filter((d) => (fam === "all" || d.fam === fam) && (!s || KEY.get(d.id).includes(s))
      && (show === "all" || (show === "own" ? has(d.id) : show === "miss" ? !has(d.id) : (t.foil[d.id] || 0) > 0)))
      .sort(byFam ? byFamily : byCost);
  }, [q, fam, show, byFam, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // compteurs des en-têtes (sur toutes les cartes du groupe, quel que soit le filtre « afficher »)
  const counts = useMemo(() => {
    const m = {};
    for (const d of ALL) {
      if (!byFam && fam !== "all" && d.fam !== fam) continue;
      const g = byFam ? d.fam : d.cost, x = (m[g] = m[g] || { n: 0, ok: 0 });
      x.n++; if (has(d.id)) x.ok++;
    }
    return m;
  }, [byFam, fam, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => ({ ok: ALL.filter((d) => has(d.id)).length, foil: ALL.filter((d) => (t.foil[d.id] || 0) > 0).length }), [t]); // eslint-disable-line react-hooks/exhaustive-deps

  // on affiche les cartes par paquets, au fil du défilement (2 000 cartes d'un coup seraient lourdes sur un téléphone)
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setLim((l) => l + STEP); }, { root: body.current, rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, lim]);
  useEffect(() => { setLim(STEP); if (body.current) body.current.scrollTop = 0; }, [q, fam, show, tri]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && zoom === null) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [zoom, onClose]);

  const groups = [];
  for (const d of list.slice(0, lim)) {
    const g = byFam ? d.fam : d.cost;
    if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, cards: [] });
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
        <select value={tri} onChange={(e) => { setTri(e.target.value); saveTri(e.target.value); }} aria-label="Tri"><option value="fam">Par famille</option><option value="cost">Par coût (familles mêlées)</option></select>
      </div>
      <div className="alb-body" ref={body}>
        {groups.map(({ g, cards }) => {
          const c = counts[g] || { n: 0, ok: 0 }, f = byFam ? FAMILY[g] : null;
          return (
            <section key={g} className="alb-sec">
              <div className="alb-head" style={{ "--fc": f ? f.color : "#ffd166" }}>
                {f ? <Icon name={f.icon} size={16} /> : <Icon name="coins" size={16} />}
                <b>{f ? f.name : `Coût ${g}`}</b>
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
