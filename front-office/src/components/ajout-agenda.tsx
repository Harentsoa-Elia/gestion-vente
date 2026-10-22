"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarPlus, Download } from "lucide-react"
import { t } from "@/lib/i18n"
import { cn } from "@/utils"

/*
 * "Ajouter à mon agenda" : Google Agenda (lien) ou fichier .ics, que l'on ouvre avec
 * Outlook, le calendrier Apple ou celui du téléphone. Sans date de fin, l'événement dure 3 h.
 */

export interface EvenementAgenda {
  titre: string
  debut: string
  fin?: string | null
  lieu?: string | null
  description?: string | null
  /** adresse de la page de l'événement, ajoutée à la description */
  lien?: string
}

const DUREE_PAR_DEFAUT = 3 * 3600_000

// 20261028T150000Z (heure UTC, format des agendas)
const formatAgenda = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

function bornes(e: EvenementAgenda) {
  const debut = new Date(e.debut)
  const fin = e.fin ? new Date(e.fin) : new Date(debut.getTime() + DUREE_PAR_DEFAUT)
  return { debut, fin: fin > debut ? fin : new Date(debut.getTime() + DUREE_PAR_DEFAUT) }
}

const texteComplet = (e: EvenementAgenda) => [e.description?.slice(0, 600), e.lien].filter(Boolean).join("\n\n")

export function lienGoogleAgenda(e: EvenementAgenda) {
  const { debut, fin } = bornes(e)
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titre,
    dates: `${formatAgenda(debut)}/${formatAgenda(fin)}`,
    details: texteComplet(e),
    location: e.lieu ?? "",
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

// échappement imposé par le format iCalendar (RFC 5545)
const echapper = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

export function fichierIcs(e: EvenementAgenda) {
  const { debut, fin } = bornes(e)
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//guichetweb//Billetterie//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${formatAgenda(debut)}-${encodeURIComponent(e.titre).slice(0, 40)}@guichetweb`,
    `DTSTAMP:${formatAgenda(new Date())}`,
    `DTSTART:${formatAgenda(debut)}`,
    `DTEND:${formatAgenda(fin)}`,
    `SUMMARY:${echapper(e.titre)}`,
    e.lieu ? `LOCATION:${echapper(e.lieu)}` : "",
    texteComplet(e) ? `DESCRIPTION:${echapper(texteComplet(e))}` : "",
    e.lien ? `URL:${e.lien}` : "",
    // rappel la veille
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${echapper(e.titre)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  return lignes.join("\r\n")
}

function telechargerIcs(e: EvenementAgenda) {
  const blob = new Blob([fichierIcs(e)], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${e.titre.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "evenement"}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AjoutAgenda({ evenement, variante = "clair", className }: { evenement: EvenementAgenda; variante?: "clair" | "sombre"; className?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !zone.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener("mousedown", fermer)
    document.addEventListener("keydown", fermer)
    return () => {
      document.removeEventListener("mousedown", fermer)
      document.removeEventListener("keydown", fermer)
    }
  }, [ouvert])

  return (
    <div ref={zone} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gw-violet",
          variante === "sombre" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gw-violet-pale text-gw-violet hover:bg-gw-lavande",
        )}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
        {t("Ajouter à mon agenda")}
      </button>
      {ouvert && (
        <div role="menu" className={cn("absolute left-0 z-30 w-64", variante === "sombre" ? "bottom-full mb-2" : "mt-2", " overflow-hidden rounded-2xl border border-gw-bordure bg-gw-surface p-1.5 text-left shadow-[0_18px_40px_-20px_rgba(42,26,94,0.45)]")}>
          <a
            role="menuitem"
            href={lienGoogleAgenda(evenement)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gw-encre hover:bg-gw-fond"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gw-violet text-xs font-bold text-white">G</span>
            <span>
              <span className="block font-semibold">{t("Google Agenda")}</span>
              <span className="text-xs text-gw-texte-doux">{t("S'ouvre dans un nouvel onglet")}</span>
            </span>
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              telechargerIcs(evenement)
              setOuvert(false)
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gw-encre hover:bg-gw-fond"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gw-rose-action text-white">
              <Download className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{t("Fichier .ics")}</span>
              <span className="text-xs text-gw-texte-doux">{t("Outlook, Apple, téléphone")}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
