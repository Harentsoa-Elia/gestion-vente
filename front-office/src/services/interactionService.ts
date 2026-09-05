import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { InteractionCreate, InteractionPublique } from "../types";

export async function createInteraction(
  interaction: InteractionCreate
): Promise<InteractionPublique> {
  const res = await fetch(`${API_BASE_URL}/interactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(interaction),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.detail || `Failed to create interaction: ${res.statusText}`
    );
  }
  return data;
}