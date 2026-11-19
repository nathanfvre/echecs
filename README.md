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
npm run verify
```
Vérifie **tout le contenu du cours** : chaque position (FEN) est légale, chaque coup de solution est légal
et bien écrit, les réponses aux questions correspondent à la position, et Stockfish confirme les
solutions des exercices tactiques. Le script s'arrête en erreur au moindre problème.

```bash
npm run build
```
Vérifie les types TypeScript et fabrique la version finale du site dans `dist/`.

## Organisation du code

```
scripts/
  verify-content.ts   vérification du contenu (npm run verify)
  engine.ts           pilotage de Stockfish depuis Node
src/
  components/   briques réutilisables (échiquier, liste des coups…)
  content/      le cours : modules/m0/… (une leçon = un fichier JSON), types.ts, logic.ts
  features/     les grandes fonctions (course = parcours et lecteur de leçons)
  lib/          logique pure : règles, notation française, progression (localStorage)
  pages/        pages simples (accueil, échiquier libre, sauvegarde)
```

## Ajouter une leçon

1. Crée un fichier JSON dans le dossier du module, par exemple `src/content/modules/m0/13-ma-lecon.json`.
   Les leçons sont rangées par ordre alphabétique du nom de fichier (d'où le numéro au début).
2. Remplis-le en suivant ce modèle (le format complet est décrit dans `src/content/types.ts`) :

```json
{
  "id": "m0-ma-lecon",
  "title": "Titre de la leçon",
  "intro": "Explication **courte** (quelques lignes).",
  "steps": [
    { "type": "demo", "fen": "…", "text": "Commentaire", "arrows": [["e2", "e4"]], "moves": ["e4"] },
    { "type": "move", "id": "m0-ma-lecon-1", "fen": "…", "prompt": "Les Blancs gagnent une pièce.",
      "solution": ["Nc7+"], "engine": true, "hint": "Indice", "explanation": "Pourquoi c'est le bon coup" },
    { "type": "squares", "id": "m0-ma-lecon-2", "fen": "…", "from": "e4",
      "prompt": "Où peut aller cette pièce ?", "hint": "…", "explanation": "…" },
    { "type": "choice", "id": "m0-ma-lecon-3", "prompt": "Question ?", "options": ["A", "B"], "answer": 0, "explanation": "…" }
  ]
}
```

Règles importantes :
- les **coups** sont écrits en notation **anglaise** (`Nf3`, `Qxd7+`, `O-O`, `e8=Q`) ;
  les **textes** sont en français et utilisent la notation française (Cf3) ;
- `solution` alterne coups de l'élève et réponses adverses, et finit par un coup de l'élève ;
- `"goal": "mate"` accepte n'importe quel coup qui mate ; `accept` liste d'autres bons premiers coups ;
- `"engine": true` demande à Stockfish de confirmer la solution (à mettre sur tout exercice tactique) ;
- une leçon est validée avec **80 %** d'exercices réussis du premier coup, sans indice.

3. Lance `npm run verify` : corrige jusqu'à ce que tout soit vert.

## Sauvegarde de la progression

La progression est stockée dans le navigateur. Page **Progrès → Sauvegarde** : « Exporter » télécharge
un fichier JSON, « Importer » le recharge (par exemple sur un autre ordinateur).

## Notation

Les coups sont stockés en notation anglaise (`Nf3`), comme dans les PGN et chess.js,
et toujours affichés en notation française (`Cf3`) : R = roi, D = dame, T = tour, F = fou, C = cavalier.

## Avancement

- [x] Phase a — squelette, navigation, échiquier interactif
- [x] Phase b — moteur de leçons et d'exercices, module 0
- [ ] Phase c — puzzles et répétition espacée
- [ ] Phase d — bot Stockfish et analyse
- [ ] Phase e — modules 1 à 9, entraîneur d'ouvertures
- [ ] Phase f — tableau de bord
- [ ] Phase g — déploiement

*(La section « Déploiement » sera écrite à la phase g.)*

## Licences

- Stockfish (moteur, paquet npm `stockfish`) : GPL-3.0. Comme l'appli l'embarque, son code doit rester public
  (c'est le cas si le dépôt GitHub est public).
- chess.js : BSD-2. react-chessboard : MIT.
