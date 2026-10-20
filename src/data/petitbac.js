// Petit bac : lettres, catégories et règles de comparaison des réponses (sans accents, sans article, pluriel ignoré).

/** Lettres tirées (les plus difficiles — K, Q, W, X, Y, Z, U — sont écartées). */
export const PB_LETTERS = "ABCDEFGHIJLMNOPRSTV".split("");

/** Toutes les catégories possibles. Les six premières forment la partie « Classique ». */
export const PB_CATS = [
  { id: "prenom", name: "Prénom", emoji: "🧑" },
  { id: "animal", name: "Animal", emoji: "🐾" },
  { id: "pays", name: "Pays", emoji: "🌍" },
  { id: "metier", name: "Métier", emoji: "🧑‍🔧" },
  { id: "fruitleg", name: "Fruit ou légume", emoji: "🍎" },
  { id: "objet", name: "Objet", emoji: "🧸" },
  { id: "ville", name: "Ville", emoji: "🏙️" },
  { id: "marque", name: "Marque", emoji: "🏷️" },
  { id: "film", name: "Film ou série", emoji: "🎬" },
  { id: "sport", name: "Sport", emoji: "⚽" },
  { id: "vetement", name: "Vêtement", emoji: "👕" },
  { id: "plat", name: "Plat ou boisson", emoji: "🍝" },
  { id: "corps", name: "Partie du corps", emoji: "🦵" },
  { id: "chanteur", name: "Chanteur ou groupe", emoji: "🎤" },
  { id: "celebre", name: "Personnage célèbre", emoji: "⭐" },
  { id: "nature", name: "Dans la nature", emoji: "🌳" },
];
export const PB_CLASSIC = PB_CATS.slice(0, 6).map((c) => c.id);
export const PB_CAT_BY = Object.fromEntries(PB_CATS.map((c) => [c.id, c]));
export const PB_CAT_COUNT = 6;
export const PB_MAX_LEN = 30;

/** Sans accents, en minuscules, lettres et chiffres seulement. */
const plain = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae");
const ARTICLES = /^(l'|d'|le |la |les |un |une |des |du |de la |de l'|the )/;
/** Texte nettoyé d'une réponse : espaces réduits, longueur limitée. */
export const cleanAnswer = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿<>]/g, "").replace(/\s+/g, " ").trim().slice(0, PB_MAX_LEN);
/** Réponse sans article ni accent (« L'éléphant » → « elephant »). */
export function core(s) {
  let t = plain(cleanAnswer(s)).replace(/’/g, "'").trim();
  for (let i = 0; i < 2; i++) t = t.replace(ARTICLES, "").trim();
  return t;
}
/** Clé de comparaison : deux réponses de même clé sont des doublons (pluriel simple ignoré). */
export function answerKey(s) {
  let t = core(s).replace(/[^a-z0-9]/g, "");
  if (t.length > 3 && /[sx]$/.test(t)) t = t.slice(0, -1);
  return t;
}
/** La réponse commence-t-elle par la lettre demandée ? */
export const startsWith = (s, letter) => { const t = core(s).replace(/[^a-z0-9]/g, ""); return t.length > 0 && t[0] === plain(letter); };
/** Réponse comptée comme saisie (au moins 2 lettres). */
export const filled = (s) => core(s).replace(/[^a-z0-9]/g, "").length >= 2;

/** Points d'une réponse valide : 10 si elle est unique, 5 si un autre joueur a donné la même. */
export const PB_UNIQUE = 10;
export const PB_SHARED = 5;
