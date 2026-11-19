// Niveaux du bot.
// Stockfish ne sait pas descendre sous ~1320 Elo avec son réglage officiel (UCI_Elo).
// Pour les niveaux débutants, on l'affaiblit nous-mêmes : il calcule peu profond, regarde plusieurs
// coups candidats, puis en choisit parfois un moins bon, voire une vraie gaffe.
// Les Elo affichés sont des ESTIMATIONS approximatives, pas des mesures.
import { toCp, type AnalyseOptions, type EngineLine } from './engine'

export type BotLevel = {
  id: number
  label: string
  elo: string
  /** Réglages de recherche Stockfish. */
  search: AnalyseOptions
  /** Probabilité de jouer un coup au hasard parmi les candidats (gaffe possible). */
  blunder: number
  /** Perte maximale (centipions) tolérée pour un coup « normal ». */
  maxLoss: number
}

export const BOT_LEVELS: BotLevel[] = [
  { id: 1, label: 'Niveau 1', elo: '~400', search: { depth: 3, multipv: 12 }, blunder: 0.35, maxLoss: 400 },
  { id: 2, label: 'Niveau 2', elo: '~600', search: { depth: 5, multipv: 10 }, blunder: 0.2, maxLoss: 250 },
  { id: 3, label: 'Niveau 3', elo: '~800', search: { depth: 7, multipv: 8 }, blunder: 0.12, maxLoss: 150 },
  { id: 4, label: 'Niveau 4', elo: '~1000', search: { depth: 9, multipv: 6 }, blunder: 0.07, maxLoss: 100 },
  { id: 5, label: 'Niveau 5', elo: '~1200', search: { depth: 11, multipv: 4 }, blunder: 0.035, maxLoss: 60 },
  { id: 6, label: 'Niveau 6', elo: '~1500', search: { movetime: 400, options: { UCI_LimitStrength: true, UCI_Elo: 1500 } }, blunder: 0, maxLoss: 0 },
  { id: 7, label: 'Niveau 7', elo: '~1800', search: { movetime: 600, options: { UCI_LimitStrength: true, UCI_Elo: 1800 } }, blunder: 0, maxLoss: 0 },
  { id: 8, label: 'Niveau 8', elo: 'maximum', search: { movetime: 1000 }, blunder: 0, maxLoss: 0 },
]

/**
 * Choisit le coup du bot parmi les lignes proposées par Stockfish (meilleure en premier).
 * `rand` : générateur aléatoire entre 0 et 1 (remplaçable dans les tests).
 */
export function chooseBotMove(lines: EngineLine[], level: BotLevel, rand: () => number = Math.random): string {
  const usable = lines.filter((l) => l.pv.length > 0)
  if (usable.length === 0) throw new Error('aucun coup proposé par le moteur')
  if (usable.length === 1 || (level.blunder === 0 && level.maxLoss === 0)) return usable[0].pv[0]

  // Un mat en 1 ou 2 est toujours vu, même par le bot le plus faible (sinon c'est frustrant et irréaliste).
  if (usable[0].mate !== null && usable[0].mate > 0 && usable[0].mate <= (level.id >= 3 ? 2 : 1)) return usable[0].pv[0]

  if (rand() < level.blunder) return usable[Math.floor(rand() * usable.length)].pv[0]

  const best = toCp(usable[0])
  const ok = usable.filter((l) => best - toCp(l) <= level.maxLoss)
  // Préférence pour les meilleurs coups : poids décroissant 1, 1/2, 1/3…
  const weights = ok.map((_, i) => 1 / (i + 1))
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < ok.length; i++) {
    r -= weights[i]
    if (r <= 0) return ok[i].pv[0]
  }
  return ok[0].pv[0]
}
