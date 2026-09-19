import { API_BASE_URL, parseJsonSafe } from "./apiConfig";
import type { Participant, ParticipantSignupPayload, ParticipantLoginPayload, ParticipantAuthResponse } from "../types";

const PARTICIPANT_TOKEN_KEY = "participant_access_token";

export function getParticipantAuthHeaders() {
  const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export function saveParticipantToken(token: string) {
  localStorage.setItem(PARTICIPANT_TOKEN_KEY, token);
}

export function clearParticipantToken() {
  localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
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

export async function loginParticipant(payload: ParticipantLoginPayload): Promise<ParticipantAuthResponse> {
  const res = await fetch(`${API_BASE_URL}/participants/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to login: ${res.statusText}`);
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