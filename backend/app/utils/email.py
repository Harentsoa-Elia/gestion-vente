"""Envoi des e-mails de guichetweb (codes de vérification, mot de passe oublié, et plus tard billets).

Configuration dans backend/.env :
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=votre.adresse@gmail.com
    SMTP_PASSWORD=motdepasseapplication   (mot de passe d'application Gmail, 16 lettres)
    SMTP_FROM_NAME=guichetweb             (facultatif)

Sans SMTP_USER / SMTP_PASSWORD (développement), rien n'est envoyé : le message
est affiché dans le terminal d'uvicorn, ce qui permet de tester sans compte e-mail.
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("guichetweb.email")


class EnvoiImpossible(RuntimeError):
    pass


def _config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        # Gmail affiche le mot de passe d'application par groupes de 4 : on retire les espaces
        "password": os.getenv("SMTP_PASSWORD", "").replace(" ", ""),
        "from_name": os.getenv("SMTP_FROM_NAME", "guichetweb"),
        # Nom annoncé au serveur (EHLO). Par défaut Python prend le nom réseau de l'ordinateur,
        # que certaines box donnent sous une forme refusée par Gmail
        # (ex. « DESKTOP-XXX.flybox.home,airbox.home » -> erreur 501 5.5.4).
        "local_hostname": os.getenv("SMTP_LOCAL_HOSTNAME", "localhost").strip() or "localhost",
    }


def envoi_configure() -> bool:
    c = _config()
    return bool(c["user"] and c["password"])


def envoyer_email(
    destinataire: str,
    sujet: str,
    texte: str,
    html: Optional[str] = None,
    pieces_jointes: Optional[list] = None,
    images_inline: Optional[list] = None,
) -> None:
    """Envoie un e-mail (bloquant : à appeler via run_in_threadpool ou BackgroundTasks).

    pieces_jointes : [(nom_fichier, contenu_bytes, "application/pdf"), ...]
    images_inline  : [(cid, contenu_png), ...] affichées dans le HTML avec <img src="cid:...">
    """
    c = _config()
    if not envoi_configure():
        jointes = ", ".join(nom for nom, _, _ in (pieces_jointes or [])) or "aucune"
        print(
            "\n----- E-MAIL (non envoyé : SMTP_USER / SMTP_PASSWORD absents de backend/.env) -----\n"
            f"À : {destinataire}\nSujet : {sujet}\nPièces jointes : {jointes}\n\n{texte}\n"
            "-------------------------------------------------------------------------------\n",
            flush=True,
        )
        return

    message = EmailMessage()
    message["Subject"] = sujet
    message["From"] = formataddr((c["from_name"], c["user"]))
    message["To"] = destinataire
    message.set_content(texte)
    if html:
        message.add_alternative(html, subtype="html")
        if images_inline:
            partie_html = message.get_payload()[-1]
            for cid, png in images_inline:
                partie_html.add_related(png, maintype="image", subtype="png", cid=f"<{cid}>")
    for nom, contenu, type_mime in pieces_jointes or []:
        principal, secondaire = type_mime.split("/", 1)
        message.add_attachment(contenu, maintype=principal, subtype=secondaire, filename=nom)

    try:
        contexte = ssl.create_default_context()
        if c["port"] == 465:
            with smtplib.SMTP_SSL(c["host"], c["port"], local_hostname=c["local_hostname"], context=contexte, timeout=20) as smtp:
                smtp.login(c["user"], c["password"])
                smtp.send_message(message)
        else:
            with smtplib.SMTP(c["host"], c["port"], local_hostname=c["local_hostname"], timeout=20) as smtp:
                smtp.starttls(context=contexte)
                smtp.login(c["user"], c["password"])
                smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as e:
        logger.error("SMTP : identifiants refusés (%s)", e)
        raise EnvoiImpossible("Le serveur e-mail a refusé les identifiants (vérifiez SMTP_USER et SMTP_PASSWORD).") from e
    except (smtplib.SMTPException, OSError) as e:
        logger.error("SMTP : envoi impossible (%s)", e)
        raise EnvoiImpossible("L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.") from e


def envoyer_email_sans_erreur(destinataire: str, sujet: str, texte: str, html: Optional[str] = None, **options) -> None:
    """Pour les tâches de fond : une erreur d'envoi est journalisée, jamais levée."""
    try:
        envoyer_email(destinataire, sujet, texte, html, **options)
    except EnvoiImpossible as e:
        print(f"[guichetweb] E-mail non envoyé à {destinataire} : {e}", flush=True)


# ---------- modèles d'e-mails ----------

def _gabarit_html(titre: str, intro: str, code: str, pied: str) -> str:
    chiffres = "".join(
        f'<td style="width:34px;height:46px;border-radius:9px;background:#F6F4FC;border:2px solid #D9D2FF;'
        f'color:#1E1A3C;font-size:24px;font-weight:700;font-family:Arial,sans-serif;text-align:center">{escape(c)}</td>'
        for c in code
    )
    return f"""\
<!doctype html>
<html lang="fr"><body style="margin:0;background:#F6F4FC;font-family:Arial,Helvetica,sans-serif;color:#1E1A3C">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden">
        <tr><td style="background:#1E1A3C;background-image:linear-gradient(135deg,#1E1A3C,#6C5CE7 60%,#C92A7A);padding:22px 28px">
          <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px">guichetweb</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1E1A3C">{escape(titre)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#4A4566">{escape(intro)}</p>
          <!-- tableau : les 6 chiffres restent sur une ligne même sur un petit écran -->
          <table role="presentation" cellpadding="0" cellspacing="4" align="center" style="margin:0 auto 22px"><tr>{chiffres}</tr></table>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6E6987">{escape(pied)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#6E6987">guichetweb, billetterie événementielle</p>
    </td></tr>
  </table>
</body></html>"""


def email_code_verification(prenom: str, code: str) -> tuple[str, str, str]:
    sujet = f"{code} est votre code de confirmation guichetweb"
    intro = f"Bonjour {prenom}, voici le code pour confirmer votre adresse e-mail. C'est à cette adresse que vous recevrez vos billets."
    pied = "Ce code est valable 15 minutes. Si vous n'avez pas créé de compte sur guichetweb, ignorez simplement cet e-mail."
    texte = f"{intro}\n\nCode : {code}\n\n{pied}\n"
    return sujet, texte, _gabarit_html("Confirmez votre adresse e-mail", intro, code, pied)


def email_code_reinitialisation(prenom: str, code: str) -> tuple[str, str, str]:
    sujet = f"{code} est votre code pour changer de mot de passe"
    intro = f"Bonjour {prenom}, vous avez demandé à changer votre mot de passe guichetweb. Saisissez ce code sur le site."
    pied = "Ce code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé."
    texte = f"{intro}\n\nCode : {code}\n\n{pied}\n"
    return sujet, texte, _gabarit_html("Mot de passe oublié", intro, code, pied)


# ---------- messages (sans code) ----------

def lien_site(chemin: str) -> str:
    """Adresse complète d'une page du site (SITE_URL dans backend/.env, par défaut le site local)."""
    base = os.getenv("SITE_URL", "http://localhost:4000").rstrip("/")
    return f"{base}{chemin}"


def _gabarit_message(titre: str, paragraphes: list, bouton: Optional[tuple] = None, encadre: Optional[str] = None) -> str:
    corps = "".join(
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#4A4566">{escape(p)}</p>' for p in paragraphes
    )
    if encadre:
        corps += (
            '<div style="margin:4px 0 18px;padding:14px 16px;border-radius:12px;background:#FDE8F2;'
            f'color:#8A1D55;font-size:14px;line-height:1.5"><strong>Motif :</strong> {escape(encadre)}</div>'
        )
    if bouton:
        libelle, url = bouton
        corps += (
            f'<p style="margin:8px 0 0"><a href="{escape(url)}" style="display:inline-block;padding:12px 22px;'
            'border-radius:999px;background:#C92A7A;color:#FFFFFF;font-weight:700;font-size:14px;'
            f'text-decoration:none">{escape(libelle)}</a></p>'
        )
    return f"""\
<!doctype html>
<html lang="fr"><body style="margin:0;background:#F6F4FC;font-family:Arial,Helvetica,sans-serif;color:#1E1A3C">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden">
        <tr><td style="background:#1E1A3C;background-image:linear-gradient(135deg,#1E1A3C,#6C5CE7 60%,#C92A7A);padding:22px 28px">
          <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px">guichetweb</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 14px;font-size:22px;color:#1E1A3C">{escape(titre)}</h1>
          {corps}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#6E6987">guichetweb, billetterie événementielle</p>
    </td></tr>
  </table>
</body></html>"""


def email_decision_evenement(prenom: str, titre_evenement: str, valide: bool, motif: Optional[str], lien: str) -> tuple:
    if valide:
        sujet = f"« {titre_evenement} » est validé et visible sur guichetweb"
        titre = "Votre événement est validé"
        paragraphes = [
            f"Bonjour {prenom}, bonne nouvelle : l'administrateur a validé « {titre_evenement} ».",
            "Il apparaît maintenant sur le site public, et le public peut réserver ses billets.",
        ]
        encadre = None
    else:
        sujet = f"« {titre_evenement} » n'a pas été validé"
        titre = "Votre événement n'a pas été validé"
        paragraphes = [
            f"Bonjour {prenom}, l'administrateur n'a pas validé « {titre_evenement} » pour l'instant.",
            "Corrigez-le depuis votre espace organisateur, puis soumettez-le à nouveau.",
        ]
        encadre = motif
    texte = "\n\n".join(paragraphes + ([f"Motif : {motif}"] if (motif and not valide) else []) + [f"Voir l'événement : {lien}"]) + "\n"
    html = _gabarit_message(titre, paragraphes, ("Voir mon événement", lien), encadre)
    return sujet, texte, html


def email_billets(prenom: str, evenement: str, date_texte: str, lieu: Optional[str], billets: list, lien: str) -> tuple:
    """billets : [(numero, categorie, cid_qr), ...] ; les QR codes sont joints en images inline (cid)."""
    n = len(billets)
    sujet = f"Vos billets pour « {evenement} »" if n > 1 else f"Votre billet pour « {evenement} »"
    intro = [
        f"Bonjour {prenom}, merci pour votre réservation ! Votre paiement est confirmé.",
        f"{evenement} : {date_texte}" + (f", {lieu}." if lieu else "."),
        (f"Voici vos {n} billets" if n > 1 else "Voici votre billet")
        + " : présentez le QR code à l'entrée, sur votre téléphone ou imprimé. Le billet PDF est aussi en pièce jointe.",
    ]
    blocs = "".join(
        f'<div style="margin:0 0 14px;padding:16px;border-radius:14px;background:#F6F4FC;text-align:center">'
        f'<img src="cid:{escape(cid)}" width="170" height="170" alt="QR code du billet {escape(numero)}" style="display:block;margin:0 auto 8px;border-radius:8px;background:#fff">'
        f'<div style="font-size:14px;font-weight:700;color:#1E1A3C">{escape(numero)}</div>'
        f'<div style="font-size:13px;color:#6E6987">{escape(categorie)}</div></div>'
        for numero, categorie, cid in billets
    )
    html = _gabarit_message("Votre billet est prêt" if n == 1 else "Vos billets sont prêts", intro, ("Voir mes billets", lien))
    # les QR codes s'insèrent juste avant le bouton
    html = html.replace('<p style="margin:8px 0 0"><a href=', blocs + '<p style="margin:8px 0 0"><a href=', 1)
    texte = "\n\n".join(intro + [f"Billet {numero} ({categorie})" for numero, categorie, _ in billets] + [f"Vos billets : {lien}"]) + "\n"
    return sujet, texte, html
