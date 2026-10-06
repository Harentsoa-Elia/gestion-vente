"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { clearParticipantToken } from "@/services/participantService"
import { assurerSession } from "@/lib/jetons"

interface ParticipantAuthWrapperProps {
  children: React.ReactNode
}

/**
 * Protege les pages qui exigent un compte Participant (reservation,
 * historique des billets...). Contrairement a AuthWrapper (staff), redirige
 * vers /participants/login et conserve la page d'origine pour y revenir
 * automatiquement apres connexion.
 */
export default function ParticipantAuthWrapper({ children }: ParticipantAuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let actif = true
    // jeton d'accès expiré ? il est d'abord renouvelé avec le jeton de rafraîchissement
    assurerSession("participant").then((ok) => {
      if (!actif) return
      if (ok) setIsAuthenticated(true)
      else {
        clearParticipantToken()
        router.push(`/participants/login?redirect=${encodeURIComponent(pathname)}`)
      }
      setLoading(false)
    })
    return () => {
      actif = false
    }
  }, [router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}