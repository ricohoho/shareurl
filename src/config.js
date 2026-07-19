'use strict';

const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS, 10) || 60 * 60 * 24 * 30; // 30 jours
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'links.json');
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB, 10) || 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

if (!APP_PASSWORD) {
  console.error('Erreur: la variable d\'environnement APP_PASSWORD est requise. Voir .env.example.');
  process.exit(1);
}

module.exports = {
  PORT,
  APP_PASSWORD,
  COOKIE_SECURE,
  SESSION_TTL_SECONDS,
  DATA_DIR,
  DATA_FILE,
  MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES,
};
