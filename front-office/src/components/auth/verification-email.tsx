"use client"

import { useEffect, useState } from "react"
import { MailCheck, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { confirmerEmail, envoyerCodeVerification } from "@/services/compteService"
import { BoutonAuth, MessageErreur } from "./cadre-auth"
import { SaisieCode } from "./saisie-code"

/*
 * Confirmation de l'adresse e-mail du participant avec le code à 6 chiffres reçu.
 * Utilisé après l'inscription (/participants/verifier-email) et dans la réservation
 * quand l'adresse n'est pas encore confirmée.
 */

const DELAI_RENVOI = 60

export function VerificationEmail({
  email,
  onConfirme,
  envoyerAuDemarrage = false,
}: {
  email?: string
  onConfirme: () => void
  /** Envoyer un code dès l'affichage (ex. dans la réservation : aucun code n'a encore été demandé) */
  envoyerAuDemarrage?: boolean
}) {
  const [code, setCode] = useState("")
  const [envoi, setEnvoi] = useState(false)
  const [verification, setVerification] = useState(false)
  const [erreur, setErreur] = useState("")
  // secondes avant de pouvoir redemander un code (l'inscription vient d'en envoyer un)
  const [attente, setAttente] = useState(envoyerAuDemarrage ? 0 : DELAI_RENVOI)

  useEffect(() => {
    if (attente <= 0) return
    const t = window.setTimeout(() => setAttente((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [attente])

  const renvoyer = async (silencieux = false) => {
    setEnvoi(true)
    setErreur("")
    try {
      const r = await envoyerCodeVerification()
      if (r.email_verifie) {
        onConfirme()
        return
      }
      if (!silencieux) toast.success(r.message)
      setAttente(DELAI_RENVOI)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Le code n'a pas pu être envoyé."
      // « Patientez 42 s… » : on reprend le compte à rebours du serveur
      const secondes = Number(message.match(/(\d+)\s*s\b/)?.[1])
      if (secondes) setAttente(secondes)
      else setErreur(message)
    } finally {
      setEnvoi(false)
    }
  }

  useEffect(() => {
    if (envoyerAuDemarrage) renvoyer(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verifier = async (valeur = code) => {
    if (valeur.length !== 6 || verification) return
    setVerification(true)
    setErreur("")
    try {
      await confirmerEmail(valeur)
      toast.success("Adresse e-mail confirmée. Vous pouvez réserver vos billets.")
      onConfirme()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Code incorrect.")
      setCode("")
    } finally {
      setVerification(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        verifier()
      }}
      className="mx-auto max-w-sm space-y-5"
    >
      <p className="flex items-start gap-3 rounded-2xl bg-gw-fond px-4 py-3 text-sm text-gw-texte-doux">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gw-violet" aria-hidden />
        <span>
          {envoyerAuDemarrage && envoi ? "Envoi d'un code" : "Nous avons envoyé un code à 6 chiffres"}
          {email ? (
            <>
              {" "}à <strong className="font-semibold text-gw-nuit">{email}</strong>
            </>
          ) : null}
          . Pensez à regarder dans les indésirables (spams).
        </span>
      </p>

      <SaisieCode valeur={code} onChange={setCode} onComplet={verifier} desactive={verification} erreur={!!erreur} />

      <MessageErreur>{erreur}</MessageErreur>

      <div className="flex flex-col items-center gap-3">
        <BoutonAuth type="submit" chargement={verification} disabled={code.length !== 6} className="w-full sm:w-auto sm:min-w-[220px]">
          Confirmer mon adresse
        </BoutonAuth>
        <button
          type="button"
          onClick={() => renvoyer()}
          disabled={attente > 0 || envoi}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gw-violet hover:text-gw-rose-action disabled:cursor-not-allowed disabled:text-gw-texte-doux"
        >
          <RefreshCw className={envoi ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
          {attente > 0 ? `Renvoyer un code dans ${attente} s` : "Renvoyer un code"}
        </button>
      </div>
    </form>
  )
}
