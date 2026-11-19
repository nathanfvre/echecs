import { describe, expect, it } from 'vitest'
import { GIST_FILE, decide, findOrCreateGist, readGist, writeGist } from './sync'

/** Faux GitHub : enregistre les appels et renvoie des réponses préparées. */
function fakeFetch(responses: Record<string, unknown>) {
  const calls: { url: string; method: string; body?: unknown }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined })
    const key = `${method} ${url.replace('https://api.github.com', '')}`
    const body = responses[key]
    if (body === undefined) return new Response('{}', { status: 404 })
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
  return { f, calls }
}

describe('sauvegarde en ligne (Gist)', () => {
  it('la version la plus récente gagne', () => {
    expect(decide({ updatedAt: '2026-11-19T10:00:00Z' }, { updatedAt: '2026-11-19T09:00:00Z' })).toBe('push')
    expect(decide({ updatedAt: '2026-11-19T09:00:00Z' }, { updatedAt: '2026-11-19T10:00:00Z' })).toBe('pull')
    expect(decide({ updatedAt: '2026-11-19T10:00:00Z' }, { updatedAt: '2026-11-19T10:00:00Z' })).toBe('none')
    // Nouvel appareil (rien en local) : on récupère.
    expect(decide({ updatedAt: '' }, { updatedAt: '2026-11-19T10:00:00Z' })).toBe('pull')
    // Gist vide : on envoie (sauf si rien en local non plus).
    expect(decide({ updatedAt: '2026-11-19T10:00:00Z' }, null)).toBe('push')
    expect(decide({ updatedAt: '' }, null)).toBe('none')
  })

  it('retrouve le Gist existant sur un nouvel appareil', async () => {
    const { f, calls } = fakeFetch({ 'GET /gists?per_page=100&page=1': [{ id: 'autre', files: { 'a.txt': {} } }, { id: 'g1', files: { [GIST_FILE]: {} } }] })
    expect(await findOrCreateGist(f, 'tok', '{}')).toEqual({ id: 'g1', created: false })
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })

  it('crée un Gist SECRET s’il n’existe pas', async () => {
    const { f, calls } = fakeFetch({ 'GET /gists?per_page=100&page=1': [], 'POST /gists': { id: 'neuf' } })
    expect(await findOrCreateGist(f, 'tok', '{"a":1}')).toEqual({ id: 'neuf', created: true })
    const post = calls.find((c) => c.method === 'POST')!.body as { public: boolean; files: Record<string, { content: string }> }
    expect(post.public).toBe(false)
    expect(post.files[GIST_FILE].content).toBe('{"a":1}')
  })

  it('lit et écrit le fichier de progression', async () => {
    const { f, calls } = fakeFetch({ 'GET /gists/g1': { files: { [GIST_FILE]: { content: '{"version":1}', truncated: false } } }, 'PATCH /gists/g1': {} })
    expect(await readGist(f, 'tok', 'g1')).toEqual({ version: 1 })
    await writeGist(f, 'tok', 'g1', '{"version":1,"x":2}')
    expect(calls[1]).toMatchObject({ method: 'PATCH', body: { files: { [GIST_FILE]: { content: '{"version":1,"x":2}' } } } })
  })

  it('explique un jeton refusé', async () => {
    const f = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch
    await expect(readGist(f, 'mauvais', 'g1')).rejects.toThrow(/Jeton refusé/)
  })
})
