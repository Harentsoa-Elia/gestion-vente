"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchConcerts, generateTickets } from "@/lib/api"
import type { Concert, Ticket } from "@/lib/types"
import { toast } from "sonner"
import { Download } from "lucide-react"
import VIP from "./rossy/VIP"

export default function TicketGeneratorForm() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<string>("")
  const [category, setCategory] = useState<string>("VIP")
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getConcerts = async () => {
      try {
        const data = await fetchConcerts()
        setConcerts(data)
      } catch (err: any) {
        setError(err.message || "Failed to load concerts.")
      }
    }
    getConcerts()
  }, [])

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
        category as "ADULT" | "VIP" | "CHILD"
      )
      setGeneratedTickets(tickets)
      toast.success(`${tickets.length} tickets generated.`)
    } catch (err: any) {
      setError(err.message || "Failed to generate tickets.")
    } finally {
      setLoading(false)
    }
  }

  // Pagination 9 tickets/page
  const ticketsByPage: Ticket[][] = []
  for (let i = 0; i < generatedTickets.length; i += 9) {
    ticketsByPage.push(generatedTickets.slice(i, i + 9))
  }

  return (
    <div className="grid gap-6">

      {/* CSS PRINT */}
      <style jsx global>{`
        @media print {

          @page {
            size: A4;
            margin: 0 !important;
          }

          html, body {
            margin: 0 !important;
            padding: 1mm !important;
          }
        * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          .no-print,
            #sonner-toaster, /* cache le conteneur du toast de sonner */
            .sonner-toast,  /* sécurité supplémentaire */
            [data-sonner-toaster] { 
            display: none !important;
          }

            .print-page {
              width: 210mm !important;
              height: 297mm !important;

              display: grid !important;
              grid-template-columns: repeat(3, 69mm) !important;
              grid-template-rows: repeat(3, 94mm) !important; /* 98mm au lieu de 99mm */
              gap: 1mm !important;  
              padding: 0 !important;  /* petite marge interne */
              box-sizing: border-box !important;
            
              background: white !important;
              margin: 0 !important;

               break-after: auto !important;
            }



            .ticket-slot {
              width: 69mm !important;
              height: 94mm !important;   /* Hauteur réduite */
              overflow: hidden !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            border: 0.25mm solid #ffffffff !important;

            }

            .ticket-item {
              width: 100% !important;
              height: 100% !important;
              display: flex !important;
            }
          }


        /* Prévisualisation */
        @media screen {
          .print-page {
            width: 210mm;
            height: 297mm;
            display: grid;
            grid-template-columns: repeat(3, 70mm);
            grid-template-rows: repeat(3, 99mm);
            gap: 0;
            margin: 1rem auto;
            border: 1px solid #ccc;
            background: white;
          }

          .ticket-slot {
            width: 70mm;
            height: 99mm;
            border: 1px dashed #d1d5db;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .ticket-item {
            width: 62mm;
            height: 94mm;
          }
        }
      `}</style>

      {/* FORM */}
      <div className="no-print bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-semibold">Générateur d’invitations (Rossy)</h2>

          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} className="bg-blue-600 text-white">
              Actualiser
            </Button>

            <Button onClick={() => window.print()} className="bg-green-700 text-white flex gap-2">
              Imprimer <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Générer des billets</CardTitle>
            <CardDescription>Sélectionnez un concert et un nombre.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">

                <div>
                  <Label>Concert</Label>
                  <Select onValueChange={setSelectedConcertId} value={selectedConcertId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                       {concerts
                        .filter((concert) => ![8, 10, 11, 13, 14].includes(concert.id)) // <-- filtre les ids
                        .map((concert) => (
                          <SelectItem key={concert.id} value={String(concert.id)}>
                            {concert.title} ({concert.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Catégorie</Label>
                  <Select onValueChange={setCategory} value={category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">Invitation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="text-center">
                <Button type="submit" className="bg-green-600 text-white" disabled={loading}>
                  {loading ? "Génération..." : "Générer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* IMPRESSION */}
     {ticketsByPage
  .filter(page => page.length > 0) // ⬅️ enlève les pages vides
  .map((page, i) => (
    <div key={i} className="print-page">

      {page.map((ticket, index) => (
        <div className="ticket-slot" key={index}>
          <div className="ticket-item">
            <VIP
              concerts={concerts}
              generatedTickets={[ticket]}
              selectedConcertId={selectedConcertId}
            />
          </div>
        </div>
      ))}

    </div>
))}



      {/* PRÉVIEW ÉCRAN */}
      <div className="no-print">
        <VIP
          concerts={concerts}
          generatedTickets={generatedTickets}
          selectedConcertId={selectedConcertId}
        />
      </div>

    </div>
  )
}
