// Vérification de public/puzzles.json (lancé par npm run verify).
//  - TOUS les puzzles : FEN valide, tous les coups légaux, conversion identique à celle de l'appli,
//    classement 400–1300, thèmes connus, pas de doublon.
//  - Un ÉCHANTILLON (SAMPLE, 150 par défaut ; SAMPLE=all pour tout) : Stockfish confirme que
//    chaque coup de l'élève est le meilleur, ou proche du meilleur, ou mate / gagne nettement.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Chess, validateFen } from 'chess.js'
import { puzzleToStep } from '../src/features/puzzles/data'
import { PUZZLE_THEMES, type Puzzle } from '../src/features/puzzles/themes'
import { Engine, score } from './engine'

const FILE = join(import.meta.dirname, '../public/puzzles.json')
const DEPTH = Number(process.env.DEPTH ?? 14)
const SAMPLE = process.env.SAMPLE ?? '150'

const errors: string[] = []
const known = new Set(PUZZLE_THEMES.map((t) => t.key))

async function main() {
  const puzzles: Puzzle[] = JSON.parse(readFileSync(FILE, 'utf8'))
  const ids = new Set<string>()
  for (const p of puzzles) {
    const where = `puzzle ${p.id}`
    if (ids.has(p.id)) errors.push(`${where} : doublon`)
    ids.add(p.id)
    if (!validateFen(p.fen).ok) errors.push(`${where} : FEN invalide`)
    if (p.rating < 400 || p.rating > 1300) errors.push(`${where} : classement ${p.rating} hors de 400–1300`)
    if (!p.themes.length || p.themes.some((t) => !known.has(t))) errors.push(`${where} : thèmes inconnus`)
    try {
      const { step } = puzzleToStep(p)
      if (step.solution.length % 2 === 0) errors.push(`${where} : la solution doit finir par un coup de l'élève`)
    } catch {
      errors.push(`${where} : coup illégal dans la solution`)
    }
  }
  console.log(`${puzzles.length} puzzles : légalité vérifiée.`)

  // Échantillon déterministe, réparti sur tout le fichier.
  const n = SAMPLE === 'all' ? puzzles.length : Math.min(Number(SAMPLE), puzzles.length)
  const sample = puzzles.filter((_, i) => i % Math.max(1, Math.floor(puzzles.length / n)) === 0).slice(0, n)
  const engine = await Engine.create()
  let checked = 0
  for (const p of sample) {
    const g = new Chess(p.fen)
    const uci = p.moves.split(' ')
    const isMate = p.themes.some((t) => t.startsWith('mate') || t === 'backRankMate')
    for (let i = 0; i < uci.length; i++) {
      const isUser = i % 2 === 1
      if (isUser) {
        const fen = g.fen()
        const [best] = await engine.analyse(fen, DEPTH)
        const mine = uci[i] === best.bestmove ? best : (await engine.analyse(fen, DEPTH, { searchmoves: [uci[i]] }))[0]
        const lastMateMove = isMate && i === uci.length - 1
        const mates = (e: typeof best) => e.mate !== null && e.mate > 0
        const ok =
          uci[i] === best.bestmove ||
          mates(mine) ||
          score(mine) >= 300 ||
          score(best) - score(mine) <= 50 ||
          (lastMateMove && new Chess(fen).move({ from: uci[i].slice(0, 2), to: uci[i].slice(2, 4), promotion: uci[i][4] }).san.endsWith('#'))
        if (!ok) errors.push(`puzzle ${p.id} coup ${i} : ${uci[i]} jugé faible par Stockfish (meilleur : ${best.bestmove})`)
      }
      g.move({ from: uci[i].slice(0, 2), to: uci[i].slice(2, 4), promotion: uci[i][4] })
    }
    if (++checked % 25 === 0) console.log(`  Stockfish : ${checked} / ${sample.length}`)
  }
  engine.quit()
  console.log(`${sample.length} puzzles contrôlés par Stockfish (profondeur ${DEPTH}).`)

  for (const e of errors) console.log('❌ ' + e)
  if (errors.length) {
    console.log(`\n${errors.length} erreur(s).`)
    process.exit(1)
  }
  console.log('✅ Puzzles valides.')
  process.exit(0)
}

main()
