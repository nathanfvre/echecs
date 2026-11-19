import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ALL_LESSONS, MODULES } from '../../content'
import { MILESTONES, WEEK } from '../../content/plan'
import { today, useProgress, type Progress } from '../../lib/progress'
import { addDays, isDue } from '../../lib/srs'
import { bestBotWin, gameStats, lastDays, streaks, weakThemes } from '../../lib/stats'
import { BOT_LEVELS } from '../../engine/bot'
import { THEME_LABEL } from '../puzzles/themes'
import { Backup } from '../../pages/Backup'

/** Tableau de bord : où j'en suis, ce que je fais aujourd'hui, ce qu'il faut travailler. */
export function DashboardPage() {
  const p = useProgress()
  const t = today()
  const streak = streaks(p.days, t)
  const passed = ALL_LESSONS.filter((l) => p.lessons[l.id]?.passed).length
  const due = Object.values(p.cards).filter((c) => isDue(c, t)).length
  const weak = weakThemes(p.themes)
  const next = ALL_LESSONS.find((l) => !p.lessons[l.id]?.passed)
  const weekAgo = [...p.ratingHistory].reverse().find((h) => h.date <= addDays(t, -7))
  const ratingDelta = weekAgo ? p.puzzleRating - weekAgo.rating : null

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Progrès</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Série en cours" value={`${streak.current} j`} sub={`record : ${streak.best} j`} />
        <Stat label="Leçons réussies" value={`${passed} / ${ALL_LESSONS.length}`} sub={`${Math.round((passed / ALL_LESSONS.length) * 100)} % du cours`} />
        <Stat
          label="Classement puzzles"
          value={String(p.puzzleRating)}
          sub={ratingDelta === null ? `${p.puzzlesSeen.length} puzzles faits` : `${ratingDelta >= 0 ? '+' : ''}${ratingDelta} en 7 jours`}
        />
        <Stat label="À réviser" value={String(due)} sub={`${Object.keys(p.cards).length} carte${Object.keys(p.cards).length > 1 ? 's' : ''} en tout`} />
      </div>

      <Section title="Aujourd'hui">
        <ol className="space-y-2">
          {due > 0 && <Todo to="/revisions" text={`Fais tes révisions (${due} carte${due > 1 ? 's' : ''})`} />}
          {next && <Todo to={`/cours/${next.id}`} text={`Leçon suivante : ${next.title}`} />}
          {weak[0] && (
            <Todo to={`/puzzles?theme=${weak[0].theme}`} text={`Puzzles sur ton thème le plus faible : ${THEME_LABEL[weak[0].theme] ?? weak[0].theme}`} />
          )}
          {!weak[0] && <Todo to="/puzzles" text="10 minutes de puzzles" />}
          <Todo to="/jouer" text="Une partie, puis son analyse" />
        </ol>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Modules">
          <ul className="space-y-2">
            {MODULES.map((m) => {
              const done = m.lessons.filter((l) => p.lessons[l.id]?.passed).length
              return (
                <li key={m.id}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{m.title.replace(/^Module (\d+) — /, '$1. ')}</span>
                    <span className="text-stone-500">
                      {done}/{m.lessons.length}
                    </span>
                  </div>
                  <Bar value={done / m.lessons.length} />
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Thèmes tactiques (puzzles)">
          <ThemeTable p={p} weak={new Set(weak.map((w) => w.theme))} />
        </Section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Classement puzzles">
          <RatingChart history={p.ratingHistory} />
        </Section>
        <Section title="Activité (4 dernières semaines)">
          <Activity days={p.days} today={t} />
        </Section>
      </div>

      <Section title="Parties">
        <Games p={p} />
      </Section>

      <Section title="Jalons vers 1000">
        <p className="mb-3 text-sm text-stone-500">
          Durées indicatives pour 4 à 5 séances par semaine. Les niveaux Lichess sont des estimations : chacun avance à son rythme.
        </p>
        <ol className="space-y-3">
          {MILESTONES.map((m) => {
            const done = m.goals.filter((g) => g.done(p)).length
            const complete = done === m.goals.length
            return (
              <li key={m.title} className={`rounded-md border px-4 py-3 ${complete ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {complete ? '✅ ' : ''}
                    {m.title}
                  </p>
                  <span className="text-xs text-stone-500">
                    {m.weeks} · {m.level}
                  </span>
                </div>
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {m.goals.map((g) => (
                    <li key={g.label} className={g.done(p) ? 'text-emerald-700' : 'text-stone-500'}>
                      {g.done(p) ? '✓' : '○'} {g.label}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-sm text-stone-500">
          Ensuite : <strong>1300 sur Lichess</strong> (environ 1000 sur Chess.com), en continuant le même rythme : parties, analyses,
          révisions et puzzles 1100–1500.
        </p>
      </Section>

      <Section title="Semaine type">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WEEK.map((s) => (
            <div key={s.title} className="rounded-md border border-stone-200 px-4 py-3">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-stone-500">{s.minutes}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {s.steps.map((st) => (
                  <li key={st.label}>
                    <Link to={st.to} className="hover:underline">
                      {st.minutes} min · {st.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Backup />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-stone-400">{sub}</p>
    </div>
  )
}

function Todo({ to, text }: { to: string; text: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-stone-50">
        <span className="text-accent">→</span> {text}
      </Link>
    </li>
  )
}

function Bar({ value, tone = 'bg-accent' }: { value: number; tone?: string }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded bg-stone-100">
      <div className={`h-full ${tone}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

function ThemeTable({ p, weak }: { p: Progress; weak: Set<string> }) {
  const rows = Object.entries(p.themes)
    .filter(([t]) => THEME_LABEL[t])
    .map(([t, s]) => ({ t, ...s, rate: s.ok / s.total }))
    .sort((a, b) => b.total - a.total)
  if (!rows.length) return <p className="text-sm text-stone-500">Fais quelques puzzles : ta réussite par thème apparaîtra ici.</p>
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.t}>
          <div className="flex justify-between text-sm">
            <Link to={`/puzzles?theme=${r.t}`} className="hover:underline">
              {THEME_LABEL[r.t]}
              {weak.has(r.t) && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-800">à travailler</span>}
            </Link>
            <span className="text-stone-500">
              {Math.round(r.rate * 100)} % · {r.total}
            </span>
          </div>
          <Bar value={r.rate} tone={weak.has(r.t) ? 'bg-red-400' : r.rate >= 0.8 ? 'bg-accent' : 'bg-amber-400'} />
        </li>
      ))}
      <li className="pt-1 text-xs text-stone-400">« À travailler » : au moins 5 puzzles et moins de 65 % de réussite.</li>
    </ul>
  )
}

function RatingChart({ history }: { history: { date: string; rating: number }[] }) {
  if (history.length < 2) return <p className="text-sm text-stone-500">La courbe apparaîtra après deux jours de puzzles.</p>
  const pts = history.slice(-60)
  const min = Math.min(...pts.map((h) => h.rating)) - 20
  const max = Math.max(...pts.map((h) => h.rating)) + 20
  const W = 400
  const H = 140
  const x = (i: number) => (i / (pts.length - 1)) * W
  const y = (r: number) => H - ((r - min) / (max - min)) * H
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="Évolution du classement puzzles">
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" points={pts.map((h, i) => `${x(i)},${y(h.rating)}`).join(' ')} />
      </svg>
      <div className="flex justify-between text-xs text-stone-400">
        <span>
          {new Date(pts[0].date + 'T12:00').toLocaleDateString('fr-FR')} · {pts[0].rating}
        </span>
        <span>
          {new Date(pts[pts.length - 1].date + 'T12:00').toLocaleDateString('fr-FR')} · {pts[pts.length - 1].rating}
        </span>
      </div>
    </div>
  )
}

function Activity({ days, today: t }: { days: string[]; today: string }) {
  const list = lastDays(days, t, 28)
  const active = list.filter((d) => d.active).length
  return (
    <div>
      <div className="grid max-w-[16rem] grid-cols-7 gap-1.5">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center text-xs text-stone-400">
            {d}
          </span>
        ))}
        {/* On décale pour que chaque colonne corresponde à un jour de la semaine. */}
        {Array.from({ length: (new Date(list[0].date + 'T12:00').getDay() + 6) % 7 }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {list.map((d) => (
          <span
            key={d.date}
            title={new Date(d.date + 'T12:00').toLocaleDateString('fr-FR')}
            className={`aspect-square rounded ${d.active ? 'bg-accent' : 'bg-stone-100'} ${d.date === t ? 'ring-2 ring-stone-400' : ''}`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {active} jour{active > 1 ? 's' : ''} d'entraînement sur 28 (objectif : 16 à 20).
      </p>
    </div>
  )
}

function Games({ p }: { p: Progress }) {
  const s = gameStats(p.games)
  const best = bestBotWin(p.games)
  const lichess = useLichessRating(p.lichessUser)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <p className="text-sm text-stone-500">Bilan ({s.total} parties)</p>
        <p className="text-lg font-semibold">
          <span className="text-emerald-700">{s.win} V</span> · <span>{s.draw} N</span> · <span className="text-red-700">{s.loss} D</span>
        </p>
        <p className="text-xs text-stone-400">{best ? `Meilleur bot battu : ${BOT_LEVELS[best - 1].label} (${BOT_LEVELS[best - 1].elo})` : 'Aucun bot battu pour l’instant'}</p>
      </div>
      <div>
        <p className="text-sm text-stone-500">Gaffes par partie</p>
        <p className="text-lg font-semibold">{s.blundersPerGame === null ? '—' : s.blundersPerGame.toFixed(1)}</p>
        <p className="text-xs text-stone-400">
          {s.analysed ? `sur les ${s.analysed} dernières parties analysées (objectif : moins de 1)` : 'Analyse tes parties pour voir ce chiffre'}
        </p>
      </div>
      <div>
        <p className="text-sm text-stone-500">Lichess rapide</p>
        <p className="text-lg font-semibold">{lichess ?? '—'}</p>
        <p className="text-xs text-stone-400">
          {p.lichessUser ? `compte ${p.lichessUser}` : (
            <>
              Indique ton pseudo dans <Link to="/analyse" className="underline">Analyse</Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

/** Classement rapide public du compte Lichess (API ouverte, sans connexion). */
function useLichessRating(user: string): string | null {
  const [rating, setRating] = useState<string | null>(null)
  useEffect(() => {
    if (!user) return
    let stop = false
    fetch(`https://lichess.org/api/user/${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        const r = u?.perfs?.rapid
        if (!stop && r) setRating(`${r.rating}${r.prov ? ' ?' : ''}`)
      })
      .catch(() => {})
    return () => {
      stop = true
    }
  }, [user])
  return rating
}
