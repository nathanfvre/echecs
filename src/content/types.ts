// Format des leçons. Chaque leçon est un fichier JSON dans src/content/modules/mX/.
// Les coups sont toujours écrits en notation ANGLAISE (SAN : Nf3, Qxd7+, O-O, e8=Q).
// Les textes affichés (intro, text, prompt, hint, explanation) sont en français
// et peuvent contenir du **gras** et des retours à la ligne.

export type Arrow = [from: string, to: string]

/** Une position commentée, sans exercice. `moves` : coups que l'on peut rejouer avec un bouton. */
export type DemoStep = {
  type: 'demo'
  fen: string
  text: string
  arrows?: Arrow[]
  highlight?: string[]
  moves?: string[]
  orientation?: 'white' | 'black'
}

/**
 * Exercice « joue le bon coup ».
 * `solution` alterne coups de l'élève et réponses adverses (jouées automatiquement).
 * `accept` : autres premiers coups acceptés. `goal: "mate"` : tout coup qui mate est accepté.
 * `engine: true` : le script de vérification contrôle la solution avec Stockfish.
 */
export type MoveStep = {
  type: 'move'
  id: string
  fen: string
  prompt: string
  solution: string[]
  accept?: string[]
  goal?: 'mate'
  engine?: boolean
  hint: string
  explanation: string
  orientation?: 'white' | 'black'
}

/**
 * Exercice « clique sur les cases ».
 * Soit `from` (une pièce) : la réponse est calculée = toutes les cases où cette pièce peut aller.
 * Soit `answer` : la liste exacte des cases attendues.
 */
export type SquaresStep = {
  type: 'squares'
  id: string
  fen: string
  prompt: string
  from?: string
  answer?: string[]
  hint: string
  explanation: string
  orientation?: 'white' | 'black'
}

/** Faits vérifiables automatiquement sur la position d'une question à choix. */
export type Fact = 'checkmate' | 'stalemate' | 'check' | 'normal' | 'insufficient'

/**
 * Question à choix (à utiliser avec parcimonie).
 * `fact` : si présent, le script vérifie que la bonne réponse correspond bien à la position.
 *   - avec `facts` (un fait par option), l'option `answer` doit être le vrai fait de la position.
 * `legal` : un coup (SAN) ; option 0 = « Oui, c'est légal », option 1 = « Non ». Vérifié par le script.
 */
export type ChoiceStep = {
  type: 'choice'
  id: string
  fen?: string
  prompt: string
  options: string[]
  answer: number
  facts?: Fact[]
  legal?: string
  hint?: string
  explanation: string
  orientation?: 'white' | 'black'
}

export type ExerciseStep = MoveStep | SquaresStep | ChoiceStep
export type Step = DemoStep | ExerciseStep

export type Lesson = {
  id: string
  title: string
  /** Quelques lignes maximum : la pratique avant tout. */
  intro: string
  steps: Step[]
}

export type Module = {
  id: string
  order: number
  title: string
  description: string
  lessons: Lesson[]
}

export const PASS_RATE = 0.8

export function isExercise(s: Step): s is ExerciseStep {
  return s.type !== 'demo'
}
