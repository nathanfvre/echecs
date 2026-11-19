export type ChecklistMode = 'off' | 'reminder' | 'strict'

const ITEMS = [
  { title: 'Échecs', text: 'Puis-je donner échec ? Mon roi est-il menacé ?' },
  { title: 'Captures', text: 'Quelles pièces peuvent être prises, des deux côtés ? Les miennes sont-elles défendues ?' },
  { title: 'Menaces', text: "Que veut faire l'adversaire avec son dernier coup ? Mon coup laisse-t-il une pièce sans défense ?" },
]

/** La routine anti-gaffe à faire avant chaque coup : échecs, captures, menaces. */
export function Checklist({
  mode,
  checks,
  setChecks,
}: {
  mode: ChecklistMode
  checks: boolean[]
  setChecks: (c: boolean[]) => void
}) {
  const strict = mode === 'strict'
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="mb-2 font-semibold">
        Avant de jouer, vérifie :{strict && !checks.every(Boolean) && <span className="font-normal"> (coche pour débloquer l'échiquier)</span>}
      </p>
      <ul className="space-y-1.5">
        {ITEMS.map((item, i) => (
          <li key={item.title}>
            <label className={`flex gap-2 ${strict ? 'cursor-pointer' : ''}`}>
              {strict && (
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-700"
                  checked={checks[i]}
                  onChange={(e) => setChecks(checks.map((c, j) => (j === i ? e.target.checked : c)))}
                />
              )}
              <span>
                <strong>{i + 1}. {item.title}</strong> — {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
