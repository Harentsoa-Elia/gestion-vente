"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import type { Catalogue } from "@/lib/use-catalogue"
import { formatPrix } from "@/lib/evenements"
import { imageTestEvenement, urlMedia } from "@/lib/media"
import { cn } from "@/utils"

/*
 * 'À l'affiche' : carrousel en éventail des événements à venir, dans le hero de l'accueil
 * (à droite sur grand écran, sous les boutons sur mobile).
 * L'affiche du centre est mise en avant (voile violet-rose, prix, description, bouton Réserver) ;
 * les voisines, plus petites et assombries, se cliquent pour passer au centre.
 * Défilement automatique toutes les 6 s, suspendu au survol et si l'utilisateur
 * a demandé à réduire les animations.
 */

const MOIS = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"]
const NB_MAX = 7
const ECART = 150 // décalage horizontal entre deux affiches (px)
const DELAI = 6000

export function CarrouselAffiche({ catalogue }: { catalogue: Catalogue }) {
  const { aVenir, lieuxParId, chargement } = catalogue
  const evenements = aVenir.slice(0, NB_MAX)
  const [actif, setActif] = useState(0)
  const [survol, setSurvol] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)
  const n = evenements.length

  useEffect(() => {
    setMouvementReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useEffect(() => {
    if (survol || mouvementReduit || n < 2) return
    const minuterie = setInterval(() => setActif((a) => (a + 1) % n), DELAI)
    return () => clearInterval(minuterie)
  }, [survol, mouvementReduit, n])

  if (chargement || n === 0) return null

  const aller = (pas: number) => setActif((a) => (a + pas + n) % n)

  return (
    <div
      role="region"
      aria-labelledby="affiche-titre"
      className="relative mt-10 text-white xl:mt-0"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
    >
      <h2 id="affiche-titre" className="text-center text-sm font-semibold tracking-[0.2em] text-[#F59BC7] uppercase">
        À l&apos;affiche
      </h2>

      <div className="relative mt-4 h-[310px]">
        {evenements.map((e, i) => {
          // position par rapport au centre, sur un cercle (le dernier est à gauche du premier)
          let d = i - actif
          if (d > n / 2) d -= n
          if (d < -n / 2) d += n
          const centre = d === 0
          const visible = Math.abs(d) <= 2
          const date = new Date(e.date_debut)
          const lieu = e.lieu_id ? lieuxParId.get(e.lieu_id) : undefined
          const image = urlMedia(e.image_url) ?? imageTestEvenement(e)
          return (
            <article
              key={e.id}
              aria-hidden={!centre}
              onClick={() => !centre && setActif(i)}
              className={cn(
                "absolute top-0 left-1/2 h-[300px] w-[220px] overflow-hidden rounded-3xl shadow-2xl transition-all duration-500 ease-out motion-reduce:transition-none",
                !centre && "cursor-pointer",
                !visible && "pointer-events-none opacity-0",
              )}
              style={{
                transform: `translateX(calc(-50% + ${d * ECART}px)) scale(${1 - Math.abs(d) * 0.14})`,
                zIndex: 10 - Math.abs(d),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  centre
                    ? "bg-[linear-gradient(180deg,rgba(108,92,231,0.15)_0%,rgba(108,92,231,0.55)_55%,rgba(201,42,122,0.92)_100%)]"
                    : "bg-[linear-gradient(180deg,rgba(21,18,43,0.35),rgba(21,18,43,0.85))]",
                )}
              />
              <div className="absolute top-4 left-4 rounded-xl bg-white/95 px-3 py-1.5 text-center leading-none text-gw-nuit shadow">
                <span className="font-titre block text-xl font-bold">{date.getDate()}</span>
                <span className="mt-0.5 block text-[10px] font-semibold tracking-wider">{MOIS[date.getMonth()]}</span>
              </div>
              {centre && e.prix_a_partir_de != null && (
                <span className="absolute top-4 right-4 rounded-full bg-gw-nuit/80 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {formatPrix(e.prix_a_partir_de)}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-titre text-xl leading-tight font-bold">{e.titre}</h3>
                {lieu && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {lieu.nom}
                  </p>
                )}
                {centre && (
                  <>
                    <p className="mt-2 line-clamp-2 text-sm text-white/80">{e.description}</p>
                    <Link
                      href={`/evenements/${e.id}`}
                      className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-gw-rose-action transition-colors hover:bg-gw-rose-pale"
                    >
                      Réserver
                    </Link>
                  </>
                )}
              </div>
            </article>
          )
        })}

        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => aller(-1)}
              aria-label="Événement précédent"
              className="absolute top-1/2 left-0 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => aller(1)}
              aria-label="Événement suivant"
              className="absolute top-1/2 right-0 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-gw-rose-action transition-colors hover:bg-gw-rose-action-fonce"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {evenements.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setActif(i)}
              aria-label={`Afficher ${e.titre}`}
              aria-current={i === actif}
              className={cn("h-2 rounded-full transition-all", i === actif ? "w-6 bg-gw-rose" : "w-2 bg-white/30")}
            />
          ))}
        </div>
      )}
    </div>
  )
}
