// Classement des coups d'une partie, sur le modèle de Lichess :
// on convertit l'évaluation en « chances de gain » (0 à 100 %) et on regarde combien
// le coup joué en a fait perdre au joueur.
//   ≥ 30 % perdus : gaffe (??)   ≥ 20 % : erreur (?)   ≥ 10 % : imprécision (?!)
import { Chess } from 'chess.js'
import { toCp, type EngineLine } from './engine'

export type Judgement = 'gaffe' | 'erreur' | 'imprecision'

export const JUDGEMENTS: Record<Judgement, { label: string; symbol: string; color: string }> = {
  gaffe: { label: 'Gaffe', symbol: '??', color: '#dc2626' },
  erreur: { label: 'Erreur', symbol: '?', color: '#ea580c' },
  imprecision: { label: 'Imprécision', symbol: '?!', color: '#ca8a04' },
}

/** Chances de gain (0–100) pour une évaluation en centipions (formule de Lichess). */
export function winChance(cp: number): number {
  const c = Math.max(-1000, Math.min(1000, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1)
}

export function judge(loss: number): Judgement | null {
  if (loss >= 30) return 'gaffe'
  if (loss >= 20) return 'erreur'
  if (loss >= 10) return 'imprecision'
  return null
}

export type AnalysedMove = {
  ply: number
  san: string
  color: 'w' | 'b'
  fenBefore: string
  /** Évaluation après le coup, point de vue des Blancs (centipions, mat = ±10000). */
  evalWhite: number
  /** Chances de gain perdues par le joueur qui a joué ce coup (0–100). */
  loss: number
  judgement: Judgement | null
  /** Meilleur coup selon Stockfish dans la position d'avant (SAN), et sa suite. */
  bestSan: string | null
  bestLine: string[]
}

/**
 * À partir des évaluations de chaque position (index 0 = position de départ, du point de vue
 * du camp au trait), calcule le jugement de chaque coup.
 */
export function judgeGame(startFen: string, sans: string[], evals: EngineLine[]): AnalysedMove[] {
  const game = new Chess(startFen)
  const out: AnalysedMove[] = []
  // evals[i] est du point de vue du camp au trait dans la position i : on le ramène au point de vue des Blancs.
  const whiteCp = (i: number) => {
    const turnWhite = (startFen.split(' ')[1] === 'w') === (i % 2 === 0)
    const cp = positionCp(evals[i], i, sans.length, game)
    return turnWhite ? cp : -cp
  }
  for (let i = 0; i < sans.length; i++) {
    const fenBefore = game.fen()
    const color = game.turn()
    const before = whiteCp(i)
    game.move(sans[i])
    const after = whiteCp(i + 1)
    const sign = color === 'w' ? 1 : -1
    const loss = Math.max(0, winChance(sign * before) - winChance(sign * after))
    const best = evals[i]?.pv[0]
    let bestSan: string | null = null
    const bestLine: string[] = []
    if (best) {
      const g = new Chess(fenBefore)
      for (const u of evals[i].pv.slice(0, 6)) {
        try {
          bestLine.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san)
        } catch {
          break
        }
      }
      bestSan = bestLine[0] ?? null
    }
    out.push({
      ply: i + 1,
      san: sans[i],
      color,
      fenBefore,
      evalWhite: after,
      loss,
      // Si le coup joué EST le meilleur, ce n'est jamais une faute (évite le bruit du moteur).
      judgement: bestSan === sans[i] ? null : judge(loss),
      bestSan,
      bestLine,
    })
  }
  return out
}

/** Évaluation d'une position ; les positions finales (mat, pat) n'ont pas de ligne moteur. */
function positionCp(line: EngineLine | undefined, i: number, total: number, game: Chess): number {
  if (line) return toCp(line)
  if (i === total && game.isCheckmate()) return -10000 // le camp au trait est maté
  return 0
}

export type ParsedGame = { startFen: string; sans: string[]; headers: Record<string, string>; pgn: string }

/** Lit un PGN (Lichess, Chess.com…). Renvoie null s'il est illisible. */
export function parsePgn(pgn: string): ParsedGame | null {
  try {
    const g = new Chess()
    g.loadPgn(pgn.trim())
    const headers = g.getHeaders()
    return { startFen: headers.FEN ?? new Chess().fen(), sans: g.history(), headers, pgn }
  } catch {
    return null
  }
}

