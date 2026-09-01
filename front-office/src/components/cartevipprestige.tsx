"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchConcerts, generateTickets, regenerateTickets } from "@/services"
import type { Concert, Ticket } from "@/types"
import { toast } from "sonner"
import {
  Download,
  RefreshCw,
  Sparkles,
  Loader2,
  AlertCircle,
  Ticket as TicketIcon,
  Printer,
  Music4,
  Tag,
  CheckCircle2,
  Hash,
} from "lucide-react"
import VIP from "./VIP"
import AdulteEnfant from "./VIP"

export default function TicketGeneratorForm() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<string>("")
  const [category, setCategory] = useState<string>("ADULT") // Valeur par défaut pour la catégorie
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false) // État pour la génération PDF

  // --- Mode Generate / Regenerate (identique à rossyticket.tsx) ---
  const [mode, setMode] = useState<"generate" | "regenerate">("generate")
  const [ticketIdStart, setTicketIdStart] = useState<string>("")
  const [ticketIdEnd, setTicketIdEnd] = useState<string>("")

  useEffect(() => {
    const getConcerts = async () => {
      try {
        const data = await fetchConcerts()
        setConcerts(data)
      } catch (err: any) {
        setError(err.message || "Failed to load concerts.")
        toast.error(err.message || "Failed to load concerts.", {
          description: "Please try again later.",
        })
      }
    }
    getConcerts()
  }, [])

  const reload = () => {
    window.location.reload()
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedConcertId) {
      setError("Please select a concert and enter a quantity.")
      return
    }

    if (mode === "generate" && !quantity) {
      setError("Please select a concert and enter a quantity.")
      return
    }

    if (mode === "regenerate" && !ticketIdStart) {
      setError("Please enter the ticket ID start for regeneration.")
      return
    }

    setLoading(true)
    setError(null)
    setGeneratedTickets([])
    try {
      let tickets: Ticket[] = []
      if (mode === "generate") {
        tickets = await generateTickets(
          Number.parseInt(selectedConcertId),
          Number.parseInt(quantity),
          category as "ADULT" | "VIP" | "CHILD",
        )
        toast.success(`${tickets.length} tickets generated.`, {
          description: "Your tickets are ready!",
        })
      } else {
        tickets = await regenerateTickets(Number.parseInt(selectedConcertId), ticketIdStart, ticketIdEnd || undefined)
        toast.success(`${tickets.length} tickets regenerated.`, {
          description: "Your tickets are ready!",
        })
      }
      setGeneratedTickets(tickets)
    } catch (err: any) {
      setError(err.message || "Failed to generate tickets.")
      toast.error(err.message || "Failed to generate tickets.", {
        description: "Please try again later.",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedConcert = concerts.find((c) => c.id === Number.parseInt(selectedConcertId || "0"))

  const groupedTickets = []

  for (let i = 0; i < generatedTickets.length; i += 3) {
    groupedTickets.push(generatedTickets.slice(i, i + 3))
  }

  return (
    <div className="grid gap-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 2.5mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          [data-sonner-toaster] {
            display: none !important;
          }
          
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            page-break-after: always !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .print-page:last-child {
            page-break-after: avoid !important;
          }
          
          .ticket-wrapper {
            width: 200mm !important;
            height: 93mm !important;
            margin: 2mm 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ============================= Panneau de contrôle ============================= */}
      <div className="no-print relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm sm:p-6 lg:p-8">
        {/* Décor discret en arrière-plan */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-100 to-emerald-50 opacity-50 blur-3xl" />

        {/* Header */}
        <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Générateur d&apos;invitation
              </h2>
              <p className="text-sm text-slate-500">Créez ou régénérez des billets en quelques clics.</p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={reload}
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-blue-200 bg-blue-50/80 font-semibold text-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md sm:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={isGeneratingPdf || generatedTickets.length === 0}
              className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 sm:flex-none"
            >
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {isGeneratingPdf ? "Génération..." : "Imprimer"}
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carte du formulaire */}
        <Card className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ${
                  mode === "generate" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {mode === "generate" ? <Sparkles className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              </span>
              <CardTitle className="text-lg font-bold text-slate-900">
                {mode === "generate" ? "Générer des billets" : "Régénérer des billets"}
              </CardTitle>
            </div>
            <CardDescription className="pl-10 text-slate-500">
              {mode === "generate"
                ? "Sélectionnez un concert et le nombre de billets à générer."
                : "Sélectionnez un concert et les ID des billets à régénérer."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleGenerate} className="flex flex-col space-y-6">
              {/* --- Sélecteur de mode --- */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Mode</Label>
                <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setMode("generate")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-5 ${
                      mode === "generate"
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-300"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("regenerate")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-5 ${
                      mode === "regenerate"
                        ? "bg-amber-600 text-white shadow-sm shadow-amber-300"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </button>
                </div>
              </div>

              {/* --- Sélection du concert --- */}
              <div className="space-y-2">
                <Label htmlFor="concert" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Music4 className="h-3.5 w-3.5 text-slate-400" />
                  Sélectionnez un concert
                </Label>
                <Select onValueChange={setSelectedConcertId} value={selectedConcertId || ""}>
                  <SelectTrigger
                    id="concert"
                    disabled={concerts.length === 0}
                    className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 transition-all focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-70"
                  >
                    <SelectValue
                      placeholder={concerts.length === 0 ? "Chargement des concerts..." : "Choisir un concert..."}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
                    {concerts.map((concert) => (
                      <SelectItem
                        key={concert.id}
                        value={String(concert.id)}
                        className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{concert.title}</span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                            {concert.code}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Aperçu du concert sélectionné */}
                {selectedConcert && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      <span className="font-semibold">{selectedConcert.title}</span>
                      <span className="mx-1.5 text-emerald-400">•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700/80">
                        <Hash className="h-3 w-3" />
                        {selectedConcert.code}
                      </span>
                    </span>
                  </div>
                )}

                {error && !selectedConcertId && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}
              </div>

              {/* --- Champs Generate --- */}
              {mode === "generate" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-slate-700">
                      Quantité
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="e.g., 100"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                    >
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      Catégorie
                    </Label>
                    <Select onValueChange={setCategory} value={category}>
                      <SelectTrigger
                        id="category"
                        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 transition-all focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <SelectValue placeholder="Sélectionner une catégorie..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
                        <SelectItem
                          value="ADULT"
                          className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                        >
                          Carte
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* --- Champs Regenerate --- */}
              {mode === "regenerate" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-start" className="text-sm font-semibold text-slate-700">
                      ID départ
                    </Label>
                    <Input
                      id="ticket-start"
                      type="text"
                      placeholder="Ex: 101"
                      value={ticketIdStart}
                      onChange={(e) => setTicketIdStart(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-end" className="text-sm font-semibold text-slate-700">
                      ID fin (optionnel)
                    </Label>
                    <Input
                      id="ticket-end"
                      type="text"
                      placeholder="Ex: 120"
                      value={ticketIdEnd}
                      onChange={(e) => setTicketIdEnd(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    />
                  </div>
                </div>
              )}

              {error && selectedConcertId && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <div className="justify-center pt-2 text-center">
                <Button
                  type="submit"
                  className={`w-full gap-2 rounded-xl py-2.5 font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:translate-y-0 sm:w-auto sm:px-8 ${
                    mode === "generate"
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                      : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  }`}
                  disabled={
                    loading ||
                    !selectedConcertId ||
                    (mode === "generate" && !quantity) ||
                    (mode === "regenerate" && !ticketIdStart)
                  }
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? mode === "generate"
                      ? "Generating..."
                      : "Regenerating..."
                    : mode === "generate"
                      ? "Generate Tickets"
                      : "Regenerate Tickets"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ============================= Bandeau de confirmation ============================= */}
      {generatedTickets.length > 0 && (
        <div className="no-print mx-auto flex w-full max-w-3xl items-center gap-2.5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </span>
          <span>
            {generatedTickets.length} billet{generatedTickets.length > 1 ? "s" : ""}{" "}
            {mode === "regenerate" ? "régénéré" : "généré"}
            {generatedTickets.length > 1 ? "s" : ""} pour{" "}
            <span className="font-semibold">{selectedConcert?.title ?? "ce concert"}</span>.
          </span>
        </div>
      )}

      {category == "ADULT" ? (
        <VIP concerts={concerts} generatedTickets={generatedTickets} selectedConcertId={selectedConcertId} />
      ) : (
        <AdulteEnfant concerts={concerts} generatedTickets={generatedTickets} selectedConcertId={selectedConcertId} />
      )}
    </div>
  )
}