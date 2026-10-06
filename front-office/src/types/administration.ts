/** Espace administrateur. Voir backend/app/schemas/administration.py */

export interface ActiviteAdmin {
  type: "vente" | "inscription" | "evenement" | "entree"
  date: string
  texte: string
  lien: string | null
}

export interface VueEnsemble {
  organisateurs: number
  organisateurs_suspendus: number
  participants: number
  participants_verifies: number
  evenements: Record<string, number>
  billets_vendus: number
  total_ventes: number
  entrees: number
  ventes_30_jours: { date: string; billets: number; montant: number }[]
  top_evenements: { id: number; titre: string; vendus: number; recettes: number }[]
  activite: ActiviteAdmin[]
}

export interface CompteEquipe {
  id: number
  fullname: string
  email: string
  role: "admin" | "organisateur"
  actif: boolean
  evenements: number
  evenements_valides: number
  evenements_en_attente: number
  billets_vendus: number
  total_ventes: number
}

export interface ParticipantAdmin {
  id: number
  prenom: string
  nom: string
  email: string
  telephone: string | null
  genre: string | null
  date_naissance: string | null
  email_verifie: boolean
  statut: "actif" | "suspendu" | string
  date_creation: string | null
  billets: number
  total_depense: number
}

export interface ElementReferentiel {
  id: number
  nom: string
  detail: string | null
  utilisations: number
  /** types d'événement : fond des billets */
  fond_url?: string | null
}

export type TableReferentiel = "categories" | "lieux" | "artistes"

export type Referentiel = Record<TableReferentiel, ElementReferentiel[]>
