// Tests : année de première sortie (MusicBrainz + Deezer). Lancer : node tools/test-dates.js
import { searchTitle, buildQuery, yearOf, pickYear, decide, mbYear, resolveYear, matching } from "../src/data/musicbrainz.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

// nettoyage des titres
ok(searchTitle("Bohemian Rhapsody - Remastered 2011") === "Bohemian Rhapsody", "« - Remastered 2011 » retiré");
ok(searchTitle("Get Lucky (feat. Pharrell Williams & Nile Rodgers) - Radio Edit") === "Get Lucky", "feat. + Radio Edit retirés");
ok(searchTitle("Alors on danse [Live à Paris]") === "Alors on danse", "crochets retirés");
ok(searchTitle("Billie Jean (Single Version)") === "Billie Jean", "parenthèses retirées");
ok(searchTitle("Heroes ft. Someone") === "Heroes", "ft. retiré");
ok(searchTitle("") === "", "titre vide");
ok(buildQuery('Say "Yes"', "AC\\DC") === 'recording:"Say Yes" AND artist:"AC DC"', "guillemets et antislash neutralisés dans la requête");

// années
ok(yearOf("1975-10-31") === 1975 && yearOf("1975") === 1975, "année lue d'une date complète ou partielle");
ok(yearOf("0000-00-00") === null && yearOf("1900-01-01") === null && yearOf("") === null && yearOf(undefined) === null, "dates absurdes refusées");
ok(yearOf("2999-01-01") === null, "date dans le futur refusée");

const rec = (title, artist, date, extra = {}) => ({ title, score: 100, "first-release-date": date, "artist-credit": [{ name: artist, artist: { name: artist } }], ...extra });
const queen = { title: "Bohemian Rhapsody - Remastered 2011", artists: ["Queen"] };

// choix de l'année : la plus ancienne des enregistrements concordants
ok(pickYear([rec("Bohemian Rhapsody", "Queen", "1975-10-31"), rec("Bohemian Rhapsody", "Queen", "2011-05-01")], queen) === 1975, "remaster : on garde la plus ancienne date (1975)");
ok(pickYear([rec("Bohemian Rhapsody", "Panic! at the Disco", "2016-01-01")], queen) === null, "même titre, autre artiste : ignoré");
ok(pickYear([rec("Bohemian Rhapsody", "Queen", "1975-10-31", { score: 40 })], queen) === null, "score trop faible : ignoré");
ok(pickYear([rec("Bohemian Rhapsody (demo)", "Queen", "1974-01-01", { disambiguation: "demo" }), rec("Bohemian Rhapsody", "Queen", "1975-10-31")], queen) === 1975, "démo / bootleg ignorés");
ok(pickYear([rec("Bohemian Rhapsody", "Queen", "")], queen) === null, "enregistrement sans date : ignoré");
ok(pickYear([rec("Bohemian Rhapsodie", "Queen", "1975")], queen) === null, "titre légèrement différent : ignoré");
ok(pickYear([rec("Get Lucky", "Daft Punk", "2013-04-19", { "artist-credit": [{ name: "Daft Punk feat. Pharrell Williams", artist: { name: "Daft Punk" } }] })], { title: "Get Lucky (feat. Pharrell Williams)", artists: ["Daft Punk", "Pharrell Williams"] }) === 2013, "artiste crédité avec « feat. » : reconnu");
ok(matching(null, queen).length === 0 && pickYear(undefined, queen) === null, "réponse vide ou absente");
ok(pickYear([rec("Alors on danse", "Stromae", "2009-09-14")], { title: "Alors on danse", artists: ["STROMAE"] }) === 2009, "casse et accents ignorés");
ok(pickYear([rec("La Vie en rose", "Édith Piaf", "1947")], { title: "La Vie en rose", artists: ["Edith Piaf"] }) === 1947, "accents ignorés (Édith / Edith)");

// décision
let d = decide(1975, 2011);
ok(d.year === 1975 && d.confident && d.source === "musicbrainz", "MusicBrainz 1975 vs Deezer 2011 (remaster) : 1975, sûre");
d = decide(1975, 1975);
ok(d.year === 1975 && d.confident, "les deux d'accord : sûre");
d = decide(null, 1983);
ok(d.year === 1983 && !d.confident && d.source === "deezer", "Deezer seul : incertaine");
d = decide(1990, 1985);
ok(d.year === 1985 && !d.confident, "Deezer plus ancienne que MusicBrainz : on prend la plus ancienne, incertaine");
ok(decide(null, null) === null, "aucune date : null");
d = decide(2002, null);
ok(d.year === 2002 && d.confident, "MusicBrainz seul : sûre");

// réseau simulé
const calls = [];
const fake = (recordings) => async (url) => { calls.push({ url, at: Date.now() }); return { recordings }; };
const t0 = Date.now();
let y = await mbYear(queen, { get: fake([rec("Bohemian Rhapsody", "Queen", "1975-10-31")]), pause: 60 });
ok(y === 1975 && calls[0].url.startsWith("https://musicbrainz.org/ws/2/recording?query=") && calls[0].url.includes("fmt=json"), "requête construite vers MusicBrainz");
ok(decodeURIComponent(calls[0].url).includes('recording:"Bohemian Rhapsody" AND artist:"Queen"'), "titre nettoyé dans la requête");

// cadence : 3 appels simultanés -> espacés d'au moins la pause
calls.length = 0;
await Promise.all([1, 2, 3].map(() => mbYear(queen, { get: fake([]), pause: 120 })));
const gaps = calls.slice(1).map((c, i) => c.at - calls[i].at);
ok(calls.length === 3 && gaps.every((g) => g >= 100), `cadence respectée entre appels simultanés (écarts ${gaps.join(", ")} ms)`);

// erreurs réseau : jamais d'exception, on retombe sur Deezer
const boom = async () => { throw new Error("réseau"); };
ok(await mbYear(queen, { get: boom, pause: 5 }) === null, "erreur réseau : null, sans exception");
let n = 0;
const busy = async () => { n++; if (n === 1) { const e = new Error("busy"); e.busy = true; throw e; } return { recordings: [rec("Bohemian Rhapsody", "Queen", "1975")] }; };
ok(await mbYear(queen, { get: busy, pause: 5 }) === 1975 && n === 2, "serveur surchargé : une nouvelle tentative");
const always = async () => { const e = new Error("busy"); e.busy = true; throw e; };
ok(await mbYear(queen, { get: always, pause: 5 }) === null, "toujours surchargé : abandon");
ok(await mbYear({ title: "", artists: [] }, { get: boom }) === null, "morceau sans titre ni artiste : null");

// point d'entrée complet
let r = await resolveYear({ ...queen, release: "2011-05-01" }, { get: fake([rec("Bohemian Rhapsody", "Queen", "1975-10-31")]), pause: 5 });
ok(r.year === 1975 && r.confident && r.dz === 2011 && r.mb === 1975, "resolveYear : remaster 2011 -> 1975 sûre");
r = await resolveYear({ title: "Obscure", artists: ["Nobody"], release: "1999-03-02" }, { get: fake([]), pause: 5 });
ok(r.year === 1999 && !r.confident, "resolveYear : inconnu de MusicBrainz -> année Deezer, incertaine");
r = await resolveYear({ title: "Obscure", artists: ["Nobody"], release: "0000-00-00" }, { get: fake([]), pause: 5 });
ok(r === null, "resolveYear : aucune date -> null");
r = await resolveYear({ title: "Obscure", artists: ["Nobody"] }, { get: boom, pause: 5 });
ok(r === null, "resolveYear : réseau en panne et pas de date Deezer -> null");

console.log(fail ? `\n${fail} ÉCHEC(S)` : "\nRÉSULTAT: TOUT BON");
process.exit(fail ? 1 : 0);
