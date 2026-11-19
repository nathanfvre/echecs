import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { MoveExercise } from '../course/MoveExercise'
import { Panel } from '../course/ui'
import { getProgress, ratingDelta, recordPuzzle, today, useProgress } from '../../lib/progress'
import { isDue } from '../../lib/srs'
import { DIFFICULTIES, pickPuzzle, puzzleToStep, usePuzzles, type Difficulty } from './data'
import { PUZZLE_THEMES, THEME_LABEL, type Puzzle } from './themes'

export function PuzzlePage() {
  const { puzzles, error } = usePuzzles()
  const progress = useProgress()
  // ?theme=fork : arriver directement sur un thème (lien depuis le tableau de bord).
  const [params] = useSearchParams()
  const [theme, setTheme] = useState(() => {
    const t = params.get('theme')
    return t && PUZZLE_THEMES.some((x) => x.key === t) ? t : 'all'
  })
  const [difficulty, setDifficulty] = useState<Difficulty>('auto')
  const [current, setCurrent] = useState<Puzzle | null>(null)
  const [result, setResult] = useState<{ ok: boolean; delta: number } | null>(null)

  const due = Object.values(progress.cards).filter((c) => isDue(c, today())).length

  const next = useCallback(
    (th = theme, d = difficulty) => {
      if (!puzzles) return
      const p = getProgress()
      setResult(null)
      setCurrent(pickPuzzle(puzzles, th, d, p.puzzleRating, new Set(p.puzzlesSeen), current?.id))
    },
    [puzzles, theme, difficulty, current],
  )

  // Premier puzzle dès le chargement.
  if (puzzles && !current) {
    const p = getProgress()
    const first = pickPuzzle(puzzles, theme, difficulty, p.puzzleRating, new Set(p.puzzlesSeen))
    if (first) setCurrent(first)
  }

  const converted = useMemo(() => (current ? puzzleToStep(current) : null), [current])

  const onResult = useCallback(
    (ok: boolean) => {
      if (!current) return
      const p = getProgress()
      const delta = p.puzzlesSeen.includes(current.id) ? 0 : ratingDelta(p.puzzleRating, current.rating, ok)
      setResult({ ok, delta })
      recordPuzzle(current, ok, false)
    },
    [current],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of puzzles ?? []) for (const t of p.themes) c[t] = (c[t] ?? 0) + 1
    return c
  }, [puzzles])

  if (error)
    return (
      <Panel tone="error" title="Puzzles introuvables" text="Le fichier public/puzzles.json manque. Lance `npm run build:puzzles`." />
    )

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Puzzles</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-md bg-white px-3 py-1.5 shadow-sm">
            Ton classement : <strong>{progress.puzzleRating}</strong>
          </span>
          {due > 0 && (
            <Link to="/revisions" className="rounded-md bg-amber-100 px-3 py-1.5 text-amber-900 hover:bg-amber-200">
              ↻ {due} révision{due > 1 ? 's' : ''} à faire
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
          value={theme}
          onChange={(e) => {
            setTheme(e.target.value)
            next(e.target.value, difficulty)
          }}
        >
          <option value="all">Tous les thèmes</option>
          {PUZZLE_THEMES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label} ({counts[t.key] ?? 0})
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as Difficulty)
            next(theme, e.target.value as Difficulty)
          }}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {!puzzles && <p className="text-stone-500">Chargement des puzzles…</p>}

      {current && converted && (
        <MoveExercise
          key={current.id}
          step={converted.step}
          preMove={converted.preMove}
          onResult={onResult}
          onDone={() => next()}
          after={
            <div className="rounded-md bg-white px-4 py-3 text-sm text-stone-600">
              <p>
                Puzzle noté <strong>{current.rating}</strong> · {current.themes.map((t) => THEME_LABEL[t]).join(', ')}
              </p>
              {result && (
                <p className="mt-1">
                  {result.delta !== 0 && (
                    <span className={result.delta > 0 ? 'text-emerald-700' : 'text-red-700'}>
                      Classement {result.delta > 0 ? '+' : ''}
                      {result.delta}.{' '}
                    </span>
                  )}
                  {!result.ok && 'Ce puzzle reviendra dans tes révisions demain.'}
                </p>
              )}
              <a
                href={`https://lichess.org/training/${current.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-accent underline"
              >
                Voir ce puzzle sur Lichess ↗
              </a>
            </div>
          }
        />
      )}
      {puzzles && !current && <Panel text="Aucun puzzle pour ce choix." />}
    </div>
  )
}
