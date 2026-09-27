"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import ParticipantAuthWrapper from "@/components/participant-auth-wrapper"
import ReservationFlow from "@/components/reservation-flow"

function ReserverContent() {
  const params = useParams()
  return (
    <div className="min-h-screen bg-gw-fond px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Suspense>
          <ReservationFlow evenementId={Number(params.id)} />
        </Suspense>
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
