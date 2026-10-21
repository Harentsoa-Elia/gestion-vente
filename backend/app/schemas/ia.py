from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class TexteAnalyse(BaseModel):
    texte: str = Field(..., min_length=1, max_length=1000, description="Commentaire à analyser")


class ResultatSentiment(BaseModel):
    sentiment: str = Field(..., description="positif, neutre ou negatif")
    confiance: float = Field(..., description="Probabilité de la classe retenue (0 à 1)")
    probabilites: Dict[str, float]
    points: int = Field(..., description="Points apportés à la proposition par ce commentaire")


class Repartition(BaseModel):
    positif: int = 0
    neutre: int = 0
    negatif: int = 0
    incertain: int = 0
    non_analyse: int = 0


class SentimentProposition(Repartition):
    proposition_id: int
    libelle: str
    type: str


class CommentaireAnalyse(BaseModel):
    texte: str
    sentiment: Optional[str]
    confiance: Optional[float]
    proposition: str
    date: Optional[datetime]


class InfosModele(BaseModel):
    modele: str
    exactitude_test: float
    f1_macro_test: float
    corpus: int
    entraine_le: str


class SentimentsEvenement(BaseModel):
    total: int
    repartition: Repartition
    seuil_confiance: float
    par_proposition: List[SentimentProposition]
    derniers: List[CommentaireAnalyse]
    modele: Optional[InfosModele] = None
