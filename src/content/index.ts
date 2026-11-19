import type { Lesson, Module } from './types'

// Vite charge automatiquement tous les fichiers JSON des modules au moment du build.
// - module.json : titre et description du module
// - les autres fichiers : une leçon chacun, dans l'ordre alphabétique (01-…, 02-…)
const moduleFiles = import.meta.glob<{ default: Omit<Module, 'lessons'> }>('./modules/*/module.json', { eager: true })
const lessonFiles = import.meta.glob<{ default: Lesson }>(['./modules/*/*.json', '!./modules/*/module.json'], {
  eager: true,
})

export const MODULES: Module[] = Object.entries(moduleFiles)
  .map(([path, mod]) => {
    const dir = path.replace('/module.json', '/')
    const lessons = Object.entries(lessonFiles)
      .filter(([p]) => p.startsWith(dir))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, l]) => l.default)
    return { ...mod.default, lessons }
  })
  .sort((a, b) => a.order - b.order)

export function findLesson(lessonId: string): { module: Module; lesson: Lesson; index: number } | null {
  for (const module of MODULES) {
    const index = module.lessons.findIndex((l) => l.id === lessonId)
    if (index >= 0) return { module, lesson: module.lessons[index], index }
  }
  return null
}

/** Liste à plat de toutes les leçons, dans l'ordre du parcours. */
export const ALL_LESSONS: Lesson[] = MODULES.flatMap((m) => m.lessons)
