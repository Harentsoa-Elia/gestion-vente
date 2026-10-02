export interface EvenementPopulaire {
  id: number
  titre: string
  score_popularite: number
}

export interface VenteParJour {
  date: string
  nombre: number
}

export interface CategoriePopulaire {
  categorie: string
  evenement?: string
  nombre: number
}

export interface DashboardOrganisateur {
  evenements_publies: number
  billets_vendus: number
  taux_remplissage_moyen: number
  recettes_totales: number
  ventes_par_jour: VenteParJour[]
  categories_populaires: CategoriePopulaire[]
  reservations_confirmees?: number
}