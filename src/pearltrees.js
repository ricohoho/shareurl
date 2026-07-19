'use strict';

const FETCH_TIMEOUT_MS = 10000;

function isPearltreesUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'pearltrees.com' || hostname.endsWith('.pearltrees.com');
  } catch {
    return false;
  }
}

// Le <link rel="canonical"> n'inclut l'id du pearl (/itemXXXXX) qu'une fois modifie par le JS
// cote client une fois la page chargee dans un navigateur ; le HTML statique recupere ici ne le
// contient jamais. Le meme id est en revanche present, en clair, dans les balises meta
// twitter:app:url:iphone/ipad (parametre N-p du deep link), qui sont bien rendues cote serveur.
function extractPearlId(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    if (/property\s*=\s*["']twitter:app:url:(iphone|ipad)["']/i.test(tag)) {
      const match = tag.match(/N-p=(\d+)/);
      if (match) return match[1];
    }
  }
  return null;
}

async function resolveDownloadUrl(url) {
  let html;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShareURL/1.0)' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new Error(`statut HTTP ${response.status}`);
    }
    html = await response.text();
  } catch (err) {
    throw new Error(`Impossible de charger la page Pearltrees : ${err.message}`);
  }

  const pearlId = extractPearlId(html);
  if (!pearlId) {
    throw new Error("Impossible de trouver l'identifiant du pearl sur cette page Pearltrees.");
  }

  return `https://www.pearltrees.com/s/urlapi/getPearlContentDownloadUrls?pearlId=${pearlId}`;
}

module.exports = { isPearltreesUrl, resolveDownloadUrl };
