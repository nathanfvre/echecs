import { ALL_LESSONS } from '../../content'
import type { Progress } from '../../lib/progress'

/** Une leçon est ouverte si c'est la première, ou si la précédente du parcours est réussie. */
export function isUnlocked(lessonId: string, progress: Progress): boolean {
  const i = ALL_LESSONS.findIndex((l) => l.id === lessonId)
  if (i <= 0) return i === 0
  return !!progress.lessons[ALL_LESSONS[i - 1].id]?.passed
}
