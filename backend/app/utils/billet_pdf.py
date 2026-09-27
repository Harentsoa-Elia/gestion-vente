"""Billets électroniques : QR code (PNG) et billet PDF aux couleurs guichetweb.

Le QR code contient la valeur enregistrée dans billets.qr_code : c'est elle que lit
le contrôle à l'entrée (POST /tickets/scan), qui refuse un billet déjà utilisé.
"""
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from typing import List, Optional
from zoneinfo import ZoneInfo

import qrcode
from fpdf import FPDF

FUSEAU = ZoneInfo("Indian/Antananarivo")
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

VIOLET = (108, 92, 231)
ROSE = (201, 42, 122)
NUIT = (30, 26, 60)
DOUX = (110, 105, 135)
FOND = (246, 244, 252)
LAVANDE = (217, 210, 255)


@dataclass
class InfosBillet:
    numero: str
    qr: str
    evenement: str
    date_debut: datetime
    lieu: Optional[str]
    categorie: str
    prix: float
    participant: str
    utilise: bool = False


def date_francaise(d: datetime) -> str:
    """« samedi 21 novembre 2026 à 21h00 », à l'heure de Madagascar."""
    if d.tzinfo is not None:
        d = d.astimezone(FUSEAU)
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]} {d.year} à {d.hour:02d}h{d.minute:02d}"


def prix_ariary(montant: float) -> str:
    return f"{int(round(montant)):,}".replace(",", " ") + " Ar"


def qr_png(valeur: str, taille_module: int = 10) -> bytes:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=taille_module, border=2)
    qr.add_data(valeur)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#1E1A3C", back_color="white")
    tampon = BytesIO()
    image.save(tampon, format="PNG")
    return tampon.getvalue()


def _latin1(texte: str) -> str:
    """Les polices intégrées du PDF ne couvrent que le latin-1 : on remplace le reste."""
    remplacements = {"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", " ": " ", " ": " ", "œ": "oe", "Œ": "OE"}
    for a, b in remplacements.items():
        texte = texte.replace(a, b)
    return texte.encode("latin-1", "replace").decode("latin-1")


def generer_pdf_billets(billets: List[InfosBillet]) -> bytes:
    """Un billet par page (format A5 paysage), prêt à imprimer ou à montrer sur un téléphone."""
    pdf = FPDF(orientation="L", unit="mm", format="A5")
    pdf.set_auto_page_break(False)
    pdf.set_title("Billets guichetweb")
    pdf.set_author("guichetweb")

    for i, b in enumerate(billets, start=1):
        pdf.add_page()
        l, h = pdf.w, pdf.h  # 210 x 148

        # fond et carte
        pdf.set_fill_color(*FOND)
        pdf.rect(0, 0, l, h, style="F")
        pdf.set_fill_color(255, 255, 255)
        pdf.rect(10, 10, l - 20, h - 20, style="F", round_corners=True, corner_radius=6)

        # bandeau : violet puis rose
        pdf.set_fill_color(*NUIT)
        pdf.rect(10, 10, l - 20, 22, style="F", round_corners=("TOP_LEFT", "TOP_RIGHT"), corner_radius=6)
        pdf.set_fill_color(*VIOLET)
        pdf.rect(10, 30, l - 20, 2, style="F")
        pdf.set_fill_color(*ROSE)
        pdf.rect(10 + (l - 20) * 0.65, 30, (l - 20) * 0.35, 2, style="F")
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_xy(18, 15)
        pdf.cell(80, 10, "guichetweb")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(l - 98, 15)
        pdf.cell(80, 10, _latin1(f"Billet {i} sur {len(billets)}  ·  {b.numero}".replace("·", "-")), align="R")

        # informations (colonne gauche)
        x, largeur = 18, 112
        pdf.set_text_color(*ROSE)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(x, 40)
        pdf.cell(largeur, 5, _latin1("BILLET ÉLECTRONIQUE"))
        pdf.set_text_color(*NUIT)
        pdf.set_font("Helvetica", "B", 17)
        pdf.set_xy(x, 46)
        pdf.multi_cell(largeur, 7.5, _latin1(b.evenement), align="L")

        y = max(pdf.get_y() + 3, 62)
        lignes = [
            ("Date", date_francaise(b.date_debut).capitalize()),
            ("Lieu", b.lieu or "Communiqué par l'organisateur"),
            ("Billet", f"{b.categorie}  -  {prix_ariary(b.prix)}"),
            ("Au nom de", b.participant),
        ]
        for etiquette, valeur in lignes:
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*DOUX)
            pdf.set_xy(x, y)
            pdf.cell(largeur, 4, _latin1(etiquette.upper()))
            pdf.set_font("Helvetica", "B", 10.5)
            pdf.set_text_color(*NUIT)
            pdf.set_xy(x, y + 4)
            pdf.multi_cell(largeur, 5, _latin1(valeur), align="L")
            y = pdf.get_y() + 2.5

        # séparation perforée
        pdf.set_draw_color(*LAVANDE)
        pdf.set_dash_pattern(dash=1.5, gap=1.5)
        pdf.line(138, 38, 138, h - 22)
        pdf.set_dash_pattern()

        # QR code (colonne droite)
        pdf.image(BytesIO(qr_png(b.qr)), x=145, y=44, w=52, h=52)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*NUIT)
        pdf.set_xy(142, 98)
        pdf.cell(58, 5, _latin1(b.numero), align="C")
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*DOUX)
        pdf.set_xy(142, 103)
        pdf.multi_cell(58, 3.6, _latin1("Présentez ce QR code à l'entrée, sur votre téléphone ou imprimé."), align="C")

        if b.utilise:
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*ROSE)
            pdf.set_xy(142, 112)
            pdf.cell(58, 5, _latin1("Déjà utilisé à l'entrée"), align="C")

        # pied
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*DOUX)
        pdf.set_xy(18, h - 20)
        pdf.cell(
            l - 36,
            5,
            _latin1("Valable pour une seule entrée. Ne partagez pas ce QR code : le premier scanné est le seul accepté."),
        )

    return bytes(pdf.output())
