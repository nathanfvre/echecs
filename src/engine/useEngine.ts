import { useEffect, useRef } from 'react'
import { Engine } from './engine'

/** Un moteur Stockfish par page, créé à la demande et arrêté quand on quitte la page. */
export function useEngine(): () => Engine {
  const ref = useRef<Engine | null>(null)
  useEffect(
    () => () => {
      ref.current?.terminate()
      ref.current = null
    },
    [],
  )
  return () => (ref.current ??= new Engine())
}
