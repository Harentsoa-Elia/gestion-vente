"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createReservation, payerReservation, fetchCategoriesBillet } from "@/services"
import type { PaiementConfirme, CategorieBillet } from "@/types"
import { toast } from "sonner"
import QRCode from "react-qr-code"
import { Ticket, CreditCard } from "lucide-react"

interface ReservationFlowProps {
  evenementId: number
}

type Etape = "choix" | "reservee" | "payee"

export default function ReservationFlow({ evenementId }: ReservationFlowProps) {
  const [etape, setEtape] = useState<Etape>("choix")
  const [categories, setCategories] = useState<CategorieBillet[]>([])
  const [categorieChoisie, setCategorieChoisie] = useState<number | null>(null)
  const [reservationId, setReservationId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [billet, setBillet] = useState<PaiementConfirme | null>(null)

  useEffect(() => {
    fetchCategoriesBillet(evenementId)
      .then(setCategories)
      .catch(() => toast.error("Impossible de charger les categories de billet."))
  }, [evenementId])

  const reserver = async () => {
    if (!categorieChoisie) {
      toast.error("Choisissez une categorie de billet.")
      return
    }
    setLoading(true)
    try {
      const reservation = await createReservation(evenementId, categorieChoisie)
      setReservationId(reservation.id)
      setEtape("reservee")
      toast.success("Reservation creee. Vous pouvez maintenant proceder au paiement.")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la reservation.")
    } finally {
      setLoading(false)
    }
  }

  const payer = async () => {
    if (!reservationId) return
    setLoading(true)
    try {
      const resultat = await payerReservation(reservationId)
      setBillet(resultat)
      setEtape("payee")
      toast.success("Paiement confirme. Votre billet est pret.")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Reservation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {etape === "choix" && (
          <>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategorieChoisie(cat.id)}
                  className={`w-full text-left border rounded-lg p-3 transition ${
                    categorieChoisie === cat.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{cat.nom}</span>
                    <span className="font-semibold">{cat.prix} Ar</span>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={reserver} disabled={loading || !categorieChoisie} className="w-full">
              <Ticket className="w-4 h-4 mr-2" />
              {loading ? "Reservation..." : "Reserver ma place"}
            </Button>
          </>
        )}

        {etape === "reservee" && (
          <Button onClick={payer} disabled={loading} className="w-full">
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? "Paiement en cours..." : "Payer maintenant (simulation)"}
          </Button>
        )}

        {etape === "payee" && billet && (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-semibold">Paiement confirme !</p>
            <p className="text-sm text-gray-500">Billet : {billet.numero_billet}</p>
            <p className="text-sm text-gray-500">Montant : {billet.montant_paye} Ar</p>
            <div className="flex justify-center bg-white p-4 rounded-lg border">
              <QRCode value={billet.qr_code} size={150} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}