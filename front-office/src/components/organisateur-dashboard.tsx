"use client"

import { useEffect, useState } from "react"
import {
  CalendarCheck,
  Ticket,
  Percent,
  Wallet,
  Calendar,
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
import { fetchUserData } from "@/services/auth.service"
import { fetchAllEvenements } from "@/services/evenementService"
import type { DashboardOrganisateur, AuthUser, Evenement } from "@/types"

function formatAr(montant: number) {
  return `${montant.toLocaleString("fr-FR")} Ar`
}

function formatDateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

function formatDateLongue(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function getSalutation() {
  const heure = new Date().getHours()
  if (heure < 12) return "Bonjour"
  if (heure < 18) return "Bon apres-midi"
  return "Bonsoir"
}

const KPI_CONFIG = [
  { key: "evenements_publies", label: "Evenements publies", icon: CalendarCheck, color: "#3B82F6" },
  { key: "billets_vendus", label: "Billets vendus", icon: Ticket, color: "#22C55E" },
  { key: "taux_remplissage_moyen", label: "Taux de remplissage moyen", icon: Percent, color: "#F59E0B" },
  { key: "recettes_totales", label: "Recettes totales", icon: Wallet, color: "#8B5CF6" },
] as const

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente_validation: "En attente",
  valide: "Valide",
  rejete: "Rejete",
}

interface OrganisateurDashboardProps {
  darkMode?: boolean
}

export function OrganisateurDashboard({ darkMode = false }: OrganisateurDashboardProps) {
  const [data, setData] = useState<DashboardOrganisateur | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchDashboardOrganisateur(), fetchUserData(), fetchAllEvenements()])
      .then(([dashboard, userData, evenementsData]) => {
        setData(dashboard)
        setUser(userData)
        setEvenements(evenementsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center py-16 text-muted-foreground dark:text-gray-400">Chargement du dashboard...</p>
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

  const gridColor = darkMode ? "#334155" : "#E5E7EB"
  const tickColor = darkMode ? "#94A3B8" : "#374151"
  const prenom = user?.fullname?.split(" ")[0]

  const prochainsEvenements = evenements
    .filter((e) => new Date(e.date_debut) >= new Date())
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">
            {getSalutation()}{prenom ? `, ${prenom}` : ""}
          </h1>
          <p className="text-muted-foreground dark:text-gray-400">Voici un apercu de vos evenements</p>
        </div>

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
              <Card
                key={key}
                className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}1A` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-[#0F172A] dark:text-white">{value}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">Billets vendus par jour</CardTitle>
            </CardHeader>
            <CardContent>
              {ventesData.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
                  Pas encore de ventes a afficher.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ventesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: tickColor }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="ventes" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">Categories populaires</CardTitle>
            </CardHeader>
            <CardContent>
              {categoriesData.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-10">
                  Pas encore de reservations a afficher.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="categorie" tick={{ fontSize: 12, fill: tickColor }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} />
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

      <div>
        <Card className="rounded-2xl dark:bg-[#1E293B] dark:border-gray-700 sticky top-6">
          <CardHeader>
            <CardTitle className="text-base dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              Prochains evenements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prochainsEvenements.length === 0 ? (
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Aucun evenement a venir.
              </p>
            ) : (
              prochainsEvenements.map((e) => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-[#0F172A]"
                >
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">{e.titre}</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">
                    {formatDateLongue(e.date_debut)}
                  </p>
                  <span
                    className={`inline-block mt-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      e.statut_validation === "valide"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : e.statut_validation === "en_attente_validation"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {STATUT_LABELS[e.statut_validation] ?? e.statut_validation}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}