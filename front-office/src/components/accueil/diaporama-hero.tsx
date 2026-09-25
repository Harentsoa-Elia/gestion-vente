"use client"

import { useCallback, useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { cn } from "@/utils"

/*
 * Photos du hero de l'accueil.
 * - En fond : la photo courante, en fondu enchaîné, avec un lent zoom (effet « survol »).
 * - À droite (grands écrans) : les mêmes photos en pile de cartes inclinées ; toutes les
 *   quelques secondes, la carte du dessus glisse et repasse derrière (effet « pile »).
 * Le défilement s'arrête au survol de la pile, quand l'onglet n'est pas visible, sur demande
 * (bouton pause) et n'a jamais lieu si l'utilisateur a demandé à réduire les animations.
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

/** Position de chaque carte dans la pile : 0 = dessus, 1 et 2 = visibles derrière, dernière = celle qui vient de partir. */
function stylePosition(position: number, total: number) {
  if (position === 0) return "z-30 translate-x-0 translate-y-0 rotate-[-3deg] opacity-100"
  if (position === 1) return "z-20 translate-x-10 -translate-y-4 rotate-[5deg] scale-[0.94] opacity-100 brightness-75"
  if (position === 2) return "z-10 translate-x-20 -translate-y-8 rotate-[12deg] scale-[0.88] opacity-90 brightness-50"
  if (position === total - 1) return "z-40 -translate-x-[70%] translate-y-10 rotate-[-18deg] scale-95 opacity-0"
  return "z-0 translate-x-20 -translate-y-8 rotate-[12deg] scale-[0.84] opacity-0"
}

/** Pile de cartes photo à droite du hero, et commandes du diaporama. */
export function PileHero({ courant, aller, enPause, setEnPause, setSurvol, mouvementReduit }: Diaporama) {
  const total = PHOTOS_HERO.length

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-10 sm:right-6 xl:top-16 xl:right-10 2xl:right-14">
      {/* pile : grands écrans seulement (à partir de 1280 px, pour ne pas chevaucher le titre) */}
      <div
        className={cn(
          "pointer-events-auto relative hidden h-[280px] w-[380px] xl:block 2xl:h-[300px] 2xl:w-[400px]",
          !mouvementReduit && "animate-[gw-flotte_7s_ease-in-out_infinite]",
        )}
        onMouseEnter={() => setSurvol(true)}
        onMouseLeave={() => setSurvol(false)}
        aria-hidden
      >
        {PHOTOS_HERO.map((p, i) => {
          const position = (i - courant + total) % total
          return (
            <figure
              key={p.src}
              className={cn(
                "absolute inset-0 m-0 overflow-hidden rounded-[1.6rem] bg-gw-nuit shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)] ring-4 ring-white/90",
                "origin-bottom-left transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
                stylePosition(position, total),
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" loading="lazy" style={{ objectPosition: p.position }} className="h-full w-full object-cover" />
              <figcaption className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gw-nuit backdrop-blur-sm">
                {p.legende}
              </figcaption>
            </figure>
          )
        })}
      </div>

      {/* commandes : points + pause (écrans plus petits : seul le bouton pause, en haut à droite) */}
      <div className="pointer-events-auto flex items-center justify-end gap-3 xl:mt-8 xl:justify-center">
        <div className="hidden items-center gap-1.5 xl:flex">
          {PHOTOS_HERO.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => aller(i)}
              aria-label={`Afficher la photo ${i + 1} : ${p.legende}`}
              aria-current={i === courant}
              className={cn(
                "h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                i === courant ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/75",
              )}
            />
          ))}
        </div>
        {!mouvementReduit && (
          <button
            type="button"
            onClick={() => setEnPause(!enPause)}
            aria-label={enPause ? "Relancer le défilement des photos" : "Mettre en pause le défilement des photos"}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {enPause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  )
}
