"use client"

import { Concert, Ticket } from "@/lib/types"
import TicketCardBackgroundImage from "./fond/invitation"

type VIPProps = {
  concerts: Concert[]
  generatedTickets: Ticket[]
  selectedConcertId: string | null
}

export default function VIP({ concerts, generatedTickets, selectedConcertId }: VIPProps) {
  const selectedConcert = concerts.find(
    (c) => c.id === Number.parseInt(selectedConcertId || "0")
  )

  if (!selectedConcert || generatedTickets.length === 0) return null

  return (
    <TicketCardBackgroundImage
      ticket={generatedTickets[0]}
      concert={selectedConcert}
    />
  )
}
