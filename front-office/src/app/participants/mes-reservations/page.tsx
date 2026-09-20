"use client"

import ParticipantAuthWrapper from "@/components/participant-auth-wrapper"
import { MesReservationsList } from "@/components/mes-reservations-list"

export default function MesReservationsPage() {
  return (
    <ParticipantAuthWrapper>
      <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-[#0F172A]">Mes reservations</h1>
          <MesReservationsList />
        </div>
      </div>
    </ParticipantAuthWrapper>
  )
}