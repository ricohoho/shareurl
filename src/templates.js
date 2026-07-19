'use strict';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/public/style.css">
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function loginPage(error) {
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return layout('ShareURL - Connexion', `
<div class="container">
  <h1>ShareURL</h1>
  ${errorHtml}
  <form method="POST" action="/login">
    <label for="password">Mot de passe</label>
    <input type="password" id="password" name="password" autofocus>
    <input type="submit" value="Se connecter">
  </form>
</div>
`);
}

function listPage(links) {
  const items = links.length
    ? links.map((link) => `
  <li class="link-row">
    <a class="link-url" href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a>
    <div class="link-meta">
      <span class="link-date">${formatDate(link.createdAt)}</span>
      <a class="delete-link" href="/links/${encodeURIComponent(link.id)}/delete">Supprimer</a>
    </div>
  </li>`).join('\n')
    : '<li class="empty">Aucun lien pour le moment.</li>';

  return layout('ShareURL', `
<div class="container">
  <h1>ShareURL</h1>
  <div class="top-actions">
    <a class="button" href="/add">Ajouter</a>
    <form method="POST" action="/logout" class="logout-form">
      <input type="submit" value="Se deconnecter">
    </form>
  </div>
  <ul class="link-list">
${items}
  </ul>
</div>
`);
}

function addPage(error, prefillUrl) {
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return layout('ShareURL - Ajouter', `
<div class="container">
  <h1>Ajouter un lien</h1>
  ${errorHtml}
  <form method="POST" action="/add">
    <label for="url">URL</label>
    <input type="text" id="url" name="url" value="${escapeHtml(prefillUrl || '')}" autofocus>
    <input type="submit" value="Valider">
  </form>
  <p><a href="/">Retour a la liste</a></p>
</div>
`);
}

function deleteConfirmPage(link) {
  return layout('ShareURL - Supprimer', `
<div class="container">
  <h1>Supprimer ce lien ?</h1>
  <p class="link-url">${escapeHtml(link.url)}</p>
  <form method="POST" action="/links/${encodeURIComponent(link.id)}/delete">
    <input type="submit" value="Confirmer la suppression">
  </form>
  <p><a href="/">Annuler et retourner a la liste</a></p>
</div>
`);
}

module.exports = { escapeHtml, formatDate, layout, loginPage, listPage, addPage, deleteConfirmPage };
