import { isExercise, type ExerciseStep, type Step } from '../../content/types'
import { ChoiceExercise } from './ChoiceExercise'
import { DemoView } from './DemoView'
import { MoveExercise } from './MoveExercise'
import { SquaresExercise } from './SquaresExercise'

/** Affiche une étape de leçon (démo ou exercice). */
export function StepView({ step, onNext }: { step: Step; onNext: (r?: { id: string; ok: boolean }) => void }) {
  if (!isExercise(step)) return <DemoView step={step} onNext={() => onNext()} />
  return <ExerciseView step={step} onDone={(ok) => onNext({ id: step.id, ok })} />
}

export function ExerciseView({ step, onDone }: { step: ExerciseStep; onDone: (ok: boolean) => void }) {
  switch (step.type) {
    case 'move':
      return <MoveExercise step={step} onDone={onDone} />
    case 'squares':
      return <SquaresExercise step={step} onDone={onDone} />
    case 'choice':
      return <ChoiceExercise step={step} onDone={onDone} />
  }
}
