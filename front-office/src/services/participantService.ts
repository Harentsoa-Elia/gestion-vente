import { API_BASE_URL, parseJsonSafe } from "./apiConfig";
import type { Participant, ParticipantSignupPayload, ParticipantAuthResponse } from "../types";
import { effacerSession, enregistrerSession, lireRafraichissement } from "@/lib/jetons";

const PARTICIPANT_TOKEN_KEY = "participant_access_token";

export function getParticipantAuthHeaders() {
  const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/** Jeton d'accès + jeton de rafraîchissement (rafraîchissement automatique : lib/jetons.ts). */
export function saveParticipantToken(token: string, refreshToken?: string | null) {
  enregistrerSession("participant", { access_token: token, refresh_token: refreshToken });
}

export function clearParticipantToken() {
  effacerSession("participant");
}

export function getParticipantToken(): string | null {
  return localStorage.getItem(PARTICIPANT_TOKEN_KEY);
}

export async function signupParticipant(payload: ParticipantSignupPayload): Promise<ParticipantAuthResponse> {
  const res = await fetch(`${API_BASE_URL}/participants/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to signup: ${res.statusText}`);
  }
  return data;
}

export async function fetchParticipantMe(): Promise<Participant> {
  const res = await fetch(`${API_BASE_URL}/participants/me`, {
    headers: getParticipantAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch participant: ${res.statusText}`);
  }
  return data;
}

export async function logoutParticipant(): Promise<void> {
  // la session (jeton de rafraîchissement) est fermée aussi côté serveur
  const res = await fetch(`${API_BASE_URL}/participants/logout`, {
    method: "POST",
    headers: getParticipantAuthHeaders(),
    body: JSON.stringify({ refresh_token: lireRafraichissement("participant") }),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.detail || `Failed to logout: ${res.statusText}`);
  }
}