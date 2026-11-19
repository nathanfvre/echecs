import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { recordGame, setLichessUser, today, useProgress } from '../../lib/progress'
import { Button, Panel } from '../course/ui'
import { parsePgn, type ParsedGame } from '../../engine/analysis'
import { AnalysisView } from './AnalysisView'

type LichessGame = {
  id: string
  createdAt: number
  speed: string
  winner?: 'white' | 'black'
  status: string
  players: { white: { user?: { name: string } }; black: { user?: { name: string } } }
  pgn: string
  opening?: { name: string }
}

const SPEED_FR: Record<string, string> = { rapid: 'rapide', classical: 'lente', blitz: 'blitz', bullet: 'bullet' }

export function AnalysisPage() {
  const location = useLocation()
  const fromBot = location.state as { pgn: string; userColor: 'w' | 'b' } | null
  const [current, setCurrent] = useState<{ game: ParsedGame; userColor: 'w' | 'b' } | null>(() => {
    const g = fromBot ? parsePgn(fromBot.pgn) : null
    return g ? { game: g, userColor: fromBot!.userColor } : null
  })

  if (current)
    return (
      <div className="max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analyse de la partie</h1>
          <Button onClick={() => setCurrent(null)}>← Autre partie</Button>
        </div>
        <p className="text-sm text-stone-500">
          {current.game.headers.White ?? '?'} – {current.game.headers.Black ?? '?'}
          {current.game.headers.Result ? ` · ${current.game.headers.Result}` : ''}
        </p>
        <AnalysisView key={current.game.pgn} game={current.game} userColor={current.userColor} />
      </div>
    )

  return <ChooseGame onPick={(game, userColor) => setCurrent({ game, userColor })} />
}

function ChooseGame({ onPick }: { onPick: (g: ParsedGame, c: 'w' | 'b') => void }) {
  const progress = useProgress()
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState(progress.lichessUser)
  const [games, setGames] = useState<LichessGame[] | null>(null)
  const [loading, setLoading] = useState(false)

  function analysePasted() {
    const g = parsePgn(pgn)
    if (!g || g.sans.length === 0) {
      setError('PGN illisible. Copie la partie depuis Lichess (Partager → PGN) ou Chess.com (Partager → PGN).')
      return
    }
    const name = progress.lichessUser.toLowerCase()
    const color = name && g.headers.Black?.toLowerCase() === name ? 'b' : 'w'
    recordGame({ date: today(), source: 'import', userColor: color, result: 'unknown', pgn: g.pgn })
    onPick(g, color)
  }

  async function loadLichess() {
    const name = user.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    setLichessUser(name)
    try {
      // API publique de Lichess : les 15 dernières parties rapides / lentes / blitz du joueur.
      const url = `https://lichess.org/api/games/user/${encodeURIComponent(name)}?max=15&perfType=rapid,classical,blitz&pgnInJson=true&opening=true&clocks=false&evals=false`
      const res = await fetch(url, { headers: { Accept: 'application/x-ndjson' } })
      if (res.status === 404) throw new Error('Joueur introuvable sur Lichess.')
      if (!res.ok) throw new Error(`Lichess a répondu ${res.status}. Réessaie dans une minute.`)
      const text = await res.text()
      setGames(text.trim() ? text.trim().split('\n').map((l) => JSON.parse(l)) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de joindre Lichess.')
    } finally {
      setLoading(false)
    }
  }

  function pickLichess(lg: LichessGame) {
    const g = parsePgn(lg.pgn)
    if (!g) return setError('Cette partie est illisible.')
    const color = lg.players.black.user?.name.toLowerCase() === user.trim().toLowerCase() ? 'b' : 'w'
    const won = lg.winner ? (lg.winner === 'white') === (color === 'w') : null
    recordGame({ date: today(), source: 'import', userColor: color, result: won === null ? 'draw' : won ? 'win' : 'loss', pgn: g.pgn })
    onPick(g, color)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Analyse de parties</h1>
      <p className="text-stone-600">
        Stockfish passe ta partie en revue et signale tes <strong>gaffes</strong>, <strong>erreurs</strong> et{' '}
        <strong>imprécisions</strong>, avec le meilleur coup à chaque fois. Analyse chaque partie jouée : c'est l'habitude
        qui fait le plus progresser.
      </p>

      <section className="space-y-2 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Mes parties Lichess</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5"
            placeholder="Ton pseudo Lichess"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadLichess()}
          />
          <Button variant="primary" onClick={loadLichess} disabled={loading || !user.trim()}>
            {loading ? 'Chargement…' : 'Charger'}
          </Button>
        </div>
        {games && games.length === 0 && <p className="text-sm text-stone-500">Aucune partie rapide, lente ou blitz trouvée.</p>}
        {games && games.length > 0 && (
          <ul className="divide-y divide-stone-100">
            {games.map((g) => {
              const isBlack = g.players.black.user?.name.toLowerCase() === user.trim().toLowerCase()
              const opp = isBlack ? g.players.white.user?.name : g.players.black.user?.name
              const won = g.winner ? (g.winner === 'white') !== isBlack : null
              return (
                <li key={g.id}>
                  <button onClick={() => pickLichess(g)} className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-stone-50">
                    <span
                      className={`w-14 rounded px-1.5 py-0.5 text-center text-xs font-semibold ${
                        won === null ? 'bg-stone-200' : won ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {won === null ? 'Nulle' : won ? 'Gagnée' : 'Perdue'}
                    </span>
                    <span className="flex-1 text-sm">
                      {isBlack ? '♚' : '♔'} contre <strong>{opp ?? 'anonyme'}</strong>
                      <span className="text-stone-500"> · {SPEED_FR[g.speed] ?? g.speed} · {g.opening?.name ?? ''}</span>
                    </span>
                    <span className="text-xs text-stone-400">{new Date(g.createdAt).toLocaleDateString('fr-FR')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Coller un PGN</h2>
        <p className="text-sm text-stone-500">Depuis Lichess ou Chess.com : bouton « Partager » puis copie le PGN.</p>
        <textarea
          className="h-32 w-full rounded-md border border-stone-300 p-2 font-mono text-xs"
          placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 ...'}
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
        />
        <Button variant="primary" onClick={analysePasted} disabled={!pgn.trim()}>
          Analyser
        </Button>
      </section>

      {error && <Panel tone="error" text={error} />}
    </div>
  )
}
