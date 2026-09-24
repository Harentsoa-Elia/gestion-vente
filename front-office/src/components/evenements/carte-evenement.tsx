import type { CSSProperties } from "react"
import Link from "next/link"
import { Eye, MapPin } from "lucide-react"
import type { Categorie, Evenement, Lieu } from "@/types"
import { cn } from "@/utils"
import { iconeCategorie } from "@/lib/categories"
import { formatDateCourte, formatDateLongue, formatPrix, repereTemporel } from "@/lib/evenements"

interface CarteEvenementProps {
  evenement: Evenement
  lieu?: Lieu
  categorie?: Categorie
  /** "passe" : carte d'archive, sans prix ni appel à réserver */
  variante?: "a-venir" | "passe"
}

/**
 * Affiche de l'événement. Tant que l'API ne fournit pas d'image, on dessine
 * une couverture : jeux de lumière de scène, icône de la catégorie et date.
 */
function Couverture({ evenement, categorie, passe }: { evenement: Evenement; categorie?: Categorie; passe: boolean }) {
  const Icone = iconeCategorie(categorie?.nom)
  const d = new Date(evenement.date_debut)
  // teinte dérivée de l'id : deux événements voisins n'ont pas la même couverture
  const teintes = ["var(--color-gw-violet)", "var(--color-gw-rose)", "#8B5CF6", "#C2410C", "#0E7490"]
  const accent = teintes[evenement.id % teintes.length]

  if (evenement.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={evenement.image_url}
        alt=""
        className={cn("h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]", passe && "grayscale")}
      />
    )
  }

  return (
    <div
      className={cn("scene relative h-full w-full", passe && "grayscale")}
      style={{ "--accent": accent } as CSSProperties}
      aria-hidden
    >
      <Icone className="absolute bottom-4 left-4 h-9 w-9 text-white/90" strokeWidth={1.5} />
      <div className="font-titre absolute right-4 bottom-3 text-right leading-none text-white">
        <span className="block text-4xl font-semibold">{d.getDate()}</span>
        <span className="text-sm text-white/80">
          {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
        </span>
      </div>
    </div>
  )
}

export function CarteEvenement({ evenement, lieu, categorie, variante = "a-venir" }: CarteEvenementProps) {
  const passe = variante === "passe"
  const repere = passe ? null : repereTemporel(evenement)
  const prix = formatPrix(evenement.prix_a_partir_de)
  const lieuTexte = lieu ? [lieu.nom, lieu.ville].filter(Boolean).join(", ") : null

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-gw-nuit">
        <Couverture evenement={evenement} categorie={categorie} passe={passe} />
        {categorie && (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gw-nuit">
            {categorie.nom}
          </span>
        )}
        {passe && (
          <span className="absolute top-3 right-3 rounded-full bg-gw-nuit/80 px-2.5 py-1 text-xs font-medium text-white">
            Terminé
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {repere && <p className="text-sm font-semibold text-gw-rose-action">{repere}</p>}
        <h3 className="font-titre mt-0.5 line-clamp-2 text-lg leading-snug font-semibold text-gw-nuit">
          {/* le lien couvre toute la carte */}
          <Link
            href={`/evenements/${evenement.id}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-gw-violet"
          >
            {evenement.titre}
          </Link>
        </h3>

        <p className="mt-1 text-sm text-gw-texte">
          {passe ? formatDateCourte(evenement.date_debut) : formatDateLongue(evenement.date_debut)}
        </p>
        {lieuTexte && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-gw-texte-doux">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{lieuTexte}</span>
          </p>
        )}

        {!passe && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gw-nuit">{prix ?? "Tarifs bientôt annoncés"}</p>
            {!!evenement.nombre_vues && (
              <p className="flex items-center gap-1 text-xs text-gw-texte-doux">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                {evenement.nombre_vues.toLocaleString("fr-FR")} vues
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export function CarteEvenementSquelette() {
  return (
    <div aria-hidden>
      <div className="aspect-[2/1] animate-pulse rounded-xl bg-gw-bordure" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-gw-bordure" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gw-bordure" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gw-bordure" />
    </div>
  )
}
