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

export interface ParticipantSummary {
  id: number
  nom: string
  prenom: string
  email: string
}

export interface CategorieBilletSummary {
  id: number
  nom: string
  prix: number
}

export interface ReservationDetail {
  id: number
  statut: string
  date_reservation: string
  evenement_id: number
  participant: ParticipantSummary
  categorie_billet: CategorieBilletSummary
}

export interface ParticipantOrganisateur {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  nb_reservations: number
  montant_total_depense: number
  derniere_reservation: string
}

export interface PaiementOrganisateur {
  id: number
  montant: number
  statut_paiement: string
  mode_paiement: string
  date_paiement: string | null
  evenement_titre: string
  participant_nom: string
  participant_prenom: string
}