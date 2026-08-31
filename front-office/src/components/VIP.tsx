"use client"

import { Concert, Ticket } from "@/lib/types"
import TicketCardBackgroundImage from "./ticket-card"

type VIPProps = {
  concerts: Concert[]
  generatedTickets: Ticket[]
  selectedConcertId: string | null
}

export default function VIP({ concerts, generatedTickets, selectedConcertId }: VIPProps) {
  const selectedConcert = concerts.find(
    (c) => c.id === Number.parseInt(selectedConcertId || "0")
  )

  return (
    <div className="">
      {generatedTickets.length > 0 && selectedConcert && (
        <div className="print-content flex flex-col gap-[0.3rem]">
          {generatedTickets.map((ticket) => (
            <div key={ticket.id} className="m-0 p-0">
              <TicketCardBackgroundImage ticket={ticket} concert={selectedConcert} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
