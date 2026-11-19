// Calculs du tableau de bord, à partir de la progression enregistrée (fonctions pures, testées).
import type { GameRecord, Progress, ThemeStat } from './progress'
import { addDays } from './srs'

/** Série de jours d'entraînement : en cours (jusqu'à aujourd'hui ou hier) et record. */
export function streaks(days: string[], today: string): { current: number; best: number } {
  const set = new Set(days)
  const sorted = [...set].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  // La série en cours compte encore si on ne s'est pas entraîné aujourd'hui mais hier.
  let day = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(day)) {
    current++
    day = addDays(day, -1)
  }
  return { current, best }
}

/** Jours d'activité des `n` derniers jours (le plus ancien d'abord). */
export function lastDays(days: string[], today: string, n: number): { date: string; active: boolean }[] {
  const set = new Set(days)
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1)
    return { date, active: set.has(date) }
  })
}

export type ThemeRow = { theme: string; ok: number; total: number; rate: number }

/**
 * Thèmes faibles : au moins `minTotal` puzzles tentés et moins de `threshold` de réussite,
 * du plus faible au moins faible.
 */
export function weakThemes(themes: Record<string, ThemeStat>, minTotal = 5, threshold = 0.65): ThemeRow[] {
  return Object.entries(themes)
    .map(([theme, s]) => ({ theme, ...s, rate: s.total ? s.ok / s.total : 0 }))
    .filter((r) => r.total >= minTotal && r.rate < threshold)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
}

export function gameStats(games: GameRecord[]) {
  const count = (r: GameRecord['result']) => games.filter((g) => g.result === r).length
  const analysed = games.filter((g) => g.blunders !== undefined).slice(0, 10)
  const avg = (f: (g: GameRecord) => number) => (analysed.length ? analysed.reduce((s, g) => s + f(g), 0) / analysed.length : null)
  return {
    total: games.length,
    win: count('win'),
    draw: count('draw'),
    loss: count('loss'),
    /** Moyenne de gaffes par partie, sur les 10 dernières parties analysées. */
    blundersPerGame: avg((g) => g.blunders ?? 0),
    mistakesPerGame: avg((g) => g.mistakes ?? 0),
    analysed: analysed.length,
  }
}

/** Meilleur niveau de bot battu (0 si aucun). */
export function bestBotWin(games: GameRecord[]): number {
  return Math.max(0, ...games.filter((g) => g.source === 'bot' && g.result === 'win').map((g) => g.level ?? 0))
}

/** Nombre de lignes d'ouverture au moins en boîte `box` (ou acquises, donc sorties des révisions). */
export function openingsKnown(p: Pick<Progress, 'cards'>, box: number): number {
  return Object.values(p.cards).filter((c) => c.key.startsWith('opening:') && c.box >= box).length
}
