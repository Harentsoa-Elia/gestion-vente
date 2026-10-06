"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils"

/*
 * Longues listes de l'espace organisateur : pagination de 5 lignes par page.
 * La liste garde toujours la même hauteur (pas de défilement) ; on change de page avec
 * les flèches ‹ › ou les numéros. Utilisation :
 *
 *   const { visibles, bouton } = useVoirPlus(reservations)
 *   ... visibles.map(...) ...
 *   {bouton}            // la barre de pagination (rien s'il n'y a qu'une page)
 *
 * On revient à la première page quand la liste change (autre filtre, recherche, événement…).
 */

export const LIGNES_VISIBLES = 5

export function useVoirPlus<T>(liste: T[], parPage = LIGNES_VISIBLES) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(liste.length / parPage))
  // nouvelle liste : retour à la première page
  useEffect(() => setPage(1), [liste.length, parPage])
  const courante = Math.min(page, pages)

  const debut = (courante - 1) * parPage
  const visibles = liste.slice(debut, debut + parPage)
  const bouton = (
    <Pagination page={courante} pages={pages} total={liste.length} debut={debut} affiches={visibles.length} onPage={setPage} />
  )
  return { visibles, bouton, page: courante }
}

/** Numéros affichés : 1 … 4 5 6 … 141 (toujours la première, la dernière et les voisines). */
function numeros(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const liste: (number | "…")[] = [1]
  const de = Math.max(2, Math.min(page - 1, pages - 4))
  const a = Math.min(pages - 1, Math.max(page + 1, 5))
  if (de > 2) liste.push("…")
  for (let n = de; n <= a; n++) liste.push(n)
  if (a < pages - 1) liste.push("…")
  liste.push(pages)
  return liste
}

export function Pagination({
  page,
  pages,
  total,
  debut,
  affiches,
  onPage,
}: {
  page: number
  pages: number
  total: number
  debut: number
  affiches: number
  onPage: (page: number) => void
}) {
  // une seule page : pas de barre
  if (pages <= 1) return null
  const fleche =
    "flex h-8 w-8 items-center justify-center rounded-full text-gw-nuit transition-colors hover:bg-gw-lavande/40 disabled:pointer-events-none disabled:opacity-30 dark:text-white dark:hover:bg-white/10"
  return (
    <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gw-bordure pt-3 dark:border-white/10">
      <p className="text-xs text-gw-texte-doux tabular-nums dark:text-white/55">
        {debut + 1}–{debut + affiches} sur {total.toLocaleString("fr-FR")}
      </p>
      <div className="flex items-center gap-0.5">
        <button type="button" className={fleche} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {numeros(page, pages).map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="w-6 text-center text-xs text-gw-texte-doux dark:text-white/45" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors",
                n === page
                  ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit"
                  : "text-gw-texte hover:bg-gw-lavande/40 dark:text-white/75 dark:hover:bg-white/10",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" className={fleche} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  )
}

/** Même chose sous forme de composant, pratique après des « return » anticipés :
 *  <ListeVoirPlus elements={liste}>{(visibles) => <ul>…</ul>}</ListeVoirPlus> */
export function ListeVoirPlus<T>({
  elements,
  nombre = LIGNES_VISIBLES,
  children,
}: {
  elements: T[]
  nombre?: number
  children: (visibles: T[]) => ReactNode
}) {
  const { visibles, bouton } = useVoirPlus(elements, nombre)
  return (
    <>
      {children(visibles)}
      {bouton}
    </>
  )
}
