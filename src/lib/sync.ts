// Sauvegarde en ligne automatique, dans un Gist SECRET de ton compte GitHub.
//
// - Un Gist est un petit fichier hébergé par GitHub. « Secret » : il n'est listé nulle part.
// - Il faut un jeton d'accès GitHub limité aux Gists (créé une fois, collé dans la page Progrès).
// - Règle simple : la version la plus récente (champ updatedAt) gagne. Au démarrage et quand tu reviens
//   sur l'onglet, l'appli récupère la version en ligne si elle est plus récente ; chaque modification
//   est envoyée quelques secondes plus tard.
// - Le jeton reste dans ce navigateur (localStorage) et n'est envoyé qu'à api.github.com.
import { useSyncExternalStore } from 'react'
import { applyRemoteProgress, getProgress, subscribeProgress, type Progress } from './progress'

export const GIST_FILE = 'echecs-progression.json'
const CONFIG_KEY = 'echecs-sync'
const API = 'https://api.github.com'
const DELAY = 4000 // ms entre une modification et son envoi (on regroupe les modifications rapprochées)

export type SyncConfig = { token: string; gistId: string }
export type SyncStatus = { state: 'off' | 'syncing' | 'ok' | 'error'; message?: string; last?: string }

type Fetch = typeof fetch

// --- Appels à l'API GitHub (fetch remplaçable pour les tests) ---

async function api(f: Fetch, token: string, path: string, init: RequestInit = {}) {
  const res = await f(API + path, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (res.status === 401) throw new Error('Jeton refusé par GitHub (invalide ou expiré).')
  if (res.status === 403 || res.status === 404) throw new Error('Accès refusé : le jeton doit avoir le droit « Gists ».')
  if (!res.ok) throw new Error(`GitHub a répondu ${res.status}.`)
  return res.json()
}

/** Cherche le Gist de l'appli dans le compte (cas d'un nouvel appareil), sinon le crée. */
export async function findOrCreateGist(f: Fetch, token: string, content: string): Promise<{ id: string; created: boolean }> {
  for (let page = 1; page <= 5; page++) {
    const list: { id: string; files: Record<string, unknown> }[] = await api(f, token, `/gists?per_page=100&page=${page}`)
    const found = list.find((g) => GIST_FILE in g.files)
    if (found) return { id: found.id, created: false }
    if (list.length < 100) break
  }
  const g = await api(f, token, '/gists', {
    method: 'POST',
    body: JSON.stringify({ description: 'Échecs 0 → 1000 : progression (sauvegarde automatique)', public: false, files: { [GIST_FILE]: { content } } }),
  })
  return { id: g.id, created: true }
}

export async function readGist(f: Fetch, token: string, id: string): Promise<unknown> {
  const g = await api(f, token, `/gists/${id}`)
  const file = g.files?.[GIST_FILE]
  if (!file) return null
  // Au-delà d'1 Mo, GitHub tronque le contenu : il faut le télécharger à part.
  const text = file.truncated ? await (await f(file.raw_url)).text() : file.content
  return JSON.parse(text)
}

export async function writeGist(f: Fetch, token: string, id: string, content: string) {
  await api(f, token, `/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content } } }) })
}

/** Que faire entre la version locale et la version en ligne ? */
export function decide(local: Pick<Progress, 'updatedAt'>, remote: Pick<Progress, 'updatedAt'> | null): 'push' | 'pull' | 'none' {
  if (!remote?.updatedAt) return local.updatedAt ? 'push' : 'none'
  if (!local.updatedAt || remote.updatedAt > local.updatedAt) return 'pull'
  if (local.updatedAt > remote.updatedAt) return 'push'
  return 'none'
}

// --- État de la synchronisation dans l'appli ---

let status: SyncStatus = { state: 'off' }
const listeners = new Set<() => void>()
function setStatus(s: SyncStatus) {
  status = s
  listeners.forEach((l) => l())
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status,
  )
}

export function getConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
let timer: number | undefined
let pulling = false // vrai pendant qu'on applique la version en ligne (ce n'est pas une modification à renvoyer)

/** Compare avec la version en ligne et récupère ou envoie ce qu'il faut. */
export async function syncNow(f: Fetch = fetch.bind(window)) {
  const cfg = getConfig()
  if (!cfg) return
  setStatus({ ...status, state: 'syncing' })
  try {
    const remote = (await readGist(f, cfg.token, cfg.gistId)) as Progress | null
    const local = getProgress()
    const what = decide(local, remote)
    if (what === 'pull') {
      pulling = true
      applyRemoteProgress(remote)
      pulling = false
    } else if (what === 'push') await writeGist(f, cfg.token, cfg.gistId, JSON.stringify(local))
    setStatus({ state: 'ok', last: now(), message: what === 'pull' ? 'Progression récupérée depuis la sauvegarde en ligne.' : undefined })
  } catch (e) {
    pulling = false
    setStatus({ state: 'error', message: e instanceof Error ? e.message : 'Synchronisation impossible (pas de connexion ?).' })
  }
}

let started = false
/** À appeler une fois au démarrage de l'appli. */
export function startSync() {
  if (started) return
  started = true
  subscribeProgress(() => {
    if (pulling || !getConfig()) return
    clearTimeout(timer)
    timer = window.setTimeout(() => syncNow(), DELAY)
  })
  // En revenant sur l'onglet (ou en rallumant l'ordinateur), on vérifie s'il y a plus récent en ligne.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
  // Avant de fermer la page : on tente d'envoyer la dernière modification.
  window.addEventListener('pagehide', () => {
    if (timer !== undefined) syncNow()
  })
  syncNow()
}

/** Première connexion sur cet appareil : vérifie le jeton, retrouve (ou crée) le Gist, synchronise. */
export async function connect(token: string, f: Fetch = fetch.bind(window)): Promise<string | null> {
  setStatus({ state: 'syncing' })
  try {
    const { id } = await findOrCreateGist(f, token.trim(), JSON.stringify(getProgress()))
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: token.trim(), gistId: id }))
    await syncNow(f)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Connexion impossible.'
    setStatus({ state: 'error', message: msg })
    return msg
  }
}

/** Arrête la synchronisation sur cet appareil (la sauvegarde en ligne est conservée). */
export function disconnect() {
  localStorage.removeItem(CONFIG_KEY)
  clearTimeout(timer)
  setStatus({ state: 'off' })
}
