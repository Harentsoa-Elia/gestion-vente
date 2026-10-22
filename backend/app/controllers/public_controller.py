"""Routes publiques de l'accueil : chiffres de la plateforme et dernières réactions du public (sans nom de personne)."""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.billet import Billet
from app.models.evenement import Evenement
from app.models.interaction_publique import InteractionPublique
from app.models.participant import Participant
from app.models.proposition import Proposition

router = APIRouter(tags=["accueil public"])


class Chiffres(BaseModel):
    billets_vendus: int
    participants: int
    evenements_a_venir: int
    reactions: int


class Activite(BaseModel):
    type: str
    proposition: str
    evenement_id: int
    evenement: str
    date: datetime


@router.get("/public/chiffres", response_model=Chiffres, summary="Chiffres de la plateforme affichés sur l'accueil")
async def chiffres(db: AsyncSession = Depends(get_db)):
    maintenant = datetime.now(timezone.utc)
    compter = lambda requete: db.scalar(requete)
    return Chiffres(
        billets_vendus=await compter(select(func.count(Billet.id))) or 0,
        participants=await compter(select(func.count(Participant.id)).where(Participant.statut != "suspendu")) or 0,
        evenements_a_venir=await compter(
            select(func.count(Evenement.id)).where(Evenement.statut_validation == "valide", Evenement.date_debut >= maintenant)
        ) or 0,
        reactions=await compter(select(func.count(InteractionPublique.id))) or 0,
    )


@router.get("/public/activite", response_model=List[Activite], summary="Dernières réactions du public (anonymes)")
async def activite(limite: int = Query(12, ge=1, le=30), db: AsyncSession = Depends(get_db)):
    lignes = (
        await db.execute(
            select(InteractionPublique.type_interaction, InteractionPublique.date_interaction, Proposition.libelle, Evenement.id, Evenement.titre)
            .join(Proposition, Proposition.id == InteractionPublique.proposition_id)
            .join(Evenement, Evenement.id == Proposition.evenement_id)
            .where(Evenement.statut_validation == "valide")
            .order_by(InteractionPublique.date_interaction.desc())
            .limit(limite)
        )
    ).all()
    return [
        Activite(type=getattr(t, "value", str(t)), proposition=lib, evenement_id=eid, evenement=titre, date=d)
        for t, d, lib, eid, titre in lignes
    ]
