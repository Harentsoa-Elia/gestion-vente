export interface Reservation {
  id: number
  evenement_id: number
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