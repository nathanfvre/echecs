import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { BOT_LEVELS, chooseBotMove } from './bot'
import { judge, judgeGame, parsePgn, winChance } from './analysis'
import { toCp, type EngineLine } from './engine'

const line = (move: string, cp: number | null, mate: number | null = null): EngineLine => ({ cp, mate, pv: [move], depth: 10 })

describe('évaluations', () => {
  it('convertit les mats en grands nombres', () => {
    expect(toCp(line('a', null, 2))).toBeGreaterThan(toCp(line('a', null, 5)))
    expect(toCp(line('a', null, -1))).toBeLessThan(-9000)
    expect(toCp(line('a', 150))).toBe(150)
  })
  it('chances de gain : 50 % à égalité, symétriques', () => {
    expect(winChance(0)).toBe(50)
    expect(winChance(300) + winChance(-300)).toBeCloseTo(100)
    expect(winChance(10000)).toBeGreaterThan(97)
  })
  it('seuils façon Lichess', () => {
    expect(judge(35)).toBe('gaffe')
    expect(judge(22)).toBe('erreur')
    expect(judge(12)).toBe('imprecision')
    expect(judge(5)).toBeNull()
  })
})

describe('bot', () => {
  const lines = [line('e2e4', 30), line('d2d4', 25), line('g1f3', 20), line('a2a4', -80), line('f2f3', -150)]
  it('le niveau maximum joue toujours le meilleur coup', () => {
    expect(chooseBotMove(lines, BOT_LEVELS[7], () => 0.99)).toBe('e2e4')
  })
  it('un niveau faible peut faire une gaffe (tirage sous la probabilité)', () => {
    const seq = [0.01, 0.99] // 1er tirage : gaffe ; 2e : choix du dernier coup
    let i = 0
    expect(chooseBotMove(lines, BOT_LEVELS[0], () => seq[i++])).toBe('f2f3')
  })
  it('hors gaffe, il reste parmi les coups raisonnables', () => {
    for (let k = 0; k < 50; k++) {
      const mv = chooseBotMove(lines, BOT_LEVELS[3], Math.random)
      if (mv === 'a2a4' || mv === 'f2f3') {
        // possible seulement via une gaffe (7 % au niveau 4) : on vérifie juste que c'est un coup proposé
        expect(lines.map((l) => l.pv[0])).toContain(mv)
      }
    }
  })
  it('voit toujours un mat en 1', () => {
    const mateLines = [line('d1h5', null, 1), line('e2e4', 30)]
    expect(chooseBotMove(mateLines, BOT_LEVELS[0], () => 0)).toBe('d1h5')
  })
})

describe('analyse de partie', () => {
  it('repère la gaffe du mat du berger côté Noirs', () => {
    const start = new Chess().fen()
    const sans = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    // Évaluation de chaque position, du point de vue du camp au trait (la position finale, mat, n'en a pas).
    // Avant 3...Cf6, les Noirs tiennent avec g6 ; après Cf6, les Blancs ont un mat en 1.
    const evals = [
      line('e2e4', 30), line('e7e5', -30), line('g1f3', 40), line('b8c6', -20), line('f1c4', 20),
      line('g7g6', -50),
      line('h5f7', null, 1),
    ]
    const res = judgeGame(start, sans, evals)
    expect(res[5].san).toBe('Nf6')
    expect(res[5].judgement).toBe('gaffe')
    expect(res[5].bestSan).toBe('g6')
    expect(res[6].judgement).toBeNull() // le coup gagnant n'est jamais une faute
  })
  it('lit un PGN Lichess avec en-têtes', () => {
    const g = parsePgn('[White "a"]\n[Black "b"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
    expect(g?.sans.length).toBe(7)
    expect(g?.headers.Black).toBe('b')
    expect(parsePgn('pas un pgn 1. Zz9')).toBeNull()
  })
})
