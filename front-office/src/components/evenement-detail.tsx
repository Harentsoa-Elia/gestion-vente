"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { fetchEvenementById } from "@/services/evenementService"
import PropositionsList from "@/components/propositions-list"
import type { Evenement } from "@/types"

interface EvenementDetailProps {
  evenementId: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function EvenementDetail({ evenementId }: EvenementDetailProps) {
  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvenementById(evenementId)
      .then(setEvenement)
      .catch((err) => setError(err instanceof Error ? err.message : "Evenement introuvable"))
      .finally(() => setLoading(false))
  }, [evenementId])

  if (loading) {
    return <p className="text-center py-16 text-muted-foreground">Chargement...</p>
  }

  if (error || !evenement) {
    return <p className="text-center py-16 text-red-600">{error || "Evenement introuvable."}</p>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche : image + description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#3B82F6] flex items-center justify-center text-white/70">
            Image a venir
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{evenement.titre}</h1>
            <p className="text-muted-foreground whitespace-pre-line">{evenement.description}</p>
          </div>
        </div>

        {/* Colonne droite : infos pratiques + reservation */}
        <div>
          <Card className="rounded-2xl shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                {formatDate(evenement.date_debut)}
              </div>
              {evenement.capacite != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-[#3B82F6]" />
                  Capacite : {evenement.capacite} places
                </div>
              )}
              <div className="text-2xl font-bold text-[#0F172A]">
                {evenement.prix_a_partir_de != null
                  ? `${evenement.prix_a_partir_de.toLocaleString("fr-FR")} Ar`
                  : "Prix a confirmer"}
              </div>
              <Button asChild className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                <Link href={`/evenements/${evenement.id}/reserver`}>Reserver</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactions publiques */}
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Reactions et avis</h2>
        <PropositionsList evenementId={evenement.id} />
      </div>
    </div>
  )
}