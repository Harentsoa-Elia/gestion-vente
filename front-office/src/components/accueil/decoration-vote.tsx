import { Heart, Star, ThumbsUp, Vote } from "lucide-react"
import { WaouhFace } from "@/components/ui/WaouhFace"
import { cn } from "@/utils"

/*
 * Décoration de la colonne de texte de « Donnez votre avis ».
 * Une photo de concert inclinée, entourée des quatre réactions publiques qui flottent.
 * Chaque bulle affiche le poids de la réaction dans le score
 * (mêmes valeurs que backend/app/utils/scoring.py) : la décoration
 * explique aussi comment le vote fonctionne.
 *
 * Photo : public/images/accueil/avis-dj.jpg (noter son auteur pour les crédits).
 */

const PHOTO = "/images/accueil/avis-dj.jpg"

const BULLES = [
  { icone: ThumbsUp, fond: "var(--color-gw-violet)", poids: 1, position: "left-0 top-4 sm:-left-2", rotation: "-rotate-6", delai: "0s" },
  { icone: null, fond: "#FFFFFF", poids: 2, position: "right-2 -top-2 sm:right-0", rotation: "rotate-6", delai: "-2s" },
  { icone: Star, fond: "var(--color-gw-nuit)", poids: 2, position: "left-4 -bottom-2", rotation: "rotate-3", delai: "-4s" },
  { icone: Heart, fond: "var(--color-gw-rose)", poids: 3, position: "right-1 bottom-8 sm:-right-3", rotation: "-rotate-3", delai: "-1s" },
] as const

export function DecorationVote() {
  return (
    <div aria-hidden className="relative mx-auto h-[22rem] w-full max-w-sm select-none sm:max-w-md">
      {/* halo lavande et rose derrière la photo */}
      <div className="absolute inset-10 rounded-full bg-gw-lavande blur-2xl" />
      <div className="absolute right-6 bottom-8 h-32 w-32 rounded-full bg-gw-rose/30 blur-2xl" />

      {/* photo de concert, inclinée comme une carte posée */}
      <figure className="absolute top-1/2 left-1/2 m-0 h-52 w-[78%] -translate-x-1/2 -translate-y-1/2 -rotate-[6deg] overflow-hidden rounded-[1.6rem] bg-gw-nuit shadow-[0_30px_50px_-20px_rgba(30,26,60,0.75)] ring-[6px] ring-white sm:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO} alt="" loading="lazy" className="h-full w-full object-cover object-[60%_55%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,18,46,0)_45%,rgba(22,18,46,0.75)_100%)]" />
        <figcaption className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 py-1.5 pr-3.5 pl-1.5 text-xs font-semibold text-gw-nuit shadow">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gw-rose-action text-white">
            <Vote className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          Votre avis compte
        </figcaption>
      </figure>

      {/* bulles de réactions, avec leur poids, qui flottent en décalé */}
      {BULLES.map(({ icone: Icone, fond, poids, position, rotation, delai }, i) => (
        <div key={i} className={cn("absolute", position, rotation)}>
          <div
            className="relative motion-safe:animate-[gw-flotte_6s_ease-in-out_infinite]"
            style={{ animationDelay: delai }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full shadow-[0_14px_28px_-12px_rgba(30,26,60,0.55)] ring-4 ring-gw-fond"
              style={{ backgroundColor: fond }}
            >
              {Icone ? <Icone className="h-7 w-7 text-white" strokeWidth={2} /> : <WaouhFace size={40} />}
            </div>
            <span className="font-titre absolute -right-2 -bottom-1 rounded-full bg-white px-2 py-0.5 text-sm font-bold text-gw-nuit shadow-sm">
              ×{poids}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
