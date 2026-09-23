import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import { getParticipantAuthHeaders } from "./participantService";
import type { Reservation, PaiementConfirme, Billet, CategorieBillet, ReservationDetail, ParticipantOrganisateur, PaiementOrganisateur } from "../types";

export async function fetchCategoriesBillet(evenementId: number): Promise<CategorieBillet[]> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/categories-billet`);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch categories: ${res.statusText}`);
  }
  return data;
}

export async function createReservation(evenementId: number, categorieBilletId: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE_URL}/reservations`, {
    method: "POST",
    headers: getParticipantAuthHeaders(),
    body: JSON.stringify({ evenement_id: evenementId, categorie_billet_id: categorieBilletId }),
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
    headers: getParticipantAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to process payment: ${res.statusText}`);
  }
  return data;
}

export async function fetchBillet(reservationId: number): Promise<Billet> {
  const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}/billet`, {
    headers: getParticipantAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch billet: ${res.statusText}`);
  }
  return data;
}

export async function fetchMesReservations(): Promise<Reservation[]> {
  const res = await fetch(`${API_BASE_URL}/reservations/moi`, {
    headers: getParticipantAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch reservations: ${res.statusText}`);
  }
  return data;
}

export async function fetchReservationsByEvenement(evenementId: number): Promise<ReservationDetail[]> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/reservations`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch reservations: ${res.statusText}`);
  }
  return data;
}

export async function fetchMesParticipants(): Promise<ParticipantOrganisateur[]> {
  const res = await fetch(`${API_BASE_URL}/organisateur/participants`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch participants: ${res.statusText}`);
  }
  return data;
}

export async function fetchMesPaiements(): Promise<PaiementOrganisateur[]> {
  const res = await fetch(`${API_BASE_URL}/organisateur/paiements`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch paiements: ${res.statusText}`);
  }
  return data;
}