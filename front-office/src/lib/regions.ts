import type { Lieu } from "@/types"

/*
 * Régions de Madagascar. L'entreprise est installée en Haute Matsiatra (Fianarantsoa) :
 * ses lieux sont proposés en premier et c'est la région par défaut d'un nouveau lieu.
 */

export const REGION_ENTREPRISE = "Haute Matsiatra"

export const REGIONS = [
  "Alaotra-Mangoro",
  "Amoron'i Mania",
  "Analamanga",
  "Analanjirofo",
  "Androy",
  "Anosy",
  "Atsimo-Andrefana",
  "Atsimo-Atsinanana",
  "Atsinanana",
  "Betsiboka",
  "Boeny",
  "Bongolava",
  "Diana",
  "Fitovinany",
  "Haute Matsiatra",
  "Ihorombe",
  "Itasy",
  "Melaky",
  "Menabe",
  "Sava",
  "Sofia",
  "Vakinankaratra",
  "Vatovavy",
]

/** Région d'une grande ville (pour préremplir la région d'un nouveau lieu). */
const REGIONS_PAR_VILLE: Record<string, string> = {
  antananarivo: "Analamanga",
  antsirabe: "Vakinankaratra",
  toamasina: "Atsinanana",
  mahajanga: "Boeny",
  antsiranana: "Diana",
  fianarantsoa: "Haute Matsiatra",
  ambalavao: "Haute Matsiatra",
  ambohimahasoa: "Haute Matsiatra",
  toliara: "Atsimo-Andrefana",
  tolagnaro: "Anosy",
  morondava: "Menabe",
  ambositra: "Amoron'i Mania",
  manakara: "Fitovinany",
  mananjary: "Vatovavy",
  sambava: "Sava",
  "nosy be": "Diana",
}

export function regionDeLaVille(ville: string): string | undefined {
  return REGIONS_PAR_VILLE[ville.trim().toLowerCase()]
}

/** « Fianarantsoa, Haute Matsiatra » (ville et région sans répétition) */
export function villeEtRegion(lieu: Pick<Lieu, "ville" | "region">): string {
  return [lieu.ville, lieu.region].filter(Boolean).join(", ")
}

export const estRegionEntreprise = (lieu: Pick<Lieu, "region">) => lieu.region === REGION_ENTREPRISE
