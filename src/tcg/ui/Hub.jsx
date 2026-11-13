// Trône des Mondes : la collection du joueur. Deck de départ (une fois), decks, collection, boosters, boutique du jour,
// quêtes et succès. Tout est enregistré dans le profil (profile.tcg), donc suit le compte d'un téléphone à l'autre.
import { useEffect, useMemo, useState } from "react";
import { ALL, CARD, FAMILY, PLAYABLE, subOf, subWords } from "../cards/index.js";
import { RARITY, RARITY_ORDER, CARD_TYPES } from "../rules.js";
import { starters, validateDeck, defaultPlots } from "../deck.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import DeckBuilder from "./DeckBuilder.jsx";
import PackOpen, { packColor, packIcon } from "./PackOpen.jsx";
import Rules from "./Rules.jsx";
import { useArtInfo, importFiles, syncRemote } from "./artStore.js";
import ArtList, { loadTri, saveTri } from "./ArtList.jsx";
import Album from "./Album.jsx";
import { APPAREIL } from "../../lib/device.js";
import { useTcgPrefs } from "../prefs.js";
import HubHome, { HubCurrencies, markShopSeen } from "./HubHome.jsx";
import TcgProfile from "./TcgProfile.jsx";
import TcgSettings from "./TcgSettings.jsx";

const EC = ({ n }) => <span className="hub-price"><Icon name="gem" size={14} />{n.toLocaleString("fr-FR")}</span>;
const famStyle = (f, pt) => ({ "--fc": subOf(f.id, pt) ? subOf(f.id, pt).color : f.color });
const fmtTime = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`; };

/* ------------------------------ deck de départ ------------------------------ */
function StarterPick({ onPick }) {
  const all = useMemo(() => starters(), []);
  const [fam, setFam] = useState(null);
  const [sel, setSel] = useState(null);
  const [look, setLook] = useState(null);
  const [zoom, setZoom] = useState(null);
  const list = fam ? all.filter((s) => s.fam === fam) : [];
  const s = sel ? all.find((x) => x.id === sel) : null;
  return (
    <div className="hub-body">
      <div className="hub-card">
        <h3 style={{ fontSize: "1.05rem" }}>Choisis ton deck de départ</h3>
        <p className="muted" style={{ margin: 0, fontSize: ".86rem" }}>Il débloque ses 50 cartes (dont parfois une version exclusive d'un héros). Ce choix est définitif : toutes les autres cartes s'obtiennent ensuite dans les boosters. Tu reçois aussi 300 Éclats et 3 boosters.</p>
      </div>
      {!fam && (
        <div className="hub-fams">
          {PLAYABLE.map((f) => (
            <button key={f.id} className="hub-fambtn" style={famStyle(f)} onClick={() => { setFam(f.id); setSel(null); sfx.select(); }}>
              <span className="hub-fam" style={famStyle(f)}><Icon name={f.icon} size={20} /></span>
              <span><b>{f.name}</b><small>{all.filter((x) => x.fam === f.id).length} deck{all.filter((x) => x.fam === f.id).length > 1 ? "s" : ""}</small></span>
            </button>
          ))}
        </div>
      )}
      {fam && (
        <>
          <div className="row spread">
            <button className="btn small ghost" onClick={() => { setFam(null); setSel(null); }}><Icon name="back" size={16} />Familles</button>
            <span className="pill" style={{ borderColor: FAMILY[fam].color }}><Icon name={FAMILY[fam].icon} size={13} />{FAMILY[fam].name}</span>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: ".84rem" }}>{FAMILY[fam].desc}</p>
          {list.map((st) => (
            <button key={st.id} className="hub-starter" style={famStyle(FAMILY[st.fam], st.pt)} aria-pressed={sel === st.id} onClick={() => { setSel(st.id); sfx.select(); }}>
              <CardFace d={CARD[st.leader]} w={74} />
              <div style={{ minWidth: 0 }}>
                <b>{st.name}</b>
                <p>{st.desc}</p>
                <small className="muted" style={{ fontSize: ".72rem" }}>Héros : {CARD[st.leader].name} ({CARD[st.leader].cost})</small>
              </div>
            </button>
          ))}
        </>
      )}
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
function Decks({ t, own, setT, onEdit, flash }) {
  const [newFam, setNewFam] = useState(null);
  const [del, setDel] = useState(null);
  return (
    <div className="hub-body">
      <div className="hub-sec hub-decks">
        <h3>Mes decks <small>le deck coché est celui que tu joues en partie</small></h3>
        {t.decks.map((d) => {
          const v = validateDeck(d, own);
          const f = FAMILY[d.fam];
          const on = t.sel === d.id;
          return (
            <div key={d.id} className={"hub-card" + (on ? "" : "")} style={on ? { borderColor: "var(--cyan)", boxShadow: "var(--halo)" } : undefined}>
              <div className="hub-row">
                <span className="hub-fam" style={famStyle(f, d.pt)}><Icon name={f.icon} size={20} /></span>
                <div className="grow"><b>{d.name}</b><small>{f.name}{subOf(d.fam, d.pt) ? ` · ${subOf(d.fam, d.pt).name}` : ""} · {v.counts.total || 0} cartes</small></div>
                {v.ok ? <span className="pill ok">Prêt</span> : <span className="pill pink">À compléter</span>}
              </div>
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
        <h3>Nouveau deck</h3>
        <div className="hub-fams">
          {PLAYABLE.map((f) => <button key={f.id} className="hub-fambtn" style={famStyle(f)} aria-pressed={newFam === f.id} onClick={() => {
            if (f.types && f.types.length) { setNewFam(f.id); return; }
            onEdit({ id: null, name: `Deck ${f.short || f.name}`, fam: f.id, pt: null, cards: {}, plots: defaultPlots(f.id) });
          }}><span className="hub-fam" style={famStyle(f)}><Icon name={f.icon} size={18} /></span><span><b>{f.name}</b><small>{Object.keys(own).filter((id) => CARD[id].fam === f.id).length} cartes possédées</small></span></button>)}
        </div>
        {newFam && FAMILY[newFam] && FAMILY[newFam].types && (
          <div className="hub-card">
            <b style={{ fontFamily: "var(--display)" }}>{subWords(newFam).ask}</b>
            <small className="muted">{subWords(newFam).help}</small>
            <div className="hub-filters" style={{ flexWrap: "wrap" }}>{FAMILY[newFam].types.map((tp) => <button key={tp.id} style={{ borderColor: tp.color }} onClick={() => onEdit({ id: null, name: `${FAMILY[newFam].short || FAMILY[newFam].name} ${tp.name}`.slice(0, 32), fam: newFam, pt: tp.id, cards: {}, plots: defaultPlots(newFam) })}>{tp.name}</button>)}</div>
          </div>
        )}
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
            ? <button className="btn small good" onClick={() => { const r = P.recycle(t); setT(r.t); setRc(false); flash(`${r.n} doubles recyclés : +${r.gained} Éclats.`); sfx.apply(); }}>Confirmer +{rec.gained}</button>
            : <button className="btn small" onClick={() => setRc(true)}><Icon name="repeat" size={16} />Recycler</button>)}
        </div>
        {rec.n > 0 && <small className="muted" style={{ fontSize: ".76rem" }}>Recycler transforme les exemplaires en trop ({rec.n} : au-delà de 2 normales et 1 brillante) en {rec.gained} Éclats.</small>}
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
      {album && <Album t={t} onClose={() => setAlbum(false)} />}
      {zoom && <CardZoom id={zoom} foil={(t.foil[zoom] || 0) > 0} owned={{ n: t.coll[zoom] || 0, f: t.foil[zoom] || 0 }} art onClose={() => setZoom(null)} />}
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
/** Boosters à ouvrir. */
function PacksMine({ t, onOpen }) {
  const mine = Object.entries(t.packs).filter(([, n]) => n > 0).map(([id, n]) => ({ p: P.packDef(id), n })).filter((x) => x.p);
  return (
    <div className="hub-sec hp-mine">
      <h3>Mes boosters <small>{mine.reduce((s, x) => s + x.n, 0)} à ouvrir</small></h3>
      {mine.length ? mine.map(({ p, n }) => packRow(p, <><span className="cnt">{n}</span><button className="btn small primary" onClick={() => onOpen(p.id)}>Ouvrir</button></>)) : <div className="hub-empty">Aucun booster. Monte de niveau, termine des quêtes ou achète-en ci-dessous.</div>}
    </div>
  );
}
/** Boosters à acheter avec les Éclats. */
function PacksBuy({ t, setT, flash, note = true }) {
  const [famOpen, setFamOpen] = useState(false);
  const buy = (p) => { const r = P.buyPack(t, p.id); if (r.error) { flash(r.error); sfx.error(); return; } setT(r.t); sfx.apply(); flash(`${p.name} acheté !`); };
  return (
    <>
      <div className="hub-sec hp-buy">
        <h3>Acheter des boosters <small>tu as <EC n={t.ec} /></small></h3>
        {P.PACKS.filter((p) => !p.fam).map((p) => packRow(p, <button className="btn small" disabled={t.ec < p.price} onClick={() => buy(p)}><EC n={p.price} /></button>))}
        <button className="btn ghost small" onClick={() => setFamOpen(!famOpen)}><Icon name={famOpen ? "minus" : "plus"} size={16} />Boosters d'une seule famille</button>
        {famOpen && P.PACKS.filter((p) => p.fam).map((p) => packRow(p, <button className="btn small" disabled={t.ec < p.price} onClick={() => buy(p)}><EC n={p.price} /></button>))}
      </div>
      {note && <p className="muted hub-note">Chaque booster : 5 cartes, au moins une rare. Brillantes : les cartes 7 le sont toujours ; les autres de 2 % (commune) à 12 % (légendaire) de chances, une fois et demie plus dans les boosters Arsenal et Prestige. 1 booster sur 200 est doré (que des rares ou mieux, toutes brillantes). Les versions exclusives des decks de départ ne sortent jamais des boosters.</p>}
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
      <p className="muted hub-note">Prix : commune 80, peu commune 200, rare 500, épique 1 200, légendaire 3 000 Éclats ; ×3 pour une brillante en plus (les cartes 7, toujours brillantes, gardent leur prix).</p>
      {zoom && <CardZoom id={zoom.id} foil={zoom.foil} owned={{ n: t.coll[zoom.id] || 0, f: t.foil[zoom.id] || 0 }} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ------------------------------ quêtes ------------------------------ */
function DailyQuests({ t, setT, flash }) {
  const claim = (i) => {
    const r = P.claimQuest(t, i);
    if (r.error) { flash(r.error); return; }
    setT(r.t); sfx.win();
    flash(`+${r.xp} XP, +${r.ec} Éclats${r.lvlTo > r.lvlFrom ? ` — niveau ${r.lvlTo} !` : ""}`);
  };
  const reroll = (i) => { const r = P.rerollQuest(t, i); if (r.error) { flash(r.error); return; } setT(r.t); sfx.select(); };
  return (
    <div className="hub-sec hq-daily">
      <h3>Quêtes du jour <small>nouvelles dans {fmtTime(P.msToMidnight())}</small></h3>
      {t.quests.list.map((q, i) => {
        const d = P.QUEST_BY[q.id];
        const done = q.n >= d.goal;
        return (
          <div key={i} className={"hub-quest" + (q.got ? " got" : done ? " ok" : "")}>
            <div className="hub-row">
              <div className="grow"><b>{d.text}{d.fam && q.fam ? ` : ${FAMILY[q.fam].name}` : ""}</b><small>+{d.xp} XP · +{d.ec} Éclats</small></div>
              {q.got ? <span className="pill ok"><Icon name="check" size={12} />Fait</span>
                : done ? <button className="btn small good" onClick={() => claim(i)}>Récupérer</button>
                : t.quests.rr < 1 ? <button className="iconbtn" onClick={() => reroll(i)} aria-label="Changer cette quête (une fois par jour)" title="Changer cette quête"><Icon name="reset" size={16} /></button> : null}
            </div>
            <span className="bar2"><i style={{ width: `${(100 * Math.min(q.n, d.goal)) / d.goal}%` }} /></span>
            <small className="muted" style={{ fontSize: ".72rem" }}>{Math.min(q.n, d.goal)} / {d.goal}</small>
          </div>
        );
      })}
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
  decks: ["Mes decks", "layers"], coll: ["Mes cartes", "library"], packs: ["Boosters", "gift"], shop: ["Boutique du jour", "store"],
  quests: ["Quêtes et succès", "trophy"], profile: ["Mon profil", "user"],
};
function SectionHead({ view, t, go, nPacks, onSettings }) {
  const [title, icon] = VIEWS[view];
  return (
    <header className="hs-top">
      <button className="iconbtn" onClick={() => go("home")} aria-label="Retour à l'accueil du Trône des Mondes" data-testid="hub-home-back"><Icon name="back" /></button>
      <span className="hs-ico" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div className="hs-title"><small>Trône des Mondes</small><h2>{title}</h2></div>
      <span className="grow" />
      <HubCurrencies t={t} go={go} nPacks={nPacks} />
      <button className="iconbtn" onClick={onSettings} aria-label="Paramètres du jeu" title="Paramètres du jeu"><Icon name="settings" /></button>
    </header>
  );
}

/* ------------------------------ écran principal ------------------------------ */
/**
 * Trône des Mondes : accueil (HubHome) et ses parties (decks, collection, boosters, boutique, quêtes, profil).
 * initialTab : partie ouverte d'emblée ("home" par défaut ; "decks" ou "packs" depuis le lobby).
 * onPlay : « Jouer » (retour au lobby, ou nouveau lobby Trône des Mondes) ; inRoom : on est déjà dans un lobby.
 */
export default function Hub({ tcg, setTcg, onClose, initialTab, acc, onAccount, name, onPlay, inRoom }) {
  const t = useMemo(() => P.ensureQuests(P.normalizeTcg(tcg)), [tcg]);
  const own = useMemo(() => P.owned(t), [t]);
  const [view, setView] = useState(VIEWS[initialTab] ? initialTab : "home");
  const [edit, setEdit] = useState(null);
  const [opening, setOpening] = useState(null);
  const [toast, setToast] = useState("");
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  const [album, setAlbum] = useState(false);
  const [zoom, setZoom] = useState(null);
  const prefs = useTcgPrefs();
  useEffect(() => sfx.enter("tcg"), []); // sons du Trône des Mondes : ses propres réglages tant qu'il est ouvert
  useEffect(() => { if (view === "shop") markShopSeen(); }, [view]);
  const flash = (m) => { setToast(m); setTimeout(() => setToast((x) => (x === m ? "" : x)), 3000); };
  const setT = (nt) => setTcg(nt);
  const go = (v) => { if (v === view) return; setView(v); sfx.slide(); };
  const nPacks = Object.values(t.packs).reduce((s, n) => s + n, 0);
  const nQuests = t.quests.list.filter((q) => !q.got && q.n >= P.QUEST_BY[q.id].goal).length + P.claimableMilestones(t).length;

  const openPack = (id) => {
    const r = P.openPack(t, id);
    if (r.error) { flash(r.error); return; }
    setT(r.t);
    setOpening({ id, cards: r.cards, key: Date.now() });
  };

  if (edit) {
    return (
      <>
        <div className="hub-bg" aria-hidden="true" />
        <DeckBuilder deck={edit} owned={own} onCancel={() => setEdit(null)} onSave={(d, ok) => {
          let nt = P.saveDeck(t, d);
          const saved = nt.decks.find((x) => x.name === d.name && x.fam === d.fam && (d.id ? x.id === d.id : true)) || nt.decks[0];
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
          <div className="hs-title"><small>Trône des Mondes</small><h2>Deck de départ</h2></div>
          <span className="grow" />
          <button className="iconbtn" onClick={() => setRules(true)} aria-label="Règles du jeu"><Icon name="book" size={18} /></button>
        </header>
        <div className="hs-body"><StarterPick onPick={pickStarter} /></div>
      </div>
    );
  } else if (view === "home") {
    const deck = t.decks.find((d) => d.id === t.sel) || t.decks[0] || null;
    content = <HubHome t={t} own={own} name={name} go={go} onClose={onClose} onPlay={onPlay || onClose} inRoom={inRoom} onSettings={() => { setSettings(true); sfx.open(); }}
      onZoom={(id) => setZoom({ id })} onFamily={() => deck && setZoom({ fam: deck.fam, pt: deck.pt })} onAlbum={() => { setAlbum(true); sfx.open(); }}
      nPacks={nPacks} nQuests={nQuests} calm={prefs.motion === "reduced"} />;
  } else {
    content = (
      <div className="hs">
        <SectionHead view={view} t={t} go={go} nPacks={nPacks} onSettings={() => { setSettings(true); sfx.open(); }} />
        <div className={"hs-body v-" + view} key={view}>
          {view === "decks" && <Decks t={t} own={own} setT={setT} onEdit={setEdit} flash={flash} />}
          {view === "coll" && <Collection t={t} own={own} setT={setT} flash={flash} />}
          {view === "packs" && <Packs t={t} setT={setT} flash={flash} onOpen={openPack} />}
          {view === "shop" && <Shop t={t} setT={setT} flash={flash} />}
          {view === "quests" && <Quests t={t} setT={setT} flash={flash} />}
          {view === "profile" && <TcgProfile t={t} setT={setT} name={name} acc={acc} onAccount={onAccount} flash={flash} />}
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
          <PackOpen key={opening.key} pack={P.packDef(opening.id)} cards={opening.cards} left={t.packs[opening.id] || 0}
            onDone={() => setOpening(null)} onAgain={() => openPack(opening.id)} />
        )}
        {album && <Album t={t} onClose={() => { setAlbum(false); sfx.close(); }} />}
        {zoom && (zoom.id
          ? <CardZoom id={zoom.id} foil={(t.foil[zoom.id] || 0) > 0} owned={CARD[zoom.id] && CARD[zoom.id].type !== "plot" ? { n: t.coll[zoom.id] || 0, f: t.foil[zoom.id] || 0 } : null} onClose={() => setZoom(null)} />
          : <CardZoom fam={zoom.fam} pt={zoom.pt} onClose={() => setZoom(null)} />)}
        {rules && <Rules onClose={() => setRules(false)} />}
        {settings && <TcgSettings acc={acc} onAccount={onAccount} t={t} setT={setT} flash={flash} onClose={() => { setSettings(false); sfx.close(); }} onRules={() => setRules(true)} />}
      </div>
    </>
  );
}
