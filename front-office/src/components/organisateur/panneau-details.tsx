"use client"

import { useEffect, type ReactNode } from "react"
import { ChevronRight, X, type LucideIcon } from "lucide-react"
import { cn } from "@/utils"

/*
 * Panneau « Détails » qui glisse depuis la droite : les tableaux restent compacts
 * (nom, statut, actions) et tout le reste s'affiche ici. Se ferme avec la croix,
 * Échap ou un clic à côté. Utilisé par l'admin (équipe, participants) et l'organisateur
 * (participants, réservations).
 */

export interface ChiffreDetail {
  icone: LucideIcon
  libelle: string
  valeur: ReactNode
  detail?: ReactNode
}

export interface LigneDetail {
  icone: LucideIcon
  libelle: string
  contenu: ReactNode
}

export function PanneauDetails({
  ouvert,
  onFermer,
  titre,
  visuel,
  badge,
  chiffres,
  lignes,
  pied,
}: {
  ouvert: boolean
  onFermer: () => void
  titre: string
  /** avatar ou icône à gauche du titre */
  visuel?: ReactNode
  badge?: ReactNode
  chiffres?: ChiffreDetail[]
  lignes: LigneDetail[]
  /** boutons d'action en bas (« Fermer » est ajouté d'office) */
  pied?: ReactNode
}) {
  useEffect(() => {
    if (!ouvert) return
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer()
    window.addEventListener("keydown", echap)
    return () => window.removeEventListener("keydown", echap)
  }, [ouvert, onFermer])

  if (!ouvert) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Détails : ${titre}`}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-gw-nuit/40 backdrop-blur-[1px]" onClick={onFermer} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white text-gw-nuit shadow-2xl dark:bg-gw-carte-sombre dark:text-white">
        <div className="flex items-start gap-4 border-b border-gw-bordure p-6 dark:border-white/10">
          {visuel}
          <div className="min-w-0 flex-1">
            <h2 className="font-titre truncate text-xl font-semibold">{titre}</h2>
            {badge && <div className="mt-1.5 flex flex-wrap gap-1.5">{badge}</div>}
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-full p-1.5 text-gw-texte-doux hover:bg-gw-fond dark:text-white/60 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {chiffres && chiffres.length > 0 && (
            <div className={cn("grid gap-3 py-5", chiffres.length > 1 && "grid-cols-2")}>
              {chiffres.map(({ icone: Icone, libelle, valeur, detail }) => (
                <div key={libelle} className="rounded-2xl bg-gw-fond p-4 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
                    <Icone className="h-3.5 w-3.5" aria-hidden /> {libelle}
                  </p>
                  <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
                  {detail && <p className="mt-0.5 text-xs text-gw-texte-doux dark:text-white/55">{detail}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="divide-y divide-gw-bordure dark:divide-white/10">
            {lignes.map(({ icone: Icone, libelle, contenu }) => (
              <div key={libelle} className="flex gap-3 py-3">
                <Icone className="mt-0.5 h-4 w-4 shrink-0 text-gw-violet dark:text-gw-lavande" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gw-texte-doux dark:text-white/55">{libelle}</p>
                  <div className="mt-0.5 text-sm break-words">{contenu}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gw-bordure p-4 dark:border-white/10">
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full px-4 py-2 text-sm font-semibold text-gw-texte-doux hover:bg-gw-fond dark:text-white/65 dark:hover:bg-white/10"
          >
            Fermer
          </button>
          {pied}
        </div>
      </aside>
    </div>
  )
}

/** Bouton « Détails › » des lignes de tableau. */
export function BoutonDetails({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-gw-violet transition-colors hover:bg-gw-lavande/40 dark:text-gw-lavande dark:hover:bg-white/10"
    >
      Détails <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}

/** Classes d'une ligne de tableau cliquable (ouvre le panneau). */
export const ligneCliquable = (choisie: boolean) =>
  cn(
    "cursor-pointer border-b border-gw-bordure transition-colors last:border-0 hover:bg-gw-fond dark:border-white/10 dark:hover:bg-white/5",
    choisie && "bg-gw-lavande/30 dark:bg-white/10",
  )
