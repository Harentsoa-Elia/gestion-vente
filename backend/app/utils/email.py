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


def envoyer_email(destinataire: str, sujet: str, texte: str, html: Optional[str] = None) -> None:
    """Envoie un e-mail (bloquant : à appeler via run_in_threadpool ou BackgroundTasks)."""
    c = _config()
    if not envoi_configure():
        print(
            "\n----- E-MAIL (non envoyé : SMTP_USER / SMTP_PASSWORD absents de backend/.env) -----\n"
            f"À : {destinataire}\nSujet : {sujet}\n\n{texte}\n"
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


def envoyer_email_sans_erreur(destinataire: str, sujet: str, texte: str, html: Optional[str] = None) -> None:
    """Pour les tâches de fond : une erreur d'envoi est journalisée, jamais levée."""
    try:
        envoyer_email(destinataire, sujet, texte, html)
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
