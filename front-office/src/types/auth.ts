// Utilisateur authentifié
export interface AuthUser {
  id: number
  fullname: string
  email?: string
  /** 'admin' ou 'organisateur' */
  role: "admin" | "organisateur"
}