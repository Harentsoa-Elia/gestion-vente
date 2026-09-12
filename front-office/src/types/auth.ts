// Utilisateur authentifié
export interface AuthUser {
  id: number
  fullname: string
  email?: string
  concert_id: number | null
}