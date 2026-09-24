import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { Artiste, Categorie, Lieu } from "../types";

export async function fetchLieux(): Promise<Lieu[]> {
  const res = await fetch(`${API_BASE_URL}/lieux`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger les lieux.");
  return data;
}

export async function fetchCategories(): Promise<Categorie[]> {
  const res = await fetch(`${API_BASE_URL}/categories`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger les catégories.");
  return data;
}

export async function fetchArtistes(): Promise<Artiste[]> {
  const res = await fetch(`${API_BASE_URL}/artistes`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Impossible de charger les artistes.");
  return data;
}

async function creer<T>(chemin: string, corps: unknown, erreur: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || erreur);
  return data;
}

export const createLieu = (saisie: { nom: string; ville: string | null; adresse: string | null; capacite: number | null }) =>
  creer<Lieu>("/lieux", saisie, "Le lieu n'a pas été créé.");

export const createArtiste = (saisie: { nom: string; genre_artistique: string | null; description: string | null }) =>
  creer<Artiste>("/artistes", saisie, "L'artiste n'a pas été créé.");
