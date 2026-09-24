export interface Lieu {
  id: number
  nom: string
  adresse: string | null
  ville: string | null
  capacite: number | null
}

export interface Categorie {
  id: number
  nom: string
  description: string | null
}

export interface Artiste {
  id: number
  nom: string
  description: string | null
  image_url: string | null
  genre_artistique: string | null
}
