// Plan d'entraînement indicatif : 4 à 5 séances de 20 à 40 minutes par semaine.
// Les durées en semaines sont des repères, pas des obligations : avance à ton rythme.
import type { Progress } from '../lib/progress'
import { bestBotWin, openingsKnown } from '../lib/stats'
import { MODULES } from './index'

export type Session = { title: string; minutes: string; steps: { label: string; to: string; minutes: number }[] }

/** La semaine type. Chaque séance commence par les révisions (5 minutes maximum en général). */
export const WEEK: Session[] = [
  { title: 'Séance 1 — Leçon', minutes: '30 min', steps: [
    { label: 'Révisions du jour', to: '/revisions', minutes: 5 },
    { label: 'Leçon suivante du cours', to: '/cours', minutes: 15 },
    { label: 'Puzzles à ton niveau', to: '/puzzles', minutes: 10 },
  ] },
  { title: 'Séance 2 — Tactique', minutes: '30 min', steps: [
    { label: 'Révisions du jour', to: '/revisions', minutes: 5 },
    { label: 'Puzzles sur ton thème le plus faible', to: '/puzzles', minutes: 15 },
    { label: 'Ouvertures : une ligne nouvelle ou à revoir', to: '/ouvertures', minutes: 10 },
  ] },
  { title: 'Séance 3 — Leçon et partie', minutes: '40 min', steps: [
    { label: 'Révisions du jour', to: '/revisions', minutes: 5 },
    { label: 'Leçon suivante du cours', to: '/cours', minutes: 15 },
    { label: 'Une partie contre le bot (mode entraînement), puis son analyse', to: '/jouer', minutes: 20 },
  ] },
  { title: 'Séance 4 — Partie réelle', minutes: '40 min', steps: [
    { label: 'Révisions du jour', to: '/revisions', minutes: 5 },
    { label: 'Une partie rapide 10+0 sur Lichess', to: '/analyse', minutes: 20 },
    { label: 'Analyse de cette partie, erreurs ajoutées aux révisions', to: '/analyse', minutes: 15 },
  ] },
  { title: 'Séance 5 (facultative) — Mélange', minutes: '20 min', steps: [
    { label: 'Révisions du jour', to: '/revisions', minutes: 5 },
    { label: 'Puzzles', to: '/puzzles', minutes: 10 },
    { label: 'Ouvertures', to: '/ouvertures', minutes: 5 },
  ] },
]

const modulesPassed = (p: Progress, ids: string[]) =>
  MODULES.filter((m) => ids.includes(m.id)).every((m) => m.lessons.every((l) => p.lessons[l.id]?.passed))

export type Milestone = {
  weeks: string
  title: string
  goals: { label: string; done: (p: Progress) => boolean }[]
  /** Repère de niveau de jeu attendu (estimation). */
  level: string
}

export const MILESTONES: Milestone[] = [
  { weeks: 'Semaines 1–2', title: 'Les règles maîtrisées', level: 'premières parties', goals: [
    { label: 'Module 0 terminé', done: (p) => modulesPassed(p, ['m0']) },
    { label: 'Battre le bot niveau 1', done: (p) => bestBotWin(p.games) >= 1 },
  ] },
  { weeks: 'Semaines 3–5', title: 'Ne plus donner de pièces, savoir mater', level: '~500–600 Lichess rapide', goals: [
    { label: 'Modules 1 et 2 terminés', done: (p) => modulesPassed(p, ['m1', 'm2']) },
    { label: 'Classement puzzles 700', done: (p) => p.puzzleRating >= 700 },
    { label: 'Battre le bot niveau 2', done: (p) => bestBotWin(p.games) >= 2 },
  ] },
  { weeks: 'Semaines 6–9', title: 'Les premières tactiques et une ouverture saine', level: '~600–750 Lichess rapide', goals: [
    { label: 'Modules 3 et 4 terminés', done: (p) => modulesPassed(p, ['m3', 'm4']) },
    { label: 'Classement puzzles 850', done: (p) => p.puzzleRating >= 850 },
    { label: 'Battre le bot niveau 3', done: (p) => bestBotWin(p.games) >= 3 },
  ] },
  { weeks: 'Semaines 10–13', title: 'Ton répertoire', level: '~750–850 Lichess rapide', goals: [
    { label: 'Module 5 terminé', done: (p) => modulesPassed(p, ['m5']) },
    { label: '10 lignes d’ouverture en boîte 2 ou plus', done: (p) => openingsKnown(p, 2) >= 10 },
    { label: 'Classement puzzles 950', done: (p) => p.puzzleRating >= 950 },
  ] },
  { weeks: 'Semaines 14–18', title: 'Milieu de partie et finales', level: '~850–950 Lichess rapide', goals: [
    { label: 'Modules 6 et 7 terminés', done: (p) => modulesPassed(p, ['m6', 'm7']) },
    { label: 'Battre le bot niveau 4', done: (p) => bestBotWin(p.games) >= 4 },
    { label: 'Classement puzzles 1050', done: (p) => p.puzzleRating >= 1050 },
  ] },
  { weeks: 'Semaines 19–24', title: 'Objectif 1000', level: '1000 Lichess rapide', goals: [
    { label: 'Modules 8 et 9 terminés', done: (p) => modulesPassed(p, ['m8', 'm9']) },
    { label: 'Classement puzzles 1150', done: (p) => p.puzzleRating >= 1150 },
    { label: 'Battre le bot niveau 5', done: (p) => bestBotWin(p.games) >= 5 },
  ] },
]
