import type { Ticket, TicketScanResponse, TicketStats } from "../types";
import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";

// ======================================================
// Tickets
// ======================================================

export async function generateTickets(
  concertId: number,
  quantity: number,
  category: string
): Promise<Ticket[]> {
  const res = await fetch(`${API_BASE_URL}/tickets/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ concert_id: concertId, quantity, category }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to generate tickets: ${res.statusText}`
    );
  }
  return data;
}

export async function scanTicket(
  qrCodeData: string
): Promise<TicketScanResponse> {
  const res = await fetch(`${API_BASE_URL}/tickets/scan`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ qr_code_data: qrCodeData }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to scan ticket: ${res.statusText}`);
  }
  return data;
}

export async function fetchTicketStats(
  concertId: string
): Promise<TicketStats> {
  const res = await fetch(
    `${API_BASE_URL}/concerts/${concertId}/tickets/count`,
    {
      headers: getAuthHeaders(),
    }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to fetch ticket stats: ${res.statusText}`
    );
  }
  return data;
}

export async function fetchTicketLists(concertId: string) {
  const res = await fetch(
    `${API_BASE_URL}/concerts/${concertId}/tickets/list-by-category`,
    {
      headers: getAuthHeaders(),
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      data?.detail || `Erreur lors du chargement des tickets: ${res.status}`
    );
  }

  return data;
}

export async function regenerateTickets(
  concertId: number,
  ticketIdStart: string,
  ticketIdEnd?: string
): Promise<Ticket[]> {
  const res = await fetch(`${API_BASE_URL}/tickets/regenerate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      concert_id: concertId,
      ticket_id_start: ticketIdStart,
      ticket_id_end: ticketIdEnd || ticketIdStart,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to regenerate tickets: ${res.statusText}`
    );
  }
  return data;
}