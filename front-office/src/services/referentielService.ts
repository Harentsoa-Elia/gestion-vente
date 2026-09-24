import { API_BASE_URL, parseJsonSafe } from "./apiConfig";
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
