"use client"

import { useCatalogue } from "@/lib/use-catalogue"
import { usePropositionsEnVote } from "@/lib/use-propositions"
import { Hero } from "./hero"
import { RangeeCategories } from "./categories"
import { EvenementsAVenir, EvenementsPasses } from "./sections-evenements"
import { PropositionsEmpilees } from "./propositions-empilees"
import { BandeauOrganisateur } from "./bandeau-organisateur"

/**
 * Page d'accueil. Les données sont chargées une seule fois ici,
 * puis partagées entre le hero (listes de la recherche) et les sections.
 */
export function Accueil() {
  const catalogue = useCatalogue()
  const { propositions, chargement } = usePropositionsEnVote(catalogue.aVenir, !catalogue.chargement)

  return (
    <>
      <Hero lieux={catalogue.lieux} categories={catalogue.categories} />
      <RangeeCategories categories={catalogue.categories} />
      <EvenementsAVenir catalogue={catalogue} />
      <PropositionsEmpilees propositions={propositions} chargement={catalogue.chargement || chargement} />
      <EvenementsPasses catalogue={catalogue} />
      <BandeauOrganisateur />
    </>
  )
}
