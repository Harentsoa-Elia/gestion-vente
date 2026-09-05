import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { DashboardEvenement, EvenementPopulaire } from "../types";

export async function fetchDashboardEvenement(
  evenementId: number
): Promise<DashboardEvenement> {
  const res = await fetch(
    `${API_BASE_URL}/evenements/${evenementId}/dashboard`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to fetch dashboard: ${res.statusText}`
    );
  }
  return data;
}

export async function fetchEvenementsPopulaires(): Promise<EvenementPopulaire[]> {
  const res = await fetch(
    `${API_BASE_URL}/organisateurs/moi/evenements-populaires`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to fetch evenements populaires: ${res.statusText}`
    );
  }
  return data;
}