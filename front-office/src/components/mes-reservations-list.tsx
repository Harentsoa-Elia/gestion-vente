"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchMesReservations } from "@/services/reservationService"
import type { Reservation } from "@/types"

const STATUT_LABELS: Record<string, { label: string; className: string }> = {
  confirmee: { label: "Confirmee", className: "bg-[#22C55E] text-white" },
  en_attente: { label: "En attente de paiement", className: "bg-[#F59E0B] text-white" },
  annulee: { label: "Annulee", className: "bg-gray-400 text-white" },
}

export function MesReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMesReservations()
      .then(setReservations)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground">Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (reservations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Vous n'avez pas encore de reservation.</p>
        <Link href="/evenements" className="text-[#3B82F6] hover:underline">
          Decouvrir les evenements
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reservations.map((reservation) => {
        const statut = STATUT_LABELS[reservation.statut] || {
          label: reservation.statut,
          className: "bg-gray-300",
        }
        return (
          <Card key={reservation.id} className="rounded-xl">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Reservation #{reservation.id}</p>
                <p className="text-sm text-muted-foreground">
                  Evenement #{reservation.evenement_id} ·{" "}
                  {new Date(reservation.date_reservation).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statut.className}>{statut.label}</Badge>
                {reservation.statut === "confirmee" && (
                  <Link
                    href={`/evenements/${reservation.evenement_id}/reserver`}
                    className="text-sm text-[#3B82F6] hover:underline"
                  >
                    Voir le billet
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}