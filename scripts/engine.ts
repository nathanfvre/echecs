// Petit adaptateur pour piloter Stockfish (WASM) depuis Node, en protocole UCI.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export type EngineEval = {
  /** Évaluation du point de vue du camp au trait : centipions, ou mate (positif = on mate). */
  cp: number | null
  mate: number | null
  bestmove: string
  pv: string[]
}

export class Engine {
  private sf: any
  private listeners: ((line: string) => void)[] = []

  static async create(): Promise<Engine> {
    const e = new Engine()
    const init = require('stockfish')
    e.sf = init('lite-single', (line: string) => e.listeners.forEach((l) => l(line)))
    // Selon la version, l'objet renvoyé peut être une promesse.
    if (e.sf && typeof e.sf.then === 'function') e.sf = await e.sf
    await e.cmd('uci', (l) => l === 'uciok')
    await e.cmd('isready', (l) => l === 'readyok')
    return e
  }

  private send(command: string) {
    this.sf.processCommand(command)
  }

  private cmd(command: string, done: (line: string) => boolean, onLine?: (line: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        onLine?.(line)
        if (done(line)) {
          this.listeners = this.listeners.filter((l) => l !== listener)
          resolve(line)
        }
      }
      this.listeners.push(listener)
      this.sf.processCommand(command)
    })
  }

  /** Analyse une position. `moves` (UCI) restreint la recherche à ces coups. `multipv` lignes renvoyées. */
  async analyse(fen: string, depth: number, opts: { searchmoves?: string[]; multipv?: number } = {}): Promise<EngineEval[]> {
    const multipv = opts.multipv ?? 1
    this.send(`setoption name MultiPV value ${multipv}`)
    this.send('ucinewgame')
    this.send(`position fen ${fen}`)
    await this.cmd('isready', (l) => l === 'readyok')
    const lines = new Map<number, EngineEval>()
    const go = `go depth ${depth}` + (opts.searchmoves?.length ? ` searchmoves ${opts.searchmoves.join(' ')}` : '')
    await this.cmd(go, (l) => l.startsWith('bestmove'), (l) => {
      if (!l.startsWith('info') || !l.includes(' pv ')) return
      const mpv = Number(/ multipv (\d+)/.exec(l)?.[1] ?? 1)
      const cp = / score cp (-?\d+)/.exec(l)
      const mate = / score mate (-?\d+)/.exec(l)
      const pv = l.split(' pv ')[1].trim().split(' ')
      lines.set(mpv, { cp: cp ? Number(cp[1]) : null, mate: mate ? Number(mate[1]) : null, bestmove: pv[0], pv })
    })
    return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  }

  quit() {
    try { this.sf.terminate?.() } catch { /* rien */ }
  }
}

/** Convertit une éval en un nombre comparable (mat = ±100000). */
export function score(e: EngineEval): number {
  if (e.mate !== null) return e.mate > 0 ? 100000 - e.mate : -100000 - e.mate
  return e.cp ?? 0
}
