from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.ticket import TicketGenerateRequest, TicketResponse, TicketScanRequest, TicketScanResponse, TicketCountResponse
from app.services.ticket_service import TicketService
from typing import List

router = APIRouter()

@router.post("/tickets/generate", response_model=List[TicketResponse], status_code=status.HTTP_201_CREATED, summary="Generate new tickets for a concert")
async def generate_tickets(request: TicketGenerateRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a specified quantity of new tickets for a given concert.
    Ticket IDs are automatically generated using the concert's code and an auto-incrementing number.
    """
    service = TicketService(db)
    try:
        tickets = await service.generate_tickets(request)
        return tickets
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate tickets: {e}")

@router.post("/tickets/scan", response_model=TicketScanResponse, summary="Scan a ticket QR code for validation")
async def scan_ticket(request: TicketScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Scans a ticket using its QR code data (ticket ID).
    Returns whether the ticket is valid (unused) or already used, along with a message and concert details.
    If valid, the ticket's 'is_used' status is updated to True.
    """
    service = TicketService(db)
    return await service.scan_ticket(request)

# Add to controllers/ticket_controller.py
@router.get("/tickets/count", response_model=TicketCountResponse, summary="Get ticket counts")
async def get_ticket_counts(db: AsyncSession = Depends(get_db)):
    """
    Get counts of all tickets (total, used, and unused).
    """
    service = TicketService(db)
    counts = await service.get_ticket_counts()
    return counts

@router.get("/tickets/count/used", response_model=int, summary="Get count of used tickets")
async def get_used_tickets_count(db: AsyncSession = Depends(get_db)):
    """
    Get count of all tickets that have been used (is_used = True).
    """
    service = TicketService(db)
    counts = await service.get_ticket_counts()
    return counts["used"]

@router.get("/tickets/count/unused", response_model=int, summary="Get count of unused tickets")
async def get_unused_tickets_count(db: AsyncSession = Depends(get_db)):
    """
    Get count of all tickets that haven't been used (is_used = False).
    """
    service = TicketService(db)
    counts = await service.get_ticket_counts()
    return counts["unused"]

@router.get("/concerts/{concert_id}/tickets/count", response_model=TicketCountResponse, summary="Get ticket counts for a specific concert")
async def get_concert_ticket_counts(concert_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get counts of tickets (total, used, and unused) for a specific concert.
    """
    service = TicketService(db)
    counts = await service.get_ticket_counts(concert_id)
    return counts
