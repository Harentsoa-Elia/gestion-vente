import { API_BASE_URL, parseJsonSafe } from "./apiConfig"
import { getParticipantAuthHeaders } from "./participantService"
import type { BilletParticipant, LotReserve, ModePaiement, PaiementLotConfirme, TarifDisponible } from "../types"

/*
 * Billetterie du participant : réserver plusieurs billets, payer (Mobile Money SIMULÉ :
 * aucun opérateur n'est contacté), retrouver ses billets, télécharger le PDF, le renvoyer par e-mail.
 */

async function appel<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, { ...options, headers: { ...getParticipantAuthHeaders(), ...options.headers } })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    const detail = data?.detail
    throw new Error(typeof detail === "string" ? detail : "La demande n'a pas abouti. Réessayez.")
  }
  return data as T
}

export async function fetchTarifs(evenementId: number): Promise<TarifDisponible[]> {
  const res = await fetch(`${API_BASE_URL}/evenements/${evenementId}/tarifs`)
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger les tarifs.")
  return data
}

export const reserverLot = (evenementId: number, categorieBilletId: number, quantite: number) =>
  appel<LotReserve>("/reservations/lot", {
    method: "POST",
    body: JSON.stringify({ evenement_id: evenementId, categorie_billet_id: categorieBilletId, quantite }),
  })

export const payerLot = (reservationIds: number[], mode: ModePaiement, telephone: string) =>
  appel<PaiementLotConfirme>("/reservations/paiement", {
    method: "POST",
    body: JSON.stringify({ reservation_ids: reservationIds, mode_paiement: mode, telephone }),
  })

export const fetchMesBillets = () => appel<BilletParticipant[]>("/participants/me/billets")

export const renvoyerBillet = (reservationId: number) =>
  appel<{ message: string }>(`/reservations/${reservationId}/renvoyer-billet`, { method: "POST" })

export const annulerReservation = (reservationId: number) =>
  appel<{ message: string }>(`/reservations/${reservationId}`, { method: "DELETE" })

/** Télécharge le billet PDF (la route exige le jeton : on passe par fetch puis un lien temporaire). */
export async function telechargerBilletPdf(reservationId: number, numero?: string | null) {
  const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}/billet.pdf`, { headers: getParticipantAuthHeaders() })
  if (!res.ok) {
    const data = await parseJsonSafe(res)
    throw new Error(data?.detail || "Le billet n'a pas pu être téléchargé.")
  }
  const url = URL.createObjectURL(await res.blob())
  const lien = document.createElement("a")
  lien.href = url
  lien.download = `billet-${numero ?? reservationId}.pdf`
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
