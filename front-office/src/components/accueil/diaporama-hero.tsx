"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/utils"

/*
 * Photos du hero de l'accueil.
 * - En fond : la photo courante, en fondu enchaîné, avec un lent zoom (effet « survol »).
 * À droite (grands écrans), le carrousel « À l'affiche » montre les vrais événements à venir.
 * Le défilement s'arrête quand l'onglet n'est pas visible et n'a jamais lieu si l'utilisateur
 * a demandé à réduire les animations.
 *
 * Photos : public/images/accueil/. Pour en ajouter ou en changer, modifier PHOTOS_HERO
 * (et noter l'auteur de chaque photo pour les crédits du mémoire).
 */

export const PHOTOS_HERO = [
  { src: "/images/accueil/foule-violette.jpg", legende: "Concerts", position: "50% 40%" },
  { src: "/images/accueil/scene-dj.jpg", legende: "Soirées DJ", position: "50% 35%" },
  { src: "/images/accueil/danseurs.jpg", legende: "Danse et spectacles", position: "50% 45%" },
  { src: "/images/accueil/confettis-roses.jpg", legende: "Grandes scènes", position: "50% 50%" },
  { src: "/images/accueil/confettis-bleus.jpg", legende: "Festivals", position: "50% 55%" },
]

const DUREE_MS = 6000

export function useDiaporama(nombre: number) {
  // [photo affichée, photo précédente] : la précédente garde son zoom pendant qu'elle s'efface
  const [[courant, precedent], setPaire] = useState<[number, number]>([0, -1])
  const setCourant = useCallback((f: (i: number) => number) => setPaire(([c]) => [f(c), c]), [])
  const [enPause, setEnPause] = useState(false)
  const [survol, setSurvol] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const maj = () => setMouvementReduit(mq.matches)
    maj()
    mq.addEventListener("change", maj)
    const vis = () => setVisible(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", vis)
    return () => {
      mq.removeEventListener("change", maj)
      document.removeEventListener("visibilitychange", vis)
    }
  }, [])

  const actif = !enPause && !survol && !mouvementReduit && visible && nombre > 1

  useEffect(() => {
    if (!actif) return
    const t = window.setTimeout(() => setCourant((i) => (i + 1) % nombre), DUREE_MS)
    return () => window.clearTimeout(t)
  }, [actif, courant, nombre, setCourant])

  const aller = useCallback(
    (i: number) => setCourant((c) => (i === c ? c : ((i % nombre) + nombre) % nombre)),
    [nombre, setCourant],
  )

  return { courant, precedent, aller, enPause, setEnPause, setSurvol, mouvementReduit }
}

type Diaporama = ReturnType<typeof useDiaporama>

/** Photos plein fond du hero, en fondu enchaîné. */
export function FondDiaporama({ courant, precedent, mouvementReduit }: Pick<Diaporama, "courant" | "precedent" | "mouvementReduit">) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {PHOTOS_HERO.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.src}
          src={p.src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          style={{ objectPosition: p.position }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out",
            i === courant ? "opacity-100" : "opacity-0",
            // zoom lent sur la photo affichée (et sur la précédente pendant son fondu, pour éviter un saut)
            (i === courant || i === precedent) && !mouvementReduit && "animate-[gw-survol_9s_ease-out_forwards]",
          )}
        />
      ))}
      {/* teinte guichetweb pour garder le texte lisible, quelle que soit la photo */}
      <div className="absolute inset-0 bg-[#16122E]/45 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,18,46,0.35)_0%,rgba(22,18,46,0)_35%,rgba(22,18,46,0.55)_100%)]" />
    </div>
  )
}
