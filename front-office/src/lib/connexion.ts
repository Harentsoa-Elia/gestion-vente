import { API_BASE_URL } from "@/services/apiConfig"
import { type Espace } from "@/lib/jetons"

/*
 * Connexion par e-mail et mot de passe aux deux types de comptes :
 * - participant (table participants) : POST /participants/login ;
 * - équipe, c'est-à-dire organisateur ou administrateur (table users) : POST /login.
 * Chaque page de connexion essaie d'abord son type de compte, puis l'autre : on peut
 * ainsi se connecter depuis n'importe laquelle des deux pages sans se tromper d'espace.
 *
 * Renvoie le jeton, ou null si l'e-mail ou le mot de passe ne correspond pas.
 * Lève une TypeError si le serveur ne répond pas.
 */

async function essayer(chemin: string, corps: object): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  })
  if (res.status === 403 || res.status === 401 || res.status === 404 || res.status === 422) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "La connexion a échoué.")
  if (typeof data.access_token !== "string") return null
  // le jeton de rafraîchissement est rangé tout de suite ; l'appelant enregistre le jeton d'accès
  if (typeof data.refresh_token === "string") {
    const espace: Espace = chemin.startsWith("/participants") ? "participant" : "equipe"
    localStorage.setItem(espace === "participant" ? "participant_refresh_token" : "refresh_token", data.refresh_token)
  }
  return data.access_token
}

export function connexionParticipant(email: string, motDePasse: string) {
  return essayer("/participants/login", { email: email.trim(), mot_de_passe: motDePasse })
}

export function connexionEquipe(email: string, motDePasse: string) {
  return essayer("/login", { email: email.trim(), password: motDePasse })
}

export const MESSAGE_IDENTIFIANTS = "Adresse e-mail ou mot de passe incorrect."
