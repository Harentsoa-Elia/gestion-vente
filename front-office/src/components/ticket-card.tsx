"use client"

import QRCode from "react-qr-code"
import type { Concert, Ticket } from "@/types"

interface TicketCardProps {
  ticket: Ticket
  concert: Concert
}

export default function TicketCardWithArtist({ ticket, concert }: TicketCardProps) {
  const qrCodeUrl = ticket.qr_code_data

  const getPriceByCategory = () => {
    switch (ticket.category) {
      case "VIP": return concert.price_vip
      case "ADULT": return concert.price_adult
      case "CHILD": return concert.price_child
      default: return 0
    }
  }

  const getCategoryLabel = () => {
    switch (ticket.category) {
      case "VIP": return "VIP"
      case "ADULT": return "Adulte"
      case "CHILD": return "Enfant"
      case "PREVENTE": return "Prévente"
      case "VENTELIVE": return "Vente Live"
      default: return ""
    }
  }

  // === VIP sauf concert 14 ===
  if (ticket.category === "CHILD") {
    return (
      <div
  className="
      relative
      w-[60mm]
      h-[40mm]
      bg-cover
      bg-center
      overflow-hidden
      print:w-[60mm]
      print:h-[40mm]
      print:break-inside-avoid
   "
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(0,0,0,.8),
              rgba(0,0,0,0) 20%,
              rgba(0,0,0,0) 80%,
              rgba(0,0,0,.8)
            ),
            url('/images/font.jpg')
          `,
        }}
      >
       
       
        <div className="absolute bottom-3 right-[16mm] bg-white rounded text-sm font-bold mb-1">
          <QRCode value={qrCodeUrl} size={100} level="H" className="p-1" />
        </div>
      </div>
    )
  }
/*
  // === VIP concert_id 14 ===
  if (
    ticket.category === "CHILD" &&
    (ticket.concert_id === 14 || ticket.concert_id === 13)
  ){

    return (
      <div
        className="flex h-[33mm] bg-black w-full relative overflow-hidden
                   print:h-[33mm] print:w-full print:break-inside-avoid border-black p-[0.1rem] rounded-md"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(0,0,0,.8),
              rgba(0,0,0,0) 20%,
              rgba(0,0,0,0) 80%,
              rgba(0,0,0,.8)
            ),
            url('/images/font.jpg')
          `,
        }}
      >
        <img src="/images/football.jpg" alt="football" className="w-full h-[33mm] rounded mb-1" />
          <div className="absolute bottom-2 left-4 border border-black bg-white p-1 rounded-md italic">
          <h2 className="font-bold italic text-black text-[12px] m-0">N°: {ticket.id}</h2>
        </div>

        <div className="absolute top-2 right-40 bg-white border border-black rounded">
          <QRCode value={qrCodeUrl} size={86} level="H" className="p-1" />
        </div>

        <div className="absolute top-2 left-[31mm] bg-white border border-black rounded">
          <QRCode value={qrCodeUrl} size={86} level="H" className="p-1" />
        </div>
        <div className="absolute bottom-[0.2rem] right-70 border border-black bg-white p-1 rounded-md italic">
          <h2 className="font-bold italic text-black text-[10px] m-0">N°: {ticket.id}</h2>
        </div>

        <div className="absolute bottom-[0.3rem] right-5 border border-black bg-white p-1 rounded-md italic">
          <h2 className="font-bold italic text-black text-[10px] m-0">N°: {ticket.id}</h2>
        </div>
      </div>
    )
  }*/
 
  // === ENFANT ===
  if (ticket.category === "VIP") {
    return (
      <div
        className="flex h-[90mm] bg-black w-[200mm] relative overflow-hidden
                   print:h-[90mm] print:w-[200mm] print:break-inside-avoid"
      >
        <img src="/images/mahaleo2026/MAHALEO-2026-C-VIP-Final.png" alt="MAHALEO Taranaka" className="w-full h-[90mm] rounded mb-2" />

        <p className="absolute bottom-[0.1rem] left-[2.5rem] text-black font-bold mb-1 px-[0.25rem] py-1.5 text-[16px]">
          N°{ticket.id}
        </p>
         <p className="absolute bottom-[0.5rem] right-[0.6rem] text-black font-bold mb-1 px-[0.25rem] py-1.5 text-[14px]">
          N°{ticket.id}
        </p>

        <div className="absolute top-3 right-3 bg-[#e5cc7a] text-black text-xs font-bold mb-1 shadow-md">
          <QRCode value={qrCodeUrl} size={110} level="H" className="p-1 bg-white rounded" />
        </div>
      </div>
    )
  }

  if (ticket.category === "ADULT") {
    return (
      <div
        className="flex h-[90mm] bg-black w-[200mm] relative overflow-hidden
                   print:h-[90mm] print:w-[200mm] print:break-inside-avoid"
      >
        <img src="/images/mahaleo2026/MAHALEO-2026-C-VIP-20k.png" alt="MAHALEO Taranaka" className="w-full h-[90mm] rounded mb-2" />

        <p className="absolute bottom-[0.1rem] left-[2.5rem] text-black font-bold mb-1 px-[0.25rem] py-1.5 text-[16px]">
          N°{ticket.id}
        </p>
         <p className="absolute bottom-[0.5rem] right-[0.6rem] text-black font-bold mb-1 px-[0.25rem] py-1.5 text-[13px]">
          N°{ticket.id}
        </p>

        <div className="absolute top-3 right-3 bg-[#e5cc7a] text-black text-xs font-bold mb-1 shadow-md">
          <QRCode value={qrCodeUrl} size={110} level="H" className="p-1 bg-white rounded" />
        </div>
      </div>
    )
  }
  // === PRÉVENTE ===
  if (ticket.category === "PREVENTE") {
    return (
      <div
        className="flex h-[52.4mm] bg-black w-[105mm] relative overflow-hidden
                   print:h-[52.4mm] print:w-[99mm] print:break-inside-avoid"
      >
        <img src="/images/mahaleo2026/spectacle-6000.png" alt="MAHALEO Taranaka" className="w-full h-[52.4mm] rounded mb-1" />

        <p className="absolute -rotate-90 top-[4.5rem] left-[-1rem] bg-white text-black text-[8px] px-1">
          N°{ticket.id}
        </p>
        <p className="absolute bottom-[0.7rem] right-[1.4rem] text-black text-[8px] font-bold px-1">
          N°{ticket.id}
        </p>

        <p className="absolute bottom-[3.1rem] right-[1.4rem] text-red-800 text-[8px] font-bold px-1">
          N°{ticket.id}
        </p>

        <div className="absolute top-2 right-30 bg-white p-1 shadow">
          <QRCode value={qrCodeUrl} size={50} level="H" />
        </div>
      </div>
    )
  }

  // === VENTE LIVE ===
  if (ticket.category === "VENTELIVE") {
    return (
      <div
        className="flex h-[65.25mm] bg-black w-[200mm] relative overflow-hidden
                   print:h-[65.25mm] print:w-[200mm] print:break-inside-avoid"
      >
        <img src="/images/mahaleo2026/MAHALEO-2026-SIMPLE-Final.png" alt="MAHALEO Taranaka" className="w-full h-[65.25mm] rounded mb-1" />

        <p className="absolute bottom-3 left-8 text-black text-[15px] font-bold px-1">
          N°{ticket.id}
        </p>
        <p className="absolute bottom-13 right-2 text-black text-[13px] font-bold px-1">
          N°{ticket.id}
        </p>

        <div className="absolute top-2 right-2 bg-white p-1 shadow">
          <QRCode value={qrCodeUrl} size={85} level="H" />
        </div>
      </div>
    )
  }

  // === CAS PAR DÉFAUT (ADULTE, AUTRE) ===
  return (
    <div
      className="flex h-[45mm] bg-black w-[140mm] relative overflow-hidden
                 print:h-[45mm] print:w-[140mm] print:break-inside-avoid"
    >
      <img src="/images/billet.jpg" alt="MAHALEO Taranaka" className="w-full h-[45mm] rounded mb-2" />

      <h2 className="absolute top-1 right-2 text-black bg-white px-4 py-0.5 rounded text-xs font-bold">
        N° {ticket.id}
      </h2>

      <div className="absolute bottom-1 right-[32mm] bg-white p-1 rounded shadow">
        <QRCode value={qrCodeUrl} size={50} level="H" />
      </div>
    </div>
  )
}
