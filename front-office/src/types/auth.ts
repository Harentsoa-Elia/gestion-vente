// Utilisateur authentifié
export interface AuthUser {
  id: number
  fullname: string
  email?: string
  /** "admin" ou "organisateur" */
  role: "admin" | "organisateur"
  /** photo de profil (chemin /media/profils/...) */
  avatar?: string | null
}