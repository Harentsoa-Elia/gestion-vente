import type { ModePaiement } from "@/types"

/*
 * Mobile Money à Madagascar. Le paiement est SIMULÉ : le numéro est seulement contrôlé
 * (10 chiffres, préfixe de l'opérateur choisi), comme dans backend/app/services/billetterie_service.py.
 */

export const OPERATEURS: {
  mode: ModePaiement
  nom: string
  prefixes: string[]
  /** pastille de couleur (pas de logo officiel) */
  couleur: string
  texte: string
  exemple: string
}[] = [
  { mode: "mvola", nom: "MVola", prefixes: ["034", "038"], couleur: "#FFCC00", texte: "#1E1A3C", exemple: "034 12 345 67" },
  { mode: "orange_money", nom: "Orange Money", prefixes: ["032", "037"], couleur: "#FF7900", texte: "#1E1A3C", exemple: "032 12 345 67" },
  { mode: "airtel_money", nom: "Airtel Money", prefixes: ["033"], couleur: "#E40000", texte: "#FFFFFF", exemple: "033 12 345 67" },
]

export const operateur = (mode: string | null | undefined) => OPERATEURS.find((o) => o.mode === mode)

/** Plafond technique d'une commande (le vrai plafond, ce sont les places restantes du tarif). */
export const QUANTITE_MAX = 1000

/** '+261 34 12 345 67' -> '0341234567' */
export function normaliserTelephone(valeur: string) {
  let chiffres = valeur.replace(/\D/g, "")
  if (chiffres.startsWith("261")) chiffres = "0" + chiffres.slice(3)
  return chiffres
}

/** Affichage en groupes : 034 12 345 67 */
export function formaterTelephone(valeur: string) {
  const c = normaliserTelephone(valeur).slice(0, 10)
  return [c.slice(0, 3), c.slice(3, 5), c.slice(5, 8), c.slice(8, 10)].filter(Boolean).join(" ")
}

/** Message d'erreur, ou null si le numéro convient à l'opérateur. */
export function erreurTelephone(mode: ModePaiement, valeur: string): string | null {
  const numero = normaliserTelephone(valeur)
  const op = operateur(mode)!
  if (numero.length < 10) return `Saisissez les 10 chiffres du numéro ${op.nom}.`
  if (!/^03[2-8]\d{7}$/.test(numero)) return "Ce numéro n'est pas un numéro mobile malgache."
  if (!op.prefixes.some((p) => numero.startsWith(p)))
    return `Un numéro ${op.nom} commence par ${op.prefixes.join(" ou ")}.`
  return null
}

/** 15000 -> '15 000 Ar', 0 -> 'Gratuit' */
export function ariary(montant: number) {
  if (montant === 0) return "Gratuit"
  return `${Math.round(montant).toLocaleString("fr-FR")} Ar`
}

/** 'Samedi 14 mars 2027 à 19 h 00' */
export function dateEvenement(iso: string) {
  const d = new Date(iso)
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ")
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${heure}`
}

export const pluriel = (n: number, singulier: string, plurielForme = `${singulier}s`) => `${n} ${n > 1 ? plurielForme : singulier}`
