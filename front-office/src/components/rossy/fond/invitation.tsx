"use client"

import QRCode from "react-qr-code"
import type { Concert, Ticket } from "@/lib/types"

interface TicketCardProps {
  ticket: Ticket
  concert: Concert
}

export default function TicketCardBackgroundImage({ ticket, concert }: TicketCardProps) {
  const qrCodeUrl = ticket.qr_code_data

  return (
    <div className="relative w-full h-full overflow-hidden">
  <img
    src="/images/invitationrossy9A4.jpg"
    alt="rossy Taranaka"
    className="absolute inset-0 w-full h-full object-cover"
  />


       <p className="absolute top-2 right-2 font-bold text-black text-[8px] bg-white px-1">
        N°: {ticket.id}
      </p>

      <div className="absolute top-7 right-2 bg-white rounded p-0.5">
        <QRCode value={qrCodeUrl} size={62} level="H" />
      </div>

       <div className="absolute bottom-2 right-2 bg-white rounded p-0.5">
        <QRCode value={qrCodeUrl} size={53} level="H" />
      </div>

         <p
        className="absolute bottom-2 left-6 bg-white text-black text-[8px] font-bold px-1"
        style={{ transform: "rotate(270deg)", transformOrigin: "left bottom" }}
      >
        N°{ticket.id}
      </p>
    </div>
  )
}
