"use client"

import { useParams } from "next/navigation"
import ParticipantAuthWrapper from "@/components/participant-auth-wrapper"
import ReservationFlow from "@/components/reservation-flow"

function ReserverContent() {
  const params = useParams()
  const evenementId = Number(params.id)

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-[#0F172A]">
          Reserver - Evenement #{evenementId}
        </h1>
        <ReservationFlow evenementId={evenementId} />
      </div>
    </div>
  )
}

export default function ReserverPage() {
  return (
    <ParticipantAuthWrapper>
      <ReserverContent />
    </ParticipantAuthWrapper>
  )
}