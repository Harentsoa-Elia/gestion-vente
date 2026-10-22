"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Check, Languages } from "lucide-react"
import { LANGUES, t, useLangue, type Langue } from "@/lib/i18n"
import { changerThemeAnime } from "@/lib/transition-theme"
import { cn } from "@/utils"

/**
 * Choix de la langue du site public (FR, MG, EN), dans l'en-tête.
 * La nouvelle langue s'affiche avec la même animation en cercle que le mode nuit,
 * à partir du bouton cliqué.
 */
export function ChoixLangue() {
  const { langue, changer } = useLangue()
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const idMenu = useId()

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

  const choisir = (l: Langue, e: React.MouseEvent<HTMLButtonElement>) => {
    setOuvert(false)
    if (l === langue) return
    const r = bouton.current?.getBoundingClientRect()
    const origine = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY }
    changerThemeAnime(() => changer(l), origine)
  }

  const actuelle = LANGUES.find((l) => l.code === langue) ?? LANGUES[0]

  return (
    <div ref={zone} className="relative">
      <button
        ref={bouton}
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={idMenu}
        aria-label={t("Langue du site : {langue}", { langue: actuelle.nom })}
        className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-gw-encre transition-colors hover:bg-gw-fond"
      >
        <Languages className="h-4 w-4 text-gw-violet" aria-hidden />
        <span className="tabular-nums">{actuelle.court}</span>
      </button>

      {ouvert && (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-gw-bordure bg-gw-surface p-1.5 shadow-[0_18px_40px_-20px_rgba(42,26,94,0.45)]"
        >
          {LANGUES.map((l) => {
            const choisie = l.code === langue
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={choisie}
                lang={l.code}
                onClick={(e) => choisir(l.code, e)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  choisie ? "bg-gw-violet-pale font-semibold text-gw-encre" : "text-gw-texte hover:bg-gw-fond",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-9 place-items-center rounded-lg text-[11px] font-bold tracking-wider",
                    choisie ? "bg-gw-violet text-white" : "bg-gw-fond text-gw-texte-doux",
                  )}
                >
                  {l.court}
                </span>
                <span className="flex-1">{l.nom}</span>
                {choisie && <Check className="h-4 w-4 text-gw-violet" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
