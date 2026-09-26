"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle,
  CalendarX,
  Heart,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Mic2,
  RefreshCw,
  Shapes,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { fetchUserData } from "@/services/auth.service"
import { fetchAllEvenements } from "@/services/evenementService"
import { fetchPropositionsAvecScores } from "@/services/propositionService"
import { fetchLieux } from "@/services/referentielService"
import { calculerRecommandation, fetchRecommandation } from "@/services/recommandationService"
import type { Evenement, Lieu, PropositionAvecScore, PropositionType, Recommandation } from "@/types"
import { WaouhFace } from "@/components/ui/WaouhFace"
import { Anneau } from "@/components/organisateur/anneau"
import { cn } from "@/utils"

/*
 * Recommandations : le module d'Intelligence Décisionnelle côté organisateur.
 * Pour l'événement choisi, on affiche :
 *  - la recommandation enregistrée (GET /evenements/{id}/recommandation) et un bouton
 *    pour la (re)calculer (POST .../recommandation/calculer) ;
 *  - les choix recommandés (lieu, artiste, type d'événement) et le détail des votes par type,
 *    à partir des scores actuels (GET /evenements/{id}/propositions/scores) ;
 *  - une explication de la méthode de calcul (poids de backend/app/utils/scoring.py).
 */

const entier = new Intl.NumberFormat("fr-FR")

const TYPES: { type: PropositionType; titre: string; pluriel: string; icone: LucideIcon; cle: "lieu_id" | "artiste_id" | "categorie_id" }[] = [
  { type: "LIEU", titre: "Lieu", pluriel: "lieux", icone: MapPin, cle: "lieu_id" },
  { type: "ARTISTE", titre: "Artiste", pluriel: "artistes", icone: Mic2, cle: "artiste_id" },
  { type: "CATEGORIE", titre: "Type d'événement", pluriel: "types d'événement", icone: Shapes, cle: "categorie_id" },
]

const POIDS: { libelle: string; poids: number; icone: React.ReactNode }[] = [
  { libelle: "J'aime", poids: 1, icone: <ThumbsUp className="h-4 w-4" /> },
  { libelle: "Waouh", poids: 2, icone: <WaouhFace size={16} /> },
  { libelle: "Favori", poids: 2, icone: <Star className="h-4 w-4" /> },
  { libelle: "J'adore", poids: 3, icone: <Heart className="h-4 w-4" /> },
  { libelle: "Commentaire", poids: 0, icone: <MessageCircle className="h-4 w-4" /> },
]

interface ClassementType {
  propositions: (PropositionAvecScore & { part: number })[]
  total: number
}

function classer(propositions: PropositionAvecScore[], type: PropositionType): ClassementType {
  const liste = propositions.filter((p) => p.type === type).sort((a, b) => b.score - a.score)
  const total = liste.reduce((s, p) => s + p.score, 0)
  return {
    total,
    propositions: liste.map((p) => ({ ...p, part: total > 0 ? Math.round((p.score / total) * 100) : 0 })),
  }
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export function OrganisateurRecommandations({ darkMode = false }: { darkMode?: boolean }) {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [nbPropositions, setNbPropositions] = useState<Map<number, number>>(new Map())
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [choisi, setChoisi] = useState<number | null>(null)
  const [propositions, setPropositions] = useState<PropositionAvecScore[]>([])
  const [reco, setReco] = useState<Recommandation | null>(null)
  const [chargement, setChargement] = useState(true)
  const [chargementEvenement, setChargementEvenement] = useState(false)
  const [calcul, setCalcul] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // 1. mes événements, le nombre de propositions de chacun, les lieux (capacités)
  useEffect(() => {
    Promise.allSettled([fetchUserData(), fetchAllEvenements(), fetchLieux()])
      .then(async ([u, e, l]) => {
        if (e.status === "rejected") {
          setErreur("Impossible de charger vos événements.")
          return
        }
        const moi = u.status === "fulfilled" ? u.value.id : null
        // à venir d'abord (du plus proche au plus lointain), puis passés (du plus récent au plus ancien)
        const instant = Date.now()
        const mesEvenements = (moi != null ? e.value.filter((x) => x.organisateur_id === moi) : e.value).sort((a, b) => {
          const ta = +new Date(a.date_debut)
          const tb = +new Date(b.date_debut)
          const pa = ta < instant
          const pb = tb < instant
          if (pa !== pb) return pa ? 1 : -1
          return pa ? tb - ta : ta - tb
        })
        setEvenements(mesEvenements)
        if (l.status === "fulfilled") setLieux(l.value)

        const comptes = await Promise.allSettled(mesEvenements.map((x) => fetchPropositionsAvecScores(x.id)))
        const m = new Map<number, number>()
        comptes.forEach((r, i) => m.set(mesEvenements[i].id, r.status === "fulfilled" ? r.value.length : 0))
        setNbPropositions(m)
        // par défaut : le prochain événement qui a des propositions
        const maintenant = Date.now()
        const parDefaut =
          mesEvenements.find((x) => (m.get(x.id) ?? 0) > 0 && new Date(x.date_debut).getTime() >= maintenant) ??
          mesEvenements.find((x) => (m.get(x.id) ?? 0) > 0) ??
          mesEvenements[0]
        setChoisi(parDefaut?.id ?? null)
      })
      .finally(() => setChargement(false))
  }, [])

  // 2. propositions et recommandation de l'événement choisi
  const chargerEvenement = useCallback(async (id: number) => {
    setChargementEvenement(true)
    const [p, r] = await Promise.allSettled([fetchPropositionsAvecScores(id), fetchRecommandation(id)])
    setPropositions(p.status === "fulfilled" ? p.value : [])
    setReco(r.status === "fulfilled" ? r.value : null)
    if (r.status === "rejected") toast.error(r.reason instanceof Error ? r.reason.message : "Erreur de chargement.")
    setChargementEvenement(false)
  }, [])

  useEffect(() => {
    if (choisi == null) return
    chargerEvenement(choisi)
    // garder l'onglet choisi visible dans la rangée défilante
    document.querySelector(`[data-evenement="${choisi}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [choisi, chargerEvenement])

  const calculer = async () => {
    if (choisi == null) return
    setCalcul(true)
    try {
      const nouvelle = await calculerRecommandation(choisi)
      setReco(nouvelle)
      // les scores ont pu bouger depuis le chargement de la page
      setPropositions(await fetchPropositionsAvecScores(choisi))
      toast.success("Recommandation calculée à partir des réactions actuelles du public.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le calcul a échoué.")
    } finally {
      setCalcul(false)
    }
  }

  const classements = useMemo(
    () => Object.fromEntries(TYPES.map((t) => [t.type, classer(propositions, t.type)])) as Record<PropositionType, ClassementType>,
    [propositions],
  )

  // proposition recommandée pour chaque type (d'après la recommandation enregistrée)
  const recommandees = useMemo(() => {
    const res: Partial<Record<PropositionType, (PropositionAvecScore & { part: number }) | undefined>> = {}
    if (!reco) return res
    for (const t of TYPES) {
      const id = reco[t.cle]
      res[t.type] = id == null ? undefined : classements[t.type].propositions.find((p) => p[t.cle] === id)
    }
    return res
  }, [reco, classements])

  // la tendance a-t-elle changé depuis le calcul ? (le meneur actuel n'est plus celui recommandé)
  const tendanceChangee = useMemo(() => {
    if (!reco) return false
    return TYPES.some((t) => {
      const tete = classements[t.type].propositions[0]
      return tete && reco[t.cle] != null && tete[t.cle] !== reco[t.cle] && tete.score > (recommandees[t.type]?.score ?? 0)
    })
  }, [reco, classements, recommandees])

  const evenement = evenements.find((e) => e.id === choisi)
  const lieuRecommande = reco?.lieu_id != null ? lieux.find((l) => l.id === reco.lieu_id) : undefined
  const typesAvecUneSeule = TYPES.filter((t) => classements[t.type].propositions.length === 1)

  if (chargement) {
    return (
      <div className="flex items-center justify-center gap-2 px-8 py-24 text-gw-texte-doux dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement de vos événements…
      </div>
    )
  }
  if (erreur) return <p className="px-8 py-16 text-center text-gw-rose-action">{erreur}</p>

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-titre text-2xl font-semibold">Recommandations</h1>
        <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
          Avant de fixer un lieu, un artiste ou un type d'événement, voyez ce que votre public préfère. La recommandation se
          calcule à partir des réactions laissées sur vos propositions.
        </p>
      </div>

      {evenements.length === 0 ? (
        <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
          <CalendarX className="h-8 w-8 text-gw-violet" aria-hidden />
          <p className="font-titre text-lg font-semibold">Vous n&apos;avez pas encore d&apos;événement</p>
          <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
            Créez un événement et soumettez des propositions au public pour obtenir une recommandation.
          </p>
        </div>
      ) : (
        <>
          {/* choix de l'événement */}
          <div role="tablist" aria-label="Événement" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {evenements.map((e) => {
              const actif = e.id === choisi
              const n = nbPropositions.get(e.id) ?? 0
              return (
                <button
                  key={e.id}
                  data-evenement={e.id}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  onClick={() => setChoisi(e.id)}
                  className={cn(
                    "shrink-0 rounded-2xl px-4 py-3 text-left transition-colors",
                    actif
                      ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white shadow-[0_12px_28px_-14px_rgba(108,92,231,0.9)]"
                      : "gw-carte hover:ring-1 hover:ring-gw-violet/40",
                  )}
                >
                  <span className="block max-w-[14rem] truncate text-sm font-semibold">{e.titre}</span>
                  <span className={cn("mt-0.5 block text-xs", actif ? "text-white/80" : "text-gw-texte-doux dark:text-white/60")}>
                    {dateCourte(e.date_debut)} · {n} proposition{n > 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}
          </div>

          {chargementEvenement ? (
            <div className="flex items-center justify-center gap-2 py-20 text-gw-texte-doux dark:text-white/60">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
            </div>
          ) : propositions.length === 0 ? (
            <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
              <Sparkles className="h-8 w-8 text-gw-violet" aria-hidden />
              <p className="font-titre text-lg font-semibold">Aucune proposition pour « {evenement?.titre} »</p>
              <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
                Soumettez au public plusieurs lieux, artistes ou types d'événement : leurs réactions permettront de calculer une
                recommandation.
              </p>
              {evenement && (
                <Link
                  href={`/organisateur/evenements/${evenement.id}`}
                  className="mt-2 rounded-full bg-gw-rose-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-gw-rose-action-fonce"
                >
                  Gérer les propositions
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* état de la recommandation */}
              {!reco ? (
                <section className="gw-carte flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="max-w-xl">
                    <p className="font-titre text-lg font-semibold">Pas encore de recommandation pour cet événement</p>
                    <p className="mt-1 text-sm text-gw-texte-doux dark:text-white/60">
                      {propositions.length} proposition{propositions.length > 1 ? "s" : ""} et{" "}
                      {entier.format(propositions.reduce((s, p) => s + p.score, 0))} points de réactions sont disponibles.
                    </p>
                  </div>
                  {classements.LIEU.propositions.length === 0 ? (
                    <p className="flex max-w-sm items-start gap-2 rounded-xl bg-gw-fond px-4 py-3 text-xs text-gw-texte-doux dark:bg-white/5 dark:text-white/65">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      Proposez au moins un lieu : la participation estimée se calcule à partir de la capacité du lieu
                      recommandé.
                    </p>
                  ) : (
                    <BoutonCalcul calcul={calcul} onClick={calculer} libelle="Calculer la recommandation" />
                  )}
                </section>
              ) : (
                <>
                  {tendanceChangee && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                        Les réactions du public ont changé le classement depuis le dernier calcul.
                      </span>
                      <button type="button" onClick={calculer} disabled={calcul} className="font-semibold underline underline-offset-4">
                        Recalculer
                      </button>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-3">
                    {/* niveau d'intérêt */}
                    <section className="gw-carte flex items-center gap-5 p-5">
                      <div className="relative shrink-0">
                        <Anneau pourcentage={reco.niveau_interet_estime ?? 0} id="anneau-interet" taille={104} epaisseur={11} />
                        <span className="font-titre absolute inset-0 flex items-center justify-center text-xl font-semibold">
                          {Math.round(reco.niveau_interet_estime ?? 0)} %
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">Niveau d&apos;intérêt estimé</p>
                        <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">
                          Part moyenne des points obtenue par les choix recommandés.
                        </p>
                      </div>
                    </section>

                    {/* participation estimée */}
                    <section className="gw-carte p-5">
                      <p className="flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden />
                        Participation estimée
                      </p>
                      <p className="font-titre mt-3 text-3xl font-semibold">
                        {entier.format(reco.participation_estimee ?? 0)}
                        <span className="text-base font-normal text-gw-texte-doux dark:text-white/60"> personnes</span>
                      </p>
                      {lieuRecommande?.capacite ? (
                        <>
                          <div className="mt-3 h-2 rounded-full bg-gw-lavande/60 dark:bg-white/10">
                            <div
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#6C5CE7,#E8479A)]"
                              style={{ width: `${Math.min(100, ((reco.participation_estimee ?? 0) / lieuRecommande.capacite) * 100)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-gw-texte-doux dark:text-white/60">
                            sur {entier.format(lieuRecommande.capacite)} places à {lieuRecommande.nom}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-gw-texte-doux dark:text-white/60">
                          Capacité du lieu recommandé inconnue : renseignez-la pour estimer la participation.
                        </p>
                      )}
                    </section>

                    {/* engagement et calcul */}
                    <section className="gw-carte flex flex-col justify-between gap-4 p-5">
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          <Trophy className="h-4 w-4 text-gw-rose" aria-hidden />
                          Score d&apos;engagement
                        </p>
                        <p className="font-titre mt-3 text-3xl font-semibold">
                          {entier.format(reco.score_engagement_total ?? 0)}
                          <span className="text-base font-normal text-gw-texte-doux dark:text-white/60"> points</span>
                        </p>
                        <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">
                          Calculée le{" "}
                          {new Date(reco.date_calcul).toLocaleString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <BoutonCalcul calcul={calcul} onClick={calculer} libelle="Recalculer" secondaire />
                    </section>
                  </div>

                  {/* choix recommandés */}
                  <section aria-labelledby="choix-titre">
                    <h2 id="choix-titre" className="font-titre mb-3 text-lg font-semibold">
                      Choix recommandés
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                      {TYPES.map(({ type, titre, pluriel, icone: Icone }) => {
                        const p = recommandees[type]
                        const nb = classements[type].propositions.length
                        return (
                          <div key={type} className="gw-carte flex items-start gap-4 p-5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white">
                              <Icone className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium tracking-wide text-gw-texte-doux uppercase dark:text-white/60">{titre}</p>
                              {p ? (
                                <>
                                  <p className="font-titre mt-0.5 text-lg leading-snug font-semibold">{p.libelle}</p>
                                  <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">
                                    {nb > 1
                                      ? `${p.part} % des points, parmi ${nb} ${pluriel} proposés`
                                      : "Seule proposition de ce type"}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-1 text-sm text-gw-texte-doux dark:text-white/60">
                                  {nb === 0 ? `Aucun ${titre.toLowerCase()} proposé` : "Non déterminé"}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}

              {/* détail des votes */}
              <section className="gw-carte p-5" aria-labelledby="votes-titre">
                <h2 id="votes-titre" className="font-titre text-lg font-semibold">
                  Détail des votes
                </h2>
                <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">Scores actuels, mis à jour à chaque réaction du public.</p>
                <div className="mt-5 grid gap-8 lg:grid-cols-3">
                  {TYPES.map(({ type, titre, icone: Icone }) => {
                    const { propositions: liste, total } = classements[type]
                    return (
                      <div key={type}>
                        <p className="flex items-center justify-between text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            <Icone className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden />
                            {titre}
                          </span>
                          <span className="text-xs font-normal text-gw-texte-doux dark:text-white/60">{entier.format(total)} pts</span>
                        </p>
                        {liste.length === 0 ? (
                          <p className="mt-3 text-sm text-gw-texte-doux dark:text-white/60">Aucune proposition.</p>
                        ) : (
                          <ol className="mt-3 space-y-3">
                            {liste.map((p, i) => (
                              <li key={p.id}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                  <span className={cn("min-w-0 truncate", i === 0 && "font-semibold")}>{p.libelle}</span>
                                  <span className="shrink-0 tabular-nums text-gw-texte-doux dark:text-white/60">
                                    {entier.format(p.score)} pts · {p.part} %
                                  </span>
                                </div>
                                <div className="mt-1.5 h-2 rounded-full bg-gw-lavande/50 dark:bg-white/10">
                                  <div
                                    className={cn(
                                      "h-2 rounded-full",
                                      i === 0 ? "bg-[linear-gradient(90deg,#6C5CE7,#E8479A)]" : darkMode ? "bg-white/35" : "bg-gw-violet/40",
                                    )}
                                    style={{ width: `${Math.max(p.part, p.score > 0 ? 3 : 0)}%` }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )
                  })}
                </div>
                {typesAvecUneSeule.length > 0 && (
                  <p className="mt-6 flex items-start gap-2 rounded-xl bg-gw-fond px-4 py-3 text-xs text-gw-texte-doux dark:bg-white/5 dark:text-white/65">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {(() => { const t = typesAvecUneSeule.map((x) => x.titre.toLowerCase()).join(", "); return t.charAt(0).toUpperCase() + t.slice(1) })()} : une seule proposition, donc 100 % des points
                    d&apos;office. Proposez au moins deux options par type pour une estimation plus fiable.
                  </p>
                )}
              </section>
            </>
          )}

          {/* méthode */}
          <section className="gw-carte p-5" aria-labelledby="methode-titre">
            <h2 id="methode-titre" className="font-titre text-lg font-semibold">
              Comment la recommandation est-elle calculée ?
            </h2>
            <ol className="mt-4 grid gap-5 text-sm md:grid-cols-2 xl:grid-cols-4">
              <li>
                <p className="font-semibold">1. Chaque réaction rapporte des points</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {POIDS.map((r) => (
                    <li
                      key={r.libelle}
                      className="flex items-center gap-1.5 rounded-full bg-gw-fond px-2.5 py-1 text-xs dark:bg-white/10"
                    >
                      {r.icone}
                      {r.libelle} ×{r.poids}
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <p className="font-semibold">2. Le meilleur score l&apos;emporte</p>
                <p className="mt-1 text-gw-texte-doux dark:text-white/65">
                  Pour chaque type (lieu, artiste, type d'événement), la proposition qui totalise le plus de points est recommandée.
                </p>
              </li>
              <li>
                <p className="font-semibold">3. Niveau d&apos;intérêt</p>
                <p className="mt-1 text-gw-texte-doux dark:text-white/65">
                  Moyenne des parts de points obtenues par les propositions recommandées.
                </p>
              </li>
              <li>
                <p className="font-semibold">4. Participation estimée</p>
                <p className="mt-1 text-gw-texte-doux dark:text-white/65">
                  Capacité du lieu recommandé × niveau d&apos;intérêt. C&apos;est un ordre de grandeur, pas une prévision de
                  ventes.
                </p>
              </li>
            </ol>
          </section>
        </>
      )}
    </div>
  )
}

function BoutonCalcul({
  calcul,
  onClick,
  libelle,
  secondaire,
}: {
  calcul: boolean
  onClick: () => void
  libelle: string
  secondaire?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={calcul}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
        secondaire
          ? "border border-gw-violet/40 text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white dark:hover:bg-white/10"
          : "bg-gw-rose-action text-white hover:bg-gw-rose-action-fonce",
      )}
    >
      {calcul ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : secondaire ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
      {calcul ? "Calcul en cours…" : libelle}
    </button>
  )
}
