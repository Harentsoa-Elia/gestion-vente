"use client";

import { Concert, Ticket } from "@/types";
import TicketCardBackgroundImage from "./ticket-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import TicketCard from "./ticket-card";

type VIPProps = {
  concerts: Concert[];
  generatedTickets: Ticket[];
  selectedConcertId: string | null;
};

export default function AdulteEnfant({
  concerts,
  generatedTickets,
  selectedConcertId,

}: VIPProps) {
  const selectedConcert = concerts.find(
    (c) => c.id === Number.parseInt(selectedConcertId || "0")
  );

  return (
    <>
      <style jsx global>{`
@media print {

    @page{
        size:A4 portrait;
        margin:5mm;
    }

    html,
    body{
        width:210mm;
        margin:5;
        padding:0;
        overflow:visible !important;
        background:white;
    }

    .no-print{
        display:none !important;
    }

  .grid{
    display:grid !important;
    grid-template-columns:repeat(3,60mm); /* 3 colonnes */
    grid-template-rows:repeat(6,40mm);    /* 6 lignes */
    justify-content:start;
    column-gap:2mm;
    row-gap:2mm;
}

 .ticket-wrapper{
    width:60mm;
    height:40mm;
    page-break-inside:avoid;
    break-inside:avoid;
}

}
`}</style>

      {generatedTickets.length > 0 && (
        <div className="w-full h-auto bg-white print:shadow-none print:border-none">
          
        <div className="grid grid-cols-3 gap-1 print:grid print:grid-cols-3 print:grid-rows-6 print:auto-rows-[45mm] print:gap-2 ">
           {generatedTickets.map((ticket) => (
  <div
    key={ticket.id}
    className="ticket-wrapper flex items-center justify-center"
  >
    <TicketCard
      ticket={ticket}
      concert={selectedConcert!}
    />
  </div>
))}
          </div>
        </div>
      )}
    </>
  );
}
