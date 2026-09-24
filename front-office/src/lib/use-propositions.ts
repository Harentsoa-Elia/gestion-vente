"use client"

import { useEffect, useState } from "react"
import { fetchPropositionsAvecScores } from "@/services/propositionService"
import { fetchArtistes } from "@/services/referentielService"
import type { Artiste, Evenement, InteractionType, PropositionAvecScore } from "@/types"

/** Mêmes poids que backend/app/utils/scoring.py (COMMENTAIRE = 0). */
export const POIDS_REACTION: Record<Exclude<InteractionType, "COMMENTAIRE">, number> = {
  LIKE: 1,
  WAOUH: 2,
  FAVORI: 2,
  JADORE: 3,
}

export interface PropositionEnVote extends PropositionAvecScore {
  evenement: Evenement
  artiste?: Artiste
  /** Part du score de cette proposition parmi celles du même type, pour le même événement (0 à 100). */
  part: number
  /** Nombre de propositions concurrentes (même événement, même type). */
  concurrentes: number
}

const NB_EVENEMENTS_CONSULTES = 8
const NB_AFFICHEES = 4

/**
 * Propositions ouvertes au vote sur les prochains événements, les plus soutenues d'abord.
 *
 * L'API ne propose que GET /evenements/{id}/propositions/scores : on interroge donc
 * les 8 prochains événements en parallèle. Un endpoint dédié (ex. GET /propositions/tendances)
 * éviterait ces appels multiples si le catalogue grossit.
 */
export function usePropositionsEnVote(aVenir: Evenement[], pret: boolean) {
  const [propositions, setPropositions] = useState<PropositionEnVote[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!pret) return
    let actif = true
    const evenements = aVenir.slice(0, NB_EVENEMENTS_CONSULTES)

    Promise.allSettled([
      Promise.allSettled(evenements.map((e) => fetchPropositionsAvecScores(e.id))),
      fetchArtistes(),
    ]).then(([resScores, resArtistes]) => {
      if (!actif) return
      const artistes = new Map(
        (resArtistes.status === "fulfilled" ? resArtistes.value : []).map((a) => [a.id, a]),
      )
      const toutes: PropositionEnVote[] = []

      if (resScores.status === "fulfilled") {
        resScores.value.forEach((res, i) => {
          if (res.status !== "fulfilled") return
          const evenement = evenements[i]
          for (const p of res.value) {
            const memeType = res.value.filter((x) => x.type === p.type)
            const total = memeType.reduce((s, x) => s + x.score, 0)
            toutes.push({
              ...p,
              evenement,
              artiste: p.artiste_id != null ? artistes.get(p.artiste_id) : undefined,
              part: total > 0 ? Math.round((p.score / total) * 100) : 0,
              concurrentes: memeType.length - 1,
            })
          }
        })
      }

      toutes.sort((a, b) => b.score - a.score || +new Date(a.evenement.date_debut) - +new Date(b.evenement.date_debut))
      setPropositions(toutes.slice(0, NB_AFFICHEES))
      setChargement(false)
    })

    return () => {
      actif = false
    }
  }, [aVenir, pret])

  return { propositions, chargement }
}
