"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Loader2, Trash2 } from "lucide-react"
import type { AuthUser } from "@/types"
import { envoyerPhotoEquipe, fetchUserData } from "@/services/auth.service"
import { AvatarParticipant } from "@/components/avatar-participant"
import { Modale } from "@/components/organisateur/ui"

/*
 * Profil d'un membre de l'équipe (organisateur ou administrateur) : photo de profil.
 *  - useCompteEquipe() : le compte connecté, tenu à jour quand la photo change (événement « gw-compte-equipe ») ;
 *  - ouvrirProfilEquipe() : ouvre la fenêtre du profil depuis n'importe quelle page de l'espace ;
 *  - AvatarEquipe : la photo, ou les initiales sur le dégradé guichetweb.
 */

const EVENEMENT_MAJ = "gw-compte-equipe"
const EVENEMENT_OUVRIR = "gw-ouvrir-profil-equipe"

export const ouvrirProfilEquipe = () => window.dispatchEvent(new Event(EVENEMENT_OUVRIR))

export function useCompteEquipe() {
  const [compte, setCompte] = useState<AuthUser | null>(null)
  useEffect(() => {
    let actif = true
    fetchUserData()
      .then((u) => actif && setCompte(u))
      .catch(() => {})
    const maj = (e: Event) => setCompte((e as CustomEvent<AuthUser>).detail)
    window.addEventListener(EVENEMENT_MAJ, maj)
    return () => {
      actif = false
      window.removeEventListener(EVENEMENT_MAJ, maj)
    }
  }, [])
  return compte
}

export function useOuvertureProfil(ouvrir: () => void) {
  useEffect(() => {
    window.addEventListener(EVENEMENT_OUVRIR, ouvrir)
    return () => window.removeEventListener(EVENEMENT_OUVRIR, ouvrir)
  }, [ouvrir])
}

export function AvatarEquipe({ compte, className }: { compte: Pick<AuthUser, "fullname" | "avatar"> | null; className?: string }) {
  const [prenom, ...reste] = (compte?.fullname ?? "?").split(" ")
  return <AvatarParticipant prenom={prenom ?? ""} nom={reste.join(" ")} avatar={compte?.avatar} className={className} />
}

export const libelleRole = (role?: string) => (role === "admin" ? "Administrateur" : "Organisateur")

export function ModaleProfilEquipe({ ouverte, onFermer, compte }: { ouverte: boolean; onFermer: () => void; compte: AuthUser | null }) {
  const [envoi, setEnvoi] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  const changer = useCallback(async (fichier: File | null) => {
    setEnvoi(true)
    try {
      const u = await envoyerPhotoEquipe(fichier)
      window.dispatchEvent(new CustomEvent<AuthUser>(EVENEMENT_MAJ, { detail: u }))
      toast.success(fichier ? "Photo de profil enregistrée." : "Photo retirée.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La photo n'a pas été enregistrée.")
    } finally {
      setEnvoi(false)
      if (champ.current) champ.current.value = ""
    }
  }, [])

  return (
    <Modale ouverte={ouverte} titre="Mon profil" onFermer={onFermer}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <AvatarEquipe compte={compte} className="h-28 w-28 text-3xl" />
          <button
            type="button"
            onClick={() => champ.current?.click()}
            disabled={envoi}
            aria-label={compte?.avatar ? "Changer la photo de profil" : "Ajouter une photo de profil"}
            className="absolute -right-1 -bottom-1 grid h-10 w-10 place-items-center rounded-full bg-gw-nuit text-white ring-4 ring-white transition-transform hover:scale-105 dark:ring-gw-carte-sombre"
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        <div>
          <p className="font-titre text-xl font-semibold">{compte?.fullname ?? "…"}</p>
          {compte?.email && <p className="text-sm text-gw-texte-doux dark:text-white/60">{compte.email}</p>}
          <p className="mt-1 inline-flex rounded-full bg-gw-lavande/50 px-2.5 py-0.5 text-xs font-semibold text-gw-violet dark:bg-white/10 dark:text-gw-lavande">
            {libelleRole(compte?.role)}
          </p>
        </div>
        <p className="text-xs text-gw-texte-doux dark:text-white/55">
          Photo ou logo de votre entreprise : JPEG, PNG ou WebP, 8 Mo maximum. Elle sera recadrée en carré.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => champ.current?.click()}
            disabled={envoi}
            className="inline-flex items-center gap-1.5 rounded-full bg-gw-rose-action px-4 py-2 text-sm font-semibold text-white hover:bg-gw-rose-action-fonce disabled:opacity-50"
          >
            <Camera className="h-4 w-4" aria-hidden /> {compte?.avatar ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {compte?.avatar && (
            <button
              type="button"
              onClick={() => changer(null)}
              disabled={envoi}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-gw-rose-action hover:bg-gw-rose-pale disabled:opacity-50 dark:hover:bg-white/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Retirer
            </button>
          )}
        </div>
        <input
          ref={champ}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) changer(f)
          }}
        />
      </div>
    </Modale>
  )
}
