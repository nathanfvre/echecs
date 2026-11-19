import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Board } from '../../components/Board'
import { JUDGEMENTS, judgeGame, winChance, type AnalysedMove, type ParsedGame } from '../../engine/analysis'
import { toCp, type EngineLine } from '../../engine/engine'
import { useEngine } from '../../engine/useEngine'
import { addCards, today, updateGame } from '../../lib/progress'
import { sanToFr } from '../../lib/notation'
import { failedCard, type Card } from '../../lib/srs'
import { Button, Panel } from '../course/ui'

const DEPTH = 12

/** Analyse complète d'une partie avec Stockfish, puis affichage coup par coup. */
export function AnalysisView({ game, userColor: initialColor }: { game: ParsedGame; userColor: 'w' | 'b' }) {
  const engine = useEngine()
  const [evals, setEvals] = useState<EngineLine[]>([])
  const [moves, setMoves] = useState<AnalysedMove[] | null>(null)
  const [ply, setPly] = useState(0)
  const [showBest, setShowBest] = useState(false)
  const [userColor, setUserColor] = useState(initialColor)
  const [saved, setSaved] = useState<number | null>(null)

  const fens = useMemo(() => {
    const g = new Chess(game.startFen)
    return [g.fen(), ...game.sans.map((s) => (g.move(s), g.fen()))]
  }, [game])

  // Analyse de chaque position, l'une après l'autre (progression visible).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const results: EngineLine[] = []
      for (const fen of fens) {
        const g = new Chess(fen)
        if (g.isGameOver() && g.moves().length === 0) break // mat ou pat : rien à analyser
        const [line] = await engine().analyse(fen, { depth: DEPTH })
        if (cancelled) return
        results.push(line)
        setEvals([...results])
      }
      if (cancelled) return
      const judged = judgeGame(game.startFen, game.sans, results)
      setMoves(judged)
      const mine = judged.filter((m) => m.color === userColor)
      updateGame(game.pgn, {
        blunders: mine.filter((m) => m.judgement === 'gaffe').length,
        mistakes: mine.filter((m) => m.judgement === 'erreur').length,
      })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fens])

  // Navigation au clavier : ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setPly((p) => Math.min(game.sans.length, p + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game.sans.length])
  useEffect(() => setShowBest(false), [ply])

  if (!moves) {
    const pct = Math.round((evals.length / fens.length) * 100)
    return (
      <div className="max-w-xl space-y-3">
        <p>Stockfish analyse la partie… {pct} %</p>
        <div className="h-2 overflow-hidden rounded bg-stone-200">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-stone-500">Environ 1 seconde par coup. Tu peux attendre ici.</p>
      </div>
    )
  }

  const current = ply > 0 ? moves[ply - 1] : null
  const boardFen = showBest && current ? current.fenBefore : fens[ply]
  const bestArrow = (() => {
    if (!showBest || !current?.bestSan) return []
    const m = new Chess(current.fenBefore).move(current.bestSan)
    return [{ from: m.from, to: m.to, color: 'rgba(16, 185, 129, 0.85)' }]
  })()
  const lastMove = !showBest && ply > 0 ? new Chess(fens[ply - 1]).move(game.sans[ply - 1]) : null

  const mine = moves.filter((m) => m.color === userColor)
  const count = (side: AnalysedMove[], j: string) => side.filter((m) => m.judgement === j).length
  const myErrors = mine.filter((m) => m.judgement === 'gaffe' || m.judgement === 'erreur')

  async function addToReviews() {
    // Pour chaque erreur, on cherche aussi les autres bons coups (pour ne pas refuser un coup aussi bon).
    const cards: Card[] = []
    for (const m of myErrors) {
      if (!m.bestSan) continue
      const lines = await engine().analyse(m.fenBefore, { depth: DEPTH, multipv: 3 })
      const best = toCp(lines[0])
      const accept = lines
        .filter((l, i) => i > 0 && winChance(best) - winChance(toCp(l)) < 3)
        .map((l) => new Chess(m.fenBefore).move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] }).san)
      const key = `mistake:${m.fenBefore.split(' ').slice(0, 4).join(' ')}`
      cards.push({ ...failedCard(key, today()), mistake: { fen: m.fenBefore, played: m.san, best: m.bestSan, accept } })
    }
    addCards(cards)
    setSaved(cards.length)
  }

  return (
    <div className="space-y-4">
      <EvalGraph moves={moves} ply={ply} onSelect={setPly} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full max-w-[520px] shrink-0 lg:w-[55%]">
          <Board
            fen={boardFen}
            interactive={false}
            orientation={userColor === 'w' ? 'white' : 'black'}
            lastMove={lastMove}
            arrows={bestArrow}
          />
          <div className="mt-2 flex justify-center gap-1">
            {[
              ['⏮', 0],
              ['◀', Math.max(0, ply - 1)],
              ['▶', Math.min(game.sans.length, ply + 1)],
              ['⏭', game.sans.length],
            ].map(([label, target]) => (
              <Button key={label as string} onClick={() => setPly(target as number)}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">Je jouais :</span>
            {(['w', 'b'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setUserColor(c)}
                className={`rounded px-2 py-1 ${userColor === c ? 'bg-accent text-white' : 'bg-white'}`}
              >
                {c === 'w' ? 'les Blancs' : 'les Noirs'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {(['gaffe', 'erreur', 'imprecision'] as const).map((j) => (
              <div key={j} className="rounded-md bg-white px-2 py-2">
                <div className="text-xl font-semibold" style={{ color: JUDGEMENTS[j].color }}>
                  {count(mine, j)}
                </div>
                <div className="text-stone-500">{JUDGEMENTS[j].label}s</div>
              </div>
            ))}
          </div>

          <MoveComment move={current} showBest={showBest} setShowBest={setShowBest} />

          <AnnotatedMoveList moves={moves} ply={ply} onSelect={setPly} userColor={userColor} />

          {myErrors.length > 0 &&
            (saved === null ? (
              <Button variant="primary" onClick={addToReviews}>
                ↻ Ajouter mes {myErrors.length} gaffe(s) et erreur(s) aux révisions
              </Button>
            ) : (
              <Panel tone="success" text={`${saved} position(s) ajoutée(s) : elles reviendront demain dans tes révisions.`} />
            ))}
        </div>
      </div>
    </div>
  )
}

function fmtEval(cp: number): string {
  if (Math.abs(cp) >= 9000) return cp > 0 ? 'Mat pour les Blancs' : 'Mat pour les Noirs'
  return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1)
}

function MoveComment({ move, showBest, setShowBest }: { move: AnalysedMove | null; showBest: boolean; setShowBest: (b: boolean) => void }) {
  if (!move) return <Panel text="Position de départ. Clique sur un coup, ou utilise les flèches ← → du clavier." />
  const n = Math.ceil(move.ply / 2)
  const label = `${n}${move.color === 'w' ? '.' : '...'} ${sanToFr(move.san)}`
  const j = move.judgement ? JUDGEMENTS[move.judgement] : null
  return (
    <div className="rounded-md bg-white px-4 py-3">
      <p className="font-semibold">
        {label}
        {j && <span style={{ color: j.color }}> {j.symbol} {j.label}</span>}
        <span className="ml-2 font-normal text-stone-500">({fmtEval(move.evalWhite)})</span>
      </p>
      {j && move.bestSan && (
        <>
          <p className="mt-1 text-sm">
            Ce coup fait perdre {Math.round(move.loss)} % de chances de gain. Meilleur coup : <strong>{sanToFr(move.bestSan)}</strong>
            <span className="text-stone-500"> (suite : {move.bestLine.map(sanToFr).join(' ')})</span>
          </p>
          <Button className="mt-2" onClick={() => setShowBest(!showBest)}>
            {showBest ? 'Revenir au coup joué' : '👁 Montrer le meilleur coup sur l’échiquier'}
          </Button>
        </>
      )}
      {!j && <p className="mt-1 text-sm text-stone-500">Rien à signaler.</p>}
    </div>
  )
}

function AnnotatedMoveList({ moves, ply, onSelect, userColor }: { moves: AnalysedMove[]; ply: number; onSelect: (p: number) => void; userColor: 'w' | 'b' }) {
  const rows: AnalysedMove[][] = []
  const offset = moves[0]?.color === 'b' ? 1 : 0
  const padded: (AnalysedMove | null)[] = [...Array(offset).fill(null), ...moves]
  for (let i = 0; i < padded.length; i += 2) rows.push(padded.slice(i, i + 2) as AnalysedMove[])
  const cell = (m: AnalysedMove | null) => {
    if (!m) return <span />
    const j = m.judgement ? JUDGEMENTS[m.judgement] : null
    return (
      <button
        onClick={() => onSelect(m.ply)}
        className={`rounded px-1 text-left ${m.ply === ply ? 'bg-accent text-white' : 'hover:bg-stone-100'} ${m.color === userColor ? '' : 'opacity-70'}`}
      >
        {sanToFr(m.san)}
        {j && <span style={{ color: m.ply === ply ? undefined : j.color }}>{j.symbol}</span>}
      </button>
    )
  }
  return (
    <div className="max-h-64 overflow-y-auto rounded-md bg-white p-3 font-mono text-sm">
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="contents">
            <span className="text-stone-400">{i + 1}.</span>
            {cell(r[0])}
            {cell(r[1] ?? null)}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Courbe des chances de gain des Blancs au fil de la partie ; points colorés sur les fautes. */
function EvalGraph({ moves, ply, onSelect }: { moves: AnalysedMove[]; ply: number; onSelect: (p: number) => void }) {
  const W = 600
  const H = 90
  const pts = [50, ...moves.map((m) => winChance(m.evalWhite))]
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W
  const y = (w: number) => H - (w / 100) * H
  const path = pts.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w).toFixed(1)}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-24 w-full cursor-pointer rounded-md bg-stone-800"
      preserveAspectRatio="none"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onSelect(Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)))
      }}
    >
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="#f5f5f4" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#a8a29e" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={x(ply)} x2={x(ply)} y1={0} y2={H} stroke="#2f6f4e" strokeWidth={2} />
      {moves.map((m) =>
        m.judgement ? <circle key={m.ply} cx={x(m.ply)} cy={y(winChance(m.evalWhite))} r={3.5} fill={JUDGEMENTS[m.judgement].color} /> : null,
      )}
    </svg>
  )
}
