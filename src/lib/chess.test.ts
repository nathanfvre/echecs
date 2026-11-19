import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { frToSan, sanToFr } from './notation'
import { START_FEN, checkFen, gameStatus, kingSquare, replay } from './chess'

describe('notation française', () => {
  it('traduit les pièces', () => {
    expect(sanToFr('Nf3')).toBe('Cf3')
    expect(sanToFr('Bxc6+')).toBe('Fxc6+')
    expect(sanToFr('Qh5#')).toBe('Dh5#')
    expect(sanToFr('Rxe8')).toBe('Txe8')
    expect(sanToFr('Kg1')).toBe('Rg1')
  })
  it('garde roques, coups de pion et colonnes', () => {
    expect(sanToFr('O-O-O')).toBe('O-O-O')
    expect(sanToFr('exd5')).toBe('exd5')
    expect(sanToFr('Nbd7')).toBe('Cbd7')
  })
  it('traduit la promotion', () => {
    expect(sanToFr('e8=Q+')).toBe('e8=D+')
    expect(sanToFr('bxa1=N')).toBe('bxa1=C')
  })
  it("fait l'aller-retour", () => {
    for (const san of ['Nf3', 'Qxd7+', 'Rae1', 'e8=Q#', 'Kxf2', 'Bb5']) {
      expect(frToSan(sanToFr(san))).toBe(san)
    }
  })
})

describe('état de la partie', () => {
  it('trait au début', () => {
    expect(gameStatus(new Chess()).text).toBe('Trait aux Blancs.')
  })
  it('mat du berger', () => {
    const g = replay(START_FEN, ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'])
    expect(gameStatus(g)).toEqual({ text: 'Échec et mat ! Les Blancs gagnent.', over: true })
  })
  it('pat', () => {
    const g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(gameStatus(g).text).toMatch(/^Pat/)
  })
  it('matériel insuffisant', () => {
    expect(gameStatus(new Chess('8/8/4k3/8/8/3K4/8/8 w - - 0 1')).text).toMatch(/matériel insuffisant/)
  })
  it('échec et case du roi', () => {
    const g = replay(START_FEN, ['e4', 'f5', 'Qh5+'])
    expect(gameStatus(g).text).toBe('Les Noirs sont en échec !')
    expect(kingSquare(g)).toBe('e8')
  })
})

describe('FEN', () => {
  it('accepte une FEN valide', () => expect(checkFen(START_FEN)).toBeNull())
  it('refuse une FEN invalide', () => expect(checkFen('nimporte quoi')).not.toBeNull())
})
