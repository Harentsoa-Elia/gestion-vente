"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, CalendarDays, KeyRound, Lock, Mail, User, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { signupParticipant, saveParticipantToken } from "@/services/participantService"
import { BoutonAuth, CadreAuth, ChampAuth, ChoixSegmente, MessageErreur } from "@/components/auth/cadre-auth"
import { cn } from "@/utils"
import type { Genre } from "@/types"

/*
 * Inscription d'un participant en deux étapes :
 * 1. « Vous » : prénom, nom, date de naissance, genre ;
 * 2. « Votre compte » : e-mail et mot de passe.
 * Barre de pied Retour / Continuer, comme sur le modèle.
 */

const GENRES: { valeur: Genre; libelle: string }[] = [
  { valeur: "Feminin", libelle: "Femme" },
  { valeur: "Masculin", libelle: "Homme" },
  { valeur: "Autre", libelle: "Autre" },
]

const ETAPES = ["Vous", "Votre compte"]

function ParticipantSignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  const suite = searchParams.get("redirect") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""

  const [etape, setEtape] = useState(0)
  const [nom, setNom] = useState("")
  const [prenom, setPrenom] = useState("")
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [genre, setGenre] = useState<Genre | "">("")
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState("")

  const aujourdhui = new Date().toISOString().split("T")[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur("")

    // étape 1 : les champs requis sont vérifiés par le navigateur, le genre ici
    if (etape === 0) {
      if (!genre) {
        setErreur("Choisissez votre genre pour continuer.")
        return
      }
      setEtape(1)
      return
    }

    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.")
      return
    }
    if (!dateNaissance || !genre) {
      setEtape(0)
      setErreur("La date de naissance et le genre sont obligatoires.")
      return
    }

    setLoading(true)
    try {
      const result = await signupParticipant({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        mot_de_passe: motDePasse,
        date_naissance: dateNaissance,
        genre,
      })
      saveParticipantToken(result.access_token)
      toast.success(`Bienvenue sur guichetweb, ${prenom.trim()} !`)
      router.push(redirectTo)
    } catch (err) {
      setErreur(
        err instanceof TypeError
          ? "Le serveur ne répond pas. Réessayez dans un instant."
          : err instanceof Error && err.message
            ? err.message
            : "L'inscription a échoué.",
      )
    } finally {
      setLoading(false)
    }
  }

  const retour = () => {
    setErreur("")
    if (etape === 0) router.push(`/participants/login${suite}`)
    else setEtape(0)
  }

  return (
    <CadreAuth
      sousEntete
      onglets={[
        { libelle: "Connexion", href: `/participants/login${suite}` },
        { libelle: "Inscription", actif: true },
      ]}
      icone={UserPlus}
      surtitre={`Étape ${etape + 1} sur ${ETAPES.length}`}
      titre={etape === 0 ? "Faisons connaissance" : "Votre compte"}
      sousTitre={
        etape === 0
          ? "Ces informations aident les organisateurs à proposer des événements qui vous ressemblent."
          : "Votre e-mail servira à vous connecter et à recevoir vos billets."
      }
    >
      {/* barre de progression */}
      <ol className="mx-auto mb-7 flex max-w-sm items-center gap-2" aria-label="Progression">
        {ETAPES.map((libelle, i) => (
          <li key={libelle} className="flex flex-1 flex-col gap-1.5" aria-current={i === etape ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full transition-colors", i <= etape ? "bg-gw-rose-action" : "bg-gw-bordure")} />
            <span className={cn("text-[11px] font-semibold", i === etape ? "text-gw-nuit" : "text-gw-texte-doux")}>{libelle}</span>
          </li>
        ))}
      </ol>

      <form id="form-inscription" onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
        {etape === 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <ChampAuth
                libelle="Prénom"
                icone={User}
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex. Hery"
                autoComplete="given-name"
                required
              />
              <ChampAuth
                libelle="Nom"
                icone={User}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Rakoto"
                autoComplete="family-name"
                required
              />
            </div>
            <ChampAuth
              libelle="Date de naissance"
              icone={CalendarDays}
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              max={aujourdhui}
              autoComplete="bday"
              required
            />
            <ChoixSegmente
              libelle="Genre"
              options={GENRES}
              valeur={genre}
              onChange={(g) => {
                setGenre(g)
                setErreur("")
              }}
            />
          </>
        ) : (
          <>
            <ChampAuth
              libelle="Adresse e-mail"
              icone={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.mg"
              autoComplete="email"
              autoFocus
              required
            />
            <ChampAuth
              libelle="Mot de passe"
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
          </>
        )}

        <MessageErreur>{erreur}</MessageErreur>
      </form>

      {/* barre Retour / Continuer, en bas du formulaire */}
      <div className="mx-auto mt-8 flex max-w-sm items-center justify-between gap-3 border-t border-gw-bordure pt-6">
        <BoutonAuth type="button" variante="contour" onClick={retour} disabled={loading}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour
        </BoutonAuth>
        <BoutonAuth type="submit" form="form-inscription" chargement={loading}>
          {etape === 0 ? (
            <>
              Continuer
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          ) : loading ? (
            "Inscription…"
          ) : (
            "Créer mon compte"
          )}
        </BoutonAuth>
      </div>
    </CadreAuth>
  )
}

export default function ParticipantSignupPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantSignupForm />
    </Suspense>
  )
}
