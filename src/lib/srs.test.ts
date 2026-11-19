import { describe, expect, it } from 'vitest'
import { addDays, failedCard, isDue, reviewCard } from './srs'
import { ratingDelta } from './progress'
import { puzzleToStep, pickPuzzle } from '../features/puzzles/data'
import type { Puzzle } from '../features/puzzles/themes'

describe('répétition espacée (Leitner)', () => {
  it('additionne les jours, y compris en changeant de mois', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08')
  })
  it('une carte ratée revient demain en boîte 1', () => {
    expect(failedCard('puzzle:x', '2026-11-19')).toEqual({ key: 'puzzle:x', box: 1, due: '2026-11-20' })
  })
  it('monte de boîte en cas de réussite, retombe en boîte 1 sinon', () => {
    let c = failedCard('k', '2026-11-19')
    c = reviewCard(c, true, '2026-11-20')!
    expect(c).toMatchObject({ box: 2, due: '2026-11-23' })
    c = reviewCard(c, true, '2026-11-23')!
    expect(c).toMatchObject({ box: 3, due: '2026-11-30' })
    c = reviewCard(c, false, '2026-11-30')!
    expect(c).toMatchObject({ box: 1, due: '2026-12-01' })
  })
  it('sort du système après une réussite en boîte 5', () => {
    expect(reviewCard({ key: 'k', box: 5, due: '2026-11-19' }, true, '2026-11-19')).toBeNull()
  })
  it('est due le jour J et après', () => {
    expect(isDue({ key: 'k', box: 1, due: '2026-11-19' }, '2026-11-19')).toBe(true)
    expect(isDue({ key: 'k', box: 1, due: '2026-11-20' }, '2026-11-19')).toBe(false)
  })
})

describe('classement puzzles', () => {
  it('gagne plus contre un puzzle difficile, perd plus contre un facile', () => {
    expect(ratingDelta(600, 600, true)).toBe(12)
    expect(ratingDelta(600, 1000, true)).toBeGreaterThan(20)
    expect(ratingDelta(600, 400, false)).toBeLessThan(-15)
  })
})

// Puzzle Lichess réel (00008) : position avant le coup adverse, puis la solution.
const P: Puzzle = {
  id: '00008',
  fen: 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24',
  moves: 'f2g3 e6e7 b2b1 b3c1 b1c1 h6c1',
  rating: 1000,
  themes: ['fork'],
}

describe('puzzles', () => {
  it('convertit les coups UCI en notation et sépare le coup adverse', () => {
    const { step, preMove } = puzzleToStep(P)
    expect(preMove).toBe('Bxg3')
    expect(step.solution).toEqual(['Rxe7', 'Qb1+', 'Nc1', 'Qxc1+', 'Qxc1'])
    expect(step.prompt).toContain('Blancs')
  })
  it('choisit un puzzle du thème demandé en évitant les déjà vus', () => {
    const other = { ...P, id: 'b', themes: ['pin'] }
    expect(pickPuzzle([P, other], 'pin', 'auto', 1000, new Set())?.id).toBe('b')
    expect(pickPuzzle([P, { ...P, id: 'c' }], 'fork', 'auto', 1000, new Set(['00008']))?.id).toBe('c')
  })
})
