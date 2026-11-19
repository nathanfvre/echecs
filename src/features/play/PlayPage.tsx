import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Board, type MoveInput } from '../../components/Board'
import { MoveList } from '../../components/MoveList'
import { BOT_LEVELS, chooseBotMove } from '../../engine/bot'
import { useEngine } from '../../engine/useEngine'
import { START_FEN, gameStatus, replay } from '../../lib/chess'
import { recordGame, today } from '../../lib/progress'
import { Button, Panel } from '../course/ui'
import { Checklist, type ChecklistMode } from './Checklist'

type Settings = { color: 'w' | 'b'; level: number; training: boolean; checklist: ChecklistMode }
type SavedGame = { settings: Settings; moves: string[]; resigned?: boolean; recorded?: boolean }

const KEY = 'echecs-partie-en-cours'
const DEFAULT: Settings = { color: 'w', level: 2, training: true, checklist: 'reminder' }

function loadSaved(): SavedGame | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function PlayPage() {
  const [saved, setSaved] = useState<SavedGame | null>(loadSaved)
  // La partie en cours est gardée dans le navigateur : on peut fermer l'onglet et revenir.
  useEffect(() => {
    try {
      if (saved) localStorage.setItem(KEY, JSON.stringify(saved))
      else localStorage.removeItem(KEY)
    } catch {
      /* rien */
    }
  }, [saved])

  if (!saved) return <Setup onStart={(settings) => setSaved({ settings, moves: [] })} />
  return <Game key={JSON.stringify(saved.settings)} saved={saved} setSaved={setSaved} />
}

function Setup({ onStart }: { onStart: (s: Settings) => void }) {
  const [s, setS] = useState<Settings>(() => {
    try {
      return { ...DEFAULT, ...JSON.parse(localStorage.getItem('echecs-reglages-bot') ?? '{}') }
    } catch {
      return DEFAULT
    }
  })
  const [randomColor, setRandomColor] = useState(false)

  function start() {
    try {
      localStorage.setItem('echecs-reglages-bot', JSON.stringify(s))
    } catch {
      /* rien */
    }
    onStart({ ...s, color: randomColor ? (Math.random() < 0.5 ? 'w' : 'b') : s.color })
  }

  const choice = (active: boolean) =>
    `rounded-md border px-3 py-2 text-sm ${active ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white hover:bg-stone-50'}`

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Jouer contre le bot</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Ta couleur</h2>
        <div className="flex gap-2">
          <button className={choice(!randomColor && s.color === 'w')} onClick={() => (setRandomColor(false), setS({ ...s, color: 'w' }))}>
            ♔ Blancs
          </button>
          <button className={choice(!randomColor && s.color === 'b')} onClick={() => (setRandomColor(false), setS({ ...s, color: 'b' }))}>
            ♚ Noirs
          </button>
          <button className={choice(randomColor)} onClick={() => setRandomColor(true)}>
            Au hasard
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Niveau du bot</h2>
        <div className="grid grid-cols-4 gap-2">
          {BOT_LEVELS.map((l) => (
            <button key={l.id} className={choice(s.level === l.id)} onClick={() => setS({ ...s, level: l.id })}>
              <div className="font-medium">{l.id}</div>
              <div className="text-xs opacity-80">{l.elo}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          Les Elo sont des estimations. Commence au niveau 1 ou 2 ; monte quand tu gagnes 2 parties sur 3.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Mode</h2>
        <div className="flex gap-2">
          <button className={choice(s.training)} onClick={() => setS({ ...s, training: true })}>
            Entraînement
          </button>
          <button className={choice(!s.training)} onClick={() => setS({ ...s, training: false })}>
            Partie sérieuse
          </button>
        </div>
        <p className="text-xs text-stone-500">
          {s.training
            ? 'Tu peux annuler tes coups et utiliser la checklist anti-gaffe.'
            : 'Pas de retour en arrière : comme une vraie partie.'}
        </p>
      </section>

      {s.training && (
        <section className="space-y-2">
          <h2 className="font-medium">Checklist anti-gaffe</h2>
          <div className="flex flex-wrap gap-2">
            <button className={choice(s.checklist === 'off')} onClick={() => setS({ ...s, checklist: 'off' })}>
              Désactivée
            </button>
            <button className={choice(s.checklist === 'reminder')} onClick={() => setS({ ...s, checklist: 'reminder' })}>
              Rappel
            </button>
            <button className={choice(s.checklist === 'strict')} onClick={() => setS({ ...s, checklist: 'strict' })}>
              Obligatoire
            </button>
          </div>
          <p className="text-xs text-stone-500">
            « Obligatoire » : l'échiquier reste bloqué tant que tu n'as pas coché les 3 vérifications. Très efficace
            pour prendre l'habitude.
          </p>
        </section>
      )}

      <Button variant="primary" onClick={start}>
        Commencer la partie
      </Button>
    </div>
  )
}

function Game({ saved, setSaved }: { saved: SavedGame; setSaved: (g: SavedGame | null) => void }) {
  const navigate = useNavigate()
  const engine = useEngine()
  const { settings, moves } = saved
  const level = BOT_LEVELS.find((l) => l.id === settings.level) ?? BOT_LEVELS[0]
  const [thinking, setThinking] = useState(false)
  const [checks, setChecks] = useState<boolean[]>([false, false, false])
  const [engineError, setEngineError] = useState(false)

  const game = useMemo(() => replay(START_FEN, moves), [moves])
  const status = gameStatus(game)
  const over = status.over || !!saved.resigned
  const userTurn = game.turn() === settings.color
  const last = game.history({ verbose: true }).at(-1)

  // Le bot joue quand c'est son tour.
  const movesRef = useRef(moves)
  movesRef.current = moves
  useEffect(() => {
    if (over || userTurn) return
    let cancelled = false
    setThinking(true)
    const started = Date.now()
    engine()
      .analyse(game.fen(), level.search)
      .then((lines) => {
        const uci = chooseBotMove(lines, level)
        const san = replay(START_FEN, moves).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
        // Petite pause pour que le coup ne tombe pas instantanément.
        const wait = Math.max(0, 500 - (Date.now() - started))
        setTimeout(() => {
          if (cancelled || movesRef.current !== moves) return
          setSaved({ ...saved, moves: [...moves, san] })
          setThinking(false)
        }, wait)
      })
      .catch(() => {
        setEngineError(true)
        setThinking(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, over, userTurn])

  // Nouvelle vérification à chaque tour.
  useEffect(() => setChecks([false, false, false]), [moves.length])

  // Fin de partie : on l'enregistre une seule fois.
  const result: 'win' | 'loss' | 'draw' = saved.resigned
    ? 'loss'
    : game.isCheckmate()
      ? game.turn() === settings.color
        ? 'loss'
        : 'win'
      : 'draw'
  const pgn = useMemo(() => {
    const g = replay(START_FEN, moves)
    const bot = `Bot niveau ${level.id} (${level.elo})`
    g.setHeader('Event', 'Partie contre le bot')
    g.setHeader('Date', today().replaceAll('-', '.'))
    g.setHeader('White', settings.color === 'w' ? 'Moi' : bot)
    g.setHeader('Black', settings.color === 'b' ? 'Moi' : bot)
    if (over) {
      const r = result === 'draw' ? '1/2-1/2' : (result === 'win') === (settings.color === 'w') ? '1-0' : '0-1'
      g.setHeader('Result', r)
    }
    return g.pgn()
  }, [moves, over, result, settings.color, level])

  useEffect(() => {
    if (!over || saved.recorded) return
    recordGame({ date: today(), source: 'bot', userColor: settings.color, result, level: level.id, pgn })
    setSaved({ ...saved, recorded: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over])

  function handleMove(m: MoveInput) {
    if (!userTurn || thinking || over) return false
    try {
      const san = replay(START_FEN, moves).move(m).san
      setSaved({ ...saved, moves: [...moves, san] })
      return true
    } catch {
      return false
    }
  }

  function undo() {
    // Retire ton dernier coup (et la réponse du bot s'il a déjà répondu).
    const n = userTurn ? 2 : 1
    setSaved({ ...saved, moves: moves.slice(0, Math.max(0, moves.length - n)) })
  }

  const checklistOn = settings.training && settings.checklist !== 'off' && userTurn && !over
  const locked = checklistOn && settings.checklist === 'strict' && !checks.every(Boolean)
  const firstUserMove = settings.color === 'w' ? 1 : 2

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full max-w-[560px] shrink-0 lg:w-[55%]">
        <Board
          fen={game.fen()}
          orientation={settings.color === 'w' ? 'white' : 'black'}
          interactive={userTurn && !thinking && !over && !locked}
          onMove={handleMove}
          lastMove={last}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>
            {level.label} ({level.elo}) · {settings.training ? 'entraînement' : 'partie sérieuse'}
          </span>
        </div>

        {engineError && <Panel tone="error" title="Le moteur n'a pas pu démarrer." text="Recharge la page." />}

        {over ? (
          <Panel
            tone={result === 'win' ? 'success' : result === 'loss' ? 'error' : 'info'}
            title={result === 'win' ? 'Tu as gagné ! 🎉' : result === 'loss' ? 'Tu as perdu.' : 'Partie nulle.'}
            text={saved.resigned ? 'Tu as abandonné.' : status.text}
          />
        ) : (
          <div className="rounded-md bg-white px-3 py-2 font-medium">
            {thinking ? 'Le bot réfléchit…' : userTurn ? `À toi de jouer. ${status.text.includes('échec') ? status.text : ''}` : status.text}
          </div>
        )}

        {checklistOn && !thinking && <Checklist mode={settings.checklist} checks={checks} setChecks={setChecks} />}

        <div className="max-h-56 overflow-y-auto rounded-md bg-white p-3">
          <MoveList moves={moves} />
        </div>

        <div className="flex flex-wrap gap-2">
          {over ? (
            <>
              <Button variant="primary" onClick={() => navigate('/analyse', { state: { pgn, userColor: settings.color } })}>
                🔍 Analyser la partie
              </Button>
              <Button onClick={() => setSaved({ settings, moves: [] })}>Rejouer</Button>
              <Button onClick={() => setSaved(null)}>Changer les réglages</Button>
            </>
          ) : (
            <>
              {settings.training && (
                <Button onClick={undo} disabled={thinking || moves.length < firstUserMove}>
                  ↶ Annuler le coup
                </Button>
              )}
              <Button
                onClick={() => confirm('Abandonner la partie ?') && setSaved({ ...saved, resigned: true })}
                disabled={moves.length < 1}
              >
                🏳 Abandonner
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
