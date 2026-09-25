import { API_BASE_URL } from "@/services/apiConfig"
import type { PropositionType } from "@/types"

/*
 * Images envoyées par les organisateurs (affiches d'événements, visuels des propositions)
 * et images de test affichées tant qu'aucune image n'a été ajoutée.
 */

/** Serveur de l'API sans /api/v1 : les images y sont servies sous /media/... */
const ORIGINE_API = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "")

/** URL affichable d'une image de l'API (chemin /media/... ou URL complète), null si absente. */
export function urlMedia(chemin: string | null | undefined): string | null {
  if (!chemin) return null
  if (/^(https?:)?\/\//.test(chemin) || chemin.startsWith("data:") || chemin.startsWith("blob:")) return chemin
  if (chemin.startsWith("/media/")) return `${ORIGINE_API}${chemin}`
  return chemin // image du site (public/…)
}

/*
 * Images de test, en attendant que l'organisateur ajoute les siennes.
 * Pour les remplacer : déposer les fichiers dans public/images/test/ et modifier ces listes.
 */

/** Images de test choisies d'après le titre de l'événement. */
const IMAGES_PAR_NOM: { motif: RegExp; image: string }[] = [
  // affiche « Revy Mahaleo sy ny taranany » déjà présente dans le projet
  { motif: /mahaleo/i, image: "/images/Picture.jpg" },
]

export const IMAGES_TEST_EVENEMENTS = [
  "/images/accueil/foule-violette.jpg",
  "/images/accueil/scene-dj.jpg",
  "/images/accueil/confettis-roses.jpg",
  "/images/accueil/danseurs.jpg",
  "/images/accueil/confettis-bleus.jpg",
]

/** Une liste par type de proposition : un artiste, un lieu, une formule (type d'événement). */
export const IMAGES_TEST_PROPOSITIONS: Record<PropositionType, string[]> = {
  ARTISTE: ["/images/test/artiste.jpg"],
  LIEU: ["/images/test/lieu.jpg"],
  // « Concert live » et les autres formules : en attendant une image dédiée
  CATEGORIE: ["/images/accueil/foule-violette.jpg", "/images/accueil/confettis-roses.jpg"],
}

/** Image de test stable pour un élément donné (deux éléments voisins n'ont pas la même). */
export function imageTest(id: number, liste: string[]): string {
  return liste[Math.abs(id) % liste.length]
}

function imageParNom(nom: string | null | undefined): string | null {
  if (!nom) return null
  return IMAGES_PAR_NOM.find((r) => r.motif.test(nom))?.image ?? null
}

export function imageTestEvenement(evenement: { id: number; titre: string }): string {
  return imageParNom(evenement.titre) ?? imageTest(evenement.id, IMAGES_TEST_EVENEMENTS)
}

/** Pas de règle par nom ici : une affiche en largeur serait trop recadrée dans la carte, plus haute que large. */
export function imageTestProposition(proposition: { id: number; type: PropositionType }): string {
  return imageTest(proposition.id, IMAGES_TEST_PROPOSITIONS[proposition.type])
}

export const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"]
export const TAILLE_IMAGE_MAX = 8 * 1024 * 1024

/** Message d'erreur si le fichier choisi ne peut pas être envoyé, sinon null. */
export function verifierFichierImage(fichier: File): string | null {
  if (!TYPES_IMAGE_ACCEPTES.includes(fichier.type)) return "Choisissez une image JPEG, PNG ou WebP."
  if (fichier.size > TAILLE_IMAGE_MAX) return "Image trop lourde : 8 Mo maximum."
  return null
}
