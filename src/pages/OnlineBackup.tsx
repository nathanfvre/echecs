import { useState } from 'react'
import { Button } from '../features/course/ui'
import { connect, disconnect, getConfig, syncNow, useSyncStatus } from '../lib/sync'

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Echecs%200-1000%20(sauvegarde)'

/** Réglage de la sauvegarde en ligne automatique (Gist secret GitHub). */
export function OnlineBackup() {
  const status = useSyncStatus()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const on = !!getConfig()

  async function onConnect() {
    setBusy(true)
    await connect(token)
    setBusy(false)
    setToken('')
  }

  return (
    <div className="max-w-xl rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Sauvegarde en ligne automatique</h2>
      {on ? (
        <>
          <p className="mt-1 text-sm text-stone-600">
            Activée : ta progression est enregistrée dans un Gist <strong>secret</strong> de ton compte GitHub, quelques
            secondes après chaque exercice. Sur un autre appareil, colle le même jeton pour la retrouver.
          </p>
          <p className={`mt-2 text-sm ${status.state === 'error' ? 'text-red-600' : 'text-stone-500'}`}>
            {status.state === 'syncing' && 'Synchronisation…'}
            {status.state === 'ok' && `✓ À jour (${status.last})${status.message ? ' — ' + status.message : ''}`}
            {status.state === 'error' && `⚠ ${status.message}`}
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => syncNow()}>Synchroniser maintenant</Button>
            <Button className="ml-auto" onClick={() => confirm('Arrêter la sauvegarde en ligne sur cet appareil ? (La sauvegarde déjà en ligne est conservée.)') && disconnect()}>
              Désactiver sur cet appareil
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-600">
            Pour ne jamais perdre ta progression et la retrouver sur tous tes appareils, l'appli peut l'enregistrer dans
            un <strong>Gist secret</strong> de ton compte GitHub (un petit fichier privé, gratuit).
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
            <li>
              <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="text-accent underline">
                Crée un jeton d'accès GitHub
              </a>{' '}
              : la case <strong>gist</strong> est déjà cochée (ne coche rien d'autre). Choisis une durée (par exemple « No
              expiration »), puis <strong>Generate token</strong>.
            </li>
            <li>Copie le jeton (il commence par <code>ghp_</code>) et colle-le ici :</li>
          </ol>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              autoComplete="off"
              className="flex-1 rounded-md border border-stone-300 px-3 py-1.5"
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button variant="primary" onClick={onConnect} disabled={busy || token.trim().length < 20}>
              {busy ? 'Connexion…' : 'Activer'}
            </Button>
          </div>
          {status.state === 'error' && <p className="mt-2 text-sm text-red-600">⚠ {status.message}</p>}
          <p className="mt-2 text-xs text-stone-400">
            Le jeton reste dans ce navigateur et sert uniquement à lire et écrire ce Gist. Ne le partage avec personne.
          </p>
        </>
      )}
    </div>
  )
}
