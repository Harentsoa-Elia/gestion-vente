export interface Lieu {
  id: number
  nom: string
  adresse: string | null
  ville: string | null
  /** Région de Madagascar, ex. 'Haute Matsiatra' */
  region?: string | null
  capacite: number | null
}

export interface Categorie {
  id: number
  nom: string
  description: string | null
  /** fond par défaut des billets des événements de ce type */
  fond_url?: string | null
}

export interface Artiste {
  id: number
  nom: string
  description: string | null
  image_url: string | null
  genre_artistique: string | null
}
