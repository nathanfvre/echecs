import { OpeningsPage } from './features/openings/OpeningsPage'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Sandbox } from './pages/Sandbox'
import { Placeholder } from './pages/Placeholder'
import { Backup } from './pages/Backup'
import { CoursePage } from './features/course/CoursePage'
import { LessonPage } from './features/course/LessonPlayer'
import { PuzzlePage } from './features/puzzles/PuzzlePage'
import { ReviewPage } from './features/review/ReviewPage'
import { PlayPage } from './features/play/PlayPage'
import { AnalysisPage } from './features/analysis/AnalysisPage'
import { today, useProgress } from './lib/progress'
import { isDue } from './lib/srs'

const NAV = [
  { to: '/', label: 'Accueil', icon: '♔' },
  { to: '/cours', label: 'Cours', icon: '♕' },
  { to: '/puzzles', label: 'Puzzles', icon: '♘' },
  { to: '/revisions', label: 'Révisions', icon: '↻' },
  { to: '/ouvertures', label: 'Ouvertures', icon: '♗' },
  { to: '/jouer', label: 'Jouer', icon: '♖' },
  { to: '/analyse', label: 'Analyse', icon: '♙' },
  { to: '/progres', label: 'Progrès', icon: '★' },
  { to: '/libre', label: 'Échiquier libre', icon: '▦' },
]

// HashRouter : les adresses ressemblent à /#/cours. C'est ce qui permet à
// GitHub Pages de servir toutes les pages sans configuration particulière.
export default function App() {
  const progress = useProgress()
  const due = Object.values(progress.cards).filter((c) => isDue(c, today())).length
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto bg-stone-900 p-2 text-stone-200 md:w-52 md:flex-col md:p-3">
          <div className="hidden px-2 pb-4 pt-1 text-lg font-semibold text-white md:block">♞ Échecs 0→1000</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-accent text-white' : 'hover:bg-stone-800'
                }`
              }
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
              {n.to === '/revisions' && due > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-stone-900">{due}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libre" element={<Sandbox />} />
            <Route path="/cours" element={<CoursePage />} />
            <Route path="/cours/:lessonId" element={<LessonPage />} />
            <Route path="/puzzles" element={<PuzzlePage />} />
            <Route path="/revisions" element={<ReviewPage />} />
            <Route path="/ouvertures" element={<OpeningsPage />} />
            <Route path="/jouer" element={<PlayPage />} />
            <Route path="/analyse" element={<AnalysisPage />} />
            <Route
              path="/progres"
              element={
                <div className="space-y-6">
                  <Placeholder title="Tableau de bord" phase="f" />
                  <Backup />
                </div>
              }
            />
            <Route path="*" element={<Placeholder title="Page introuvable" phase="—" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
