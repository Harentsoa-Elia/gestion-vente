"use client"

import { useEffect, useState } from "react"
import { fetchPropositionsAvecScores } from "@/services"
import type { PropositionAvecScore } from "@/types"
import PropositionCard from "./proposition-card"
import { toast } from "sonner"

interface PropositionsListProps {
  evenementId: number
}

export default function PropositionsList({ evenementId }: PropositionsListProps) {
  const [propositions, setPropositions] = useState<PropositionAvecScore[]>([])
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    try {
      const data = await fetchPropositionsAvecScores(evenementId)
      setPropositions(data)
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des propositions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    charger()
  }, [evenementId])

  if (loading) {
    return <p className="text-gray-500">Chargement...</p>
  }

  if (propositions.length === 0) {
    return <p className="text-gray-500">Aucune proposition pour cet evenement.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {propositions.map((proposition) => (
        <PropositionCard
          key={proposition.id}
          proposition={proposition}
          onInteractionCreated={charger}
        />
      ))}
    </div>
  )
}