// Répétition espacée, système de Leitner à 5 boîtes.
// Un exercice ou puzzle raté entre dans la boîte 1 et revient le lendemain.
// Chaque réussite en révision le fait monter d'une boîte (il revient plus tard) ;
// chaque échec le renvoie en boîte 1. Réussi en boîte 5 : il est considéré comme acquis.

/** Délai (en jours) avant la prochaine révision, selon la boîte (1 à 5). */
export const INTERVALS = [1, 3, 7, 14, 30]

export type Card = {
  /** puzzle:<id Lichess>, exercise:<id d'exercice>, ou mistake:<id> (erreur tirée d'une de tes parties) */
  key: string
  box: number
  /** Date de la prochaine révision (AAAA-MM-JJ). */
  due: string
  lessonId?: string
  /** Pour une erreur de partie : la position, le coup joué et les bons coups selon Stockfish. */
  mistake?: { fen: string; played: string; best: string; accept: string[] }
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('sv-SE')
}

/** Nouvelle carte après un échec : boîte 1, à revoir demain. */
export function failedCard(key: string, today: string, lessonId?: string): Card {
  return { key, box: 1, due: addDays(today, INTERVALS[0]), ...(lessonId ? { lessonId } : {}) }
}

/** Résultat d'une révision. Renvoie null si la carte est acquise (sortie du système). */
export function reviewCard(card: Card, ok: boolean, today: string): Card | null {
  if (!ok) return { ...card, box: 1, due: addDays(today, INTERVALS[0]) }
  if (card.box >= INTERVALS.length) return null
  const box = card.box + 1
  return { ...card, box, due: addDays(today, INTERVALS[box - 1]) }
}

export function isDue(card: Card, today: string): boolean {
  return card.due <= today
}
