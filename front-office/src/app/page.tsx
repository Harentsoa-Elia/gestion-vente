import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EvenementsList } from "@/components/evenements-list"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="bg-gradient-to-br from-[#0F172A] to-[#3B82F6] text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">Decouvrez les meilleurs evenements pres de chez vous</h1>
        <p className="text-white/80 mb-6 max-w-xl mx-auto">
          Concerts, spectacles, conferences et bien plus. Reservez vos billets en quelques clics.
        </p>
        <Button asChild size="lg" className="bg-white text-[#0F172A] hover:bg-white/90">
          <Link href="/evenements">
            <Search className="w-4 h-4" />
            Voir tous les evenements
          </Link>
        </Button>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[#0F172A] text-center pt-10">Evenements populaires</h2>
        <EvenementsList />
      </section>
    </div>
  )
}