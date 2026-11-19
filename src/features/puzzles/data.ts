import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import type { MoveStep } from '../../content/types'
import { sanToFr } from '../../lib/notation'
import { PUZZLE_THEMES, type Puzzle } from './themes'

let cache: Promise<Puzzle[]> | null = null

/** Charge public/puzzles.json une seule fois (≈ 600 Ko). */
export function loadPuzzles(): Promise<Puzzle[]> {
  cache ??= fetch(`${import.meta.env.BASE_URL}puzzles.json`).then((r) => {
    if (!r.ok) throw new Error('puzzles.json introuvable')
    return r.json()
  })
  return cache
}

export function usePuzzles(): { puzzles: Puzzle[] | null; error: boolean } {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    loadPuzzles().then(setPuzzles, () => setError(true))
  }, [])
  return { puzzles, error }
}

/**
 * Convertit un puzzle Lichess en exercice : le 1er coup (adverse) est joué automatiquement,
 * puis l'élève doit trouver la suite. Les coups UCI sont traduits en SAN.
 */
export function puzzleToStep(p: Puzzle): { step: MoveStep; preMove: string } {
  const g = new Chess(p.fen)
  const sans = p.moves.split(' ').map((m) => g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san)
  const [preMove, ...solution] = sans
  const userIsWhite = p.fen.split(' ')[1] === 'b'
  const theme = PUZZLE_THEMES.find((t) => p.themes.includes(t.key))
  const isMate = p.themes.some((t) => t.startsWith('mate') || t === 'backRankMate')
  const userMoves = solution.filter((_, i) => i % 2 === 0)
  return {
    preMove,
    step: {
      type: 'move',
      id: `puzzle-${p.id}`,
      fen: p.fen,
      prompt: `À toi (${userIsWhite ? 'Blancs' : 'Noirs'}) : trouve le meilleur coup.${userMoves.length > 1 ? ` (${userMoves.length} coups à trouver)` : ''}`,
      solution,
      ...(isMate ? { goal: 'mate' as const } : {}),
      hint: theme?.hint ?? 'Cherche les échecs, les prises et les menaces.',
      explanation: `Solution : **${solution.map(sanToFr).join(' ')}**`,
    },
  }
}

export type Difficulty = 'auto' | 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'auto', label: 'Adapté à mon niveau' },
  { key: 'easy', label: 'Facile (400–700)' },
  { key: 'medium', label: 'Moyen (700–1000)' },
  { key: 'hard', label: 'Difficile (1000–1300)' },
]

function range(d: Difficulty, rating: number): [number, number] {
  switch (d) {
    case 'easy':
      return [0, 700]
    case 'medium':
      return [700, 1000]
    case 'hard':
      return [1000, 9999]
    default:
      return [rating - 150, rating + 150]
  }
}

/** Choisit un puzzle au hasard : thème, difficulté, en évitant ceux déjà vus si possible. */
export function pickPuzzle(all: Puzzle[], theme: string, d: Difficulty, rating: number, seen: Set<string>, exclude?: string) {
  const byTheme = theme === 'all' ? all : all.filter((p) => p.themes.includes(theme))
  const [lo, hi] = range(d, rating)
  const tries = [
    byTheme.filter((p) => p.rating >= lo && p.rating <= hi && !seen.has(p.id)),
    // Plus rien de neuf dans la tranche : on élargit, puis on accepte les déjà vus.
    byTheme.filter((p) => p.rating >= lo - 200 && p.rating <= hi + 200 && !seen.has(p.id)),
    byTheme.filter((p) => !seen.has(p.id)),
    byTheme,
  ]
  for (const list of tries) {
    const pool = list.filter((p) => p.id !== exclude)
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
  }
  return null
}
