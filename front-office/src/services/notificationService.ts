import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig";
import type { Notification, NotificationCount } from "../types";

export async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch(`${API_BASE_URL}/notifications`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch notifications: ${res.statusText}`);
  }
  return data;
}

export async function fetchNotificationCount(): Promise<NotificationCount> {
  const res = await fetch(`${API_BASE_URL}/notifications/count`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch notification count: ${res.statusText}`);
  }
  return data;
}

export async function marquerNotificationsLues(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/marquer-lues`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.detail || `Failed to mark notifications as read: ${res.statusText}`);
  }
}