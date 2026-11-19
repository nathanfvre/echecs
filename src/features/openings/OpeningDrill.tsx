import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Board, type MoveInput } from '../../components/Board'
import { RichText } from '../../components/RichText'
import { sanToFr } from '../../lib/notation'
import { Button, Panel, StepLayout } from '../course/ui'
import { nameAlong, type OpeningLine } from './data'

type Status = 'playing' | 'opponent' | 'wrong' | 'done'

/**
 * Rejouer une ligne du répertoire : l'élève joue ses coups, les réponses adverses viennent seules.
 * Après une erreur, une flèche montre le coup du répertoire. Réussi = aucune erreur.
 */
export function OpeningDrill({ line, onDone }: { line: OpeningLine; onDone: (success: boolean) => void }) {
  const [ply, setPly] = useState(0)
  const [fen, setFen] = useState(new Chess().fen())
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [status, setStatus] = useState<Status>(line.side === 'w' ? 'playing' : 'opponent')
  const [errors, setErrors] = useState(0)
  const [showMove, setShowMove] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const myTurn = (p: number) => (p % 2 === 0) === (line.side === 'w')

  /** Joue le coup adverse (s'il y en a un) au demi-coup p. */
  function opponent(g: Chess, p: number) {
    if (p >= line.moves.length) return setStatus('done')
    setStatus('opponent')
    later(() => {
      const mv = g.move(line.moves[p])
      setFen(g.fen())
      setLastMove(mv)
      setPly(p + 1)
      setStatus(p + 1 >= line.moves.length ? 'done' : 'playing')
    }, 450)
  }

  // Les Noirs : les Blancs commencent.
  useEffect(() => {
    if (line.side === 'b') opponent(new Chess(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMove(m: MoveInput): boolean {
    if ((status !== 'playing' && status !== 'wrong') || !myTurn(ply)) return false
    const g = new Chess(fen)
    let mv
    try {
      mv = g.move(m)
    } catch {
      return false
    }
    if (mv.san === line.moves[ply]) {
      setFen(g.fen())
      setLastMove(mv)
      setShowMove(false)
      setPly(ply + 1)
      opponent(g, ply + 1)
    } else {
      const before = fen
      setFen(g.fen())
      setLastMove(mv)
      setErrors((e) => e + 1)
      setStatus('wrong')
      setShowMove(true)
      later(() => {
        setFen(before)
        setLastMove(null)
      }, 700)
    }
    return true
  }

  const expected = (() => {
    if (!showMove || ply >= line.moves.length) return null
    try {
      return new Chess(fen).move(line.moves[ply])
    } catch {
      return null
    }
  })()
  const name = nameAlong(line.moves, ply)
  const played = line.moves.slice(0, ply)
  const success = status === 'done' && errors === 0

  return (
    <StepLayout
      board={
        <Board
          fen={fen}
          orientation={line.side === 'w' ? 'white' : 'black'}
          interactive={status === 'playing' || status === 'wrong'}
          onMove={handleMove}
          lastMove={lastMove}
          arrows={expected ? [{ from: expected.from, to: expected.to, color: 'rgba(245, 158, 11, 0.85)' }] : []}
        />
      }
    >
      <Panel>
        <p className="font-medium">{line.title}</p>
        <p className="text-sm text-stone-500">
          {line.side === 'w' ? 'Tu as les Blancs' : 'Tu as les Noirs'} · joue les coups de ton répertoire.
        </p>
        {name && (
          <p className="mt-1 text-xs text-stone-500">
            <span className="font-mono font-semibold">{name.eco}</span> {name.name}
          </p>
        )}
        {played.length > 0 && (
          <p className="mt-2 font-mono text-sm text-stone-600">
            {played.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${sanToFr(san)}` : sanToFr(san))).join(' ')}
          </p>
        )}
      </Panel>
      {status === 'wrong' && (
        <Panel tone="error" title="Ce n'est pas le coup du répertoire." text={expected ? `La flèche montre le bon coup : **${sanToFr(line.moves[ply])}**.` : undefined} />
      )}
      {status === 'done' && (
        <Panel tone={success ? 'success' : 'info'} title={success ? 'Ligne jouée sans faute !' : `Ligne terminée (${errors} erreur${errors > 1 ? 's' : ''}).`} text={line.note} />
      )}
      {status === 'done' && (
        <div>
          <Button variant="primary" onClick={() => onDone(success)}>
            Suivant →
          </Button>
        </div>
      )}
    </StepLayout>
  )
}

/** Voir une ligne coup par coup, avec son idée. */
export function OpeningViewer({ line }: { line: OpeningLine }) {
  const [ply, setPly] = useState(0)
  const g = new Chess()
  let last = null
  for (const san of line.moves.slice(0, ply)) last = g.move(san)
  const name = nameAlong(line.moves, ply)
  return (
    <StepLayout
      board={<Board fen={g.fen()} orientation={line.side === 'w' ? 'white' : 'black'} interactive={false} lastMove={last} />}
    >
      <Panel>
        <p className="font-medium">{line.title}</p>
        {name && (
          <p className="mt-1 text-xs text-stone-500">
            <span className="font-mono font-semibold">{name.eco}</span> {name.name}
          </p>
        )}
        <p className="mt-2 font-mono text-sm text-stone-600">
          {line.moves.map((san, i) => (
            <button
              key={i}
              onClick={() => setPly(i + 1)}
              className={`mr-1 rounded px-0.5 ${i + 1 === ply ? 'bg-accent text-white' : 'hover:bg-stone-100'}`}
            >
              {i % 2 === 0 ? `${i / 2 + 1}.` : ''}
              {sanToFr(san)}
            </button>
          ))}
        </p>
      </Panel>
      <Panel text={line.note} />
      <div className="flex gap-2">
        <Button onClick={() => setPly(0)} disabled={ply === 0}>
          ⏮
        </Button>
        <Button onClick={() => setPly(ply - 1)} disabled={ply === 0}>
          ← Précédent
        </Button>
        <Button variant="primary" onClick={() => setPly(ply + 1)} disabled={ply >= line.moves.length}>
          Suivant →
        </Button>
      </div>
      <RichText className="text-xs text-stone-400" text="Noms et codes ECO : base ouverte lichess-org/chess-openings (CC0)." />
    </StepLayout>
  )
}
