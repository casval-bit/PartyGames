import { Tap, Reflex, Moles, Simon, StopBar, HoldTime, Odd, Pairs, Order, Target, MemGrid } from "./games1.jsx";
import { Count, Maths, Stroop, Bigger, Arrows, Beat, Rhythm } from "./games2.jsx";
import { Catch, Dodge, Flap, Runner } from "./games3.jsx";
import { FgRun, HexFall, Sumo, JumpClub, CoinChase } from "./three/gamesA.jsx";
import { Tunnel, Shroom, Safari, Bowling } from "./three/gamesB.jsx";
export { MINIGAMES, MG_BY, playSeconds, rankPoints } from "./meta.js";

export const GAME_COMPONENTS = {
  tap: Tap, reflex: Reflex, moles: Moles, simon: Simon, stopbar: StopBar, count: Count, maths: Maths, stroop: Stroop, pairs: Pairs, catch: Catch,
  dodge: Dodge, holdtime: HoldTime, odd: Odd, order: Order, target: Target, flap: Flap, runner: Runner, memgrid: MemGrid, bigger: Bigger,
  arrows: Arrows, beat: Beat, rhythm: Rhythm,
  fgrun: FgRun, hexfall: HexFall, sumo: Sumo, jumpclub: JumpClub, coinchase: CoinChase,
  tunnel: Tunnel, shroom: Shroom, safari: Safari, bowling: Bowling,
};
