"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { fetchEvenements } from "@/services/evenementService"
import type { Evenement } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function EvenementsList() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvenements()
      .then(setEvenements)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = evenements.filter((e) =>
    e.titre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="relative max-w-xl mx-auto mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un evenement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {loading && <p className="text-center text-muted-foreground">Chargement des evenements...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-center text-muted-foreground">Aucun evenement trouve.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((evenement) => (
          <Link key={evenement.id} href={`/evenements/${evenement.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow rounded-2xl">
              <div className="h-40 bg-gradient-to-br from-[#0F172A] to-[#3B82F6] flex items-center justify-center text-white/70 text-sm">
                Image a venir
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-lg line-clamp-1">{evenement.titre}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(evenement.date_debut)}
                </div>
                <div className="pt-2 font-medium text-[#0F172A]">
                  {evenement.prix_a_partir_de != null
                    ? `A partir de ${evenement.prix_a_partir_de.toLocaleString("fr-FR")} Ar`
                    : "Prix a confirmer"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}