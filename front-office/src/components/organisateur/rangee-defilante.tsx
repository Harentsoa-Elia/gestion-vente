"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils"

/**
 * Rangée horizontale sans barre de défilement : deux flèches rondes apparaissent seulement
 * quand il reste des éléments de ce côté, avec un léger fondu sur le bord.
 * Au doigt ou au pavé tactile, la rangée se fait toujours glisser.
 * (Même principe que les catégories de la page d'accueil.)
 */
export function RangeeDefilante({
  children,
  className,
  libelle,
  role,
}: {
  children: ReactNode
  /** classes du conteneur des éléments (gap, padding…) */
  className?: string
  libelle?: string
  role?: string
}) {
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
    // le contenu peut changer de largeur (chargement des compteurs…)
    for (const enfant of Array.from(r.children)) observateur.observe(enfant)
    return () => observateur.disconnect()
  }, [mesurer, children])

  const defiler = (sens: 1 | -1) => {
    const r = rangee.current
    r?.scrollBy({ left: sens * Math.max(200, r.clientWidth * 0.75), behavior: "smooth" })
  }

  const masque =
    gauche && droite
      ? "linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent)"
      : droite
        ? "linear-gradient(to right, #000 calc(100% - 48px), transparent)"
        : gauche
          ? "linear-gradient(to right, transparent, #000 48px)"
          : undefined

  return (
    <div className="relative">
      <div
        ref={rangee}
        onScroll={mesurer}
        role={role}
        aria-label={libelle}
        className={cn("flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
        style={masque ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
      >
        {children}
      </div>
      <Fleche sens={-1} visible={gauche} onClick={() => defiler(-1)} />
      <Fleche sens={1} visible={droite} onClick={() => defiler(1)} />
    </div>
  )
}

function Fleche({ sens, visible, onClick }: { sens: 1 | -1; visible: boolean; onClick: () => void }) {
  const Icone = sens === 1 ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={sens === 1 ? "Faire défiler vers la droite" : "Faire défiler vers la gauche"}
      className={cn(
        "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gw-bordure bg-white text-gw-nuit shadow-[0_4px_14px_-4px_rgba(30,26,60,0.45)] transition-all hover:scale-105 hover:border-gw-violet hover:text-gw-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
        "dark:border-white/15 dark:bg-gw-carte-sombre dark:text-white dark:hover:border-gw-lavande dark:hover:text-gw-lavande",
        sens === 1 ? "-right-1" : "-left-1",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icone className="h-5 w-5" aria-hidden />
    </button>
  )
}
