"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { EN } from "./en"
import { MG } from "./mg"

/**
 * Traduction du site public : français (langue de référence), malgache et anglais.
 * Le texte français sert de clé : t("Voir les événements") renvoie la traduction de la langue choisie,
 * ou le français si la traduction manque. Les variables s'écrivent entre accolades :
 * t("{n} places disponibles", { n: 12 }).
 * Les espaces organisateur et administrateur restent en français.
 */
export type Langue = "fr" | "mg" | "en"
export const LANGUES: { code: Langue; nom: string; court: string }[] = [
  { code: "fr", nom: "Français", court: "FR" },
  { code: "mg", nom: "Malagasy", court: "MG" },
  { code: "en", nom: "English", court: "EN" },
]
const DICTIONNAIRES: Record<Langue, Record<string, string>> = { fr: {}, mg: MG, en: EN }
const CLE = "site_langue"

// langue courante, lue par t() et les fonctions de date pendant le rendu
let courante: Langue = "fr"
export const langueCourante = () => courante

export function t(texte: string, variables?: Record<string, string | number>): string {
  let s = DICTIONNAIRES[courante][texte] ?? texte
  if (variables) for (const [k, v] of Object.entries(variables)) s = s.split(`{${k}}`).join(String(v))
  return s
}

type ContexteLangue = { langue: Langue; changer: (l: Langue) => void }
const Contexte = createContext<ContexteLangue>({ langue: "fr", changer: () => {} })

/** Le contenu est une fonction : tout le site est redessiné quand la langue change */
export function LangueProvider({ children, actif = true }: { children: (langue: Langue) => ReactNode; actif?: boolean }) {
  const [langue, setLangue] = useState<Langue>("fr")
  useEffect(() => {
    try {
      const l = localStorage.getItem(CLE) as Langue | null
      if (l && l in DICTIONNAIRES) setLangue(l)
    } catch {
      /* stockage indisponible : français */
    }
  }, [])
  // hors du site public (espaces organisateur et admin), tout reste en français
  const effective: Langue = actif ? langue : "fr"
  courante = effective
  useEffect(() => {
    document.documentElement.lang = effective
  }, [effective])
  const changer = useCallback((l: Langue) => {
    courante = l
    setLangue(l)
    try {
      localStorage.setItem(CLE, l)
    } catch {
      /* rien */
    }
  }, [])
  return <Contexte.Provider value={{ langue, changer }}>{children(effective)}</Contexte.Provider>
}

export const useLangue = () => useContext(Contexte)

/* ---------- dates et nombres dans la langue choisie ---------- */
// le malgache n'est pas pris en charge par tous les navigateurs : jours et mois écrits ici
const MG_JOURS = ["Alahady", "Alatsinainy", "Talata", "Alarobia", "Alakamisy", "Zoma", "Asabotsy"]
const MG_MOIS = ["Janoary", "Febroary", "Martsa", "Aprily", "Mey", "Jona", "Jolay", "Aogositra", "Septambra", "Oktobra", "Novambra", "Desambra"]
const LOCALE: Record<Langue, string> = { fr: "fr-FR", mg: "fr-FR", en: "en-GB" }

export const localeNombres = () => LOCALE[courante]
export const nombre = (n: number) => n.toLocaleString(LOCALE[courante])

/** "mercredi 28 octobre 2026" (long) */
export function dateLongue(d: Date, avecAnnee = true): string {
  if (courante === "mg") return `${MG_JOURS[d.getDay()]} ${d.getDate()} ${MG_MOIS[d.getMonth()]}${avecAnnee ? " " + d.getFullYear() : ""}`
  return d.toLocaleDateString(LOCALE[courante], { weekday: "long", day: "numeric", month: "long", ...(avecAnnee ? { year: "numeric" } : {}) })
}
/** "28 octobre 2026" */
export function dateSimple(d: Date): string {
  if (courante === "mg") return `${d.getDate()} ${MG_MOIS[d.getMonth()]} ${d.getFullYear()}`
  return d.toLocaleDateString(LOCALE[courante], { day: "numeric", month: "long", year: "numeric" })
}
/** "mer. 28 oct." */
export function dateCourte(d: Date): string {
  if (courante === "mg") return `${MG_JOURS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MG_MOIS[d.getMonth()].slice(0, 3)}`
  return d.toLocaleDateString(LOCALE[courante], { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")
}
/** "oct." */
export function moisCourt(d: Date): string {
  if (courante === "mg") return MG_MOIS[d.getMonth()].slice(0, 3)
  return d.toLocaleDateString(LOCALE[courante], { month: "short" }).replace(".", "")
}
/** "18 h 00" (fr, mg) ou "18:00" (en) */
export function heure(d: Date, style: "h" | "deux-points" = "h"): string {
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  return courante === "en" || style === "deux-points" ? h : h.replace(":", " h ")
}
/** "il y a 3 heures" */
export function ilYa(d: Date): string {
  const s = (d.getTime() - Date.now()) / 1000
  const paliers: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]]
  if (courante === "mg") {
    const mots: Record<string, string> = { year: "taona", month: "volana", week: "herinandro", day: "andro", hour: "ora", minute: "minitra" }
    for (const [u, sec] of paliers) if (Math.abs(s) >= sec) return `${Math.round(Math.abs(s) / sec)} ${mots[u]} lasa`
    return "izao"
  }
  const rtf = new Intl.RelativeTimeFormat(courante, { numeric: "auto" })
  for (const [u, sec] of paliers) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u)
  return rtf.format(Math.round(s), "second")
}
