// Trône des Mondes : la collection du joueur. Deck de départ (une fois), decks, collection, boutique (cartes du jour, les deux
// Portails et les boosters, en onglets), quêtes et succès. Tout est enregistré dans le profil (profile.tcg), donc suit le compte
// d'un téléphone à l'autre.
import { useEffect, useMemo, useState } from "react";
import { ALL, CARD, FAMILY, PLAYABLE, subOf } from "../cards/index.js";
import { RARITY, RARITY_ORDER, CARD_TYPES, GAME_NAME } from "../rules.js";
import { themeStarters, baseThemes, validateDeck, defaultPlots, familyMix } from "../deck.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import DeckBuilder from "./DeckBuilder.jsx";
import PackOpen, { packColor, packIcon } from "./PackOpen.jsx";
import RulesGuide from "./RulesGuide.jsx";
import { useArtInfo, importFiles, syncRemote } from "./artStore.js";
import ArtList, { loadTri, saveTri } from "./ArtList.jsx";
import Album from "./Album.jsx";
import { APPAREIL } from "../../lib/device.js";
import { useTcgPrefs } from "../prefs.js";
import HubHome, { HubCurrencies, markShopSeen, shopSeenToday } from "./HubHome.jsx";
import TcgProfile from "./TcgProfile.jsx";
import TcgSettings from "./TcgSettings.jsx";
import Portals from "./Portals.jsx";
import Portrait from "./Portrait.jsx";
import { portalsOf } from "../portals.js";
import { canTest } from "../../config.js";

const EC =({ n }) => <span className="hub-price"><Icon name="gem" size={14} />{n.toLocaleString("fr-FR")}</span>;
/** Récompenses d'une quête, en toutes lettres : « +70 Éclats », « 1 ticket de portail », « Booster Multivers »… */
const rewardText = (rw) => [
  rw.ec ? `+${rw.ec} Éclats` : "",
  rw.tk ? `${rw.tk} ticket${rw.tk > 1 ? "s" : ""} de portail` : "",
  ...Object.entries(rw.packs || {}).map(([k, x]) => `${x > 1 ? x + " " : ""}${(P.packDef(k) || { name: "booster" }).name}`),
].filter(Boolean).join(" · ");
/** Rendre brillante une carte de la collection (CardZoom, prop shine) : jetons de brillance du joueur. */
const shineOf = (t, setT, flash) => ({
  jet: t.jet,
  onShine: (id) => {
    const r = P.shineCard(t, id);
    if (r.error) { flash(r.error); sfx.error(); return; }
    setT(r.t); sfx.win(); flash(`${CARD[id].name} est maintenant brillante (-${r.cost} jeton${r.cost > 1 ? "s" : ""}).`);
  },
});
const famStyle = (f, pt) => ({ "--fc": subOf(f.id, pt) ? subOf(f.id, pt).color : f.color });
const fmtTime = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`; };

/* ------------------------------ deck de départ ------------------------------ */
function StarterPick({ onPick }) {
  const all = useMemo(() => baseThemes(), []); // les 8 decks de départ (cards/themes.js), faits à la main
  const [sel, setSel] = useState(null);
  const [look, setLook] = useState(null);
  const [zoom, setZoom] = useState(null);
  const s = sel ? all.find((x) => x.id === sel) : null;
  return (
    <div className="hub-body">
      <div className="hub-card">
        <h3 style={{ fontSize: "1.05rem" }}>Choisis ton deck de départ</h3>
        <p className="muted" style={{ margin: 0, fontSize: ".86rem" }}>Huit decks à thème, prêts à jouer. Celui que tu choisis débloque ses 50 cartes (dont parfois une version exclusive d'un héros). Ce choix est définitif : toutes les autres cartes s'obtiennent ensuite dans les boosters. Tu reçois aussi les cartes neutres (sauf les épiques et les légendaires, à gagner), 300 Éclats et 3 boosters.</p>
      </div>
      <div className="hub-themes">
        {all.map((st) => {
          const f = FAMILY[st.fam], sub = subOf(st.fam, st.pt);
          const sevens = Object.keys(st.cards).filter((id) => CARD[id].cost >= 7).sort((a, b) => (a === st.leader ? -1 : b === st.leader ? 1 : 0));
          return (
            <button key={st.id} className="hub-starter hub-theme" data-testid={`starter-${st.id}`} style={famStyle(f, st.pt)} aria-pressed={sel === st.id} onClick={() => { setSel(st.id); sfx.select(); }}>
              <span className="hub-theme-cards">{sevens.map((id) => <CardFace key={id} d={CARD[id]} w={64} />)}</span>
              <div style={{ minWidth: 0 }}>
                <b>{st.name}</b>
                <small className="hub-theme-fam"><Icon name={f.icon} size={12} />{f.short || f.name}{sub ? ` · ${sub.name}` : ""}</small>
                <p>{st.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      {s && (
        <div className="hub-card" style={{ position: "sticky", bottom: 0, zIndex: 3 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setLook(s)}><Icon name="search" size={18} />Voir les cartes</button>
            <button className="btn primary" style={{ flex: 1.4 }} onClick={() => onPick(s.id)}><Icon name="check" size={18} />Choisir ce deck</button>
          </div>
        </div>
      )}
      {look && (
        <div className="ag-sheet" onClick={() => setLook(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <div className="row spread"><h3>{look.name}</h3><button className="iconbtn" onClick={() => setLook(null)} aria-label="Fermer"><Icon name="close" /></button></div>
            <div className="ag-grid">{Object.entries(look.cards).sort((a, b) => RARITY_ORDER.indexOf(CARD[b[0]].r) - RARITY_ORDER.indexOf(CARD[a[0]].r) || CARD[b[0]].cost - CARD[a[0]].cost).map(([id, n]) => <div key={id} className="gi"><CardFace d={CARD[id]} own={`×${n}`} onClick={() => setZoom(id)} /></div>)}</div>
          </div>
        </div>
      )}
      {zoom && <CardZoom id={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ------------------------------ decks ------------------------------ */
/** Les familles d'un deck en quelques pastilles (la plus présente d'abord), pour la liste des decks. */
function DeckFams({ cards }) {
  const mix = familyMix(cards).filter((m) => m.fam !== "neutre");
  if (!mix.length) return null;
  return (
    <span className="hub-deckfams">
      {mix.slice(0, 4).map((m) => { const f = FAMILY[m.fam]; return <span key={m.fam} style={{ "--fc": f.color }} title={`${f.name} : ${m.n} cartes`}><Icon name={f.icon} size={12} />{f.short || f.name} {m.n}</span>; })}
      {mix.length > 4 && <span>+{mix.length - 4}</span>}
    </span>
  );
}
function Decks({ t, own, setT, onEdit, flash }) {
  const [del, setDel] = useState(null);
  const [tpl, setTpl] = useState(false);
  const themes = useMemo(() => themeStarters(), []);
  return (
    <div className="hub-body">
      <div className="hub-sec hub-decks">
        <h3>Mes decks <small>le deck coché est celui que tu joues en partie</small></h3>
        {t.decks.map((d) => {
          const v = validateDeck(d, own);
          const f = FAMILY[v.fam] || FAMILY.neutre;
          const on = t.sel === d.id;
          return (
            <div key={d.id} className="hub-card" style={on ? { borderColor: "var(--cyan)", boxShadow: "var(--halo)" } : undefined}>
              <div className="hub-row">
                <span className="hub-fam" style={{ "--fc": f.color }}><Icon name={f.icon} size={20} /></span>
                <div className="grow" style={{ minWidth: 0 }}><b>{d.name}</b><small>{v.counts.total || 0} cartes · {v.mix.filter((m) => m.fam !== "neutre").length > 1 ? `${v.mix.filter((m) => m.fam !== "neutre").length} familles` : f.name}</small></div>
                {v.ok ? <span className="pill ok">Prêt</span> : <span className="pill pink">À compléter</span>}
              </div>
              <DeckFams cards={d.cards} />
              {!v.ok && <small style={{ color: "#ffd3e1", fontSize: ".78rem" }}>{v.errors[0]}{v.errors.length > 1 ? ` (+${v.errors.length - 1})` : ""}</small>}
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {on
                  ? <span className="pill ok hub-played"><Icon name="check" size={14} />Deck joué en partie</span>
                  : <button className="btn small" disabled={!v.ok} onClick={() => { setT(P.selectDeck(t, d.id)); sfx.apply(); }}><Icon name="play" size={16} />Jouer avec</button>}
                <button className="btn small ghost" onClick={() => onEdit(d)}><Icon name="edit" size={16} />Modifier</button>
                <button className="btn small ghost" onClick={() => { setT(P.saveDeck(t, { ...d, id: null, name: `${d.name} (copie)`.slice(0, 32) })); flash("Deck copié."); }}><Icon name="layers" size={16} />Copier</button>
                {del === d.id
                  ? <button className="btn small" style={{ borderColor: "var(--danger)" }} onClick={() => { setT(P.deleteDeck(t, d.id)); setDel(null); }}>Confirmer</button>
                  : <button className="btn small ghost" onClick={() => setDel(d.id)} aria-label={`Supprimer ${d.name}`}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hub-sec">
        <h3>Nouveau deck <small>toutes les familles se mélangent : seules comptent les règles de construction</small></h3>
        <div className="hub-newdeck">
          <button className="hub-card hub-newbtn" onClick={() => onEdit({ id: null, name: "Mon deck", fam: null, pt: null, cards: {}, plots: defaultPlots(null) })} data-testid="deck-new">
            <span className="hub-newbtn-i"><Icon name="plus" size={22} /></span>
            <span className="grow"><b>Créer un deck</b><small>Un deck vide : choisis tes cartes dans toutes les familles.</small></span>
          </button>
          <button className="hub-card hub-newbtn" onClick={() => setTpl((x) => !x)} aria-expanded={tpl} data-testid="deck-from-theme">
            <span className="hub-newbtn-i"><Icon name="library" size={22} /></span>
            <span className="grow"><b>Partir d'un deck à thème</b><small>Une copie à modifier ; les cartes que tu n'as pas encore sont signalées.</small></span>
          </button>
        </div>
        {tpl && [[false, "Les decks de départ"], [true, "Les autres decks à thème"]].map(([extra, label]) => (
          <div key={label} className="hub-tplgrp">
            <small className="hub-tplgrp-h">{label}</small>
            <div className="hub-tpls">
              {themes.filter((s) => Boolean(s.extra) === extra).map((s) => {
                const f = FAMILY[s.fam], sub = subOf(s.fam, s.pt);
                const miss = Object.entries(s.cards).reduce((k, [id, n]) => k + Math.max(0, n - (own[id] || 0)), 0);
                return (
                  <button key={s.id} className="hub-tpl" style={{ "--fc": sub ? sub.color : f.color }} title={s.desc} onClick={() => { onEdit({ id: null, name: `${s.name} (perso)`.slice(0, 32), fam: s.fam, pt: null, cards: { ...s.cards }, plots: [...s.plots] }); setTpl(false); }} data-testid={"deck-tpl-" + s.id}>
                    <Icon name={f.icon} size={16} /><b>{s.name}</b><small>{miss ? `il te manque ${miss} carte${miss > 1 ? "s" : ""}` : "toutes à toi"}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ collection ------------------------------ */
function Collection({ t, own, setT, flash }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [type, setType] = useState("all");
  const [rar, setRar] = useState("all");
  const [mine, setMine] = useState(true);
  const [lim, setLim] = useState(48);
  const [zoom, setZoom] = useState(null);
  const [imp, setImp] = useState(null);
  const [rc, setRc] = useState(false);
  const [names, setNames] = useState(false);
  const [tri, setTri] = useState(loadTri);
  const [album, setAlbum] = useState(false);
  const art = useArtInfo();
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ALL.filter((d) => (!mine || own[d.id]) && (fam === "all" || d.fam === fam) && (type === "all" || d.type === type) && (rar === "all" || d.r === rar)
      && (!s || d.name.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || d.traits.some((x) => x.toLowerCase().includes(s))))
      .sort(tri === "cost"
        ? (a, b) => a.cost - b.cost || a.name.localeCompare(b.name, "fr") || RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r) || a.fam.localeCompare(b.fam)
        : (a, b) => a.fam.localeCompare(b.fam) || RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r) || b.cost - a.cost);
  }, [q, fam, type, rar, mine, own, tri]);
  const distinct = Object.keys(own).length;
  const rec = P.recyclable(t);
  const doImport = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setImp({ busy: true, i: 0, n: files.length });
    const r = await importFiles(files, (i, n) => setImp({ busy: true, i, n }));
    e.target.value = "";
    setImp({ busy: false, ...r });
    sfx.apply();
  };
  return (
    <div className="hub-body">
      <div className="hub-card">
        <div className="hub-row">
          <div className="grow"><b>{distinct} / {ALL.length} cartes différentes</b><small>{Object.keys(t.foil).length} brillante{Object.keys(t.foil).length > 1 ? "s" : ""} · {Object.values(own).reduce((s, n) => s + n, 0)} cartes en tout</small></div>
          {rec.n > 0 && (rc
            ? <button className="btn small good" onClick={() => { const r = P.recycle(t); setT(r.t); setRc(false); flash(`${r.n} doubles recyclés : +${r.gained} Éclats, +${r.jet} jeton${r.jet > 1 ? "s" : ""} de brillance.`); sfx.apply(); }}>Confirmer +{rec.gained}</button>
            : <button className="btn small" onClick={() => setRc(true)}><Icon name="repeat" size={16} />Recycler</button>)}
        </div>
        {rec.n > 0 && <small className="muted" style={{ fontSize: ".76rem" }}>Recycler transforme les exemplaires en trop ({rec.n} : au-delà de 2 normales et 1 brillante) en {rec.gained} Éclats et {rec.jet} jeton{rec.jet > 1 ? "s" : ""} de brillance.</small>}
        <small className="muted" style={{ fontSize: ".76rem" }}><Icon name="sparkles" size={13} /> {t.jet} jeton{t.jet > 1 ? "s" : ""} de brillance : touche une de tes cartes (coût 6 ou moins) pour la rendre brillante. Les cartes 7 le sont toujours.</small>
        <span className="bar2 blue" style={{ display: "block" }}><i style={{ width: `${(100 * distinct) / ALL.length}%` }} /></span>
      </div>
      <button className="hub-card alb-entry" onClick={() => { setAlbum(true); sfx.select(); }}>
        <span className="alb-ico"><Icon name="library" size={22} /></span>
        <span className="grow"><b>Album : toutes les cartes</b><small>Celles qui te manquent sont grisées ; touche une carte pour la voir en grand.</small></span>
        <Icon name="next" />
      </button>
      <input className="hub-search" placeholder="Chercher un nom, un trait…" value={q} onChange={(e) => { setQ(e.target.value); setLim(48); }} aria-label="Chercher une carte" />
      <div className="hub-filters">
        <button aria-pressed={mine} onClick={() => setMine(!mine)}>{mine ? "Mes cartes" : "Toutes"}</button>
        <select value={fam} onChange={(e) => { setFam(e.target.value); setLim(48); }} aria-label="Famille"><option value="all">Toutes les familles</option>{[...PLAYABLE, FAMILY.neutre].map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="all">Tous types</option>{["char", "loc", "obj", "evt"].map((x) => <option key={x} value={x}>{CARD_TYPES[x]}</option>)}</select>
        <select value={rar} onChange={(e) => setRar(e.target.value)} aria-label="Rareté"><option value="all">Toutes raretés</option>{RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}</select>
        <select value={tri} onChange={(e) => { setTri(e.target.value); saveTri(e.target.value); setLim(48); }} aria-label="Tri"><option value="fam">Tri par famille</option><option value="cost">Tri par coût</option></select>
      </div>
      <div className="hub-grid">
        {list.slice(0, lim).map((d) => {
          const n = t.coll[d.id] || 0, f = t.foil[d.id] || 0;
          return <CardFace key={d.id} d={d} foil={f > 0} missing={!n && !f} own={n || f ? `×${n + f}${f ? " ✦" : ""}` : null} onClick={() => setZoom(d.id)} />;
        })}
      </div>
      {list.length > lim && <button className="btn ghost" onClick={() => setLim(lim + 48)}>Voir plus ({list.length - lim})</button>}
      {!list.length && <div className="hub-empty">Aucune carte avec ces filtres.</div>}

      <div className="hub-sec" style={{ marginTop: 6 }}>
        <h3><Icon name="image" size={18} />Illustrations <small>{art.count} carte{art.count > 1 ? "s" : ""} illustrée{art.count > 1 ? "s" : ""}</small></h3>
        <div className="hub-card">
          <p style={{ margin: 0, fontSize: ".84rem", color: "var(--txt-2)" }}>Chaque carte a une illustration générée par l'appli. Tu peux la remplacer par tes propres images : une par une (touche une carte, « Choisir une image »), ou plusieurs d'un coup ci-dessous. Nomme chaque fichier comme la carte : <b>« Gryfenfer 7.jpg »</b> pour un personnage (nom + coût), <b>« Gryfenfer.jpg »</b> pour toutes ses versions, le nom seul pour un lieu, un objet ou un événement. La liste des cartes donne le nom exact de chacune.</p>
          {art.bundled > 0 && <small className="muted" style={{ fontSize: ".76rem" }}>{art.bundled} illustration{art.bundled > 1 ? "s" : ""} intégrée{art.bundled > 1 ? "s" : ""} à l'appli (dossier illustrations du projet) : rien à importer pour celles-là.</small>}
          <button className="btn ghost" onClick={() => setNames(true)}><Icon name="cliplist" size={18} />Liste des cartes et noms de fichiers</button>
          <label className="btn" style={{ cursor: "pointer" }}><Icon name="upload" size={18} />{imp && imp.busy ? `Import… ${imp.i}/${imp.n}` : "Importer des images"}<input type="file" accept="image/*" multiple hidden onChange={doImport} disabled={imp && imp.busy} /></label>
          {imp && !imp.busy && <div style={{ fontSize: ".82rem" }}><b>{imp.cards} carte{imp.cards > 1 ? "s" : ""} illustrée{imp.cards > 1 ? "s" : ""}</b> ({imp.ok} image{imp.ok > 1 ? "s" : ""}).{imp.bad.length > 0 && <div style={{ color: "#ffd3e1", marginTop: 4 }}>Non reconnues : {imp.bad.slice(0, 8).join(", ")}{imp.bad.length > 8 ? "…" : ""}</div>}</div>}
          {imp && !imp.busy && imp.ids && imp.ids.length > 0 && (
            <>
              <small className="muted" style={{ fontSize: ".76rem" }}>Chaque image a été recadrée automatiquement au format de sa carte (pleine carte pour les légendaires). Vérifie : touche une carte, puis « Recadrer » si le sujet est mal placé.</small>
              <div className="tz-att hub-strip">{imp.ids.slice(0, 120).map((id) => CARD[id] && <CardFace key={id} d={CARD[id]} w={84} onClick={() => setZoom(id)} />)}</div>
            </>
          )}
          <small className="muted" style={{ fontSize: ".76rem" }}>
            {art.remote.state === "ok" ? "Partage activé : les illustrations ajoutées par un joueur connecté à son compte apparaissent chez tous ses amis."
              : art.remote.state === "missing" ? `Pour partager les illustrations avec tes amis : exécute une fois supabase/tcg_art.sql dans Supabase (voir README). En attendant, elles restent sur ${APPAREIL.ce}.`
              : art.remote.state === "off" ? `Mode local : les illustrations restent sur ${APPAREIL.ce}.`
              : art.remote.state === "error" ? "Partage indisponible pour l'instant (connexion ?)." : "Synchronisation…"}
          </small>
          {(art.remote.state === "error" || art.remote.state === "ok") && <button className="btn small ghost" onClick={() => syncRemote(true)}><Icon name="reset" size={16} />Actualiser</button>}
        </div>
      </div>
      {names && <ArtList flash={flash} onZoom={setZoom} onClose={() => setNames(false)} />}
      {album && <Album t={t} shine={shineOf(t, setT, flash)} onClose={() => setAlbum(false)} />}
      {zoom && <CardZoom id={zoom} foil={(t.foil[zoom] || 0) > 0} owned={{ n: t.coll[zoom] || 0, f: t.foil[zoom] || 0 }} art shine={shineOf(t, setT, flash)} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ------------------------------ boosters ------------------------------ */
function packRow(p, right) {
  return (
    <div key={p.id} className="hub-pack" style={{ "--pc": packColor(p) }} title={p.desc}>
      <span className="pi"><Icon name={packIcon(p)} size={18} /></span>
      <div className="grow" style={{ flex: 1, minWidth: 0 }}><b style={{ fontFamily: "var(--display)", fontSize: ".92rem" }}>{p.name}</b><small style={{ display: "block", fontSize: ".74rem", color: "var(--txt-2)" }}>{p.desc}</small></div>
      {right}
    </div>
  );
}
/** Boosters à ouvrir : un par un, ou par groupe de 5 (OPEN_MAX) d'un coup. */
function PacksMine({ t, onOpen }) {
  const mine = Object.entries(t.packs).filter(([, n]) => n > 0).map(([id, n]) => ({ p: P.packDef(id), n })).filter((x) => x.p);
  const total = mine.reduce((s, x) => s + x.n, 0);
  return (
    <div className="hub-sec hp-mine">
      <h3>Mes boosters <small>{total} à ouvrir{mine.some((x) => x.n > 1) ? ` · jusqu'à ${P.OPEN_MAX} d'un coup` : ""}</small></h3>
      {mine.length ? mine.map(({ p, n }) => packRow(p, <>
        <span className="cnt">{n}</span>
        {n > 1 && <button className="btn small hp-many" onClick={() => onOpen(p.id, Math.min(P.OPEN_MAX, n))} title={`Ouvrir ${Math.min(P.OPEN_MAX, n)} boosters d'un coup`} data-testid={"open-many-" + p.id}><Icon name="layers" size={15} />×{Math.min(P.OPEN_MAX, n)}</button>}
        <button className="btn small primary" onClick={() => onOpen(p.id, 1)}>Ouvrir</button>
      </>)) : <div className="hub-empty">Aucun booster. Monte de niveau, termine des quêtes ou achète-en ci-dessous.</div>}
    </div>
  );
}
/** Boosters à acheter avec les Éclats. */
function PacksBuy({ t, setT, flash, note = true }) {
  const buy = (p) => { const r = P.buyPack(t, p.id); if (r.error) { flash(r.error); sfx.error(); return; } setT(r.t); sfx.apply(); flash(`${p.name} acheté !`); };
  return (
    <>
      <div className="hub-sec hp-buy">
        <h3>Acheter des boosters <small>tu as <EC n={t.ec} /></small></h3>
        {P.PACKS.map((p) => packRow(p, <button className="btn small" disabled={t.ec < p.price} onClick={() => buy(p)}><EC n={p.price} /></button>))}
      </div>
      {note && <p className="muted hub-note">Chaque booster : 5 cartes, au moins une rare, et des jetons de brillance en bonus (1, ou 3 pour un Prestige ; parfois un de plus). Le Booster Découverte ne donne que des cartes que tu n'as pas encore (tant qu'il en reste). Quand tu en as plusieurs du même type, « ×5 » en ouvre jusqu'à {P.OPEN_MAX} d'un coup. Les cartes 7 sont toujours brillantes ; les autres ne le sont jamais en sortant d'un booster : on les rend brillantes avec les jetons (Mes cartes, touche une carte). 1 booster sur 200 est doré : que des rares ou mieux, et 10 jetons en plus. Les versions exclusives des decks de départ et les cartes neutres offertes à tout le monde (communes, peu communes et rares) ne sortent jamais des boosters : les neutres épiques et légendaires, si.</p>}
    </>
  );
}
function Packs({ t, setT, flash, onOpen }) {
  return (
    <div className="hub-body">
      <PacksMine t={t} onOpen={onOpen} />
      <PacksBuy t={t} setT={setT} flash={flash} />
    </div>
  );
}

/* ------------------------------ boutique ------------------------------ */
function Shop({ t, setT, flash }) {
  const day = P.today();
  const offers = useMemo(() => P.shopOffers(t, day), [t.seed, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const bought = t.shop && t.shop.day === day ? t.shop.bought : [];
  const [conf, setConf] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [left, setLeft] = useState(P.msToMidnight());
  useEffect(() => { const iv = setInterval(() => setLeft(P.msToMidnight()), 30000); return () => clearInterval(iv); }, []);
  const buy = (o) => {
    if (conf !== o.i) { setConf(o.i); return; }
    const r = P.buyOffer(t, o.i, day);
    setConf(null);
    if (r.error) { flash(r.error); sfx.error(); return; }
    setT(r.t); sfx.win(); flash(`${CARD[o.id].name}${o.foil ? " brillante" : ""} rejoint ta collection !`);
  };
  return (
    <div className="hub-body hub-shop">
      <div className="hub-card">
        <div className="hub-row"><div className="grow"><b>6 cartes au hasard parmi toutes les cartes du jeu</b><small>Nouvelle sélection dans {fmtTime(left)}. La carte vedette est la plus rare.</small></div><EC n={t.ec} /></div>
      </div>
      <div className="hub-grid">
        {offers.map((o) => {
          const d = CARD[o.id];
          const sold = bought.includes(o.i);
          return (
            <div key={o.i} className={"hub-offer" + (o.star ? " star" : "")}>
              <CardFace d={d} foil={o.foil} onClick={() => setZoom(o)} own={(t.coll[o.id] || 0) + (t.foil[o.id] || 0) ? `déjà ×${(t.coll[o.id] || 0) + (t.foil[o.id] || 0)}` : null} />
              {sold && <span className="sold">VENDU</span>}
              {o.star && <span className="pill warn" style={{ alignSelf: "center" }}>Vedette</span>}
              <button className={"btn " + (conf === o.i ? "primary" : "")} disabled={sold || t.ec < o.price} onClick={() => buy(o)}>{sold ? "Acheté" : conf === o.i ? "Confirmer" : <EC n={o.price} />}</button>
            </div>
          );
        })}
      </div>
      <p className="muted hub-note">Prix : commune 80, peu commune 200, rare 500, épique 1 200, légendaire 3 000 Éclats. Les cartes 7 sont toujours brillantes ; les autres se rendent brillantes avec des jetons de brillance.</p>
      {zoom && <CardZoom id={zoom.id} foil={zoom.foil} owned={{ n: t.coll[zoom.id] || 0, f: t.foil[zoom.id] || 0 }} onClose={() => setZoom(null)} />}
    </div>
  );
}

/**
 * La boutique : un bandeau vertical à 4 onglets (cartes du jour, Portail des Légendes, Monde à l'honneur, boosters),
 * et le contenu de l'onglet choisi en grand à côté. Une seule bannière de portail à la fois, jamais côte à côte.
 */
function ShopHub({ t, setT, flash, tab, onTab, onOpen, onPull, nPacks }) {
  const day = P.today();
  const por = useMemo(() => portalsOf(day), [day]);
  const [left, setLeft] = useState(P.msToMidnight());
  useEffect(() => { const iv = setInterval(() => setLeft(P.msToMidnight()), 30000); return () => clearInterval(iv); }, []);
  const tabs = [
    { id: "day", icon: "store", label: "Boutique du jour", short: "Du jour", over: "Cartes à l'unité", sub: `6 cartes, nouvelles dans ${fmtTime(left)}`, color: "#ffd166",
      badge: tab !== "day" && !shopSeenToday() ? "•" : null },
    { id: "leg", icon: "orbit", label: por.leg.sub, short: "Légendes", over: por.leg.name, sub: `Cible : ${CARD[P.portalTarget(t, por.leg)].name}`, color: por.leg.color,
      star: P.portalTarget(t, por.leg), badge: !t.por.gift ? "!" : null },
    { id: "monde", icon: FAMILY[por.monde.fam].icon, label: por.monde.sub, short: "Monde", over: por.monde.name, sub: `Cible : ${CARD[P.portalTarget(t, por.monde)].name}`, color: por.monde.color,
      star: P.portalTarget(t, por.monde) },
    { id: "packs", icon: "gift", label: "Boosters", short: "Boosters", over: "Acheter, ouvrir", sub: nPacks ? `${nPacks} à ouvrir, d'autres à acheter` : "5 cartes chacun, contre des Éclats", color: "#b48cff",
      badge: nPacks || null },
  ];
  return (
    <div className="sh" data-tab={tab}>
      <nav className="sh-rail" role="tablist" aria-orientation="vertical" aria-label="Boutique">
        {tabs.map((x) => (
          <button key={x.id} role="tab" id={"shop-tab-" + x.id} aria-selected={tab === x.id} aria-controls="shop-panel" title={`${x.over} : ${x.label}`}
            className={"sh-tab" + (tab === x.id ? " on" : "") + (x.star ? " star" : "")} style={{ "--tc": x.color }} onClick={() => onTab(x.id)} data-testid={"shop-tab-" + x.id}>
            <span className="sh-tab-i">
              {x.star ? <Portrait id={x.star} frame="or" size={46} /> : <Icon name={x.icon} size={24} stroke={1.7} />}
              {x.star && <span className="sh-tab-sub"><Icon name={x.icon} size={12} stroke={2} /></span>}
              {x.badge ? <i className="hh-badge">{x.badge}</i> : null}
            </span>
            <span className="sh-tab-t"><small>{x.over}</small><b>{x.label}</b><em>{x.sub}</em></span>
            <span className="sh-tab-s" aria-hidden="true">{x.short}</span>
          </button>
        ))}
      </nav>
      <div className="sh-main" id="shop-panel" role="tabpanel" aria-labelledby={"shop-tab-" + tab} key={tab}>
        {tab === "day" && <Shop t={t} setT={setT} flash={flash} />}
        {(tab === "leg" || tab === "monde") && <Portals kind={tab} t={t} setT={setT} flash={flash} onPull={onPull} />}
        {tab === "packs" && <Packs t={t} setT={setT} flash={flash} onOpen={onOpen} />}
      </div>
    </div>
  );
}

/* ------------------------------ quêtes ------------------------------ */
function DailyQuests({ t, setT, flash }) {
  const claim = (i) => {
    const r = P.claimQuest(t, i);
    if (r.error) { flash(r.error); return; }
    setT(r.t); sfx.win();
    flash(`+${r.xp} XP · ${rewardText(r)}${r.lvlTo > r.lvlFrom ? ` — niveau ${r.lvlTo} !` : ""}`);
  };
  const reroll = (i) => { const r = P.rerollQuest(t, i); if (r.error) { flash(r.error); return; } setT(r.t); sfx.select(); };
  const chest = () => { const r = P.claimQuestBonus(t); if (r.error) { flash(r.error); return; } setT(r.t); sfx.win(); flash(`Coffre du jour : ${rewardText(r)} !`); };
  const nGot = t.quests.list.filter((q) => q.got).length;
  const ready = P.questBonusReady(t);
  return (
    <div className="hub-sec hq-daily">
      <h3>Quêtes du jour <small>nouvelles dans {fmtTime(P.msToMidnight())}</small></h3>
      {t.quests.list.map((q, i) => {
        const d = P.QUEST_BY[q.id];
        const done = q.n >= d.goal;
        return (
          <div key={i} className={"hub-quest" + (q.got ? " got" : done ? " ok" : "")}>
            <div className="hub-row">
              <div className="grow"><b>{d.text}{d.fam && q.fam ? ` : ${FAMILY[q.fam].name}` : ""}</b><small>+{d.xp} XP · {rewardText(P.questReward(d, q))}</small></div>
              {q.got ? <span className="pill ok"><Icon name="check" size={12} />Fait</span>
                : done ? <button className="btn small good" onClick={() => claim(i)}>Récupérer</button>
                : t.quests.rr < 1 ? <button className="iconbtn" onClick={() => reroll(i)} aria-label="Changer cette quête (une fois par jour)" title="Changer cette quête"><Icon name="reset" size={16} /></button> : null}
            </div>
            <span className="bar2"><i style={{ width: `${(100 * Math.min(q.n, d.goal)) / d.goal}%` }} /></span>
            <small className="muted" style={{ fontSize: ".72rem" }}>{Math.min(q.n, d.goal)} / {d.goal}</small>
          </div>
        );
      })}
      <div className={"hub-quest hq-chest" + (t.quests.bonus ? " got" : ready ? " ok" : "")} data-testid="quest-chest">
        <div className="hub-row">
          <span className="hq-chest-i"><Icon name="gift" size={20} /></span>
          <div className="grow"><b>Coffre du jour</b><small>Les 3 quêtes récupérées : {rewardText(P.QUEST_BONUS)}</small></div>
          {t.quests.bonus ? <span className="pill ok"><Icon name="check" size={12} />Ouvert</span>
            : ready ? <button className="btn small good" onClick={chest}>Ouvrir</button> : <span className="pill dim">{nGot} / 3</span>}
        </div>
      </div>
    </div>
  );
}
const nextRewardText = (lv) => { const n = P.levelReward(lv + 1); return `${Object.entries(n.packs).map(([k, x]) => `${x} ${P.packDef(k).name}`).join(" + ")} et ${n.ec} Éclats`; };
function LevelInfo({ t }) {
  const lv = P.levelOf(t.xp);
  return (
    <div className="hub-sec">
      <h3>Niveaux</h3>
      <div className="hub-card"><small className="muted">Chaque niveau : un Booster Multivers et 50 Éclats. Tous les 5 niveaux : un Booster Prestige et 200 Éclats de plus. Prochain niveau ({lv.lvl + 1}) : {nextRewardText(lv.lvl)}. Chaque partie rapporte de l'XP, même perdue.</small></div>
    </div>
  );
}
/** Succès : ceux à récupérer d'abord, puis ceux à faire, puis ceux obtenus. */
function Milestones({ t, setT, flash, sorted = false }) {
  const ms = P.claimableMilestones(t);
  const rank = (m) => (ms.some((x) => x.id === m.id) ? 0 : t.ms[m.id] ? 2 : 1);
  const list = sorted ? [...P.MILESTONES].sort((a, b) => rank(a) - rank(b)) : P.MILESTONES;
  const n = Object.keys(t.ms).length;
  return (
    <div className="hub-sec hq-ms">
      <h3>Succès <small>{n} / {P.MILESTONES.length}</small></h3>
      {list.map((m) => {
        const got = t.ms[m.id];
        const can = ms.some((x) => x.id === m.id);
        return (
          <div key={m.id} className={"hub-quest" + (got ? " got" : can ? " ok" : "")}>
            <div className="hub-row">
              <div className="grow"><b>{m.text}</b><small>+{m.ec} Éclats{Object.entries(m.packs).map(([k, x]) => ` · ${x} ${P.packDef(k).name}`).join("")}</small></div>
              {got ? <span className="pill ok"><Icon name="check" size={12} />Obtenu</span> : can ? <button className="btn small good" onClick={() => { const r = P.claimMilestone(t, m.id); if (!r.error) { setT(r.t); sfx.win(); flash(`Succès : +${r.ec} Éclats !`); } }}>Récupérer</button> : <span className="pill dim">À faire</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Quests({ t, setT, flash }) {
  return (
    <div className="hub-body">
      <DailyQuests t={t} setT={setT} flash={flash} />
      <LevelInfo t={t} />
      <Milestones t={t} setT={setT} flash={flash} sorted />
    </div>
  );
}

/* ------------------------------ en-tête d'une partie du Trône des Mondes ------------------------------ */
const VIEWS = {
  decks: ["Mes decks", "layers"], coll: ["Mes cartes", "library"], shop: ["Boutique", "store"],
  quests: ["Quêtes et succès", "trophy"], profile: ["Mon profil", "user"],
};
/** Onglets de la boutique, et les anciennes parties qui y mènent (« packs » depuis le lobby ou la fin de partie, pastilles d'en-tête). */
const SHOP_TAB = { day: "day", leg: "leg", monde: "monde", packs: "packs", portals: "leg" };
function SectionHead({ view, t, go, nPacks, onSettings }) {
  const [title, icon] = VIEWS[view];
  return (
    <header className="hs-top">
      <button className="iconbtn" onClick={() => go("home")} aria-label={`Retour à l'accueil de ${GAME_NAME}`} data-testid="hub-home-back"><Icon name="back" /></button>
      <span className="hs-ico" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div className="hs-title"><small>{GAME_NAME}</small><h2>{title}</h2></div>
      <span className="grow" />
      <HubCurrencies t={t} go={go} nPacks={nPacks} />
      <button className="iconbtn" onClick={onSettings} aria-label="Paramètres du jeu" title="Paramètres du jeu"><Icon name="settings" /></button>
    </header>
  );
}

/* ------------------------------ écran principal ------------------------------ */
/**
 * Trône des Mondes : accueil (HubHome) et ses parties (decks, collection, boutique, quêtes, profil).
 * initialTab : partie ouverte d'emblée ("home" par défaut ; "decks", ou "packs" pour l'onglet boosters de la boutique).
 * onPlay : « Jouer » (retour au lobby, ou nouveau lobby Trône des Mondes) ; inRoom : on est déjà dans un lobby.
 */
export default function Hub({ tcg, setTcg, onClose, initialTab, acc, onAccount, name, onName, onPlay, inRoom, homeBack }) {
  const t = useMemo(() => P.ensureQuests(P.normalizeTcg(tcg)), [tcg]);
  const own = useMemo(() => P.owned(t), [t]);
  const [view, setView] = useState(SHOP_TAB[initialTab] ? "shop" : VIEWS[initialTab] ? initialTab : "home");
  const [shopTab, setShopTab] = useState(SHOP_TAB[initialTab] || "day");
  const [edit, setEdit] = useState(null);
  const [opening, setOpening] = useState(null);
  const [toast, setToast] = useState("");
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  const [album, setAlbum] = useState(false);
  const [zoom, setZoom] = useState(null);
  const prefs = useTcgPrefs();
  useEffect(() => sfx.enter("tcg"), []); // sons du Trône des Mondes : ses propres réglages tant qu'il est ouvert
  useEffect(() => { if (view === "shop" && shopTab === "day") markShopSeen(); }, [view, shopTab]);
  // compte testeur (VITE_TESTEURS, sur cet ordinateur) : Éclats et jetons rechargés tout seuls (désactivable dans les paramètres)
  const tester = canTest(acc);
  useEffect(() => {
    if (!tester || !prefs.unlimited) return;
    const nt = P.testerFloor(t);
    if (nt) setTcg(nt);
  }, [tester, prefs.unlimited, t, setTcg]);
  const flash = (m) => { setToast(m); setTimeout(() => setToast((x) => (x === m ? "" : x)), 3000); };
  const setT = (nt) => setTcg(nt);
  /** Va dans une partie ; « packs », « portals », « leg »… ouvrent la boutique sur l'onglet correspondant. */
  const go = (v) => {
    const tab = SHOP_TAB[v];
    if (tab) {
      if (view === "shop" && shopTab === tab) return;
      setShopTab(tab);
      if (view === "shop") sfx.select(); else { setView("shop"); sfx.slide(); }
      return;
    }
    if (v === view) return;
    setView(v); sfx.slide();
  };
  const pickShopTab = (tab) => { if (tab === shopTab) return; setShopTab(tab); sfx.select(); };
  const nPacks = Object.values(t.packs).reduce((s, n) => s + n, 0);
  const nQuests = t.quests.list.filter((q) => !q.got && q.n >= P.QUEST_BY[q.id].goal).length + P.claimableMilestones(t).length + (P.questBonusReady(t) ? 1 : 0);

  /** Ouvre un booster, ou un groupe de n boosters du même type (5 au plus). */
  const openPack = (id, n = 1) => {
    const r = n > 1 ? P.openPacks(t, id, n) : P.openPack(t, id);
    if (r.error) { flash(r.error); return; }
    setT(r.t);
    setOpening({ id, n, pack: P.packDef(id), packs: r.packs || [{ cards: r.cards, jet: r.jet, golden: r.golden }], key: Date.now() });
  };
  /** Invoque 1 ou 10 fois dans un portail. */
  const doPull = (kind, n) => {
    const r = P.pull(t, kind, n);
    if (r.error) { flash(r.error); sfx.error(); return; }
    setT(r.t);
    const bn = r.bn;
    setOpening({ portal: kind, n, pack: { id: "portal:" + kind, name: bn.sub, color: bn.color, icon: bn.fam ? FAMILY[bn.fam].icon : "orbit" }, kindName: bn.name, packs: [{ cards: r.cards, jet: 0 }], key: Date.now() });
  };
  const againOf = (o) => {
    if (o.portal) { const c = P.pullCost(t, o.n); return t.ec >= c.ec ? { text: `Invoquer encore ×${o.n}`, go: () => doPull(o.portal, o.n) } : null; }
    const left = t.packs[o.id] || 0;
    if (!left) return null;
    const k = o.n > 1 ? Math.min(P.OPEN_MAX, left) : 1;
    return { text: k > 1 ? `Ouvrir les ${k} suivants` : `Ouvrir le suivant (${left})`, go: () => openPack(o.id, k) };
  };
  const again = opening ? againOf(opening) : null;

  if (edit) {
    return (
      <>
        <div className="hub-bg" aria-hidden="true" />
        <DeckBuilder deck={edit} owned={own} onCancel={() => setEdit(null)} onSave={(d, ok) => {
          let nt = P.saveDeck(t, d);
          const saved = (d.id && nt.decks.find((x) => x.id === d.id)) || nt.decks[0]; // un nouveau deck est rangé en tête
          if (ok && (!P.playableDeck(nt) || !t.decks.length)) nt = P.selectDeck(nt, saved.id);
          setT(nt); setEdit(null); sfx.apply();
          flash(ok ? "Deck enregistré : il est prêt à jouer." : "Brouillon enregistré. Il faut corriger les erreurs avant de pouvoir le jouer.");
        }} />
      </>
    );
  }

  const pickStarter = (id) => { const r = P.chooseStarter(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.win(); setView("home"); flash("Deck débloqué ! +300 Éclats et 3 boosters offerts : ouvre-les !"); };
  let content;
  if (!t.starter) {
    content = (
      <div className="hs">
        <header className="hs-top">
          <button className="iconbtn" onClick={onClose} aria-label="Retour"><Icon name="back" /></button>
          <span className="hs-ico" aria-hidden="true"><Icon name="crown" size={20} /></span>
          <div className="hs-title"><small>{GAME_NAME}</small><h2>Deck de départ</h2></div>
          <span className="grow" />
          <button className="iconbtn" onClick={() => setRules(true)} aria-label="Règles du jeu"><Icon name="book" size={18} /></button>
        </header>
        <div className="hs-body"><StarterPick onPick={pickStarter} /></div>
      </div>
    );
  } else if (view === "home") {
    const deck = t.decks.find((d) => d.id === t.sel) || t.decks[0] || null;
    content = <HubHome t={t} own={own} name={name} go={go} onClose={onClose} onPlay={onPlay || onClose} inRoom={inRoom} homeBack={homeBack} onRules={() => { setRules(true); sfx.open(); }} onSettings={() => { setSettings(true); sfx.open(); }}
      onZoom={(id) => setZoom({ id })} onFamily={(fam, pt) => (fam ? setZoom({ fam, pt }) : deck && setZoom({ fam: deck.fam, pt: deck.pt }))} onAlbum={() => { setAlbum(true); sfx.open(); }}
      nPacks={nPacks} nQuests={nQuests} calm={prefs.motion === "reduced"} />;
  } else {
    content = (
      <div className="hs">
        <SectionHead view={view} t={t} go={go} nPacks={nPacks} onSettings={() => { setSettings(true); sfx.open(); }} />
        <div className={"hs-body v-" + view} key={view}>
          {view === "decks" && <Decks t={t} own={own} setT={setT} onEdit={setEdit} flash={flash} />}
          {view === "coll" && <Collection t={t} own={own} setT={setT} flash={flash} />}
          {view === "shop" && <ShopHub t={t} setT={setT} flash={flash} tab={shopTab} onTab={pickShopTab} onOpen={openPack} onPull={doPull} nPacks={nPacks} />}
          {view === "quests" && <Quests t={t} setT={setT} flash={flash} />}
          {view === "profile" && <TcgProfile t={t} setT={setT} name={name} onName={onName} acc={acc} onAccount={onAccount} flash={flash} />}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hub-bg" aria-hidden="true" />
      <div className={"screen hub hubh" + (prefs.motion === "reduced" ? " calm" : "")} data-view={t.starter ? view : "starter"}>
        {content}
        {toast && <div className="toast hub-toast" role="status">{toast}</div>}
        {opening && (
          <PackOpen key={opening.key} pack={opening.pack} packs={opening.packs} label={opening.portal ? `Invocation ×${opening.n}` : "Booster"} intro={opening.portal ? "portal" : "tear"}
            again={again ? again.text : ""} onAgain={again ? again.go : undefined} onDone={() => setOpening(null)} />
        )}
        {album && <Album t={t} shine={shineOf(t, setT, flash)} onClose={() => { setAlbum(false); sfx.close(); }} />}
        {zoom && (zoom.id
          ? <CardZoom id={zoom.id} foil={(t.foil[zoom.id] || 0) > 0} owned={CARD[zoom.id] && CARD[zoom.id].type !== "plot" ? { n: t.coll[zoom.id] || 0, f: t.foil[zoom.id] || 0 } : null} shine={shineOf(t, setT, flash)} onClose={() => setZoom(null)} />
          : <CardZoom fam={zoom.fam} pt={zoom.pt} onClose={() => setZoom(null)} />)}
        {rules && <RulesGuide onClose={() => setRules(false)} />}
        {settings && <TcgSettings acc={acc} onAccount={onAccount} t={t} setT={setT} flash={flash} onClose={() => { setSettings(false); sfx.close(); }} onRules={() => setRules(true)} />}
      </div>
    </>
  );
}
