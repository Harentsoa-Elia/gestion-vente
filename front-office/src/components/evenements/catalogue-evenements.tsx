"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarX, Search } from "lucide-react"
import { cn } from "@/utils"
import { useCatalogue } from "@/lib/use-catalogue"
import { dansPeriode, PERIODES, type Periode } from "@/lib/evenements"
import { GrilleEvenements } from "./grille-evenements"
import { FiltrePeriode } from "./filtre-periode"

type Onglet = "a-venir" | "passes"
const PAR_PAGE = 12

const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

/**
 * Page /evenements : onglets « À venir » et « Passés », comme les onglets d'Eventbrite.
 * Les filtres vivent dans l'URL (?onglet, q, lieu, categorie, periode) : la recherche du hero
 * y mène directement, et une recherche peut être partagée par lien.
 */
export function CatalogueEvenements() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { aVenir, passes, lieux, categories, lieuxParId, categoriesParId, chargement, erreur } = useCatalogue()

  const onglet: Onglet = params.get("onglet") === "passes" ? "passes" : "a-venir"
  const q = params.get("q") ?? ""
  const lieu = params.get("lieu") ?? ""
  const categorie = params.get("categorie") ?? ""
  const periodeParam = params.get("periode") as Periode | null
  const periode: Periode = PERIODES.some((p) => p.valeur === periodeParam) ? (periodeParam as Periode) : "tout"

  const [saisie, setSaisie] = useState(q)
  const [nbAffiches, setNbAffiches] = useState(PAR_PAGE)

  const majUrl = (changements: Record<string, string | null>) => {
    const suivants = new URLSearchParams(params.toString())
    for (const [cle, valeur] of Object.entries(changements)) {
      if (valeur) suivants.set(cle, valeur)
      else suivants.delete(cle)
    }
    setNbAffiches(PAR_PAGE)
    const chaine = suivants.toString()
    router.replace(chaine ? `${pathname}?${chaine}` : pathname, { scroll: false })
  }

  const filtrer = useMemo(
    () => (liste: typeof aVenir, avecPeriode: boolean) => {
      const terme = normaliser(q.trim())
      return liste.filter((e) => {
        if (terme) {
          const lieuNom = e.lieu_id != null ? lieuxParId.get(e.lieu_id)?.nom ?? "" : ""
          if (!normaliser(`${e.titre} ${e.description} ${lieuNom}`).includes(terme)) return false
        }
        if (lieu && String(e.lieu_id) !== lieu) return false
        if (categorie && String(e.categorie_id) !== categorie) return false
        if (avecPeriode && !dansPeriode(e, periode)) return false
        return true
      })
    },
    [q, lieu, categorie, periode, lieuxParId],
  )

  const resultatsAVenir = filtrer(aVenir, true)
  const resultatsPasses = filtrer(passes, false)
  const resultats = onglet === "a-venir" ? resultatsAVenir : resultatsPasses
  const filtresActifs = Boolean(q || lieu || categorie || (onglet === "a-venir" && periode !== "tout"))

  const onglets = [
    { id: "a-venir" as const, libelle: "À venir", nombre: resultatsAVenir.length },
    { id: "passes" as const, libelle: "Passés", nombre: resultatsPasses.length },
  ]

  const selectClasse =
    "h-11 rounded-full border border-gw-bordure bg-white px-4 text-sm text-gw-nuit focus:border-gw-violet focus:outline-none"

  return (
    <div className="min-h-screen bg-white">
      <div className="scene pt-12 pb-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="font-titre text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Événements</h1>
          <p className="mt-3 max-w-lg text-white/80">
            Concerts, cabarets, sport et soirées : réservez les prochaines dates ou retrouvez celles qui ont eu lieu.
          </p>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              majUrl({ q: saisie.trim() || null })
            }}
            className="mt-8 flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gw-texte-doux" aria-hidden />
              <input
                type="search"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="Artiste, titre, lieu…"
                aria-label="Rechercher un événement"
                className="h-11 w-full rounded-full bg-white pr-4 pl-11 text-sm text-gw-nuit placeholder:text-gw-texte-pale focus:outline-2 focus:outline-gw-rose"
              />
            </div>
            <select
              aria-label="Lieu"
              value={lieu}
              onChange={(e) => majUrl({ lieu: e.target.value || null })}
              className={selectClasse}
            >
              <option value="">Tous les lieux</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.ville ? `${l.nom} (${l.ville})` : l.nom}
                </option>
              ))}
            </select>
            <select
              aria-label="Catégorie"
              value={categorie}
              onChange={(e) => majUrl({ categorie: e.target.value || null })}
              className={selectClasse}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-11 rounded-full bg-gw-violet px-6 text-sm font-semibold text-white transition-colors hover:bg-gw-violet-fonce"
            >
              Rechercher
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* onglets, soulignés comme sur Eventbrite */}
        <div role="tablist" aria-label="Période des événements" className="flex gap-6 border-b border-gw-bordure">
          {onglets.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => majUrl({ onglet: o.id === "passes" ? "passes" : null, periode: null })}
              className={cn(
                "font-titre -mb-px flex items-center gap-2 border-b-[3px] pb-3 text-lg font-semibold transition-colors",
                onglet === o.id ? "border-gw-violet text-gw-nuit" : "border-transparent text-gw-texte-doux hover:text-gw-nuit",
              )}
            >
              {o.libelle}
              {!chargement && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    onglet === o.id ? "bg-gw-violet text-white" : "bg-[#F1EEFB] text-gw-texte-doux",
                  )}
                >
                  {o.nombre}
                </span>
              )}
            </button>
          ))}
        </div>

        {onglet === "a-venir" && (
          <FiltrePeriode valeur={periode} onChange={(p) => majUrl({ periode: p === "tout" ? null : p })} />
        )}

        <div className="mt-8">
          {erreur ? (
            <p className="rounded-xl bg-gw-rose-pale p-6 text-center text-gw-rose-action">{erreur}</p>
          ) : !chargement && resultats.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gw-lavande px-6 py-14 text-center">
              <CalendarX className="h-8 w-8 text-[#B5A8F5]" aria-hidden />
              <p className="font-titre text-lg font-semibold text-gw-nuit">
                {filtresActifs
                  ? "Aucun événement ne correspond à ces critères"
                  : onglet === "a-venir"
                    ? "Aucun événement à venir pour le moment"
                    : "Aucun événement passé"}
              </p>
              {filtresActifs && (
                <button
                  type="button"
                  onClick={() => {
                    setSaisie("")
                    majUrl({ q: null, lieu: null, categorie: null, periode: null })
                  }}
                  className="mt-2 rounded-full border border-gw-violet px-5 py-2.5 text-sm font-semibold text-gw-violet"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <GrilleEvenements
                evenements={resultats.slice(0, nbAffiches)}
                lieuxParId={lieuxParId}
                categoriesParId={categoriesParId}
                variante={onglet === "passes" ? "passe" : "a-venir"}
                chargement={chargement}
                nbSquelettes={8}
              />
              {resultats.length > nbAffiches && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setNbAffiches((n) => n + PAR_PAGE)}
                    className="rounded-full border border-gw-nuit px-6 py-3 text-sm font-semibold text-gw-nuit transition-colors hover:bg-gw-nuit hover:text-white"
                  >
                    Afficher plus d&apos;événements
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
