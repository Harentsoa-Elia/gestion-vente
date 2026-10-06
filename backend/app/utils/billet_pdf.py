"""Billets électroniques : QR code (PNG) et billet PDF aux couleurs guichetweb.

Le QR code contient la valeur enregistrée dans billets.qr_code : c'est elle que lit
le contrôle à l'entrée (POST /organisateur/evenements/{id}/scanner), qui refuse un billet déjà utilisé.
"""
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from io import BytesIO
from typing import List, Optional

import qrcode
from fpdf import FPDF
from PIL import Image, ImageOps

from app.utils.media import MEDIA_DIR, PREFIXE_URL

from app.utils.fuseau import FUSEAU_MADAGASCAR as FUSEAU

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
    # fond d'image (/media/fonds/...) : celui du tarif, sinon celui du type d'événement
    fond: Optional[str] = None


@lru_cache(maxsize=32)
def _fond_recadre(url: str, ratio: float) -> Optional[bytes]:
    """Image de fond recadrée au format du billet (comme « cover » en CSS), en JPEG ; None si illisible."""
    if not url or not url.startswith(PREFIXE_URL + "/"):
        return None
    chemin = (MEDIA_DIR / url[len(PREFIXE_URL) + 1:]).resolve()
    if MEDIA_DIR.resolve() not in chemin.parents or not chemin.is_file():
        return None
    try:
        image = Image.open(chemin).convert("RGB")
    except OSError:
        return None
    largeur = min(image.width, int(image.height * ratio))
    hauteur = int(largeur / ratio)
    image = ImageOps.fit(image, (largeur, hauteur))
    image.thumbnail((1400, 1400))
    tampon = BytesIO()
    image.save(tampon, "JPEG", quality=85)
    return tampon.getvalue()


def _dessiner_fond(pdf: FPDF, url: Optional[str], x: float, y: float, l: float, h: float) -> bool:
    contenu = _fond_recadre(url, round(l / h, 3)) if url else None
    if not contenu:
        return False
    pdf.image(BytesIO(contenu), x=x, y=y, w=l, h=h)
    return True


def date_francaise(d: datetime) -> str:
    """'samedi 21 novembre 2026 à 21h00', à l'heure de Madagascar."""
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
    remplacements = {"\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u202f": " ", "\u00a0": " ", "\u0153": "oe", "\u0152": "OE"}
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

        # fond (image du tarif ou du type d'événement, sinon couleur guichetweb) et carte
        pdf.set_fill_color(*FOND)
        pdf.rect(0, 0, l, h, style="F")
        avec_fond = _dessiner_fond(pdf, b.fond, 0, 0, l, h)
        pdf.set_fill_color(255, 255, 255)
        # sur une image, la carte devient un voile blanc : le fond reste visible, le texte lisible
        with pdf.local_context(fill_opacity=0.84 if avec_fond else 1):
            pdf.rect(10, 10, l - 20, h - 20, style="F", round_corners=True, corner_radius=6)
        if avec_fond:
            # zone du QR code toujours blanche et opaque : il doit rester lisible par la caméra
            pdf.rect(142, 41, 58, 58, style="F", round_corners=True, corner_radius=3)

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
        pdf.cell(80, 10, _latin1(f"Billet {i} sur {len(billets)}  -  {b.numero}"), align="R")

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


# ---------- planche A4 à découper (billets hors ligne imprimés par l'organisateur) ----------

PLANCHE_COLONNES, PLANCHE_LIGNES = 3, 6
BILLET_L, BILLET_H = 63.0, 44.0  # mm
ECART_X, ECART_Y = 3.0, 2.6


def _tronquer(pdf: FPDF, texte: str, largeur: float) -> str:
    texte = _latin1(texte)
    if pdf.get_string_width(texte) <= largeur:
        return texte
    while texte and pdf.get_string_width(texte + "...") > largeur:
        texte = texte[:-1]
    return texte.rstrip() + "..."


def date_courte(d: datetime) -> str:
    """« sam. 21 nov. 2026 - 21h00 », à l'heure de Madagascar."""
    if d.tzinfo is not None:
        d = d.astimezone(FUSEAU)
    mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][d.month - 1]
    return f"{JOURS[d.weekday()][:3]}. {d.day} {mois} {d.year} - {d.hour:02d}h{d.minute:02d}"


def generer_planche_billets(billets: List[InfosBillet], pied: str = "") -> bytes:
    """18 billets de 63 x 44 mm par page A4, avec traits de coupe : pour imprimer des billets à vendre ou à offrir."""
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.set_title("Billets guichetweb à découper")
    pdf.set_author("guichetweb")
    par_page = PLANCHE_COLONNES * PLANCHE_LIGNES
    marge_x = (pdf.w - (PLANCHE_COLONNES * BILLET_L + (PLANCHE_COLONNES - 1) * ECART_X)) / 2
    marge_y = 8.0
    pages = (len(billets) + par_page - 1) // par_page

    for i, b in enumerate(billets):
        if i % par_page == 0:
            pdf.add_page()
            page = i // par_page + 1
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(*DOUX)
            pdf.set_xy(marge_x, pdf.h - 7)
            pdf.cell(pdf.w - 2 * marge_x, 4, _latin1(f"guichetweb  -  {pied}  -  page {page} sur {pages}  -  découpez en suivant les pointillés".replace("  -  -", "  -")), align="C")
        k = i % par_page
        x = marge_x + (k % PLANCHE_COLONNES) * (BILLET_L + ECART_X)
        y = marge_y + (k // PLANCHE_COLONNES) * (BILLET_H + ECART_Y)

        # fond du billet : image recadrée, voile blanc sur le texte, QR code sur blanc opaque
        qr = 25.0
        qx, qy = x + BILLET_L - qr - 2.5, y + 4.5
        if _dessiner_fond(pdf, b.fond, x, y, BILLET_L, BILLET_H):
            pdf.set_fill_color(255, 255, 255)
            with pdf.local_context(fill_opacity=0.82):
                pdf.rect(x + 3.2, y + 2.2, qx - x - 4.4, BILLET_H - 4.4, style="F", round_corners=True, corner_radius=1.5)
            pdf.rect(qx - 1.2, qy - 1.2, qr + 2.4, qr + 7.2, style="F", round_corners=True, corner_radius=1.5)

        # contour de découpe
        pdf.set_draw_color(*LAVANDE)
        pdf.set_line_width(0.25)
        pdf.set_dash_pattern(dash=1.2, gap=1)
        pdf.rect(x, y, BILLET_L, BILLET_H)
        pdf.set_dash_pattern()
        # bandeau gauche violet / rose
        pdf.set_fill_color(*VIOLET)
        pdf.rect(x, y, 2.2, BILLET_H * 0.65, style="F")
        pdf.set_fill_color(*ROSE)
        pdf.rect(x, y + BILLET_H * 0.65, 2.2, BILLET_H * 0.35, style="F")

        # QR code à droite
        pdf.image(BytesIO(qr_png(b.qr, taille_module=6)), x=qx, y=qy, w=qr, h=qr)
        pdf.set_font("Helvetica", "B", 6.3)
        pdf.set_text_color(*NUIT)
        pdf.set_xy(qx - 2, qy + qr + 0.5)
        pdf.cell(qr + 4, 3, _latin1(b.numero), align="C")
        if b.utilise:
            pdf.set_text_color(*ROSE)
            pdf.set_xy(qx - 2, qy + qr + 3.6)
            pdf.cell(qr + 4, 3, _latin1("déjà utilisé"), align="C")

        # textes à gauche
        tx, tl = x + 4.5, BILLET_L - qr - 9.5
        pdf.set_font("Helvetica", "B", 6.5)
        pdf.set_text_color(*ROSE)
        pdf.set_xy(tx, y + 3.5)
        pdf.cell(tl, 3, "guichetweb")
        pdf.set_font("Helvetica", "B", 8.2)
        pdf.set_text_color(*NUIT)
        titre = pdf.multi_cell(tl, 3.6, _latin1(b.evenement), dry_run=True, output="LINES")
        if len(titre) > 2:  # deux lignes au plus
            titre = [titre[0], _tronquer(pdf, " ".join(titre[1:]), tl)]
        for n, ligne in enumerate(titre):
            pdf.set_xy(tx, y + 7.5 + n * 3.6)
            pdf.cell(tl, 3.6, ligne)
        yy = y + 8.5 + len(titre) * 3.6
        lignes = [
            (6.2, "", DOUX, date_courte(b.date_debut)),
            (6.2, "", DOUX, b.lieu or "Lieu communiqué par l'organisateur"),
            (7.4, "B", NUIT, f"{b.categorie}"),
            (7.4, "B", VIOLET, prix_ariary(b.prix) if b.prix > 0 else "Invitation"),
            (5.8, "", DOUX, b.participant),
        ]
        for taille, style, couleur, texte in lignes:
            pdf.set_font("Helvetica", style, taille)
            pdf.set_text_color(*couleur)
            pdf.set_xy(tx, yy)
            pdf.cell(tl, 3.2, _tronquer(pdf, texte, tl))
            yy += 3.6 if taille > 7 else 3.3
        pdf.set_font("Helvetica", "", 5)
        pdf.set_text_color(*DOUX)
        pdf.set_xy(tx, y + BILLET_H - 4.2)
        pdf.cell(BILLET_L - 7, 3, _latin1("Valable pour une seule entrée."))

    return bytes(pdf.output())
