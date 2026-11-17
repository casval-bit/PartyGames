// Heavy is the Crown, l'appli du jeu de cartes seul (appli PC, ou un navigateur avec « ?trone ») : pas de Party Hub ni des
// autres jeux. Écran titre → accueil du jeu (collection, decks, boutique, quêtes, profil) → lobby à code et amis → partie.
// Le compte (connexion par e-mail) est le même que dans Party Hub : le profil, la collection et les decks sont sauvegardés
// dessus et suivent le joueur d'un appareil à l'autre.
import { useEffect, useMemo, useState } from "react";
import { useRoom } from "../../net/useRoom.js";
import { useProfile, useGameRecorder } from "../../lib/useProfile.js";
import { useAccount } from "../../lib/useAccount.js";
import { useFriends } from "../../lib/useFriends.js";
import { store, uid, roomCode } from "../../lib/util.js";
import { sfx } from "../../lib/sfx.js";
import Account from "../../screens/Account.jsx";
import { recordTcgGame, summaryFromView, tcgLook, normalizeTcg } from "../progress.js";
import { GAME_NAME } from "../rules.js";
import Hub from "./Hub.jsx";
import TroneGame from "./Game.jsx";
import TitleScreen from "./TitleScreen.jsx";
import TcgLobby, { InviteToast } from "./TcgLobby.jsx";
import CrownFx from "./CrownFx.jsx";
import "./tcgapp.css";

export default function TcgApp() {
  const [view, setView] = useState("title"); // title | hub | lobby (dans un salon : lobby ou partie)
  const [hubTab, setHubTab] = useState("home");
  const [hubKey, setHubKey] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState(() => store("tu-name") || "");
  const id = useMemo(() => {
    // un identifiant par onglet (sessionStorage) pour tester plusieurs joueurs dans un même navigateur
    try {
      let v = sessionStorage.getItem("tu-id");
      if (!v) { v = "p-" + uid(8); sessionStorage.setItem("tu-id", v); }
      return v;
    } catch { return "p-" + uid(8); }
  }, []);
  const [tcgGain, setTcgGain] = useState(null);
  const prof = useProfile();
  const acc = useAccount({ profile: prof.profile, replaceProfile: prof.replace, name, setName });
  const t = useMemo(() => normalizeTcg(prof.profile.tcg), [prof.profile.tcg]);
  const look = useMemo(() => tcgLook(t), [t]);

  const [roomState, setRoomState] = useState(null); // pour la présence des amis : menu, lobby, partie
  const fr = useFriends({ user: acc.user, pseudo: name.trim(), look, status: roomState || "menu" });
  const tl = useMemo(() => ({ ...look, fc: fr.me ? fr.me.code : null }), [look, fr.me]);
  const me = useMemo(() => ({ id, name: name.trim() || "Joueur", look: { ...prof.profile.look, lv: prof.level }, tl }), [id, name, prof.profile.look, prof.level, tl]);
  const net = useRoom(me);
  const { room } = net;
  useGameRecorder(room, id, prof.record);
  const inGame = Boolean(room && (room.phase === "ag_play" || room.phase === "ag_end"));
  useEffect(() => { setRoomState(room ? (inGame ? "game" : "lobby") : null); }, [Boolean(room), inGame]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { store("tu-name", name); }, [name]);
  useEffect(() => { document.title = GAME_NAME; return sfx.enter("tcg"); }, []);

  // XP, Éclats et quêtes de la partie (comptée une seule fois), comme dans Party Hub
  const agKey = room && room.phase === "ag_end" && room.ag && room.ag.over ? `${room.id}:${room.gameNo || 0}` : null;
  useEffect(() => {
    if (!agKey) return;
    const sum = summaryFromView(room.ag, id);
    if (!sum) return;
    let gain = null;
    prof.setTcg((x) => { const r = recordTcgGame(x, sum, agKey); gain = r.gain; return r.gain ? r.t : null; });
    if (gain) setTcgGain(gain);
  }, [agKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (room && room.phase === "ag_play") setTcgGain(null); }, [room && room.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // dans le lobby, les autres voient tout de suite ma nouvelle photo, mon cadre ou ma bannière
  const mineInRoom = room && room.phase === "lobby" ? room.players.find((p) => p.id === id) : null;
  const tlKey = JSON.stringify(tl), shownKey = mineInRoom ? JSON.stringify(mineInRoom.tl || null) : "";
  useEffect(() => { if (mineInRoom && shownKey !== tlKey) net.setTcgLook(tl); }, [shownKey, tlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // un code de salon Party Hub qui n'est pas une partie du jeu de cartes : on en ressort
  useEffect(() => {
    if (room && room.settings && room.settings.game !== "trone") {
      net.leave();
      setNotice(`Ce salon n'est pas une partie de ${GAME_NAME}.`);
    }
  }, [room && room.settings && room.settings.game]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (net.notice) setNotice(net.notice); }, [net.notice]);

  const openHub = (tab = "home") => { setHubTab(tab); setHubKey((k) => k + 1); setView("hub"); };
  const create = async () => {
    setNotice(""); net.clearNotice();
    await net.create(`Salon de ${me.name}`, { private: true, code: roomCode(), settings: { game: "trone", tcg: true } });
    setView("lobby");
  };
  const join = async (code) => {
    setNotice(""); net.clearNotice();
    if (room) net.leave();
    await net.join(code);
    setView("lobby");
  };
  const leave = () => { net.leave(); setView("lobby"); };

  let body;
  if (accountOpen) {
    body = <div className="tcgapp-acc"><div className="hub-bg" aria-hidden="true" /><Account acc={acc} profile={prof.profile} onBack={() => setAccountOpen(false)} /></div>;
  } else if (view === "hub" || (view === "title" && room)) {
    body = <Hub key={hubKey} tcg={prof.profile.tcg} setTcg={prof.setTcg} initialTab={hubTab} acc={acc} onAccount={() => setAccountOpen(true)}
      onClose={() => setView(room ? "lobby" : "title")} name={name.trim()} onName={setName} inRoom={Boolean(room)} onPlay={() => setView("lobby")}
      homeBack={room ? "Retour au salon" : "Écran titre"} />;
  } else if (inGame) {
    body = <TroneGame room={room} me={me} api={net} priv={net.agPriv} onLeave={leave} gain={tcgGain} isHost={net.isHost} onHub={(tab) => openHub(tab || "decks")} />;
  } else if (view === "lobby" || room) {
    body = <TcgLobby room={room} me={me} net={net} isHost={net.isHost} t={t} setTcg={prof.setTcg} fr={fr} acc={acc} onAccount={() => setAccountOpen(true)}
      notice={notice} clearNotice={() => { setNotice(""); net.clearNotice(); }} busy={net.busy}
      onBack={() => openHub("home")} onDecks={() => openHub("decks")} onProfile={() => openHub("profile")} onCreate={create} onJoin={join} />;
  } else {
    body = <TitleScreen name={name} setName={setName} acc={acc} onAccount={() => setAccountOpen(true)} onEnter={() => openHub("home")} />;
  }

  // transitions propres au jeu (CrownFx) : écran titre, accueil, lobby, partie, compte
  const fxKey = accountOpen ? "account" : view === "hub" ? "hub" : inGame ? "game" : view === "lobby" || room ? "lobby" : "title";
  const inv = fr.invites[0];
  return (
    <div className={"app tcgapp" + (inGame && view !== "hub" ? " ingame" : "")} data-view={fxKey}>
      {body}
      <CrownFx k={fxKey} />
      {inv && !(room && room.id === inv.room) && !accountOpen && (
        <InviteToast inv={inv} onJoin={() => { fr.dismiss(inv.k); join(inv.room); }} onClose={() => fr.dismiss(inv.k)} />
      )}
    </div>
  );
}
