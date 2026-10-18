// node tools/test-blindtest.js : vérifie la comparaison des réponses et le barème
import { judge, partPoints, streakBonus, cleanTitle } from "../src/data/blindtest.js";
let bad = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) { bad++; console.log("ECHEC", name, "=>", JSON.stringify(got), "attendu", JSON.stringify(want)); } };
const gl = { title: "Get Lucky (feat. Pharrell Williams & Nile Rodgers) - Radio Edit", artists: ["Daft Punk", "Pharrell Williams"] };
const br = { title: "Bohemian Rhapsody - Remastered 2011", artists: ["Queen"] };
const ro = { title: "Rolling in the Deep", artists: ["Adele"] };
const ba = { title: "Là-bas", artists: ["Jean-Jacques Goldman", "Sirima"] };
eq("both", judge("daft punk get lucky", gl), { title: "full", artist: "full" });
eq("title only", judge("get lucky", gl), { title: "full", artist: null });
eq("artist only", judge("Daft Punk", gl), { title: null, artist: "full" });
eq("feat artist", judge("pharrell williams", gl), { title: null, artist: "full" });
eq("typo title", judge("get luky", gl), { title: "full", artist: null });
eq("typo artist", judge("daft pnk", gl), { title: null, artist: "full" });
eq("accent/case", judge("LÀ BAS goldman", ba), { title: "full", artist: null });
eq("full name", judge("jean-jacques goldman la bas", ba), { title: "full", artist: "full" });
eq("remaster", judge("bohemian rhapsody queen", br), { title: "full", artist: "full" });
eq("article oublié", judge("rolling in deep adele", ro), { title: "full", artist: "full" });
eq("wrong", judge("blabla", ro), { title: null, artist: null });
eq("word boundary", judge("othello", { title: "Hello", artists: ["Adele"] }), { title: null, artist: null });
eq("empty", judge("   ", ro), { title: null, artist: null });
eq("clean", cleanTitle("Hello - Radio Edit (feat. X)"), "Hello");
// ---- tolérance aux fautes : ce qui DOIT être validé ----
const J = (t, a) => ({ title: t, artists: [].concat(a) });
const T = (txt, tr) => judge(txt, tr).title, A = (txt, tr) => judge(txt, tr).artist;
const bey = J("Halo", "Beyoncé"), met = J("Enter Sandman", "Metallica"), jj = J("Aujourd'hui", "Jean-Jacques Goldman");
eq("lettre en trop", A("metalica adele", met), "full");           // lettre manquante
eq("lettre doublée en trop", A("metallicaa", met), "full");
eq("lettres inversées", T("enter sandamn", met), "full");           // transposition = 1 faute
eq("mauvaise lettre", T("enter sandmen", met), "full");
eq("accent oublié", A("beyonce", bey), "full");
eq("accent ajouté", T("Hàlo", bey), "full");
eq("apostrophe oubliée", T("aujourdhui", jj), "full");
eq("apostrophe en espace", T("aujourd hui", jj), "full");
eq("apostrophe typographique", T("aujourd’hui", jj), "full");
eq("tiret oublié", A("jean jacques goldman", jj), "full");
eq("espace oublié", A("jeanjacques goldman", jj), "full");
eq("espace en trop", T("enter sand man", met), "full");
eq("majuscules/ponctuation", T("ENTER, SANDMAN!!", met), "full");
eq("deux fautes sur un long titre", T("entr sandmna", met), "full");
eq("P!nk", A("pink", J("Raise Your Glass", "P!nk")), "full");
eq("Ke$ha", A("kesha", J("Tik Tok", "Ke$ha")), "full");
eq("ø/ß", A("sigur ros", J("Svefn-g-englar", "Sigur Rós")), "full");
eq("et / &", A("simon and garfunkel", J("The Boxer", "Simon & Garfunkel")), "full");
eq("petit mot oublié", T("rolling in deep", ro), "full");
eq("phrase complète", judge("c'est Adèle, rollin in the deap !", ro), { title: "full", artist: "full" });

// ---- ce qui NE DOIT PAS être validé (trop souple) ----
eq("mot court: 1 faute refusée", T("hole", bey), null);              // Hole ≠ Halo
eq("mot court: 'close' seulement", T("halu", bey), "close");          // 4 lettres, 1 faute: presque
eq("3 lettres exactes", T("lov", J("Luv", "X")), null);
eq("mauvais chiffre", T("21 guns", J("22 Guns", "Green Day")), null);
eq("autre mot proche", T("enter sandwich", met), null);
eq("2 fautes sur 9 lettres: presque", A("metalika", J("X", "Metallica")), "close"); // pas de points
eq("3 fautes: refusé", A("metalka", J("X", "Metallica")), null);
eq("mot dans un mot", T("othello", J("Hello", "Adele")), null);
eq("moitié du titre seulement", T("enter", met), null);
eq("moitié du nom seulement", A("jean", jj), null);
eq("rien à voir", judge("bonjour tout le monde", met), { title: null, artist: null });
eq("artiste proche (5 lettres, 2 fautes)", A("adala", J("X", "Adele")), null);
eq("mot long + mot de remplissage seul", T("the", J("The", "X")), "full");
eq("pts 1st instant", partPoints(1, 1), 600);
eq("pts 4th end", partPoints(0, 4), 300);
eq("streak", [streakBonus(1), streakBonus(2), streakBonus(4), streakBonus(20)], [0, 50, 150, 250]);
console.log(bad ? bad + " échec(s)" : "blind test : tout est OK");
process.exit(bad ? 1 : 0);
