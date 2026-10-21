"use client"

import { useVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMesPaiements } from "@/services/reservationService"
import type { PaiementOrganisateur } from "@/types"
import { operateur } from "@/lib/billetterie"

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
  paye: "bg-gw-lavande text-gw-violet-fonce dark:bg-gw-violet-fonce/30 dark:text-gw-violet",
  en_attente: "bg-gw-rose-pale text-gw-rose-action-fonce dark:bg-gw-rose-action-fonce/30 dark:text-gw-rose",
}

const STATUT_LABELS: Record<string, string> = {
  paye: "Payé",
  en_attente: "En attente",
}

export function OrganisateurPaiements() {
  const [paiements, setPaiements] = useState<PaiementOrganisateur[]>([])
  // pagination : 5 lignes par page
  const { visibles: paiementsVisibles, bouton: boutonVoirPlus } = useVoirPlus(paiements)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMesPaiements()
      .then(setPaiements)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center py-16 text-muted-foreground dark:text-gw-texte-pale">Chargement...</p>
  if (error) return <p className="text-center py-16 text-gw-rose-action">{error}</p>

  const totalEncaisse = paiements
    .filter((p) => p.statut_paiement === "paye")
    .reduce((sum, p) => sum + p.montant, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A1A5E] dark:text-white">Paiements</h1>
        <p className="text-muted-foreground dark:text-gw-texte-pale">
          Historique des paiements pour vos événements
        </p>
      </div>

      <Card className="rounded-2xl dark:bg-[#2B1F5C] dark:border-gw-nuit max-w-xs">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground dark:text-gw-texte-pale">Total encaissé</p>
          <p className="text-2xl font-bold text-[#2A1A5E] dark:text-white">{formatAr(totalEncaisse)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl dark:bg-[#2B1F5C] dark:border-gw-nuit">
        <CardHeader>
          <CardTitle className="text-base dark:text-white">
            {paiements.length} paiement{paiements.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paiements.length === 0 ? (
            <p className="text-sm text-muted-foreground dark:text-gw-texte-pale text-center py-10">
              Aucun paiement pour le moment.
            </p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground dark:text-gw-texte-pale border-b border-gw-bordure dark:border-gw-nuit">
                    <th className="pb-2 pr-4 font-medium">Participant</th>
                    <th className="pb-2 pr-4 font-medium">Événement</th>
                    <th className="pb-2 pr-4 font-medium">Montant</th>
                    <th className="pb-2 pr-4 font-medium">Opérateur</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paiementsVisibles.map((p) => (
                    <tr key={p.id} className="border-b border-gw-bordure dark:border-gw-nuit">
                      <td className="py-3 pr-4 text-[#2A1A5E] dark:text-white">
                        {p.participant_prenom} {p.participant_nom}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gw-texte-pale">
                        {p.evenement_titre}
                      </td>
                      <td className="py-3 pr-4 font-medium text-[#2A1A5E] dark:text-white">
                        {formatAr(p.montant)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gw-texte-pale">
                        {operateur(p.mode_paiement)?.nom ?? p.mode_paiement ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-gw-texte-pale">
                        {formatDate(p.date_paiement)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            STATUT_STYLES[p.statut_paiement] ?? "bg-gw-fond text-gw-texte"
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
            {boutonVoirPlus}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}