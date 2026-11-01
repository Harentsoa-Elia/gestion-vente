/** Statistiques de l'organisateur. Voir backend/app/schemas/statistiques.py */

export interface StatEvenement {
  id: number
  titre: string
  date_debut: string
  capacite: number | null
  vendus: number
  entres: number
  recettes: number
  taux_remplissage: number | null
  score_popularite: number
}

export interface Statistiques {
  evenement_id: number | null
  indicateurs: {
    billets_vendus: number
    recettes: number
    entres: number
    non_scannes: number
    capacite: number | null
    places_restantes: number | null
    taux_remplissage: number | null
    en_attente: number
    participants: number
  }
  ventes_par_jour: { date: string; billets: number; montant: number }[]
  par_tarif: { nom: string; vendus: number; montant: number }[]
  genres: { libelle: string; nombre: number }[]
  tranches_age: { libelle: string; nombre: number }[]
  evenements: StatEvenement[]
  /** billets hors ligne (dépôt-vente, guichet, invitations), déjà inclus dans les indicateurs */
  hors_ligne: {
    emis: number
    vendus: number
    invitations: number
    en_depot: number
    entres: number
    non_scannes: number
    recettes: number
    a_encaisser: number
    frais_payes: number
    par_type: { type: "depot" | "guichet" | "invitation"; libelle: string; emis: number; vendus: number; entres: number }[]
  }
}

/** Tableau de bord d'un événement (onglet "Tableau de bord" de sa fiche). Voir backend/app/schemas/statistiques.py */
export interface Pilotage {
  evenement_id: number
  tarifs: { id: number; nom: string; prix: number; quota: number | null; vendus: number; recettes: number; part: number }[]
  /** recette si tout est vendu ; null quand un tarif est sans limite */
  recette_potentielle: number | null
  en_attente: { participant: string; tarif: string; billets: number; montant: number; expire_le: string }[]
  montant_en_attente: number
  meilleurs_acheteurs: { participant: string; billets: number; montant: number }[]
}
