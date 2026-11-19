import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Bienvenue !</h1>
      <p className="mt-2 text-stone-600">
        Objectif : <strong>1000 Elo en partie rapide</strong>, en séances de 20 à 40 minutes.
        Ici on pratique beaucoup et on lit peu.
      </p>
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
