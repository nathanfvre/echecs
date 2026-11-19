import { Component, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { kingSquare } from '../lib/chess'

export type MoveInput = { from: string; to: string; promotion?: PieceSymbol }
export type BoardArrow = { from: string; to: string; color?: string }

type Props = {
  fen: string
  orientation?: 'white' | 'black'
  /** Autoriser l'utilisateur à jouer des coups. */
  interactive?: boolean
  /** Appelé quand l'utilisateur joue un coup légal. Renvoie true si le coup est accepté. */
  onMove?: (move: MoveInput) => boolean
  lastMove?: { from: string; to: string } | null
  arrows?: BoardArrow[]
  /** Styles supplémentaires par case (ex. cases à colorier dans un exercice). */
  squareStyles?: Record<string, CSSProperties>
  onSquareClick?: (square: string) => void
}

const HIGHLIGHT_LAST = { backgroundColor: 'rgba(255, 213, 0, 0.4)' }
const HIGHLIGHT_SELECTED = { backgroundColor: 'rgba(47, 111, 78, 0.45)' }
const CHECK = { background: 'radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(220,38,38,0.35) 45%, transparent 75%)' }
const dot = (capture: boolean): CSSProperties =>
  capture
    ? { background: 'radial-gradient(circle, transparent 58%, rgba(0,0,0,0.25) 60%)' }
    : { background: 'radial-gradient(circle, rgba(0,0,0,0.22) 20%, transparent 22%)' }

const PROMO_PIECES: { p: PieceSymbol; label: string; glyph: [string, string] }[] = [
  { p: 'q', label: 'Dame', glyph: ['♕', '♛'] },
  { p: 'r', label: 'Tour', glyph: ['♖', '♜'] },
  { p: 'b', label: 'Fou', glyph: ['♗', '♝'] },
  { p: 'n', label: 'Cavalier', glyph: ['♘', '♞'] },
]

/**
 * Échiquier interactif : glisser-déposer ou clic-clic, points sur les coups légaux,
 * surlignage du dernier coup et du roi en échec, choix de la pièce de promotion.
 */
export function Board({
  fen,
  orientation = 'white',
  interactive = true,
  onMove,
  lastMove,
  arrows = [],
  squareStyles = {},
  onSquareClick,
}: Props) {
  const game = useMemo(() => new Chess(fen), [fen])
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null)

  const targets = useMemo(() => {
    if (!selected) return []
    return game.moves({ square: selected as Square, verbose: true })
  }, [game, selected])

  function needsPromotion(from: string, to: string) {
    return game
      .moves({ square: from as Square, verbose: true })
      .some((m) => m.to === to && m.promotion)
  }

  function tryMove(from: string, to: string): boolean {
    const legal = game.moves({ square: from as Square, verbose: true }).some((m) => m.to === to)
    if (!legal) return false
    if (needsPromotion(from, to)) {
      setPendingPromo({ from, to })
      setSelected(null)
      return false // la pièce revient le temps de choisir
    }
    setSelected(null)
    return onMove ? onMove({ from, to }) : false
  }

  function ownPiece(square: string) {
    const p = game.get(square as Square)
    return !!p && p.color === game.turn()
  }

  function handleSquareClick(square: string) {
    onSquareClick?.(square)
    if (!interactive || game.isGameOver()) return
    if (selected && targets.some((m) => m.to === square)) {
      tryMove(selected, square)
      return
    }
    setSelected(ownPiece(square) && square !== selected ? square : null)
  }

  // Assemblage des styles de cases (du moins prioritaire au plus prioritaire).
  const styles: Record<string, CSSProperties> = {}
  const add = (sq: string, s: CSSProperties) => (styles[sq] = { ...styles[sq], ...s })
  if (lastMove) {
    add(lastMove.from, HIGHLIGHT_LAST)
    add(lastMove.to, HIGHLIGHT_LAST)
  }
  if (game.inCheck()) {
    const k = kingSquare(game)
    if (k) add(k, CHECK)
  }
  Object.entries(squareStyles).forEach(([sq, s]) => add(sq, s))
  if (selected) {
    add(selected, HIGHLIGHT_SELECTED)
    targets.forEach((m) => add(m.to, dot(!!m.captured)))
  }

  const promoColor = game.turn() === 'w' ? 0 : 1
  const [safeMode, setSafeMode] = useState(0)

  return (
    <div className="relative w-full select-none">
      <BoardGuard key={safeMode} onError={() => setSafeMode((n) => n + 1)}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive && !game.isGameOver(),
          canDragPiece: ({ piece }) => interactive && piece.pieceType[0] === game.turn(),
          onPieceDrag: ({ square }) => square && setSelected(square),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? tryMove(sourceSquare, targetSquare) : false,
          onSquareClick: ({ square }) => handleSquareClick(square),
          squareStyles: styles,
          arrows: arrows.map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.color ?? 'rgba(47, 111, 78, 0.8)',
          })),
          allowDrawingArrows: true,
          darkSquareStyle: { backgroundColor: 'var(--color-board-dark)' },
          lightSquareStyle: { backgroundColor: 'var(--color-board-light)' },
          boardStyle: { borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' },
          animationDurationInMs: 180,
          // Après une erreur d'animation, on redessine sans animation.
          showAnimations: safeMode === 0,
        }}
      />
      </BoardGuard>

      {pendingPromo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/40">
          <div className="rounded-lg bg-white p-4 shadow-xl">
            <p className="mb-3 text-center font-medium">Promotion : choisis ta pièce</p>
            <div className="flex gap-2">
              {PROMO_PIECES.map(({ p, label, glyph }) => (
                <button
                  key={p}
                  title={label}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-md border border-stone-300 hover:bg-stone-100"
                  onClick={() => {
                    const { from, to } = pendingPromo
                    setPendingPromo(null)
                    onMove?.({ from, to, promotion: p })
                  }}
                >
                  <span className="text-4xl leading-none">{glyph[promoColor]}</span>
                  <span className="text-xs text-stone-500">{label}</span>
                </button>
              ))}
            </div>
            <button className="mt-3 w-full text-sm text-stone-500 hover:underline" onClick={() => setPendingPromo(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * react-chessboard lève parfois une erreur pendant une animation si l'échiquier n'est pas encore
 * mesuré (fenêtre en train de changer de taille). Plutôt que de faire planter toute la page,
 * on intercepte l'erreur et on redessine l'échiquier sans animation.
 */
class BoardGuard extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
