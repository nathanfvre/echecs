import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Board, type MoveInput } from '../../components/Board'
import { RichText } from '../../components/RichText'
import { isMoveAccepted } from '../../content/logic'
import type { MoveStep } from '../../content/types'
import { sanToFr } from '../../lib/notation'
import { Button, Panel, SQ_HINT, StepLayout, sideToMove } from './ui'

type Status = 'playing' | 'opponent' | 'wrong' | 'solved' | 'shown'

/** Exercice « joue le bon coup » : retour immédiat, indice, solution, réponse adverse automatique. */
export function MoveExercise({ step, onDone }: { step: MoveStep; onDone: (success: boolean) => void }) {
  const [fen, setFen] = useState(step.fen)
  const [ply, setPly] = useState(0)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [status, setStatus] = useState<Status>('playing')
  const [errors, setErrors] = useState(0)
  const [hint, setHint] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [played, setPlayed] = useState<string[]>([])
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const orientation = step.orientation ?? sideToMove(step.fen)
  const finished = status === 'solved' || status === 'shown'

  /** Joue la réponse adverse prévue (si elle existe) après un court délai. */
  function afterUserMove(g: Chess, nextPly: number, history: string[]) {
    if (nextPly >= step.solution.length) {
      setStatus('solved')
      return
    }
    setStatus('opponent')
    later(() => {
      const mv = g.move(step.solution[nextPly])
      setFen(g.fen())
      setLastMove(mv)
      setPlayed([...history, mv.san])
      setPly(nextPly + 1)
      setStatus(nextPly + 1 >= step.solution.length ? 'solved' : 'playing')
    }, 550)
  }

  function handleMove(m: MoveInput): boolean {
    if (status !== 'playing' && status !== 'wrong') return false
    const g = new Chess(fen)
    let mv
    try {
      mv = g.move(m)
    } catch {
      return false
    }
    if (isMoveAccepted(step, ply, fen, mv.san)) {
      const history = [...played, mv.san]
      setFen(g.fen())
      setLastMove(mv)
      setPlayed(history)
      setPly(ply + 1)
      setHint(false)
      afterUserMove(g, ply + 1, history)
    } else {
      // On montre le coup un instant, puis on le reprend.
      const before = fen
      setFen(g.fen())
      setLastMove(mv)
      setErrors((e) => e + 1)
      setStatus('wrong')
      later(() => {
        setFen(before)
        setLastMove(null)
      }, 700)
    }
    return true
  }

  function showSolution() {
    setStatus('shown')
    setHint(false)
    const g = new Chess(fen)
    const rest = step.solution.slice(ply)
    const history = [...played]
    rest.forEach((san, i) =>
      later(() => {
        const mv = g.move(san)
        history.push(mv.san)
        setFen(g.fen())
        setLastMove(mv)
        setPlayed([...history])
      }, 400 + i * 700),
    )
  }

  // Indice : on entoure la pièce à jouer.
  const hintSquare = (() => {
    if (!hint || ply >= step.solution.length) return null
    try {
      return new Chess(fen).move(step.solution[ply]).from
    } catch {
      return null
    }
  })()

  const success = status === 'solved' && errors === 0 && !hintUsed
  return (
    <StepLayout
      board={
        <Board
          fen={fen}
          orientation={orientation}
          interactive={status === 'playing' || status === 'wrong'}
          onMove={handleMove}
          lastMove={lastMove}
          squareStyles={hintSquare ? { [hintSquare]: SQ_HINT } : {}}
        />
      }
    >
      <Panel>
        <RichText text={step.prompt} className="font-medium" />
        {played.length > 0 && (
          <p className="mt-2 font-mono text-sm text-stone-500">{played.map(sanToFr).join('  ')}</p>
        )}
      </Panel>

      {status === 'wrong' && <Panel tone="error" title="Ce n'est pas le bon coup." text="Regarde encore la position et réessaie." />}
      {status === 'opponent' && <Panel tone="success" title="Bien joué ! L'adversaire répond…" />}
      {hint && <Panel tone="hint" title="Indice" text={step.hint} />}

      {finished && (
        <Panel
          tone={status === 'solved' ? 'success' : 'info'}
          title={status === 'solved' ? (success ? 'Bravo, du premier coup !' : 'Trouvé !') : 'La solution'}
          text={step.explanation}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!finished && (
          <>
            <Button
              onClick={() => {
                setHint(true)
                setHintUsed(true)
              }}
              disabled={hint || status === 'opponent'}
            >
              💡 Indice
            </Button>
            {errors >= 2 && <Button onClick={showSolution}>Voir la solution</Button>}
          </>
        )}
        {finished && (
          <Button variant="primary" onClick={() => onDone(success)}>
            Suivant →
          </Button>
        )}
      </div>
    </StepLayout>
  )
}
