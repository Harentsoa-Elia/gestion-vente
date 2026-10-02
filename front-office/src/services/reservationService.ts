import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { ReservationDetail, ParticipantOrganisateur, PaiementOrganisateur } from "../types";

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