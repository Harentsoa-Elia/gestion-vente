import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig"
import type { SentimentsEvenement } from "../types/ia"

/** Sentiment des commentaires du public sur les propositions d'un événement (module d'IA). */
export async function fetchSentiments(evenementId: number): Promise<SentimentsEvenement> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/sentiments`, { headers: getAuthHeaders() })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger l'analyse des commentaires.")
  return data
}
