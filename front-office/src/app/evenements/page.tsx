import { Suspense } from "react"
import { CatalogueEvenements } from "@/components/evenements/catalogue-evenements"

export const metadata = { title: "Événements | guichetweb" }

export default function EvenementsPage() {
  // useSearchParams (filtres dans l'URL) doit être enveloppé dans Suspense avec Next 15
  return (
    <Suspense fallback={<div className="scene h-72" />}>
      <CatalogueEvenements />
    </Suspense>
  )
}
