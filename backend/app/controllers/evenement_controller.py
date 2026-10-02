from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.evenement import DecisionRejet, EvenementCreate, EvenementUpdate, EvenementResponse
from app.services.evenement_service import EvenementService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db
from app.auth.roles import est_admin
from app.models.user import User
from app.utils.email import email_decision_evenement, envoyer_email_sans_erreur, lien_site

router = APIRouter(tags=["evenements"])


def check_access(auth_data: dict, evenement_organisateur_id: int):
    if est_admin(auth_data):
        return True
    if auth_data.get("user_id") != evenement_organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")
    return True


async def prevenir_organisateur(db: AsyncSession, taches: BackgroundTasks, evenement, valide: bool) -> None:
    """E-mail à l'organisateur après la décision de l'administrateur (envoyé après la réponse)."""
    organisateur = await db.get(User, evenement.organisateur_id)
    if organisateur and organisateur.email:
        prenom = (organisateur.fullname or "").split(" ")[0] or organisateur.fullname
        taches.add_task(
            envoyer_email_sans_erreur,
            organisateur.email,
            *email_decision_evenement(
                prenom, evenement.titre, valide, evenement.motif_rejet, lien_site(f"/organisateur/evenements/{evenement.id}")
            ),
        )


def check_admin(auth_data: dict):
    if not est_admin(auth_data):
        raise HTTPException(status_code=403, detail="Réservé à l'administrateur.")
    return True


@router.post(
    "/evenements",
    response_model=EvenementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new evenement",
)
async def create_evenement(
    evenement: EvenementCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    organisateur_id = auth_data.get("user_id")
    return await service.create_evenement(evenement, organisateur_id)


@router.get("/evenements", response_model=List[EvenementResponse], summary="Get public (validated) evenements")
async def get_public_evenements(db: AsyncSession = Depends(get_db)):
    """Route publique : accessible sans authentification, ne montre que les evenements valides."""
    service = EvenementService(db)
    return await service.get_evenements_publics()


@router.get("/evenements/all", response_model=List[EvenementResponse], summary="Get all evenements (staff only)")
async def get_all_evenements(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """Route staff : montre tous les evenements, y compris brouillon/en_attente/rejete."""
    service = EvenementService(db)
    return await service.get_all_evenements()


@router.get("/evenements/{evenement_id}", response_model=EvenementResponse, summary="Get a specific evenement")
async def get_evenement(
    evenement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Route publique : accessible sans authentification."""
    service = EvenementService(db)
    evenement = await service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")

    await service.incrementer_vues(evenement_id)
    evenement.nombre_vues = (evenement.nombre_vues or 0) + 1
    return evenement


@router.put("/evenements/{evenement_id}", response_model=EvenementResponse, summary="Update an evenement")
async def update_evenement(
    evenement_id: int,
    evenement: EvenementUpdate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    existing = await service.get_evenement(evenement_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, existing.organisateur_id)

    updated_evenement = await service.update_evenement(evenement_id, evenement)
    return updated_evenement


@router.post("/evenements/{evenement_id}/publier", response_model=EvenementResponse, summary="Soumettre l'evenement pour validation (organisateur)")
async def publier_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    existing = await service.get_evenement(evenement_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, existing.organisateur_id)

    try:
        return await service.publier_evenement(evenement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/evenements/{evenement_id}/valider", response_model=EvenementResponse, summary="Valider un evenement (admin)")
async def valider_evenement(
    evenement_id: int,
    taches: BackgroundTasks,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    check_admin(auth_data)
    service = EvenementService(db)
    existing = await service.get_evenement(evenement_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Evenement not found.")

    try:
        evenement = await service.valider_evenement(evenement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await prevenir_organisateur(db, taches, evenement, valide=True)
    return evenement


@router.post("/evenements/{evenement_id}/rejeter", response_model=EvenementResponse, summary="Rejeter un evenement (admin)")
async def rejeter_evenement(
    evenement_id: int,
    taches: BackgroundTasks,
    decision: Optional[DecisionRejet] = Body(None),
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    check_admin(auth_data)
    service = EvenementService(db)
    existing = await service.get_evenement(evenement_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Evenement not found.")

    try:
        evenement = await service.rejeter_evenement(evenement_id, decision.motif if decision else None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await prevenir_organisateur(db, taches, evenement, valide=False)
    return evenement


@router.delete("/evenements/{evenement_id}", status_code=200, summary="Delete an evenement")
async def delete_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    evenement = await service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, evenement.organisateur_id)

    await service.delete_evenement(evenement_id)
    return {"message": "Evenement deleted successfully."}