import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ALL_LESSONS } from '../../content'
import type { ExerciseStep } from '../../content/types'
import { getProgress, recordCardReview, recordExerciseReview, recordPuzzle, today, useProgress } from '../../lib/progress'
import { sanToFr } from '../../lib/notation'
import { INTERVALS, isDue, type Card } from '../../lib/srs'
import { ExerciseView } from '../course/StepView'
import { MoveExercise } from '../course/MoveExercise'
import { Button, Panel } from '../course/ui'
import { puzzleToStep, usePuzzles } from '../puzzles/data'

const SESSION_MAX = 20

function findExercise(id: string): ExerciseStep | null {
  for (const l of ALL_LESSONS) for (const s of l.steps) if ('id' in s && s.id === id) return s
  return null
}

/** Révisions du jour : les cartes arrivées à échéance, exercices et puzzles mélangés. */
export function ReviewPage() {
  const progress = useProgress()
  const { puzzles } = usePuzzles()
  // La file est figée au début de la séance (sinon une carte ratée réapparaîtrait aussitôt).
  const [queue] = useState<Card[]>(() =>
    Object.values(getProgress().cards)
      .filter((c) => isDue(c, today()))
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, SESSION_MAX),
  )
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)

  const total = Object.values(progress.cards).length
  const card = queue[index]
  const puzzleById = useMemo(() => new Map((puzzles ?? []).map((p) => [p.id, p])), [puzzles])

  function done(ok: boolean) {
    if (!card) return
    const [kind, id] = [card.key.slice(0, card.key.indexOf(':')), card.key.slice(card.key.indexOf(':') + 1)]
    if (kind === 'puzzle') {
      const p = puzzleById.get(id)
      if (p) recordPuzzle(p, ok, true)
    } else if (kind === 'mistake') recordCardReview(card.key, ok)
    else recordExerciseReview(id, ok)
    if (ok) setScore(score + 1)
    setIndex(index + 1)
  }

  if (queue.length === 0)
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Révisions</h1>
        <Panel
          tone="success"
          title="Rien à réviser aujourd'hui !"
          text={
            total
              ? `${total} exercice(s) en attente reviendront les jours suivants.`
              : 'Les exercices et puzzles que tu rates arriveront ici le lendemain.'
          }
        />
        <HowItWorks />
      </div>
    )

  if (index >= queue.length)
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Révisions terminées</h1>
        <Panel
          tone="success"
          title={`${score} / ${queue.length} réussis`}
          text="Les exercices réussis reviendront plus tard, les autres demain."
        />
        <Link to="/puzzles">
          <Button variant="primary">Continuer avec des puzzles →</Button>
        </Link>
      </div>
    )

  let content = null
  const kind = card.key.slice(0, card.key.indexOf(':'))
  const id = card.key.slice(card.key.indexOf(':') + 1)
  if (kind === 'puzzle') {
    const p = puzzleById.get(id)
    if (!puzzles) content = <p className="text-stone-500">Chargement…</p>
    else if (!p) content = <Missing onSkip={() => setIndex(index + 1)} />
    else {
      const { step, preMove } = puzzleToStep(p)
      content = <MoveExercise key={card.key} step={step} preMove={preMove} onDone={done} />
    }
  } else if (kind === 'mistake' && card.mistake) {
    const m = card.mistake
    content = (
      <MoveExercise
        key={card.key}
        step={{
          type: 'move',
          id: card.key,
          fen: m.fen,
          prompt: `Position tirée d'une de tes parties. Tu avais joué **${sanToFr(m.played)}** (une erreur). Trouve mieux !`,
          solution: [m.best],
          accept: m.accept,
          hint: 'Fais la checklist : échecs, captures, menaces — pour toi ET pour l’adversaire.',
          explanation: `Stockfish recommande **${sanToFr(m.best)}**${m.accept.length ? ` (${m.accept.map(sanToFr).join(', ')} étai${m.accept.length > 1 ? 'en' : ''}t aussi bon${m.accept.length > 1 ? 's' : ''})` : ''}.`,
        }}
        onDone={done}
      />
    )
  } else {
    const step = findExercise(id)
    content = step ? <ExerciseView key={card.key} step={step} onDone={done} /> : <Missing onSkip={() => setIndex(index + 1)} />
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Révisions du jour</h1>
        <span className="text-sm text-stone-500">
          {index + 1} / {queue.length} · {kind === 'puzzle' ? 'puzzle' : kind === 'mistake' ? 'erreur de partie' : 'exercice de leçon'} · boîte {card.box}
        </span>
      </div>
      {content}
    </div>
  )
}

function Missing({ onSkip }: { onSkip: () => void }) {
  return (
    <Panel tone="info" title="Cet exercice n'existe plus (le contenu a changé).">
      <Button className="mt-2" onClick={onSkip}>
        Passer
      </Button>
    </Panel>
  )
}

function HowItWorks() {
  return (
    <p className="text-sm text-stone-500">
      Comment ça marche : un exercice raté revient le lendemain (boîte 1). Chaque réussite le fait monter d'une
      boîte et l'espace davantage ({INTERVALS.join(', ')} jours). Une erreur le renvoie en boîte 1. Réussi en boîte{' '}
      {INTERVALS.length}, il est considéré comme acquis.
    </p>
  )
}
