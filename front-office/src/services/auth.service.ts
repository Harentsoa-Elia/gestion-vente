import { effacerSession, lireRafraichissement } from "@/lib/jetons";
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

/** Photo de profil d'un membre de l'équipe : envoi de l'image (JPEG, PNG ou WebP), ou retrait avec null. */
export async function envoyerPhotoEquipe(fichier: File | null): Promise<AuthUser> {
  const { Authorization } = getAuthHeaders() as { Authorization?: string };
  const res = await fetch(`${API_BASE_URL}/users/me/photo`, {
    method: fichier ? "PUT" : "DELETE",
    headers: fichier ? { Authorization: Authorization ?? "", "Content-Type": fichier.type } : { Authorization: Authorization ?? "" },
    body: fichier ?? undefined,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "La photo n'a pas été enregistrée.");
  return data;
}

/**
 * Déconnexion : le jeton est révoqué côté serveur, puis TOUJOURS retiré du navigateur,
 * même si le serveur répond une erreur (jeton déjà révoqué ou expiré, serveur arrêté).
 * Sans ce retrait, un jeton révoqué restait dans localStorage : l'interface se croyait
 * connectée et chaque nouvelle déconnexion échouait avec "Token has been revoked".
 */
export async function logout(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
      // la session (jeton de rafraîchissement) est fermée aussi côté serveur
      body: JSON.stringify({ refresh_token: lireRafraichissement("equipe") }),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      console.warn("Déconnexion côté serveur impossible :", data?.detail || res.statusText);
    }
  } catch (erreur) {
    console.warn("Déconnexion côté serveur impossible :", erreur);
  } finally {
    effacerSession("equipe");
  }
}