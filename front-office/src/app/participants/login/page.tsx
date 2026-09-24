"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, User } from "lucide-react"
import { toast } from "sonner"
import { loginParticipant, saveParticipantToken } from "@/services/participantService"
import { BoutonAuth, CadreAuth, ChampAuth, LienPied, MessageErreur } from "@/components/auth/cadre-auth"

function ParticipantLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  // l'onglet « Inscription » garde la page de retour (ex. réservation en cours)
  const suite = searchParams.get("redirect") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""

  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErreur("")
    try {
      const result = await loginParticipant({ email, mot_de_passe: motDePasse })
      saveParticipantToken(result.access_token)
      toast.success("Connexion réussie. Bon retour parmi nous !")
      router.push(redirectTo)
    } catch (err) {
      setErreur(
        err instanceof TypeError
          ? "Le serveur ne répond pas. Réessayez dans un instant."
          : err instanceof Error && err.message
            ? err.message
            : "Email ou mot de passe incorrect.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <CadreAuth
      sousEntete
      onglets={[
        { libelle: "Connexion", actif: true },
        { libelle: "Inscription", href: `/participants/signup${suite}` },
      ]}
      icone={User}
      surtitre="Espace participant"
      titre="Connexion"
      sousTitre="Retrouvez vos billets et donnez votre avis sur les prochains événements."
      pied={
        <>
          <span>Pas encore de compte ?</span>
          <LienPied href={`/participants/signup${suite}`}>Créer un compte</LienPied>
          <span aria-hidden className="hidden text-gw-bordure sm:inline">
            |
          </span>
          <LienPied href="/login">Espace organisateur</LienPied>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
        <ChampAuth
          libelle="Adresse e-mail"
          icone={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.mg"
          autoComplete="email"
          required
        />
        <ChampAuth
          libelle="Mot de passe"
          icone={Lock}
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <MessageErreur>{erreur}</MessageErreur>

        <div className="flex justify-center pt-1">
          <BoutonAuth type="submit" chargement={loading} className="w-full sm:w-auto sm:min-w-[200px]">
            {loading ? "Connexion…" : "Se connecter"}
          </BoutonAuth>
        </div>
      </form>
    </CadreAuth>
  )
}

export default function ParticipantLoginPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantLoginForm />
    </Suspense>
  )
}
