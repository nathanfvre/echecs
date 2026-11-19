import { describe, expect, it } from 'vitest'
import { bestBotWin, gameStats, lastDays, streaks, weakThemes } from './stats'

describe('tableau de bord', () => {
  it('compte la série en cours et le record', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10', '2026-11-11']
    expect(streaks(days, '2026-11-11')).toEqual({ current: 2, best: 3 })
    // Pas encore joué aujourd'hui : la série d'hier compte encore.
    expect(streaks(days, '2026-11-12')).toEqual({ current: 2, best: 3 })
    // Deux jours sans jouer : la série retombe à 0.
    expect(streaks(days, '2026-11-13').current).toBe(0)
    expect(streaks([], '2026-11-13')).toEqual({ current: 0, best: 0 })
  })
  it('traverse les fins de mois', () => {
    expect(streaks(['2026-11-30', '2026-12-01'], '2026-12-01').current).toBe(2)
  })
  it('liste les derniers jours', () => {
    const d = lastDays(['2026-11-10'], '2026-11-11', 3)
    expect(d).toEqual([
      { date: '2026-11-09', active: false },
      { date: '2026-11-10', active: true },
      { date: '2026-11-11', active: false },
    ])
  })
  it('repère les thèmes faibles (assez de puzzles, peu de réussite)', () => {
    const w = weakThemes({ fork: { ok: 2, total: 10 }, pin: { ok: 9, total: 10 }, skewer: { ok: 0, total: 2 }, mateIn1: { ok: 3, total: 6 } })
    expect(w.map((r) => r.theme)).toEqual(['fork', 'mateIn1'])
  })
  it('résume les parties', () => {
    const g = [
      { date: '', source: 'bot' as const, userColor: 'w' as const, result: 'win' as const, level: 3, pgn: '', blunders: 1, mistakes: 2 },
      { date: '', source: 'bot' as const, userColor: 'w' as const, result: 'win' as const, level: 2, pgn: '' },
      { date: '', source: 'import' as const, userColor: 'b' as const, result: 'loss' as const, pgn: '', blunders: 3, mistakes: 0 },
    ]
    expect(gameStats(g)).toMatchObject({ total: 3, win: 2, loss: 1, draw: 0, blundersPerGame: 2, analysed: 2 })
    expect(bestBotWin(g)).toBe(3)
    expect(bestBotWin([])).toBe(0)
  })
})
