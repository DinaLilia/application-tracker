// server.js
// Serveur Express : sert le frontend (dossier public/) et expose une API
// REST sous /api/candidatures pour créer, lire, modifier et supprimer
// des candidatures. Les données sont stockées côté serveur (voir db.js),
// donc accessibles depuis n'importe quel navigateur qui pointe vers ce
// serveur, contrairement à un stockage localStorage.

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const REQUIRED_FIELDS = ["entreprise", "titre"];

function validate(payload) {
  for (const field of REQUIRED_FIELDS) {
    if (!payload[field] || !String(payload[field]).trim()) {
      return `Le champ "${field}" est obligatoire.`;
    }
  }
  return null;
}

// GET /api/candidatures - liste toutes les candidatures
app.get("/api/candidatures", (req, res) => {
  res.json(db.getAll());
});

// GET /api/candidatures/:id - une candidature précise
app.get("/api/candidatures/:id", (req, res) => {
  const item = db.getById(req.params.id);
  if (!item) return res.status(404).json({ error: "Candidature introuvable." });
  res.json(item);
});

// POST /api/candidatures - crée une candidature
app.post("/api/candidatures", (req, res) => {
  const error = validate(req.body || {});
  if (error) return res.status(400).json({ error });
  const item = db.create(req.body);
  res.status(201).json(item);
});

// PUT /api/candidatures/:id - met à jour une candidature
app.put("/api/candidatures/:id", (req, res) => {
  const error = validate(req.body || {});
  if (error) return res.status(400).json({ error });
  const updated = db.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Candidature introuvable." });
  res.json(updated);
});

// DELETE /api/candidatures/:id - supprime une candidature
app.delete("/api/candidatures/:id", (req, res) => {
  const removed = db.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: "Candidature introuvable." });
  res.status(204).end();
});

// Toute autre route non-API renvoie la page principale (single page app)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur "Parcours" lancé sur http://localhost:${PORT}`);
});
