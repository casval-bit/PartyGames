import { FgRun, HexFall, Sumo, JumpClub, CoinChase } from "./three/gamesA.jsx";
import { BombTag, Bomber, Tanks, Crown } from "./three/gamesC.jsx";
import { KartRace, Cannons } from "./three/gamesD.jsx";
import { SkyPilots, IcePucks, MazeRun, SnowBalls } from "./three/gamesE.jsx";
import { PaintWar, MusicPads, LightTrails } from "./three/gamesF.jsx";
export { MINIGAMES, MG_BY, playSeconds, rankPoints } from "./meta.js";

export const GAME_COMPONENTS = {
  fgrun: FgRun, hexfall: HexFall, sumo: Sumo, jumpclub: JumpClub, coinchase: CoinChase,
  bombtag: BombTag, bomber: Bomber, tanks: Tanks, crown: Crown,
  kart: KartRace, cannons: Cannons, sky: SkyPilots, pucks: IcePucks, maze: MazeRun, snow: SnowBalls,
  paint: PaintWar, chairs: MusicPads, trails: LightTrails,
};
