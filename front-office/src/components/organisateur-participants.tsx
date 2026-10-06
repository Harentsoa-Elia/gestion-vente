"use client"

import { useVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useState } from "react"
import { CalendarDays, Mail, Phone, Search, Ticket, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMesParticipants } from "@/services/reservationService"
import type { ParticipantOrganisateur } from "@/types"
import { AvatarParticipant } from "@/components/avatar-participant"
import { BoutonDetails, PanneauDetails, ligneCliquable } from "@/components/organisateur/panneau-details"
import { formaterTelephone } from "@/lib/billetterie"

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
  /** participant ouvert dans le panneau « Détails » */
  const [detail, setDetail] = useState<ParticipantOrganisateur | null>(null)

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
  // pagination : 5 lignes par page
  const { visibles: participantsFiltresVisibles, bouton: boutonVoirPlus } = useVoirPlus(participantsFiltres)

  if (loading) return <p className="text-center py-16 text-muted-foreground dark:text-gray-400">Chargement...</p>
  if (error) return <p className="text-center py-16 text-red-600">{error}</p>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Participants</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Les personnes ayant réservé pour vos événements
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un participant…"
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
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 pr-4 font-medium">Participant</th>
                    <th className="pb-2 pr-4 text-right font-medium">Réservations</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Détails</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participantsFiltresVisibles.map((p) => (
                    <tr key={p.id} onClick={() => setDetail(p)} className={ligneCliquable(detail?.id === p.id)}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <AvatarParticipant prenom={p.prenom} nom={p.nom} avatar={p.avatar} className="h-9 w-9 text-xs" />
                          <p className="min-w-0 truncate font-medium text-[#0F172A] dark:text-white">
                            {p.prenom} {p.nom}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[#0F172A] dark:text-gray-200">{p.nb_reservations}</td>
                      <td className="py-3 text-right">
                        <BoutonDetails onClick={() => setDetail(p)} />
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

      <PanneauDetails
        ouvert={detail !== null}
        onFermer={() => setDetail(null)}
        titre={detail ? `${detail.prenom} ${detail.nom}` : ""}
        visuel={detail && <AvatarParticipant prenom={detail.prenom} nom={detail.nom} avatar={detail.avatar} className="h-16 w-16 text-lg" />}
        chiffres={
          detail
            ? [
                { icone: Ticket, libelle: "Réservations", valeur: detail.nb_reservations },
                { icone: Wallet, libelle: "Total dépensé", valeur: formatAr(detail.montant_total_depense) },
              ]
            : []
        }
        lignes={
          detail
            ? [
                { icone: Mail, libelle: "E-mail", contenu: detail.email },
                { icone: Phone, libelle: "Téléphone", contenu: detail.telephone ? formaterTelephone(detail.telephone) : "—" },
                { icone: CalendarDays, libelle: "Dernière réservation", contenu: formatDate(detail.derniere_reservation) },
              ]
            : []
        }
      />
    </div>
  )
}