"use client"

import { useParams } from "next/navigation"
import { EvenementDetail } from "@/components/evenement-detail"

export default function EvenementDetailPage() {
  const params = useParams()
  const evenementId = Number(params.id)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <EvenementDetail evenementId={evenementId} />
    </div>
  )
}