"use client"

import ParticipantAuthWrapper from "@/components/participant-auth-wrapper"
import { MesReservationsList } from "@/components/mes-reservations-list"

export default function MesReservationsPage() {
  return (
    <ParticipantAuthWrapper>
      <div className="min-h-screen bg-gw-fond px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-titre text-3xl font-bold tracking-[-0.02em] text-gw-nuit sm:text-4xl">Mes billets</h1>
          <p className="mt-2 mb-8 text-gw-texte-doux">
            Présentez le QR code de chaque billet à l&apos;entrée, sur votre téléphone ou imprimé.
          </p>
          <MesReservationsList />
        </div>
      </div>
    </ParticipantAuthWrapper>
  )
}
