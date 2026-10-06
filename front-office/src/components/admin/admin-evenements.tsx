"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Inbox,
  MapPin,
  Mic2,
  Shapes,
  Ticket,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders } from "@/services/apiConfig"
import {
  fetchAllEvenements,
  fetchCategoriesBilletByEvenement,
  rejeterEvenement,
  validerEvenement,
} from "@/services/evenementService"
import { fetchPropositionsAvecScores } from "@/services/propositionService"
import { fetchCategories, fetchLieux } from "@/services/referentielService"
import type { Categorie, CategorieBillet, Evenement, Lieu, PropositionAvecScore, PropositionType, StatutValidation } from "@/types"
import { cn } from "@/utils"
import { imageTestEvenement, urlMedia } from "@/lib/media"
import { BadgeStatut, Bouton, Modale, STATUTS, classeChamp } from "@/components/organisateur/ui"

/*
 * Administration : validation des événements soumis par les organisateurs.
 * - onglets par statut, « À valider » en premier ;
 * - pour chaque événement : affiche, date, lieu, organisateur, et un détail dépliable
 *   (description, propositions soumises au public, tarifs) avec une liste de points à vérifier ;
 * - Valider (l'événement devient public) ou Rejeter avec un motif : dans les deux cas
 *   l'organisateur est prévenu par e-mail (voir backend evenement_controller).
 */

type Filtre = "en_attente_validation" | "valide" | "rejete" | "brouillon" | "tous"
const FILTRES: { id: Filtre; libelle: string }[] = [
  { id: "en_attente_validation", libelle: "À valider" },
  { id: "valide", libelle: "Validés" },
  { id: "rejete", libelle: "Rejetés" },
  { id: "brouillon", libelle: "En préparation" },
  { id: "tous", libelle: "Tous" },
]

const TYPES: { type: PropositionType; titre: string; singulier: string; pluriel: string; icone: LucideIcon }[] = [
  { type: "LIEU", titre: "Lieux", singulier: "lieu", pluriel: "lieux", icone: MapPin },
  { type: "ARTISTE", titre: "Artistes", singulier: "artiste", pluriel: "artistes", icone: Mic2 },
  { type: "CATEGORIE", titre: "Types d'événement", singulier: "type d'événement", pluriel: "types d'événement", icone: Shapes },
]

const MOTIFS_RAPIDES = [
  "Ajoutez une affiche à l'événement.",
  "Précisez les tarifs des billets.",
  "La description est trop courte : présentez l'événement au public.",
  "La date ou l'heure semble incorrecte.",
  "Proposez au moins deux options par type pour que le vote ait du sens.",
]

interface Organisateur {
  id: number
  fullname: string
  email: string
}

const entier = new Intl.NumberFormat("fr-FR")
const dateLongue = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })

async function fetchOrganisateurs(): Promise<Organisateur[]> {
  const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() })
  if (!res.ok) return []
  return res.json()
}

export function AdminEvenements(_props: { darkMode?: boolean }) {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [lieux, setLieux] = useState<Map<number, Lieu>>(new Map())
  const [categories, setCategories] = useState<Map<number, Categorie>>(new Map())
  const [organisateurs, setOrganisateurs] = useState<Map<number, Organisateur>>(new Map())
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<Filtre>("en_attente_validation")

  const [aValider, setAValider] = useState<Evenement | null>(null)
  const [aRejeter, setARejeter] = useState<Evenement | null>(null)
  const [motif, setMotif] = useState("")
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    try {
      const [evs, ls, cs, us] = await Promise.all([fetchAllEvenements(), fetchLieux(), fetchCategories(), fetchOrganisateurs()])
      setEvenements(evs)
      setLieux(new Map(ls.map((l) => [l.id, l])))
      setCategories(new Map(cs.map((c) => [c.id, c])))
      setOrganisateurs(new Map(us.map((u) => [u.id, u])))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les événements.")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const nombres = useMemo(() => {
    const n: Record<Filtre, number> = { en_attente_validation: 0, valide: 0, rejete: 0, brouillon: 0, tous: evenements.length }
    for (const e of evenements) if (e.statut_validation in n) n[e.statut_validation as Filtre] += 1
    return n
  }, [evenements])

  const affiches = useMemo(() => {
    const liste = filtre === "tous" ? evenements : evenements.filter((e) => e.statut_validation === filtre)
    // à valider : les plus anciennes demandes d'abord ; sinon les prochains événements d'abord
    return [...liste].sort((a, b) =>
      filtre === "en_attente_validation"
        ? +new Date(a.date_creation) - +new Date(b.date_creation)
        : +new Date(a.date_debut) - +new Date(b.date_debut),
    )
  }, [evenements, filtre])

  const remplacer = (ev: Evenement) => setEvenements((liste) => liste.map((e) => (e.id === ev.id ? ev : e)))

  const confirmerValidation = async () => {
    if (!aValider) return
    setEnvoi(true)
    try {
      remplacer(await validerEvenement(aValider.id))
      toast.success(`« ${aValider.titre} » est validé : il est visible sur le site. L'organisateur est prévenu par e-mail.`)
      setAValider(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La validation a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  const confirmerRejet = async () => {
    if (!aRejeter || motif.trim().length < 5) return
    setEnvoi(true)
    try {
      remplacer(await rejeterEvenement(aRejeter.id, motif.trim()))
      toast.success(`« ${aRejeter.titre} » est renvoyé à l'organisateur, avec votre motif.`)
      setARejeter(null)
      setMotif("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le rejet a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-titre text-2xl font-semibold">Validation des événements</h1>
        <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/60">
          Les organisateurs vous soumettent leurs événements. Une fois validé, un événement apparaît sur le site public et la
          billetterie ouvre. En cas de refus, expliquez ce qu&apos;il faut corriger : l&apos;organisateur reçoit votre motif par e-mail.
        </p>
      </div>

      {/* onglets par statut */}
      <div role="tablist" aria-label="Statut" className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
        {FILTRES.map(({ id, libelle }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filtre === id}
            onClick={() => setFiltre(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              filtre === id
                ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit"
                : "bg-white text-gw-texte-doux ring-1 ring-gw-bordure hover:text-gw-nuit dark:bg-white/5 dark:text-white/65 dark:ring-white/10 dark:hover:text-white",
            )}
          >
            {libelle}
            <span
              className={cn(
                "min-w-6 rounded-full px-1.5 text-xs",
                id === "en_attente_validation" && nombres[id] > 0
                  ? "bg-gw-rose-action text-white"
                  : filtre === id
                    ? "bg-white/20"
                    : "bg-gw-fond dark:bg-white/10",
              )}
            >
              {nombres[id]}
            </span>
          </button>
        ))}
      </div>

      {erreur ? (
        <p role="alert" className="rounded-2xl bg-gw-rose-pale p-5 text-sm text-gw-rose-action">
          {erreur}
        </p>
      ) : chargement ? (
        <div className="space-y-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="gw-carte h-36 animate-pulse" />
          ))}
        </div>
      ) : affiches.length === 0 ? (
        <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gw-fond text-gw-violet dark:bg-white/10 dark:text-gw-lavande">
            <Inbox className="h-7 w-7" aria-hidden />
          </span>
          <p className="font-titre text-lg font-semibold">
            {filtre === "en_attente_validation" ? "Aucun événement à valider" : "Aucun événement ici"}
          </p>
          <p className="max-w-sm text-sm text-gw-texte-doux dark:text-white/60">
            {filtre === "en_attente_validation"
              ? "Quand un organisateur soumettra un événement, il apparaîtra ici."
              : "Changez d'onglet pour voir les autres événements."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {affiches.map((ev) => (
            <CarteAValider
              key={ev.id}
              evenement={ev}
              lieu={ev.lieu_id != null ? lieux.get(ev.lieu_id) : undefined}
              categorie={ev.categorie_id != null ? categories.get(ev.categorie_id) : undefined}
              organisateur={organisateurs.get(ev.organisateur_id)}
              onValider={() => setAValider(ev)}
              onRejeter={() => {
                setMotif("")
                setARejeter(ev)
              }}
            />
          ))}
        </ul>
      )}

      {/* confirmation de validation */}
      <Modale ouverte={aValider !== null} titre="Valider l'événement ?" onFermer={() => setAValider(null)}>
        <p className="text-sm text-gw-texte-doux dark:text-white/70">
          « {aValider?.titre} » apparaîtra sur le site public et le public pourra réserver ses billets. L&apos;organisateur sera
          prévenu par e-mail.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setAValider(null)}>
            Annuler
          </Bouton>
          <Bouton onClick={confirmerValidation} chargement={envoi} className="bg-emerald-600 hover:bg-emerald-700">
            <Check className="h-4 w-4" aria-hidden />
            Valider et publier
          </Bouton>
        </div>
      </Modale>

      {/* rejet avec motif */}
      <Modale ouverte={aRejeter !== null} titre="Rejeter l'événement" onFermer={() => setARejeter(null)} large>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            confirmerRejet()
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gw-texte-doux dark:text-white/70">
            « {aRejeter?.titre} » retournera à l&apos;organisateur, qui pourra le corriger et vous le soumettre à nouveau. Il recevra
            ce motif par e-mail et le verra dans sa fiche.
          </p>
          <div>
            <label htmlFor="motif-rejet" className="mb-1.5 block text-sm font-semibold">
              Ce qu&apos;il faut corriger <span className="text-gw-rose-action">*</span>
            </label>
            <textarea
              id="motif-rejet"
              rows={4}
              required
              minLength={5}
              maxLength={1000}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className={classeChamp}
              placeholder="Ex. Ajoutez une affiche et précisez les tarifs des billets."
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-gw-texte-doux dark:text-white/60">Ajouter une remarque fréquente :</p>
            <div className="flex flex-wrap gap-2">
              {MOTIFS_RAPIDES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif((actuel) => (actuel.includes(m) ? actuel : `${actuel.trim()} ${m}`.trim()))}
                  className="rounded-full bg-gw-fond px-3 py-1.5 text-xs font-medium text-gw-nuit hover:bg-gw-lavande/60 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  + {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Bouton type="button" variante="discret" onClick={() => setARejeter(null)}>
              Annuler
            </Bouton>
            <Bouton type="submit" variante="danger" chargement={envoi} disabled={motif.trim().length < 5}>
              <XCircle className="h-4 w-4" aria-hidden />
              Rejeter et prévenir l&apos;organisateur
            </Bouton>
          </div>
        </form>
      </Modale>
    </div>
  )
}

/* ---------- une carte d'événement ---------- */

function CarteAValider({
  evenement: ev,
  lieu,
  categorie,
  organisateur,
  onValider,
  onRejeter,
}: {
  evenement: Evenement
  lieu?: Lieu
  categorie?: Categorie
  organisateur?: Organisateur
  onValider: () => void
  onRejeter: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [details, setDetails] = useState<{ propositions: PropositionAvecScore[]; tarifs: CategorieBillet[] } | null>(null)
  const enAttente = ev.statut_validation === "en_attente_validation"
  const statut = (ev.statut_validation in STATUTS ? ev.statut_validation : "brouillon") as StatutValidation
  const idDetail = `detail-${ev.id}`

  // le détail est chargé à la première ouverture (et d'office pour les événements à valider)
  useEffect(() => {
    if ((!ouvert && !enAttente) || details) return
    Promise.all([fetchPropositionsAvecScores(ev.id).catch(() => []), fetchCategoriesBilletByEvenement(ev.id).catch(() => [])]).then(
      ([propositions, tarifs]) => setDetails({ propositions, tarifs }),
    )
  }, [ouvert, enAttente, details, ev.id])

  const parType = (t: PropositionType) => details?.propositions.filter((p) => p.type === t) ?? []

  // points à vérifier avant de valider
  const verifications = details
    ? [
        { ok: !!ev.image_url, texte: ev.image_url ? "Affiche ajoutée" : "Pas d'affiche" },
        { ok: ev.description.trim().length >= 40, texte: ev.description.trim().length >= 40 ? "Description détaillée" : "Description très courte" },
        { ok: details.tarifs.length > 0, texte: details.tarifs.length > 0 ? "Tarifs définis" : "Aucun tarif" },
        { ok: new Date(ev.date_debut) > new Date(), texte: new Date(ev.date_debut) > new Date() ? "Date à venir" : "Date déjà passée" },
        ...TYPES.map(({ type, singulier, pluriel }) => {
          const n = parType(type).length
          const texte = n === 0 ? `Aucun ${singulier} soumis au vote` : `${n} ${n > 1 ? pluriel : singulier} soumis au vote`
          return { ok: n >= 2, texte: n >= 2 ? texte : `${texte} (2 conseillés)` }
        }),
      ]
    : []
  const aRevoir = verifications.filter((v) => !v.ok).length

  return (
    <li className="gw-carte overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="relative w-full shrink-0 self-start sm:w-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlMedia(ev.image_url) ?? imageTestEvenement(ev)} alt="" className="block aspect-[2/1] w-full rounded-xl object-cover" />
          {!ev.image_url && (
            // sans affiche de l'organisateur, le site montre une image de test : on le signale à l'administrateur
            <span className="absolute bottom-2 left-2 rounded-full bg-gw-nuit/75 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              Image de test
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-titre text-lg font-semibold">{ev.titre}</h2>
            <BadgeStatut statut={statut} />
            {!ev.image_url && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/30">
                Sans affiche
              </span>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-sm text-gw-texte-doux dark:text-white/65">
            <li className="flex items-center gap-2 first-letter:uppercase">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <span className="first-letter:uppercase">{dateLongue(ev.date_debut)}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {lieu ? [lieu.nom, lieu.ville].filter(Boolean).join(", ") : "Lieu à définir (soumis au vote)"}
              {categorie && <span className="text-gw-texte-doux/80">· {categorie.nom}</span>}
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden />
              {organisateur ? (
                <span>
                  {organisateur.fullname} <span className="text-gw-texte-doux/80">({organisateur.email})</span>
                </span>
              ) : (
                `Organisateur n° ${ev.organisateur_id}`
              )}
            </li>
          </ul>
          {statut === "rejete" && ev.motif_rejet && (
            <p className="mt-3 rounded-xl bg-gw-rose-pale px-3 py-2 text-sm text-gw-rose-action dark:bg-gw-rose/15 dark:text-pink-200">
              <span className="font-semibold">Motif du rejet :</span> {ev.motif_rejet}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap items-start gap-2 sm:flex-col sm:items-stretch">
          {enAttente && (
            <>
              <Bouton onClick={onValider} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Valider
              </Bouton>
              <Bouton variante="secondaire" onClick={onRejeter}>
                <XCircle className="h-4 w-4" aria-hidden />
                Rejeter
              </Bouton>
            </>
          )}
          {statut === "valide" && (
            <Link
              href={`/evenements/${ev.id}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gw-violet/40 px-4 py-2.5 text-sm font-semibold text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white dark:hover:bg-white/10"
            >
              Page publique <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-controls={idDetail}
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-gw-texte-doux hover:bg-gw-fond hover:text-gw-nuit dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {ouvert ? "Masquer le détail" : "Voir le détail"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", ouvert && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      {/* résumé des vérifications, visible sans déplier pour les événements à valider */}
      {enAttente && details && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gw-bordure px-5 py-3 text-xs dark:border-gw-bordure-sombre">
          <span className={cn("flex items-center gap-1.5 font-semibold", aRevoir ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
            {aRevoir ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            {aRevoir ? `${aRevoir} point${aRevoir > 1 ? "s" : ""} à vérifier` : "Tout est complet"}
          </span>
          {verifications.map((v) => (
            <span key={v.texte} className={cn("flex items-center gap-1", v.ok ? "text-gw-texte-doux dark:text-white/55" : "text-amber-700 dark:text-amber-300")}>
              {v.ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
              {v.texte}
            </span>
          ))}
        </div>
      )}

      {ouvert && (
        <div id={idDetail} className="grid gap-6 border-t border-gw-bordure bg-gw-fond/60 p-5 lg:grid-cols-[1.2fr_1fr] dark:border-gw-bordure-sombre dark:bg-white/[0.03]">
          <div className="space-y-5">
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-gw-texte-doux uppercase dark:text-white/55">Description</h3>
              <p className="mt-1.5 text-sm whitespace-pre-line">{ev.description}</p>
              {ev.capacite ? (
                <p className="mt-2 text-sm text-gw-texte-doux dark:text-white/60">Capacité : {entier.format(ev.capacite)} places</p>
              ) : null}
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gw-texte-doux uppercase dark:text-white/55">
                <Ticket className="h-4 w-4" aria-hidden /> Tarifs
              </h3>
              {!details ? (
                <p className="mt-1.5 text-sm text-gw-texte-doux">Chargement…</p>
              ) : details.tarifs.length === 0 ? (
                <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">Aucun tarif défini.</p>
              ) : (
                <ul className="mt-1.5 divide-y divide-gw-bordure rounded-xl bg-white text-sm dark:divide-gw-bordure-sombre dark:bg-white/5">
                  {details.tarifs.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium">{t.nom}</span>
                      <span>
                        {entier.format(t.prix)} Ar
                        {t.quantite_disponible != null && (
                          <span className="ml-2 text-gw-texte-doux dark:text-white/55">· {entier.format(t.quantite_disponible)} places</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-gw-texte-doux uppercase dark:text-white/55">Propositions soumises au public</h3>
            {!details ? (
              <p className="mt-1.5 text-sm text-gw-texte-doux">Chargement…</p>
            ) : (
              <div className="mt-1.5 space-y-3">
                {TYPES.map(({ type, titre, icone: Icone }) => {
                  const liste = parType(type)
                  return (
                    <div key={type} className="rounded-xl bg-white p-3 dark:bg-white/5">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Icone className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden />
                        {titre}
                        <span className="text-xs font-normal text-gw-texte-doux dark:text-white/55">({liste.length})</span>
                      </p>
                      {liste.length === 0 ? (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Aucune proposition.</p>
                      ) : (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {liste.map((p) => (
                            <li key={p.id} className="rounded-full bg-gw-fond px-2.5 py-1 text-xs dark:bg-white/10">
                              {p.libelle}
                              <span className="ml-1 text-gw-texte-doux dark:text-white/55">· {entier.format(p.score)} pt</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </li>
  )
}
