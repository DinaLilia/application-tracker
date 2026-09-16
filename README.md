# Parcours — suivi de candidatures

Un petit projet complet (backend + frontend) pour suivre tes candidatures :
entreprise, ville, domaine, titre exact du poste, description de l'offre,
lien, statut, source, relances, notes... avec un tableau de bord visuel.

## Structure du projet

```8cb9bbfa-c4df-4e22-9a94-758dbca472e8k
candidature-tracker/
├── package.json      → dépendances et scripts npm
├── server.js          → serveur Express (API + fichiers statiques)
├── db.js               → couche de persistance (fichier data.json)
├── data.json            → tes données (créé automatiquement au 1er lancement)
└── public/
    ├── index.html        → structure de la page
    ├── style.css          → tous les styles
    └── app.js              → logique frontend (appelle l'API)
```

## Comment ça marche

- **Backend** : un serveur Node.js/Express expose une API REST sous
  `/api/candidatures` (GET, POST, PUT, DELETE). Les données sont
  enregistrées dans `data.json`, sur le disque du serveur — donc elles
  survivent même si tu changes de navigateur, contrairement à un simple
  stockage dans le navigateur (localStorage).
- **Frontend** : une page unique qui appelle cette API en `fetch()` pour
  afficher le tableau de bord, la liste, et le formulaire d'ajout/édition.

Ce découpage (fichier JSON pour commencer) est volontairement simple. Si tu
veux passer à une vraie base de données plus tard (SQLite, PostgreSQL...),
il suffit de réécrire les fonctions de `db.js` (`getAll`, `create`,
`update`, `remove`) — le reste du code (routes, frontend) n'a pas besoin de
changer.

## Installation et lancement

Il te faut [Node.js](https://nodejs.org/) installé sur ta machine
(version 18 ou plus récente recommandée).

```bash
# 1. Se placer dans le dossier du projet
cd candidature-tracker

# 2. Installer les dépendances (une seule fois)
npm install

# 3. Démarrer le serveur
npm start
```

Puis ouvre ton navigateur à l'adresse : **<http://localhost:3000>**

Pour arrêter le serveur, `Ctrl + C` dans le terminal.

## Sauvegarder / transférer tes données

Tes candidatures sont dans le fichier `data.json` à la racine du projet.
Pour les sauvegarder ou les transférer sur un autre ordinateur, il suffit
de copier ce fichier.

## Aller plus loin

Quelques pistes si tu veux faire évoluer le projet :

- Ajouter un export CSV/PDF de tes candidatures.
- Passer à une vraie base de données pour plusieurs utilisateurs.
- Déployer le serveur en ligne (Render, Railway, Fly.io...) pour y
  accéder depuis n'importe quel appareil.
- Ajouter des rappels automatiques par e-mail pour les relances prévues.
