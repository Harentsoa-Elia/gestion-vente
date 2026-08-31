import type {
  Concert,
  Ticket,
  TicketScanResponse,
  TicketStats,
  DynamicCategoryStats,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ======================================================
// 🎵 Concerts
// ======================================================
export async function fetchConcerts(): Promise<Concert[]> {
  const res = await fetch(`${API_BASE_URL}/concerts`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await parseJsonSafe(res);
    throw new Error(
      errorData?.detail || `Failed to fetch concerts: ${res.statusText}`
    );
  }
  return res.json();
}

export async function createConcert(
  concertData: Omit<Concert, "id">
): Promise<Concert> {
  const res = await fetch(`${API_BASE_URL}/concerts`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(concertData),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to create concert: ${res.statusText}`
    );
  }
  return data;
}

export async function fetchConcertAmount(concertId: string) {
  const res = await fetch(`${API_BASE_URL}/concerts/${concertId}/amount`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `Erreur lors du chargement des montants du concert: ${res.status}`
    );
  }
  const data = await res.json();
  console.log("Montants du concert:", data);
  return data;
}

// ======================================================
// 🎟️ Tickets
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

// ======================================================
// 📊 Catégories dynamiques
// ======================================================
export async function fetchTicketCategoryStats(
  concertId: string | number
): Promise<DynamicCategoryStats> {
  const res = await fetch(
    `${API_BASE_URL}/concerts/${concertId}/tickets/count-by-category`,
    { headers: getAuthHeaders() }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      data?.detail || "Impossible de récupérer les statistiques par catégorie"
    );
  }

  // ✅ le backend renvoie { categories: { "VENTELIVE": {...}, "CHILD": {...} } }
  return (data.categories ?? {}) as DynamicCategoryStats;
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

// 🎟️ Tickets - Regenerate
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
