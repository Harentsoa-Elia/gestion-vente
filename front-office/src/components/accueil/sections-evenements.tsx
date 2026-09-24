"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarX } from "lucide-react"
import type { Catalogue } from "@/lib/use-catalogue"
import { dansPeriode, PERIODES, type Periode } from "@/lib/evenements"
import { GrilleEvenements } from "@/components/evenements/grille-evenements"
import { FiltrePeriode } from "@/components/evenements/filtre-periode"
import { TitreSection } from "./titre-section"

const NB_A_VENIR = 8
const NB_PASSES = 4

export function EvenementsAVenir({ catalogue }: { catalogue: Catalogue }) {
  const { aVenir, lieuxParId, categoriesParId, chargement, erreur } = catalogue
  const [periode, setPeriode] = useState<Periode>("tout")
  const filtres = aVenir.filter((e) => dansPeriode(e, periode)).slice(0, NB_A_VENIR)
  const libellePeriode = PERIODES.find((p) => p.valeur === periode)?.libelle.toLowerCase()

  return (
    <section aria-labelledby="a-venir-titre" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <TitreSection
        id="a-venir-titre"
        titre="Événements à venir"
        lien={{ href: "/evenements", libelle: "Voir tous les événements" }}
      >
        <FiltrePeriode valeur={periode} onChange={setPeriode} />
      </TitreSection>

      {erreur ? (
        <p className="rounded-xl bg-gw-rose-pale p-6 text-center text-gw-rose-action">{erreur}</p>
      ) : !chargement && filtres.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gw-lavande px-6 py-12 text-center">
          <CalendarX className="h-8 w-8 text-[#B5A8F5]" aria-hidden />
          <p className="font-titre text-lg font-semibold text-gw-nuit">
            {periode === "tout" ? "Aucun événement à venir pour le moment" : `Rien de prévu ${libellePeriode}`}
          </p>
          <p className="max-w-md text-sm text-gw-texte-doux">
            {periode === "tout"
              ? "Créez un compte pour être prévenu dès qu'une billetterie ouvre."
              : "Essayez une autre période, ou affichez toutes les dates."}
          </p>
          {periode === "tout" ? (
            <Link
              href="/participants/signup"
              className="mt-2 rounded-full bg-gw-rose-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-gw-rose-action-fonce"
            >
              Créer mon compte
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setPeriode("tout")}
              className="mt-2 rounded-full border border-gw-violet px-5 py-2.5 text-sm font-semibold text-gw-violet"
            >
              Afficher toutes les dates
            </button>
          )}
        </div>
      ) : (
        <GrilleEvenements
          evenements={filtres}
          lieuxParId={lieuxParId}
          categoriesParId={categoriesParId}
          chargement={chargement}
        />
      )}
    </section>
  )
}

export function EvenementsPasses({ catalogue }: { catalogue: Catalogue }) {
  const { passes, lieuxParId, categoriesParId, chargement, erreur } = catalogue
  if (erreur || (!chargement && passes.length === 0)) return null

  return (
    <section aria-labelledby="passes-titre" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <TitreSection
        id="passes-titre"
        titre="Événements passés"
        description="Ils ont eu lieu sur la plateforme. Retrouvez leurs informations et vos billets."
        lien={{ href: "/evenements?onglet=passes", libelle: "Voir les archives" }}
      />
      <GrilleEvenements
        evenements={passes.slice(0, NB_PASSES)}
        lieuxParId={lieuxParId}
        categoriesParId={categoriesParId}
        variante="passe"
        chargement={chargement}
      />
    </section>
  )
}
