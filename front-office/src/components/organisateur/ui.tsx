"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { Loader2, X } from "lucide-react"
import type { StatutValidation } from "@/types"
import { cn } from "@/utils"

/* ---------- statut de validation ---------- */

export const STATUTS: Record<StatutValidation, { libelle: string; classes: string }> = {
  brouillon: {
    libelle: "Brouillon",
    classes: "bg-gw-fond text-gw-texte ring-1 ring-gw-bordure dark:bg-white/10 dark:text-white/80 dark:ring-white/15",
  },
  en_attente_validation: {
    libelle: "En attente de validation",
    classes: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/30",
  },
  valide: {
    libelle: "Validé",
    classes: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/30",
  },
  rejete: {
    libelle: "Rejeté",
    classes: "bg-gw-rose-pale text-gw-rose-action ring-1 ring-gw-rose/30 dark:bg-gw-rose/15 dark:text-pink-200 dark:ring-gw-rose/40",
  },
}

export function BadgeStatut({ statut }: { statut: StatutValidation }) {
  const s = STATUTS[statut] ?? STATUTS.brouillon
  return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.classes)}>{s.libelle}</span>
}

/* ---------- boutons ---------- */

export function Bouton({
  children,
  variante = "principal",
  chargement,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secondaire" | "danger" | "discret"
  chargement?: boolean
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || chargement}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet disabled:cursor-not-allowed disabled:opacity-50",
        variante === "principal" && "bg-gw-rose-action text-white hover:bg-gw-rose-action-fonce",
        variante === "secondaire" &&
          "border border-gw-violet/40 text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white dark:hover:bg-white/10",
        variante === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variante === "discret" && "text-gw-texte-doux hover:bg-gw-fond dark:text-white/70 dark:hover:bg-white/10",
        className,
      )}
    >
      {chargement && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/* ---------- champs de formulaire ---------- */

export const classeChamp =
  "w-full rounded-xl border border-gw-bordure bg-white px-3.5 py-2.5 text-sm text-gw-nuit placeholder:text-gw-texte-pale focus:border-gw-violet focus:outline-none focus:ring-2 focus:ring-gw-violet/20 dark:border-gw-bordure-sombre dark:bg-gw-nuit-profond dark:text-white dark:placeholder:text-white/35"

export function Champ({
  libelle,
  aide,
  requis,
  children,
}: {
  libelle: string
  aide?: string
  requis?: boolean
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {libelle}
        {requis && <span className="text-gw-rose-action"> *</span>}
      </label>
      {children(id)}
      {aide && <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">{aide}</p>}
    </div>
  )
}

/* ---------- fenêtre modale ---------- */

export function Modale({
  ouverte,
  titre,
  onFermer,
  children,
  large,
}: {
  ouverte: boolean
  titre: string
  onFermer: () => void
  children: ReactNode
  large?: boolean
}) {
  const boite = useRef<HTMLDivElement>(null)
  const idTitre = useId()

  useEffect(() => {
    if (!ouverte) return
    const precedent = document.activeElement as HTMLElement | null
    boite.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus()
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer()
    window.addEventListener("keydown", echap)
    return () => {
      window.removeEventListener("keydown", echap)
      precedent?.focus()
    }
  }, [ouverte, onFermer])

  if (!ouverte) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-gw-nuit/60 backdrop-blur-[2px]" onClick={onFermer} />
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 text-gw-nuit shadow-2xl sm:rounded-3xl dark:bg-gw-carte-sombre dark:text-white",
          large ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={idTitre} className="font-titre text-xl font-semibold">
            {titre}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-full p-1.5 text-gw-texte-doux hover:bg-gw-fond dark:text-white/60 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- dates ---------- */

/** ISO (UTC) -> valeur d'un champ datetime-local, à l'heure locale. */
export function isoVersSaisie(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Valeur d'un champ datetime-local (heure locale) -> ISO (UTC). */
export function saisieVersIso(valeur: string): string | null {
  return valeur ? new Date(valeur).toISOString() : null
}
