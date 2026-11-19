import { boldSegments } from '../content/logic'

/** Affiche un texte avec **gras** et retours à la ligne (paragraphes). */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {text.split('\n').filter(Boolean).map((para, i) => (
        <p key={i}>
          {boldSegments(para).map(([t, bold], j) => (bold ? <strong key={j}>{t}</strong> : <span key={j}>{t}</span>))}
        </p>
      ))}
    </div>
  )
}
