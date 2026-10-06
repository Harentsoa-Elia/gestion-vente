"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { assurerSession } from "@/lib/jetons"
import { accueilSelonRole, jetonValide, lireJetonStaff, roleDepuisJeton, type RoleStaff } from "@/lib/role"

/*
 * Session déjà ouverte ? Les jetons restent dans le navigateur tant que l'utilisateur ne se
 * déconnecte pas (jeton d'accès renouvelé automatiquement pendant 7 jours, voir lib/jetons.ts) : passer par la page d'accueil ne le déconnecte pas. Ces fonctions
 * évitent de lui redemander son mot de passe quand il revient vers son espace.
 */

/** Session participant utilisable (jeton d'accès renouvelé si besoin). */
export async function participantConnecte(): Promise<boolean> {
  if (typeof window === "undefined") return false
  return assurerSession("participant")
}

/** Rôle du compte organisateur / administrateur connecté (jeton renouvelé si besoin), ou null. */
export async function staffConnecte(): Promise<RoleStaff | null> {
  if (typeof window === "undefined" || !(await assurerSession("equipe"))) return null
  const charge = lireJetonStaff()
  return jetonValide(charge) ? roleDepuisJeton(charge) : null
}

/**
 * Pages de connexion : si l'utilisateur est déjà connecté, on l'envoie directement à son espace
 * au lieu d'afficher le formulaire. Renvoie true quand le formulaire peut s'afficher.
 *  - participant : la page demandée (?redirect=…) ou « Mes billets » ;
 *  - organisateur / administrateur : son tableau de bord.
 * (Un organisateur connecté peut quand même ouvrir la connexion participant pour acheter des billets.)
 */
export function useRedirectionSiConnecte(
  type: "participant" | "equipe",
  redirection?: string | null,
): boolean {
  const router = useRouter()
  const [afficher, setAfficher] = useState(false)
  useEffect(() => {
    let actif = true
    ;(async () => {
      if (type === "participant" && (await participantConnecte())) {
        if (actif) router.replace(redirection && redirection !== "/" ? redirection : "/participants/mes-reservations")
        return
      }
      const role = type === "equipe" ? await staffConnecte() : null
      if (!actif) return
      if (role) {
        router.replace(accueilSelonRole(role))
        return
      }
      setAfficher(true)
    })()
    return () => {
      actif = false
    }
  }, [type, redirection, router])
  return afficher
}
