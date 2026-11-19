import { sanToFr } from '../lib/notation'

type Props = {
  /** Coups en notation anglaise (SAN). */
  moves: string[]
  /** Numéro du premier coup et camp qui commence (pour les positions qui ne partent pas du début). */
  startMoveNumber?: number
  startsWithBlack?: boolean
}

/** Liste des coups affichée en notation française, par paires (Blancs / Noirs). */
export function MoveList({ moves, startMoveNumber = 1, startsWithBlack = false }: Props) {
  const list = startsWithBlack ? [null, ...moves] : moves
  const rows: { n: number; w: string | null; b: string | null }[] = []
  for (let i = 0; i < list.length; i += 2) {
    rows.push({ n: startMoveNumber + i / 2, w: list[i], b: list[i + 1] ?? null })
  }

  if (moves.length === 0) return <p className="text-sm text-stone-400">Aucun coup joué.</p>

  return (
    <ol className="grid grid-cols-[2.5rem_1fr_1fr] gap-x-2 gap-y-0.5 font-mono text-sm">
      {rows.map((r) => (
        <li key={r.n} className="contents">
          <span className="text-stone-400">{r.n}.</span>
          <span>{r.w ? sanToFr(r.w) : '…'}</span>
          <span>{r.b ? sanToFr(r.b) : ''}</span>
        </li>
      ))}
    </ol>
  )
}
