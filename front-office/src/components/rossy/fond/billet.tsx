"use client"

import QRCode from "react-qr-code"
import type { Concert, Ticket } from "@/lib/types"

interface TicketCardProps {
  ticket: Ticket
  concert: Concert
}

export default function TicketCardWithArtist({ ticket, concert }: TicketCardProps) {
  const qrCodeUrl = ticket.qr_code_data


  return (
      <div
        className="flex h-[67mm] bg-black w-[194mm] relative overflow-hidden
                   print:h-[67mm] print:w-[194mm] print:break-inside-avoid"
      >
        <img src="/images/mahaleo2026/MAHALEO-2026-SIMPLE-Final.png" alt="Rossy" className="w-full h-[67mm] rounded mb-1" />

        <div className="absolute bottom-1 right-1 bg-white p-1 shadow">
          <QRCode value={qrCodeUrl} size={65} level="H" />
        </div> 

       

        <p className="absolute bottom-1 left-[0.65rem] bg-white text-black text-[10px] font-bold px-1 shadow">
          N°{ticket.id}
        </p>

        <p
        className="absolute bottom-10 left-32 bg-white text-black text-[10px] font-bold px-1"
        style={{ transform: "rotate(270deg)", transformOrigin: "left bottom" }}
      >
        N°{ticket.id}
      </p>


        

      </div>
    )
}
