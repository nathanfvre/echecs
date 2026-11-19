// Copie le moteur Stockfish (WASM, version « lite » mono-thread) depuis node_modules vers public/stockfish/,
// pour que le navigateur puisse le charger. Lancé automatiquement avant `npm run dev` et `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const from = join(import.meta.dirname, '../node_modules/stockfish/bin')
const to = join(import.meta.dirname, '../public/stockfish')
mkdirSync(to, { recursive: true })
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) copyFileSync(join(from, f), join(to, f))
console.log('Stockfish copié dans public/stockfish/')
