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
solutions des exercices tactiques. Vérifie aussi les puzzles : légalité de tous, et Stockfish sur un
échantillon de 150 (`SAMPLE=all npm run verify` pour les contrôler tous, ~1 min).
Le script s'arrête en erreur au moindre problème.

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
    { "type": "choice", "id": "m0-ma-lecon-3", "prompt": "Question ?", "options": ["A", "B"], "answer": 0, "explanation": "…" },
    { "type": "choice", "id": "m0-ma-lecon-4", "fen": "…", "prompt": "Quel coup ?", "options": ["Nf3", "Nxf7"],
      "answer": 0, "engineChoice": true, "explanation": "…" },
    { "type": "practice", "id": "m0-ma-lecon-5", "fen": "…", "prompt": "Mate contre Stockfish.",
      "goal": "mate", "maxMoves": 10, "hint": "…", "explanation": "…" },
    { "type": "puzzles", "themes": ["fork"], "min": 500, "max": 800, "count": 4, "explain": "Fourchette !" }
  ]
}
```

Les types d'étapes :
- `demo` : une position commentée (avec des coups à rejouer) — à utiliser peu : 20 % de lecture maximum ;
- `move` : trouver le bon coup (ou la bonne suite) ;
- `squares` : cliquer sur des cases ;
- `choice` : question à choix ; avec `"engineChoice": true`, les options sont des coups et Stockfish vérifie
  que la bonne réponse est nettement la meilleure ;
- `practice` : jouer la position jusqu'au bout **contre Stockfish** : `"goal"` vaut `"mate"` (mater en
  `maxMoves` coups), `"promote"` (promouvoir un pion sans le perdre) ou `"hold"` (tenir `maxMoves` coups) ;
- `puzzles` : un emplacement provisoire. `npm run lesson:puzzles` le remplace par `count` puzzles Lichess
  du thème demandé et de classement `min`–`max` (non utilisés ailleurs), sous forme d'exercices `move`
  marqués `"source": "lichess:<id>"`. Il faut avoir lancé `npm run build:puzzles` une fois avant.

Règles importantes :
- les **coups** sont écrits en notation **anglaise** (`Nf3`, `Qxd7+`, `O-O`, `e8=Q`) ;
  les **textes** sont en français et utilisent la notation française (Cf3) ;
- `solution` alterne coups de l'élève et réponses adverses, et finit par un coup de l'élève ;
- `"goal": "mate"` accepte n'importe quel coup qui mate ; `accept` liste d'autres bons premiers coups ;
- `"engine": true` demande à Stockfish de confirmer la solution (à mettre sur tout exercice tactique) ;
- une leçon est validée avec **80 %** d'exercices réussis du premier coup, sans indice.

3. S'il y a des emplacements `puzzles`, lance `npm run lesson:puzzles`.
4. Lance `npm run verify` : corrige jusqu'à ce que tout soit vert. Le script contrôle aussi, avec Stockfish,
   les QCM `engineChoice` et que les positions `practice` sont bien gagnantes (ou tenables).

## Puzzles

Les puzzles viennent de la [base ouverte de Lichess](https://database.lichess.org/#puzzles) (licence CC0).
Le fichier `public/puzzles.json` (~3900 puzzles notés 400 à 1300, 14 thèmes) est déjà dans le dépôt.
Pour le régénérer (par exemple pour changer les thèmes ou les quotas dans `src/features/puzzles/themes.ts`) :

```bash
npm run build:puzzles
```
Télécharge la base Lichess (~300 Mo, une seule fois, dans `scripts/.cache/`), filtre et réécrit le fichier.

## Répétition espacée

Système de Leitner à 5 boîtes (`src/lib/srs.ts`). Un exercice de leçon ou un puzzle raté entre en boîte 1 et
revient le lendemain dans **Révisions**. Chaque réussite le fait monter d'une boîte (révisions à 1, 3, 7, 14
puis 30 jours) ; une erreur le renvoie en boîte 1 ; réussi en boîte 5, il est acquis.

## Jouer contre le bot et analyser

- **Moteur** : Stockfish 19 « lite » en WebAssembly, dans le navigateur (Web Worker). Les fichiers sont copiés
  automatiquement de `node_modules/stockfish` vers `public/stockfish/` avant `npm run dev` et `npm run build`.
- **Niveaux du bot** (`src/engine/bot.ts`) : 1 à 5 = Stockfish volontairement affaibli (calcul peu profond,
  choix parmi plusieurs coups, gaffes occasionnelles) ; 6 et 7 = réglage officiel `UCI_Elo` ; 8 = pleine force.
  Les Elo affichés sont des estimations.
- **Mode entraînement** : annuler ses coups et checklist anti-gaffe (rappel ou obligatoire).
- **Analyse** (`src/engine/analysis.ts`) : chaque position est évaluée (profondeur 12). Comme sur Lichess, on
  mesure les chances de gain perdues par chaque coup : ≥ 30 % gaffe, ≥ 20 % erreur, ≥ 10 % imprécision.
  Tes gaffes et erreurs peuvent être ajoutées aux révisions (Stockfish fournit aussi les coups équivalents).
- **Import Lichess** : API publique `lichess.org/api/games/user/<pseudo>` (15 dernières parties rapides,
  lentes et blitz), sans compte ni clé. Ou coller un PGN (Lichess, Chess.com).

## Sauvegarde de la progression

La progression est stockée dans le navigateur. Page **Progrès → Sauvegarde** : « Exporter » télécharge
un fichier JSON, « Importer » le recharge (par exemple sur un autre ordinateur).

## Notation

Les coups sont stockés en notation anglaise (`Nf3`), comme dans les PGN et chess.js,
et toujours affichés en notation française (`Cf3`) : R = roi, D = dame, T = tour, F = fou, C = cavalier.

## Avancement

- [x] Phase a — squelette, navigation, échiquier interactif
- [x] Phase b — moteur de leçons et d'exercices, module 0
- [x] Phase c — puzzles et répétition espacée
- [x] Phase d — bot Stockfish et analyse
- [ ] Phase e — modules 1 à 9, entraîneur d'ouvertures (fait : modules 1 à 4)
- [ ] Phase f — tableau de bord
- [ ] Phase g — déploiement

*(La section « Déploiement » sera écrite à la phase g.)*

## Licences

- Stockfish (moteur, paquet npm `stockfish`) : GPL-3.0. Comme l'appli l'embarque, son code doit rester public
  (c'est le cas si le dépôt GitHub est public).
- chess.js : BSD-2. react-chessboard : MIT.
- Puzzles : base de puzzles Lichess, CC0.
