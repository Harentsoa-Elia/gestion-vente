"use client"


import { t } from "@/lib/i18n"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, User } from "lucide-react"
import { toast } from "sonner"
import { saveParticipantToken } from "@/services/participantService"
import { connexionEquipe, connexionParticipant, MESSAGE_IDENTIFIANTS } from "@/lib/connexion"
import { accueilSelonRole, lireJetonStaff, roleDepuisJeton } from "@/lib/role"
import { useRedirectionSiConnecte } from "@/lib/session"
import { BoutonAuth, CadreAuth, ChampAuth, LienPied, MessageErreur } from "@/components/auth/cadre-auth"

function ParticipantLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  // l'onglet "Inscription" garde la page de retour (ex. réservation en cours)
  const suite = searchParams.get("redirect") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""

  // déjà connecté : retour direct à la page demandée (ou à "Mes billets"), sans redemander le mot de passe
  const afficher = useRedirectionSiConnecte("participant", searchParams.get("redirect"))
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [motDePasse, setMotDePasse] = useState("")
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErreur("")
    try {
      const jeton = await connexionParticipant(email, motDePasse)
      if (jeton) {
        saveParticipantToken(jeton)
        toast.success(t("Connexion réussie. Bon retour parmi nous !"))
        router.push(redirectTo)
        return
      }
      // pas un compte participant : c'est peut-être un compte organisateur ou administrateur
      const jetonEquipe = await connexionEquipe(email, motDePasse)
      if (jetonEquipe) {
        localStorage.setItem("access_token", jetonEquipe)
        const role = roleDepuisJeton(lireJetonStaff())
        toast.success(
          role === "admin"
            ? t("Compte administrateur : vous êtes connecté à l'administration.")
            : t("Compte organisateur : vous êtes connecté à votre espace organisateur."),
        )
        router.push(accueilSelonRole(role))
        return
      }
      setErreur(t(MESSAGE_IDENTIFIANTS))
    } catch (err) {
      setErreur(
        err instanceof TypeError
          ? t("Le serveur ne répond pas. Réessayez dans un instant.")
          : err instanceof Error && err.message
            ? err.message
            : t(MESSAGE_IDENTIFIANTS),
      )
    } finally {
      setLoading(false)
    }
  }

  if (!afficher) return <div className="min-h-[60vh]" />

  return (
    <CadreAuth
      sousEntete
      onglets={[
        { libelle: "Connexion", actif: true },
        { libelle: "Inscription", href: `/participants/signup${suite}` },
      ]}
      icone={User}
      surtitre={t("Espace participant")}
      titre={t("Connexion")}
      sousTitre={t("Retrouvez vos billets et donnez votre avis sur les prochains événements.")}
      pied={
        <>
          <span>{t("Pas encore de compte ?")}</span>
          <LienPied href={`/participants/signup${suite}`}>{t("Créer un compte")}</LienPied>
          <span aria-hidden className="hidden text-gw-bordure sm:inline">
            |
          </span>
          <LienPied href="/login">{t("Espace organisateurs et administrateurs")}</LienPied>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
        <ChampAuth
          libelle={t("Adresse e-mail")}
          icone={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.mg"
          autoComplete="email"
          required
        />
        <ChampAuth
          libelle={t("Mot de passe")}
          icone={Lock}
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <p className="-mt-3 text-right">
          <Link
            href={`/participants/mot-de-passe-oublie?${new URLSearchParams({ ...(email ? { email } : {}), ...(searchParams.get("redirect") ? { redirect: redirectTo } : {}) })}`}
            className="text-xs font-semibold text-gw-violet hover:text-gw-rose-action hover:underline"
          >{t("Mot de passe oublié ?")}</Link>
        </p>

        <MessageErreur>{erreur}</MessageErreur>

        <div className="flex justify-center pt-1">
          <BoutonAuth type="submit" chargement={loading} className="w-full sm:w-auto sm:min-w-[200px]">
            {loading ? t("Connexion...") : t("Se connecter")}
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
