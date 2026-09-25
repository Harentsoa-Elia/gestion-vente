import { API_BASE_URL } from "@/services/apiConfig"

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

/**
 * Images de test, en attendant que l'organisateur ajoute les siennes.
 * Pour les remplacer : déposer les fichiers dans public/images/test/ et modifier ces listes.
 */
export const IMAGES_TEST_EVENEMENTS = [
  "/images/accueil/foule-violette.jpg",
  "/images/accueil/scene-dj.jpg",
  "/images/accueil/confettis-roses.jpg",
  "/images/accueil/danseurs.jpg",
  "/images/accueil/confettis-bleus.jpg",
]

export const IMAGES_TEST_PROPOSITIONS = [
  "/images/accueil/scene-dj.jpg",
  "/images/accueil/danseurs.jpg",
  "/images/accueil/confettis-bleus.jpg",
  "/images/accueil/foule-violette.jpg",
  "/images/accueil/confettis-roses.jpg",
]

/** Image de test stable pour un élément donné (deux éléments voisins n'ont pas la même). */
export function imageTest(id: number, liste: string[]): string {
  return liste[Math.abs(id) % liste.length]
}

export const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"]
export const TAILLE_IMAGE_MAX = 8 * 1024 * 1024

/** Message d'erreur si le fichier choisi ne peut pas être envoyé, sinon null. */
export function verifierFichierImage(fichier: File): string | null {
  if (!TYPES_IMAGE_ACCEPTES.includes(fichier.type)) return "Choisissez une image JPEG, PNG ou WebP."
  if (fichier.size > TAILLE_IMAGE_MAX) return "Image trop lourde : 8 Mo maximum."
  return null
}
