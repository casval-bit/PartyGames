// Raretés à l'ouverture des boosters et des Portails : leur ordre, la couleur de leur lumière (rayon d'un booster qui saute,
// fissures et cœur de l'orbe), et la meilleure carte d'une liste.
import { CARD } from "../../cards/index.js";
import { tierOf } from "../../progress.js";

export const TIERS = ["C", "U", "R", "E", "L"];
export const TIER_HEX = { C: "#c9d6ea", U: "#5ee1ff", R: "#ffd166", E: "#c084fc", L: "#ff9a52" };
export const tierRank = (id) => TIERS.indexOf(tierOf(CARD[id]));
/** Rareté de la meilleure carte (C, U, R, E ou L). */
export const bestTier = (cards) => TIERS[cards.reduce((b, c) => Math.max(b, tierRank(c.id)), 0)];
