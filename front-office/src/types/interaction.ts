export type InteractionType = "LIKE" | "WAOUH" | "JADORE" | "COMMENTAIRE" | "FAVORI"

export interface InteractionPublique {
  id: number
  type_interaction: InteractionType
  contenu: string | null
  proposition_id: number
  participant_id: number | null
  date_interaction: string
}

export interface InteractionCreate {
  type_interaction: InteractionType
  contenu: string | null
  proposition_id: number
}