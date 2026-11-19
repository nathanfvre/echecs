// Vérification de TOUT le contenu du cours :  npm run verify
//
//  1. chaque FEN est légale (format, un roi de chaque côté, pas de pion sur la 1re/8e rangée,
//     le camp qui n'a pas le trait n'est pas en échec) ;
//  2. chaque coup (démos, solutions, coups acceptés) est légal et bien écrit ;
//  3. les réponses des cases / questions à choix correspondent à la position ;
//  4. pour les exercices marqués "engine": true, Stockfish confirme que le coup de la solution
//     est le meilleur (à 0,3 pion près), ou un coup clairement gagnant (mat ou au moins +3) ;
//  5. questions "engineChoice" : la bonne option est nettement le meilleur coup selon Stockfish ;
//  6. finales "practice" : la position est bien gagnante (mater / promouvoir) ou tenable (tenir).
//
// Le script s'arrête avec une erreur s'il trouve un problème : rien d'inexact ne doit passer.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Chess, validateFen } from 'chess.js'
import { factOf, isMoveAccepted, squaresAnswer } from '../src/content/logic'
import type { Lesson, Step } from '../src/content/types'
import { Engine, score } from './engine'
import { buildNames } from './build-openings'
import type { OpeningLine } from '../src/features/openings/data'

const ROOT = join(import.meta.dirname, '../src/content/modules')
const DEPTH = Number(process.env.DEPTH ?? 18)
const WINNING = 300 // centipions : « clairement gagnant »
const CLOSE = 30 // centipions : « aussi bon que le meilleur coup »
const CHOICE_MARGIN = 30 // la bonne option d'un QCM moteur doit dépasser les autres d'au moins 0,3 pion

const REPERTOIRE: OpeningLine[] = JSON.parse(readFileSync(join(import.meta.dirname, '../src/content/repertoire.json'), 'utf8'))
const OPENING_MAX_LOSS = 80 // centipions : un coup du répertoire ne doit pas perdre plus que ça par rapport au meilleur

const errors: string[] = []
const warnings: string[] = []
let engineChecks = 0

const SQUARE = /^[a-h][1-8]$/

function fenProblem(fen: string): string | null {
  const v = validateFen(fen)
  if (!v.ok) return `FEN invalide (${v.error})`
  const board = fen.split(' ')[0]
  if ((board.match(/K/g) ?? []).length !== 1 || (board.match(/k/g) ?? []).length !== 1)
    return 'il faut exactement un roi blanc et un roi noir'
  const rows = board.split('/')
  if (/[pP]/.test(rows[0]) || /[pP]/.test(rows[7])) return 'pion sur la 1re ou la 8e rangée'
  // Le camp qui N'A PAS le trait ne doit pas être en échec (position impossible).
  const parts = fen.split(' ')
  parts[1] = parts[1] === 'w' ? 'b' : 'w'
  parts[3] = '-'
  try {
    if (new Chess(parts.join(' ')).inCheck()) return "le camp qui n'a pas le trait est en échec"
  } catch {
    /* ignoré */
  }
  return null
}

/** Joue un coup SAN et vérifie qu'il est écrit exactement comme chess.js l'écrit (+, #, x…). */
function playSan(game: Chess, san: string, where: string): boolean {
  try {
    const mv = game.move(san)
    if (mv.san !== san) {
      errors.push(`${where} : « ${san} » devrait s'écrire « ${mv.san} »`)
      return false
    }
    return true
  } catch {
    errors.push(`${where} : coup illégal « ${san} » dans ${game.fen()}`)
    return false
  }
}

function uci(game: Chess, san: string): string {
  const m = new Chess(game.fen()).move(san)
  return m.from + m.to + (m.promotion ?? '')
}

async function checkWithEngine(engine: Engine, fen: string, san: string, where: string, accepted: string[], goalMate: boolean) {
  engineChecks++
  const game = new Chess(fen)
  const [best, second] = await engine.analyse(fen, DEPTH, { multipv: 2 })
  const solUci = uci(game, san)
  const sol = solUci === best.bestmove ? best : (await engine.analyse(fen, DEPTH, { searchmoves: [solUci] }))[0]
  const s = score(sol)
  const ok = solUci === best.bestmove || (sol.mate !== null && sol.mate > 0) || s >= WINNING || (best.mate === null && s >= score(best) - CLOSE)
  if (!ok) {
    const bestSan = game.move(best.bestmove).san
    errors.push(`${where} : Stockfish n'est pas d'accord. ${san} vaut ${fmt(sol)}, alors que ${bestSan} vaut ${fmt(best)}`)
    return
  }
  // Avertissement : un autre coup est aussi clairement gagnant et serait refusé à l'élève.
  if (second && !goalMate) {
    const alt = second.bestmove === solUci ? best : second
    const altSan = new Chess(fen).move(alt.bestmove).san
    const altWins = (alt.mate !== null && alt.mate > 0) || score(alt) >= WINNING
    if (altWins && !accepted.includes(altSan) && score(alt) >= s - 150)
      warnings.push(`${where} : ${altSan} (${fmt(alt)}) semble aussi bon que ${san} (${fmt(sol)}) — l'ajouter à "accept" ?`)
  }
}

function fmt(e: { cp: number | null; mate: number | null }) {
  if (e.mate !== null) return e.mate > 0 ? `mat en ${e.mate}` : `mat subi en ${-e.mate}`
  return `${e.cp! > 0 ? '+' : ''}${(e.cp! / 100).toFixed(2)}`
}

async function checkStep(step: Step, where: string, engine: () => Promise<Engine>) {
  if ((step as { type: string }).type === 'puzzles') {
    errors.push(`${where} : emplacement "puzzles" non rempli — lance npm run lesson:puzzles`)
    return
  }
  const fen = 'fen' in step ? step.fen : undefined
  const fp = fenProblem(fen ?? '')
  if (fen !== undefined && fp) {
    errors.push(`${where} : ${fp} — ${fen}`)
    return
  }

  switch (step.type) {
    case 'demo': {
      const g = new Chess(step.fen)
      for (const san of step.moves ?? []) if (!playSan(g, san, where)) break
      for (const sq of [...(step.arrows ?? []).flat(), ...(step.highlight ?? [])])
        if (!SQUARE.test(sq)) errors.push(`${where} : case invalide « ${sq} »`)
      if (step.text.length > 450) warnings.push(`${where} : texte long (${step.text.length} caractères) — viser la pratique`)
      break
    }
    case 'move': {
      if (!step.solution.length) errors.push(`${where} : solution vide`)
      if (step.solution.length % 2 === 0) errors.push(`${where} : la solution doit finir par un coup de l'élève`)
      if (step.accept?.length && step.solution.length > 1) errors.push(`${where} : "accept" n'est permis que pour une solution d'un seul coup`)
      const g = new Chess(step.fen)
      if (step.preMove && !playSan(g, step.preMove, `${where} (coup adverse de départ)`)) return
      const startFen = g.fen()
      for (const [i, san] of step.solution.entries()) {
        const fenBefore = g.fen()
        if (!playSan(g, san, `${where} (coup ${i + 1})`)) return
        if (i % 2 === 0 && !isMoveAccepted(step, i, fenBefore, san)) errors.push(`${where} : la solution n'est pas acceptée par l'appli`)
      }
      if (step.goal === 'mate' && !g.isCheckmate()) errors.push(`${where} : "goal": "mate" mais la solution ne mate pas`)
      for (const san of step.accept ?? []) playSan(new Chess(step.fen), san, `${where} (accept)`)
      if (step.engine) {
        const e = await engine()
        const pos = new Chess(startFen)
        for (const [i, san] of step.solution.entries()) {
          if (i % 2 === 0) await checkWithEngine(e, pos.fen(), san, `${where} (coup ${i + 1})`, step.accept ?? [], step.goal === 'mate')
          pos.move(san)
        }
      }
      break
    }
    case 'squares': {
      if (step.from) {
        const p = new Chess(step.fen).get(step.from as never)
        if (!p) errors.push(`${where} : aucune pièce en ${step.from}`)
        else if (p.color !== step.fen.split(' ')[1]) errors.push(`${where} : la pièce en ${step.from} n'est pas au camp qui a le trait`)
      } else if (!step.answer?.length) errors.push(`${where} : il faut "from" ou "answer"`)
      for (const sq of step.answer ?? []) if (!SQUARE.test(sq)) errors.push(`${where} : case invalide « ${sq} »`)
      if (squaresAnswer(step).length === 0) errors.push(`${where} : aucune case attendue`)
      break
    }
    case 'choice': {
      if (step.answer < 0 || step.answer >= step.options.length) errors.push(`${where} : "answer" hors des options`)
      if (step.facts) {
        if (!step.fen) errors.push(`${where} : "facts" sans position`)
        else if (step.facts.length !== step.options.length) errors.push(`${where} : un fait par option est requis`)
        else {
          const real = factOf(new Chess(step.fen))
          if (step.facts[step.answer] !== real)
            errors.push(`${where} : la bonne réponse dit « ${step.facts[step.answer]} » mais la position est « ${real} »`)
        }
      }
      if (step.legal) {
        if (!step.fen) errors.push(`${where} : "legal" sans position`)
        else {
          let legal = true
          try {
            new Chess(step.fen).move(step.legal)
          } catch {
            legal = false
          }
          if ((step.answer === 0) !== legal)
            errors.push(`${where} : ${step.legal} est ${legal ? 'légal' : 'illégal'} mais la réponse dit l'inverse`)
        }
      }
      if (step.engineChoice) {
        if (!step.fen) {
          errors.push(`${where} : "engineChoice" sans position`)
          break
        }
        const sans: string[] = []
        for (const opt of step.options) if (playSan(new Chess(step.fen), opt, `${where} (option)`)) sans.push(opt)
        if (sans.length !== step.options.length) break
        const e = await engine()
        engineChecks++
        const g = new Chess(step.fen)
        const evals = []
        for (const san of sans) evals.push((await e.analyse(step.fen, DEPTH, { searchmoves: [uci(g, san)] }))[0])
        const right = score(evals[step.answer])
        for (const [i, ev] of evals.entries())
          if (i !== step.answer && score(ev) > right - CHOICE_MARGIN)
            errors.push(`${where} : ${sans[i]} (${fmt(ev)}) vaut autant ou plus que la bonne réponse ${sans[step.answer]} (${fmt(evals[step.answer])})`)
      }
      break
    }
    case 'line':
      if (!REPERTOIRE.some((l) => l.id === step.line)) errors.push(`${where} : ligne d'ouverture inconnue « ${step.line} »`)
      break
    case 'practice': {
      if (step.maxMoves < 1) errors.push(`${where} : "maxMoves" doit être au moins 1`)
      const g = new Chess(step.fen)
      if (g.isGameOver()) {
        errors.push(`${where} : la partie est déjà finie`)
        break
      }
      const e = await engine()
      engineChecks++
      const [best] = await e.analyse(step.fen, Math.max(DEPTH, 20))
      const s = score(best)
      if (step.goal === 'hold') {
        if (s < -150) errors.push(`${where} : position perdue (${fmt(best)}), impossible à tenir`)
      } else if (!((best.mate !== null && best.mate > 0) || s >= 500))
        errors.push(`${where} : position pas clairement gagnante (${fmt(best)})`)
      else if (step.goal === 'mate' && best.mate !== null && best.mate > step.maxMoves)
        errors.push(`${where} : Stockfish mate en ${best.mate}, plus que les ${step.maxMoves} coups permis`)
      else if (step.goal === 'mate' && best.mate === null)
        warnings.push(`${where} : Stockfish ne voit pas encore le mat (${fmt(best)}) — vérifie que ${step.maxMoves} coups suffisent`)
      break
    }
  }
}

/**
 * Répertoire d'ouvertures : coups légaux et bien écrits, chaque ligne finit par un coup de l'élève,
 * et Stockfish confirme qu'aucun coup de l'élève n'est une erreur. Les noms Lichess doivent être à jour.
 */
async function checkRepertoire(engine: () => Promise<Engine>) {
  const ids = new Set<string>()
  for (const line of REPERTOIRE) {
    const where = `répertoire [${line.id}]`
    if (ids.has(line.id)) errors.push(`${where} : id en double`)
    ids.add(line.id)
    if ((line.moves.length % 2 === 1) !== (line.side === 'w')) errors.push(`${where} : la ligne doit finir par un coup de l'élève`)
    const g = new Chess()
    for (const [i, san] of line.moves.entries()) {
      const fen = g.fen()
      if (!playSan(g, san, `${where} (coup ${i + 1})`)) break
      if ((i % 2 === 0) !== (line.side === 'w')) continue // coup adverse : pas de contrôle
      const e = await engine()
      engineChecks++
      const [best] = await e.analyse(fen, 14)
      const mine = best.bestmove === uci(new Chess(fen), san) ? best : (await e.analyse(fen, 14, { searchmoves: [uci(new Chess(fen), san)] }))[0]
      const loss = score(best) - score(mine)
      if (loss > OPENING_MAX_LOSS)
        errors.push(`${where} (coup ${i + 1}) : ${san} perd ${(loss / 100).toFixed(2)} pion selon Stockfish (meilleur : ${new Chess(fen).move(best.bestmove).san})`)
    }
  }
  const names = await buildNames()
  const saved = readFileSync(join(import.meta.dirname, '../src/content/opening-names.json'), 'utf8')
  if (JSON.stringify(names, null, 1) + '\n' !== saved) errors.push('opening-names.json pas à jour : lance npm run build:openings')
  console.log(`${REPERTOIRE.length} lignes d'ouverture contrôlées.`)
}

async function main() {
  let enginePromise: Promise<Engine> | null = null
  const engine = () => (enginePromise ??= Engine.create())
  const ids = new Set<string>()
  let lessons = 0
  let exercises = 0

  for (const dir of readdirSync(ROOT).sort()) {
    const files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.json')).sort()
    if (!files.includes('module.json')) errors.push(`${dir} : module.json manquant`)
    for (const file of files.filter((f) => f !== 'module.json')) {
      const where0 = `${dir}/${file}`
      let lesson: Lesson
      try {
        lesson = JSON.parse(readFileSync(join(ROOT, dir, file), 'utf8'))
      } catch (e) {
        errors.push(`${where0} : JSON illisible (${(e as Error).message})`)
        continue
      }
      lessons++
      if (ids.has(lesson.id)) errors.push(`${where0} : id de leçon en double « ${lesson.id} »`)
      ids.add(lesson.id)
      if (!lesson.title || !lesson.intro || !lesson.steps?.length) errors.push(`${where0} : title, intro et steps sont obligatoires`)
      if (lesson.intro.length > 600) warnings.push(`${where0} : introduction longue (${lesson.intro.length} caractères)`)

      const ex = lesson.steps.filter((s) => s.type !== 'demo')
      exercises += ex.length
      if (ex.length < 5) warnings.push(`${where0} : seulement ${ex.length} exercices`)
      if (lesson.steps.length - ex.length > ex.length / 2) warnings.push(`${where0} : trop de démos par rapport aux exercices`)

      for (const [i, step] of lesson.steps.entries()) {
        const where = `${where0} étape ${i + 1}${'id' in step ? ` [${step.id}]` : ''}`
        if ('id' in step) {
          if (ids.has(step.id)) errors.push(`${where} : id en double`)
          ids.add(step.id)
          if (!step.explanation) errors.push(`${where} : explication manquante`)
          if (step.type !== 'choice' && !step.hint) errors.push(`${where} : indice manquant`)
        }
        await checkStep(step, where, engine)
      }
    }
  }

  await checkRepertoire(engine)

  const started = enginePromise as Promise<Engine> | null // (assigné dans la fonction engine())
  if (started) (await started).quit()

  console.log(`\n${lessons} leçons, ${exercises} exercices, ${engineChecks} vérifications Stockfish (profondeur ${DEPTH}).`)
  for (const w of warnings) console.log('⚠️  ' + w)
  for (const e of errors) console.log('❌ ' + e)
  if (errors.length) {
    console.log(`\n${errors.length} erreur(s).`)
    process.exit(1)
  }
  console.log(`✅ Tout le contenu est valide${warnings.length ? ` (${warnings.length} avertissement(s))` : ''}.`)
  process.exit(0)
}

main()
