import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { Evenement, CategorieBillet } from "../types";

export async function fetchEvenements(): Promise<Evenement[]> {
  const res = await fetch(`${API_BASE_URL}/evenements`);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch evenements: ${res.statusText}`);
  }
  return data;
}

export async function fetchAllEvenements(): Promise<Evenement[]> {
  const res = await fetch(`${API_BASE_URL}/evenements/all`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch evenements: ${res.statusText}`);
  }
  return data;
}

export async function fetchEvenementById(id: number): Promise<Evenement> {
  const res = await fetch(`${API_BASE_URL}/evenements/${id}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch evenement: ${res.statusText}`);
  }
  return data;
}

export async function fetchCategoriesBilletByEvenement(id: number): Promise<CategorieBillet[]> {
  const res = await fetch(`${API_BASE_URL}/evenements/${id}/categories-billet`);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch categories: ${res.statusText}`);
  }
  return data;
}
/* ---------- gestion par l'organisateur ---------- */

/** Données envoyées pour créer ou modifier un événement (dates au format ISO). */
export interface EvenementSaisie {
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string | null;
  capacite: number | null;
  lieu_id: number | null;
  categorie_id: number | null;
}

async function envoyer<T>(url: string, method: string, corps?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map((d: { msg: string }) => d.msg).join(" ; ") : data?.detail;
    throw new Error(detail || `Erreur ${res.status}`);
  }
  return data as T;
}

export const createEvenement = (saisie: EvenementSaisie) =>
  envoyer<Evenement>(`${API_BASE_URL}/evenements`, "POST", saisie);

export const updateEvenement = (id: number, saisie: Partial<EvenementSaisie>) =>
  envoyer<Evenement>(`${API_BASE_URL}/evenements/${id}`, "PUT", saisie);

export const deleteEvenement = (id: number) => envoyer<{ message: string }>(`${API_BASE_URL}/evenements/${id}`, "DELETE");

/** Soumet l'événement à l'administrateur (brouillon ou rejeté -> en attente de validation). */
export const soumettreEvenement = (id: number) =>
  envoyer<Evenement>(`${API_BASE_URL}/evenements/${id}/publier`, "POST");

export const createCategorieBillet = (saisie: { evenement_id: number; nom: string; prix: number; quantite_disponible: number | null }) =>
  envoyer<CategorieBillet>(`${API_BASE_URL}/categories-billet`, "POST", saisie);

export const updateCategorieBillet = (id: number, saisie: { nom?: string; prix?: number; quantite_disponible?: number | null }) =>
  envoyer<CategorieBillet>(`${API_BASE_URL}/categories-billet/${id}`, "PUT", saisie);

export const deleteCategorieBillet = (id: number) =>
  envoyer<{ message: string }>(`${API_BASE_URL}/categories-billet/${id}`, "DELETE");
