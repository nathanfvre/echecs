// Thèmes de puzzles retenus (noms Lichess → français) et quota visé dans la sélection.

export type Puzzle = {
  id: string
  /** Position AVANT le coup de l'adversaire (convention Lichess). */
  fen: string
  /** Coups en notation UCI séparés par des espaces : le 1er est celui de l'adversaire. */
  moves: string
  rating: number
  themes: string[]
}

export const PUZZLE_THEMES: { key: string; label: string; quota: number; hint: string }[] = [
  { key: 'mateIn1', label: 'Mat en 1', quota: 500, hint: 'Un seul coup suffit pour mater. Regarde tous les échecs.' },
  { key: 'mateIn2', label: 'Mat en 2', quota: 400, hint: 'Commence par un échec (ou une menace) qui ne laisse presque aucun choix.' },
  { key: 'backRankMate', label: 'Mat du couloir', quota: 250, hint: 'Le roi est enfermé derrière ses pions : vise la dernière rangée.' },
  { key: 'hangingPiece', label: 'Pièce en prise', quota: 500, hint: 'Une pièce adverse n’est pas (assez) protégée.' },
  { key: 'fork', label: 'Fourchette', quota: 500, hint: 'Une de tes pièces peut attaquer deux cibles à la fois.' },
  { key: 'pin', label: 'Clouage', quota: 400, hint: 'Une pièce adverse ne peut pas bouger sans exposer une pièce plus importante derrière elle.' },
  { key: 'skewer', label: 'Enfilade', quota: 250, hint: 'Attaque une pièce importante : quand elle bouge, celle de derrière tombe.' },
  { key: 'discoveredAttack', label: 'Attaque à la découverte', quota: 300, hint: 'En bougeant une pièce, tu ouvres la ligne d’une autre.' },
  { key: 'doubleCheck', label: 'Échec double', quota: 100, hint: 'Deux pièces donnent échec en même temps : le roi doit bouger.' },
  { key: 'capturingDefender', label: 'Élimination du défenseur', quota: 250, hint: 'Prends la pièce qui protège la cible.' },
  { key: 'deflection', label: 'Déviation', quota: 250, hint: 'Force une pièce adverse à quitter son poste de défense.' },
  { key: 'attraction', label: 'Attraction', quota: 200, hint: 'Attire une pièce adverse (souvent le roi) sur une mauvaise case.' },
  { key: 'trappedPiece', label: 'Pièce piégée', quota: 200, hint: 'Une pièce adverse n’a plus de case de fuite.' },
  { key: 'promotion', label: 'Promotion', quota: 150, hint: 'Un pion est tout près de devenir dame.' },
]

export const THEME_LABEL: Record<string, string> = Object.fromEntries(PUZZLE_THEMES.map((t) => [t.key, t.label]))
