// db.js
// Petite couche de persistance basée sur un fichier JSON.
// Volontairement simple : facile à lire, à modifier, et à remplacer plus
// tard par une vraie base de données (SQLite, PostgreSQL, MongoDB...)
// sans changer le reste de l'application, tant que les mêmes fonctions
// (getAll, create, update, remove) sont conservées.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");

function ensureFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur de lecture de data.json :", err);
    return [];
  }
}

function writeAll(items) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Erreur d'écriture de data.json :", err);
    throw err;
  }
}

function getAll() {
  return readAll();
}

function getById(id) {
  return readAll().find((item) => item.id === id) || null;
}

function create(data) {
  const items = readAll();
  const now = new Date().toISOString();
  const item = Object.assign({}, data, {
    id: "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    createdAt: now,
    updatedAt: now
  });
  items.push(item);
  writeAll(items);
  return item;
}

function update(id, data) {
  const items = readAll();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated = Object.assign({}, items[idx], data, {
    id: items[idx].id,
    createdAt: items[idx].createdAt,
    updatedAt: new Date().toISOString()
  });
  items[idx] = updated;
  writeAll(items);
  return updated;
}

function remove(id) {
  const items = readAll();
  const next = items.filter((item) => item.id !== id);
  const removed = next.length !== items.length;
  if (removed) writeAll(next);
  return removed;
}

module.exports = { getAll, getById, create, update, remove };
