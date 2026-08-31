"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Ticket,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  MoreHorizontal,
  Users,
  Sparkles,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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
} from "recharts";
import AuthWrapper from "@/components/auth-wrapper";
import {
  fetchConcerts,
  fetchTicketCategoryStats,
  fetchTicketStats,
  fetchTicketLists,
} from "@/lib/api";
import type { Concert, TicketStats, DynamicCategoryStats } from "@/lib/types";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ef4444",
];

function DashboardContent() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string>("");
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [catStats, setCatStats] = useState<DynamicCategoryStats | null>(null);
  const [ticketLists, setTicketLists] = useState<Record<
    string,
    { used: string[]; unused: string[] }
  > | null>(null);
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConcerts()
      .then(setConcerts)
      .catch(() => setError("Erreur lors du chargement des concerts."));
  }, []);

  useEffect(() => {
    if (concerts.length === 1) {
      setSelectedConcertId(String(concerts[0].id));
    }
  }, [concerts]);

  // Fonction pour charger les données d'un concert
  const loadConcertData = async (concertId: string) => {
    try {
      const [stats, categories, lists] = await Promise.all([
        fetchTicketStats(concertId),
        fetchTicketCategoryStats(concertId),
        fetchTicketLists(concertId),
      ]);

      setTicketStats(stats);
      const normalized: DynamicCategoryStats = ((categories as any)
        .categories ?? categories) as DynamicCategoryStats;
      setCatStats(normalized);
      setTicketLists(lists);
      setLastUpdate(new Date());
      setError("");
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Erreur lors du chargement des données");
    }
  };

  // Chargement initial des données
  useEffect(() => {
    if (!selectedConcertId) return;

    setLoading(true);
    loadConcertData(selectedConcertId).finally(() => setLoading(false));
  }, [selectedConcertId]);

  // Mise à jour automatique toutes les secondes
  useEffect(() => {
    if (!selectedConcertId) return;

    const interval = setInterval(() => {
      loadConcertData(selectedConcertId);
    }, 1000); // Mise à jour toutes les secondes

    return () => clearInterval(interval);
  }, [selectedConcertId]);

  const chartData = ticketStats
    ? [
        { name: "Total", value: ticketStats.total },
        { name: "Scannés", value: ticketStats.used },
        { name: "Non scannés", value: ticketStats.unused },
      ]
    : [];

  const getCategoryData = () => {
    if (!catStats) return [];
    return Object.entries(catStats).map(([label, stats]) => ({
      label,
      used: stats.used,
      unused: stats.total - stats.used,
      total: stats.total,
      percent: stats.total
        ? ((stats.used / stats.total) * 100).toFixed(1)
        : "0",
    }));
  };

  const getAmountCards = () => {
    if (!catStats) return [];
    return Object.entries(catStats).map(([name, stats]) => {
      const price = manualPrices[name] || 0;
      const total = stats.used * price;
      return { label: name, used: stats.used, price, total };
    });
  };

  const totalRevenue = getAmountCards().reduce((acc, c) => acc + c.total, 0);

  // Fonction de recherche intelligente
  const filterTickets = (tickets: string[], searchTerm: string) => {
    if (!searchTerm.trim()) return tickets;

    const term = searchTerm.toLowerCase().trim();

    return tickets.filter((ticket) => {
      const ticketLower = ticket.toLowerCase();

      // Recherche exacte
      if (ticketLower === term) return true;

      // Recherche par préfixe
      if (ticketLower.startsWith(term)) return true;

      // Recherche par numéro (même si le préfixe est différent)
      const ticketNumber = ticket.match(/\d+$/)?.[0];
      if (ticketNumber && ticketNumber.includes(term.replace(/\D/g, "")))
        return true;

      // Recherche par partie du ticket
      if (ticketLower.includes(term)) return true;

      return false;
    });
  };

  // Gestionnaire de recherche pour une catégorie
  const handleSearch = (category: string, term: string) => {
    setSearchTerms((prev) => ({
      ...prev,
      [category]: term,
    }));
  };

  // Effacer la recherche pour une catégorie
  const clearSearch = (category: string) => {
    setSearchTerms((prev) => ({
      ...prev,
      [category]: "",
    }));
  };

  /* Export Excel fonctionnel pour toutes les catégories avec tri correct */
  const exportTickets = (
    data: Record<string, { used: string[]; unused: string[] }>,
    concertName: string
  ) => {
    const wb = XLSX.utils.book_new();

    // 1️⃣ Récapitulatif général
    let totalScanned = 0;
    let totalNotScanned = 0;
    let grandTotal = 0;

    Object.entries(data).forEach(([_, lists]) => {
      totalScanned += lists.used.length;
      totalNotScanned += lists.unused.length;
      grandTotal += lists.used.length + lists.unused.length;
    });

    const summaryData = [
      ["", "RÉCAPITULATIF GÉNÉRAL"],
      [],
      ["Total des billets", grandTotal],
      ["Billets scannés", totalScanned],
      ["Billets non scannés", totalNotScanned],
      [
        "Taux de scan",
        grandTotal > 0
          ? ((totalScanned / grandTotal) * 100).toFixed(2) + "%"
          : "0%",
      ],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé général");

    // 2️⃣ Récapitulatif par catégorie
    const categoryRows: (string | number)[][] = [
      ["Catégorie", "Total", "Scannés", "Non scannés", "Taux de scan"],
    ];

    const sortedCategories = Object.entries(data).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    sortedCategories.forEach(([category, lists]) => {
      const total = lists.used.length + lists.unused.length;
      const scanned = lists.used.length;
      const notScanned = lists.unused.length;
      const rate =
        total > 0 ? ((scanned / total) * 100).toFixed(2) + "%" : "0%";

      categoryRows.push([category, total, scanned, notScanned, rate]);
    });

    const wsCat = XLSX.utils.aoa_to_sheet(categoryRows);
    wsCat["!cols"] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCat, "Par catégorie");

    // 3️⃣ Liste détaillée avec tri numérique correct pour les tickets
    const detailedRows: (string | number)[][] = [
      ["Catégorie", "Statut", "Numéro de billet"],
    ];

    // Fonction de tri améliorée pour gérer les préfixes et numéros > 9999
    const sortTickets = (tickets: string[]) => {
      return [...tickets].sort((a, b) => {
        const extractTicketInfo = (ticket: string) => {
          const match = ticket.match(/(.*?)(\d+)$/);
          if (match) {
            return {
              prefix: match[1],
              number: parseInt(match[2], 10),
              full: ticket,
            };
          }
          return {
            prefix: ticket,
            number: 0,
            full: ticket,
          };
        };

        const aInfo = extractTicketInfo(a);
        const bInfo = extractTicketInfo(b);

        if (aInfo.prefix !== bInfo.prefix) {
          return aInfo.prefix.localeCompare(bInfo.prefix);
        }

        if (aInfo.number !== bInfo.number) {
          return aInfo.number - bInfo.number;
        }

        return a.localeCompare(b);
      });
    };

    sortedCategories.forEach(([category, lists]) => {
      // Trier les tickets avec la fonction améliorée
      const sortedUsed = sortTickets(lists.used);
      const sortedUnused = sortTickets(lists.unused);

      // Ajouter les tickets scannés
      sortedUsed.forEach((id) => detailedRows.push([category, "SCANNÉ", id]));

      // Ajouter les tickets non scannés
      sortedUnused.forEach((id) =>
        detailedRows.push([category, "NON SCANNÉ", id])
      );
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(detailedRows);
    wsDetails["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }]; // Largeur augmentée pour les numéros longs
    XLSX.utils.book_append_sheet(wb, wsDetails, "Liste détaillée");

    // 4️⃣ Feuille supplémentaire avec regroupement par plages de tickets
    const rangesRows: (string | number)[][] = [
      ["Catégorie", "Plage de billets", "Statut", "Quantité"],
    ];

    sortedCategories.forEach(([category, lists]) => {
      // Regrouper les tickets par plages
      const groupTicketsByRanges = (tickets: string[]) => {
        if (tickets.length === 0) return [];

        const sorted = sortTickets(tickets);
        const ranges: { start: string; end: string; count: number }[] = [];
        let currentRange: { start: string; end: string; count: number } | null =
          null;

        sorted.forEach((ticket) => {
          if (!currentRange) {
            currentRange = { start: ticket, end: ticket, count: 1 };
            return;
          }

          // Vérifier si le ticket fait partie de la plage courante
          const currentInfo = extractTicketInfo(currentRange.end);
          const ticketInfo = extractTicketInfo(ticket);

          if (
            currentInfo.prefix === ticketInfo.prefix &&
            ticketInfo.number === currentInfo.number + 1
          ) {
            // Ticket consécutif - étendre la plage
            currentRange.end = ticket;
            currentRange.count++;
          } else {
            // Nouvelle plage
            ranges.push(currentRange);
            currentRange = { start: ticket, end: ticket, count: 1 };
          }
        });

        if (currentRange) {
          ranges.push(currentRange);
        }

        return ranges;
      };

      // Fonction utilitaire pour extraire les infos du ticket
      const extractTicketInfo = (ticket: string) => {
        const match = ticket.match(/(.*?)(\d+)$/);
        if (match) {
          return {
            prefix: match[1],
            number: parseInt(match[2], 10),
          };
        }
        return { prefix: ticket, number: 0 };
      };

      const usedRanges = groupTicketsByRanges(lists.used);
      const unusedRanges = groupTicketsByRanges(lists.unused);

      // Ajouter les plages scannées
      usedRanges.forEach((range) => {
        const rangeStr =
          range.start === range.end
            ? range.start
            : `${range.start} - ${range.end}`;
        rangesRows.push([category, rangeStr, "SCANNÉ", range.count]);
      });

      // Ajouter les plages non scannées
      unusedRanges.forEach((range) => {
        const rangeStr =
          range.start === range.end
            ? range.start
            : `${range.start} - ${range.end}`;
        rangesRows.push([category, rangeStr, "NON SCANNÉ", range.count]);
      });
    });

    const wsRanges = XLSX.utils.aoa_to_sheet(rangesRows);
    wsRanges["!cols"] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRanges, "Plages de billets");

    // 5️⃣ Sauvegarde du fichier
    const fileName = `billets_${concertName.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                  Tableau de bord
                </h1>
                <p className="text-muted-foreground text-sm lg:text-base mt-1">
                  Statistiques en temps réel et gestion des billets
                  {lastUpdate && (
                    <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                      ● Mis à jour: {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="w-full lg:w-64">
              <Select
                onValueChange={setSelectedConcertId}
                value={selectedConcertId}
              >
                <SelectTrigger className="h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all duration-200">
                  <SelectValue placeholder="Sélectionner un concert" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                  {concerts.map((concert) => (
                    <SelectItem
                      key={concert.id}
                      value={String(concert.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {concert.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {ticketLists && (
                <button
                  onClick={() => {
                    if (!selectedConcertId) return;
                    const concert = concerts.find(
                      (c) => String(c.id) === selectedConcertId
                    );
                    const concertName = concert?.title || "concert";
                    exportTickets(ticketLists, concertName);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Exporter Excel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-2xl mb-6 flex items-center gap-4 backdrop-blur-sm">
            <div className="w-2 h-10 bg-red-500 rounded-full" />
            <div>
              <p className="font-semibold">Erreur de chargement</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State - Seulement pour le premier chargement */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 h-20 w-20"></div>
              <Activity className="w-8 h-8 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-muted-foreground font-medium text-lg">
              Chargement des données...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Veuillez patienter
            </p>
          </div>
        )}

        {/* Main Dashboard Content */}
        {ticketStats && !loading && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total des billets"
                value={ticketStats.total.toLocaleString()}
                subtitle="Billets émis"
                icon={<Ticket className="w-5 h-5" />}
                trend={null}
                gradient="from-blue-500/10 to-blue-600/5"
                borderColor="border-blue-200 dark:border-blue-800"
              />
              <MetricCard
                title="Billets scannés"
                value={ticketStats.used.toLocaleString()}
                subtitle={`${(
                  (ticketStats.used / ticketStats.total) *
                  100
                ).toFixed(1)}% du total`}
                icon={<CheckCircle2 className="w-5 h-5" />}
                trend={{
                  value: ((ticketStats.used / ticketStats.total) * 100).toFixed(
                    1
                  ),
                  positive: true,
                }}
                gradient="from-emerald-500/10 to-emerald-600/5"
                borderColor="border-emerald-200 dark:border-emerald-800"
              />
              <MetricCard
                title="Non scannés"
                value={ticketStats.unused.toLocaleString()}
                subtitle={`${(
                  (ticketStats.unused / ticketStats.total) *
                  100
                ).toFixed(1)}% restant`}
                icon={<Clock className="w-5 h-5" />}
                trend={{
                  value: (
                    (ticketStats.unused / ticketStats.total) *
                    100
                  ).toFixed(1),
                  positive: false,
                }}
                gradient="from-amber-500/10 to-amber-600/5"
                borderColor="border-amber-200 dark:border-amber-800"
              />
              <MetricCard
                title="Revenus estimés"
                value={`${totalRevenue.toLocaleString()} Ar`}
                subtitle="Calculé localement"
                icon={<TrendingUp className="w-5 h-5" />}
                trend={null}
                gradient="from-purple-500/10 to-purple-600/5"
                borderColor="border-purple-200 dark:border-purple-800"
              />
            </div>

            {/* Revenue Configuration */}
            {catStats && (
              <Card className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        Configuration des prix
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Définissez le prix par catégorie pour calculer les
                        revenus
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(catStats).map(([name, stats]) => {
                      const price = manualPrices[name] || 0;
                      const revenue = stats.used * price;
                      return (
                        <div
                          key={name}
                          className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-foreground text-lg">
                                {name}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {stats.used} billets vendus
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs font-semibold"
                            >
                              {stats.used}/{stats.total}
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Prix unitaire"
                                value={price || ""}
                                onChange={(e) =>
                                  setManualPrices((prev) => ({
                                    ...prev,
                                    [name]: Number(e.target.value) || 0,
                                  }))
                                }
                                className="h-10 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                                Ar
                              </span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Revenus générés
                                </span>
                                <span className="text-sm font-bold text-foreground">
                                  {revenue.toLocaleString()} Ar
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Global Distribution */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Répartition globale
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={60}
                          label={({ name, percent }) =>
  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
}
                          labelLine={false}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Comparison */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      Comparaison par catégorie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChartComponent data={getCategoryData()}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="used"
                          fill="#10b981"
                          name="Scannés"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="unused"
                          fill="#f59e0b"
                          name="Non scannés"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChartComponent>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Scan Rates */}
              <CategoryProgressCard data={getCategoryData()} />
            </div>

            {/* Detailed Ticket Lists */}
            {ticketLists && (
              <Card className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        Liste détaillée des billets
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tous les billets par catégorie et statut
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filtrer
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {Object.entries(ticketLists)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, data]) => {
                      const sortTickets = (tickets: string[]) => {
                        return [...tickets].sort((a, b) => {
                          const numA = Number.parseInt(a);
                          const numB = Number.parseInt(b);
                          if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
                            return numA - numB;
                          }
                          return a.localeCompare(b);
                        });
                      };

                      const sortedData = {
                        used: sortTickets(data.used),
                        unused: sortTickets(data.unused),
                      };

                      const searchTerm = searchTerms[category] || "";
                      const filteredUsed = filterTickets(
                        sortedData.used,
                        searchTerm
                      );
                      const filteredUnused = filterTickets(
                        sortedData.unused,
                        searchTerm
                      );

                      return (
                        <div
                          key={category}
                          className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-foreground">
                                {category}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {sortedData.used.length +
                                  sortedData.unused.length}{" "}
                                billets au total
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-sm font-semibold px-3 py-1"
                            >
                              {sortedData.used.length +
                                sortedData.unused.length}{" "}
                              total
                            </Badge>
                          </div>

                          {/* Zone de recherche pour cette catégorie */}
                          <div className="mb-6">
                            <div className="relative max-w-md">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                              <Input
                                type="text"
                                placeholder={`Rechercher dans ${category}...`}
                                value={searchTerm}
                                onChange={(e) =>
                                  handleSearch(category, e.target.value)
                                }
                                className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                              {searchTerm && (
                                <button
                                  onClick={() => clearSearch(category)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {searchTerm && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {filteredUsed.length + filteredUnused.length}{" "}
                                billets trouvés
                                {searchTerm && ` pour "${searchTerm}"`}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TicketListSection
                              title="Scannés"
                              count={filteredUsed.length}
                              totalCount={sortedData.used.length}
                              tickets={filteredUsed}
                              variant="success"
                              searchTerm={searchTerm}
                            />
                            <TicketListSection
                              title="Non scannés"
                              count={filteredUnused.length}
                              totalCount={sortedData.unused.length}
                              tickets={filteredUnused}
                              variant="warning"
                              searchTerm={searchTerm}
                            />
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedConcertId && !loading && <EmptyState />}
      </div>
    </div>
  );
}

/* Enhanced modern metric card component */
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient,
  borderColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend: { value: string; positive: boolean } | null;
  gradient: string;
  borderColor: string;
}) {
  return (
    <Card
      className={`border shadow-lg rounded-2xl overflow-hidden backdrop-blur-sm bg-white/70 dark:bg-slate-800/70 ${borderColor} hover:shadow-xl transition-all duration-300 hover:scale-105`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-md`}
          >
            {icon}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                trend.positive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {trend.positive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {trend.value}%
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* Enhanced category progress card */
function CategoryProgressCard({ data }: { data: any[] }) {
  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Taux de scan
        </CardTitle>
        <p className="text-sm text-muted-foreground">Par catégorie de billet</p>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-6">
            {data.map((item, index) => (
              <div key={item.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {item.used}/{item.total}
                  </span>
                </div>
                <div className="relative w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground font-medium">
                    Progression
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {item.percent}% scannés
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-2xl mb-4 shadow-inner">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-semibold">
              Aucune donnée disponible
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Enhanced ticket list section avec recherche */
function TicketListSection({
  title,
  count,
  totalCount,
  tickets,
  variant,
  searchTerm,
}: {
  title: string;
  count: number;
  totalCount: number;
  tickets: string[];
  variant: "success" | "warning";
  searchTerm?: string;
}) {
  const colors = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-500 text-white",
      header: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-500 text-white",
      header: "bg-gradient-to-r from-amber-500 to-amber-600",
    },
  };

  const style = colors[variant];

  // Fonction pour mettre en évidence le texte recherché
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`${style.header} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold text-white`}>{title}</h4>
          <div className="flex items-center gap-2">
            {searchTerm && totalCount !== count && (
              <span className="text-xs text-white/80">
                {count}/{totalCount}
              </span>
            )}
            <Badge className={`${style.badge} text-xs font-bold`}>
              {count}
            </Badge>
          </div>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {tickets.length > 0 ? (
          tickets.map((id) => (
            <div
              key={id}
              className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-foreground shadow-sm hover:shadow transition-shadow"
            >
              {searchTerm ? highlightSearchTerm(id, searchTerm) : id}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {searchTerm ? "Aucun billet trouvé" : "Aucun billet"}
            </p>
            {searchTerm && (
              <p className="text-xs text-muted-foreground mt-1">
                Aucun résultat pour "{searchTerm}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Enhanced empty state */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-3xl rounded-full" />
        <div className="relative p-8 bg-white/70 dark:bg-slate-800/70 border-2 border-slate-200 dark:border-slate-700 rounded-3xl backdrop-blur-sm shadow-2xl">
          <BarChart3 className="w-20 h-20 text-blue-500" />
        </div>
      </div>
      <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4 text-center">
        Commencez par sélectionner un concert
      </h3>
      <p className="text-muted-foreground text-center max-w-md leading-relaxed text-lg">
        Choisissez un concert dans le menu déroulant ci-dessus pour visualiser
        toutes les statistiques, les revenus et la liste complète des billets
      </p>
    </div>
  );
}

export default function PageAccueil() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
}
