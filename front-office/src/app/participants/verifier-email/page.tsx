"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MailCheck } from "lucide-react"
import { fetchParticipantMe, getParticipantToken } from "@/services/participantService"
import { CadreAuth, LienPied } from "@/components/auth/cadre-auth"
import { VerificationEmail } from "@/components/auth/verification-email"

/*
 * Confirmation de l'adresse e-mail, juste après l'inscription.
 * Le participant peut aussi le faire plus tard : la réservation le lui redemandera.
 */

function Contenu() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  const [email, setEmail] = useState<string>()

  useEffect(() => {
    if (!getParticipantToken()) {
      router.replace(`/participants/login?redirect=${encodeURIComponent("/participants/verifier-email")}`)
      return
    }
    fetchParticipantMe()
      .then((p) => {
        if (p.email_verifie) router.replace(redirectTo)
        else setEmail(p.email)
      })
      .catch(() => undefined)
  }, [router, redirectTo])

  return (
    <CadreAuth
      sousEntete
      onglets={[{ libelle: "Vérification", actif: true }]}
      icone={MailCheck}
      surtitre="Dernière étape"
      titre="Confirmez votre e-mail"
      sousTitre="Vos billets et leurs QR codes seront envoyés à cette adresse : vérifions qu'elle est bien la vôtre."
      pied={
        <>
          <span>Pas maintenant ?</span>
          <LienPied href={redirectTo}>Continuer sans confirmer</LienPied>
          <span className="w-full text-center text-xs sm:w-auto">(la confirmation sera demandée avant de réserver)</span>
        </>
      }
    >
      <VerificationEmail email={email} onConfirme={() => router.push(redirectTo)} />
      <p className="mt-6 text-center text-xs text-gw-texte-doux">
        Mauvaise adresse ?{" "}
        <Link href="/participants/signup" className="font-semibold text-gw-violet hover:underline">
          Créer le compte avec une autre adresse
        </Link>
      </p>
    </CadreAuth>
  )
}

export default function VerifierEmailPage() {
  return (
    <Suspense fallback={null}>
      <Contenu />
    </Suspense>
  )
}
