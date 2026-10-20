import { useEffect, useMemo, useState } from "react";
import { useRoom } from "./net/useRoom.js";
import { useProfile, useGameRecorder } from "./lib/useProfile.js";
import Profile from "./screens/Profile.jsx";
import Account from "./screens/Account.jsx";
import { useAccount } from "./lib/useAccount.js";
import GainToast from "./ui/GainToast.jsx";
import { store, uid } from "./lib/util.js";
import Splash from "./screens/Splash.jsx";
import Menu from "./screens/Menu.jsx";
import LobbyList from "./screens/LobbyList.jsx";
import Lobby from "./screens/Lobby.jsx";
import Celeb from "./screens/Celeb.jsx";
import Vote from "./screens/Vote.jsx";
import Reveal from "./screens/Reveal.jsx";
import Booster from "./screens/Booster.jsx";
import Shuffle from "./screens/Shuffle.jsx";
import Discard from "./screens/Discard.jsx";
import Countdown from "./screens/Countdown.jsx";
import Bonus from "./screens/Bonus.jsx";
import TimesUp from "./screens/TimesUp.jsx";
import QuiEst from "./screens/QuiEst.jsx";
import BlindTest from "./screens/BlindTest.jsx";
import Timeline from "./screens/Timeline.jsx";
import MiniGames from "./screens/MiniGames.jsx";
import Board from "./screens/Board.jsx";
import PetitBac from "./screens/PetitBac.jsx";
import MiniLab from "./screens/MiniLab.jsx";
import Gallery from "./screens/Gallery.jsx";
import QuitVote from "./ui/QuitVote.jsx";

export default function App() {
  if (typeof location !== "undefined" && location.search.includes("gallery")) return <Gallery />;
  if (typeof location !== "undefined" && location.search.includes("minilab")) return <MiniLab />;
  const [screen, setScreen] = useState("splash"); // splash | menu | list
  const [name, setName] = useState(() => store("tu-name") || "");
  const id = useMemo(() => {
    // un identifiant par onglet (sessionStorage) pour tester plusieurs joueurs dans un même navigateur
    try {
      let v = sessionStorage.getItem("tu-id");
      if (!v) { v = "p-" + uid(8); sessionStorage.setItem("tu-id", v); }
      return v;
    } catch { return "p-" + uid(8); }
  }, []);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  // Profil (avatar, niveau, stats) : enregistré sur le téléphone, chaque partie terminée y est comptée une fois.
  const prof = useProfile();
  // Compte (connexion par e-mail) : le profil et le pseudo suivent le joueur d'un téléphone à l'autre.
  const acc = useAccount({ profile: prof.profile, replaceProfile: prof.replace, name, setName });
  const me = useMemo(() => ({ id, name: name.trim() || "Joueur", look: { ...prof.profile.look, lv: prof.level } }), [id, name, prof.profile.look, prof.level]);
  const net = useRoom(me);
  const { room } = net;
  useGameRecorder(room, id, prof.record);

  // Connexion à un compte pendant que l'on est dans un lobby : les autres voient tout de suite l'apparence récupérée.
  const shown = room && room.phase === "lobby" ? room.players.find((p) => p.id === id) : null;
  const shownKey = shown && shown.look ? [shown.look.a, shown.look.b, shown.look.c, shown.look.lv].join() : "";
  const myKey = [me.look.a, me.look.b, me.look.c, me.look.lv].join();
  useEffect(() => { if (shown && shownKey !== myKey) net.setLook(me.look); }, [shownKey, myKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { store("tu-name", name); }, [name]);

  const goMenu = () => setScreen("menu");
  const equip = (patch) => {
    const l = prof.equip(patch);
    if (room && room.phase === "lobby") net.setLook({ ...l, lv: prof.level }); // les autres voient le changement tout de suite
  };
  const leave = () => { net.leave(); setScreen("menu"); };

  let body;
  const overlay = profileOpen || accountOpen || labOpen;
  if (labOpen) {
    body = <MiniLab onBack={() => setLabOpen(false)} />;
  } else if (accountOpen) {
    body = <Account acc={acc} profile={prof.profile} onBack={() => setAccountOpen(false)} />;
  } else if (profileOpen) {
    body = <Profile name={name} profile={prof.profile} equip={equip} acc={acc} onAccount={() => setAccountOpen(true)} onBack={() => setProfileOpen(false)} />;
  } else if (room) {
    const common = { room, me };
    switch (room.phase) {
      case "lobby": body = <Lobby {...common} isHost={net.isHost} api={net} onLeave={leave} onProfile={() => setProfileOpen(true)} />; break;
      case "voting": body = <Vote key="vote" {...common} api={net} />; break;
      case "reveal": body = <Reveal {...common} />; break;
      case "booster": body = <Booster {...common} packs={net.packs} api={net} />; break;
      case "shuffle": body = <Shuffle {...common} />; break;
      case "discard": body = <Discard {...common} cards={net.dealt} api={net} />; break;
      case "bonus": body = <Bonus key={room.bonus ? room.bonus.round : 0} {...common} cards={net.dealt} api={net} />; break;
      case "countdown": body = <Countdown {...common} />; break;
      case "qe_pick": case "qe_tap": case "qe_count": case "qe_play": case "qe_result": case "qe_final":
        body = <QuiEst {...common} api={net} onLeave={leave} />; break;
      case "bt_play": case "bt_reveal": case "bt_final":
        body = <BlindTest {...common} api={net} feedback={net.feedback} onLeave={leave} />; break;
      case "tl_play": case "tl_reveal": case "tl_final":
        body = <Timeline {...common} api={net} onLeave={leave} />; break;
      case "cc_load": case "cc_play": case "cc_result": case "cc_final":
        body = <Celeb {...common} api={net} onLeave={leave} />; break;
      case "pb_intro": case "pb_play": case "pb_vote": case "pb_result": case "pb_final":
        body = <PetitBac {...common} api={net} onLeave={leave} />; break;
      case "bd_turn": case "bd_final":
        body = <Board {...common} api={net} onLeave={leave} />; break;
      case "mg_intro": case "mg_play": case "mg_result": case "mg_ask": case "mg_qreveal": case "mg_final":
        body = <MiniGames {...common} api={net} onLeave={leave} />; break;
      default: body = <TimesUp {...common} api={net} queue={net.queue} onLeave={leave} />;
    }
  } else if (screen === "splash") {
    body = <Splash onTap={goMenu} />;
  } else if (screen === "list") {
    body = <LobbyList busy={net.busy} notice={net.notice} clearNotice={net.clearNotice} onBack={goMenu} onJoin={net.join} />;
  } else {
    body = (
      <Menu name={name} setName={setName} notice={net.notice} clearNotice={net.clearNotice} busy={net.busy}
        onCreate={net.create} onJoinList={() => { net.clearNotice(); setScreen("list"); }} look={me.look} level={prof.level} onProfile={() => setProfileOpen(true)} acc={acc} onAccount={() => setAccountOpen(true)} onLab={() => setLabOpen(true)} />
    );
  }

  return (
    <div className={"app" + (room && room.phase !== "lobby" && !overlay && room.players.some((p) => p.id === id && !p.bot) ? " ingame" : "")}>
      {body}
      {room && room.phase !== "lobby" && !overlay && room.players.some((p) => p.id === id && !p.bot) && <QuitVote room={room} me={me} api={net} />}
      {prof.gain && !overlay && <GainToast gain={prof.gain} onClose={prof.clearGain} onOpen={() => { prof.clearGain(); setProfileOpen(true); }} />}
    </div>
  );
}
