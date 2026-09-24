import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { Recommandation } from "../types";

/** Recommandation déjà calculée pour un événement, ou null si elle n'a jamais été calculée. */
export async function fetchRecommandation(evenementId: number): Promise<Recommandation | null> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/recommandation`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger la recommandation.");
  return data;
}

/** Calcule (ou recalcule) la recommandation à partir des réactions actuelles du public. */
export async function calculerRecommandation(evenementId: number): Promise<Recommandation> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/recommandation/calculer`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Le calcul de la recommandation a échoué.");
  return data;
}
