// Outil de dev : /?gallery affiche des cartes de longueurs de nom variées pour juger le design (/?gallery=big : en grand).
import { ALL_CARDS } from "../data/cards.js";
import { GameCard } from "../ui/parts.jsx";

export default function Gallery() {
  const sorted = [...ALL_CARDS].sort((a, b) => a.name.length - b.name.length);
  const pick = [0, 40, 150, 300, 450, 600, 750, 850, 950, 1010, sorted.length - 40, sorted.length - 3].map((k) => sorted[Math.min(k, sorted.length - 1)]);
  const cards = pick.map((c) => ({ id: c.id, name: c.name, cat: c.cats[0] }));
  const big = new URLSearchParams(location.search).get("gallery") === "big";
  const mode = new URLSearchParams(location.search).get("gallery");
  if (mode && mode.startsWith("names")) {   // noms difficiles : mots larges, très longs, courts, ponctuation
    const NAMES = ["Muhammad Ali", "Catherine Deneuve", "Neutral Milk Hotel", "WWW", "Mamma Mia !", "Jean-Baptiste Poquelin", "Tchaïkovski", "Le Seigneur des anneaux : la communauté de l'anneau", "Wolfgang Amadeus Mozart", "Kim Kardashian", "Jean-Claude Van Damme", "IL", "Mississippi", "Schwarzenegger", "Hermione Granger", "Charlotte Gainsbourg"];
    const cols = Number(mode.slice(5)) || 2;
    return (
      <div style={{ padding: 12, overflow: "auto", height: "100dvh" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
          {NAMES.map((n, i) => <GameCard key={n} card={{ id: "n" + i, name: n }} up className="static" i={i} bonus={i % 5 === 3 ? "time" : i % 5 === 4 ? "score" : undefined} />)}
        </div>
      </div>
    );
  }
  if (mode === "bonus") {
    const demo = cards.slice(0, 8);
    const kinds = ["time", "score", undefined, "time", "score", undefined, "score", "time"];
    return (
      <div style={{ padding: 12, overflow: "auto", height: "100dvh" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {demo.map((c, i) => <GameCard key={c.id} card={c} up className="static" i={i} bonus={kinds[i]} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 12, overflow: "auto", height: "100dvh" }}>
      <div style={{ display: "grid", gridTemplateColumns: big ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 14 }}>
        {cards.map((c, i) => <GameCard key={c.id} card={c} up className="static" i={i} />)}
      </div>
    </div>
  );
}
