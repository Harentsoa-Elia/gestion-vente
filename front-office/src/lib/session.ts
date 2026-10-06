"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { clearParticipantToken, getParticipantToken } from "@/services/participantService"
import { accueilSelonRole, jetonValide, lireJetonStaff, roleDepuisJeton, type RoleStaff } from "@/lib/role"

/*
 * Session déjà ouverte ? Les jetons (24 h) restent dans le navigateur tant que l'utilisateur
 * ne se déconnecte pas : passer par la page d'accueil ne le déconnecte pas. Ces fonctions
 * évitent de lui redemander son mot de passe quand il revient vers son espace.
 */

/** Jeton participant présent et non expiré (sinon il est retiré). */
export function participantConnecte(): boolean {
  if (typeof window === "undefined") return false
  const jeton = getParticipantToken()
  if (!jeton) return false
  try {
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    if (typeof charge.expires === "number" && charge.expires > Date.now() / 1000) return true
  } catch {
    // jeton illisible
  }
  clearParticipantToken()
  return false
}

/** Rôle du compte organisateur / administrateur connecté, ou null. */
export function staffConnecte(): RoleStaff | null {
  if (typeof window === "undefined") return null
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
    const role = staffConnecte()
    if (type === "participant" && participantConnecte()) {
      router.replace(redirection && redirection !== "/" ? redirection : "/participants/mes-reservations")
      return
    }
    if (type === "equipe" && role) {
      router.replace(accueilSelonRole(role))
      return
    }
    if (type === "equipe" && lireJetonStaff()) localStorage.removeItem("access_token") // expiré
    setAfficher(true)
  }, [type, redirection, router])
  return afficher
}
