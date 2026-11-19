import { useState } from 'react'
import { Board } from '../../components/Board'
import { RichText } from '../../components/RichText'
import type { ChoiceStep } from '../../content/types'
import { Button, Panel, StepLayout } from './ui'

/** Question à choix, éventuellement accompagnée d'une position. */
export function ChoiceExercise({ step, onDone }: { step: ChoiceStep; onDone: (success: boolean) => void }) {
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [hint, setHint] = useState(false)

  function pick(i: number) {
    if (solved || wrong.includes(i)) return
    if (i === step.answer) setSolved(true)
    else setWrong([...wrong, i])
  }

  const content = (
    <>
      <Panel>
        <RichText text={step.prompt} className="font-medium" />
      </Panel>
      <div className="flex flex-col gap-2">
        {step.options.map((opt, i) => {
          const state = solved && i === step.answer ? 'good' : wrong.includes(i) ? 'bad' : 'idle'
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              className={`rounded-md border px-4 py-2 text-left transition ${
                state === 'good'
                  ? 'border-emerald-400 bg-emerald-50'
                  : state === 'bad'
                    ? 'border-red-300 bg-red-50 text-red-800 line-through'
                    : 'border-stone-300 bg-white hover:bg-stone-50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {hint && step.hint && <Panel tone="hint" title="Indice" text={step.hint} />}
      {!solved && wrong.length > 0 && <Panel tone="error" title="Non. Essaie une autre réponse." />}
      {solved && <Panel tone="success" title={wrong.length || hint ? 'Correct !' : 'Bravo !'} text={step.explanation} />}
      <div className="flex gap-2">
        {!solved && step.hint && (
          <Button onClick={() => setHint(true)} disabled={hint}>
            💡 Indice
          </Button>
        )}
        {solved && (
          <Button variant="primary" onClick={() => onDone(wrong.length === 0 && !hint)}>
            Suivant →
          </Button>
        )}
      </div>
    </>
  )

  if (!step.fen) return <div className="flex max-w-xl flex-col gap-3">{content}</div>
  return (
    <StepLayout board={<Board fen={step.fen} interactive={false} orientation={step.orientation ?? 'white'} />}>
      {content}
    </StepLayout>
  )
}
