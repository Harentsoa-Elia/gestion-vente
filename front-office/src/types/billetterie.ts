/** Billetterie côté participant (paiement Mobile Money simulé). Voir backend/app/schemas/billetterie.py */

export type ModePaiement = "mvola" | "orange_money" | "airtel_money"

export interface TarifDisponible {
  id: number
  nom: string
  prix: number
  quantite_disponible: number | null
  /** Places encore disponibles, null : sans limite */
  restantes: number | null
}

export interface LotReserve {
  reservations: { id: number; montant: number; expire_le: string }[]
  montant_total: number
  evenement_titre: string
  categorie_nom: string
}

/** Une réservation du participant, avec son billet une fois payée. */
export interface BilletParticipant {
  reservation_id: number
  statut: "en_attente" | "confirmee" | string
  date_reservation: string
  expire_le: string | null
  evenement_id: number
  evenement_titre: string
  evenement_date: string
  evenement_image: string | null
  lieu: string | null
  categorie_nom: string
  prix: number
  mode_paiement: ModePaiement | string | null
  date_paiement: string | null
  numero_billet: string | null
  qr_code: string | null
  utilise: boolean
}

export interface PaiementLotConfirme {
  montant_total: number
  mode_paiement: ModePaiement
  reference: string
  email: string
  billets: BilletParticipant[]
}
