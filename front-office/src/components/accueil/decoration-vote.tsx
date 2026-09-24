import { Heart, Star, ThumbsUp, Vote } from "lucide-react"
import { WaouhFace } from "@/components/ui/WaouhFace"

/*
 * Décoration de la colonne de texte de « Donnez votre avis ».
 * Un ticket de vote incliné, entouré des quatre réactions publiques.
 * Chaque bulle affiche le poids de la réaction dans le score
 * (mêmes valeurs que backend/app/utils/scoring.py) : la décoration
 * explique aussi comment le vote fonctionne.
 */

const BULLES = [
  { icone: ThumbsUp, fond: "var(--color-gw-violet)", poids: 1, position: "left-0 top-6", rotation: "-rotate-6" },
  { icone: null, fond: "#FFFFFF", poids: 2, position: "right-4 top-0", rotation: "rotate-6" },
  { icone: Star, fond: "var(--color-gw-nuit)", poids: 2, position: "left-6 bottom-2", rotation: "rotate-3" },
  { icone: Heart, fond: "var(--color-gw-rose)", poids: 3, position: "right-0 bottom-10", rotation: "-rotate-3" },
] as const

export function DecorationVote() {
  return (
    <div aria-hidden className="relative mx-auto h-80 w-full max-w-sm select-none">
      {/* halo lavande derrière le ticket */}
      <div className="absolute inset-8 rounded-full bg-gw-lavande blur-2xl" />

      {/* ticket de vote */}
      <div className="absolute top-1/2 left-1/2 flex h-36 w-64 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] overflow-hidden rounded-2xl bg-gw-nuit text-white shadow-[0_24px_40px_-18px_rgba(30,26,60,0.7)]">
        {/* talon */}
        <div className="flex w-20 flex-col items-center justify-center gap-1 border-r-2 border-dashed border-white/25 bg-gw-rose">
          <Vote className="h-8 w-8" strokeWidth={1.8} />
          <span className="font-titre text-xs font-semibold">Mon avis</span>
        </div>
        {/* corps du ticket */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded-full bg-white/80" />
            <div className="h-2 w-20 rounded-full bg-white/35" />
          </div>
          <div className="flex items-end gap-[3px]">
            {[6, 10, 4, 12, 8, 5, 12, 6, 9, 4, 11, 7, 12, 5].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white/60" style={{ height: `${h * 2}px` }} />
            ))}
          </div>
        </div>
        {/* encoches de part et d'autre de la perforation */}
        <span className="absolute -top-3 left-[4.35rem] h-6 w-6 rounded-full bg-gw-fond" />
        <span className="absolute -bottom-3 left-[4.35rem] h-6 w-6 rounded-full bg-gw-fond" />
      </div>

      {/* bulles de réactions, avec leur poids */}
      {BULLES.map(({ icone: Icone, fond, poids, position, rotation }, i) => (
        <div key={i} className={`absolute ${position} ${rotation}`}>
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
      ))}
    </div>
  )
}
