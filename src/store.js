'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR, DATA_FILE } = require('./config');

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

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

// uploadedFile: { filename, contentType, data } (voir http-helpers.parseMultipart) ou null
function saveUploadedFile(uploadedFile) {
  if (!uploadedFile) return null;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}${path.extname(uploadedFile.filename)}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), uploadedFile.data);
  return {
    storedName,
    originalName: uploadedFile.filename,
    contentType: uploadedFile.contentType || 'application/octet-stream',
    size: uploadedFile.data.length,
  };
}

function deleteUploadedFile(file) {
  if (!file) return;
  const filePath = path.join(UPLOADS_DIR, file.storedName);
  fs.rm(filePath, { force: true }, () => {});
}

function getUploadedFilePath(file) {
  return path.join(UPLOADS_DIR, file.storedName);
}

function addLink({ title, url, file }) {
  const links = readLinks();
  const link = {
    id: crypto.randomUUID(),
    title: title || '',
    url,
    file: file || null,
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
  deleteUploadedFile(removed.file);
  return removed;
}

function findLink(id) {
  return readLinks().find((link) => link.id === id) || null;
}

module.exports = {
  readLinks,
  writeLinks,
  addLink,
  deleteLink,
  findLink,
  saveUploadedFile,
  getUploadedFilePath,
};
