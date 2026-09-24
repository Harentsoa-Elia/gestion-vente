/** Recommandation calculée par le backend (app/services/recommandation_service.py). */
export interface Recommandation {
  id: number
  evenement_id: number
  /** Moyenne des parts de score des propositions gagnantes, en % (0 à 100). */
  niveau_interet_estime: number | null
  /** Capacité du lieu gagnant × niveau d'intérêt. */
  participation_estimee: number | null
  artiste_id: number | null
  lieu_id: number | null
  categorie_id: number | null
  /** Somme des scores des propositions gagnantes (lieu, artiste, catégorie). */
  score_engagement_total: number | null
  date_calcul: string
}
