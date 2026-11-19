// Remplit les leçons avec des puzzles Lichess (CC0) :  npm run lesson:puzzles
//
// Dans un fichier de leçon, une étape provisoire
//   { "type": "puzzles", "themes": ["fork"], "min": 500, "max": 800, "count": 4, "explain": "Fourchette !" }
// est remplacée par 4 exercices « move » tirés de la base Lichess (déjà téléchargée par
// npm run build:puzzles) : thèmes demandés, classement entre min et max, puzzles populaires.
// Les puzzles déjà utilisés ailleurs (page Puzzles, autres leçons) sont exclus.
// Le résultat est écrit dans le fichier : il reste ensuite stable, et npm run verify le contrôle.
import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { createZstdDecompress } from 'node:zlib'
import { Chess } from 'chess.js'
import type { Lesson, MoveStep, PuzzlesPlaceholder } from '../src/content/types'
import { PUZZLE_THEMES, type Puzzle } from '../src/features/puzzles/themes'
import { sanToFr } from '../src/lib/notation'

const FILE = join(import.meta.dirname, '.cache/lichess_db_puzzle.csv.zst')
const ROOT = join(import.meta.dirname, '../src/content/modules')
const PUBLIC = join(import.meta.dirname, '../public/puzzles.json')

type Slot = { file: string; lesson: Lesson; index: number; ph: PuzzlesPlaceholder; found: Puzzle[] }

function isMate(themes: string[]) {
  return themes.some((t) => t.startsWith('mate') || t === 'backRankMate' || t === 'smotheredMate')
}

/** Puzzle → exercice « move » (la position de départ est AVANT le coup adverse). */
function toStep(p: Puzzle, id: string, ph: PuzzlesPlaceholder): MoveStep {
  const g = new Chess(p.fen)
  const [preMove, ...solution] = p.moves.split(' ').map((m) => g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san)
  const themes = p.themes
  const mate = isMate(themes)
  const n = Math.ceil(solution.length / 2)
  const hint = ph.hint ?? PUZZLE_THEMES.find((t) => themes.includes(t.key))?.hint ?? 'Échecs, captures, menaces.'
  return {
    type: 'move',
    id,
    fen: p.fen,
    preMove,
    source: `lichess:${p.id}`,
    prompt: mate ? `Mat en ${n}.` : n > 1 ? `Trouve la bonne suite (${n} coups).` : 'Trouve le meilleur coup.',
    solution,
    ...(mate ? { goal: 'mate' as const } : {}),
    engine: true,
    hint,
    explanation: `${ph.explain ? ph.explain + ' ' : ''}Solution : **${solution.map(sanToFr).join(' ')}**.`,
  }
}

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
  // 1. Les emplacements à remplir, et les puzzles déjà utilisés.
  const used = new Set<string>((JSON.parse(readFileSync(PUBLIC, 'utf8')) as Puzzle[]).map((p) => p.id))
  const slots: Slot[] = []
  for (const dir of readdirSync(ROOT).sort())
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.json') && f !== 'module.json').sort()) {
      const file = join(ROOT, dir, f)
      const lesson: Lesson = JSON.parse(readFileSync(file, 'utf8'))
      lesson.steps.forEach((s, index) => {
        if ((s as { type: string }).type === 'puzzles') slots.push({ file, lesson, index, ph: s as unknown as PuzzlesPlaceholder, found: [] })
        else if ('source' in s && s.source?.startsWith('lichess:')) used.add(s.source.slice(8))
      })
    }
  if (!slots.length) return console.log('Aucun emplacement "puzzles" à remplir.')
  if (!existsSync(FILE)) throw new Error('Base Lichess absente : lance d’abord npm run build:puzzles.')
  console.log(`${slots.length} emplacement(s) à remplir. Lecture de la base Lichess…`)

  // 2. Lecture de la base : on garde, pour chaque emplacement, tous les candidats.
  const candidates = slots.map(() => [] as Puzzle[])
  const lines = createInterface({ input: createReadStream(FILE).pipe(createZstdDecompress()), crlfDelay: Infinity })
  let read = 0
  for await (const line of lines) {
    if (read++ === 0) continue
    const [id, fen, moves, rating, rd, popularity, plays, themes] = line.split(',')
    if (used.has(id) || Number(rd) > 90 || Number(popularity) < 85 || Number(plays) < 500) continue
    const r = Number(rating)
    const list = themes.split(' ')
    const userMoves = Math.ceil((moves.split(' ').length - 1) / 2)
    slots.forEach((s, i) => {
      if (r < s.ph.min || r > s.ph.max || userMoves > (s.ph.maxMoves ?? 2)) return
      if (!s.ph.themes.every((t) => list.includes(t))) return
      // Une leçon qui ne parle pas de mat ne reçoit pas de puzzles de mat (hors sujet).
      if (!isMate(s.ph.themes) && !s.ph.allowMate && isMate(list)) return
      candidates[i].push({ id, fen, moves, rating: r, themes: list })
    })
  }

  // 3. Tirage reproductible, sans doublon entre emplacements.
  slots.forEach((s, i) => {
    for (const p of shuffle(candidates[i], `${s.lesson.id}-${s.index}`)) {
      if (s.found.length >= s.ph.count) break
      if (used.has(p.id) || !legal(p.fen, p.moves.split(' '))) continue
      used.add(p.id)
      s.found.push(p)
    }
    s.found.sort((a, b) => a.rating - b.rating)
    console.log(`  ${s.lesson.id} [${s.ph.themes.join('+')} ${s.ph.min}-${s.ph.max}] : ${s.found.length}/${s.ph.count} (sur ${candidates[i].length} candidats)`)
  })

  // 4. Écriture : on remplace chaque emplacement (en partant de la fin pour garder les index).
  const byFile = new Map<string, Slot[]>()
  for (const s of slots) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s])
  for (const [file, list] of byFile) {
    const lesson = list[0].lesson
    const taken = new Set(lesson.steps.flatMap((s) => ('id' in s ? [s.id] : [])))
    let n = 1
    const nextId = () => {
      while (taken.has(`${lesson.id}-p${n}`)) n++
      taken.add(`${lesson.id}-p${n}`)
      return `${lesson.id}-p${n}`
    }
    for (const s of [...list].sort((a, b) => b.index - a.index)) {
      // Pas assez de puzzles : on garde l'emplacement (npm run verify le signalera).
      if (s.found.length < s.ph.count) {
        console.log(`  ⚠️  ${s.lesson.id} : pas assez de puzzles — élargis les thèmes ou la fourchette de classement.`)
        continue
      }
      const steps = s.found.map((p) => toStep(p, '', s.ph))
      lesson.steps.splice(s.index, 1, ...steps)
    }
    for (const st of lesson.steps) if (st.type === 'move' && st.id === '') st.id = nextId()
    writeFileSync(file, formatLesson(lesson))
  }
  console.log('✅ Leçons mises à jour. Lance npm run verify pour tout contrôler.')
}

/** Même mise en forme que les leçons écrites à la main : une étape par ligne. */
function formatLesson(l: Lesson): string {
  const head = Object.entries(l)
    .filter(([k]) => k !== 'steps')
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  const steps = l.steps.map((s) => '    ' + JSON.stringify(s).replace(/,"/g, ', "').replace(/":/g, '": '))
  return ['{', ...head, '  "steps": [', steps.join(',\n'), '  ]', '}', ''].join('\n')
}

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
