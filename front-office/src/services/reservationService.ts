import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { Reservation, PaiementConfirme, Billet } from "../types";

export async function createReservation(evenementId: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE_URL}/reservations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ evenement_id: evenementId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to create reservation: ${res.statusText}`);
  }
  return data;
}

export async function payerReservation(reservationId: number): Promise<PaiementConfirme> {
  const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}/payer`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to process payment: ${res.statusText}`);
  }
  return data;
}

export async function fetchBillet(reservationId: number): Promise<Billet> {
  const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}/billet`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch billet: ${res.statusText}`);
  }
  return data;
}

export async function fetchMesReservations(): Promise<Reservation[]> {
  const res = await fetch(`${API_BASE_URL}/reservations/moi`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch reservations: ${res.statusText}`);
  }
  return data;
}