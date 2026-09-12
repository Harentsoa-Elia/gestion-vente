"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Ticket,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart as BarChartComponent,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import AuthWrapper from "@/components/auth-wrapper"
import { fetchConcertAmount, fetchConcerts, fetchTicketCategoryStats, fetchTicketStats } from "@/services"
import type { Concert } from "@/types"

// ----------------- Types dynamiques -----------------
type TicketStats = { total: number; used: number; unused: number }

// La nouvelle structure est dynamique : clé = nom de catégorie
type DynamicCategoryStats = Record<
  string,
  {
    total: number
    used: number
    unused: number
  }
>

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"]

function DashboardContent() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcertId, setSelectedConcertId] = useState<string>("")
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [concertAmount, setConcertAmount] = useState<any>(null)
  const [catStats, setCatStats] = useState<DynamicCategoryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Charger la liste des concerts
  useEffect(() => {
    fetchConcerts()
      .then(setConcerts)
      .catch(() => setError("Erreur lors du chargement des concerts."))
  }, [])

  // Charger toutes les stats dès qu'un concert est sélectionné
  useEffect(() => {
    if (!selectedConcertId) return
    setLoading(true)
    setError("")

    Promise.all([
      fetchTicketStats(selectedConcertId),
      fetchConcertAmount(selectedConcertId),
      fetchTicketCategoryStats(selectedConcertId),
    ])
      .then(([stats, amount, categories]) => {
        console.log("Ticket stats:", stats)
        console.log("Montants:", amount)
        console.log("Stats par catégorie:", categories)

        setTicketStats(stats)
        setConcertAmount(amount)
        // Le backend renvoie { categories: { "VENTELIVE": {...}, "CHILD": {...} } }
        setCatStats(categories)

      })
      .catch(() => {
        setError("Impossible de charger les données du concert.")
        setTicketStats(null)
        setConcertAmount(null)
        setCatStats(null)
      })
      .finally(() => setLoading(false))
  }, [selectedConcertId])

  // Données pour les graphiques globaux
  const chartData = ticketStats
    ? [
        { name: "Total", value: ticketStats.total },
        { name: "Utilisés", value: ticketStats.used },
        { name: "Non utilisés", value: ticketStats.unused },
      ]
    : []

  // ----------------- Section: catégories dynamiques -----------------
  const getCategoryData = () => {
    if (!catStats) return []

    return Object.entries(catStats).map(([label, data]) => ({
      label,
      used: data.used,
      total: data.total,
      color: "bg-blue-500",
    }))
  }

  // ----------------- Section: montants -----------------
  const getAmountCards = () => {
    if (!concertAmount) return []
    const entries = Object.entries(concertAmount).filter(([k]) => k.startsWith("amount_"))
    return entries.map(([key, amount]) => ({
      label: key.replace("amount_", "").toUpperCase(),
      amount: amount as number,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: Users,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
            </div>
            <p className="text-slate-600 text-sm ml-14">Suivez les statistiques de vos concerts en temps réel</p>
          </div>

          <div className="w-full lg:w-96">
            <Select onValueChange={setSelectedConcertId}>
              <SelectTrigger className="w-full h-12 bg-white border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                <SelectValue placeholder="Sélectionner un concert" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg">
                {concerts.map((concert) => (
                  <SelectItem key={concert.id} value={String(concert.id)}>
                    {concert.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 h-16 w-16 mb-4"></div>
            <p className="text-slate-600">Chargement des données...</p>
          </div>
        )}

        {ticketStats && !loading && (
          <div className="space-y-8">
            {/* --- Cartes principales --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total des billets</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Ticket className="w-5 h-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{ticketStats.total}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Billets utilisés</CardTitle>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{ticketStats.used}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Non utilisés</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{ticketStats.unused}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-blue-100">Montant total</CardTitle>
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {concertAmount?.total_amount?.toLocaleString() ?? 0} Ar
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* --- Revenus par catégorie --- */}
            {getAmountCards().length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Revenus par catégorie
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {getAmountCards().map((card) => {
                    const Icon = card.icon
                    return (
                      <Card
                        key={card.label}
                        className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${card.bgColor}`}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-slate-700">{card.label}</CardTitle>
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${card.color}`}>
                            {card.amount.toLocaleString()} Ar
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* --- Utilisation par catégorie --- */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Utilisation par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                {catStats && Object.keys(catStats).length > 0 ? (
                  <div className="space-y-6">
                    {getCategoryData().map((item) => {
                      const percent = item.total ? ((item.used / item.total) * 100).toFixed(1) : 0
                      return (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">{item.label}</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {item.used}/{item.total}
                            </span>
                          </div>
                          <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`${item.color} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500">{percent}% utilisés</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PageAccueil() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  )
}
