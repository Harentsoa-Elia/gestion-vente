"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { BadgeCheck, ChevronDown, LogOut, MailWarning, Ticket } from "lucide-react"
import { cn } from "@/utils"

/*
 * Menu du participant connecté, dans l'en-tête public : un clic sur son nom ouvre
 * « Mes réservations », la confirmation de l'adresse e-mail (si besoin) et « Déconnexion ».
 * Se ferme avec Échap, par un clic ailleurs ou en changeant de page.
 */

export interface CompteParticipant {
  prenom: string
  nom: string
  email: string
  email_verifie: boolean
}

export function MenuCompte({ compte, onDeconnexion }: { compte: CompteParticipant; onDeconnexion: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const pathname = usePathname()

  const nomComplet = `${compte.prenom} ${compte.nom}`.trim()
  const initiales = `${compte.prenom[0] ?? ""}${compte.nom[0] ?? ""}`.toUpperCase() || "?"

  useEffect(() => setOuvert(false), [pathname])

  useEffect(() => {
    if (!ouvert) return
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false)
        bouton.current?.focus()
      }
    }
    const clic = (e: MouseEvent) => {
      if (!zone.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener("keydown", touche)
    document.addEventListener("mousedown", clic)
    return () => {
      document.removeEventListener("keydown", touche)
      document.removeEventListener("mousedown", clic)
    }
  }, [ouvert])

  const element =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gw-texte hover:bg-gw-fond hover:text-gw-nuit focus-visible:outline-2 focus-visible:outline-gw-violet"

  return (
    <div ref={zone} className="relative">
      <button
        ref={bouton}
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls={idMenu}
        aria-label={`Mon compte : ${nomComplet}`}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full pr-2 pl-1 text-sm font-semibold text-gw-nuit hover:bg-gw-fond focus-visible:outline-2 focus-visible:outline-gw-violet sm:pr-3",
          ouvert && "bg-gw-fond",
        )}
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-xs font-bold text-white">
          {initiales}
          {!compte.email_verifie && (
            // pastille : adresse e-mail à confirmer
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" />
          )}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{nomComplet}</span>
        <ChevronDown className={cn("hidden h-4 w-4 text-gw-texte-doux transition-transform sm:block", ouvert && "rotate-180")} aria-hidden />
      </button>

      {ouvert && (
        <div
          id={idMenu}
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gw-bordure bg-white shadow-[0_24px_48px_-20px_rgba(30,26,60,0.45)]"
        >
          <div className="border-b border-gw-bordure bg-gw-fond/60 px-4 py-3.5">
            <p className="truncate font-titre font-semibold text-gw-nuit">{nomComplet}</p>
            <p className="truncate text-xs text-gw-texte-doux">{compte.email}</p>
            {compte.email_verifie ? (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Adresse confirmée
              </p>
            ) : (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <MailWarning className="h-3.5 w-3.5" aria-hidden /> Adresse à confirmer
              </p>
            )}
          </div>

          <ul className="p-2">
            <li>
              <Link href="/participants/mes-reservations" className={element}>
                <Ticket className="h-4 w-4 text-gw-violet" aria-hidden />
                Mes réservations et billets
              </Link>
            </li>
            {!compte.email_verifie && (
              <li>
                <Link href={`/participants/verifier-email?redirect=${encodeURIComponent(pathname || "/")}`} className={element}>
                  <MailWarning className="h-4 w-4 text-amber-600" aria-hidden />
                  Confirmer mon adresse e-mail
                </Link>
              </li>
            )}
            <li className="mt-1 border-t border-gw-bordure pt-1">
              <button
                type="button"
                onClick={() => {
                  setOuvert(false)
                  onDeconnexion()
                }}
                className={cn(element, "hover:text-gw-rose-action")}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Déconnexion
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
