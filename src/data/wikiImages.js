// Recherche d'images sur Wikipédia (image principale de la page). Utilisé par l'outil `npm run fetch-images`
// ET directement par l'appli pendant une partie de Qui est-ce ? (le téléphone du créateur interroge Wikipédia).
const FR_FIRST = new Set(["France", "Belgique", "Suisse", "Luxembourg", "Canada", "Haïti", "Sénégal", "Côte d'Ivoire", "Maroc", "Algérie", "Tunisie"]);

/** Interroge une Wikipédia pour un lot de titres. Renvoie Map(titre demandé -> { url, page } | null). Les pages d'homonymie sont ignorées. */
export async function lookup(lang, titles, fetchFn = fetch, headers = {}, size = 640) {
  const found = new Map();
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1", origin: "*",
    prop: "pageimages|pageprops", ppprop: "disambiguation", piprop: "thumbnail", pithumbsize: String(size),
    titles: titles.join("|"),
  });
  let cont = {};
  for (let guard = 0; guard < 20; guard++) {
    const qs = new URLSearchParams(params); for (const [k, v] of Object.entries(cont)) qs.set(k, v);
    const res = await fetchFn(`https://${lang}.wikipedia.org/w/api.php?${qs}`, { headers });
    if (!res.ok) throw new Error(`${lang}.wikipedia.org : HTTP ${res.status}`);
    const data = await res.json();
    const q = data.query || {};
    // titre demandé -> titre normalisé -> titre après redirection
    const back = new Map(titles.map((t) => [t, t]));
    for (const n of q.normalized || []) for (const [k, v] of back) if (v === n.from) back.set(k, n.to);
    for (const r of q.redirects || []) for (const [k, v] of back) if (v === r.from) back.set(k, r.to);
    const byTitle = new Map((q.pages || []).map((p) => [p.title, p]));
    for (const [asked, final] of back) {
      const p = byTitle.get(final);
      if (p && p.thumbnail && !(p.pageprops && "disambiguation" in p.pageprops)) found.set(asked, { url: p.thumbnail.source, page: p.title });
      else if (p && !found.has(asked)) found.set(asked, found.get(asked) || null);
    }
    if (!data.continue) break;
    cont = data.continue;
  }
  return found;
}

export const preferredLang = (card) => ((card.countries || []).some((x) => FR_FIRST.has(x)) ? "fr" : "en");

function withTimeout(fetchFn, ms) {
  return (url, opts = {}) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    return fetchFn(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
  };
}

/**
 * Parmi des cartes candidates (dans l'ordre), renvoie la première qui a une image sur Wikipédia : { card, url }.
 * Renvoie { error } si Wikipédia est injoignable (réseau coupé, ou page bloquée comme dans l'aperçu), null si aucune n'a d'image.
 */
export async function findFirstWithImage(cards, fetchFn = fetch, timeoutMs = 6000) {
  const f = withTimeout(fetchFn, timeoutMs);
  const names = cards.map((c) => c.name);
  const res = await Promise.allSettled(["fr", "en"].map((l) => lookup(l, names, f, {}, 520)));
  if (res.every((r) => r.status === "rejected")) return { error: String(res[0].reason && res[0].reason.message || res[0].reason) };
  const [fr, en] = res.map((r) => (r.status === "fulfilled" ? r.value : new Map()));
  for (const c of cards) {
    const first = preferredLang(c) === "fr" ? [fr, en] : [en, fr];
    for (const m of first) { const r = m.get(c.name); if (r && r.url) return { card: c, url: r.url }; }
  }
  return null;
}
