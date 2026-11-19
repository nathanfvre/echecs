import { Link } from 'react-router-dom'
import { MODULES } from '../../content'
import { isExercise } from '../../content/types'
import { useProgress } from '../../lib/progress'
import { isUnlocked } from './unlock'

// Modules prévus mais pas encore écrits (phase e).
// Modules prévus, affichés « bientôt » tant que leur contenu n'existe pas.
const PLANNED: [order: number, title: string][] = [
  [1, 'Module 1 — Valeur des pièces et échanges'],
  [2, 'Module 2 — Mats élémentaires'],
  [3, 'Module 3 — Tactique 1'],
  [4, "Module 4 — Principes d'ouverture"],
  [5, 'Module 5 — Ton répertoire'],
  [6, 'Module 6 — Milieu de partie'],
  [7, 'Module 7 — Finales essentielles'],
  [8, 'Module 8 — Tactique 2'],
  [9, 'Module 9 — Pratique de la partie'],
]
const UPCOMING = PLANNED.filter(([o]) => !MODULES.some((m) => m.order === o)).map(([, t]) => t)

export function CoursePage() {
  const progress = useProgress()
  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">Le cours</h1>
      {MODULES.map((m) => {
        const done = m.lessons.filter((l) => progress.lessons[l.id]?.passed).length
        return (
          <section key={m.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{m.title}</h2>
              <span className="text-sm text-stone-500">
                {done} / {m.lessons.length} leçons
              </span>
            </div>
            <p className="mb-3 text-sm text-stone-500">{m.description}</p>
            <ol className="divide-y divide-stone-100 overflow-hidden rounded-lg bg-white shadow-sm">
              {m.lessons.map((l, i) => {
                const p = progress.lessons[l.id]
                const open = isUnlocked(l.id, progress)
                const n = l.steps.filter(isExercise).length
                const inner = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        p?.passed ? 'bg-accent text-white' : open ? 'bg-stone-200' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {p?.passed ? '✓' : open ? i + 1 : '🔒'}
                    </span>
                    <span className={`flex-1 ${open ? '' : 'text-stone-400'}`}>{l.title}</span>
                    <span className="text-xs text-stone-400">
                      {p ? `meilleur score ${Math.round(p.best * 100)} %` : `${n} exercices`}
                    </span>
                  </div>
                )
                return (
                  <li key={l.id}>
                    {open ? (
                      <Link to={`/cours/${l.id}`} className="block hover:bg-stone-50">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
      {UPCOMING.length > 0 && <section>
        <h2 className="mb-2 text-lg font-semibold text-stone-400">Bientôt</h2>
        <ul className="space-y-1 text-sm text-stone-400">
          {UPCOMING.map((t) => (
            <li key={t}>🔒 {t}</li>
          ))}
        </ul>
      </section>}
    </div>
  )
}
