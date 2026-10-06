"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

/*
 * Longues listes de l'espace organisateur : seules les premières lignes s'affichent (5 par défaut),
 * le reste se déplie avec « Voir plus ». Utilisation :
 *
 *   const { visibles, bouton } = useVoirPlus(reservations)
 *   ... visibles.map(...) ...
 *   {bouton}
 *
 * La liste se replie quand son contenu change (autre filtre, autre événement…).
 */

export const LIGNES_VISIBLES = 5

export function useVoirPlus<T>(liste: T[], nombre = LIGNES_VISIBLES) {
  const [ouvert, setOuvert] = useState(false)
  // nouvelle liste (filtre, recherche, autre événement) : on revient aux premières lignes
  useEffect(() => setOuvert(false), [liste.length, nombre])

  const visibles = ouvert ? liste : liste.slice(0, nombre)
  const bouton = (
    <BoutonVoirPlus total={liste.length} visibles={visibles.length} ouvert={ouvert} onBasculer={() => setOuvert((o) => !o)} />
  )
  return { visibles, bouton, ouvert }
}

export function BoutonVoirPlus({
  total,
  visibles,
  ouvert,
  onBasculer,
}: {
  total: number
  visibles: number
  ouvert: boolean
  onBasculer: () => void
}) {
  // rien à déplier : pas de bouton
  if (total <= visibles && !ouvert) return null
  const reste = total - visibles
  return (
    <div className="mt-3 flex flex-col items-center gap-1.5">
      {!ouvert && (
        <p className="text-xs text-gw-texte-doux dark:text-white/50">
          {visibles} sur {total} affichés
        </p>
      )}
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouvert}
        className="inline-flex items-center gap-1.5 rounded-full border border-gw-bordure bg-white px-4 py-1.5 text-sm font-semibold text-gw-violet transition-colors hover:border-gw-violet hover:bg-gw-lavande/30 focus-visible:outline-2 focus-visible:outline-gw-violet dark:border-white/15 dark:bg-white/5 dark:text-gw-lavande dark:hover:bg-white/10"
      >
        {ouvert ? (
          <>
            Voir moins <ChevronUp className="h-4 w-4" aria-hidden />
          </>
        ) : (
          <>
            Voir plus <span className="font-normal opacity-75">({reste})</span> <ChevronDown className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </div>
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
