"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMesPaiements } from "@/services/reservationService"
import type { PaiementOrganisateur } from "@/types"

function formatDate(iso: string | null) {
  if (!iso) return "-"
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
  paye: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  en_attente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const STATUT_LABELS: Record<string, string> = {
  paye: "Paye",
  en_attente: "En attente",
}

export function OrganisateurPaiements() {
  const [paiements, setPaiements] = useState<PaiementOrganisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMesPaiements()
      .then(setPaiements)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center py-16 text-muted-foreground dark:text-gray-400">Chargement...</p>
  if (error) return <p className="text-center py-16 text-red-600">{error}</p>

  const totalEncaisse = paiements
    .filter((p) => p.statut_paiement === "paye")
    .reduce((sum, p) => sum + p.montant, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Paiements</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Historique des paiements pour vos evenements
        </p>
      </div>

      <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700 max-w-xs">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground dark:text-gray-400">Total encaisse</p>
          <p className="text-2xl font-bold text-[#0F172A] dark:text-white">{formatAr(totalEncaisse)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base dark:text-white">
            {paiements.length} paiement{paiements.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paiements.length === 0 ? (
            <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
              Aucun paiement pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 pr-4 font-medium">Participant</th>
                    <th className="pb-2 pr-4 font-medium">Evenement</th>
                    <th className="pb-2 pr-4 font-medium">Montant</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3 pr-4 text-[#0F172A] dark:text-white">
                        {p.participant_prenom} {p.participant_nom}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gray-400">
                        {p.evenement_titre}
                      </td>
                      <td className="py-3 pr-4 font-medium text-[#0F172A] dark:text-white">
                        {formatAr(p.montant)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gray-400 capitalize">
                        {p.mode_paiement}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gray-400">
                        {formatDate(p.date_paiement)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            STATUT_STYLES[p.statut_paiement] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUT_LABELS[p.statut_paiement] ?? p.statut_paiement}
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
    </div>
  )
}