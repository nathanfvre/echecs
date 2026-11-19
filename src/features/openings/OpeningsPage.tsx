import { useState } from 'react'
import { recordOpening, today, useProgress } from '../../lib/progress'
import { isDue } from '../../lib/srs'
import { Button } from '../course/ui'
import { GROUPS, OPENING_LINES, cardKey, nameAlong, type OpeningLine } from './data'
import { OpeningDrill, OpeningViewer } from './OpeningDrill'

type Mode = { line: OpeningLine; kind: 'view' | 'drill'; run: number }

/** Entraîneur d'ouvertures : le répertoire, ligne par ligne, avec répétition espacée. */
export function OpeningsPage() {
  const progress = useProgress()
  const [mode, setMode] = useState<Mode | null>(null)
  const [result, setResult] = useState<boolean | null>(null)

  if (mode)
    return (
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{mode.kind === 'view' ? 'Découvrir la ligne' : 'S’entraîner'}</h1>
          <div className="flex gap-2">
            {mode.kind === 'view' && (
              <Button variant="primary" onClick={() => setMode({ ...mode, kind: 'drill', run: mode.run + 1 })}>
                S'entraîner sur cette ligne
              </Button>
            )}
            <Button onClick={() => setMode(null)}>← Toutes les lignes</Button>
          </div>
        </div>
        {mode.kind === 'view' ? (
          <OpeningViewer line={mode.line} />
        ) : (
          <OpeningDrill
            key={mode.run}
            line={mode.line}
            onDone={(ok) => {
              recordOpening(mode.line.id, ok)
              setResult(ok)
              setMode(null)
            }}
          />
        )}
      </div>
    )

  const due = OPENING_LINES.filter((l) => {
    const c = progress.cards[cardKey(l.id)]
    return c && isDue(c, today())
  }).length

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Entraîneur d'ouvertures</h1>
      <p className="text-stone-600">
        Ton répertoire : l'Italienne avec les Blancs (et le Système de Londres en option), 1...e5 et le Gambit dame refusé
        avec les Noirs. Découvre une ligne, puis rejoue-la de mémoire : elle reviendra dans tes <strong>Révisions</strong> à
        intervalles croissants.
        {due > 0 && <strong> {due} ligne(s) à réviser aujourd'hui.</strong>}
      </p>
      {result !== null && (
        <p className={`rounded-md px-4 py-2 text-sm ${result ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
          {result ? 'Ligne réussie : elle reviendra plus tard.' : 'Ligne à retravailler : elle reviendra demain.'}
        </p>
      )}
      {GROUPS.map((g) => (
        <section key={g}>
          <h2 className="mb-2 font-semibold">{g}</h2>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg bg-white shadow-sm">
            {OPENING_LINES.filter((l) => l.group === g).map((l) => {
              const card = progress.cards[cardKey(l.id)]
              const name = nameAlong(l.moves)
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.title}</p>
                    {name && (
                      <p className="truncate text-xs text-stone-500">
                        <span className="font-mono font-semibold">{name.eco}</span> {name.name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">
                    {!card ? 'nouvelle' : isDue(card, today()) ? 'à réviser' : `boîte ${card.box}`}
                  </span>
                  <Button onClick={() => setMode({ line: l, kind: 'view', run: 0 })}>Découvrir</Button>
                  <Button variant="primary" onClick={() => setMode({ line: l, kind: 'drill', run: 0 })}>
                    S'entraîner
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <p className="text-xs text-stone-400">
        Noms et codes ECO : base ouverte lichess-org/chess-openings (CC0). Chaque coup du répertoire est contrôlé par Stockfish.
      </p>
    </div>
  )
}
