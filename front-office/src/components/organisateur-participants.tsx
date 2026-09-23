"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMesParticipants } from "@/services/reservationService"
import type { ParticipantOrganisateur } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatAr(montant: number) {
  return `${montant.toLocaleString("fr-FR")} Ar`
}

export function OrganisateurParticipants() {
  const [participants, setParticipants] = useState<ParticipantOrganisateur[]>([])
  const [recherche, setRecherche] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMesParticipants()
      .then(setParticipants)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const participantsFiltres = participants.filter((p) => {
    const texte = `${p.nom} ${p.prenom} ${p.email}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })

  if (loading) return <p className="text-center py-16 text-muted-foreground dark:text-gray-400">Chargement...</p>
  if (error) return <p className="text-center py-16 text-red-600">{error}</p>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Participants</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Les personnes ayant reserve pour vos evenements
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un participant..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1E293B] dark:text-white text-sm"
        />
      </div>

      <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base dark:text-white">
            {participantsFiltres.length} participant{participantsFiltres.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participantsFiltres.length === 0 ? (
            <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
              Aucun participant pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 pr-4 font-medium">Participant</th>
                    <th className="pb-2 pr-4 font-medium">Telephone</th>
                    <th className="pb-2 pr-4 font-medium">Reservations</th>
                    <th className="pb-2 pr-4 font-medium">Total depense</th>
                    <th className="pb-2 font-medium">Derniere reservation</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsFiltres.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#0F172A] dark:text-white">
                          {p.prenom} {p.nom}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">{p.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gray-400">
                        {p.telephone ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-[#0F172A] dark:text-gray-200">{p.nb_reservations}</td>
                      <td className="py-3 pr-4 text-[#0F172A] dark:text-gray-200">
                        {formatAr(p.montant_total_depense)}
                      </td>
                      <td className="py-3 text-muted-foreground dark:text-gray-400">
                        {formatDate(p.derniere_reservation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}