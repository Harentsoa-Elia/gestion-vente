"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { fetchDashboardEvenement, fetchEvenementsPopulaires } from "@/services"
import type { DashboardEvenement, EvenementPopulaire } from "@/types"
import { toast } from "sonner"
import { Ticket, Heart, TrendingUp, Users } from "lucide-react"

interface EvenementDashboardProps {
  evenementId: number
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EvenementDashboard({ evenementId }: EvenementDashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardEvenement | null>(null)
  const [populaires, setPopulaires] = useState<EvenementPopulaire[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const charger = async () => {
      try {
        const [dashboardData, populairesData] = await Promise.all([
          fetchDashboardEvenement(evenementId),
          fetchEvenementsPopulaires(),
        ])
        setDashboard(dashboardData)
        setPopulaires(populairesData)
      } catch (err: any) {
        toast.error(err.message || "Erreur lors du chargement du dashboard.")
      } finally {
        setLoading(false)
      }
    }
    charger()
  }, [evenementId])

  if (loading) {
    return <p className="text-gray-500">Chargement...</p>
  }

  if (!dashboard) {
    return <p className="text-gray-500">Aucune donnee disponible.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Score de popularite"
          value={dashboard.score_popularite.toString()}
          icon={<Heart className="w-5 h-5" />}
        />
        <MetricCard
          title="Niveau d'interet estime"
          value={dashboard.niveau_interet_estime !== null ? `${dashboard.niveau_interet_estime}%` : "N/A"}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Participation estimee"
          value={dashboard.participation_estimee !== null ? dashboard.participation_estimee.toString() : "N/A"}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Taux de remplissage"
          value={dashboard.taux_remplissage !== null ? `${dashboard.taux_remplissage}%` : "Non disponible"}
          icon={<Ticket className="w-5 h-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evenements les plus populaires</CardTitle>
        </CardHeader>
        <CardContent>
          {populaires.length === 0 ? (
            <p className="text-gray-500">Aucun evenement pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {populaires.map((evenement, index) => (
                <div
                  key={evenement.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium">{evenement.titre}</span>
                  </div>
                  <span className="text-sm text-gray-500">Score : {evenement.score_popularite}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}