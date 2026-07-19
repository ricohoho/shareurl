'use strict';

const MAX_BODY_BYTES = 64 * 1024; // largement suffisant pour un formulaire url + password

class PayloadTooLargeError extends Error {}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return; // on continue a vider le flux, sans plus rien stocker
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        reject(new PayloadTooLargeError('Corps de requete trop volumineux'));
        return;
      }
      chunks.push(chunk);
    });
    // Ne jamais detruire le socket ici : la reponse d'erreur doit encore pouvoir etre
    // envoyee sur cette meme connexion une fois la promesse rejetee.
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function parseUrlEncoded(buffer) {
  const params = new URLSearchParams(buffer.toString('utf8'));
  const fields = {};
  for (const [key, value] of params) fields[key] = value;
  return fields;
}

async function readFormBody(req) {
  const buffer = await readRawBody(req, MAX_BODY_BYTES);
  return parseUrlEncoded(buffer);
}

// Parseur multipart/form-data minimal (pas de dependance externe) : le corps entier est
// bufferise en memoire (borne par maxBytes en amont), suffisant pour de petits fichiers.
function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!boundaryMatch) throw new Error('En-tete multipart invalide (boundary manquant).');
  const boundary = Buffer.from(`--${(boundaryMatch[1] || boundaryMatch[2]).trim()}`);

  const fields = {};
  const files = {};

  let start = buffer.indexOf(boundary);
  if (start === -1) return { fields, files };
  start += boundary.length;

  while (true) {
    const next = buffer.indexOf(boundary, start);
    if (next === -1) break;
    let part = buffer.slice(start, next);
    start = next + boundary.length;

    if (part[0] === 0x2d && part[1] === 0x2d) break; // '--' final, fin du multipart

    if (part[0] === 0x0d && part[1] === 0x0a) part = part.slice(2);
    if (part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a) {
      part = part.slice(0, -2);
    }

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd).toString('utf8');
    const body = part.slice(headerEnd + 4);

    const dispositionMatch = /Content-Disposition:\s*form-data;([^\r\n]*)/i.exec(headerText);
    if (!dispositionMatch) continue;
    const nameMatch = /name="([^"]*)"/i.exec(dispositionMatch[1]);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = /filename="([^"]*)"/i.exec(dispositionMatch[1]);
    if (filenameMatch && filenameMatch[1]) {
      const contentTypeMatch = /Content-Type:\s*([^\r\n]*)/i.exec(headerText);
      files[name] = {
        filename: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
        data: body,
      };
    } else {
      fields[name] = body.toString('utf8');
    }
  }

  return { fields, files };
}

async function readMultipartBody(req, maxBytes, contentType) {
  const buffer = await readRawBody(req, maxBytes);
  return parseMultipart(buffer, contentType);
}

// Les en-tetes HTTP n'acceptent que du Latin-1 imprimable : un nom de fichier avec un accent,
// une apostrophe typographique ou un tiret cadratin (ex: "Le mariage parfait – tome 2.epub")
// fait planter res.writeHead (ERR_INVALID_CHAR) s'il est passe tel quel. On fournit un
// fallback ASCII pour filename=, et le nom complet encode pour filename*= (RFC 5987/6266),
// que la plupart des navigateurs recents utilisent en priorite.
function contentDispositionHeader(originalName) {
  const cleaned = originalName.replace(/[\r\n]/g, '');
  const asciiFallback = cleaned.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'") || 'fichier';
  const encoded = encodeURIComponent(cleaned);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

module.exports = {
  PayloadTooLargeError,
  parseCookies,
  readFormBody,
  readMultipartBody,
  contentDispositionHeader,
};
