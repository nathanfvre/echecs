import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichText } from '../../components/RichText'
import { ALL_LESSONS, findLesson } from '../../content'
import { PASS_RATE, isExercise, type Lesson, type Step } from '../../content/types'
import { recordLesson, useProgress } from '../../lib/progress'
import { ChoiceExercise } from './ChoiceExercise'
import { DemoView } from './DemoView'
import { MoveExercise } from './MoveExercise'
import { SquaresExercise } from './SquaresExercise'
import { Button, Panel } from './ui'
import { isUnlocked } from './unlock'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const found = findLesson(lessonId)
  const progress = useProgress()
  if (!found) return <Panel tone="error" title="Leçon introuvable." />
  if (!isUnlocked(lessonId, progress))
    return (
      <Panel tone="info" title="Leçon verrouillée" text="Réussis d'abord la leçon précédente (80 % des exercices).">
        <Link to="/cours" className="mt-2 inline-block text-accent underline">
          Retour au cours
        </Link>
      </Panel>
    )
  // `key` : repartir de zéro quand on change de leçon.
  return <LessonPlayer key={lessonId} lesson={found.lesson} moduleTitle={found.module.title} />
}

function LessonPlayer({ lesson, moduleTitle }: { lesson: Lesson; moduleTitle: string }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(-1) // -1 = écran d'introduction
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [rate, setRate] = useState<number | null>(null)
  const [round, setRound] = useState(0) // pour remettre les exercices à zéro en cas de reprise

  const total = lesson.steps.length
  const exerciseCount = lesson.steps.filter(isExercise).length
  const nextLesson = ALL_LESSONS[ALL_LESSONS.findIndex((l) => l.id === lesson.id) + 1]

  function next(stepResult?: { id: string; ok: boolean }) {
    const newResults = stepResult ? { ...results, [stepResult.id]: stepResult.ok } : results
    setResults(newResults)
    if (index + 1 < total) setIndex(index + 1)
    else setRate(recordLesson(lesson.id, newResults, PASS_RATE))
  }

  function restart() {
    setResults({})
    setRate(null)
    setIndex(0)
    setRound(round + 1)
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <Link to="/cours" className="text-sm text-stone-500 hover:underline">
            ← {moduleTitle}
          </Link>
          <h1 className="text-xl font-semibold">{lesson.title}</h1>
        </div>
        {index >= 0 && rate === null && (
          <span className="text-sm text-stone-500">
            {index + 1} / {total}
          </span>
        )}
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded bg-stone-200">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${rate !== null ? 100 : (Math.max(index, 0) / total) * 100}%` }}
        />
      </div>

      {index === -1 && (
        <div className="max-w-xl space-y-4">
          <Panel>
            <RichText text={lesson.intro} />
          </Panel>
          <p className="text-sm text-stone-500">
            {exerciseCount} exercices — il faut en réussir {Math.ceil(exerciseCount * PASS_RATE)} du premier coup (sans
            indice) pour valider la leçon.
          </p>
          <Button variant="primary" onClick={() => setIndex(0)}>
            Commencer
          </Button>
        </div>
      )}

      {index >= 0 && rate === null && (
        <StepView key={`${round}-${index}`} step={lesson.steps[index]} onNext={next} />
      )}

      {rate !== null && (
        <div className="max-w-xl space-y-4">
          {rate >= PASS_RATE ? (
            <Panel tone="success" title={`Leçon réussie : ${Math.round(rate * 100)} %`} text="Tu peux passer à la suite." />
          ) : (
            <Panel
              tone="error"
              title={`${Math.round(rate * 100)} % — il faut 80 %`}
              text="Pas grave : recommence la leçon, les positions seront plus familières. Les exercices ratés reviendront aussi dans tes révisions."
            />
          )}
          <div className="flex flex-wrap gap-2">
            {rate >= PASS_RATE && nextLesson && (
              <Button variant="primary" onClick={() => navigate(`/cours/${nextLesson.id}`)}>
                Leçon suivante →
              </Button>
            )}
            <Button variant={rate >= PASS_RATE ? 'secondary' : 'primary'} onClick={restart}>
              Recommencer
            </Button>
            <Button onClick={() => navigate('/cours')}>Retour au cours</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StepView({ step, onNext }: { step: Step; onNext: (r?: { id: string; ok: boolean }) => void }) {
  if (!isExercise(step)) return <DemoView step={step} onNext={() => onNext()} />
  const done = (ok: boolean) => onNext({ id: step.id, ok })
  switch (step.type) {
    case 'move':
      return <MoveExercise step={step} onDone={done} />
    case 'squares':
      return <SquaresExercise step={step} onDone={done} />
    case 'choice':
      return <ChoiceExercise step={step} onDone={done} />
  }
}
