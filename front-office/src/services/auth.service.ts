import type { AuthUser } from "../types";
import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";

// ======================================================
// 🔐 Authentification
// ======================================================

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

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.detail || `Failed to logout: ${res.statusText}`);
  }
}