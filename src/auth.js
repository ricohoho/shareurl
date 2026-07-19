'use strict';

const crypto = require('crypto');
const { APP_PASSWORD, COOKIE_SECURE, SESSION_TTL_SECONDS } = require('./config');

const SESSION_COOKIE = 'sessionId';
const sessions = new Map(); // token -> expiresAt (ms epoch)

function safeCompare(input) {
  const a = Buffer.from(input || '', 'utf8');
  const b = Buffer.from(APP_PASSWORD, 'utf8');
  if (a.length !== b.length) {
    // Comparaison de longueur egale quand meme pour eviter une fuite triviale par timing.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function createSession() {
  const token = crypto.randomUUID();
  sessions.set(token, Date.now() + SESSION_TTL_SECONDS * 1000);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function sessionCookieHeader(token) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (COOKIE_SECURE) parts.push('Secure');
  return parts.join('; ');
}

function clearCookieHeader() {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (COOKIE_SECURE) parts.push('Secure');
  return parts.join('; ');
}

module.exports = {
  SESSION_COOKIE,
  safeCompare,
  createSession,
  isValidSession,
  destroySession,
  sessionCookieHeader,
  clearCookieHeader,
};
