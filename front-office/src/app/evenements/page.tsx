import { EvenementsList } from "@/components/evenements-list"

export default function EvenementsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#0F172A] text-white py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2">Decouvrez les meilleurs evenements</h1>
        <p className="text-white/80">Concerts, spectacles, conferences... trouvez votre prochaine sortie.</p>
      </div>
      <EvenementsList />
    </div>
  )
}