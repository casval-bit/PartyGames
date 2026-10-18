// Liste blanche des adresses que l'appli accepte de charger (images, couverts, extraits audio).
// Le créateur du lobby envoie ces adresses aux autres téléphones : sans filtre, un créateur malveillant pourrait faire
// charger n'importe quelle adresse (et ainsi voir l'IP des joueurs). On n'accepte que :
//  - des fichiers de l'appli elle-même (chemin relatif, ex. cards/xxx.jpg)
//  - https:// vers Deezer (dzcdn.net, deezer.com), Wikipédia / Wikimedia, Spotify (scdn.co, spotifycdn.com)
//  - demo:<n> (mélodies de démonstration générées dans l'appli, pour l'audio)
const HOSTS = [/(^|\.)dzcdn\.net$/, /(^|\.)deezer\.com$/, /(^|\.)wikimedia\.org$/, /(^|\.)wikipedia\.org$/, /(^|\.)scdn\.co$/, /(^|\.)spotifycdn\.com$/];

/** Renvoie l'adresse si elle est autorisée, sinon "". */
export function safeUrl(u, { allowDemo = false } = {}) {
  if (typeof u !== "string") return "";
  const s = u.trim();
  if (!s || s.length > 700 || /[\u0000-\u001f\u007f\s]/.test(s)) return "";
  if (allowDemo && /^demo:\d{1,3}$/.test(s)) return s;
  if (/^https:\/\//i.test(s)) {
    let url;
    try { url = new URL(s); } catch { return ""; }
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return HOSTS.some((re) => re.test(url.hostname.toLowerCase())) ? s : "";
  }
  // chemin relatif (fichier embarqué) : pas de schéma, pas de « // », pas de remontée de dossier
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("//") || s.includes("..") || s.includes("\\")) return "";
  return s;
}
