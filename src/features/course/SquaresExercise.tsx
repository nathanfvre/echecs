import { useMemo, useState, type CSSProperties } from 'react'
import { Board } from '../../components/Board'
import { RichText } from '../../components/RichText'
import { squaresAnswer } from '../../content/logic'
import type { SquaresStep } from '../../content/types'
import { Button, Panel, SQ_BAD, SQ_GOOD, SQ_HINT, SQ_MISSED, SQ_PICKED, StepLayout } from './ui'

/** Exercice « clique sur les cases ». Une seule case attendue : validation immédiate. */
export function SquaresExercise({ step, onDone }: { step: SquaresStep; onDone: (success: boolean) => void }) {
  const expected = useMemo(() => squaresAnswer(step), [step])
  const single = expected.length === 1
  const [picked, setPicked] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hint, setHint] = useState(false)

  const correct = checked && sameSet(picked, expected)

  function validate(sel: string[]) {
    setChecked(true)
    if (!sameSet(sel, expected)) setFailed(true)
  }

  function click(square: string) {
    if (correct) return
    if (checked) {
      // Après une erreur, un nouveau clic recommence la sélection.
      setChecked(false)
      setPicked([square])
      if (single) validate([square])
      return
    }
    if (single) {
      setPicked([square])
      validate([square])
      return
    }
    setPicked((p) => (p.includes(square) ? p.filter((s) => s !== square) : [...p, square]))
  }

  const styles: Record<string, CSSProperties> = {}
  if (hint && step.from) styles[step.from] = SQ_HINT
  if (!checked) picked.forEach((s) => (styles[s] = SQ_PICKED))
  else {
    picked.forEach((s) => (styles[s] = expected.includes(s) ? SQ_GOOD : SQ_BAD))
    if (correct || failed) expected.filter((s) => !picked.includes(s)).forEach((s) => (styles[s] = correct ? SQ_GOOD : SQ_MISSED))
  }

  return (
    <StepLayout
      board={<Board fen={step.fen} interactive={false} orientation={step.orientation ?? 'white'} squareStyles={styles} onSquareClick={click} />}
    >
      <Panel>
        <RichText text={step.prompt} className="font-medium" />
        {!single && !correct && (
          <p className="mt-2 text-sm text-stone-500">Clique sur les cases (re-clique pour retirer), puis valide.</p>
        )}
      </Panel>

      {hint && <Panel tone="hint" title="Indice" text={step.hint} />}
      {checked && !correct && (
        <Panel tone="error" title="Pas tout à fait.">
          <p className="text-sm">
            En <span className="rounded bg-red-400/60 px-1">rouge</span> les cases en trop
            {!single && (
              <>
                , en <span className="rounded bg-amber-400/70 px-1">orange</span> celles qui manquent
              </>
            )}
            . Clique pour réessayer.
          </p>
        </Panel>
      )}
      {correct && <Panel tone="success" title={failed ? 'Correct !' : 'Bravo, du premier coup !'} text={step.explanation} />}

      <div className="flex flex-wrap gap-2">
        {!correct && (
          <>
            {!single && (
              <Button variant="primary" onClick={() => validate(picked)} disabled={picked.length === 0 || checked}>
                Valider
              </Button>
            )}
            <Button onClick={() => { setHint(true); setFailed(true) }} disabled={hint}>
              💡 Indice
            </Button>
          </>
        )}
        {correct && (
          <Button variant="primary" onClick={() => onDone(!failed)}>
            Suivant →
          </Button>
        )}
      </div>
    </StepLayout>
  )
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x))
}
