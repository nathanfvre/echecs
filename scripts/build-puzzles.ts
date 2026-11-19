// Fabrique public/puzzles.json à partir de la base ouverte de puzzles Lichess (licence CC0).
//   npm run build:puzzles
//
// 1. Télécharge lichess_db_puzzle.csv.zst (~300 Mo) dans scripts/.cache/ (une seule fois).
// 2. Lit le fichier ligne par ligne (sans tout décompresser sur le disque).
// 3. Garde les puzzles notés 400–1300, populaires et très joués, sur les thèmes du cours.
// 4. Répartit équitablement entre 4 tranches de difficulté, vérifie chaque coup avec chess.js.
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createZstdDecompress } from 'node:zlib'
import { Chess } from 'chess.js'
import { PUZZLE_THEMES, type Puzzle } from '../src/features/puzzles/themes'

const URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
const CACHE = join(import.meta.dirname, '.cache')
const FILE = join(CACHE, 'lichess_db_puzzle.csv.zst')
const OUT = join(import.meta.dirname, '../public/puzzles.json')

const MIN_RATING = 400
const MAX_RATING = 1300
const BUCKETS = [400, 600, 800, 1000, 1301] // 4 tranches : 400-599, 600-799, 800-999, 1000-1300

async function download() {
  if (existsSync(FILE) && statSync(FILE).size > 100_000_000) {
    console.log('Fichier déjà téléchargé, on le réutilise.')
    return
  }
  mkdirSync(CACHE, { recursive: true })
  console.log(`Téléchargement de ${URL} (~300 Mo)…`)
  const res = await fetch(URL)
  if (!res.ok || !res.body) throw new Error(`Téléchargement impossible : ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(FILE))
  console.log('Téléchargé.')
}

/** Rejoue la solution : renvoie null si un coup est illégal. */
function legal(fen: string, moves: string[]): boolean {
  try {
    const g = new Chess(fen)
    for (const m of moves) g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    return true
  } catch {
    return false
  }
}

async function main() {
  await download()

  // candidats[thème][tranche] = puzzles
  const candidates = new Map<string, Puzzle[][]>()
  for (const t of PUZZLE_THEMES) candidates.set(t.key, BUCKETS.slice(1).map(() => []))

  const lines = createInterface({ input: createReadStream(FILE).pipe(createZstdDecompress()), crlfDelay: Infinity })
  let read = 0
  let kept = 0
  for await (const line of lines) {
    if (read++ === 0) continue // en-tête
    if (read % 1_000_000 === 0) console.log(`  ${read / 1_000_000} M lignes lues…`)
    // PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
    const [id, fen, moves, rating, rd, popularity, plays, themes] = line.split(',')
    const r = Number(rating)
    if (r < MIN_RATING || r > MAX_RATING) continue
    if (Number(rd) > 90 || Number(popularity) < 85 || Number(plays) < 300) continue
    const themeList = themes.split(' ')
    const ours = PUZZLE_THEMES.filter((t) => themeList.includes(t.key)).map((t) => t.key)
    if (!ours.length) continue
    const bucket = BUCKETS.findIndex((b, i) => r >= b && r < BUCKETS[i + 1])
    const p: Puzzle = { id, fen, moves, rating: r, themes: ours }
    for (const t of ours) candidates.get(t)![bucket].push(p)
    kept++
  }
  console.log(`${read} lignes lues, ${kept} candidats.`)

  // Sélection : pour chaque thème, son quota réparti sur les 4 tranches, tiré au hasard (de façon reproductible).
  const chosen = new Map<string, Puzzle>()
  for (const t of PUZZLE_THEMES) {
    const perBucket = Math.ceil(t.quota / 4)
    for (const list of candidates.get(t.key)!) {
      let taken = 0
      for (const p of shuffle(list, t.key)) {
        if (taken >= perBucket) break
        if (chosen.has(p.id)) {
          taken++ // déjà pris via un autre thème : il compte aussi pour celui-ci
          continue
        }
        if (!legal(p.fen, p.moves.split(' '))) continue
        chosen.set(p.id, p)
        taken++
      }
    }
  }

  const result = [...chosen.values()].sort((a, b) => a.rating - b.rating)
  mkdirSync(join(OUT, '..'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(result))
  console.log(`\n✅ ${result.length} puzzles écrits dans public/puzzles.json`)
  for (const t of PUZZLE_THEMES) console.log(`  ${t.label.padEnd(28)} ${result.filter((p) => p.themes.includes(t.key)).length}`)
}

/** Mélange déterministe (même résultat à chaque exécution). */
function shuffle<T>(list: T[], seed: string): T[] {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const rand = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

main()
