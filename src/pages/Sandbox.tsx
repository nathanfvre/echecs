import { useMemo, useState } from 'react'
import { Board, type MoveInput } from '../components/Board'
import { MoveList } from '../components/MoveList'
import { START_FEN, checkFen, gameStatus, replay } from '../lib/chess'

/**
 * Échiquier libre : on joue les deux camps, on annule, on retourne l'échiquier,
 * on charge une position FEN. Sert de terrain d'essai pour l'échiquier interactif.
 */
export function Sandbox() {
  const [startFen, setStartFen] = useState(START_FEN)
  const [moves, setMoves] = useState<string[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState<string | null>(null)

  const game = useMemo(() => replay(startFen, moves), [startFen, moves])
  const history = game.history({ verbose: true })
  const last = history[history.length - 1]
  const status = gameStatus(game)

  function handleMove(m: MoveInput) {
    try {
      const copy = replay(startFen, moves)
      const played = copy.move(m)
      setMoves([...moves, played.san])
      return true
    } catch {
      return false
    }
  }

  function loadFen() {
    const err = checkFen(fenInput)
    setFenError(err)
    if (err) return
    setStartFen(fenInput.trim())
    setMoves([])
  }

  const startGame = replay(startFen, [])

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full max-w-[560px] shrink-0 lg:w-[55%]">
        <Board fen={game.fen()} orientation={orientation} onMove={handleMove} lastMove={last} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className={`rounded-md px-3 py-2 font-medium ${status.over ? 'bg-amber-100 text-amber-900' : 'bg-white'}`}>
          {status.text}
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setMoves(moves.slice(0, -1))} disabled={moves.length === 0}>
            ↶ Annuler le coup
          </Btn>
          <Btn onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}>⇅ Retourner</Btn>
          <Btn onClick={() => { setStartFen(START_FEN); setMoves([]) }}>Nouvelle partie</Btn>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md bg-white p-3">
          <MoveList
            moves={moves}
            startMoveNumber={startGame.moveNumber()}
            startsWithBlack={startGame.turn() === 'b'}
          />
        </div>

        <details className="rounded-md bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium">Position FEN</summary>
          <p className="mt-2 text-stone-500">
            La FEN est une ligne de texte qui décrit une position. Tu peux en coller une pour l'étudier.
          </p>
          <code className="mt-2 block break-all rounded bg-stone-100 p-2 text-xs">{game.fen()}</code>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-xs"
              placeholder="Coller une FEN…"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
            />
            <Btn onClick={loadFen}>Charger</Btn>
          </div>
          {fenError && <p className="mt-1 text-red-600">{fenError}</p>}
        </details>
      </div>
    </div>
  )
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-40"
    />
  )
}
