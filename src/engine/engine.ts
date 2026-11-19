// Stockfish dans le navigateur : il tourne dans un Web Worker (un fil d'exécution séparé),
// donc l'interface reste fluide pendant qu'il calcule. On lui parle en protocole UCI.
// Les demandes sont traitées une par une, dans l'ordre (file d'attente).

export type EngineLine = {
  /** Évaluation du point de vue du camp au trait. */
  cp: number | null
  mate: number | null
  /** Coups en notation UCI (ex. e2e4). */
  pv: string[]
  depth: number
}

export type AnalyseOptions = {
  depth?: number
  movetime?: number
  multipv?: number
  /** Options UCI à régler avant la recherche (ex. { UCI_LimitStrength: true, UCI_Elo: 1500 }). */
  options?: Record<string, string | number | boolean>
}

export class Engine {
  private worker: Worker
  private listeners = new Set<(line: string) => void>()
  private queue: Promise<unknown> = Promise.resolve()
  private ready: Promise<void>
  private currentOptions: Record<string, string> = {}

  constructor() {
    this.worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`)
    this.worker.onmessage = (e) => this.listeners.forEach((l) => l(String(e.data)))
    this.ready = this.waitFor('uci', (l) => l === 'uciok').then(() => this.waitFor('isready', (l) => l === 'readyok')).then(() => {})
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd)
  }

  private waitFor(cmd: string, done: (l: string) => boolean, onLine?: (l: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const listener = (l: string) => {
        onLine?.(l)
        if (done(l)) {
          this.listeners.delete(listener)
          resolve(l)
        }
      }
      this.listeners.add(listener)
      this.send(cmd)
    })
  }

  /** Analyse une position (FEN). Renvoie les meilleures lignes, de la meilleure à la moins bonne. */
  analyse(fen: string, opts: AnalyseOptions = {}): Promise<EngineLine[]> {
    const job = this.queue.then(async () => {
      await this.ready
      const options: Record<string, string | number | boolean> = {
        MultiPV: opts.multipv ?? 1,
        UCI_LimitStrength: false,
        ...opts.options,
      }
      for (const [k, v] of Object.entries(options)) {
        if (this.currentOptions[k] === String(v)) continue
        this.send(`setoption name ${k} value ${v}`)
        this.currentOptions[k] = String(v)
      }
      this.send(`position fen ${fen}`)
      await this.waitFor('isready', (l) => l === 'readyok')
      const lines = new Map<number, EngineLine>()
      const go = opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? 12}`
      await this.waitFor(go, (l) => l.startsWith('bestmove'), (l) => {
        if (!l.startsWith('info') || !l.includes(' pv ')) return
        const mpv = Number(/ multipv (\d+)/.exec(l)?.[1] ?? 1)
        const cp = / score cp (-?\d+)/.exec(l)
        const mate = / score mate (-?\d+)/.exec(l)
        lines.set(mpv, {
          cp: cp ? Number(cp[1]) : null,
          mate: mate ? Number(mate[1]) : null,
          pv: l.split(' pv ')[1].trim().split(' '),
          depth: Number(/ depth (\d+)/.exec(l)?.[1] ?? 0),
        })
      })
      return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
    })
    this.queue = job.catch(() => {})
    return job
  }

  /** Arrête net le moteur (on quitte la page). */
  terminate() {
    this.worker.terminate()
  }
}

/** Convertit une évaluation en centipions comparables (mat = ±10000, plus rapide = plus grand). */
export function toCp(line: Pick<EngineLine, 'cp' | 'mate'>): number {
  if (line.mate !== null) return line.mate > 0 ? 10000 - line.mate * 10 : -10000 - line.mate * 10
  return line.cp ?? 0
}
