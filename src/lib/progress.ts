// Progression de l'élève, enregistrée dans le navigateur (localStorage).
// Un seul objet JSON, exportable / importable pour faire une sauvegarde.
import { useSyncExternalStore } from 'react'
import { failedCard, reviewCard, type Card } from './srs'

const KEY = 'echecs-progress-v1'

export type LessonProgress = {
  /** Meilleur taux de réussite (0 à 1). */
  best: number
  passed: boolean
  attempts: number
  last: string
}

export type ThemeStat = { ok: number; total: number }

export type GameRecord = {
  date: string
  /** Contre le bot ou partie importée et analysée. */
  source: 'bot' | 'import'
  userColor: 'w' | 'b'
  result: 'win' | 'loss' | 'draw' | 'unknown'
  level?: number
  pgn: string
  /** Nombre de gaffes / erreurs du joueur, une fois la partie analysée. */
  blunders?: number
  mistakes?: number
}

export type Progress = {
  version: 1
  lessons: Record<string, LessonProgress>
  /** Cartes de répétition espacée (exercices et puzzles ratés). */
  cards: Record<string, Card>
  /** Classement puzzles de l'élève (type Elo), départ à 600. */
  puzzleRating: number
  /** Puzzles déjà vus (ids Lichess), pour ne pas les reproposer tout de suite. */
  puzzlesSeen: string[]
  /** Réussite par thème tactique (clé Lichess). */
  themes: Record<string, ThemeStat>
  /** Jours d'activité (AAAA-MM-JJ), pour la série de jours. */
  days: string[]
  /** Parties jouées contre le bot ou analysées (les 100 dernières). */
  games: GameRecord[]
  /** Pseudo Lichess, pour importer tes parties. */
  lichessUser: string
}

const empty = (): Progress => ({
  version: 1,
  lessons: {},
  cards: {},
  puzzleRating: 600,
  puzzlesSeen: [],
  themes: {},
  days: [],
  games: [],
  lichessUser: '',
})

export const today = () => new Date().toLocaleDateString('sv-SE') // format AAAA-MM-JJ, heure locale

/** Complète un objet ancien ou partiel (anciennes sauvegardes) avec les valeurs par défaut. */
function normalize(data: Partial<Progress> & { missed?: Record<string, { lessonId: string }> }): Progress {
  const p = { ...empty(), ...data }
  // Phase b : les exercices ratés étaient dans `missed` → on les convertit en cartes.
  if (data.missed) {
    for (const [id, m] of Object.entries(data.missed)) {
      const key = `exercise:${id}`
      p.cards[key] ??= { key, box: 1, due: today(), lessonId: m.lessonId }
    }
    delete (p as { missed?: unknown }).missed
  }
  return p
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalize(JSON.parse(raw)) : empty()
  } catch {
    return empty()
  }
}

let state: Progress = load()
const listeners = new Set<() => void>()

function save(next: Progress) {
  state = { ...next, days: next.days.includes(today()) ? next.days : [...next.days, today()] }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* stockage plein ou bloqué : on garde en mémoire */
  }
  listeners.forEach((l) => l())
}

export function getProgress() {
  return state
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/** Enregistre la fin d'une leçon. `results` : id d'exercice → réussi du premier coup ? */
export function recordLesson(lessonId: string, results: Record<string, boolean>, passRate: number) {
  const values = Object.values(results)
  const rate = values.length ? values.filter(Boolean).length / values.length : 1
  const prev = state.lessons[lessonId]
  const cards = { ...state.cards }
  for (const [id, ok] of Object.entries(results)) {
    const key = `exercise:${id}`
    if (!ok) cards[key] = failedCard(key, today(), lessonId)
  }
  save({
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: {
        best: Math.max(rate, prev?.best ?? 0),
        passed: (prev?.passed ?? false) || rate >= passRate,
        attempts: (prev?.attempts ?? 0) + 1,
        last: today(),
      },
    },
    cards,
  })
  return rate
}

/** Variation de classement façon Elo (K = 24) contre un puzzle de classement donné. */
export function ratingDelta(player: number, puzzle: number, ok: boolean): number {
  const expected = 1 / (1 + 10 ** ((puzzle - player) / 400))
  return Math.round(24 * ((ok ? 1 : 0) - expected))
}

/**
 * Enregistre un puzzle. Hors révision : met à jour le classement et, en cas d'échec,
 * crée une carte de révision. En révision : fait avancer ou reculer la carte.
 */
export function recordPuzzle(p: { id: string; rating: number; themes: string[] }, ok: boolean, review: boolean) {
  const key = `puzzle:${p.id}`
  const cards = { ...state.cards }
  let puzzleRating = state.puzzleRating
  if (review && cards[key]) {
    const next = reviewCard(cards[key], ok, today())
    if (next) cards[key] = next
    else delete cards[key]
  } else {
    if (!state.puzzlesSeen.includes(p.id)) puzzleRating = Math.max(100, puzzleRating + ratingDelta(puzzleRating, p.rating, ok))
    if (!ok) cards[key] = failedCard(key, today())
  }
  const themes = { ...state.themes }
  for (const t of p.themes) {
    const s = themes[t] ?? { ok: 0, total: 0 }
    themes[t] = { ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }
  }
  save({
    ...state,
    cards,
    puzzleRating,
    themes,
    puzzlesSeen: state.puzzlesSeen.includes(p.id) ? state.puzzlesSeen : [...state.puzzlesSeen, p.id],
  })
}

/** Révision d'un exercice de leçon. */
export function recordExerciseReview(exerciseId: string, ok: boolean) {
  recordCardReview(`exercise:${exerciseId}`, ok)
}

/** Révision d'une carte quelconque (exercice, erreur de partie). */
export function recordCardReview(key: string, ok: boolean) {
  const card = state.cards[key]
  if (!card) return
  const cards = { ...state.cards }
  const next = reviewCard(card, ok, today())
  if (next) cards[key] = next
  else delete cards[key]
  save({ ...state, cards })
}

/**
 * Ligne d'ouverture jouée : la première fois, elle entre en boîte 1 (révision demain) ;
 * ensuite, chaque passage compte comme une révision.
 */
export function recordOpening(lineId: string, ok: boolean) {
  const key = `opening:${lineId}`
  if (state.cards[key]) recordCardReview(key, ok)
  else addCards([failedCard(key, today())])
}

/** Ajoute des cartes (ex. erreurs tirées d'une partie). Les cartes déjà présentes sont gardées telles quelles. */
export function addCards(cards: Card[]) {
  const next = { ...state.cards }
  for (const c of cards) next[c.key] ??= c
  save({ ...state, cards: next })
}

export function recordGame(g: GameRecord) {
  save({ ...state, games: [g, ...state.games].slice(0, 100) })
}

/** Met à jour la dernière partie enregistrée ayant ce PGN (ex. après analyse). */
export function updateGame(pgn: string, patch: Partial<GameRecord>) {
  save({ ...state, games: state.games.map((g) => (g.pgn === pgn ? { ...g, ...patch } : g)) })
}

export function setLichessUser(name: string) {
  save({ ...state, lichessUser: name })
}

// --- Sauvegarde ---

export function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `echecs-sauvegarde-${today()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Remplace la progression par celle du fichier. Renvoie un message d'erreur ou null. */
export function importProgress(json: string): string | null {
  try {
    const data = JSON.parse(json)
    if (data?.version !== 1 || typeof data.lessons !== 'object') return "Ce fichier n'est pas une sauvegarde de l'appli."
    save(normalize(data))
    return null
  } catch {
    return 'Fichier illisible (JSON invalide).'
  }
}

export function resetProgress() {
  state = empty()
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* rien */
  }
  listeners.forEach((l) => l())
}
