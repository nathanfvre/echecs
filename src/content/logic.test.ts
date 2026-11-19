import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { factOf, isMoveAccepted, squaresAnswer } from './logic'
import type { MoveStep } from './types'
import { MODULES } from './index'

const base = { type: 'move', id: 't', prompt: '', hint: '', explanation: '' } as const

describe('correction des exercices', () => {
  it('accepte la solution et les alternatives', () => {
    const step: MoveStep = { ...base, fen: '4k3/8/8/8/3n4/2P1P3/8/4K3 w - - 0 1', solution: ['exd4'], accept: ['cxd4'] }
    expect(isMoveAccepted(step, 0, step.fen, 'exd4')).toBe(true)
    expect(isMoveAccepted(step, 0, step.fen, 'cxd4')).toBe(true)
    expect(isMoveAccepted(step, 0, step.fen, 'Kd2')).toBe(false)
  })

  it('accepte tout mat quand le but est de mater', () => {
    const fen = '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1'
    const step: MoveStep = { ...base, fen, solution: ['Qf8#'], goal: 'mate' }
    expect(isMoveAccepted(step, 0, fen, 'Qf8#')).toBe(true)
    expect(isMoveAccepted(step, 0, fen, 'Qa1+')).toBe(false)
    expect(isMoveAccepted(step, 0, fen, 'Qf7')).toBe(false) // pat !
  })

  it('calcule les cases accessibles', () => {
    expect(squaresAnswer({ type: 'squares', id: 's', prompt: '', hint: '', explanation: '', fen: '4k3/8/8/8/8/8/1P6/2B1K3 w - - 0 1', from: 'c1' })).toEqual(['d2', 'e3', 'f4', 'g5', 'h6'])
  })

  it('reconnaît mat, pat et matériel insuffisant', () => {
    expect(factOf(new Chess('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1'))).toBe('checkmate')
    expect(factOf(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBe('stalemate')
    expect(factOf(new Chess('8/8/4k3/8/8/3KB3/8/8 w - - 0 1'))).toBe('insufficient')
  })
})

describe('chargement du contenu', () => {
  it('trouve le module 0 et ses leçons dans l’ordre', () => {
    expect(MODULES[0].id).toBe('m0')
    expect(MODULES[0].lessons.length).toBeGreaterThanOrEqual(10)
    expect(MODULES[0].lessons[0].id).toBe('m0-echiquier')
  })
})
