"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchEvenements } from "@/services/evenementService"
import { fetchCategories, fetchLieux } from "@/services/referentielService"
import type { Categorie, Evenement, Lieu } from "@/types"
import { separerEvenements } from "./evenements"

/**
 * Charge les événements publics, les lieux et les catégories en parallèle.
 * Les lieux et catégories ne sont qu'un complément d'affichage :
 * s'ils échouent, les événements restent affichés.
 */
export function useCatalogue() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    Promise.allSettled([fetchEvenements(), fetchLieux(), fetchCategories()]).then(([ev, li, ca]) => {
      if (!actif) return
      if (ev.status === "fulfilled") setEvenements(ev.value)
      else setErreur("Impossible de charger les événements. Vérifiez votre connexion puis rechargez la page.")
      if (li.status === "fulfilled") setLieux(li.value)
      if (ca.status === "fulfilled") setCategories(ca.value)
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [])

  const { aVenir, passes } = useMemo(() => separerEvenements(evenements), [evenements])
  const lieuxParId = useMemo(() => new Map(lieux.map((l) => [l.id, l])), [lieux])
  const categoriesParId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  return { evenements, aVenir, passes, lieux, categories, lieuxParId, categoriesParId, chargement, erreur }
}

export type Catalogue = ReturnType<typeof useCatalogue>
