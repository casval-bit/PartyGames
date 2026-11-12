// Liste de toutes les cartes du Trône des Mondes, avec le nom exact à donner à chaque fichier image
// (Collection › Illustrations › « Liste des cartes »). On copie un nom d'un toucher, ou tous les noms affichés d'un coup,
// et on ouvre une carte pour lui choisir directement son image.
import { useMemo, useState } from "react";
import { ALL, FAMILY, PLAYABLE, TYPE_BONUS, subWords } from "../cards/index.js";
import { RARITY, CARD_TYPES } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { useArtInfo, artFile } from "./artStore.js";

const FAM_ORDER = [...PLAYABLE.map((f) => f.id), "neutre"];
const TYPE_ORDER = ["char", "loc", "obj", "evt"];
const TYPE_PL = { char: "Personnages", loc: "Lieux", obj: "Objets", evt: "Événements" };
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;

/** Copie un texte (presse-papiers, ou à défaut l'ancienne méthode par sélection). */
export async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch { /* refusé : méthode de secours */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = s; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

/** Tri choisi (famille par famille, ou toutes familles mêlées par coût), gardé sur l'appareil. */
const TRI_KEY = "trone-tri";
export function loadTri() { try { return localStorage.getItem(TRI_KEY) === "cost" ? "cost" : "fam"; } catch { return "fam"; } }
export function saveTri(v) { try { localStorage.setItem(TRI_KEY, v); } catch { /* stockage indisponible */ } }
const byCost = (a, b) => a.d.cost - b.d.cost || a.d.name.localeCompare(b.d.name, "fr") || FAM_ORDER.indexOf(a.d.fam) - FAM_ORDER.indexOf(b.d.fam) || TYPE_ORDER.indexOf(a.d.type) - TYPE_ORDER.indexOf(b.d.type);

let ROWS = null;
const rows = () => ROWS || (ROWS = ALL.map((d) => ({ d, file: artFile(d), k: norm(`${d.name} ${d.title} ${artFile(d)} ${d.traits.join(" ")}`) }))
  .sort((a, b) => FAM_ORDER.indexOf(a.d.fam) - FAM_ORDER.indexOf(b.d.fam) || TYPE_ORDER.indexOf(a.d.type) - TYPE_ORDER.indexOf(b.d.type)
    || a.d.name.localeCompare(b.d.name, "fr") || a.d.cost - b.d.cost));

export default function ArtList({ onZoom, flash, onClose }) {
  const art = useArtInfo();
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [type, setType] = useState("all");
  const [todo, setTodo] = useState(false);
  const [lim, setLim] = useState(150);
  const [tri, setTri] = useState(loadTri);
  const byFam = tri !== "cost";
  const list = useMemo(() => {
    const s = norm(q.trim());
    const l = rows().filter(({ d, k }) => (fam === "all" || d.fam === fam) && (type === "all" || d.type === type) && (!todo || !art.ids.has(d.id)) && (!s || k.includes(s)));
    return byFam ? l : l.sort(byCost);
  }, [q, fam, type, todo, byFam, art.count]); // eslint-disable-line react-hooks/exhaustive-deps
  // compteurs des en-têtes : par famille, ou par coût (dans la famille choisie, s'il y en a une)
  const perGroup = useMemo(() => {
    const m = {};
    for (const { d } of rows()) {
      if (type !== "all" && d.type !== type) continue;
      if (!byFam && fam !== "all" && d.fam !== fam) continue;
      const x = (m[byFam ? d.fam : d.cost] = m[byFam ? d.fam : d.cost] || { n: 0, ok: 0 }); x.n++; if (art.ids.has(d.id)) x.ok++;
    }
    return m;
  }, [type, fam, byFam, art.count]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.slice(0, lim);
  const copy = async (text, msg) => { const ok = await copyText(text); flash(ok ? msg : "Copie impossible ici : appuie longuement sur le nom pour le sélectionner."); if (ok) sfx.select(); };
  const meta = (d) => [byFam ? null : FAMILY[d.fam].short || FAMILY[d.fam].name, CARD_TYPES[d.type], `coût ${d.cost}`, d.type === "char" ? `force ${d.str}` : null, RARITY[d.r].name,
    d.pt && d.pt.length ? `${subWords(d.fam).one} ${d.pt.map((t) => (TYPE_BONUS[t] ? TYPE_BONUS[t].name : t)).join("/")}` : null, d.st ? "exclusive (deck de départ)" : null].filter(Boolean).join(" · ");
  let prev = null;
  return (
    <div className="ag-sheet al-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="cliplist" size={18} />Liste des cartes</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <p className="al-help">Le nom en bleu est celui à donner au fichier image (par exemple <b>{rows()[0] ? `${rows()[0].file}.jpg` : "Onze 7.jpg"}</b>). Touche-le pour le copier ; touche la carte pour l'ouvrir et lui choisir son image tout de suite.</p>
        <input className="hub-search" placeholder="Chercher un nom, un trait…" value={q} onChange={(e) => { setQ(e.target.value); setLim(150); }} aria-label="Chercher une carte" />
        <div className="hub-filters">
          <button aria-pressed={todo} onClick={() => { setTodo(!todo); setLim(150); }}><Icon name="imageoff" size={13} /> Sans illustration</button>
          <select value={fam} onChange={(e) => { setFam(e.target.value); setLim(150); }} aria-label="Famille"><option value="all">Toutes les familles</option>{FAM_ORDER.map((f) => <option key={f} value={f}>{FAMILY[f].name}</option>)}</select>
          <select value={type} onChange={(e) => { setType(e.target.value); setLim(150); }} aria-label="Type"><option value="all">Tous types</option>{TYPE_ORDER.map((x) => <option key={x} value={x}>{TYPE_PL[x]}</option>)}</select>
          <select value={tri} onChange={(e) => { setTri(e.target.value); saveTri(e.target.value); setLim(150); }} aria-label="Tri"><option value="fam">Tri par famille</option><option value="cost">Tri par coût (familles mêlées)</option></select>
        </div>
        <div className="al-count">
          <span>{plural(list.length, "carte")}{todo ? " sans illustration" : ""}</span>
          {list.length > 0 && <button className="btn small ghost" onClick={() => copy(list.map((r) => r.file).join("\n"), `${plural(list.length, "nom")} copié${list.length > 1 ? "s" : ""}.`)}><Icon name="copy" size={15} />Copier {list.length > 1 ? `les ${list.length} noms` : "le nom"}</button>}
        </div>
        <div className="al-list">
          {shown.map(({ d, file }) => {
            const g = byFam ? d.fam : d.cost;
            const head = g !== prev;
            prev = g;
            const f = FAMILY[d.fam], has = art.ids.has(d.id), pg = perGroup[g] || { n: 0, ok: 0 };
            return (
              <div key={d.id} style={{ display: "contents" }}>
                {head && (byFam
                  ? <div className="al-fam" style={{ "--fc": f.color }}><i /><Icon name={f.icon} size={15} />{f.name}<small>{pg.ok} / {pg.n} illustrées</small></div>
                  : <div className="al-fam" style={{ "--fc": "#ffd166" }}><i />Coût {d.cost}<small>{pg.ok} / {pg.n} illustrées</small></div>)}
                <div className={"al-row" + (has ? " done" : "")}>
                  <button className="al-main" onClick={() => onZoom(d.id)} aria-label={`Ouvrir ${d.name}, ${d.title}`}>
                    <span className="al-l1"><b>{d.name}</b><small>{d.title}</small></span>
                    <span className="al-meta">{meta(d)}</span>
                  </button>
                  <div className="al-l3">
                    <button className="al-file" onClick={() => copy(file, `« ${file} » copié.`)} aria-label={`Copier le nom de fichier ${file}`}><Icon name="copy" size={14} /><span>{file}</span></button>
                    {has && <span className="al-ok"><Icon name="check" size={15} />Illustrée</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {list.length > lim && <button className="btn ghost" onClick={() => setLim(lim + 200)}>Voir plus ({list.length - lim})</button>}
          {!list.length && <div className="hub-empty">{todo ? "Toutes ces cartes ont déjà leur illustration." : "Aucune carte avec ces filtres."}</div>}
        </div>
      </div>
    </div>
  );
}
