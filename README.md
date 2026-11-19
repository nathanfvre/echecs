# ♞ Échecs 0 → 1000

Application web personnelle pour apprendre les échecs de zéro jusqu'à 1000 Elo en partie rapide.
Tout tourne dans le navigateur : pas de serveur, pas de compte. La progression est enregistrée dans le navigateur (localStorage).

## Installation (une seule fois)

Prérequis : [Node.js](https://nodejs.org) version 20 ou plus (vérifie avec `node -v`).

```bash
npm install
```
Télécharge toutes les bibliothèques dont l'appli a besoin dans le dossier `node_modules/`.

## Lancer l'appli sur ton ordinateur

```bash
npm run dev
```
Démarre un serveur local, puis ouvre <http://localhost:5173> dans ton navigateur.
La page se recharge toute seule quand le code change. `Ctrl + C` dans le terminal pour arrêter.

## Vérifier que tout fonctionne

```bash
npm test
```
Lance les tests automatiques (notation, règles, et bientôt tout le contenu des leçons).

```bash
npm run build
```
Vérifie les types TypeScript et fabrique la version finale du site dans `dist/`.

## Organisation du code

```
src/
  components/   briques réutilisables (échiquier, liste des coups…)
  lib/          logique pure : règles (chess.ts), notation française (notation.ts)
  pages/        une page par section de l'appli
  App.tsx       menu et navigation
```

## Notation

Les coups sont stockés en notation anglaise (`Nf3`), comme dans les PGN et chess.js,
et toujours affichés en notation française (`Cf3`) : R = roi, D = dame, T = tour, F = fou, C = cavalier.

## Avancement

- [x] Phase a — squelette, navigation, échiquier interactif
- [ ] Phase b — moteur de leçons et d'exercices, module 0
- [ ] Phase c — puzzles et répétition espacée
- [ ] Phase d — bot Stockfish et analyse
- [ ] Phase e — modules 1 à 9, entraîneur d'ouvertures
- [ ] Phase f — tableau de bord
- [ ] Phase g — déploiement

*(Les sections « Ajouter une leçon » et « Déploiement » seront écrites aux phases b et g.)*
