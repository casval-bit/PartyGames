// Loup-garou : réglages dans le lobby (composition automatique ou choisie, extensions, minuteurs).
import { useState } from "react";
import { ROLES, BOXES, CAMPS, wolvesFor, checkCompo, autoCompo } from "../roles.js";
import { LG_NIGHT, LG_DEBATE, LG_VOTE, LG_MIN, LG_MAX } from "../../net/hostLg.js";
import { Icon } from "../../ui/Icon.jsx";
import "./lg.css";

const countOf = (l) => l.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
const ORDER = Object.keys(ROLES);

export function lgCanStart(settings, n) {
  if (n < LG_MIN || n > LG_MAX) return false;
  return !Array.isArray(settings.lgPick) || !checkCompo(settings.lgPick, n).length;
}
export function lgStartHint(settings, n) {
  if (n < LG_MIN) return `Il faut au moins ${LG_MIN} joueurs (ajoute des bots pour tester).`;
  if (n > LG_MAX) return `${LG_MAX} joueurs au maximum.`;
  if (Array.isArray(settings.lgPick)) { const e = checkCompo(settings.lgPick, n); if (e.length) return e[0]; }
  return "";
}

export default function LoupSettings({ settings, isHost, api, n, Field, Seg }) {
  const boxes = settings.lgBoxes || BOXES.map((b) => b.id);
  const custom = Array.isArray(settings.lgPick);
  const pick = custom ? settings.lgPick : [];
  const counts = countOf(pick);
  const errs = custom ? checkCompo(pick, n) : [];
  const [adding, setAdding] = useState(false);
  const allowed = ORDER.filter((id) => boxes.includes(ROLES[id].box));
  const setPick = (l) => api.setSettings({ lgPick: l });
  const toggleBox = (id) => { if (id === "base" || !isHost) return; api.setSettings({ lgBoxes: boxes.includes(id) ? boxes.filter((b) => b !== id) : [...boxes, id] }); };
  const add = (id) => setPick([...pick, ...Array(ROLES[id].group || 1).fill(id)]);
  const remove = (id) => { let k = 0; const g = ROLES[id].group || 1; setPick(pick.filter((x) => !(x === id && k++ < g))); };
  const canAdd = (d) => (d.id === "loup" || d.id === "villageois" ? true : !counts[d.id]) && pick.length + (d.group || 1) <= LG_MAX + 2;
  const wolves = pick.filter((id) => ROLES[id].camp === "loups").length;
  return (
    <div className="lg-lobby">
      <Field label="Composition">
        <Seg value={custom} options={[[false, "Automatique"], [true, "Je choisis les rôles"]]} disabled={!isHost} onPick={(v) => setPick(v ? autoCompo(Math.max(n, LG_MIN), allowed, { wolves: settings.lgWolves || 0 }) : null)} />
      </Field>
      {!custom && (
        <>
          <Field label="Rôles possibles">
            <div className="seg games">
              {BOXES.map((b) => <button key={b.id} aria-pressed={boxes.includes(b.id)} disabled={!isHost || b.id === "base"} onClick={() => toggleBox(b.id)} title={b.note}>{b.name}</button>)}
            </div>
            <p className="muted gnote">{BOXES.filter((b) => boxes.includes(b.id)).map((b) => b.note).join(" · ")}</p>
          </Field>
          <Field label="Créatures du Monde à l'envers">
            <Seg value={settings.lgWolves || 0} options={[[0, `Auto (${wolvesFor(Math.max(n, LG_MIN))})`], [1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]]} disabled={!isHost} onPick={(v) => api.setSettings({ lgWolves: v })} />
          </Field>
          <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>Chaque partie tire une composition différente parmi les rôles cochés : les grands classiques (Onze, Joyce, Nancy, Murray…) d'abord, puis des surprises.</p>
        </>
      )}
      {custom && (
        <Field label={`Rôles choisis : ${pick.length} cartes pour ${n} joueur${n > 1 ? "s" : ""}${pick.includes("voleur") ? " (+2 avec Max, le Voleur)" : ""} · ${wolves} créature${wolves > 1 ? "s" : ""}`}>
          <div className="lg-compo">
            {ORDER.filter((id) => counts[id]).map((id) => (
              <button key={id} className={ROLES[id].camp === "loups" ? "wolf" : ROLES[id].camp === "solo" ? "solo" : ""} disabled={!isHost} onClick={() => remove(id)} aria-label={`Retirer ${ROLES[id].st}`}>
                <b>{counts[id]}×</b>{ROLES[id].st}{isHost && <Icon name="close" size={12} />}
              </button>
            ))}
          </div>
          {errs.map((e) => <p key={e} className="lg-err">{e}</p>)}
          {isHost && <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setAdding(!adding)}><Icon name={adding ? "minus" : "plus"} size={16} />{adding ? "Fermer la liste" : "Ajouter un rôle"}</button>}
          {adding && (
            <div className="lg-add" style={{ marginTop: 8 }}>
              {ORDER.map((id) => { const d = ROLES[id]; return (
                <button key={id} disabled={!canAdd(d)} onClick={() => add(id)} style={{ borderColor: CAMPS[d.camp].color + "66" }}>
                  <b>{d.st}{d.group ? ` ×${d.group}` : ""}</b><span>{d.name} · {CAMPS[d.camp].name}</span>
                </button>
              ); })}
            </div>
          )}
        </Field>
      )}
      <Field label="Temps de chaque étape de la nuit"><Seg value={settings.lgNight} options={LG_NIGHT} disabled={!isHost} onPick={(v) => api.setSettings({ lgNight: v })} /></Field>
      <Field label="Durée du débat"><Seg value={settings.lgDebate} options={LG_DEBATE} disabled={!isHost} onPick={(v) => api.setSettings({ lgDebate: v })} /></Field>
      <Field label="Durée du vote"><Seg value={settings.lgVote} options={LG_VOTE} disabled={!isHost} onPick={(v) => api.setSettings({ lgVote: v })} /></Field>
      <Field label="Capitaine"><Seg value={settings.lgCap !== false} options={[[true, "Élu le premier jour"], [false, "Sans capitaine"]]} disabled={!isHost} onPick={(v) => api.setSettings({ lgCap: v })} /></Field>
      <Field label="Rôles de la partie"><Seg value={settings.lgShow !== false} options={[[true, "Visibles par tous (conseillé)"], [false, "Secrets"]]} disabled={!isHost} onPick={(v) => api.setSettings({ lgShow: v })} /></Field>
      <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>Chacun joue sur son téléphone : l'appli fait le meneur. La nuit, tout le monde a quelque chose à toucher, pour que personne ne devine qui agit. Le jour, on débat (à voix haute ou dans la discussion) puis on vote. De {LG_MIN} à {LG_MAX} joueurs ; les bots jouent au hasard, pour tester.</p>
    </div>
  );
}
