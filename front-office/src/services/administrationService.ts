import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig"
import type { CompteEquipe, ParticipantAdmin, Referentiel, TableReferentiel, VueEnsemble } from "../types"

/* Espace administrateur (réservé au rôle admin côté serveur). */

async function appel<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, { ...options, headers: { ...getAuthHeaders(), ...options.headers } })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    const d = data?.detail
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? "Vérifiez les champs du formulaire." : "La demande n'a pas abouti.")
  }
  return data as T
}

const json = (methode: string, corps: unknown): RequestInit => ({ method: methode, body: JSON.stringify(corps) })

export const fetchVueEnsemble = () => appel<VueEnsemble>("/admin/vue-ensemble")

export const fetchComptesEquipe = () => appel<CompteEquipe[]>("/admin/organisateurs")
export const creerCompteEquipe = (saisie: { fullname: string; email: string; password: string; role: "admin" | "organisateur" }) =>
  appel<{ id: number; message: string }>("/admin/organisateurs", json("POST", saisie))
export const modifierCompteEquipe = (id: number, saisie: { role?: "admin" | "organisateur"; actif?: boolean }) =>
  appel<{ message: string }>(`/admin/organisateurs/${id}`, json("PATCH", saisie))
export const supprimerCompteEquipe = (id: number) => appel<{ message: string }>(`/admin/organisateurs/${id}`, { method: "DELETE" })

export const fetchParticipantsAdmin = () => appel<ParticipantAdmin[]>("/admin/participants")
export const modifierParticipantAdmin = (id: number, statut: "actif" | "suspendu") =>
  appel<{ message: string }>(`/admin/participants/${id}`, json("PATCH", { statut }))

export const fetchReferentielAdmin = () => appel<Referentiel>("/admin/referentiel")
export const supprimerElementReferentiel = (table: TableReferentiel, id: number) =>
  appel<{ message: string }>(`/admin/referentiel/${table}/${id}`, { method: "DELETE" })

/** Création et modification : routes existantes du référentiel (POST, PUT /categories, /lieux, /artistes). */
export const enregistrerElementReferentiel = (table: TableReferentiel, id: number | null, saisie: Record<string, unknown>) =>
  appel<{ id: number; nom: string }>(id ? `/${table}/${id}` : `/${table}`, json(id ? "PUT" : "POST", saisie))
