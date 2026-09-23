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