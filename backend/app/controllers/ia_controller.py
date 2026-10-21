"""Module d'IA : analyse des sentiments des commentaires (voir app/ia/sentiment.py)."""
import json
from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.auth.roles import role_du_compte
from app.controllers.recommandation_controller import check_access
from app.database import get_db
from app.ia.sentiment import analyser
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.models.proposition import Proposition
from app.schemas.ia import ResultatSentiment, SentimentsEvenement, TexteAnalyse
from app.services.evenement_service import EvenementService
from app.utils.scoring import SEUIL_CONFIANCE, poids

router = APIRouter(tags=["intelligence artificielle"])
INFOS = Path(__file__).resolve().parent.parent / "ia" / "modele_infos.json"


@router.post("/ia/sentiment", response_model=ResultatSentiment, summary="Analyser le sentiment d'un texte (test du modèle)")
async def analyser_texte(saisie: TexteAnalyse = Body(...), auth_data: dict = Depends(JWTBearer())):
    if role_du_compte(auth_data) is None:
        raise HTTPException(status_code=403, detail="Réservé à l'équipe (organisateur ou administrateur).")
    a = analyser(saisie.texte)
    if a is None:
        raise HTTPException(status_code=503, detail="Le modèle d'analyse des sentiments n'est pas disponible.")
    return {"sentiment": a.sentiment, "confiance": a.confiance, "probabilites": a.probabilites,
            "points": poids(InteractionType.COMMENTAIRE, a.sentiment, a.confiance)}


@router.get("/evenements/{evenement_id}/sentiments", response_model=SentimentsEvenement,
            summary="Sentiment des commentaires du public sur les propositions d'un événement")
async def sentiments_evenement(evenement_id: int, auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    await check_access(auth_data, EvenementService(db), evenement_id)
    lignes = (await db.execute(
        select(InteractionPublique.contenu, InteractionPublique.sentiment, InteractionPublique.confiance,
               InteractionPublique.date_interaction, Proposition.id, Proposition.libelle, Proposition.type)
        .join(Proposition, Proposition.id == InteractionPublique.proposition_id)
        .where(Proposition.evenement_id == evenement_id, InteractionPublique.type_interaction == InteractionType.COMMENTAIRE)
        .order_by(InteractionPublique.date_interaction.desc())
    )).all()
    total = {"positif": 0, "neutre": 0, "negatif": 0, "incertain": 0, "non_analyse": 0}
    par_prop = {}
    for contenu, sentiment, confiance, date, pid, libelle, type_ in lignes:
        if sentiment not in ("positif", "neutre", "negatif"):
            cle = "non_analyse"
        elif confiance is None or confiance < SEUIL_CONFIANCE:
            cle = "incertain"  # le modèle hésite : le commentaire ne compte pas
        else:
            cle = sentiment
        total[cle] += 1
        p = par_prop.setdefault(pid, {"proposition_id": pid, "libelle": libelle, "type": getattr(type_, "value", str(type_)),
                                      "positif": 0, "neutre": 0, "negatif": 0, "incertain": 0, "non_analyse": 0})
        p[cle] += 1
    derniers = [{"texte": c, "sentiment": s, "confiance": f, "proposition": l, "date": d}
                for c, s, f, d, _, l, _ in lignes[:8]]
    infos = json.loads(INFOS.read_text(encoding="utf-8")) if INFOS.exists() else None
    return {"total": len(lignes), "repartition": total, "seuil_confiance": SEUIL_CONFIANCE,
            "par_proposition": sorted(par_prop.values(), key=lambda p: -(p["positif"] + p["neutre"] + p["negatif"])),
            "derniers": derniers, "modele": infos}
