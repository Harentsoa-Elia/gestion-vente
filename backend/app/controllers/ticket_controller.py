from __future__ import annotations
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, Base, engine
from app.auth.auth_bearer import JWTBearer
from app.models.concert import Concert
from app.schemas.ticket import (
    TicketGenerateRequest,
    TicketResponse,
    TicketScanRequest,
    TicketScanResponse,
    TicketCountResponse,
    TicketCategoryCountResponse,
    Amount,
    TicketRegenerateRequest,
    TicketWithTotalResponse,
)
from app.services.ticket_service import TicketService
from sqlalchemy import update
from app.models.ticket import Ticket  # Assure-toi que ton modèle Ticket est bien importé
router = APIRouter(tags=["tickets"])
from app.schemas.scan_history import ScanHistoryCreate, ScanHistoryListResponse, ScanHistoryResponse
from app.services.scan_history_service import ScanHistoryService
from app.models.scan_history import ScanHistory
from app.schemas.ticket import TicketCategoryCreate


# --------------------------------------------------
# 🔹 Helper : vérifie si l'utilisateur a accès au concert
# --------------------------------------------------
def check_access(user_concert_id: int, target_concert_id: int):
    """
    - Si user_concert_id == 0 → admin → accès à tout
    - Sinon, le concert doit correspondre à celui du user
    """
    if user_concert_id == 0:
        return True
    if user_concert_id != target_concert_id:
        raise HTTPException(status_code=403, detail="Access denied for this concert.")
    return True


# -----------------------
# 🔹 Génération de tickets
# -----------------------
@router.post(
    "/tickets/regenerate",
    response_model=List[TicketResponse],
)
async def regenerate_tickets(
    request: TicketRegenerateRequest,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    user_concert_id = auth_data.get("concert_id")
    check_access(user_concert_id, request.concert_id)

    service = TicketService(db)

    return await service.regenerate_tickets(
        concert_id=request.concert_id,
        start_code=request.ticket_id_start,
        end_code=request.ticket_id_end,
        category=request.category
    )


# -----------------------
# 🔹 Scan d’un ticket
# -----------------------
@router.post(
    "/tickets/scan",
    response_model=TicketScanResponse,
    summary="Scan a ticket QR code (admin or your concert)",
)
async def scan_ticket(
    request: TicketScanRequest,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    user_concert_id = auth_data.get("concert_id")

    # Si l'utilisateur n'est pas admin, limiter le scan à son concert uniquement
    if user_concert_id != 0:
        request.selected_concert_ids = [user_concert_id]

    service = TicketService(db)
    try:
        return await service.scan_ticket(request)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur interne lors du scan.")


# -----------------------
# 🔹 Statistiques globales
# -----------------------
@router.get(
    "/tickets/count",
    response_model=TicketCountResponse,
    summary="Get ticket counts (admin or your concert)",
)
async def get_ticket_counts(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    service = TicketService(db)
    user_concert_id = auth_data.get("concert_id")
    # admin → global stats
    if user_concert_id == 0:
        return await service.get_ticket_counts()
    return await service.get_ticket_counts(user_concert_id)


# -----------------------
# 🔹 Stats par concert
# -----------------------
@router.get(
    "/concerts/{concert_id}/tickets/count",
    response_model=TicketCountResponse,
    summary="Get ticket counts for a concert (admin or your concert)",
)
async def get_concert_ticket_counts(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    check_access(auth_data.get("concert_id"), concert_id)
    service = TicketService(db)
    return await service.get_ticket_counts(concert_id)

@router.get(
    "/concerts/{concert_id}/tickets/count-by-category",
    response_model=TicketCategoryCountResponse,
    summary="Get ticket counts by category (dynamic)"
)
async def get_concert_ticket_counts_by_category(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    check_access(auth_data.get("concert_id"), concert_id)
    service = TicketService(db)
    data = await service.get_ticket_counts_by_category(concert_id)
    return {"categories": data}


# -----------------------
# 🔹 Liste des concerts visibles
# -----------------------
@router.get("/concerts", summary="List concerts (admin or your own)")
async def list_concerts(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Admin (concert_id=0) → voit tous les concerts
    User normal → voit seulement son concert
    """
    user_concert_id = auth_data.get("concert_id")

    if user_concert_id == 0:  # admin
        rows = await db.execute(select(Concert.id, Concert.title))
        items = [{"id": int(r[0]), "title": r[1]} for r in rows.all()]
        items.sort(key=lambda x: (x["title"] or "").lower())
        return items

    # user normal → un seul concert
    row = await db.execute(select(Concert.id, Concert.title).where(Concert.id == user_concert_id))
    concert = row.first()
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found.")
    return [{"id": int(concert[0]), "title": concert[1]}]


# -----------------------
# 🔹 Montant total
# -----------------------
@router.get(
    "/concerts/{concert_id}/amount",
    response_model=Amount,
    summary="Get total money made (admin or your concert)",
)
async def get_amount_money(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    check_access(auth_data.get("concert_id"), concert_id)
    service = TicketService(db)
    return await service.get_amount(concert_id)


# -----------------------
# 🔹 Derniers tickets
# -----------------------

@router.get(
    "/concerts/{concert_id}/tickets/categories",
    response_model=List[str],
    summary="Get ticket categories available for a concert (admin or your concert)"
)

async def get_ticket_categories_by_concert(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupère toutes les catégories de tickets réellement présentes pour un concert spécifique.
    - Admin → accès à tout
    - Utilisateur → uniquement à son concert
    """
    check_access(auth_data.get("concert_id"), concert_id)
    service = TicketService(db)
    return await service.get_ticket_categories_by_concert(concert_id)


      

@router.get(
    "/concerts/{concert_id}/tickets/list-by-category",
    summary="Get used/unused tickets grouped by category",
)
async def get_tickets_used_unused_by_category(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne les tickets d’un concert regroupés par catégorie :
    {
      "VIP": { "used": [...], "unused": [...] },
      "ADULT": { "used": [...], "unused": [...] },
      ...
    }
    """
    check_access(auth_data.get("concert_id"), concert_id)

    result = {}
    rows = await db.execute(select(Ticket).where(Ticket.concert_id == concert_id))
    tickets = rows.scalars().all()

    for t in tickets:
        cat = t.category.value if hasattr(t.category, "value") else t.category
        if cat not in result:
            result[cat] = {"used": [], "unused": []}
        if t.is_used:
            result[cat]["used"].append(t.id)
        else:
            result[cat]["unused"].append(t.id)

    return result


# --- Enregistrement d'un scan --
@router.post(
    "/tickets/scan-history",
    response_model=ScanHistoryResponse,
    summary="Enregistrer un scan (sécurisé par concert)"
)
async def save_scan_history(
    data: ScanHistoryCreate,
    request: Request,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Enregistre un scan dans l'historique :
    - Superadmin (concert_id == 0) → peut tout enregistrer.
    - Utilisateur normal → uniquement son concert.
    """
    user_id = auth_data.get("user_id")
    user_concert_id = auth_data.get("concert_id")
    ip = request.client.host

    service = ScanHistoryService(db)

    try:
        record = await service.save_scan(user_id, user_concert_id, data, ip)
        return record
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'enregistrement : {e}")


# --- Liste des historiques (filtrée par concerts et rôle) ---
@router.post(
    "/tickets/scan-history/list",
    response_model=ScanHistoryListResponse,
    summary="Lister l'historique des scans selon le rôle et les concerts"
)
async def list_scan_history(
    payload: dict,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupère les scans :
    - Admin → tous les concerts sélectionnés.
    - User → seulement ses propres concerts.
    """
    selected_concert_ids = payload.get("concert_ids", [])
    if not selected_concert_ids:
        raise HTTPException(status_code=400, detail="Aucun concert sélectionné.")

    user_concert_id = auth_data.get("concert_id")
    is_admin = user_concert_id == 0

    service = ScanHistoryService(db)
    try:
        items = await service.list_by_concerts(selected_concert_ids, user_concert_id, is_admin)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not items:
        return ScanHistoryListResponse(ok=False, count=0, data=[])

    return ScanHistoryListResponse(ok=True, count=len(items), data=items)

@router.delete(
    "/concerts/{concert_id}/tickets/delete",
    summary="Delete ticket(s) by ID or range"
)
async def delete_tickets(
    concert_id: int,
    payload: dict,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id != 0 and user_concert_id != concert_id:
        raise HTTPException(status_code=403, detail="Access denied")

    from_id = payload.get("from_id")
    to_id = payload.get("to_id", from_id)
    if not from_id:
        raise HTTPException(status_code=400, detail="from_id required")
    if to_id < from_id:
        raise HTTPException(status_code=400, detail="to_id must be >= from_id")

    service = TicketService(db)
    deleted_count = await service.delete_tickets(concert_id, from_id, to_id)
    return {"deleted": deleted_count, "range": f"{from_id} → {to_id}"}


@router.get(
    "/concerts/{concert_id}/tickets/last-by-category/{category}",
    summary="Get last ticket ID for a concert and category",
    response_model=TicketWithTotalResponse
)
async def get_last_ticket_by_category(
    concert_id: int,
    category: str,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier accès
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id != 0 and user_concert_id != concert_id:
        raise HTTPException(status_code=403, detail="Access denied for this concert.")

    service = TicketService(db)
    result = await service.get_last_ticket_and_total_by_category(concert_id, category)

    if result["total_tickets"] == 0:
        raise HTTPException(status_code=404, detail="Aucun ticket trouvé pour cette catégorie.")

    return result


#liste categorie
@router.get(
    "/tickets/categories",
    response_model=List[str],
    summary="Lister toutes les catégories de tickets"
)
async def list_ticket_categories(db: AsyncSession = Depends(get_db)):
    """
    Retourne toutes les valeurs définies dans l'ENUM PostgreSQL ticketcategory
    """
    query = text("SELECT unnest(enum_range(NULL::ticketcategory)) AS category")
    result = await db.execute(query)
    categories = [row[0] for row in result.fetchall()]
    return categories


#add categorie
import re

@router.post("/tickets/categories", summary="Ajouter une nouvelle categorie de ticket")
async def add_ticket_category(
    payload: TicketCategoryCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    if auth_data.get("concert_id") != 0:
        raise HTTPException(status_code=403, detail="Only admin can add categories")

    category_name = payload.category.strip().upper()

    if not re.fullmatch(r"[A-Z0-9_]{1,50}", category_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid category name. Only uppercase letters, digits and underscores are allowed."
        )

    try:
        check_sql = text("""
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'ticketcategory' AND e.enumlabel = :cat
        """)
        result = await db.execute(check_sql, {"cat": category_name})
        exists = result.scalar() is not None

        if exists:
            return {"ok": True, "category": category_name, "message": "Category already exists"}

        add_sql = text(f"ALTER TYPE ticketcategory ADD VALUE '{category_name}'")
        await db.execute(add_sql)
        await db.commit()

        return {"ok": True, "category": category_name, "message": "Category added"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur ajout categorie: {e}")