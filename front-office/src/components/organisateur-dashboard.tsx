"use client"

import { useEffect, useState } from "react"
import {
  CalendarCheck,
  Ticket,
  Percent,
  Wallet,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDashboardOrganisateur } from "@/services/dashboardService"
import type { DashboardOrganisateur } from "@/types"

function formatAr(montant: number) {
  return `${montant.toLocaleString("fr-FR")} Ar`
}

function formatDateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

const KPI_CONFIG = [
  { key: "evenements_publies", label: "Evenements publies", icon: CalendarCheck, color: "#3B82F6" },
  { key: "billets_vendus", label: "Billets vendus", icon: Ticket, color: "#22C55E" },
  { key: "taux_remplissage_moyen", label: "Taux de remplissage moyen", icon: Percent, color: "#F59E0B" },
  { key: "recettes_totales", label: "Recettes totales", icon: Wallet, color: "#8B5CF6" },
] as const

export function OrganisateurDashboard() {
  const [data, setData] = useState<DashboardOrganisateur | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardOrganisateur()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center py-16 text-muted-foreground">Chargement du dashboard...</p>
  if (error) return <p className="text-center py-16 text-red-600">{error}</p>
  if (!data) return null

  const ventesData = data.ventes_par_jour.map((v) => ({
    date: formatDateCourte(v.date),
    ventes: v.nombre,
  }))

  const categoriesData = data.categories_populaires.map((c) => ({
    categorie: c.categorie,
    reservations: c.nombre,
  }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Tableau de bord Organisateur</h1>
        <p className="text-muted-foreground">Vue d'ensemble de tous vos evenements</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const raw = data[key]
          const value =
            key === "recettes_totales"
              ? formatAr(raw)
              : key === "taux_remplissage_moyen"
              ? `${raw}%`
              : raw.toLocaleString("fr-FR")
          return (
            <Card key={key} className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-[#0F172A]">{value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Billets vendus par jour</CardTitle>
          </CardHeader>
          <CardContent>
            {ventesData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Pas encore de ventes a afficher.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ventesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ventes" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Categories populaires</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Pas encore de reservations a afficher.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="categorie" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="reservations" fill="#22C55E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}