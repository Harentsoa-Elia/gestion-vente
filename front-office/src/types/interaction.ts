export type InteractionType = "LIKE" | "COMMENTAIRE" | "FAVORI"

export interface InteractionPublique {
  id: number
  type_interaction: InteractionType
  contenu: string | null
  proposition_id: number
  participant_id: number
  date_interaction: string
}

export interface InteractionCreate {
  type_interaction: InteractionType
  contenu: string | null
  proposition_id: number
}