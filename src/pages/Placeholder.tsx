/** Page provisoire pour les sections qui arrivent dans les phases suivantes. */
export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-xl rounded-lg bg-white p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-stone-500">Cette section arrive à la phase {phase}.</p>
      {children}
    </div>
  )
}
