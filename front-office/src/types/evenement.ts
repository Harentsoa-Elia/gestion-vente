export type StatutValidation = "brouillon" | "en_attente_validation" | "valide" | "rejete"

export interface Evenement {
  id: number
  titre: string
  description: string
  date_debut: string
  date_fin: string | null
  capacite: number | null
  lieu_id: number | null
  categorie_id: number | null
  organisateur_id: number
  statut_validation: StatutValidation
  date_creation: string
  prix_a_partir_de: number | null
  nombre_vues?: number
  /** Pas encore renvoyé par l'API : prévu pour l'affiche de l'événement. */
  image_url?: string | null
}