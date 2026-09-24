import Link from "next/link"
import type { Categorie } from "@/types"
import { iconeCategorie } from "@/lib/categories"

/** Rangée de catégories en pastilles rondes, comme la barre de catégories d'Eventbrite. */
export function RangeeCategories({ categories }: { categories: Categorie[] }) {
  if (categories.length === 0) return null
  return (
    <nav aria-label="Catégories" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <ul className="flex gap-6 overflow-x-auto pb-2 sm:justify-center sm:gap-10">
        {categories.map((c) => {
          const Icone = iconeCategorie(c.nom)
          return (
            <li key={c.id} className="shrink-0">
              <Link
                href={`/evenements?categorie=${c.id}`}
                className="group flex w-24 flex-col items-center gap-2 text-center focus-visible:outline-none"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gw-bordure text-gw-texte transition-colors group-hover:border-gw-violet group-hover:bg-gw-violet group-hover:text-white group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-gw-violet">
                  <Icone className="h-7 w-7" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="line-clamp-2 text-sm font-medium text-gw-nuit">{c.nom}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
