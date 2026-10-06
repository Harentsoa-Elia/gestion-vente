export interface CategorieBillet {
  id: number
  nom: string
  prix: number
  quantite_disponible: number | null
  evenement_id: number
  /** fond d'image des billets de ce tarif (/media/fonds/…) */
  fond_url?: string | null
}

export interface ParticipantSummary {
  id: number
  nom: string
  prenom: string
  email: string
  telephone?: string | null
  /** photo de profil */
  avatar?: string | null
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
  /** photo de profil */
  avatar?: string | null
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