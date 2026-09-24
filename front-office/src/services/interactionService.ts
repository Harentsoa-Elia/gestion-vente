import { API_BASE_URL, parseJsonSafe } from "./apiConfig";
import { getParticipantAuthHeaders } from "./participantService";
import type { InteractionCreate, InteractionPublique } from "../types";

export async function createInteraction(
  interaction: InteractionCreate
): Promise<InteractionPublique> {
  const res = await fetch(`${API_BASE_URL}/interactions`, {
    method: "POST",
    headers: getParticipantAuthHeaders(),
    body: JSON.stringify(interaction),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to create interaction: ${res.statusText}`
    );
  }
  return data;
}

/** Réactions et commentaires d'une proposition (lecture publique). */
export async function fetchInteractionsProposition(
  propositionId: number
): Promise<InteractionPublique[]> {
  const res = await fetch(`${API_BASE_URL}/propositions/${propositionId}/interactions`, {
    headers: getParticipantAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || "Impossible de charger les réactions.");
  }
  return data;
}

/** Supprime une interaction : réservé à son auteur connecté (ou à l'administrateur). */
export async function supprimerInteraction(interactionId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/interactions/${interactionId}`, {
    method: "DELETE",
    headers: getParticipantAuthHeaders(),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.detail || "Impossible de retirer la réaction.");
  }
}
