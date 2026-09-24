// Utilisateur authentifié
export interface AuthUser {
  id: number
  fullname: string
  email?: string
  concert_id: number | null
  /** « admin » ou « organisateur » (absent des réponses d'un ancien backend) */
  role?: "admin" | "organisateur"
}