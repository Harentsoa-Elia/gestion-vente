/**
 * Rôle du compte staff connecté (table users) : « admin » ou « organisateur ».
 * Les participants ont leur propre jeton (participant_access_token) et le visiteur
 * n'a pas de compte : voir le diagramme de cas d'utilisation (4 acteurs).
 *
 * Le rôle est lu dans le jeton JWT, sans vérification de signature : il ne sert
 * qu'à l'interface (redirections, menus). C'est le backend qui contrôle les droits.
 */
export type RoleStaff = "admin" | "organisateur"

interface ChargeJeton {
  role?: string
  concert_id?: number | null
  expires?: number
}

export function lireJetonStaff(): ChargeJeton | null {
  if (typeof window === "undefined") return null
  const jeton = localStorage.getItem("access_token")
  if (!jeton) return null
  try {
    const charge = jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(charge))
  } catch {
    return null
  }
}

export function jetonValide(charge: ChargeJeton | null): boolean {
  return !!charge && typeof charge.expires === "number" && charge.expires > Date.now() / 1000
}

/** Rôle du jeton ; les jetons émis avant l'ajout du rôle se basent sur concert_id (0 = admin). */
export function roleDepuisJeton(charge: ChargeJeton | null): RoleStaff | null {
  if (!charge) return null
  if (charge.role === "admin" || charge.role === "organisateur") return charge.role
  return charge.concert_id === 0 ? "admin" : "organisateur"
}

/** Page d'accueil de chaque rôle après la connexion. */
export function accueilSelonRole(role: RoleStaff | null): string {
  return role === "admin" ? "/dashboard" : "/organisateur/dashboard"
}

/**
 * Page autorisée pour ce rôle ? Si non, renvoie l'adresse où rediriger.
 * - l'organisateur n'a pas accès à l'administration ni à l'ancien tableau de bord /dashboard ;
 * - l'administrateur n'a pas d'espace organisateur (il n'organise pas d'événements).
 */
export function redirectionSiInterdit(role: RoleStaff | null, chemin: string): string | null {
  if (role === "organisateur" && (chemin === "/dashboard" || chemin.startsWith("/admin"))) {
    return "/organisateur/dashboard"
  }
  if (role === "admin" && chemin.startsWith("/organisateur")) {
    return "/dashboard"
  }
  return null
}
