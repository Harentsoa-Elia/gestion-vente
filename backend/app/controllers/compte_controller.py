"""Confirmation de l'adresse e-mail et mot de passe oublié.

Participants :
- POST /participants/verification/envoyer    (connecté) : envoie un code à 6 chiffres ;
- POST /participants/verification/confirmer  (connecté) : confirme l'adresse ;
- POST /participants/mot-de-passe/oublie     : envoie un code pour changer de mot de passe ;
- POST /participants/mot-de-passe/reinitialiser : nouveau mot de passe (et connexion).
Équipe (organisateurs, administrateurs) :
- POST /mot-de-passe/oublie, POST /mot-de-passe/reinitialiser.

« Mot de passe oublié » répond toujours la même chose, que le compte existe ou non,
pour ne pas révéler quelles adresses sont inscrites.
"""
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import ParticipantBearer
from app.auth.auth_handler import sign_jwt_participant
from app.database import get_db
from app.models.participant import Participant
from app.models.user import User
from app.schemas.participant import DemandeReinitialisation, Reinitialisation, SaisieCode
from app.services.code_email_service import (
    COMPTE_EQUIPE,
    COMPTE_PARTICIPANT,
    USAGE_REINITIALISATION,
    USAGE_VERIFICATION,
    CodeEmailService,
    RenvoiTropRapide,
)
from app.services.participant_service import hash_password as hash_participant
from app.controllers.user_controller import hash_password as hash_equipe
from app.utils.email import (
    EnvoiImpossible,
    email_code_reinitialisation,
    email_code_verification,
    envoyer_email,
    envoyer_email_sans_erreur,
)

router = APIRouter(tags=["comptes"])

MESSAGE_OUBLI = "Si un compte existe avec cette adresse, un code vient d'y être envoyé."
CODE_INVALIDE = "Code incorrect ou expiré. Vérifiez le dernier e-mail reçu, ou demandez un nouveau code."


async def _participant_courant(auth_data: dict, db: AsyncSession) -> Participant:
    participant = await db.get(Participant, auth_data["participant_id"])
    if not participant:
        raise HTTPException(status_code=404, detail="Participant non trouvé.")
    return participant


async def envoyer_code_verification(db: AsyncSession, participant: Participant) -> None:
    """Crée et envoie un code de confirmation (lève RenvoiTropRapide ou EnvoiImpossible)."""
    code = await CodeEmailService(db).creer(participant.email, COMPTE_PARTICIPANT, USAGE_VERIFICATION)
    await run_in_threadpool(envoyer_email, participant.email, *email_code_verification(participant.prenom, code))


# ---------- confirmation de l'adresse du participant ----------

@router.post("/participants/verification/envoyer", summary="Envoyer un code de confirmation de l'adresse e-mail")
async def envoyer_verification(auth_data: dict = Depends(ParticipantBearer()), db: AsyncSession = Depends(get_db)):
    participant = await _participant_courant(auth_data, db)
    if participant.email_verifie:
        return {"message": "Votre adresse e-mail est déjà confirmée.", "email_verifie": True}
    try:
        await envoyer_code_verification(db, participant)
    except RenvoiTropRapide as e:
        raise HTTPException(status_code=429, detail=str(e))
    except EnvoiImpossible as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"message": f"Un code a été envoyé à {participant.email}.", "email_verifie": False}


@router.post("/participants/verification/confirmer", summary="Confirmer l'adresse e-mail avec le code reçu")
async def confirmer_verification(
    saisie: SaisieCode = Body(...),
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    participant = await _participant_courant(auth_data, db)
    if participant.email_verifie:
        return {"message": "Votre adresse e-mail est déjà confirmée.", "email_verifie": True}
    if not await CodeEmailService(db).verifier(participant.email, COMPTE_PARTICIPANT, USAGE_VERIFICATION, saisie.code):
        raise HTTPException(status_code=400, detail=CODE_INVALIDE)
    participant.email_verifie = True
    await db.commit()
    return {"message": "Adresse e-mail confirmée.", "email_verifie": True}


# ---------- mot de passe oublié : participants ----------

@router.post("/participants/mot-de-passe/oublie", summary="Mot de passe oublié (participant) : envoyer un code")
async def oubli_participant(
    taches: BackgroundTasks,
    demande: DemandeReinitialisation = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Participant).where(Participant.email == demande.email))
    participant = result.scalar_one_or_none()
    if participant:
        try:
            code = await CodeEmailService(db).creer(participant.email, COMPTE_PARTICIPANT, USAGE_REINITIALISATION)
            taches.add_task(envoyer_email_sans_erreur, participant.email, *email_code_reinitialisation(participant.prenom, code))
        except RenvoiTropRapide:
            pass  # même réponse : le code précédent reste valable
    return {"message": MESSAGE_OUBLI}


@router.post("/participants/mot-de-passe/reinitialiser", summary="Choisir un nouveau mot de passe (participant)")
async def reinitialiser_participant(saisie: Reinitialisation = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Participant).where(Participant.email == saisie.email))
    participant = result.scalar_one_or_none()
    if not participant or not await CodeEmailService(db).verifier(
        participant.email, COMPTE_PARTICIPANT, USAGE_REINITIALISATION, saisie.code
    ):
        raise HTTPException(status_code=400, detail=CODE_INVALIDE)
    participant.mot_de_passe = hash_participant(saisie.nouveau_mot_de_passe)
    # le code reçu prouve aussi que l'adresse lui appartient
    participant.email_verifie = True
    await db.commit()
    return {"message": "Mot de passe modifié.", **sign_jwt_participant(participant.email, participant.id)}


# ---------- mot de passe oublié : équipe (organisateurs, administrateurs) ----------

@router.post("/mot-de-passe/oublie", summary="Mot de passe oublié (organisateur ou administrateur) : envoyer un code")
async def oubli_equipe(
    taches: BackgroundTasks,
    demande: DemandeReinitialisation = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == demande.email))
    user = result.scalar_one_or_none()
    if user:
        try:
            code = await CodeEmailService(db).creer(user.email, COMPTE_EQUIPE, USAGE_REINITIALISATION)
            prenom = (user.fullname or "").split(" ")[0] or user.fullname
            taches.add_task(envoyer_email_sans_erreur, user.email, *email_code_reinitialisation(prenom, code))
        except RenvoiTropRapide:
            pass
    return {"message": MESSAGE_OUBLI}


@router.post("/mot-de-passe/reinitialiser", summary="Choisir un nouveau mot de passe (organisateur ou administrateur)")
async def reinitialiser_equipe(saisie: Reinitialisation = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == saisie.email))
    user = result.scalar_one_or_none()
    if not user or not await CodeEmailService(db).verifier(user.email, COMPTE_EQUIPE, USAGE_REINITIALISATION, saisie.code):
        raise HTTPException(status_code=400, detail=CODE_INVALIDE)
    user.password = hash_equipe(saisie.nouveau_mot_de_passe)
    await db.commit()
    return {"message": "Mot de passe modifié. Vous pouvez vous connecter."}
