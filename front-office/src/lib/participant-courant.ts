import { getParticipantToken } from "@/services/participantService"

/**
 * Identifiant du participant connecté, lu dans son jeton JWT (champ participant_id).
 * Le jeton n'est pas vérifié ici : c'est le backend qui fait foi. Cette valeur sert
 * seulement à l'interface, par exemple pour retrouver « ma » réaction dans une liste.
 */
export function participantCourantId(): number | null {
  if (typeof window === "undefined") return null
  const jeton = getParticipantToken()
  if (!jeton) return null
  try {
    const charge = jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const donnees = JSON.parse(atob(charge))
    return donnees.account_type === "participant" && typeof donnees.participant_id === "number"
      ? donnees.participant_id
      : null
  } catch {
    return null
  }
}
