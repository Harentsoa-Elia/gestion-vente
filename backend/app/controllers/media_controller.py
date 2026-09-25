"""Images des événements (affiche) et des propositions (visuel).

Le fichier est envoyé brut dans le corps de la requête (Content-Type image/jpeg, image/png
ou image/webp) : pas besoin du paquet python-multipart.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.controllers.evenement_controller import check_access
from app.controllers.proposition_controller import check_evenement_access
from app.database import get_db
from app.models.evenement import Evenement
from app.models.proposition import Proposition
from app.schemas.evenement import EvenementResponse
from app.schemas.proposition import PropositionResponse
from app.services.evenement_service import EvenementService
from app.services.proposition_service import PropositionService
from app.utils.media import TAILLE_MAX_OCTETS, ImageInvalide, enregistrer_image, supprimer_image

router = APIRouter(tags=["images"])

TYPES_ACCEPTES = {"image/jpeg", "image/png", "image/webp"}


async def lire_image(request: Request) -> bytes:
    type_contenu = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    if type_contenu not in TYPES_ACCEPTES:
        raise HTTPException(status_code=415, detail="Envoyez une image JPEG, PNG ou WebP.")
    longueur = request.headers.get("content-length")
    if longueur and longueur.isdigit() and int(longueur) > TAILLE_MAX_OCTETS:
        raise HTTPException(status_code=413, detail="Image trop lourde : 8 Mo maximum.")
    contenu = await request.body()
    if len(contenu) > TAILLE_MAX_OCTETS:
        raise HTTPException(status_code=413, detail="Image trop lourde : 8 Mo maximum.")
    return contenu


async def enregistrer(contenu: bytes, dossier: str) -> str:
    try:
        return await run_in_threadpool(enregistrer_image, contenu, dossier)
    except ImageInvalide as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------- affiche d'un événement ----------

@router.put("/evenements/{evenement_id}/image", response_model=EvenementResponse, summary="Ajouter ou remplacer l'affiche d'un evenement")
async def definir_image_evenement(
    evenement_id: int,
    request: Request,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement = await db.get(Evenement, evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, evenement.organisateur_id)

    url = await enregistrer(await lire_image(request), "evenements")
    ancienne = evenement.image_url
    evenement.image_url = url
    await db.commit()
    supprimer_image(ancienne)
    return await EvenementService(db).get_evenement(evenement_id)


@router.delete("/evenements/{evenement_id}/image", response_model=EvenementResponse, summary="Retirer l'affiche d'un evenement")
async def retirer_image_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement = await db.get(Evenement, evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, evenement.organisateur_id)

    ancienne = evenement.image_url
    evenement.image_url = None
    await db.commit()
    supprimer_image(ancienne)
    return await EvenementService(db).get_evenement(evenement_id)


# ---------- visuel d'une proposition ----------

@router.put("/propositions/{proposition_id}/image", response_model=PropositionResponse, summary="Ajouter ou remplacer le visuel d'une proposition")
async def definir_image_proposition(
    proposition_id: int,
    request: Request,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    proposition = await db.get(Proposition, proposition_id)
    if not proposition:
        raise HTTPException(status_code=404, detail="Proposition not found.")
    await check_evenement_access(auth_data, PropositionService(db), proposition.evenement_id)

    url = await enregistrer(await lire_image(request), "propositions")
    ancienne = proposition.image_url
    proposition.image_url = url
    await db.commit()
    await db.refresh(proposition)
    supprimer_image(ancienne)
    return proposition


@router.delete("/propositions/{proposition_id}/image", response_model=PropositionResponse, summary="Retirer le visuel d'une proposition")
async def retirer_image_proposition(
    proposition_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    proposition = await db.get(Proposition, proposition_id)
    if not proposition:
        raise HTTPException(status_code=404, detail="Proposition not found.")
    await check_evenement_access(auth_data, PropositionService(db), proposition.evenement_id)

    ancienne = proposition.image_url
    proposition.image_url = None
    await db.commit()
    await db.refresh(proposition)
    supprimer_image(ancienne)
    return proposition
