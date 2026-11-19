// Noms officiels des ouvertures (code ECO + nom) pour chaque position du répertoire :  npm run build:openings
//
// Source : github.com/lichess-org/chess-openings (licence CC0), fichiers a.tsv … e.tsv
// téléchargés une fois dans scripts/.cache/openings/. On repère les positions (et non les suites de coups),
// donc un nom est trouvé même si on y arrive par un autre ordre de coups.
// Résultat : src/content/opening-names.json, lu par l'entraîneur d'ouvertures.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Chess } from 'chess.js'

const CACHE = join(import.meta.dirname, '.cache/openings')
const OUT = join(import.meta.dirname, '../src/content/opening-names.json')
const REPERTOIRE = join(import.meta.dirname, '../src/content/repertoire.json')
const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/'
// Copie de fetch faite au chargement : Stockfish (WASM), lancé ensuite par npm run verify, remplace le fetch global.
const httpFetch = globalThis.fetch.bind(globalThis)

/** Position sans les compteurs de coups (format EPD). */
export const epd = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

async function download() {
  mkdirSync(CACHE, { recursive: true })
  for (const f of ['a', 'b', 'c', 'd', 'e']) {
    const file = join(CACHE, `${f}.tsv`)
    if (existsSync(file)) continue
    const res = await httpFetch(BASE + `${f}.tsv`)
    if (!res.ok) throw new Error(`Téléchargement impossible : ${f}.tsv (${res.status})`)
    writeFileSync(file, await res.text())
  }
}

/** Calcule { position: [eco, nom] } pour toutes les positions des lignes du répertoire. */
export async function buildNames(): Promise<Record<string, [string, string]>> {
  await download()
  const known = new Map<string, [string, string]>()
  for (const f of ['a', 'b', 'c', 'd', 'e'])
    for (const row of readFileSync(join(CACHE, `${f}.tsv`), 'utf8').split('\n').slice(1)) {
      const [eco, name, pgn] = row.split('\t')
      if (!pgn) continue
      const g = new Chess()
      for (const san of pgn.split(' ').filter((t) => !/^\d+\.$/.test(t))) g.move(san)
      known.set(epd(g.fen()), [eco, name])
    }
  const lines: { moves: string[] }[] = JSON.parse(readFileSync(REPERTOIRE, 'utf8'))
  const out: Record<string, [string, string]> = {}
  for (const l of lines) {
    const g = new Chess()
    for (const san of l.moves) {
      g.move(san)
      const k = epd(g.fen())
      if (known.has(k)) out[k] = known.get(k)!
    }
  }
  return Object.fromEntries(Object.entries(out).sort())
}

if (process.argv[1]?.endsWith('build-openings.ts')) {
  const names = await buildNames()
  writeFileSync(OUT, JSON.stringify(names, null, 1) + '\n')
  console.log(`✅ ${Object.keys(names).length} positions nommées écrites dans src/content/opening-names.json`)
}
