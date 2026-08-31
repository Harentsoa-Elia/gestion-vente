import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.ticket import Ticket
from app.models.concert import Concert
from app.schemas.ticket import TicketGenerateRequest, TicketScanRequest, TicketScanResponse
from typing import List
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
import urllib.parse # Added import for URL parsing

class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_tickets(self, request: TicketGenerateRequest) -> List[Ticket]:
        """Generates a specified quantity of tickets for a given concert."""
        concert_result = await self.db.execute(
            select(Concert).where(Concert.id == request.concert_id)
        )
        concert = concert_result.scalar_one_or_none()
        if not concert:
            raise ValueError("Concert not found")

        prefix = concert.code
        existing_ids_result = await self.db.execute(
            select(func.max(Ticket.id)).where(Ticket.id.like(f"{prefix}%"))
        )
        max_existing_id = existing_ids_result.scalar_one()
        if max_existing_id and max_existing_id.startswith(prefix):
            try:
                last_number = int(max_existing_id[len(prefix):])
            except ValueError:
                last_number = 0
        else:
            last_number = 0

        generated_tickets = []
        for i in range(1, request.quantity + 1):
            ticket_number = last_number + i
            ticket_id = f"{prefix}{ticket_number:04d}"
            db_ticket = Ticket(
                id=ticket_id,
                concert_id=request.concert_id,
                is_used=False,
                qr_code_data=ticket_id,
                category=request.category.value
            )
            self.db.add(db_ticket)
            generated_tickets.append(db_ticket)

        try:
            await self.db.commit()
            for ticket in generated_tickets:
                await self.db.refresh(ticket)
            return generated_tickets
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Failed to generate unique ticket IDs. Please try again.")

    async def scan_ticket(self, request: TicketScanRequest) -> TicketScanResponse:
        # The incoming qr_code_data will be the full URL from the QR scan
        scanned_data = request.qr_code_data

        # Extract the ticket ID from the URL
        parsed_url = urllib.parse.urlparse(scanned_data)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        ticket_id_from_url = query_params.get('id', [None])[0]

        # If the scanned data is not a URL with an 'id' parameter, assume it's just the ticket ID
        if not ticket_id_from_url:
            actual_ticket_id = scanned_data
        else:
            actual_ticket_id = ticket_id_from_url

        result = await self.db.execute(
            select(Ticket, Concert)
            .join(Concert, Ticket.concert_id == Concert.id)
            .filter(Ticket.id == actual_ticket_id) # Filter by the extracted ticket ID
        )
        ticket_and_concert = result.first()

        if not ticket_and_concert:
            return TicketScanResponse(
                ticket_id=actual_ticket_id,
                is_valid=False,
                message="Ticket not found.",
                concert_title="N/A",
                concert_description="N/A"
            )

        ticket, concert = ticket_and_concert

        if ticket.is_used:
            return TicketScanResponse(
                ticket_id=ticket.id,
                is_valid=False,
                message="Ticket déja utilisé.",
                concert_title=concert.title,
                concert_description=concert.description
            )

        ticket.is_used = True
        await self.db.commit()
        await self.db.refresh(ticket)
        return TicketScanResponse(
            ticket_id=ticket.id,
            is_valid=True,
            message="Ticket valide. Bon concert!",
            concert_title=concert.title,
            concert_description=concert.description
        )
      
    # Add to services/ticket_service.py
    async def get_ticket_counts(self, concert_id: int = None) -> dict:
        """Get counts of used, unused, and total tickets, optionally filtered by concert_id."""
        base_query = select(func.count(Ticket.id))
        
        if concert_id:
            base_query = base_query.where(Ticket.concert_id == concert_id)
        
        # Get total count
        total_result = await self.db.execute(base_query)
        total = total_result.scalar_one()
        
        # Get used count
        used_result = await self.db.execute(base_query.where(Ticket.is_used == True))
        used = used_result.scalar_one()
        
        # Get unused count
        unused_result = await self.db.execute(
            base_query.where(Ticket.is_used == False))
        unused = unused_result.scalar_one()
        
        return {
            "total": total,
            "used": used,
            "unused": unused
        }
