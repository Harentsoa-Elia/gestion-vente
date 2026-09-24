"use client"

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Loader2, Plus, Search } from "lucide-react"
import { cn } from "@/utils"
import { classeChamp } from "./ui"

/*
 * Champ de recherche avec suggestions (combobox accessible).
 * Un clic sur une suggestion (ou Entrée) la choisit immédiatement : pas de bouton
 * « Ajouter » à part. Si le texte saisi ne correspond à aucune option, une dernière
 * ligne propose de créer l'élément (onCreer).
 */

export interface OptionRecherche {
  id: number
  nom: string
  detail?: string
}

const MAX_AFFICHEES = 60

/** Minuscules sans accents : « Samoëla » est trouvé en tapant « samoela ». */
const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function SelecteurRecherche({
  options,
  libelle,
  placeholder,
  onChoisir,
  onCreer,
  libelleCreer,
  occupe,
  vide,
}: {
  options: OptionRecherche[]
  /** Nom accessible du champ, ex. « Ajouter un artiste » */
  libelle: string
  placeholder: string
  onChoisir: (option: OptionRecherche) => void
  /** Création d'un élément absent de la liste, à partir du texte saisi */
  onCreer?: (texte: string) => void
  /** Ex. (t) => `Créer l'artiste « ${t} »` */
  libelleCreer?: (texte: string) => string
  /** Ajout en cours : le champ est désactivé et affiche un indicateur */
  occupe?: boolean
  /** Message quand toutes les options sont déjà proposées */
  vide?: string
}) {
  const [texte, setTexte] = useState("")
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(0)
  const zone = useRef<HTMLDivElement>(null)
  const liste = useRef<HTMLUListElement>(null)
  const idListe = useId()
  const idChamp = useId()

  const terme = normaliser(texte.trim())
  const correspondantes = useMemo(() => {
    const triees = [...options].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    if (!terme) return triees
    // d'abord les noms qui commencent par le texte, puis ceux qui le contiennent
    const debut: OptionRecherche[] = []
    const contient: OptionRecherche[] = []
    for (const o of triees) {
      const nom = normaliser(o.nom)
      if (nom.startsWith(terme)) debut.push(o)
      else if (nom.includes(terme) || normaliser(o.detail ?? "").includes(terme)) contient.push(o)
    }
    return [...debut, ...contient]
  }, [options, terme])

  const affichees = correspondantes.slice(0, MAX_AFFICHEES)
  const existeDeja = options.some((o) => normaliser(o.nom) === terme)
  const peutCreer = Boolean(onCreer && terme && !existeDeja)
  const total = affichees.length + (peutCreer ? 1 : 0)

  useEffect(() => setActif(0), [terme])

  // fermer en cliquant ailleurs
  useEffect(() => {
    if (!ouvert) return
    const ailleurs = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener("pointerdown", ailleurs)
    return () => document.removeEventListener("pointerdown", ailleurs)
  }, [ouvert])

  // garder la ligne active visible pendant la navigation au clavier
  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-index="${actif}"]`)?.scrollIntoView({ block: "nearest" })
  }, [actif])

  const valider = (index: number) => {
    if (index < affichees.length) onChoisir(affichees[index])
    else if (peutCreer && onCreer) onCreer(texte.trim())
    else return
    setTexte("")
    setOuvert(false)
  }

  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOuvert(true)
      setActif((i) => (total ? (i + 1) % total : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setOuvert(true)
      setActif((i) => (total ? (i - 1 + total) % total : 0))
    } else if (e.key === "Enter") {
      if (ouvert && total > 0) {
        e.preventDefault()
        valider(actif)
      }
    } else if (e.key === "Escape") {
      setOuvert(false)
    }
  }

  const aucuneOption = options.length === 0

  return (
    <div ref={zone} className="relative">
      <label htmlFor={idChamp} className="sr-only">
        {libelle}
      </label>
      <div className="relative">
        {occupe ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-gw-violet" aria-hidden />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gw-texte-doux dark:text-white/50" aria-hidden />
        )}
        <input
          id={idChamp}
          type="text"
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={ouvert && total > 0 ? `${idListe}-${actif}` : undefined}
          autoComplete="off"
          disabled={occupe}
          value={texte}
          placeholder={aucuneOption && !onCreer ? vide : placeholder}
          onChange={(e) => {
            setTexte(e.target.value)
            setOuvert(true)
          }}
          onFocus={() => setOuvert(true)}
          onClick={() => setOuvert(true)}
          onKeyDown={touche}
          className={cn(classeChamp, "pl-10")}
        />
      </div>

      {ouvert && !occupe && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-gw-bordure bg-white shadow-[0_18px_40px_-16px_rgba(30,26,60,0.45)] dark:border-gw-bordure-sombre dark:bg-gw-carte-sombre">
          <ul ref={liste} id={idListe} role="listbox" aria-label={libelle} className="max-h-64 overflow-y-auto py-1.5">
            {affichees.map((o, i) => (
              <li
                key={o.id}
                id={`${idListe}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === actif}
                aria-label={o.detail ? `${o.nom}, ${o.detail}` : o.nom}
                // mousedown : choisir avant que le champ ne perde le focus
                onMouseDown={(e) => {
                  e.preventDefault()
                  valider(i)
                }}
                onMouseEnter={() => setActif(i)}
                className={cn(
                  "cursor-pointer px-3.5 py-2 text-sm",
                  i === actif ? "bg-gw-fond text-gw-nuit dark:bg-white/10 dark:text-white" : "text-gw-nuit dark:text-white/90",
                )}
              >
                <span className="font-semibold">{o.nom}</span>
                {o.detail && <span className="ml-1.5 text-xs text-gw-texte-doux dark:text-white/55">{o.detail}</span>}
              </li>
            ))}

            {peutCreer && (
              <li
                id={`${idListe}-${affichees.length}`}
                data-index={affichees.length}
                role="option"
                aria-selected={actif === affichees.length}
                onMouseDown={(e) => {
                  e.preventDefault()
                  valider(affichees.length)
                }}
                onMouseEnter={() => setActif(affichees.length)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 border-t border-gw-bordure px-3.5 py-2.5 text-sm font-semibold text-gw-violet dark:border-gw-bordure-sombre dark:text-gw-lavande",
                  actif === affichees.length && "bg-gw-fond dark:bg-white/10",
                )}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                {libelleCreer ? libelleCreer(texte.trim()) : `Créer « ${texte.trim()} »`}
              </li>
            )}

            {total === 0 && (
              <li className="px-3.5 py-3 text-sm text-gw-texte-doux dark:text-white/55">
                {aucuneOption ? vide ?? "Aucune option disponible." : "Aucun résultat."}
              </li>
            )}
          </ul>
          {correspondantes.length > MAX_AFFICHEES && (
            <p className="border-t border-gw-bordure px-3.5 py-2 text-xs text-gw-texte-doux dark:border-gw-bordure-sombre dark:text-white/55">
              {correspondantes.length} résultats : tapez quelques lettres pour affiner.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
