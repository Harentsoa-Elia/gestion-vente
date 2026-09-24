import { cn } from "@/utils"
import { PERIODES, type Periode } from "@/lib/evenements"

/** Onglets de période, comme "All / Today / This weekend" sur Eventbrite. */
export function FiltrePeriode({ valeur, onChange }: { valeur: Periode; onChange: (p: Periode) => void }) {
  return (
    <div role="group" aria-label="Filtrer par date" className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {PERIODES.map((p) => (
        <button
          key={p.valeur}
          type="button"
          aria-pressed={valeur === p.valeur}
          onClick={() => onChange(p.valeur)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            valeur === p.valeur
              ? "border-gw-nuit bg-gw-nuit text-white"
              : "border-gw-bordure text-gw-texte hover:border-gw-nuit",
          )}
        >
          {p.libelle}
        </button>
      ))}
    </div>
  )
}
