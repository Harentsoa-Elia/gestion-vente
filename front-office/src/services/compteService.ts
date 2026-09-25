import { API_BASE_URL, parseJsonSafe } from "./apiConfig";
import { getParticipantAuthHeaders } from "./participantService";

/*
 * Confirmation de l'adresse e-mail (participants) et « mot de passe oublié »
 * (participants et équipe). Voir backend/app/controllers/compte_controller.py.
 */

export type EspaceCompte = "participant" | "equipe";

async function poster<T>(chemin: string, corps?: unknown, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    // erreurs de validation (422) : message lisible plutôt que le détail technique
    const detail = typeof data?.detail === "string" ? data.detail : res.status === 422 ? "Vérifiez les informations saisies." : null;
    throw new Error(detail || "Une erreur est survenue. Réessayez.");
  }
  return data as T;
}

/** Participant connecté : envoie (ou renvoie) le code de confirmation de son adresse. */
export function envoyerCodeVerification() {
  return poster<{ message: string; email_verifie: boolean }>("/participants/verification/envoyer", undefined, getParticipantAuthHeaders());
}

export function confirmerEmail(code: string) {
  return poster<{ message: string; email_verifie: boolean }>("/participants/verification/confirmer", { code }, getParticipantAuthHeaders());
}

const prefixe = (espace: EspaceCompte) => (espace === "participant" ? "/participants" : "");

export function demanderCodeMotDePasse(espace: EspaceCompte, email: string) {
  return poster<{ message: string }>(`${prefixe(espace)}/mot-de-passe/oublie`, { email });
}

/** Participant : la réponse contient aussi un jeton (connexion directe). */
export function reinitialiserMotDePasse(espace: EspaceCompte, saisie: { email: string; code: string; nouveau_mot_de_passe: string }) {
  return poster<{ message: string; access_token?: string }>(`${prefixe(espace)}/mot-de-passe/reinitialiser`, saisie);
}
