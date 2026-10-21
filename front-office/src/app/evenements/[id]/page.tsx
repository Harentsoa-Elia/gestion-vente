"use client"

import { useParams } from "next/navigation"
import { EvenementDetail } from "@/components/evenement-detail"

export default function EvenementDetailPage() {
  const params = useParams()
  return (
    <div className="min-h-screen bg-gw-surface">
      <EvenementDetail evenementId={Number(params.id)} />
    </div>
  )
}
