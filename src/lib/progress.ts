// Progression de l'élève, enregistrée dans le navigateur (localStorage).
// Un seul objet JSON, exportable / importable pour faire une sauvegarde.
import { useSyncExternalStore } from 'react'

const KEY = 'echecs-progress-v1'

export type LessonProgress = {
  /** Meilleur taux de réussite (0 à 1). */
  best: number
  passed: boolean
  attempts: number
  last: string
}

export type Progress = {
  version: 1
  lessons: Record<string, LessonProgress>
  /** Exercices ratés, à revoir (utilisé par la répétition espacée en phase c). */
  missed: Record<string, { lessonId: string; date: string }>
  /** Jours d'activité (AAAA-MM-JJ), pour la série de jours. */
  days: string[]
}

const empty = (): Progress => ({ version: 1, lessons: {}, missed: {}, days: [] })

export const today = () => new Date().toLocaleDateString('sv-SE') // format AAAA-MM-JJ, heure locale

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch {
    return empty()
  }
}

let state: Progress = load()
const listeners = new Set<() => void>()

function save(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
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

function withToday(p: Progress): string[] {
  const d = today()
  return p.days.includes(d) ? p.days : [...p.days, d]
}

/** Enregistre la fin d'une leçon. `results` : id d'exercice → réussi du premier coup ? */
export function recordLesson(lessonId: string, results: Record<string, boolean>, passRate: number) {
  const values = Object.values(results)
  const rate = values.length ? values.filter(Boolean).length / values.length : 1
  const prev = state.lessons[lessonId]
  const missed = { ...state.missed }
  for (const [id, ok] of Object.entries(results)) {
    if (ok) delete missed[id]
    else missed[id] = { lessonId, date: today() }
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
    missed,
    days: withToday(state),
  })
  return rate
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
    save({ ...empty(), ...data })
    return null
  } catch {
    return 'Fichier illisible (JSON invalide).'
  }
}

export function resetProgress() {
  save(empty())
}
