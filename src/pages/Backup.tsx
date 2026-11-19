import { useRef, useState } from 'react'
import { exportProgress, importProgress, resetProgress, useProgress } from '../lib/progress'
import { Button } from '../features/course/ui'

/** Sauvegarde : export / import de la progression en fichier JSON. */
export function Backup() {
  const progress = useProgress()
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const passed = Object.values(progress.lessons).filter((l) => l.passed).length

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!confirm('Remplacer ta progression actuelle par celle de ce fichier ?')) return
    const err = importProgress(await file.text())
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Sauvegarde importée.' })
  }

  return (
    <div className="max-w-xl rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Sauvegarde</h2>
      <p className="mt-1 text-sm text-stone-500">
        Ta progression est enregistrée dans ce navigateur ({passed} leçon{passed > 1 ? 's' : ''} réussie
        {passed > 1 ? 's' : ''}). Exporte-la de temps en temps : si tu vides les données du navigateur, elle serait
        perdue.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={exportProgress}>
          ⬇ Exporter
        </Button>
        <Button onClick={() => input.current?.click()}>⬆ Importer</Button>
        <Button
          className="ml-auto text-red-700"
          onClick={() => confirm('Effacer toute ta progression ? (pense à exporter avant)') && resetProgress()}
        >
          Tout effacer
        </Button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  )
}
