import { API_BASE_URL, getAuthHeaders, parseJsonSafe } from "./apiConfig"
import type {
  CategorieBillet,
  Categorie,
  EvenementLot,
  Facturation,
  FormatImpression,
  GenerationLot,
  LotDetail,
  LotsOrganisateur,
  RevendeurFiche,
} from "../types"

/* Billets hors ligne (organisateur), impression, fonds des billets et facturation (administrateur). */

export class ErreurApi extends Error {
  constructor(message: string, public statut: number) {
    super(message)
  }
}

async function appel<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map((d: { msg: string }) => d.msg).join(" ; ") : data?.detail
    throw new ErreurApi(typeof detail === "string" ? detail : "La demande n'a pas abouti.", res.status)
  }
  return data as T
}

export const fetchEvenementsLot = () => appel<EvenementLot[]>("/organisateur/hors-ligne/evenements")

export const fetchLots = () => appel<LotsOrganisateur>("/organisateur/hors-ligne/lots")

export const fetchLot = (id: number) => appel<LotDetail>(`/organisateur/hors-ligne/lots/${id}`)

export const genererLot = (saisie: GenerationLot) =>
  appel<LotDetail>("/organisateur/hors-ligne/lots", { method: "POST", body: JSON.stringify(saisie) })

export const declarerVendus = (id: number, vendus: number) =>
  appel<LotDetail>(`/organisateur/hors-ligne/lots/${id}/vendus`, { method: "PATCH", body: JSON.stringify({ vendus }) })

export const reglerLot = (id: number, numerosInvendus: string[], forcer = false) =>
  appel<LotDetail>(`/organisateur/hors-ligne/lots/${id}/reglement`, {
    method: "POST",
    body: JSON.stringify({ numeros_invendus: numerosInvendus, forcer }),
  })

export const fetchRevendeurs = () => appel<RevendeurFiche[]>("/organisateur/hors-ligne/revendeurs")

export const modifierRevendeur = (id: number, champs: { nom?: string; contact?: string }) =>
  appel<RevendeurFiche>(`/organisateur/hors-ligne/revendeurs/${id}`, { method: "PATCH", body: JSON.stringify(champs) })

export const fetchFacturation = () => appel<Facturation>("/admin/facturation")

/* ---------- impression ---------- */

export interface OptionsImpression {
  format: FormatImpression
  de?: number
  a?: number
}

/** Récupère le PDF d'un lot (la route exige le jeton) sous forme de fichier local du navigateur. */
export async function pdfLot(id: number, options: OptionsImpression): Promise<{ url: string; nom: string }> {
  const params = new URLSearchParams({ format: options.format })
  if (options.de) params.set("de", String(options.de))
  if (options.a) params.set("a", String(options.a))
  const res = await fetch(`${API_BASE_URL}/organisateur/hors-ligne/lots/${id}/billets.pdf?${params}`, { headers: getAuthHeaders() })
  if (!res.ok) {
    const data = await parseJsonSafe(res)
    throw new Error(typeof data?.detail === "string" ? data.detail : "Le PDF n'a pas pu être préparé.")
  }
  const nom = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `lot-${id}.pdf`
  return { url: URL.createObjectURL(await res.blob()), nom }
}

export function telechargerUrl(url: string, nom: string) {
  const lien = document.createElement("a")
  lien.href = url
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
}

/* ---------- fonds des billets ---------- */

async function envoyerFond<T>(chemin: string, fichier: File | null): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${chemin}`, {
    method: fichier ? "PUT" : "DELETE",
    headers: fichier ? { ...getAuthHeaders(), "Content-Type": fichier.type } : getAuthHeaders(),
    body: fichier ?? undefined,
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new Error(data?.detail || "Le fond n'a pas été enregistré.")
  return data as T
}

/** Organisateur : fond des billets d'un tarif (null pour le retirer). */
export const definirFondTarif = (tarifId: number, fichier: File | null) =>
  envoyerFond<CategorieBillet>(`/categories-billet/${tarifId}/fond`, fichier)

/** Administrateur : fond par défaut des billets d'un type d'événement (null pour le retirer). */
export const definirFondType = (categorieId: number, fichier: File | null) =>
  envoyerFond<Categorie>(`/categories/${categorieId}/fond`, fichier)
