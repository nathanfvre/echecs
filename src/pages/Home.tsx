import { Link } from 'react-router-dom'
import { ALL_LESSONS } from '../content'
import { today, useProgress } from '../lib/progress'
import { isDue } from '../lib/srs'
import { streaks } from '../lib/stats'

export function Home() {
  const p = useProgress()
  const due = Object.values(p.cards).filter((c) => isDue(c, today())).length
  const next = ALL_LESSONS.find((l) => !p.lessons[l.id]?.passed)
  const streak = streaks(p.days, today()).current
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Bienvenue !</h1>
      <p className="mt-2 text-stone-600">
        Objectif : <strong>1000 Elo en partie rapide</strong>, en séances de 20 à 40 minutes.
        Ici on pratique beaucoup et on lit peu.
      </p>
      <div className="mt-6 rounded-lg border border-accent/30 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Ta séance du jour</h2>
          {streak > 0 && <span className="text-sm text-stone-500">🔥 {streak} jour{streak > 1 ? 's' : ''} de suite</span>}
        </div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {due > 0 && (
            <li>
              <Link to="/revisions" className="text-accent hover:underline">Révisions ({due})</Link>
            </li>
          )}
          {next && (
            <li>
              <Link to={`/cours/${next.id}`} className="text-accent hover:underline">Leçon : {next.title}</Link>
            </li>
          )}
          <li>
            <Link to="/puzzles" className="text-accent hover:underline">Puzzles</Link> ou{' '}
            <Link to="/jouer" className="text-accent hover:underline">une partie</Link>
          </li>
        </ol>
        <Link to="/progres" className="mt-2 inline-block text-sm text-stone-500 hover:underline">
          Tableau de bord et plan d'entraînement →
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card to="/libre" title="Échiquier libre" text="Déplace les pièces, teste des coups, charge une position." />
        <Card to="/cours" title="Le cours" text="Modules 0 à 9, des bases jusqu'à 1000 Elo." />
        <Card to="/puzzles" title="Puzzles" text="Tactique par thème avec révisions espacées." />
        <Card to="/jouer" title="Jouer contre le bot" text="Niveau réglable, analyse de la partie." />
      </div>
    </div>
  )
}

function Card({ to, title, text, soon }: { to: string; title: string; text: string; soon?: boolean }) {
  return (
    <Link to={to} className="rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {soon && <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500">bientôt</span>}
      </div>
      <p className="mt-1 text-sm text-stone-500">{text}</p>
    </Link>
  )
}
