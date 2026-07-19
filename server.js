'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT } = require('./src/config');
const { parseCookies, readFormBody } = require('./src/http-helpers');
const auth = require('./src/auth');
const store = require('./src/store');
const templates = require('./src/templates');
const pearltrees = require('./src/pearltrees');

const PUBLIC_DIR = path.join(__dirname, 'public');

function normalizeUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return { error: "L'URL ne peut pas etre vide." };

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "URL invalide." };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: "Seules les URL http:// ou https:// sont acceptees." };
  }

  return { url: parsed.toString() };
}

function getSessionToken(req) {
  return parseCookies(req)[auth.SESSION_COOKIE];
}

function isAuthenticated(req) {
  return auth.isValidSession(getSessionToken(req));
}

function sendHtml(res, statusCode, html, extraHeaders) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders });
  res.end(html);
}

function redirect(res, location, extraHeaders) {
  res.writeHead(302, { Location: location, ...extraHeaders });
  res.end();
}

function serveStatic(req, res, pathname) {
  const relative = pathname.replace(/^\/public\//, '');
  const filePath = path.join(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return true;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }
  const ext = path.extname(filePath);
  const contentType = ext === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleRequest(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  if (method === 'GET' && pathname.startsWith('/public/')) {
    if (serveStatic(req, res, pathname)) return;
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (method === 'GET' && pathname === '/login') {
    sendHtml(res, 200, templates.loginPage());
    return;
  }

  if (method === 'POST' && pathname === '/login') {
    const fields = await readFormBody(req);
    if (auth.safeCompare(fields.password)) {
      const token = auth.createSession();
      redirect(res, '/', { 'Set-Cookie': auth.sessionCookieHeader(token) });
    } else {
      sendHtml(res, 401, templates.loginPage('Mot de passe incorrect.'));
    }
    return;
  }

  if (!isAuthenticated(req)) {
    redirect(res, '/login');
    return;
  }

  if (method === 'GET' && pathname === '/') {
    const links = store.readLinks();
    sendHtml(res, 200, templates.listPage(links));
    return;
  }

  if (method === 'GET' && pathname === '/add') {
    sendHtml(res, 200, templates.addPage());
    return;
  }

  if (method === 'POST' && pathname === '/add') {
    const fields = await readFormBody(req);
    const result = normalizeUrl(fields.url);
    if (result.error) {
      sendHtml(res, 400, templates.addPage(result.error, fields.url));
      return;
    }
    let urlToStore = result.url;
    if (pearltrees.isPearltreesUrl(urlToStore)) {
      try {
        urlToStore = await pearltrees.resolveDownloadUrl(urlToStore);
      } catch (err) {
        sendHtml(res, 400, templates.addPage(err.message, fields.url));
        return;
      }
    }
    store.addLink(urlToStore);
    redirect(res, '/');
    return;
  }

  const deleteMatch = pathname.match(/^\/links\/([^/]+)\/delete$/);
  if (deleteMatch) {
    const id = decodeURIComponent(deleteMatch[1]);
    if (method === 'GET') {
      const link = store.findLink(id);
      if (!link) {
        res.writeHead(404);
        res.end('Lien introuvable');
        return;
      }
      sendHtml(res, 200, templates.deleteConfirmPage(link));
      return;
    }
    if (method === 'POST') {
      store.deleteLink(id);
      redirect(res, '/');
      return;
    }
  }

  if (method === 'POST' && pathname === '/logout') {
    auth.destroySession(getSessionToken(req));
    redirect(res, '/login', { 'Set-Cookie': auth.clearCookieHeader() });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 - Page introuvable</h1>');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>500 - Erreur serveur</h1>');
    }
  });
});

server.listen(PORT, () => {
  console.log(`ShareURL demarre sur http://localhost:${PORT}`);
});
