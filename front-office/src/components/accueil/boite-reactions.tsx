"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { toast } from "sonner"
import { Heart, MessageCircle, SendHorizontal, Star, ThumbsUp, UserRound } from "lucide-react"
import { WaouhFace } from "@/components/ui/WaouhFace"
import {
  createInteraction,
  fetchInteractionsProposition,
  supprimerInteraction,
} from "@/services/interactionService"
import type { InteractionPublique, InteractionType } from "@/types"
import { cn } from "@/utils"
import { POIDS_REACTION } from "@/lib/use-propositions"
import { participantCourantId } from "@/lib/participant-courant"

/*
 * Réactions et commentaires d'une proposition, sur le modèle de Facebook :
 *  - un clic sur « J'aime » ajoute un J'aime ; un nouveau clic le retire ;
 *  - un survol prolongé (souris) ou un appui long (écran tactile) fait apparaître
 *    les réactions au-dessus du bouton : J'aime, J'adore, Waouh, Favori ;
 *  - au clavier : Flèche haut ouvre le choix, Échap le referme ;
 *  - une barre de commentaire toujours visible, et la liste des commentaires.
 *
 * Retirer ou changer de réaction passe par DELETE /interactions/{id}, que le backend
 * réserve à l'auteur connecté. Un visiteur anonyme peut donc réagir une fois,
 * mais doit se connecter pour changer d'avis (sa réaction est retenue dans le navigateur).
 */

type Reaction = Exclude<InteractionType, "COMMENTAIRE">

const REACTIONS: {
  type: Reaction
  libelle: string
  couleur: string // couleur du libellé quand la réaction est choisie (contraste AA sur blanc)
  fond: string // fond de la pastille
}[] = [
  { type: "LIKE", libelle: "J'aime", couleur: "#1466D8", fond: "linear-gradient(180deg,#18AFFF,#0062DF)" },
  { type: "JADORE", libelle: "J'adore", couleur: "#D8263F", fond: "linear-gradient(180deg,#FF6680,#E61739)" },
  { type: "WAOUH", libelle: "Waouh", couleur: "#B45309", fond: "transparent" },
  { type: "FAVORI", libelle: "Favori", couleur: "#A16207", fond: "linear-gradient(180deg,#FFD25E,#F2A60D)" },
]
const PAR_TYPE = Object.fromEntries(REACTIONS.map((r) => [r.type, r])) as Record<Reaction, (typeof REACTIONS)[number]>

const DELAI_SURVOL = 450 // ms avant l'ouverture au survol, comme Facebook
const DELAI_FERMETURE = 300
const DELAI_APPUI_LONG = 400

const cleStockage = (propositionId: number) => `guichetweb:reaction:${propositionId}`

/** Pastille ronde d'une réaction (icône blanche sur dégradé, ou visage Waouh). */
function Pastille({ type, taille }: { type: Reaction; taille: number }) {
  const r = PAR_TYPE[type]
  if (type === "WAOUH") return <WaouhFace size={taille} />
  const Icone = type === "LIKE" ? ThumbsUp : type === "JADORE" ? Heart : Star
  return (
    <span
      className="flex items-center justify-center rounded-full"
      style={{ width: taille, height: taille, background: r.fond }}
    >
      <Icone
        className="text-white"
        style={{ width: taille * 0.55, height: taille * 0.55 }}
        fill="white"
        strokeWidth={type === "LIKE" ? 1.5 : 0}
      />
    </span>
  )
}

function ilYa(iso: string) {
  const secondes = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })
  const paliers: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unite, duree] of paliers) {
    if (Math.abs(secondes) >= duree) return rtf.format(Math.round(secondes / duree), unite)
  }
  return "à l'instant"
}

export function BoiteReactions({
  propositionId,
  libelle,
  onScore,
}: {
  propositionId: number
  libelle: string
  /** Variation du score à répercuter sur la carte (poids de scoring.py). */
  onScore: (delta: number) => void
}) {
  const [interactions, setInteractions] = useState<InteractionPublique[]>([])
  const [maReaction, setMaReaction] = useState<{ type: Reaction; id: number | null } | null>(null)
  const [moi, setMoi] = useState<number | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [commentaire, setCommentaire] = useState("")
  const [commentairesOuverts, setCommentairesOuverts] = useState(false)

  const zone = useRef<HTMLDivElement>(null)
  const boutonPrincipal = useRef<HTMLButtonElement>(null)
  const champ = useRef<HTMLInputElement>(null)
  const listeFin = useRef<HTMLLIElement>(null)
  const minuteurs = useRef<{ ouvrir?: number; fermer?: number; appui?: number }>({})
  const appuiLong = useRef(false)

  // Chargement des réactions et commentaires, puis de « ma » réaction
  useEffect(() => {
    const idMoi = participantCourantId()
    setMoi(idMoi)
    let actif = true
    fetchInteractionsProposition(propositionId)
      .then((liste) => {
        if (!actif) return
        setInteractions(liste)
        if (idMoi != null) {
          const mienne = [...liste]
            .reverse()
            .find((i) => i.participant_id === idMoi && i.type_interaction !== "COMMENTAIRE")
          if (mienne) setMaReaction({ type: mienne.type_interaction as Reaction, id: mienne.id })
        }
      })
      .catch(() => {
        /* lecture indisponible : on garde des compteurs vides */
      })
    if (idMoi == null) {
      try {
        const memo = localStorage.getItem(cleStockage(propositionId))
        if (memo) setMaReaction(JSON.parse(memo))
      } catch {
        /* stockage indisponible */
      }
    }
    return () => {
      actif = false
    }
  }, [propositionId])

  // Fermer le choix en cliquant ailleurs
  useEffect(() => {
    if (!choixOuvert) return
    const ailleurs = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setChoixOuvert(false)
    }
    document.addEventListener("pointerdown", ailleurs)
    return () => document.removeEventListener("pointerdown", ailleurs)
  }, [choixOuvert])

  useEffect(() => {
    const m = minuteurs.current
    return () => {
      window.clearTimeout(m.ouvrir)
      window.clearTimeout(m.fermer)
      window.clearTimeout(m.appui)
    }
  }, [])

  const memoriser = useCallback(
    (valeur: { type: Reaction; id: number | null } | null) => {
      setMaReaction(valeur)
      if (moi != null) return
      try {
        if (valeur) localStorage.setItem(cleStockage(propositionId), JSON.stringify(valeur))
        else localStorage.removeItem(cleStockage(propositionId))
      } catch {
        /* stockage indisponible */
      }
    },
    [moi, propositionId],
  )

  const retirer = async (): Promise<boolean> => {
    if (!maReaction) return true
    if (moi == null || maReaction.id == null) {
      toast.info("Connectez-vous pour retirer ou changer votre réaction.")
      return false
    }
    await supprimerInteraction(maReaction.id)
    setInteractions((l) => l.filter((i) => i.id !== maReaction.id))
    onScore(-POIDS_REACTION[maReaction.type])
    memoriser(null)
    return true
  }

  const reagir = async (type: Reaction) => {
    setChoixOuvert(false)
    if (envoi || maReaction?.type === type) return
    setEnvoi(true)
    try {
      if (maReaction && !(await retirer())) return
      const creee = await createInteraction({ type_interaction: type, contenu: null, proposition_id: propositionId })
      setInteractions((l) => [...l, creee])
      onScore(POIDS_REACTION[type])
      memoriser({ type, id: creee.id })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La réaction n'a pas été enregistrée.")
    } finally {
      setEnvoi(false)
    }
  }

  const clicPrincipal = async () => {
    if (appuiLong.current) {
      // l'appui long vient d'ouvrir le choix : ce clic ne compte pas comme un J'aime
      appuiLong.current = false
      return
    }
    if (!maReaction) return reagir("LIKE")
    setEnvoi(true)
    try {
      await retirer()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de retirer la réaction.")
    } finally {
      setEnvoi(false)
    }
  }

  const envoyerCommentaire = async () => {
    const texte = commentaire.trim()
    if (!texte || envoi) return
    setEnvoi(true)
    try {
      const cree = await createInteraction({ type_interaction: "COMMENTAIRE", contenu: texte, proposition_id: propositionId })
      setInteractions((l) => [...l, cree])
      setCommentaire("")
      setCommentairesOuverts(true)
      requestAnimationFrame(() => listeFin.current?.scrollIntoView({ block: "nearest" }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le commentaire n'a pas été publié.")
    } finally {
      setEnvoi(false)
    }
  }

  // ---- ouverture du choix : survol, appui long, clavier ----
  const m = minuteurs.current
  const programmerOuverture = () => {
    window.clearTimeout(m.fermer)
    m.ouvrir = window.setTimeout(() => setChoixOuvert(true), DELAI_SURVOL)
  }
  const programmerFermeture = () => {
    window.clearTimeout(m.ouvrir)
    m.fermer = window.setTimeout(() => setChoixOuvert(false), DELAI_FERMETURE)
  }
  const garderOuvert = () => window.clearTimeout(m.fermer)

  const toucheBouton = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setChoixOuvert(true)
      requestAnimationFrame(() => zone.current?.querySelector<HTMLButtonElement>("[data-reaction]")?.focus())
    }
  }
  const toucheChoix = (e: KeyboardEvent) => {
    const boutons = [...(zone.current?.querySelectorAll<HTMLButtonElement>("[data-reaction]") ?? [])]
    const i = boutons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === "Escape") {
      setChoixOuvert(false)
      boutonPrincipal.current?.focus()
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const suivant = (i + (e.key === "ArrowRight" ? 1 : -1) + boutons.length) % boutons.length
      boutons[suivant]?.focus()
    }
  }

  // ---- résumé ----
  const { comptes, total, commentaires } = useMemo(() => {
    const comptes = new Map<Reaction, number>()
    const commentaires: InteractionPublique[] = []
    for (const i of interactions) {
      if (i.type_interaction === "COMMENTAIRE") commentaires.push(i)
      else comptes.set(i.type_interaction as Reaction, (comptes.get(i.type_interaction as Reaction) ?? 0) + 1)
    }
    const total = [...comptes.values()].reduce((s, n) => s + n, 0)
    return { comptes, total, commentaires }
  }, [interactions])
  const principales = [...comptes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)

  const active = maReaction ? PAR_TYPE[maReaction.type] : null

  return (
    <div className="rounded-2xl bg-white text-[#1C1E21] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
      {/* résumé : pastilles, total, nombre de commentaires */}
      <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-2 text-sm text-[#65676B]">
        {total > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="flex -space-x-1">
              {principales.map((t) => (
                <span key={t} className="rounded-full ring-2 ring-white">
                  <Pastille type={t} taille={18} />
                </span>
              ))}
            </span>
            <span>
              {maReaction && total > 1
                ? `Vous et ${total - 1} autre${total > 2 ? "s" : ""}`
                : maReaction
                  ? "Vous"
                  : total}
            </span>
          </span>
        ) : (
          <span>Soyez le premier à réagir</span>
        )}
        {commentaires.length > 0 && (
          <button
            type="button"
            onClick={() => setCommentairesOuverts((o) => !o)}
            aria-expanded={commentairesOuverts}
            className="hover:underline"
          >
            {commentaires.length} commentaire{commentaires.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* barre d'actions */}
      <div className="mx-3 flex border-y border-[#E4E6EB] py-1">
        <div
          ref={zone}
          className="relative flex flex-1"
          onPointerEnter={(e) => e.pointerType === "mouse" && programmerOuverture()}
          onPointerLeave={(e) => e.pointerType === "mouse" && programmerFermeture()}
        >
          {choixOuvert && (
            <div
              role="toolbar"
              aria-label={`Choisir une réaction pour ${libelle}`}
              onKeyDown={toucheChoix}
              onPointerEnter={garderOuvert}
              className="absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.22)]"
            >
              {REACTIONS.map(({ type, libelle: nom }, i) => (
                <button
                  key={type}
                  type="button"
                  data-reaction
                  aria-label={nom}
                  aria-pressed={maReaction?.type === type}
                  onClick={() => reagir(type)}
                  className="group/reaction relative flex h-11 w-11 items-center justify-center rounded-full outline-none"
                >
                  <span
                    className="animate-reaction-pop block transition-transform duration-150 ease-out group-hover/reaction:-translate-y-1.5 group-hover/reaction:scale-[1.35] group-focus-visible/reaction:-translate-y-1.5 group-focus-visible/reaction:scale-[1.35]"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <Pastille type={type} taille={38} />
                  </span>
                  {/* nom de la réaction au survol, comme Facebook (groupe nommé : la carte parente est aussi un « group ») */}
                  <span className="pointer-events-none absolute -top-8 rounded-full bg-black/80 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover/reaction:opacity-100 group-focus-visible/reaction:opacity-100">
                    {nom}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            ref={boutonPrincipal}
            type="button"
            disabled={envoi}
            aria-haspopup="true"
            aria-expanded={choixOuvert}
            aria-pressed={!!maReaction}
            aria-label={active ? `${active.libelle} (cliquer pour retirer)` : "J'aime. Maintenir ou Flèche haut pour d'autres réactions"}
            onClick={clicPrincipal}
            onKeyDown={toucheBouton}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") return
              window.clearTimeout(m.appui)
              m.appui = window.setTimeout(() => {
                appuiLong.current = true
                setChoixOuvert(true)
              }, DELAI_APPUI_LONG)
            }}
            onPointerUp={() => window.clearTimeout(m.appui)}
            onPointerCancel={() => window.clearTimeout(m.appui)}
            onContextMenu={(e) => e.preventDefault()}
            className="flex flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg py-2 text-[15px] font-semibold text-[#65676B] transition-colors select-none hover:bg-[#F2F2F2] focus-visible:outline-2 focus-visible:outline-[#1466D8] disabled:opacity-60"
            style={active ? { color: active.couleur } : undefined}
          >
            {active ? (
              <span className="animate-reaction-bounce" key={active.type}>
                <Pastille type={active.type} taille={20} />
              </span>
            ) : (
              <ThumbsUp className="h-5 w-5" aria-hidden />
            )}
            {active ? active.libelle : "J'aime"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setCommentairesOuverts(true)
            champ.current?.focus()
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[15px] font-semibold text-[#65676B] transition-colors hover:bg-[#F2F2F2] focus-visible:outline-2 focus-visible:outline-[#1466D8]"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          Commenter
        </button>
      </div>

      {/* commentaires */}
      {commentairesOuverts && commentaires.length > 0 && (
        <ul className="max-h-44 space-y-2 overflow-y-auto px-3 pt-3">
          {commentaires.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4E6EB]">
                <UserRound className="h-4 w-4 text-[#65676B]" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="rounded-2xl bg-[#F0F2F5] px-3 py-2">
                  <p className="text-[13px] font-semibold">
                    {moi != null && c.participant_id === moi
                      ? "Vous"
                      : c.participant_id != null
                        ? "Un participant"
                        : "Un visiteur"}
                  </p>
                  <p className="text-sm break-words">{c.contenu}</p>
                </div>
                <p className="mt-0.5 pl-3 text-xs text-[#65676B]">{ilYa(c.date_interaction)}</p>
              </div>
            </li>
          ))}
          <li ref={listeFin} aria-hidden />
        </ul>
      )}

      {/* barre de commentaire */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          envoyerCommentaire()
        }}
        className="flex items-center gap-2 p-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4E6EB]">
          <UserRound className="h-4 w-4 text-[#65676B]" aria-hidden />
        </span>
        <div className="relative flex-1">
          <input
            ref={champ}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            maxLength={500}
            placeholder="Écrivez un commentaire…"
            aria-label={`Commenter ${libelle}`}
            className="h-9 w-full rounded-full bg-[#F0F2F5] pr-10 pl-4 text-sm placeholder:text-[#65676B] focus:outline-2 focus:outline-[#1466D8]"
          />
          <button
            type="submit"
            disabled={!commentaire.trim() || envoi}
            aria-label="Publier le commentaire"
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#1466D8] transition-opacity hover:bg-[#E4E6EB] disabled:opacity-30"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  )
}
