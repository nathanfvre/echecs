import { useMemo, useState } from 'react'
import { Board } from '../../components/Board'
import { replay } from '../../lib/chess'
import { sanToFr } from '../../lib/notation'
import type { DemoStep } from '../../content/types'
import { Button, Panel, SQ_DEMO, StepLayout } from './ui'

/** Position commentée : flèches, cases en couleur, et coups à rejouer pas à pas. */
export function DemoView({ step, onNext }: { step: DemoStep; onNext: () => void }) {
  const [played, setPlayed] = useState(0)
  const moves = step.moves ?? []
  const game = useMemo(() => replay(step.fen, moves.slice(0, played)), [step.fen, moves, played])
  const last = game.history({ verbose: true }).at(-1)

  const styles = Object.fromEntries((step.highlight ?? []).map((s) => [s, SQ_DEMO]))

  return (
    <StepLayout
      board={
        <Board
          fen={game.fen()}
          interactive={false}
          orientation={step.orientation ?? 'white'}
          arrows={played === 0 ? (step.arrows ?? []).map(([from, to]) => ({ from, to })) : []}
          squareStyles={played === 0 ? styles : {}}
          lastMove={last}
        />
      }
    >
      <Panel text={step.text} />
      {moves.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setPlayed(Math.min(played + 1, moves.length))} disabled={played >= moves.length}>
            ▶ Jouer {played < moves.length ? sanToFr(moves[played]) : ''}
          </Button>
          <Button onClick={() => setPlayed(0)} disabled={played === 0}>
            ↺ Revoir
          </Button>
        </div>
      )}
      <div>
        <Button variant="primary" onClick={onNext}>
          Suivant →
        </Button>
      </div>
    </StepLayout>
  )
}
