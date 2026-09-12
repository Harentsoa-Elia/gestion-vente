import type { DynamicCategoryStats } from "../types";
import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";

// ======================================================
// Catégories dynamiques
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

  // le backend renvoie { categories: { "VENTELIVE": {...}, "CHILD": {...} } }
  return (data.categories ?? {}) as DynamicCategoryStats;
}