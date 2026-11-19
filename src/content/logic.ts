// Règles de correction des exercices. Utilisées à la fois par l'appli
// et par le script de vérification (scripts/verify-content.ts) : ainsi,
// ce qui est vérifié est exactement ce que l'appli accepte.
import { Chess, type Square } from 'chess.js'
import type { Fact, MoveStep, SquaresStep } from './types'

/** Cases attendues pour un exercice « clique sur les cases ». */
export function squaresAnswer(step: SquaresStep): string[] {
  if (step.from) {
    const game = new Chess(step.fen)
    const dests = game.moves({ square: step.from as Square, verbose: true }).map((m) => m.to)
    return [...new Set(dests)].sort()
  }
  return [...(step.answer ?? [])].sort()
}

/**
 * Le coup joué par l'élève (SAN) au demi-coup `ply` de la solution est-il accepté ?
 * `fenBefore` : position avant le coup.
 */
export function isMoveAccepted(step: MoveStep, ply: number, fenBefore: string, san: string): boolean {
  if (san === step.solution[ply]) return true
  if (ply === 0 && step.accept?.includes(san)) return true
  if (step.goal === 'mate' && ply === step.solution.length - 1) {
    const g = new Chess(fenBefore)
    try {
      g.move(san)
      return g.isCheckmate()
    } catch {
      return false
    }
  }
  return false
}

export function factOf(game: Chess): Fact {
  if (game.isCheckmate()) return 'checkmate'
  if (game.isStalemate()) return 'stalemate'
  if (game.inCheck()) return 'check'
  if (game.isInsufficientMaterial()) return 'insufficient'
  return 'normal'
}

/** Petit rendu du gras **…** : renvoie des segments [texte, gras?]. */
export function boldSegments(text: string): [string, boolean][] {
  return text.split('**').map((t, i) => [t, i % 2 === 1] as [string, boolean])
}
