export type Genre = "Masculin" | "Feminin" | "Autre"

export interface Participant {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  adresse: string | null
  date_naissance: string | null
  genre: Genre | null
  avatar: string | null
  statut: string
  /** Adresse confirmée par un code reçu par e-mail : obligatoire pour réserver. */
  email_verifie: boolean
  date_creation: string
}

export interface ParticipantSignupPayload {
  nom: string
  prenom: string
  email: string
  mot_de_passe: string
  telephone?: string
  adresse?: string
  date_naissance: string
  genre: Genre
}

export interface ParticipantLoginPayload {
  email: string
  mot_de_passe: string
}

export interface ParticipantAuthResponse {
  access_token: string
}