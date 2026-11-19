import { useEffect, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Board, type MoveInput } from '../../components/Board'
import { RichText } from '../../components/RichText'
import type { PracticeStep } from '../../content/types'
import { toCp } from '../../engine/engine'
import { useEngine } from '../../engine/useEngine'
import { sanToFr } from '../../lib/notation'
import { Button, Panel, StepLayout, sideToMove } from './ui'

type Status = 'playing' | 'thinking' | 'checking' | 'won' | 'lost'

const GOAL_LABEL: Record<PracticeStep['goal'], (n: number) => string> = {
  mate: (n) => `Objectif : mater en ${n} coups maximum.`,
  promote: (n) => `Objectif : promouvoir un pion (sans qu'il soit pris aussitôt), en ${n} coups maximum.`,
  hold: (n) => `Objectif : tenir ${n} coups sans perdre.`,
}

/**
 * Finale à jouer contre Stockfish (pleine force).
 * Réussi = objectif atteint au premier essai, sans indice. Après 2 essais ratés, on peut passer.
 */
export function PracticeExercise({ step, onDone }: { step: PracticeStep; onDone: (success: boolean) => void }) {
  const engine = useEngine()
  const [fen, setFen] = useState(step.fen)
  const [moves, setMoves] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [status, setStatus] = useState<Status>('playing')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const run = useRef(0) // identifiant de l'essai en cours (ignore les réponses du moteur d'un essai abandonné)

  const userColor = step.fen.split(' ')[1] as 'w' | 'b'
  const orientation = step.orientation ?? sideToMove(step.fen)
  const userMoves = Math.ceil(moves.length / 2)

  // En quittant l'exercice, on ignore la réponse du moteur encore en cours.
  useEffect(() => () => void (run.current += 1), [])

  function fail(text: string) {
    setStatus('lost')
    setMessage(text)
    setAttempts((a) => a + 1)
  }

  function win(text: string) {
    setStatus('won')
    setMessage(text)
  }

  /** Après le coup de l'élève : objectif atteint ? Sinon, Stockfish répond. */
  async function afterUserMove(g: Chess, history: string[], promoted: Square | null) {
    const id = run.current
    const done = Math.ceil(history.length / 2)
    if (g.isCheckmate()) return win('Échec et mat !')
    if (g.isDraw()) {
      if (step.goal === 'hold') return win('Partie nulle : tu as tenu !')
      return fail(g.isStalemate() ? 'Pat ! Le roi adverse ne peut plus bouger sans être en échec : c’est nulle.' : 'La partie est nulle.')
    }
    if (step.goal === 'promote' && promoted) {
      const canTake = g.moves({ verbose: true }).some((m) => m.to === promoted)
      return canTake ? fail('Ta nouvelle pièce peut être prise tout de suite.') : win('Promotion réussie, et ta pièce est en sécurité !')
    }
    if (step.goal !== 'hold' && done >= step.maxMoves) return fail(`Les ${step.maxMoves} coups sont écoulés.`)
    if (step.goal === 'hold' && done >= step.maxMoves) {
      setStatus('checking')
      const [line] = await engine().analyse(g.fen(), { depth: 14 })
      if (id !== run.current) return
      // L'évaluation est du point de vue de l'adversaire (c'est à lui de jouer).
      const mine = line ? -toCp(line) : 0
      return mine >= -150 ? win('Tu as tenu : la position est nulle.') : fail('Tu n’as pas perdu encore, mais la position est perdue.')
    }

    setStatus('thinking')
    const [line] = await engine().analyse(g.fen(), { depth: 12 })
    if (id !== run.current) return
    const uci = line?.pv[0]
    if (!uci) return fail('Le moteur n’a pas trouvé de coup.')
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    const next = [...history, mv.san]
    setFen(g.fen())
    setLastMove(mv)
    setMoves(next)
    if (g.isCheckmate()) return fail('Tu es maté.')
    if (g.isDraw()) return step.goal === 'hold' ? win('Partie nulle : tu as tenu !') : fail('La partie est nulle.')
    if (step.goal === 'promote' && mv.captured === 'p' && !g.board().flat().some((p) => p?.type === 'p' && p.color === userColor))
      return fail('Tu n’as plus de pion.')
    setStatus('playing')
  }

  function handleMove(m: MoveInput): boolean {
    if (status !== 'playing') return false
    const g = new Chess(fen)
    let mv
    try {
      mv = g.move(m)
    } catch {
      return false
    }
    const history = [...moves, mv.san]
    setFen(g.fen())
    setLastMove(mv)
    setMoves(history)
    setHint(false)
    afterUserMove(g, history, mv.promotion ? (mv.to as Square) : null)
    return true
  }

  function restart() {
    // Abandonner un essai en cours compte comme un essai raté.
    if (status !== 'lost') setAttempts((a) => a + 1)
    run.current += 1
    setFen(step.fen)
    setMoves([])
    setLastMove(null)
    setMessage('')
    setStatus('playing')
  }

  const success = status === 'won' && attempts === 0 && !hintUsed
  return (
    <StepLayout
      board={<Board fen={fen} orientation={orientation} interactive={status === 'playing'} onMove={handleMove} lastMove={lastMove} />}
    >
      <Panel>
        <RichText text={step.prompt} className="font-medium" />
        <p className="mt-2 text-sm text-stone-500">
          {GOAL_LABEL[step.goal](step.maxMoves)} Tu joues contre Stockfish. Coups joués : {userMoves}
        </p>
        {moves.length > 0 && <p className="mt-2 font-mono text-sm text-stone-500">{moves.map(sanToFr).join('  ')}</p>}
      </Panel>

      {status === 'thinking' && <Panel title="L'adversaire réfléchit…" />}
      {status === 'checking' && <Panel title="Vérification de la position…" />}
      {hint && <Panel tone="hint" title="Indice" text={step.hint} />}
      {status === 'lost' && <Panel tone="error" title="Raté !" text={`${message} Recommence.`} />}
      {status === 'won' && (
        <Panel tone="success" title={success ? `${message} Du premier coup !` : message} text={step.explanation} />
      )}

      <div className="flex flex-wrap gap-2">
        {status !== 'won' && (
          <>
            <Button onClick={restart} disabled={moves.length === 0}>
              ↺ Recommencer
            </Button>
            <Button
              onClick={() => {
                setHint(true)
                setHintUsed(true)
              }}
              disabled={hint}
            >
              💡 Indice
            </Button>
            {attempts >= 2 && <Button onClick={() => onDone(false)}>Passer</Button>}
          </>
        )}
        {status === 'won' && (
          <Button variant="primary" onClick={() => onDone(success)}>
            Suivant →
          </Button>
        )}
      </div>
    </StepLayout>
  )
}
