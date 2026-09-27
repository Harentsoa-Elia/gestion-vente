import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig"
import type { EtatEntrees, EvenementControle, ResultatScan } from "../types"

/* Contrôle des billets à l'entrée (compte organisateur ou administrateur). */

async function appel<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, { ...options, headers: { ...getAuthHeaders(), ...options.headers } })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "La demande n'a pas abouti.")
  return data as T
}

export const fetchEvenementsControle = () => appel<EvenementControle[]>("/organisateur/controle/evenements")

export const fetchEtatEntrees = (evenementId: number) => appel<EtatEntrees>(`/organisateur/evenements/${evenementId}/entrees`)

export const scannerBillet = (evenementId: number, code: string) =>
  appel<ResultatScan>(`/organisateur/evenements/${evenementId}/scanner`, { method: "POST", body: JSON.stringify({ code }) })
