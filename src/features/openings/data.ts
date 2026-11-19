// Répertoire d'ouvertures (src/content/repertoire.json) et noms officiels Lichess
// (src/content/opening-names.json, généré par npm run build:openings).
import { Chess } from 'chess.js'
import LINES from '../../content/repertoire.json'
import NAMES from '../../content/opening-names.json'

export type OpeningLine = {
  id: string
  /** Camp de l'élève dans cette ligne. */
  side: 'w' | 'b'
  group: string
  title: string
  /** Coups en notation anglaise (SAN), depuis la position de départ. */
  moves: string[]
  note: string
}

export const OPENING_LINES = LINES as OpeningLine[]
const NAME_BY_POSITION = NAMES as unknown as Record<string, [eco: string, name: string]>

export const GROUPS = [...new Set(OPENING_LINES.map((l) => l.group))]

export const findLine = (id: string) => OPENING_LINES.find((l) => l.id === id)

export const cardKey = (lineId: string) => `opening:${lineId}`

const epd = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

/** Nom officiel (ECO + nom anglais Lichess) de la position, s'il existe. */
export function nameOf(fen: string): { eco: string; name: string } | null {
  const n = NAME_BY_POSITION[epd(fen)]
  return n ? { eco: n[0], name: n[1] } : null
}

/** Nom le plus précis rencontré en jouant les `ply` premiers coups de la ligne. */
export function nameAlong(moves: string[], ply = moves.length): { eco: string; name: string } | null {
  const g = new Chess()
  let last = null
  for (const san of moves.slice(0, ply)) {
    g.move(san)
    last = nameOf(g.fen()) ?? last
  }
  return last
}
