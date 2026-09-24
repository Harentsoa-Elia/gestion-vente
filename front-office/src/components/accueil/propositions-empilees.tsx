"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Heart, MapPin, Mic2, Shapes, Star, ThumbsUp, Vote, type LucideIcon } from "lucide-react"
import { WaouhFace } from "@/components/ui/WaouhFace"
import { createInteraction } from "@/services/interactionService"
import type { InteractionType, PropositionType } from "@/types"
import { cn } from "@/utils"
import { POIDS_REACTION, type PropositionEnVote } from "@/lib/use-propositions"
import { formatDateLongue } from "@/lib/evenements"
import { TitreSection } from "./titre-section"
import { DecorationVote } from "./decoration-vote"

/*
 * Propositions ouvertes au vote, présentées comme la section
 * « Vous aussi, engagez-vous simplement » de HelloAsso : de grandes cartes
 * en deux parties (aplat de couleur + visuel) qui s'empilent au défilement.
 * Chaque carte porte les réactions publiques, envoyées à POST /interactions.
 */

type Reaction = Exclude<InteractionType, "COMMENTAIRE">

const REACTIONS: { type: Reaction; libelle: string; icone: LucideIcon | typeof WaouhFace }[] = [
  { type: "LIKE", libelle: "J'aime", icone: ThumbsUp },
  { type: "WAOUH", libelle: "Waouh", icone: WaouhFace },
  { type: "FAVORI", libelle: "Favori", icone: Star },
  { type: "JADORE", libelle: "J'adore", icone: Heart },
]

const TYPES: Record<PropositionType, { libelle: string; icone: LucideIcon }> = {
  ARTISTE: { libelle: "Artiste proposé pour", icone: Mic2 },
  LIEU: { libelle: "Lieu proposé pour", icone: MapPin },
  CATEGORIE: { libelle: "Formule proposée pour", icone: Shapes },
}

/** Aplats des cartes, dans l'ordre : nuit, indigo, lavande, rose (palette du thème). */
const TONS = [
  { fond: "var(--color-gw-nuit)", clair: true, accent: "var(--color-gw-violet)" },
  { fond: "var(--color-gw-indigo)", clair: true, accent: "var(--color-gw-rose)" },
  { fond: "var(--color-gw-lavande)", clair: false, accent: "var(--color-gw-violet)" },
  { fond: "var(--color-gw-rose-action)", clair: true, accent: "var(--color-gw-violet)" },
]

function CarteProposition({ proposition, index }: { proposition: PropositionEnVote; index: number }) {
  const ton = TONS[index % TONS.length]
  const type = TYPES[proposition.type]
  const [score, setScore] = useState(proposition.score)
  const [envoi, setEnvoi] = useState<Reaction | null>(null)
  const [choisie, setChoisie] = useState<Reaction | null>(null)

  const reagir = async (reaction: Reaction) => {
    setEnvoi(reaction)
    try {
      await createInteraction({ type_interaction: reaction, contenu: null, proposition_id: proposition.id })
      setScore((s) => s + POIDS_REACTION[reaction])
      setChoisie(reaction)
      toast.success("Réaction enregistrée. Merci pour votre avis !")
    } catch {
      toast.error("La réaction n'a pas été enregistrée. Réessayez dans un instant.")
    } finally {
      setEnvoi(null)
    }
  }

  const texte = ton.clair ? "text-white" : "text-gw-nuit"
  const texteDoux = ton.clair ? "text-white/75" : "text-gw-nuit/70"
  const photo = proposition.artiste?.image_url

  return (
    <article
      className="group grid overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgba(30,26,60,0.55)] md:h-[26rem] md:grid-cols-[1.15fr_1fr]"
      style={{ backgroundColor: ton.fond }}
    >
      {/* aplat de couleur : le texte, en grand, comme HelloAsso */}
      <div className={cn("flex flex-col p-7 sm:p-8", texte)}>
        <p className={cn("text-sm font-medium", texteDoux)}>
          {type.libelle}{" "}
          <Link href={`/evenements/${proposition.evenement.id}`} className="underline underline-offset-4 hover:no-underline">
            {proposition.evenement.titre}
          </Link>
        </p>
        <h3 className="font-titre mt-3 line-clamp-3 text-4xl leading-[1.02] font-bold tracking-[-0.035em] sm:text-[2.75rem]">
          {proposition.libelle}
        </h3>
        <p className={cn("mt-4 text-sm", texteDoux)}>
          <span className={cn("font-semibold", texte)}>{score.toLocaleString("fr-FR")} points</span>
          {proposition.concurrentes > 0
            ? ` face à ${proposition.concurrentes} autre${proposition.concurrentes > 1 ? "s" : ""} proposition${proposition.concurrentes > 1 ? "s" : ""}`
            : " pour l'instant seule en lice"}
        </p>

        <div className="mt-auto pt-8">
          <p className={cn("mb-3 text-sm font-medium", texteDoux)}>
            {choisie ? "Votre réaction est comptée. Merci !" : "Qu'en pensez-vous ?"}
          </p>
          <div role="group" aria-label={`Réagir à ${proposition.libelle}`} className="flex flex-wrap gap-2">
            {REACTIONS.map(({ type: r, libelle, icone: Icone }) => {
              const active = choisie === r
              return (
                <button
                  key={r}
                  type="button"
                  disabled={envoi !== null || choisie !== null}
                  aria-pressed={active}
                  onClick={() => reagir(r)}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default",
                    ton.clair
                      ? "focus-visible:outline-white"
                      : "focus-visible:outline-gw-nuit",
                    active
                      ? ton.clair
                        ? "bg-white text-gw-nuit"
                        : "bg-gw-nuit text-white"
                      : ton.clair
                        ? "bg-white/12 text-white enabled:hover:bg-white/25 disabled:opacity-60"
                        : "bg-white/60 text-gw-nuit enabled:hover:bg-white disabled:opacity-60",
                  )}
                >
                  {r === "WAOUH" ? (
                    <WaouhFace size={18} />
                  ) : (
                    <Icone className={cn("h-4 w-4", envoi === r && "animate-reaction-bounce")} aria-hidden />
                  )}
                  {libelle}
                  <span className="sr-only"> (vaut {POIDS_REACTION[r]} point{POIDS_REACTION[r] > 1 ? "s" : ""})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* visuel : photo de l'artiste si l'API en fournit une, sinon la part des voix sur fond de scène */}
      <div className="relative min-h-56 overflow-hidden md:min-h-0">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={proposition.libelle} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <div className="scene absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" style={{ "--accent": ton.accent } as CSSProperties}>
            <type.icone className="absolute top-7 right-7 h-10 w-10 text-white/80" strokeWidth={1.5} aria-hidden />
            <div className="font-titre absolute bottom-7 left-7 text-white">
              <p className="text-7xl leading-none font-bold tracking-[-0.04em]">
                {proposition.part}
                <span className="text-4xl"> %</span>
              </p>
              <p className="mt-2 max-w-[16rem] text-sm text-white/80">
                des points parmi les {proposition.type === "LIEU" ? "lieux" : proposition.type === "ARTISTE" ? "artistes" : "formules"} proposés
              </p>
            </div>
          </div>
        )}
        <p className="absolute top-4 left-4 rounded-full bg-gw-nuit/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {formatDateLongue(proposition.evenement.date_debut)}
        </p>
      </div>
    </article>
  )
}

/** Décalage vertical entre deux cartes empilées (la carte du dessous dépasse de cette hauteur). */
const DECALAGE = 22
/** Position d'accroche de la première carte, sous l'en-tête (64 px) avec une marge. */
const HAUT_PILE = 96
/** Réduction de taille par carte posée par-dessus. */
const REDUCTION = 0.05

/**
 * Effet de pile façon HelloAsso : chaque carte reste accrochée (sticky) pendant que la suivante
 * glisse par-dessus ; la carte recouverte rétrécit et s'assombrit légèrement au fur et à mesure,
 * de sorte que son bord supérieur, plus étroit, dépasse derrière la carte du dessus.
 * Calculé au défilement (une seule fois par image), désactivé sur mobile et si l'utilisateur
 * a demandé à réduire les animations.
 */
function useEffetPile(nombre: number) {
  const elements = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (nombre < 2) return
    const grandEcran = window.matchMedia("(min-width: 768px)")
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)")
    let image = 0

    const appliquer = () => {
      image = 0
      const cartes = elements.current.slice(0, nombre)
      const actif = grandEcran.matches && !mouvementReduit.matches
      const rects = cartes.map((c) => c?.parentElement?.getBoundingClientRect())

      cartes.forEach((carte, i) => {
        if (!carte) return
        let profondeur = 0
        if (actif) {
          const ri = rects[i]
          for (let j = i + 1; j < cartes.length; j++) {
            const rj = rects[j]
            if (!ri || !rj) continue
            const ecartFinal = DECALAGE * (j - i)
            const course = ri.height - ecartFinal
            const avancee = (ri.height - (rj.top - ri.top)) / course
            profondeur += Math.min(1, Math.max(0, avancee))
          }
        }
        carte.style.transform = profondeur > 0 ? `scale(${1 - profondeur * REDUCTION})` : ""
        carte.style.filter = profondeur > 0 ? `brightness(${1 - profondeur * 0.08})` : ""
      })
    }

    const demander = () => {
      if (!image) image = requestAnimationFrame(appliquer)
    }

    appliquer()
    window.addEventListener("scroll", demander, { passive: true })
    window.addEventListener("resize", demander)
    grandEcran.addEventListener("change", demander)
    mouvementReduit.addEventListener("change", demander)
    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener("scroll", demander)
      window.removeEventListener("resize", demander)
      grandEcran.removeEventListener("change", demander)
      mouvementReduit.removeEventListener("change", demander)
    }
  }, [nombre])

  return elements
}

export function PropositionsEmpilees({
  propositions,
  chargement,
}: {
  propositions: PropositionEnVote[]
  chargement: boolean
}) {
  const cartes = useEffetPile(propositions.length)

  return (
    <section id="avis" aria-labelledby="avis-titre" className="scroll-mt-20 bg-gw-fond py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        {/* colonne gauche : le texte et sa décoration, qui restent visibles pendant le défilement des cartes */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <TitreSection
            id="avis-titre"
            titre="Donnez votre avis"
            description="Les organisateurs hésitent entre plusieurs artistes, lieux ou formules. Réagissez : vos réactions pèsent dans leur décision."
          />
          <DecorationVote />
          <p className="mx-auto mt-4 max-w-sm text-center text-sm text-gw-texte-doux">
            Chaque réaction ajoute des points à la proposition. Un «&nbsp;J&apos;adore&nbsp;» compte trois fois
            plus qu&apos;un «&nbsp;J&apos;aime&nbsp;».
          </p>
        </div>

        {/* colonne droite : les propositions, en cartes empilées */}
        <div>
          {chargement ? (
            <div className="h-[26rem] animate-pulse rounded-[1.75rem] bg-[#E6E1F7]" aria-hidden />
          ) : propositions.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[1.75rem] bg-gw-lavande p-8 sm:p-10">
              <Vote className="h-8 w-8 text-gw-indigo" aria-hidden />
              <p className="font-titre max-w-lg text-3xl leading-tight font-bold tracking-[-0.03em] text-gw-nuit">
                Aucun vote en cours pour le moment
              </p>
              <p className="max-w-md text-gw-nuit/70">
                Dès qu&apos;un organisateur soumet des artistes ou des lieux au public, ils apparaissent ici.
              </p>
            </div>
          ) : (
            <ol className="space-y-6 md:space-y-10">
              {propositions.map((p, i) => (
                <li key={p.id} className="md:sticky" style={{ top: `${HAUT_PILE + i * DECALAGE}px` }}>
                  <div
                    ref={(el) => {
                      cartes.current[i] = el
                    }}
                    className="origin-top will-change-transform"
                  >
                    <CarteProposition proposition={p} index={i} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
