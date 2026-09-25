import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import { getParticipantAuthHeaders } from "./participantService";
import type { Proposition, PropositionAvecScore, PropositionType } from "../types";

export async function fetchPropositionsAvecScores(
  evenementId: number
): Promise<PropositionAvecScore[]> {
  const res = await fetch(
    `${API_BASE_URL}/evenements/${evenementId}/propositions/scores`,
    { headers: getParticipantAuthHeaders() }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch propositions: ${res.statusText}`);
  }
  return data;
}

/**
 * Soumet au public un lieu, un artiste ou une catégorie pour un événement.
 * Le libellé est laissé au backend : il reprend le nom de l'élément choisi.
 */
export async function createProposition(saisie: {
  evenement_id: number;
  type: PropositionType;
  lieu_id?: number;
  artiste_id?: number;
  categorie_id?: number;
}): Promise<Proposition> {
  const res = await fetch(`${API_BASE_URL}/propositions`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(saisie),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "La proposition n'a pas été ajoutée.");
  return data;
}

export async function deleteProposition(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/propositions/${id}`, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.detail || "La proposition n'a pas été supprimée.");
  }
}

/* ---------- visuel d'une proposition ---------- */

export async function envoyerImageProposition(id: number, fichier: File): Promise<Proposition> {
  const res = await fetch(`${API_BASE_URL}/propositions/${id}/image`, {
    method: "PUT",
    headers: { ...getAuthHeaders(), "Content-Type": fichier.type },
    body: fichier,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "L'image n'a pas été enregistrée.");
  return data;
}

export async function retirerImageProposition(id: number): Promise<Proposition> {
  const res = await fetch(`${API_BASE_URL}/propositions/${id}/image`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "L'image n'a pas été retirée.");
  return data;
}
