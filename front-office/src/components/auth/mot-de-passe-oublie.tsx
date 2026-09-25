"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound, Lock, Mail } from "lucide-react"
import { toast } from "sonner"
import { saveParticipantToken } from "@/services/participantService"
import { demanderCodeMotDePasse, reinitialiserMotDePasse, type EspaceCompte } from "@/services/compteService"
import { BoutonAuth, CadreAuth, ChampAuth, LienPied, MessageErreur } from "./cadre-auth"
import { SaisieCode } from "./saisie-code"

/*
 * « Mot de passe oublié » en deux étapes, pour les participants et pour l'équipe :
 * 1. l'adresse e-mail -> un code à 6 chiffres y est envoyé ;
 * 2. le code et le nouveau mot de passe.
 * Participant : connecté directement ensuite. Équipe : renvoyé vers /login.
 */

export function MotDePasseOublie({ espace }: { espace: EspaceCompte }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const participant = espace === "participant"
  const pageConnexion = participant ? "/participants/login" : "/login"
  const redirectTo = searchParams.get("redirect") || "/"

  const [etape, setEtape] = useState<"email" | "code">("email")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [code, setCode] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState("")

  const message = (e: unknown, defaut: string) =>
    e instanceof TypeError ? "Le serveur ne répond pas. Réessayez dans un instant." : e instanceof Error ? e.message : defaut

  const demanderCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setChargement(true)
    setErreur("")
    try {
      await demanderCodeMotDePasse(espace, email.trim())
      setEtape("code")
      toast.success("Si un compte existe avec cette adresse, un code vient d'y être envoyé.")
    } catch (err) {
      setErreur(message(err, "La demande a échoué."))
    } finally {
      setChargement(false)
    }
  }

  const changer = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur("")
    if (code.length !== 6) {
      setErreur("Saisissez les 6 chiffres du code reçu.")
      return
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.")
      return
    }
    setChargement(true)
    try {
      const r = await reinitialiserMotDePasse(espace, { email: email.trim(), code, nouveau_mot_de_passe: motDePasse })
      if (participant && r.access_token) {
        saveParticipantToken(r.access_token)
        toast.success("Mot de passe modifié. Vous êtes connecté.")
        router.push(redirectTo)
      } else {
        toast.success("Mot de passe modifié. Connectez-vous avec le nouveau.")
        router.push(`${pageConnexion}?email=${encodeURIComponent(email.trim())}`)
      }
    } catch (err) {
      setErreur(message(err, "Le mot de passe n'a pas été modifié."))
      setCode("")
    } finally {
      setChargement(false)
    }
  }

  return (
    <CadreAuth
      sousEntete={participant}
      onglets={[
        { libelle: "Connexion", href: pageConnexion },
        { libelle: "Mot de passe", actif: true },
      ]}
      icone={KeyRound}
      surtitre={participant ? "Espace participant" : "Espace organisateur"}
      titre="Mot de passe oublié"
      sousTitre={
        etape === "email"
          ? "Indiquez l'adresse de votre compte : nous y enverrons un code pour choisir un nouveau mot de passe."
          : "Saisissez le code reçu par e-mail, puis votre nouveau mot de passe."
      }
      pied={
        <>
          <span>Vous vous en souvenez ?</span>
          <LienPied href={pageConnexion}>Retour à la connexion</LienPied>
        </>
      }
    >
      {etape === "email" ? (
        <form onSubmit={demanderCode} className="mx-auto max-w-sm space-y-6">
          <ChampAuth
            libelle="Adresse e-mail du compte"
            icone={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.mg"
            autoComplete="email"
            autoFocus
            required
          />
          <MessageErreur>{erreur}</MessageErreur>
          <div className="flex justify-center pt-1">
            <BoutonAuth type="submit" chargement={chargement} className="w-full sm:w-auto sm:min-w-[220px]">
              Recevoir un code
            </BoutonAuth>
          </div>
        </form>
      ) : (
        <form onSubmit={changer} className="mx-auto max-w-sm space-y-6">
          <p className="rounded-2xl bg-gw-fond px-4 py-3 text-center text-sm text-gw-texte-doux">
            Code envoyé à <strong className="font-semibold text-gw-nuit">{email}</strong>, s&apos;il correspond à un compte.
            Pensez aux indésirables (spams).
          </p>
          <SaisieCode valeur={code} onChange={setCode} erreur={!!erreur && code.length === 0} />
          <ChampAuth
            libelle="Nouveau mot de passe"
            icone={Lock}
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="6 caractères minimum"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <ChampAuth
            libelle="Confirmer le mot de passe"
            icone={KeyRound}
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Retapez le mot de passe"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <MessageErreur>{erreur}</MessageErreur>
          <div className="flex flex-col items-center gap-3 pt-1">
            <BoutonAuth type="submit" chargement={chargement} className="w-full sm:w-auto sm:min-w-[220px]">
              Changer le mot de passe
            </BoutonAuth>
            <button
              type="button"
              onClick={() => {
                setEtape("email")
                setErreur("")
                setCode("")
              }}
              className="text-sm font-semibold text-gw-violet hover:text-gw-rose-action"
            >
              Pas reçu de code ? Changer d&apos;adresse ou renvoyer
            </button>
          </div>
        </form>
      )}
    </CadreAuth>
  )
}
