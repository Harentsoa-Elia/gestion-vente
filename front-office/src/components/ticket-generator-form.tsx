"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchConcerts, generateTickets } from "@/services"
import type { Concert, Ticket } from "@/types"
import { toast } from "sonner"
import { Download, Info } from "lucide-react" // Importation des icônes
import html2canvas from "html2canvas" // Importation de html2canvas
import { jsPDF } from "jspdf" // Importation de jspdf
import TicketCardBackgroundImage from "./ticket-card" // Utilisation du composant de ticket avec image de fond
import VIP from "./VIP"

import AdulteEnfant from "./adulte_enfant"

export default function TicketGeneratorForm() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<string>("")
  const [category, setCategory] = useState<string>("VIP")
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false) // État pour la génération PDF

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
    window.location.reload();
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConcertId || !quantity) {
      setError("Please select a concert and enter a quantity.")
      return
    }
    setLoading(true)
    setError(null)
    setGeneratedTickets([])
    try {
      const tickets = await generateTickets(
        Number.parseInt(selectedConcertId),
        Number.parseInt(quantity),
        category as "VIP" | "ADULT" | "CHILD",
      )
      setGeneratedTickets(tickets)
      toast.success(`${tickets.length} tickets generated.`, {
        description: "Your tickets are ready!",
      })
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


  const groupedTickets = [];

  for (let i = 0; i < generatedTickets.length; i += 3) {
    groupedTickets.push(generatedTickets.slice(i, i + 3))
  }

  return (
    <div className="grid gap-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 5mm;
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
      <div className="no-print mb-6 bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between gap-10 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Générateur de Tickets VIP</h2>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-semibold">
              Actualiser
            </Button>
            <Button
              onClick={() => (window.print())}
              className="flex items-center gap-2 bg-green-700  text-white font-bold"

            >
              {isGeneratingPdf ? "Génération..." : "Imprimer"}
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Formulaire de génération de tickets */}
        <Card className="border-none shadow-xl rounded-lg max-w-3xl mx-auto">
          <CardHeader className="pb-2">
            <CardTitle>Générer des billets</CardTitle>
            <CardDescription>Sélectionnez un concert et le nombre de billets à générer.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleGenerate} className="space-y-5 flex flex-col">
              <div className="flex flex-row gap-4">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="concert" className="text-sm font-medium">
                    Sélectionnez un concert
                  </Label>
                  <Select onValueChange={setSelectedConcertId} value={selectedConcertId || ""}>
                    <SelectTrigger id="concert" className="h-10 bg-gray-50 border focus:ring-2 focus:ring-primary">
                      <SelectValue placeholder="Choose a concert..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-full">
                      {concerts.map((concert) => (
                        <SelectItem key={concert.id} value={String(concert.id)}>
                          {concert.title} ({concert.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {error && !selectedConcertId && <p className="text-sm text-red-500 mt-1">{error}</p>}
                </div>
                {/* Quantity Input */}
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    Quantité
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="e.g., 100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10 bg-gray-50 border focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Catégorie
                  </Label>
                  <Select onValueChange={setCategory} value={category}>
                    <SelectTrigger id="category" className="h-10 bg-gray-50 border focus:ring-2 focus:ring-primary">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">Invitaion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-0 pt-2 justify-center text-center">
                <Button
                  type="submit"
                  className="bg-green-600 text-white font-semibold hover:scale-[1.02] transition-transform duration-200"
                  disabled={loading || !selectedConcertId || !quantity}
                >
                  {loading ? "Generating..." : "Generate Tickets"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {category == "VIP" ? (
        <VIP
          concerts={concerts}
          generatedTickets={generatedTickets}
          selectedConcertId={selectedConcertId}
        />
      ) : (
        <AdulteEnfant
          concerts={concerts}
          generatedTickets={generatedTickets}
          selectedConcertId={selectedConcertId}
        />
      )}
    </div>
  )
}
