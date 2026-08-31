"use client";

import { Concert, Ticket } from "@/lib/types";
import TicketCard from "./fond/billet";

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
          body,
          html {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important; /* Prevent scrollbars on print */
          }
        }
      `}</style>

      {generatedTickets.length > 0 && (
        <div className="w-full h-auto bg-white print:shadow-none print:border-none">
          
        <div className="grid grid-cols-2 gap-3 print:grid print:grid-cols-2">
            {generatedTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                concert={selectedConcert!}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
