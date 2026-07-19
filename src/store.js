'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { DATA_DIR, DATA_FILE } = require('./config');

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readLinks() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLinks(links) {
  ensureDataFile();
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(links, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

function addLink(url) {
  const links = readLinks();
  const link = {
    id: crypto.randomUUID(),
    url,
    createdAt: new Date().toISOString(),
  };
  links.unshift(link);
  writeLinks(links);
  return link;
}

function deleteLink(id) {
  const links = readLinks();
  const index = links.findIndex((link) => link.id === id);
  if (index === -1) return null;
  const [removed] = links.splice(index, 1);
  writeLinks(links);
  return removed;
}

function findLink(id) {
  return readLinks().find((link) => link.id === id) || null;
}

module.exports = { readLinks, writeLinks, addLink, deleteLink, findLink };
