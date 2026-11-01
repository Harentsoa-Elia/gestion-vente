import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig"
import type { Pilotage, Statistiques } from "../types"

/** Statistiques de tous mes événements (evenementId absent) ou d'un seul. */
export async function fetchStatistiques(evenementId?: number | null): Promise<Statistiques> {
  const q = evenementId ? `?evenement_id=${evenementId}` : ""
  const res = await fetch(`${API_BASE_URL}/organisateur/statistiques${q}`, { headers: getAuthHeaders() })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Impossible de charger les statistiques.")
  return data
}

/** Tableau de bord d'un événement : tarifs, paiements à finaliser, meilleurs acheteurs. */
export async function fetchPilotage(evenementId: number): Promise<Pilotage> {
  const res = await fetch(`${API_BASE_URL}/organisateur/evenements/${evenementId}/pilotage`, { headers: getAuthHeaders() })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Impossible de charger le tableau de bord.")
  return data
}
