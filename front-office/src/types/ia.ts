/** Module d'IA : sentiment des commentaires (GET /evenements/{id}/sentiments). */
export type Sentiment = "positif" | "neutre" | "negatif"

export interface RepartitionSentiments {
  positif: number
  neutre: number
  negatif: number
  /** le modèle hésite (confiance sous le seuil) : le commentaire ne compte pas */
  incertain: number
  non_analyse: number
}

export interface SentimentProposition extends RepartitionSentiments {
  proposition_id: number
  libelle: string
  type: string
}

export interface CommentaireAnalyse {
  texte: string
  sentiment: Sentiment | null
  confiance: number | null
  proposition: string
  date: string | null
}

export interface InfosModele {
  modele: string
  exactitude_test: number
  f1_macro_test: number
  corpus: number
  entraine_le: string
}

export interface SentimentsEvenement {
  total: number
  repartition: RepartitionSentiments
  seuil_confiance: number
  par_proposition: SentimentProposition[]
  derniers: CommentaireAnalyse[]
  modele: InfosModele | null
}
