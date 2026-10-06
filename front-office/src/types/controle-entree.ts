/** Contrôle des billets à l'entrée. Voir backend/app/schemas/controle_entree.py */

export interface BilletScanne {
  numero: string
  categorie: string
  participant: string
  date_scan: string | null
}

export interface EvenementControle {
  id: number
  titre: string
  date_debut: string
  lieu: string | null
  billets_vendus: number
  entres: number
}

export interface EtatEntrees extends EvenementControle {
  par_tarif: { nom: string; vendus: number; entres: number }[]
  derniers: BilletScanne[]
}

export type StatutScan = "valide" | "deja_utilise" | "autre_evenement" | "inconnu" | "annule"

export interface ResultatScan {
  statut: StatutScan
  message: string
  billet: BilletScanne | null
  evenement_billet: string | null
  billets_vendus: number
  entres: number
}
