"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAllEvenements } from "@/services/evenementService"
import { fetchReservationsByEvenement } from "@/services/reservationService"
import { fetchUserData } from "@/services/auth.service"
import type { Evenement, ReservationDetail, AuthUser } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAr(montant: number) {
  return `${montant.toLocaleString("fr-FR")} Ar`
}

const STATUT_STYLES: Record<string, string> = {
  confirmee: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  en_attente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: "Confirmee",
  en_attente: "En attente",
}

export function OrganisateurReservations() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [evenementId, setEvenementId] = useState<number | null>(null)
  const [reservations, setReservations] = useState<ReservationDetail[]>([])
  const [recherche, setRecherche] = useState("")
  const [loadingEvenements, setLoadingEvenements] = useState(true)
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAllEvenements(), fetchUserData()])
      .then(([evenementsData, user]: [Evenement[], AuthUser]) => {
        const mesEvenements = evenementsData.filter((e) => e.organisateur_id === user.id)
        setEvenements(mesEvenements)
        if (mesEvenements.length > 0) {
          setEvenementId(mesEvenements[0].id)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoadingEvenements(false))
  }, [])

  useEffect(() => {
    if (evenementId === null) return
    setLoadingReservations(true)
    fetchReservationsByEvenement(evenementId)
      .then(setReservations)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoadingReservations(false))
  }, [evenementId])

  const reservationsFiltrees = reservations.filter((r) => {
    const texte = `${r.participant.nom} ${r.participant.prenom} ${r.participant.email}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })

  if (loadingEvenements) {
    return <p className="text-center py-16 text-muted-foreground dark:text-gray-400">Chargement...</p>
  }

  if (error) {
    return <p className="text-center py-16 text-red-600">{error}</p>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Reservations</h1>
        <p className="text-muted-foreground dark:text-gray-400">Consultez les reservations de vos evenements</p>
      </div>

      {evenements.length === 0 ? (
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Vous n'avez pas encore cree d'evenement.
        </p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={evenementId ?? ""}
              onChange={(e) => setEvenementId(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1E293B] dark:text-white text-sm"
            >
              {evenements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titre}
                </option>
              ))}
            </select>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un participant..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1E293B] dark:text-white text-sm"
              />
            </div>
          </div>

          <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">
                {reservationsFiltrees.length} reservation{reservationsFiltrees.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingReservations ? (
                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
                  Chargement des reservations...
                </p>
              ) : reservationsFiltrees.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
                  Aucune reservation pour cet evenement.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="pb-2 pr-4 font-medium">Participant</th>
                        <th className="pb-2 pr-4 font-medium">Categorie</th>
                        <th className="pb-2 pr-4 font-medium">Prix</th>
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservationsFiltrees.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-[#0F172A] dark:text-white">
                              {r.participant.prenom} {r.participant.nom}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">{r.participant.email}</p>
                          </td>
                          <td className="py-3 pr-4 text-[#0F172A] dark:text-gray-200">{r.categorie_billet.nom}</td>
                          <td className="py-3 pr-4 text-[#0F172A] dark:text-gray-200">
                            {formatAr(r.categorie_billet.prix)}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground dark:text-gray-400">
                            {formatDate(r.date_reservation)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                STATUT_STYLES[r.statut] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {STATUT_LABELS[r.statut] ?? r.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}