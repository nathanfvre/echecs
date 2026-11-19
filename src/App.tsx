import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Sandbox } from './pages/Sandbox'
import { Placeholder } from './pages/Placeholder'

const NAV = [
  { to: '/', label: 'Accueil', icon: '♔' },
  { to: '/cours', label: 'Cours', icon: '♕' },
  { to: '/puzzles', label: 'Puzzles', icon: '♘' },
  { to: '/ouvertures', label: 'Ouvertures', icon: '♗' },
  { to: '/jouer', label: 'Jouer', icon: '♖' },
  { to: '/analyse', label: 'Analyse', icon: '♙' },
  { to: '/progres', label: 'Progrès', icon: '★' },
  { to: '/libre', label: 'Échiquier libre', icon: '▦' },
]

// HashRouter : les adresses ressemblent à /#/cours. C'est ce qui permet à
// GitHub Pages de servir toutes les pages sans configuration particulière.
export default function App() {
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
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libre" element={<Sandbox />} />
            <Route path="/cours" element={<Placeholder title="Le cours" phase="b" />} />
            <Route path="/puzzles" element={<Placeholder title="Puzzles" phase="c" />} />
            <Route path="/ouvertures" element={<Placeholder title="Entraîneur d'ouvertures" phase="e" />} />
            <Route path="/jouer" element={<Placeholder title="Jouer contre le bot" phase="d" />} />
            <Route path="/analyse" element={<Placeholder title="Analyse de parties" phase="d" />} />
            <Route path="/progres" element={<Placeholder title="Tableau de bord" phase="f" />} />
            <Route path="*" element={<Placeholder title="Page introuvable" phase="—" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
