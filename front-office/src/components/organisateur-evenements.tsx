"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarPlus, ChevronRight, Eye, MapPin, Sparkles, Ticket } from "lucide-react"
import { toast } from "sonner"
import { fetchUserData } from "@/services/auth.service"
import { createEvenement, fetchAllEvenements } from "@/services/evenementService"
import { fetchPropositionsAvecScores } from "@/services/propositionService"
import { fetchCategories, fetchLieux } from "@/services/referentielService"
import type { Categorie, Evenement, Lieu, StatutValidation } from "@/types"
import { cn } from "@/utils"
import { BadgeStatut, Bouton, Modale, STATUTS } from "@/components/organisateur/ui"
import { FormulaireEvenement } from "@/components/organisateur/formulaire-evenement"

/*
 * « Mes événements » : les événements de l'organisateur connecté, filtrables par statut
 * (brouillon, en attente de validation, validé, rejeté), et la création d'un événement.
 * Chaque ligne mène à la fiche de l'événement (informations, propositions, billets).
 */

type Filtre = "tous" | StatutValidation
const FILTRES: Filtre[] = ["tous", "brouillon", "en_attente_validation", "valide", "rejete"]

const entier = new Intl.NumberFormat("fr-FR")

// darkMode est transmis par la mise en page ; les classes dark: suffisent ici
export function OrganisateurEvenements(_props: { darkMode?: boolean }) {
  const router = useRouter()
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [nbPropositions, setNbPropositions] = useState<Map<number, number>>(new Map())
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [filtre, setFiltre] = useState<Filtre>("tous")
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)

  useEffect(() => {
    Promise.allSettled([fetchUserData(), fetchAllEvenements(), fetchLieux(), fetchCategories()])
      .then(async ([u, e, l, c]) => {
        if (e.status === "rejected") {
          setErreur("Impossible de charger vos événements.")
          return
        }
        const moi = u.status === "fulfilled" ? u.value.id : null
        const miens = (moi != null ? e.value.filter((x) => x.organisateur_id === moi) : e.value).sort(
          (a, b) => +new Date(b.date_creation) - +new Date(a.date_creation),
        )
        setEvenements(miens)
        if (l.status === "fulfilled") setLieux(l.value)
        if (c.status === "fulfilled") setCategories(c.value)
        const comptes = await Promise.allSettled(miens.map((x) => fetchPropositionsAvecScores(x.id)))
        setNbPropositions(new Map(comptes.map((r, i) => [miens[i].id, r.status === "fulfilled" ? r.value.length : 0])))
      })
      .finally(() => setChargement(false))
  }, [])

  const compte = useMemo(() => {
    const m = new Map<Filtre, number>([["tous", evenements.length]])
    for (const e of evenements) m.set(e.statut_validation, (m.get(e.statut_validation) ?? 0) + 1)
    return m
  }, [evenements])

  const affiches = filtre === "tous" ? evenements : evenements.filter((e) => e.statut_validation === filtre)
  const lieuxParId = useMemo(() => new Map(lieux.map((l) => [l.id, l])), [lieux])

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Mes événements</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Créez un événement, soumettez des propositions au public, fixez vos tarifs, puis envoyez-le à
            l&apos;administrateur pour validation.
          </p>
        </div>
        <Bouton onClick={() => setCreation(true)}>
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Créer un événement
        </Bouton>
      </div>

      {/* filtres par statut */}
      <div role="tablist" aria-label="Statut" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTRES.map((f) => {
          const actif = f === filtre
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => setFiltre(f)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                actif
                  ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit"
                  : "bg-white text-gw-texte hover:bg-gw-lavande/50 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10",
              )}
            >
              {f === "tous" ? "Tous" : STATUTS[f].libelle}
              <span className={cn("rounded-full px-1.5 text-xs", actif ? "bg-white/20 dark:bg-gw-nuit/15" : "bg-gw-fond dark:bg-white/10")}>
                {compte.get(f) ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {chargement ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70 dark:bg-white/5" />
          ))}
        </div>
      ) : erreur ? (
        <p className="py-16 text-center text-gw-rose-action">{erreur}</p>
      ) : affiches.length === 0 ? (
        <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
          <CalendarPlus className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
          <p className="font-titre text-lg font-semibold">
            {filtre === "tous" ? "Vous n'avez pas encore d'événement" : `Aucun événement « ${STATUTS[filtre as StatutValidation].libelle.toLowerCase()} »`}
          </p>
          {filtre === "tous" && (
            <Bouton onClick={() => setCreation(true)} className="mt-2">
              Créer mon premier événement
            </Bouton>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {affiches.map((e) => {
            const d = new Date(e.date_debut)
            const lieu = e.lieu_id != null ? lieuxParId.get(e.lieu_id) : undefined
            const n = nbPropositions.get(e.id) ?? 0
            return (
              <li key={e.id}>
                <Link
                  href={`/organisateur/evenements/${e.id}`}
                  className="gw-carte group flex items-center gap-4 p-4 transition-shadow hover:ring-1 hover:ring-gw-violet/40 sm:p-5"
                >
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[linear-gradient(160deg,#6C5CE7,#C92A7A)] py-2 text-white">
                    <span className="font-titre text-xl leading-none font-semibold">{d.getDate()}</span>
                    <span className="mt-1 text-[11px] capitalize">
                      {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                    </span>
                    <span className="text-[10px] text-white/75">{d.getFullYear()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-titre truncate text-base font-semibold">{e.titre}</span>
                      <BadgeStatut statut={e.statut_validation} />
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gw-texte-doux dark:text-white/60">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {lieu ? (lieu.ville ? `${lieu.nom}, ${lieu.ville}` : lieu.nom) : "Lieu à définir"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        {n} proposition{n > 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" aria-hidden />
                        {e.prix_a_partir_de != null ? `Dès ${entier.format(e.prix_a_partir_de)} Ar` : "Tarifs à fixer"}
                      </span>
                      {e.statut_validation === "valide" && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          {entier.format(e.nombre_vues ?? 0)} vues
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gw-texte-doux transition-transform group-hover:translate-x-0.5 dark:text-white/50" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Modale ouverte={creation} titre="Créer un événement" onFermer={() => setCreation(false)} large>
        <FormulaireEvenement
          lieux={lieux}
          categories={categories}
          onLieuCree={(l) => setLieux((ls) => [...ls, l])}
          libelleBouton="Créer l'événement"
          onAnnuler={() => setCreation(false)}
          onEnregistrer={async (saisie) => {
            const cree = await createEvenement(saisie)
            toast.success("Événement créé en brouillon. Ajoutez maintenant vos propositions.")
            router.push(`/organisateur/evenements/${cree.id}`)
          }}
        />
      </Modale>
    </div>
  )
}
