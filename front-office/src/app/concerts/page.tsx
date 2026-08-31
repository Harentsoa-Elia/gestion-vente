import { fetchConcerts } from "@/lib/api"
import type { Concert } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ConcertsPage() {
  let concerts: Concert[] = []
  let error: string | null = null
  try {
    concerts = await fetchConcerts()
  } catch (err: any) {
    error = err.message || "Failed to load concerts."
  }

  return (
    <div className="grid p-4 gap-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-blue-900">Liste des concerts</h1>
        <Button asChild className="bg-green-600 text-white hover:bg-blue-700 transition">
          <Link href="/concerts/new">Créer un nouveau concert</Link>
        </Button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-sm"
          role="alert"
        >
          <strong className="font-semibold">Erreur : </strong>
          <span>{error}</span>
        </div>
      )}

      {/* Aucun concert */}
      {concerts.length === 0 && !error && (
        <p className="text-center text-muted-foreground">
          Aucun concert configuré pour le moment. Créez-en un pour commencer !
        </p>
      )}

      {/* Liste des concerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {concerts.map((concert) => (
          <div
            key={concert.id}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            {/* Titre et description */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                {concert.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{concert.description}</p>
            </div>

            {/* Infos tarifaires */}
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Prix VIP :</span>{" "}
                {concert.price_vip.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Prix Adulte :</span>{" "}
                {concert.price_adult.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Prix Enfant :</span>{" "}
                {concert.price_child.toFixed(2)} €
              </p>
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Code :</span>{" "}
                {concert.code}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
