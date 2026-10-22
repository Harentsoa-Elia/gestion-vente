import { t, dateCourte, dateSimple, heure, nombre } from "@/lib/i18n"
import type { Evenement } from "@/types"

export type Periode = "tout" | "aujourdhui" | "week-end" | "mois"

export const PERIODES: { valeur: Periode; libelle: string }[] = [
  { valeur: "tout", libelle: "Toutes les dates" },
  { valeur: "aujourdhui", libelle: "Aujourd'hui" },
  { valeur: "week-end", libelle: "Ce week-end" },
  { valeur: "mois", libelle: "Ce mois-ci" },
]

/** Fin de l'événement : date_fin si elle existe, sinon date_debut. */
export function finEvenement(e: Evenement) {
  return new Date(e.date_fin ?? e.date_debut)
}

/** Un événement est "passé" une fois sa fin dépassée. */
export function estPasse(e: Evenement, maintenant = new Date()) {
  return finEvenement(e).getTime() < maintenant.getTime()
}

/** Sépare le catalogue : à venir (du plus proche au plus lointain) et passés (du plus récent au plus ancien). */
export function separerEvenements(evenements: Evenement[], maintenant = new Date()) {
  const aVenir: Evenement[] = []
  const passes: Evenement[] = []
  for (const e of evenements) (estPasse(e, maintenant) ? passes : aVenir).push(e)
  aVenir.sort((a, b) => +new Date(a.date_debut) - +new Date(b.date_debut))
  passes.sort((a, b) => +new Date(b.date_debut) - +new Date(a.date_debut))
  return { aVenir, passes }
}

function debutJour(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Bornes [début, fin[ d'une période, calculées à partir d'aujourd'hui. */
function bornes(periode: Periode, maintenant = new Date()): [Date, Date] | null {
  const jour = debutJour(maintenant)
  if (periode === "aujourdhui") {
    const fin = new Date(jour)
    fin.setDate(fin.getDate() + 1)
    return [jour, fin]
  }
  if (periode === "week-end") {
    // Samedi et dimanche de la semaine en cours (si on est dimanche : aujourd'hui seulement)
    const j = jour.getDay() // 0 = dimanche
    const samedi = new Date(jour)
    samedi.setDate(jour.getDate() + (j === 0 ? -1 : 6 - j))
    const lundi = new Date(samedi)
    lundi.setDate(samedi.getDate() + 2)
    return [samedi, lundi]
  }
  if (periode === "mois") {
    return [new Date(jour.getFullYear(), jour.getMonth(), 1), new Date(jour.getFullYear(), jour.getMonth() + 1, 1)]
  }
  return null
}

export function dansPeriode(e: Evenement, periode: Periode, maintenant = new Date()) {
  const b = bornes(periode, maintenant)
  if (!b) return true
  const debut = new Date(e.date_debut).getTime()
  const fin = finEvenement(e).getTime()
  // l'événement chevauche la période
  return debut < b[1].getTime() && fin >= b[0].getTime()
}

/** Petit repère affiché sur la carte, façon Eventbrite ("Aujourd'hui", "Demain"...). */
export function repereTemporel(e: Evenement, maintenant = new Date()): string | null {
  if (estPasse(e, maintenant)) return null
  const debut = new Date(e.date_debut)
  if (debut <= maintenant) return t("En cours")
  const ecartJours = Math.round((+debutJour(debut) - +debutJour(maintenant)) / 86_400_000)
  if (ecartJours === 0) return t("Aujourd'hui")
  if (ecartJours === 1) return t("Demain")
  if (dansPeriode(e, "week-end", maintenant)) return t("Ce week-end")
  if (ecartJours <= 7) return t("Cette semaine")
  return null
}

export function formatDateLongue(iso: string) {
  const d = new Date(iso)
  const jour = dateCourte(d)
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)}, ${heure(d, "deux-points")}`
}

export function formatDateCourte(iso: string) {
  return dateSimple(new Date(iso))
}

export function formatPrix(prix: number | null) {
  if (prix == null) return null
  if (prix === 0) return t("Gratuit")
  return t("À partir de {prix} Ar", { prix: nombre(prix) })
}
