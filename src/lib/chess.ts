import { Chess, validateFen } from 'chess.js'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Rejoue une liste de coups (notation anglaise) depuis une position de départ. */
export function replay(startFen: string, sans: string[]): Chess {
  const game = new Chess(startFen)
  for (const san of sans) game.move(san)
  return game
}

/** Vérifie qu'une FEN est valide. Renvoie un message d'erreur en français sinon. */
export function checkFen(fen: string): string | null {
  const res = validateFen(fen.trim())
  if (!res.ok) return 'Position (FEN) invalide.'
  try {
    new Chess(fen.trim())
    return null
  } catch {
    return 'Position (FEN) invalide'
  }
}

export type GameStatus = { text: string; over: boolean }

/** Décrit l'état de la partie en français : trait, échec, mat, pat, nulles. */
export function gameStatus(game: Chess): GameStatus {
  const side = game.turn() === 'w' ? 'Blancs' : 'Noirs'
  const other = game.turn() === 'w' ? 'Noirs' : 'Blancs'
  if (game.isCheckmate()) return { text: `Échec et mat ! Les ${other} gagnent.`, over: true }
  if (game.isStalemate()) return { text: `Pat : les ${side} n'ont aucun coup légal mais ne sont pas en échec. Partie nulle.`, over: true }
  if (game.isInsufficientMaterial()) return { text: 'Nulle : matériel insuffisant pour mater.', over: true }
  if (game.isThreefoldRepetition()) return { text: 'Nulle par triple répétition de la position.', over: true }
  if (game.isDrawByFiftyMoves()) return { text: 'Nulle par la règle des 50 coups.', over: true }
  if (game.inCheck()) return { text: `Les ${side} sont en échec !`, over: false }
  return { text: `Trait aux ${side}.`, over: false }
}

/** Case du roi du camp au trait (pour la surligner en cas d'échec). */
export function kingSquare(game: Chess, color = game.turn()): string | null {
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type === 'k' && sq.color === color) return sq.square
    }
  }
  return null
}
