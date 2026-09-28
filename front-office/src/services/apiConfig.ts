const API_DIRECTE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Sur l'ordinateur (localhost), le navigateur appelle l'API directement.
 * Depuis une autre adresse (téléphone, tunnel https), « localhost » ne désigne plus
 * l'ordinateur : on passe par le relais /api/v1 du site (voir next.config.ts).
 */
function adresseApi() {
  if (typeof window === "undefined") return API_DIRECTE
  const hote = window.location.hostname
  return hote === "localhost" || hote === "127.0.0.1" ? API_DIRECTE : "/api/v1"
}

export const API_BASE_URL = adresseApi();

export function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}