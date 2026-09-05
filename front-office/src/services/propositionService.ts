import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { PropositionAvecScore } from "../types";

export async function fetchPropositionsAvecScores(
  evenementId: number
): Promise<PropositionAvecScore[]> {
  const res = await fetch(
    `${API_BASE_URL}/evenements/${evenementId}/propositions/scores`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to fetch propositions: ${res.statusText}`
    );
  }
  return data;
}