import type { Concert } from "../types";
import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";

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