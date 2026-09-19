export interface CategorieBillet {
  id: number
  nom: string
  prix: number
  quantite_disponible: number | null
  evenement_id: number
}

export interface Reservation {
  id: number
  evenement_id: number
  categorie_billet_id: number
  statut: string
  participant_id: number
  date_reservation: string
}

export interface PaiementConfirme {
  reservation_id: number
  statut_reservation: string
  montant_paye: number
  numero_billet: string
  qr_code: string
}

export interface Billet {
  id: number
  numero_billet: string
  qr_code: string
  is_used: boolean
  date_emission: string
  reservation_id: number
}