"""Billetterie côté participant : réserver plusieurs billets, payer (simulation Mobile Money),
recevoir les billets par e-mail (PDF + QR codes) et les retrouver dans 'Mes billets'."""
from typing import List

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import ParticipantBearer
from app.database import get_db
from app.models.participant import Participant
from app.schemas.billetterie import BilletParticipant, LotReserve, PaiementConfirme, PaiementLot, ReservationLot, TarifDisponible
from app.services.billetterie_service import DUREE_RESERVATION, BilletterieService, ErreurBilletterie
from app.utils.billet_pdf import InfosBillet, date_francaise, generer_pdf_billets, qr_png
from app.utils.email import email_billets, envoyer_email_sans_erreur, lien_site

router = APIRouter(tags=["billetterie"])


def infos_pdf(billets: List[dict], participant: Participant) -> List[InfosBillet]:
    nom = f"{participant.prenom} {participant.nom}".strip()
    return [
        InfosBillet(
            numero=b["numero_billet"],
            qr=b["qr_code"],
            evenement=b["evenement_titre"],
            date_debut=b["evenement_date"],
            lieu=b["lieu"],
            categorie=b["categorie_nom"],
            prix=b["prix"],
            participant=nom,
            utilise=b["utilise"],
            fond=b.get("fond_url"),
        )
        for b in billets
        if b["numero_billet"]
    ]


def envoyer_billets(participant_email: str, prenom: str, billets: List[InfosBillet]) -> None:
    """Tâche de fond : e-mail avec les QR codes (images inline) et le PDF en pièce jointe."""
    if not billets:
        return
    premier = billets[0]
    images = [(f"qr-{b.numero}@guichetweb", qr_png(b.qr, 8)) for b in billets]
    sujet, texte, html = email_billets(
        prenom,
        premier.evenement,
        date_francaise(premier.date_debut),
        premier.lieu,
        [(b.numero, f"{b.categorie} - {int(b.prix):,} Ar".replace(",", " "), cid) for b, (cid, _) in zip(billets, images)],
        lien_site("/participants/mes-reservations"),
    )
    pdf = generer_pdf_billets(billets)
    envoyer_email_sans_erreur(
        participant_email,
        sujet,
        texte,
        html,
        pieces_jointes=[(f"billets-guichetweb-{premier.numero}.pdf", pdf, "application/pdf")],
        images_inline=images,
    )


@router.get("/evenements/{evenement_id}/tarifs", response_model=List[TarifDisponible], summary="Tarifs et places restantes (public)")
async def tarifs(evenement_id: int, db: AsyncSession = Depends(get_db)):
    return await BilletterieService(db).tarifs(evenement_id)


@router.post("/reservations/lot", response_model=LotReserve, status_code=201, summary="Réserver 1 à 10 billets (non payés, gardés 15 min)")
async def reserver_lot(
    saisie: ReservationLot = Body(...),
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    participant = await db.get(Participant, auth_data["participant_id"])
    if participant is None or not participant.email_verifie:
        raise HTTPException(status_code=403, detail="EMAIL_NON_VERIFIE: Confirmez votre adresse e-mail avant de réserver.")
    try:
        evenement, categorie, reservations = await BilletterieService(db).reserver(
            participant.id, saisie.evenement_id, saisie.categorie_billet_id, saisie.quantite
        )
    except ErreurBilletterie as e:
        raise HTTPException(status_code=400, detail=str(e))
    return LotReserve(
        reservations=[{"id": r.id, "montant": categorie.prix, "expire_le": r.date_reservation + DUREE_RESERVATION} for r in reservations],
        montant_total=categorie.prix * len(reservations),
        evenement_titre=evenement.titre,
        categorie_nom=categorie.nom,
    )


@router.post("/reservations/paiement", response_model=PaiementConfirme, summary="Payer des réservations (Mobile Money SIMULÉ) et recevoir les billets")
async def payer_lot(
    taches: BackgroundTasks,
    saisie: PaiementLot = Body(...),
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = BilletterieService(db)
    try:
        reference, total, ids = await service.payer(auth_data["participant_id"], saisie.reservation_ids, saisie.mode_paiement, saisie.telephone)
    except ErreurBilletterie as e:
        raise HTTPException(status_code=400, detail=str(e))
    participant = await service.participant(auth_data["participant_id"])
    billets = await service.billets_participant(participant.id, ids)
    taches.add_task(envoyer_billets, participant.email, participant.prenom, infos_pdf(billets, participant))
    return PaiementConfirme(montant_total=total, mode_paiement=saisie.mode_paiement, reference=reference, email=participant.email, billets=billets)


@router.get("/participants/me/billets", response_model=List[BilletParticipant], summary="Mes réservations et billets")
async def mes_billets(auth_data: dict = Depends(ParticipantBearer()), db: AsyncSession = Depends(get_db)):
    return await BilletterieService(db).billets_participant(auth_data["participant_id"])


@router.get("/reservations/{reservation_id}/billet.pdf", summary="Télécharger le billet PDF", response_class=Response)
async def billet_pdf(reservation_id: int, auth_data: dict = Depends(ParticipantBearer()), db: AsyncSession = Depends(get_db)):
    service = BilletterieService(db)
    billets = await service.billets_participant(auth_data["participant_id"], [reservation_id])
    participant = await service.participant(auth_data["participant_id"])
    infos = infos_pdf(billets, participant) if participant else []
    if not infos:
        raise HTTPException(status_code=404, detail="Billet introuvable (la réservation n'est peut-être pas encore payée).")
    pdf = await run_in_threadpool(generer_pdf_billets, infos)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="billet-{infos[0].numero}.pdf"'},
    )


@router.post("/reservations/{reservation_id}/renvoyer-billet", summary="Renvoyer le billet par e-mail")
async def renvoyer_billet(
    reservation_id: int, taches: BackgroundTasks, auth_data: dict = Depends(ParticipantBearer()), db: AsyncSession = Depends(get_db)
):
    service = BilletterieService(db)
    participant = await service.participant(auth_data["participant_id"])
    billets = await service.billets_participant(auth_data["participant_id"], [reservation_id])
    infos = infos_pdf(billets, participant) if participant else []
    if not infos:
        raise HTTPException(status_code=404, detail="Billet introuvable.")
    taches.add_task(envoyer_billets, participant.email, participant.prenom, infos)
    return {"message": f"Billet renvoyé à {participant.email}."}


@router.delete("/reservations/{reservation_id}", summary="Annuler une réservation non payée")
async def annuler(reservation_id: int, auth_data: dict = Depends(ParticipantBearer()), db: AsyncSession = Depends(get_db)):
    try:
        await BilletterieService(db).annuler(auth_data["participant_id"], reservation_id)
    except ErreurBilletterie as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Réservation annulée."}
