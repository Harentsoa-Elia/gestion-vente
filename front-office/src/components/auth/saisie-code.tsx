"use client"

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react"
import { cn } from "@/utils"

/*
 * Saisie d'un code à 6 chiffres en six cases : on passe à la case suivante en tapant,
 * Retour arrière revient en arrière, et un code collé (ou proposé par le téléphone,
 * autocomplete="one-time-code") remplit toutes les cases d'un coup.
 */

const LONGUEUR = 6

export function SaisieCode({
  valeur,
  onChange,
  onComplet,
  desactive,
  erreur,
  libelle = "Code reçu par e-mail",
}: {
  valeur: string
  onChange: (code: string) => void
  /** Appelé quand les 6 chiffres sont saisis */
  onComplet?: (code: string) => void
  desactive?: boolean
  erreur?: boolean
  libelle?: string
}) {
  const cases = useRef<(HTMLInputElement | null)[]>([])
  const chiffres = Array.from({ length: LONGUEUR }, (_, i) => valeur[i] ?? "")

  const definir = (nouveau: string) => {
    const propre = nouveau.replace(/\D/g, "").slice(0, LONGUEUR)
    onChange(propre)
    if (propre.length === LONGUEUR) onComplet?.(propre)
    return propre
  }

  const saisir = (index: number, texte: string) => {
    let entres = texte.replace(/\D/g, "")
    // chiffre tapé après celui déjà présent dans la case : on garde le nouveau
    if (entres.length === 2 && entres[0] === chiffres[index]) entres = entres[1]
    if (!entres) return
    // plusieurs chiffres d'un coup (saisie automatique du téléphone) : on remplit à partir d'ici
    const propre = definir(valeur.slice(0, index) + entres + valeur.slice(index + entres.length))
    cases.current[Math.min(index + entres.length, LONGUEUR - 1, propre.length)]?.focus()
  }

  const touche = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (chiffres[index]) definir(valeur.slice(0, index) + valeur.slice(index + 1))
      else if (index > 0) {
        definir(valeur.slice(0, index - 1) + valeur.slice(index))
        cases.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) cases.current[index - 1]?.focus()
    else if (e.key === "ArrowRight" && index < LONGUEUR - 1) cases.current[index + 1]?.focus()
  }

  const coller = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const propre = definir(e.clipboardData.getData("text"))
    cases.current[Math.min(propre.length, LONGUEUR - 1)]?.focus()
  }

  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 w-full text-center text-xs font-semibold text-gw-texte-doux">{libelle}</legend>
      <div className="flex justify-center gap-2 sm:gap-2.5">
        {chiffres.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              cases.current[i] = el
            }}
            value={c}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? LONGUEUR : 1}
            aria-label={`Chiffre ${i + 1} sur ${LONGUEUR}`}
            aria-invalid={erreur || undefined}
            disabled={desactive}
            onChange={(e) => saisir(i, e.target.value)}
            onKeyDown={(e) => touche(i, e)}
            onPaste={coller}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-14 w-11 rounded-xl border-2 bg-gw-fond text-center font-titre text-2xl font-bold text-gw-nuit transition-colors outline-none sm:w-12",
              "focus:border-gw-violet focus:bg-white focus:ring-4 focus:ring-gw-violet/15 disabled:opacity-60",
              erreur ? "border-gw-rose-action" : c ? "border-gw-lavande" : "border-gw-bordure",
            )}
          />
        ))}
      </div>
    </fieldset>
  )
}
