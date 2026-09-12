import os
import urllib.parse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import List, Optional,Set, Tuple, Dict
from sqlalchemy.future import select
from sqlalchemy import func, delete, insert, update

import re
from sqlalchemy import insert
from app.models.ticket import Ticket,TicketCategory as SA_TicketCategory
from app.models.concert import Concert
from app.schemas.ticket import TicketGenerateRequest, TicketScanRequest, TicketScanResponse
from app.utils.crypto import encrypt_data, decrypt_data
from urllib.parse import urlparse, parse_qs, unquote
from app.models.ticket import TicketCategory

# Ajoute en haut avec les autres imports
from fastapi import HTTPException
from sqlalchemy import update
import uuid



class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    
    async def generate_tickets(self, request: TicketGenerateRequest) -> List[Ticket]:
        """
        Format ticket :
        <2 lettres concert> + <2 lettres catégorie> + suffixe optionnel + <numéro 4 chiffres>

        Règles :
        - Même concert + même catégorie :
            → utiliser le préfixe déjà existant
            → continuer la numérotation
            → ne jamais créer de nouveau préfixe
        - Même concert + autre catégorie :
            → créer un préfixe unique automatiquement si collision
        """

        # 1) Récupérer concert
        concert_res = await self.db.execute(
            select(Concert).where(Concert.id == request.concert_id)
        )
        concert = concert_res.scalar_one_or_none()
        if not concert:
            raise ValueError("Concert not found")

        concert_code = (concert.code or "").strip().upper()[:2]

        # 2) Catégorie
        category_name = (
            request.category.value if hasattr(request.category, "value") else str(request.category)
        ).strip().upper()

        cat_prefix = (
            category_name[:2] if len(category_name) >= 2 else category_name.ljust(2, "X")
        )

        base_prefix = f"{concert_code}{cat_prefix}"

        # 3) Charger tous les tickets du même concert
        existing_res = await self.db.execute(
            select(Ticket.id, Ticket.category)
            .where(Ticket.concert_id == request.concert_id)
        )
        existing = existing_res.all()

        # 4) Vérifier si cette catégorie a DEJA des tickets
        existing_category_prefixes = set()
        last_number = 0

        for tid, tcat in existing:
            tcat_str = tcat.value if hasattr(tcat, "value") else str(tcat)

            # même catégorie
            if tcat_str.upper() == category_name:

                # EXTRAIRE le préfixe actuel sans les 4 chiffres
                prefix_used = tid[:-4]
                existing_category_prefixes.add(prefix_used)

                # prendre le dernier numéro utilisé
                numeric = tid[-4:]
                if numeric.isdigit():
                    last_number = max(last_number, int(numeric))

        # CAS 1 : mêmes catégorie + concert → utiliser le préfixe déjà existant
        if existing_category_prefixes:
            # prendre le tout premier préfixe utilisé (ex: MAEM, MAEMA…)
            final_prefix = sorted(existing_category_prefixes)[0]

        else:
            # CAS 2 : nouvelle catégorie pour ce concert
            # vérifier collisions avec autres catégories
            used_prefixes = {tid[:-4] for tid, _ in existing}

            final_prefix = base_prefix
            counter = 0

            while final_prefix in used_prefixes:
                final_prefix = f"{base_prefix}{chr(65 + counter)}"
                counter += 1

                if counter > 26:
                    raise ValueError("Impossible de créer un préfixe unique")

            last_number = 0  # nouvelle catégorie → numéro recommence à 1

        # 5) Génération des tickets
        generated = []

        for i in range(1, request.quantity + 1):
            number = last_number + i
            ticket_id = f"{final_prefix}{number:04d}"

            new_ticket = Ticket(
                id=ticket_id,
                concert_id=request.concert_id,
                is_used=False,
                qr_code_data=encrypt_data(ticket_id),
                category=request.category,
            )

            self.db.add(new_ticket)
            generated.append(new_ticket)

        # 6) Commit
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Failed to generate unique ticket IDs. Retry.")

        for t in generated:
            await self.db.refresh(t)

        return generated

    # -------------------------
    # Scan d'un ticket
    # -------------------------
    async def scan_ticket(self, req: TicketScanRequest) -> TicketScanResponse:
        if not req.selected_categories:
            return TicketScanResponse(
                ticket_id="UNKNOWN", is_valid=False,
                message="Aucune catégorie sélectionnée.",
                concert_title="N/A", concert_description="N/A"
            )

        # === 1) Normaliser & extraire des candidats d'ID ===
        raw = (req.qr_code_data or "").strip()
        candidates_id = []         # candidats pour Ticket.id
        candidates_qr_data = []    # candidats pour Ticket.qr_code_data (stocké chiffré)

        def push_unique(lst, val):
            if val and val not in lst:
                lst.append(val)

        # a) brut comme qr_code_data
        push_unique(candidates_qr_data, raw)

        # b) tenter decrypt -> id
        def try_decrypt(s: str) -> str | None:
            try:
                v = decrypt_data(s)
                v = v.strip()
                return v or None
            except Exception:
                return None

        dec = try_decrypt(raw)
        if dec:
            push_unique(candidates_id, dec)

        # c) si URL, extraire query et retenter
        def from_url(s: str):
            try:
                u = urlparse(s)
                if not u.scheme or not u.netloc:
                    return
                qs = parse_qs(u.query)
                keys = ["ticket_id", "id", "t", "k", "code"]
                for k in keys:
                    for val in qs.get(k, []):
                        val = unquote(val).strip()
                        if not val:
                            continue
                        push_unique(candidates_qr_data, val)     # peut être chiffré
                        d = try_decrypt(val)
                        if d:
                            push_unique(candidates_id, d)        # id en clair après déchiffrement
                        else:
                            # peut-être que le param est déjà un ID en clair
                            push_unique(candidates_id, val)
            except Exception:
                pass

        from_url(raw)

        # d) si la chaîne brute "ressemble" à un ID en clair (AAA0001)
        import re
        if re.fullmatch(r"[A-Za-z]{2,}\d{1,}", raw):
            push_unique(candidates_id, raw)

        # e) fallback : si rien en id, on tentera au moins via qr_code_data
        if not candidates_id and dec is None:
            # On peut encore tenter de trouver par qr_code_data ci-dessous
            pass

        # === 2) Lookup en DB ===
        ticket = concert = None

        # 2.1 par Ticket.id
        for cand in candidates_id:
            row = await self.db.execute(
                select(Ticket, Concert)
                .join(Concert, Ticket.concert_id == Concert.id, isouter=True)
                .where(Ticket.id == cand)
            )
            pair = row.first()
            if pair:
                ticket, concert = pair
                break

        # 2.2 sinon, par Ticket.qr_code_data (tel que scanné ou url-décodé)
        if ticket is None:
            for qv in candidates_qr_data:
                row = await self.db.execute(
                    select(Ticket, Concert)
                    .join(Concert, Ticket.concert_id == Concert.id, isouter=True)
                    .where(Ticket.qr_code_data == qv)
                )
                pair = row.first()
                if pair:
                    ticket, concert = pair
                    break

        if ticket is None:
            return TicketScanResponse(
                ticket_id="UNKNOWN",
                is_valid=False,
                message="Ticket introuvable.",
                concert_title="N/A",
                concert_description="N/A",
            )

        # === 3) Vérifications de règles ===
        # Catégorie autorisée ?
        allowed = {getattr(c, "value", str(c)).upper() for c in req.selected_categories}
        from app.models.ticket import TicketCategory as SA_TicketCategory
        tcat = ticket.category.value if isinstance(ticket.category, SA_TicketCategory) else str(ticket.category)
        tcat = (tcat or "").upper()
        if tcat not in allowed:
            return TicketScanResponse(
                ticket_id=ticket.id, is_valid=False,
                message="Catégorie non autorisée pour cette sélection.",
                concert_title=getattr(concert, "title", "N/A"),
                concert_description=getattr(concert, "description", "N/A"),
            )

        # Filtre concerts (optionnel)
        if req.selected_concert_ids is not None:
            if ticket.concert_id not in set(req.selected_concert_ids):
                return TicketScanResponse(
                    ticket_id=ticket.id, is_valid=False,
                    message="Concert non autorisé pour cette sélection.",
                    concert_title=getattr(concert, "title", "N/A"),
                    concert_description=getattr(concert, "description", "N/A"),
                )

        # Déjà utilisé ?
        if ticket.is_used:
            return TicketScanResponse(
                ticket_id=ticket.id, is_valid=False,
                message="Ticket déjà utilisé.",
                concert_title=getattr(concert, "title", "N/A"),
                concert_description=getattr(concert, "description", "N/A"),
            )

        # === 4) Marquer utilisé
        ticket.is_used = True
        self.db.add(ticket)
        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            return TicketScanResponse(
                ticket_id=ticket.id, is_valid=False,
                message="Erreur interne lors de la validation du ticket.",
                concert_title=getattr(concert, "title", "N/A"),
                concert_description=getattr(concert, "description", "N/A"),
            )
        await self.db.refresh(ticket)

        return TicketScanResponse(
            ticket_id=ticket.id, is_valid=True,
            message="Ticket valide. Bon concert!",
            concert_title=getattr(concert, "title", "N/A"),
            concert_description=getattr(concert, "description", "N/A"),
        )


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
        
    async def get_ticket_counts_by_category(self, concert_id: int) -> dict:
        """Retourne dynamiquement les catégories présentes dans la base pour un concert donné."""
        results = {}

        # Récupérer toutes les catégories existantes dans ce concert
        categories_result = await self.db.execute(
            select(Ticket.category).where(Ticket.concert_id == concert_id).distinct()
        )
        categories = [row[0] for row in categories_result.all()]

        for category in categories:
            base_query = select(func.count(Ticket.id)).where(
                Ticket.concert_id == concert_id,
                Ticket.category == category
            )

            total_result = await self.db.execute(base_query)
            total = total_result.scalar_one()

            used_result = await self.db.execute(base_query.where(Ticket.is_used == True))
            used = used_result.scalar_one()

            unused_result = await self.db.execute(base_query.where(Ticket.is_used == False))
            unused = unused_result.scalar_one()

            results[category] = {
                "total": total,
                "used": used,
                "unused": unused,
            }

        return results


    async def get_amount(self, concert_id: int) -> dict:
        """Get the amount of money made"""
        categories = ["VIP", "ADULT", "CHILD", "PREVENTE", "VENTELIVE",  "EMIFI_SANS_PRIX", "EMIFI_INV_50M_AR", "EMIFI_INV_30M_AR", "EMIFI_INV_10M_AR", "EMIFI_INV_7M_AR", "EMIFI_ANCIENS"]
        results = {}
        amount = {}

        for category in categories:
            base_query = select(func.count(Ticket.id)).where(
                Ticket.concert_id == concert_id,
                Ticket.category == category
            )

            # Used
            used_result = await self.db.execute(
                base_query.where(Ticket.is_used == True)
            )
            used = used_result.scalar_one()
            
            results[f"used_{category.lower()}"] = used
        
        # start
            
        # Add counts for specific ID range (MHL0731 to MHL0750)
        range_used_result = await self.db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.concert_id == concert_id,
                Ticket.id >= "MHL0731",
                Ticket.id <= "MHL0750",
                Ticket.is_used == True
            )
        )
        results["used_vvip"] = range_used_result.scalar_one()
        
        #amount = results["used_vvip"] * 100000 + (results["used_vip"] - results["used_vvip"]) * 50000 + results["used_child"] * 30000 + results["used_adult"] * 6000
        amount["total_amount"] = results["used_vvip"] * 100000 + (results["used_vip"] - results["used_vvip"]) * 50000 + results["used_child"] * 30000 + results["used_adult"] * 6000
        amount["amount_vip"] = (results["used_vip"] - results["used_vvip"]) * 50000
        amount["amount_couple"] = results["used_vvip"] * 100000
        amount["amount_adult"] = results["used_adult"] * 6000
        amount["amount_child"] = results["used_child"] * 30000
        # end

        return amount

    # Add these methods to the TicketService class
    async def get_last_tickets(self, concert_id: int, limit: int = 2500) -> List[Ticket]:
        """Get the last N tickets from a concert, ordered by ID descending."""
        result = await self.db.execute(
            select(Ticket)
            .where(Ticket.concert_id == concert_id)
            .order_by(Ticket.id.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def delete_last_tickets(self, concert_id: int, limit: int = 2500) -> int:
        """Delete the last N tickets from a concert and return count of deleted tickets."""
        # First get the tickets to delete
        tickets_to_delete = await self.get_last_tickets(concert_id, limit)
        
        if not tickets_to_delete:
            return 0
        
        # Delete the tickets
        await self.db.execute(
            delete(Ticket)
            .where(Ticket.id.in_([ticket.id for ticket in tickets_to_delete]))
        )
        
        await self.db.commit()
        return len(tickets_to_delete)
    
    async def get_ticket_categories_by_concert(self, concert_id: int) -> list[str]:
        """
        Retourne la liste des catégories disponibles pour un concert donné.
        (i.e. les catégories réellement utilisées dans la table Ticket)
        """
        result = await self.db.execute(
            select(Ticket.category).where(Ticket.concert_id == concert_id).distinct()
        )
        categories = [row[0] for row in result.all()]
        return [str(cat.value if hasattr(cat, "value") else cat) for cat in categories]
    
    async def get_tickets_in_range(self, concert_id: int, start_code: str, end_code: str):
        query = (
            select(Ticket)
            .where(Ticket.concert_id == concert_id)
        )

        result = await self.db.execute(query)
        tickets = result.scalars().all()

        # Trier alphabétiquement
        tickets_sorted = sorted(tickets, key=lambda t: t.id)

        # Garder ceux compris entre start et end
        filtered = [
            t for t in tickets_sorted
            if start_code <= t.id <= end_code
        ]

        return filtered


  
    async def regenerate_tickets(
        self,
        concert_id: int,
        start_code: str,
        end_code: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Ticket]:

            if not end_code:
                end_code = start_code

            # --- Extraire prefix + numéro ---
            m_start = re.match(r"([A-Za-z]+)(\d+)", start_code)
            m_end = re.match(r"([A-Za-z]+)(\d+)", end_code)

            if not m_start or not m_end:
                raise HTTPException(status_code=400, detail="Codes start/end invalides")

            prefix, start_num_str = m_start.groups()
            _, end_num_str = m_end.groups()

            start_num = int(start_num_str)
            end_num = int(end_num_str)
            num_len = len(start_num_str)

            # --- Optimisation : lecture SQL directe de la plage ---
            result = await self.db.execute(
                select(Ticket.id)
                .where(
                    Ticket.concert_id == concert_id,
                    Ticket.id >= start_code,
                    Ticket.id <= end_code
                )
            )

            existing_ids: Set[str] = {row[0] for row in result.all()}

            # --- Catégorie par défaut si absente ---
            if category is None:
                # petite requête rapide
                cat_res = await self.db.execute(
                    select(Ticket.category)
                    .where(Ticket.concert_id == concert_id)
                    .limit(1)
                )
                category = cat_res.scalar_one_or_none() or "VENTELIVE"

            # --- Générer uniquement les tickets manquants ---
            to_insert = []
            for n in range(start_num, end_num + 1):
                ticket_id = f"{prefix}{n:0{num_len}d}"

                if ticket_id not in existing_ids:
                    to_insert.append({
                        "id": ticket_id,
                        "concert_id": concert_id,
                        "is_used": False,
                        "qr_code_data": encrypt_data(ticket_id),
                        "category": category
                    })

            # --- Insertions en bulk ---
            if to_insert:
                await self.db.execute(insert(Ticket), to_insert)
                await self.db.commit()

            # --- Relecture optimisée de la plage complète ---
            result = await self.db.execute(
                select(Ticket)
                .where(
                    Ticket.id >= start_code,
                    Ticket.id <= end_code,
                    Ticket.concert_id == concert_id
                )
                .order_by(Ticket.id.asc())
            )
            return result.scalars().all()


    async def delete_tickets(self, concert_id: int, start_code: str, end_code: str):
    
        tickets = await self.get_tickets_in_range(concert_id, start_code, end_code)

        if not tickets:
            raise HTTPException(status_code=404, detail="Aucun ticket trouvé dans cette plage.")

        for ticket in tickets:
            await self.db.delete(ticket)

        await self.db.commit()

        return {"deleted": len(tickets), "status": "ok"}


    async def get_last_ticket_and_total_by_category(self, concert_id: int, category: str) -> dict:
        result = await self.db.execute(
            select(Ticket)
            .where(Ticket.concert_id == concert_id, Ticket.category == category)
            .order_by(Ticket.id.asc())  # récupérer tous pour calcul du total
        )
        tickets = result.scalars().all()

        if not tickets:
            return {"last_ticket_id": None, "total_tickets": 0, "concert_id": concert_id, "category": category}

        last_ticket = tickets[-1]  # dernier ticket existant
        total = len(tickets)

        return {
            "last_ticket_id": last_ticket.id,
            "total_tickets": total,
            "concert_id": concert_id,
            "category": category
        }