"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Circle,
  ExternalLink,
  Loader2,
  MapPin,
  Mic2,
  Pencil,
  Plus,
  Send,
  Shapes,
  Sparkles,
  Ticket,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { fetchUserData } from "@/services/auth.service"
import {
  createCategorieBillet,
  deleteCategorieBillet,
  deleteEvenement,
  fetchAllEvenements,
  fetchCategoriesBilletByEvenement,
  soumettreEvenement,
  updateCategorieBillet,
  updateEvenement,
} from "@/services/evenementService"
import { createProposition, deleteProposition, fetchPropositionsAvecScores } from "@/services/propositionService"
import { createArtiste, fetchArtistes, fetchCategories, fetchLieux } from "@/services/referentielService"
import type { Artiste, Categorie, CategorieBillet, Evenement, Lieu, PropositionAvecScore, PropositionType } from "@/types"
import { cn } from "@/utils"
import { BadgeStatut, Bouton, Champ, Modale, classeChamp } from "@/components/organisateur/ui"
import { FormulaireEvenement, ModaleNouveauLieu } from "@/components/organisateur/formulaire-evenement"

/*
 * Fiche d'un événement de l'organisateur (cas d'utilisation « Gérer un événement ») :
 *  - parcours de publication : brouillon -> soumis à l'administrateur -> validé (ou rejeté) ;
 *  - propositions soumises au public (lieux, artistes, formules) : le libellé reprend
 *    automatiquement le nom de l'élément choisi ;
 *  - catégories de billets (tarifs, quantités) ;
 *  - informations générales et suppression.
 */

type Onglet = "propositions" | "billets" | "informations"

const TYPES: { type: PropositionType; titre: string; icone: LucideIcon; cle: "lieu_id" | "artiste_id" | "categorie_id"; aide: string }[] = [
  { type: "LIEU", titre: "Lieux", icone: MapPin, cle: "lieu_id", aide: "Où organiser l'événement ?" },
  { type: "ARTISTE", titre: "Artistes", icone: Mic2, cle: "artiste_id", aide: "Qui programmer ?" },
  { type: "CATEGORIE", titre: "Formules", icone: Shapes, cle: "categorie_id", aide: "Quel type d'événement ?" },
]

const entier = new Intl.NumberFormat("fr-FR")

/* ---------- parcours de publication ---------- */

function Parcours({ evenement }: { evenement: Evenement }) {
  const s = evenement.statut_validation
  const etapes = [
    { titre: "Préparation", fait: s !== "brouillon", actif: s === "brouillon" || s === "rejete" },
    { titre: "Validation par l'administrateur", fait: s === "valide", actif: s === "en_attente_validation" },
    { titre: "En vente sur le site", fait: s === "valide", actif: false },
  ]
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {etapes.map((e, i) => (
        <li key={e.titre} className="flex items-center gap-3 sm:flex-1">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              e.fait
                ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white"
                : e.actif
                  ? "bg-white text-gw-violet ring-2 ring-gw-violet dark:bg-transparent dark:text-white dark:ring-white"
                  : "bg-gw-fond text-gw-texte-doux dark:bg-white/10 dark:text-white/50",
            )}
          >
            {e.fait ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
          </span>
          <span className={cn("text-sm", e.actif || e.fait ? "font-semibold" : "text-gw-texte-doux dark:text-white/55")}>{e.titre}</span>
          {i < etapes.length - 1 && <span className="mx-4 hidden h-px flex-1 bg-gw-bordure sm:block dark:bg-white/15" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

/* ---------- fiche ---------- */

export function OrganisateurEvenementDetail({ evenementId }: { evenementId: number; darkMode?: boolean }) {
  const router = useRouter()
  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [propositions, setPropositions] = useState<PropositionAvecScore[]>([])
  const [billets, setBillets] = useState<CategorieBillet[]>([])
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [artistes, setArtistes] = useState<Artiste[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [onglet, setOnglet] = useState<Onglet>("propositions")
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [soumission, setSoumission] = useState(false)
  const [suppression, setSuppression] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  const rechargerPropositions = useCallback(async () => {
    setPropositions(await fetchPropositionsAvecScores(evenementId))
  }, [evenementId])
  const rechargerBillets = useCallback(async () => {
    setBillets(await fetchCategoriesBilletByEvenement(evenementId))
  }, [evenementId])

  useEffect(() => {
    // l'événement est lu dans /evenements/all : GET /evenements/{id} compterait une vue
    Promise.allSettled([
      fetchUserData(),
      fetchAllEvenements(),
      fetchPropositionsAvecScores(evenementId),
      fetchCategoriesBilletByEvenement(evenementId),
      fetchLieux(),
      fetchArtistes(),
      fetchCategories(),
    ])
      .then(([u, e, p, b, l, a, c]) => {
        const ev = e.status === "fulfilled" ? e.value.find((x) => x.id === evenementId) : undefined
        if (!ev) {
          setErreur("Événement introuvable.")
          return
        }
        if (u.status === "fulfilled" && ev.organisateur_id !== u.value.id) {
          setErreur("Cet événement appartient à un autre organisateur.")
          return
        }
        setEvenement(ev)
        if (p.status === "fulfilled") setPropositions(p.value)
        if (b.status === "fulfilled") setBillets(b.value)
        if (l.status === "fulfilled") setLieux(l.value)
        if (a.status === "fulfilled") setArtistes(a.value)
        if (c.status === "fulfilled") setCategories(c.value)
        if (ev.statut_validation === "valide") setOnglet("billets")
      })
      .finally(() => setChargement(false))
  }, [evenementId])

  const parType = useMemo(() => {
    const m = { LIEU: [], ARTISTE: [], CATEGORIE: [] } as Record<PropositionType, PropositionAvecScore[]>
    for (const p of propositions) m[p.type].push(p)
    for (const t of Object.keys(m) as PropositionType[]) m[t].sort((a, b) => b.score - a.score)
    return m
  }, [propositions])

  if (chargement) {
    return (
      <div className="flex items-center justify-center gap-2 px-8 py-24 text-gw-texte-doux dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement de l&apos;événement…
      </div>
    )
  }
  if (erreur || !evenement) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-gw-rose-action">{erreur}</p>
        <Link href="/organisateur/evenements" className="mt-4 inline-block text-sm font-semibold text-gw-violet underline dark:text-gw-lavande">
          Retour à mes événements
        </Link>
      </div>
    )
  }

  const statut = evenement.statut_validation
  const modifiable = statut === "brouillon" || statut === "rejete"
  const manquants = TYPES.filter((t) => parType[t.type].length === 0)
  const lieu = evenement.lieu_id != null ? lieux.find((l) => l.id === evenement.lieu_id) : undefined

  const soumettre = async () => {
    setSoumission(true)
    try {
      setEvenement(await soumettreEvenement(evenement.id))
      toast.success("Événement envoyé à l'administrateur pour validation.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La soumission a échoué.")
    } finally {
      setSoumission(false)
    }
  }

  const supprimer = async () => {
    setSuppressionEnCours(true)
    try {
      await deleteEvenement(evenement.id)
      toast.success("Événement supprimé.")
      router.push("/organisateur/evenements")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La suppression a échoué.")
      setSuppressionEnCours(false)
    }
  }

  const onglets: { id: Onglet; libelle: string; nombre?: number }[] = [
    { id: "propositions", libelle: "Propositions au public", nombre: propositions.length },
    { id: "billets", libelle: "Billets", nombre: billets.length },
    { id: "informations", libelle: "Informations" },
  ]

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/organisateur/evenements"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gw-texte-doux hover:text-gw-violet dark:text-white/60 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mes événements
      </Link>

      {/* en-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-titre text-2xl font-semibold">{evenement.titre}</h1>
            <BadgeStatut statut={statut} />
          </div>
          <p className="mt-1 text-sm first-letter:uppercase text-gw-texte-doux dark:text-white/60">
            {new Date(evenement.date_debut).toLocaleString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {lieu ? ` · ${lieu.nom}` : ""}
          </p>
        </div>
        {statut === "valide" && (
          <Link
            href={`/evenements/${evenement.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-gw-violet/40 px-4 py-2.5 text-sm font-semibold text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white dark:hover:bg-white/10"
          >
            Voir la page publique <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>

      {/* parcours et soumission */}
      <section className="gw-carte space-y-5 p-5 sm:p-6" aria-label="Publication">
        <Parcours evenement={evenement} />
        {modifiable && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gw-bordure pt-5 dark:border-gw-bordure-sombre">
            <div className="text-sm">
              {statut === "rejete" && (
                <p className="mb-2 font-semibold text-gw-rose-action dark:text-pink-200">
                  L&apos;administrateur a rejeté cet événement. Corrigez-le puis soumettez-le à nouveau.
                </p>
              )}
              <p className="font-medium">Avant d&apos;envoyer l&apos;événement à l&apos;administrateur :</p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                {TYPES.map((t) => {
                  const ok = parType[t.type].length > 0
                  return (
                    <li key={t.type} className={cn("flex items-center gap-1.5", ok ? "text-emerald-700 dark:text-emerald-300" : "text-gw-texte-doux dark:text-white/55")}>
                      {ok ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
                      au moins un{t.type === "CATEGORIE" ? "e formule" : t.type === "LIEU" ? " lieu" : " artiste"} proposé{t.type === "CATEGORIE" ? "e" : ""}
                    </li>
                  )
                })}
                <li className={cn("flex items-center gap-1.5", billets.length > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-gw-texte-doux dark:text-white/55")}>
                  {billets.length > 0 ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
                  des tarifs (conseillé)
                </li>
              </ul>
            </div>
            <Bouton onClick={soumettre} chargement={soumission} disabled={manquants.length > 0} title={manquants.length > 0 ? "Complétez d'abord les propositions" : undefined}>
              <Send className="h-4 w-4" aria-hidden />
              Soumettre à l&apos;administrateur
            </Bouton>
          </div>
        )}
        {statut === "en_attente_validation" && (
          <p className="border-t border-gw-bordure pt-5 text-sm text-gw-texte-doux dark:border-gw-bordure-sombre dark:text-white/65">
            L&apos;administrateur doit maintenant valider l&apos;événement. En attendant, le public peut déjà réagir à vos
            propositions : suivez les résultats dans{" "}
            <Link href="/organisateur/intelligence-decisionnelle" className="font-semibold text-gw-violet underline dark:text-gw-lavande">
              Recommandations
            </Link>
            .
          </p>
        )}
      </section>

      {/* onglets */}
      <div role="tablist" aria-label="Sections" className="flex gap-6 overflow-x-auto border-b border-gw-bordure dark:border-gw-bordure-sombre">
        {onglets.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-[3px] pb-3 text-sm font-semibold transition-colors",
              onglet === o.id
                ? "border-gw-violet text-gw-nuit dark:border-white dark:text-white"
                : "border-transparent text-gw-texte-doux hover:text-gw-nuit dark:text-white/55 dark:hover:text-white",
            )}
          >
            {o.libelle}
            {o.nombre !== undefined && (
              <span className="rounded-full bg-gw-fond px-1.5 text-xs dark:bg-white/10">{o.nombre}</span>
            )}
          </button>
        ))}
      </div>

      {onglet === "propositions" && (
        <OngletPropositions
          evenementId={evenement.id}
          parType={parType}
          lieux={lieux}
          artistes={artistes}
          categories={categories}
          onLieuCree={(l) => setLieux((ls) => [...ls, l])}
          onArtisteCree={(a) => setArtistes((as) => [...as, a])}
          onChangement={rechargerPropositions}
        />
      )}
      {onglet === "billets" && <OngletBillets evenementId={evenement.id} billets={billets} onChangement={rechargerBillets} />}
      {onglet === "informations" && (
        <section className="gw-carte p-5 sm:p-6">
          <FormulaireEvenement
            key={evenement.id}
            initial={evenement}
            lieux={lieux}
            categories={categories}
            onLieuCree={(l) => setLieux((ls) => [...ls, l])}
            libelleBouton="Enregistrer les modifications"
            onEnregistrer={async (saisie) => {
              setEvenement(await updateEvenement(evenement.id, saisie))
              toast.success("Modifications enregistrées.")
            }}
          />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gw-bordure pt-5 dark:border-gw-bordure-sombre">
            <div className="text-sm">
              <p className="font-semibold">Supprimer l&apos;événement</p>
              <p className="text-gw-texte-doux dark:text-white/60">
                {statut === "valide"
                  ? "Un événement en vente ne peut pas être supprimé ici : contactez l'administrateur."
                  : "Ses propositions, réactions et tarifs seront aussi supprimés."}
              </p>
            </div>
            <Bouton variante="danger" disabled={statut === "valide"} onClick={() => setSuppression(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </Bouton>
          </div>
        </section>
      )}

      <Modale ouverte={suppression} titre="Supprimer l'événement ?" onFermer={() => setSuppression(false)}>
        <p className="text-sm text-gw-texte-doux dark:text-white/70">
          « {evenement.titre} » sera supprimé définitivement, avec ses {propositions.length} proposition
          {propositions.length > 1 ? "s" : ""}, les réactions du public et ses tarifs.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setSuppression(false)}>
            Annuler
          </Bouton>
          <Bouton variante="danger" onClick={supprimer} chargement={suppressionEnCours}>
            Supprimer définitivement
          </Bouton>
        </div>
      </Modale>
    </div>
  )
}

/* ---------- onglet Propositions ---------- */

function OngletPropositions({
  evenementId,
  parType,
  lieux,
  artistes,
  categories,
  onLieuCree,
  onArtisteCree,
  onChangement,
}: {
  evenementId: number
  parType: Record<PropositionType, PropositionAvecScore[]>
  lieux: Lieu[]
  artistes: Artiste[]
  categories: Categorie[]
  onLieuCree: (l: Lieu) => void
  onArtisteCree: (a: Artiste) => void
  onChangement: () => Promise<void>
}) {
  const [choix, setChoix] = useState<Record<PropositionType, string>>({ LIEU: "", ARTISTE: "", CATEGORIE: "" })
  const [ajout, setAjout] = useState<PropositionType | null>(null)
  const [aRetirer, setARetirer] = useState<PropositionAvecScore | null>(null)
  const [retrait, setRetrait] = useState(false)
  const [nouveauLieu, setNouveauLieu] = useState(false)
  const [nouvelArtiste, setNouvelArtiste] = useState(false)

  const elements: Record<PropositionType, { id: number; nom: string; detail?: string }[]> = {
    LIEU: lieux.map((l) => ({
      id: l.id,
      nom: l.nom,
      detail: [l.ville, l.capacite ? `${entier.format(l.capacite)} places` : null].filter(Boolean).join(", "),
    })),
    ARTISTE: artistes.map((a) => ({ id: a.id, nom: a.nom, detail: a.genre_artistique ?? undefined })),
    CATEGORIE: categories.map((c) => ({ id: c.id, nom: c.nom })),
  }

  const ajouter = async (type: PropositionType, cle: "lieu_id" | "artiste_id" | "categorie_id", idElement?: number) => {
    const id = idElement ?? Number(choix[type])
    if (!id) return
    setAjout(type)
    try {
      await createProposition({ evenement_id: evenementId, type, [cle]: id })
      setChoix((c) => ({ ...c, [type]: "" }))
      await onChangement()
      toast.success("Proposition ajoutée : le public peut maintenant réagir.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La proposition n'a pas été ajoutée.")
    } finally {
      setAjout(null)
    }
  }

  const retirer = async () => {
    if (!aRetirer) return
    setRetrait(true)
    try {
      await deleteProposition(aRetirer.id)
      await onChangement()
      toast.success("Proposition retirée.")
      setARetirer(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La proposition n'a pas été retirée.")
    } finally {
      setRetrait(false)
    }
  }

  return (
    <>
      <p className="max-w-3xl text-sm text-gw-texte-doux dark:text-white/65">
        Soumettez au public plusieurs options par type : ses réactions désigneront la meilleure dans{" "}
        <Link href="/organisateur/intelligence-decisionnelle" className="font-semibold text-gw-violet underline dark:text-gw-lavande">
          Recommandations
        </Link>
        . Proposez au moins deux options par type pour que le vote ait du sens.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        {TYPES.map(({ type, titre, icone: Icone, cle, aide }) => {
          const liste = parType[type]
          const dejaProposes = new Set(liste.map((p) => p[cle]))
          const disponibles = elements[type].filter((el) => !dejaProposes.has(el.id))
          return (
            <section key={type} className="gw-carte flex flex-col p-5" aria-label={titre}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white">
                  <Icone className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-titre text-lg font-semibold">{titre}</h2>
                  <p className="text-xs text-gw-texte-doux dark:text-white/60">{aide}</p>
                </div>
              </div>

              {liste.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-gw-lavande px-4 py-5 text-center text-sm text-gw-texte-doux dark:border-white/15 dark:text-white/55">
                  Aucune proposition pour l&apos;instant.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {liste.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl bg-gw-fond px-3 py-2.5 dark:bg-white/5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.libelle}</span>
                        <span className="text-xs text-gw-texte-doux dark:text-white/55">
                          {entier.format(p.score)} point{p.score > 1 ? "s" : ""} de réactions
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setARetirer(p)}
                        aria-label={`Retirer ${p.libelle}`}
                        className="rounded-full p-2 text-gw-texte-doux hover:bg-white hover:text-red-600 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-4">
                <label className="sr-only" htmlFor={`ajout-${type}`}>
                  Ajouter {titre.toLowerCase()}
                </label>
                <div className="flex gap-2">
                  <select
                    id={`ajout-${type}`}
                    value={choix[type]}
                    onChange={(e) => setChoix((c) => ({ ...c, [type]: e.target.value }))}
                    className={classeChamp}
                  >
                    <option value="">{disponibles.length ? "Choisir…" : "Tout est déjà proposé"}</option>
                    {disponibles.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.detail ? `${el.nom} (${el.detail})` : el.nom}
                      </option>
                    ))}
                  </select>
                  <Bouton
                    variante="secondaire"
                    className="shrink-0 px-3"
                    onClick={() => ajouter(type, cle)}
                    disabled={!choix[type]}
                    chargement={ajout === type}
                    aria-label={`Ajouter la proposition`}
                  >
                    {ajout !== type && <Plus className="h-4 w-4" aria-hidden />}
                  </Bouton>
                </div>
                {type !== "CATEGORIE" && (
                  <button
                    type="button"
                    onClick={() => (type === "LIEU" ? setNouveauLieu(true) : setNouvelArtiste(true))}
                    className="mt-2 text-xs font-semibold text-gw-violet hover:underline dark:text-gw-lavande"
                  >
                    {type === "LIEU" ? "+ Le lieu n'est pas dans la liste" : "+ L'artiste n'est pas dans la liste"}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <ModaleNouveauLieu
        ouverte={nouveauLieu}
        onFermer={() => setNouveauLieu(false)}
        onCree={async (lieu) => {
          onLieuCree(lieu)
          setNouveauLieu(false)
          await ajouter("LIEU", "lieu_id", lieu.id)
        }}
      />
      <ModaleNouvelArtiste
        ouverte={nouvelArtiste}
        onFermer={() => setNouvelArtiste(false)}
        onCree={async (artiste) => {
          onArtisteCree(artiste)
          setNouvelArtiste(false)
          await ajouter("ARTISTE", "artiste_id", artiste.id)
        }}
      />

      <Modale ouverte={aRetirer !== null} titre="Retirer la proposition ?" onFermer={() => setARetirer(null)}>
        <p className="text-sm text-gw-texte-doux dark:text-white/70">
          « {aRetirer?.libelle} » ne sera plus proposé au public.
          {aRetirer && aRetirer.score > 0 && (
            <>
              {" "}
              Ses <strong className="text-gw-nuit dark:text-white">{entier.format(aRetirer.score)} points</strong> de réactions seront
              perdus.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setARetirer(null)}>
            Annuler
          </Bouton>
          <Bouton variante="danger" onClick={retirer} chargement={retrait}>
            Retirer
          </Bouton>
        </div>
      </Modale>
    </>
  )
}

function ModaleNouvelArtiste({
  ouverte,
  onFermer,
  onCree,
}: {
  ouverte: boolean
  onFermer: () => void
  onCree: (artiste: Artiste) => void
}) {
  const [nom, setNom] = useState("")
  const [genre, setGenre] = useState("")
  const [envoi, setEnvoi] = useState(false)

  const creer = async () => {
    if (!nom.trim()) return
    setEnvoi(true)
    try {
      const artiste = await createArtiste({ nom: nom.trim(), genre_artistique: genre.trim() || null, description: null })
      toast.success(`Artiste « ${artiste.nom} » créé.`)
      setNom("")
      setGenre("")
      onCree(artiste)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'artiste n'a pas été créé.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte={ouverte} titre="Nouvel artiste" onFermer={onFermer}>
      <div className="space-y-4">
        <Champ libelle="Nom" requis>
          {(id) => <input id={id} value={nom} onChange={(e) => setNom(e.target.value)} className={classeChamp} placeholder="Ex. Mahaleo" />}
        </Champ>
        <Champ libelle="Genre">
          {(id) => <input id={id} value={genre} onChange={(e) => setGenre(e.target.value)} className={classeChamp} placeholder="Ex. Folk malgache" />}
        </Champ>
        <div className="flex justify-end gap-2 pt-2">
          <Bouton variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton onClick={creer} chargement={envoi} disabled={!nom.trim()}>
            Créer et proposer
          </Bouton>
        </div>
      </div>
    </Modale>
  )
}

/* ---------- onglet Billets ---------- */

function OngletBillets({
  evenementId,
  billets,
  onChangement,
}: {
  evenementId: number
  billets: CategorieBillet[]
  onChangement: () => Promise<void>
}) {
  const [edition, setEdition] = useState<CategorieBillet | "nouveau" | null>(null)
  const [aSupprimer, setASupprimer] = useState<CategorieBillet | null>(null)
  const [suppression, setSuppression] = useState(false)

  const supprimer = async () => {
    if (!aSupprimer) return
    setSuppression(true)
    try {
      await deleteCategorieBillet(aSupprimer.id)
      await onChangement()
      toast.success("Tarif supprimé.")
      setASupprimer(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le tarif n'a pas été supprimé.")
    } finally {
      setSuppression(false)
    }
  }

  return (
    <section className="gw-carte p-5 sm:p-6" aria-label="Billets">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-titre text-lg font-semibold">Catégories de billets</h2>
          <p className="text-sm text-gw-texte-doux dark:text-white/60">
            Le prix le plus bas s&apos;affiche sur le site (« À partir de … »).
          </p>
        </div>
        <Bouton onClick={() => setEdition("nouveau")}>
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter un tarif
        </Bouton>
      </div>

      {billets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gw-lavande px-6 py-10 text-center dark:border-white/15">
          <Ticket className="h-7 w-7 text-gw-violet dark:text-gw-lavande" aria-hidden />
          <p className="text-sm text-gw-texte-doux dark:text-white/60">Aucun tarif. Ajoutez par exemple « Simple » et « VIP ».</p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gw-texte-doux uppercase dark:text-white/55">
                <th className="pb-2 font-medium">Catégorie</th>
                <th className="pb-2 text-right font-medium">Prix</th>
                <th className="pb-2 text-right font-medium">Places</th>
                <th className="pb-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...billets]
                .sort((a, b) => a.prix - b.prix)
                .map((b) => (
                  <tr key={b.id} className="border-t border-gw-bordure dark:border-gw-bordure-sombre">
                    <td className="py-3 font-semibold">{b.nom}</td>
                    <td className="py-3 text-right tabular-nums">{entier.format(b.prix)} Ar</td>
                    <td className="py-3 text-right tabular-nums text-gw-texte-doux dark:text-white/60">
                      {b.quantite_disponible != null ? entier.format(b.quantite_disponible) : "Illimité"}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEdition(b)}
                        aria-label={`Modifier ${b.nom}`}
                        className="rounded-full p-2 text-gw-texte-doux hover:bg-gw-fond hover:text-gw-violet dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimer(b)}
                        aria-label={`Supprimer ${b.nom}`}
                        className="rounded-full p-2 text-gw-texte-doux hover:bg-gw-fond hover:text-red-600 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <ModaleTarif
        key={edition === null ? "ferme" : edition === "nouveau" ? "nouveau" : edition.id}
        evenementId={evenementId}
        tarif={edition}
        onFermer={() => setEdition(null)}
        onEnregistre={async () => {
          await onChangement()
          setEdition(null)
        }}
      />

      <Modale ouverte={aSupprimer !== null} titre="Supprimer ce tarif ?" onFermer={() => setASupprimer(null)}>
        <p className="text-sm text-gw-texte-doux dark:text-white/70">
          La catégorie « {aSupprimer?.nom} » ne sera plus en vente. Si des billets ont déjà été réservés dans cette
          catégorie, la suppression peut être refusée.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setASupprimer(null)}>
            Annuler
          </Bouton>
          <Bouton variante="danger" onClick={supprimer} chargement={suppression}>
            Supprimer
          </Bouton>
        </div>
      </Modale>
    </section>
  )
}

function ModaleTarif({
  evenementId,
  tarif,
  onFermer,
  onEnregistre,
}: {
  evenementId: number
  tarif: CategorieBillet | "nouveau" | null
  onFermer: () => void
  onEnregistre: () => Promise<void>
}) {
  const existant = tarif && tarif !== "nouveau" ? tarif : null
  const [nom, setNom] = useState(existant?.nom ?? "")
  const [prix, setPrix] = useState(existant ? String(existant.prix) : "")
  const [quantite, setQuantite] = useState(existant?.quantite_disponible != null ? String(existant.quantite_disponible) : "")
  const [envoi, setEnvoi] = useState(false)

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    const saisie = { nom: nom.trim(), prix: Number(prix), quantite_disponible: quantite ? Number(quantite) : null }
    try {
      if (existant) await updateCategorieBillet(existant.id, saisie)
      else await createCategorieBillet({ evenement_id: evenementId, ...saisie })
      toast.success(existant ? "Tarif modifié." : "Tarif ajouté.")
      await onEnregistre()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le tarif n'a pas été enregistré.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte={tarif !== null} titre={existant ? "Modifier le tarif" : "Nouveau tarif"} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-4">
        <Champ libelle="Catégorie" requis>
          {(id) => <input id={id} required value={nom} onChange={(e) => setNom(e.target.value)} className={classeChamp} placeholder="Ex. VIP" />}
        </Champ>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Prix (Ar)" requis>
            {(id) => (
              <input id={id} required type="number" min={1} step="any" value={prix} onChange={(e) => setPrix(e.target.value)} className={classeChamp} />
            )}
          </Champ>
          <Champ libelle="Places" aide="Vide = illimité">
            {(id) => <input id={id} type="number" min={0} value={quantite} onChange={(e) => setQuantite(e.target.value)} className={classeChamp} />}
          </Champ>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" chargement={envoi}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}
