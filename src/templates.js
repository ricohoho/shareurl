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
    ? links.map((link) => {
        const titleHtml = link.title
          ? `<div class="link-title">${escapeHtml(link.title)}</div>`
          : '';
        const fileHtml = link.file
          ? `<a class="download-link" href="/links/${encodeURIComponent(link.id)}/download">Telecharger : ${escapeHtml(link.file.originalName)}</a>`
          : '';
        const urlHtml = link.url
          ? `<a class="link-url" href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a>`
          : '';
        return `
  <li class="link-row">
    ${titleHtml}
    ${urlHtml}
    <div class="link-meta">
      <span class="link-date">${formatDate(link.createdAt)}</span>
      ${fileHtml}
      <a class="delete-link" href="/links/${encodeURIComponent(link.id)}/delete">Supprimer</a>
    </div>
  </li>`;
      }).join('\n')
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

function addPage(opts = {}) {
  const { error, title, url } = opts;
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return layout('ShareURL - Ajouter', `
<div class="container">
  <h1>Ajouter un lien</h1>
  ${errorHtml}
  <form method="POST" action="/add" enctype="multipart/form-data">
    <label for="file">Fichier joint (facultatif)</label>
    <input type="file" id="file" name="file" autofocus>

    <label for="titre">Titre (facultatif, 50 caracteres max)</label>
    <input type="text" id="titre" name="titre" maxlength="50" value="${escapeHtml(title || '')}">

    <label for="url">URL (facultatif)</label>
    <input type="text" id="url" name="url" value="${escapeHtml(url || '')}">

    <input type="submit" value="Valider">
  </form>
  <p><a href="/">Retour a la liste</a></p>
</div>
<script>
(function () {
  var fileInput = document.getElementById('file');
  var titleInput = document.getElementById('titre');
  if (!fileInput || !titleInput) return;
  fileInput.addEventListener('change', function () {
    if (titleInput.value.trim() !== '') return;
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var dotIndex = file.name.lastIndexOf('.');
    var base = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
    titleInput.value = base.slice(0, 50);
  });
})();
</script>
`);
}

function deleteConfirmPage(link) {
  const titleHtml = link.title ? `<p class="link-title">${escapeHtml(link.title)}</p>` : '';
  const urlHtml = link.url ? `<p class="link-url">${escapeHtml(link.url)}</p>` : '';
  const fileHtml = link.file
    ? `<p>Le fichier joint (${escapeHtml(link.file.originalName)}) sera egalement supprime.</p>`
    : '';
  return layout('ShareURL - Supprimer', `
<div class="container">
  <h1>Supprimer ce lien ?</h1>
  ${titleHtml}
  ${urlHtml}
  ${fileHtml}
  <form method="POST" action="/links/${encodeURIComponent(link.id)}/delete">
    <input type="submit" value="Confirmer la suppression">
  </form>
  <p><a href="/">Annuler et retourner a la liste</a></p>
</div>
`);
}

module.exports = { escapeHtml, formatDate, layout, loginPage, listPage, addPage, deleteConfirmPage };
