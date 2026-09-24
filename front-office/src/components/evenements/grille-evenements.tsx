import type { Categorie, Evenement, Lieu } from "@/types"
import { CarteEvenement, CarteEvenementSquelette } from "./carte-evenement"

interface GrilleEvenementsProps {
  evenements: Evenement[]
  lieuxParId: Map<number, Lieu>
  categoriesParId: Map<number, Categorie>
  variante?: "a-venir" | "passe"
  chargement?: boolean
  nbSquelettes?: number
}

export function GrilleEvenements({
  evenements,
  lieuxParId,
  categoriesParId,
  variante = "a-venir",
  chargement = false,
  nbSquelettes = 4,
}: GrilleEvenementsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {chargement
        ? Array.from({ length: nbSquelettes }, (_, i) => <CarteEvenementSquelette key={i} />)
        : evenements.map((e) => (
            <CarteEvenement
              key={e.id}
              evenement={e}
              variante={variante}
              lieu={e.lieu_id != null ? lieuxParId.get(e.lieu_id) : undefined}
              categorie={e.categorie_id != null ? categoriesParId.get(e.categorie_id) : undefined}
            />
          ))}
    </div>
  )
}
