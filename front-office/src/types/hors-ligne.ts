/** Billets hors ligne (dépôt-vente, guichet, invitations). Voir backend/app/schemas/hors_ligne.py */
import type { ModePaiement } from "./billetterie"

export type TypeLot = "depot" | "guichet" | "invitation"

export interface EvenementLot {
  id: number
  titre: string
  date_debut: string
  tarifs: { id: number; nom: string; prix: number; restantes: number | null; fond_url: string | null }[]
  fond_type: string | null
}

export interface LotResume {
  id: number
  type: TypeLot
  type_libelle: string
  evenement_id: number
  evenement_titre: string
  evenement_date: string
  categorie_nom: string
  revendeur_nom: string | null
  revendeur_contact: string | null
  quantite: number
  prix_unitaire: number
  frais_unitaire: number
  montant_frais: number
  mode_paiement_frais: string
  reference_paiement: string
  date_creation: string
  statut: "en_cours" | "regle"
  vendus_declares: number
  vendus: number
  utilises: number
  annules: number
  seuil: number
  seuil_atteint: boolean
  montant_attendu: number
  date_reglement: string | null
  montant_regle: number | null
  /** fond imprimé : celui du tarif, sinon celui du type d'événement */
  fond_url: string | null
  fond_source: "tarif" | "type" | null
}

export interface LotDetail extends LotResume {
  billets: { numero: string; utilise: boolean; date_scan: string | null; annule: boolean }[]
}

export interface LotsOrganisateur {
  frais_unitaire: number
  seuil_pourcentage: number
  billets_generes: number
  frais_payes: number
  lots: LotResume[]
}

export interface GenerationLot {
  type: TypeLot
  evenement_id: number
  categorie_billet_id: number
  quantite: number
  revendeur_nom?: string
  revendeur_contact?: string
  mode_paiement: ModePaiement
  telephone: string
}

export interface Facturation {
  frais_unitaire: number
  billets_generes: number
  frais_payes: number
  par_type: Partial<Record<TypeLot, number>>
  organisateurs: {
    organisateur_id: number
    nom: string
    email: string
    lots: number
    billets_generes: number
    frais_payes: number
    dernier_lot: string | null
  }[]
  lots_recents: LotResume[]
}

export type FormatImpression = "planche" | "a5"
