// Émotes du personnage (roue d'émotes, studio, lobby). id stables : ils passent sur le réseau.
export const EMOTES = [
  { id: "wave", name: "Salut", dur: 2.4 },
  { id: "dance", name: "Danse", dur: 3.4 },
  { id: "laugh", name: "Rire", dur: 2.4 },
  { id: "cry", name: "Pleurs", dur: 2.6 },
  { id: "angry", name: "Colère", dur: 2.2 },
  { id: "thumbs", name: "Bravo", dur: 2.0 },
  { id: "clap", name: "Applaudir", dur: 2.4 },
  { id: "heart", name: "Cœur", dur: 2.4 },
  { id: "shrug", name: "Bof", dur: 2.0 },
  { id: "facepalm", name: "Désespoir", dur: 2.2 },
  { id: "bow", name: "Révérence", dur: 2.4 },
  { id: "victory", name: "Victoire", dur: 2.4 },
];
export const EMOTE_BY = Object.fromEntries(EMOTES.map((e) => [e.id, e]));
