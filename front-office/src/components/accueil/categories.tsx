"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Categorie } from "@/types"
import { iconeCategorie } from "@/lib/categories"
import { cn } from "@/utils"

/**
 * Rangée de catégories en pastilles rondes, comme la barre de catégories d'Eventbrite / Airbnb.
 * Pas de barre de défilement : deux flèches rondes apparaissent seulement quand il reste des
 * catégories à voir de ce côté, et un léger fondu sur le bord l'indique aussi.
 * Au doigt (téléphone) ou au pavé tactile, la rangée se fait toujours glisser.
 */
export function RangeeCategories({ categories }: { categories: Categorie[] }) {
  const rangee = useRef<HTMLDivElement>(null)
  const [gauche, setGauche] = useState(false)
  const [droite, setDroite] = useState(false)

  const mesurer = useCallback(() => {
    const r = rangee.current
    if (!r) return
    setGauche(r.scrollLeft > 4)
    setDroite(r.scrollLeft + r.clientWidth < r.scrollWidth - 4)
  }, [])

  useEffect(() => {
    mesurer()
    const r = rangee.current
    if (!r) return
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(r)
    return () => observateur.disconnect()
  }, [mesurer, categories.length])

  const defiler = (sens: 1 | -1) => {
    const r = rangee.current
    // environ les trois quarts de la largeur visible à chaque clic
    r?.scrollBy({ left: sens * Math.max(200, r.clientWidth * 0.75), behavior: "smooth" })
  }

  if (categories.length === 0) return null

  // fondu sur le bord où il reste des catégories (masque : marche sur n'importe quel fond)
  const masque =
    gauche && droite
      ? "linear-gradient(to right, transparent, #000 56px, #000 calc(100% - 56px), transparent)"
      : droite
        ? "linear-gradient(to right, #000 calc(100% - 56px), transparent)"
        : gauche
          ? "linear-gradient(to right, transparent, #000 56px)"
          : undefined

  return (
    <nav aria-label="Catégories" className="relative mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <div
        ref={rangee}
        onScroll={mesurer}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={masque ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
      >
        {/* w-max + mx-auto : centrée quand tout tient, sinon elle commence bien à gauche */}
        <ul className="mx-auto flex w-max gap-6 pb-1 sm:gap-10">
          {categories.map((c) => {
            const Icone = iconeCategorie(c.nom)
            return (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/evenements?categorie=${c.id}`}
                  className="group flex w-24 flex-col items-center gap-2 pt-1 text-center focus-visible:outline-none"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gw-bordure text-gw-texte transition-colors group-hover:border-gw-violet group-hover:bg-gw-violet group-hover:text-white group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-gw-violet">
                    <Icone className="h-7 w-7" strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="line-clamp-2 text-sm font-medium text-gw-nuit">{c.nom}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <FlecheDefilement sens={-1} visible={gauche} onClick={() => defiler(-1)} />
      <FlecheDefilement sens={1} visible={droite} onClick={() => defiler(1)} />
    </nav>
  )
}

function FlecheDefilement({ sens, visible, onClick }: { sens: 1 | -1; visible: boolean; onClick: () => void }) {
  const Icone = sens === 1 ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={sens === 1 ? "Voir les catégories suivantes" : "Voir les catégories précédentes"}
      className={cn(
        // centrée sur les pastilles rondes (h-20, sous le pt-12 de la rangée)
        "absolute top-[4.5rem] flex h-10 w-10 items-center justify-center rounded-full border border-gw-bordure bg-white text-gw-nuit shadow-[0_4px_14px_-4px_rgba(30,26,60,0.35)] transition-all hover:scale-105 hover:border-gw-violet hover:text-gw-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
        sens === 1 ? "right-1 sm:right-2" : "left-1 sm:left-2",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icone className="h-5 w-5" aria-hidden />
    </button>
  )
}
