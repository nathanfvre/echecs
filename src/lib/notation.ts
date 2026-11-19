// Conversion entre la notation anglaise (utilisée en interne par chess.js
// et dans les PGN) et la notation française affichée à l'écran.
//   anglais : K Q R B N   →   français : R D T F C

const EN_TO_FR: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' }
const FR_TO_EN: Record<string, string> = { R: 'K', D: 'Q', T: 'R', F: 'B', C: 'N' }

// Les colonnes (a–h) sont en minuscules : seules les majuscules désignent des pièces,
// donc un simple remplacement lettre par lettre suffit (ex. "Nxe5" → "Cxe5", "e8=Q+" → "e8=D+").
export function sanToFr(san: string): string {
  return san.replace(/[KQRBN]/g, (l) => EN_TO_FR[l])
}

export function frToSan(fr: string): string {
  return fr.replace(/[RDTFC]/g, (l) => FR_TO_EN[l])
}

export const PIECE_NAMES_FR: Record<string, string> = {
  k: 'roi',
  q: 'dame',
  r: 'tour',
  b: 'fou',
  n: 'cavalier',
  p: 'pion',
}
