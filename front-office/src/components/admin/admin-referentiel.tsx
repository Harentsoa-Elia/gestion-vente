"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Mic2, Pencil, Plus, Search, Shapes, Trash2, type LucideIcon } from "lucide-react"
import type { Artiste, Categorie, ElementReferentiel, Lieu, Referentiel, TableReferentiel } from "@/types"
import { cn } from "@/utils"
import { enregistrerElementReferentiel, fetchReferentielAdmin, supprimerElementReferentiel } from "@/services/administrationService"
import { fetchArtistes, fetchCategories, fetchLieux } from "@/services/referentielService"
import { REGION_ENTREPRISE, REGIONS, regionDeLaVille } from "@/lib/regions"
import { Bouton, Champ, Modale, classeChamp } from "@/components/organisateur/ui"

/*
 * Référentiel (administrateur) : types d'événement, lieux et artistes proposés aux organisateurs.
 * Ajout et modification ; suppression seulement si l'élément n'est utilisé par aucun événement,
 * proposition ou recommandation (sinon le serveur refuse avec une explication).
 */

const ONGLETS: { cle: TableReferentiel; libelle: string; singulier: string; icone: LucideIcon }[] = [
  { cle: "categories", libelle: "Types d'événement", singulier: "type d'événement", icone: Shapes },
  { cle: "lieux", libelle: "Lieux", singulier: "lieu", icone: MapPin },
  { cle: "artistes", libelle: "Artistes", singulier: "artiste", icone: Mic2 },
]

const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
type Complet = Categorie | Lieu | Artiste

interface Formulaire {
  nom: string
  description: string
  adresse: string
  ville: string
  region: string
  capacite: string
  genre: string
}

const VIDE: Formulaire = { nom: "", description: "", adresse: "", ville: "", region: REGION_ENTREPRISE, capacite: "", genre: "" }

function ModaleElement({
  table,
  element,
  ouverte,
  onFermer,
  onEnregistre,
}: {
  table: TableReferentiel
  element: Complet | null
  ouverte: boolean
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [f, setF] = useState<Formulaire>(VIDE)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState("")
  const onglet = ONGLETS.find((o) => o.cle === table)!

  useEffect(() => {
    if (!ouverte) return
    setErreur("")
    if (!element) return setF({ ...VIDE, region: table === "lieux" ? REGION_ENTREPRISE : "" })
    const e = element as Partial<Categorie & Lieu & Artiste>
    setF({
      nom: e.nom ?? "",
      description: e.description ?? "",
      adresse: e.adresse ?? "",
      ville: e.ville ?? "",
      region: e.region ?? "",
      capacite: e.capacite ? String(e.capacite) : "",
      genre: e.genre_artistique ?? "",
    })
  }, [ouverte, element, table])

  const maj = (champ: keyof Formulaire) => (valeur: string) => setF((x) => ({ ...x, [champ]: valeur }))
  const ouNull = (s: string) => s.trim() || null

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur("")
    const saisie =
      table === "categories"
        ? { nom: f.nom.trim(), description: ouNull(f.description) }
        : table === "lieux"
          ? { nom: f.nom.trim(), adresse: ouNull(f.adresse), ville: ouNull(f.ville), region: ouNull(f.region), capacite: f.capacite ? Number(f.capacite) : null }
          : { nom: f.nom.trim(), genre_artistique: ouNull(f.genre), description: ouNull(f.description) }
    try {
      const r = await enregistrerElementReferentiel(table, element?.id ?? null, saisie)
      toast.success(element ? `« ${r.nom} » modifié.` : `« ${r.nom} » ajouté.`)
      onEnregistre()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "L'enregistrement a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte={ouverte} titre={element ? `Modifier « ${element.nom} »` : `Ajouter un ${onglet.singulier}`} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-4">
        <Champ libelle="Nom" requis>
          {(id) => <input id={id} required value={f.nom} onChange={(e) => maj("nom")(e.target.value)} className={classeChamp} />}
        </Champ>
        {table === "lieux" && (
          <>
            <Champ libelle="Adresse ou quartier">
              {(id) => <input id={id} value={f.adresse} onChange={(e) => maj("adresse")(e.target.value)} className={classeChamp} placeholder="Ex. Ampasambazaha" />}
            </Champ>
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ libelle="Ville">
                {(id) => (
                  <input
                    id={id}
                    value={f.ville}
                    onChange={(e) => {
                      maj("ville")(e.target.value)
                      const r = regionDeLaVille(e.target.value)
                      if (r) maj("region")(r)
                    }}
                    className={classeChamp}
                    placeholder="Ex. Fianarantsoa"
                  />
                )}
              </Champ>
              <Champ libelle="Région">
                {(id) => (
                  <>
                    <input id={id} list="regions-madagascar" value={f.region} onChange={(e) => maj("region")(e.target.value)} className={classeChamp} />
                    <datalist id="regions-madagascar">
                      {REGIONS.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </>
                )}
              </Champ>
            </div>
            <Champ libelle="Capacité" aide="Nombre de places : sert au taux de remplissage et à la participation estimée.">
              {(id) => <input id={id} type="number" min={1} value={f.capacite} onChange={(e) => maj("capacite")(e.target.value)} className={classeChamp} />}
            </Champ>
          </>
        )}
        {table === "artistes" && (
          <Champ libelle="Genre artistique">
            {(id) => <input id={id} value={f.genre} onChange={(e) => maj("genre")(e.target.value)} className={classeChamp} placeholder="Ex. Salegy, Variétés, Jazz" />}
          </Champ>
        )}
        {table !== "lieux" && (
          <Champ libelle="Description">
            {(id) => <textarea id={id} rows={3} value={f.description} onChange={(e) => maj("description")(e.target.value)} className={classeChamp} />}
          </Champ>
        )}
        {erreur && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" chargement={envoi} disabled={!f.nom.trim()}>
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

export function AdminReferentiel() {
  const [table, setTable] = useState<TableReferentiel>("categories")
  const [ref, setRef] = useState<Referentiel | null>(null)
  const [complets, setComplets] = useState<Record<TableReferentiel, Map<number, Complet>>>({ categories: new Map(), lieux: new Map(), artistes: new Map() })
  const [recherche, setRecherche] = useState("")
  const [edition, setEdition] = useState<{ element: Complet | null } | null>(null)
  const [aSupprimer, setASupprimer] = useState<ElementReferentiel | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(() => {
    Promise.allSettled([fetchReferentielAdmin(), fetchCategories(), fetchLieux(), fetchArtistes()]).then(([r, c, l, a]) => {
      if (r.status === "fulfilled") setRef(r.value)
      else toast.error(r.reason instanceof Error ? r.reason.message : "Chargement impossible.")
      const carte = <T extends Complet>(x: PromiseSettledResult<T[]>) => new Map(x.status === "fulfilled" ? x.value.map((e) => [e.id, e] as [number, Complet]) : [])
      setComplets({ categories: carte(c), lieux: carte(l), artistes: carte(a) })
    })
  }, [])
  useEffect(charger, [charger])

  const terme = normaliser(recherche.trim())
  const elements = useMemo(
    () => (ref?.[table] ?? []).filter((e) => !terme || normaliser(`${e.nom} ${e.detail ?? ""}`).includes(terme)),
    [ref, table, terme],
  )
  const onglet = ONGLETS.find((o) => o.cle === table)!

  const supprimer = async () => {
    if (!aSupprimer) return
    setEnvoi(true)
    try {
      const r = await supprimerElementReferentiel(table, aSupprimer.id)
      toast.success(r.message)
      setASupprimer(null)
      charger()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La suppression a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Référentiel</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Types d&apos;événement, lieux et artistes que les organisateurs choisissent et soumettent au vote du public.
          </p>
        </div>
        <Bouton onClick={() => setEdition({ element: null })}>
          <Plus className="h-4 w-4" aria-hidden /> Ajouter un {onglet.singulier}
        </Bouton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Référentiel" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {ONGLETS.map(({ cle, libelle, icone: Icone }) => (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={table === cle}
              onClick={() => {
                setTable(cle)
                setRecherche("")
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                table === cle ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit" : "bg-white text-gw-texte hover:bg-gw-lavande/50 dark:bg-white/5 dark:text-white/75",
              )}
            >
              <Icone className="h-4 w-4" aria-hidden /> {libelle}
              <span className="opacity-70">{ref?.[cle].length ?? ""}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gw-texte-pale" aria-hidden />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={table === "lieux" ? "Nom, ville, région…" : "Rechercher…"} className={cn(classeChamp, "pl-9")} />
        </label>
      </div>

      {!ref ? (
        <p className="flex items-center gap-2 py-10 text-gw-texte-doux dark:text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
        </p>
      ) : (
        <ul className="gw-carte divide-y divide-gw-bordure dark:divide-white/10">
          {elements.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.nom}</p>
                {e.detail && <p className="truncate text-xs text-gw-texte-doux dark:text-white/55">{e.detail}</p>}
              </div>
              <span
                className={cn(
                  "hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex",
                  e.utilisations ? "bg-gw-lavande/60 text-gw-nuit dark:bg-white/10 dark:text-white" : "bg-gw-fond text-gw-texte-doux dark:bg-white/5 dark:text-white/55",
                )}
              >
                {e.utilisations ? `Utilisé ${e.utilisations} fois` : "Pas encore utilisé"}
              </span>
              <button
                type="button"
                onClick={() => setEdition({ element: complets[table].get(e.id) ?? ({ id: e.id, nom: e.nom } as Complet) })}
                aria-label={`Modifier ${e.nom}`}
                title="Modifier"
                className="rounded-full p-2 text-gw-violet hover:bg-gw-fond dark:text-gw-lavande dark:hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setASupprimer(e)}
                disabled={e.utilisations > 0}
                aria-label={`Supprimer ${e.nom}`}
                title={e.utilisations > 0 ? "Utilisé par des événements ou des propositions : suppression impossible" : "Supprimer"}
                className="rounded-full p-2 text-gw-texte-doux hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/55 dark:hover:bg-red-400/10"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
          {elements.length === 0 && <li className="px-5 py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucun élément ne correspond.</li>}
        </ul>
      )}

      <ModaleElement
        table={table}
        element={edition?.element ?? null}
        ouverte={!!edition}
        onFermer={() => setEdition(null)}
        onEnregistre={() => {
          setEdition(null)
          charger()
        }}
      />

      <Modale ouverte={!!aSupprimer} titre={`Supprimer « ${aSupprimer?.nom ?? ""} » ?`} onFermer={() => setASupprimer(null)}>
        <p className="text-sm text-gw-texte dark:text-white/75">Il ne sera plus proposé aux organisateurs. Cette action est définitive.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setASupprimer(null)}>
            Annuler
          </Bouton>
          <Bouton variante="danger" chargement={envoi} onClick={supprimer}>
            Supprimer
          </Bouton>
        </div>
      </Modale>
    </div>
  )
}
