export interface DashboardEvenement {
  evenement_id: number
  titre: string
  capacite: number | null
  taux_remplissage: number | null
  score_popularite: number
  niveau_interet_estime: number | null
  participation_estimee: number | null
}

export interface EvenementPopulaire {
  id: number
  titre: string
  score_popularite: number
}