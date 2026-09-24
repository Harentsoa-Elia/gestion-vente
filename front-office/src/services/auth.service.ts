import type { AuthUser } from "../types";
import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";

export async function fetchUserData(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to fetch user data: ${res.statusText}`
    );
  }
  return data;
}

/**
 * Déconnexion : le jeton est révoqué côté serveur, puis TOUJOURS retiré du navigateur,
 * même si le serveur répond une erreur (jeton déjà révoqué ou expiré, serveur arrêté).
 * Sans ce retrait, un jeton révoqué restait dans localStorage : l'interface se croyait
 * connectée et chaque nouvelle déconnexion échouait avec « Token has been revoked ».
 */
export async function logout(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      console.warn("Déconnexion côté serveur impossible :", data?.detail || res.statusText);
    }
  } catch (erreur) {
    console.warn("Déconnexion côté serveur impossible :", erreur);
  } finally {
    localStorage.removeItem("access_token");
  }
}