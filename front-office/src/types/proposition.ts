export type PropositionType = "ARTISTE" | "LIEU" | "CATEGORIE"

export interface Proposition {
  id: number
  type: PropositionType
  libelle: string
  evenement_id: number
  artiste_id: number | null
  lieu_id: number | null
  categorie_id: number | null
  date_proposition: string
  /** Visuel envoyé par l'organisateur (/media/..., voir lib/media.ts), null sinon. */
  image_url?: string | null
}

export interface PropositionAvecScore extends Proposition {
  score: number
}