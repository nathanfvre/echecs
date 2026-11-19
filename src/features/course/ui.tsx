import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { RichText } from '../../components/RichText'

export function Button({ variant = 'secondary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-40'
  const style =
    variant === 'primary'
      ? 'bg-accent text-white hover:brightness-110'
      : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
  return <button {...props} className={`${base} ${style} ${props.className ?? ''}`} />
}

type Tone = 'success' | 'error' | 'info' | 'hint'
const TONES: Record<Tone, string> = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  error: 'bg-red-50 border-red-300 text-red-900',
  info: 'bg-white border-stone-200 text-stone-800',
  hint: 'bg-amber-50 border-amber-300 text-amber-900',
}

export function Panel({ tone = 'info', title, text, children }: { tone?: Tone; title?: string; text?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-md border px-4 py-3 ${TONES[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {text && <RichText text={text} />}
      {children}
    </div>
  )
}

/** Mise en page commune : échiquier à gauche, consignes à droite. */
export function StepLayout({ board, children }: { board: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full max-w-[520px] shrink-0 lg:w-[55%]">{board}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  )
}

export const SQ_GOOD = { backgroundColor: 'rgba(16, 185, 129, 0.55)' }
export const SQ_BAD = { backgroundColor: 'rgba(239, 68, 68, 0.55)' }
export const SQ_MISSED = { backgroundColor: 'rgba(245, 158, 11, 0.6)' }
export const SQ_PICKED = { backgroundColor: 'rgba(59, 130, 246, 0.5)' }
export const SQ_HINT = { boxShadow: 'inset 0 0 0 4px rgba(245, 158, 11, 0.95)' }
export const SQ_DEMO = { backgroundColor: 'rgba(59, 130, 246, 0.35)' }

export function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}
