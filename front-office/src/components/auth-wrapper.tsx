"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { lireJetonStaff, redirectionSiInterdit, roleDepuisJeton } from "@/lib/role"
import { assurerSession, effacerSession } from "@/lib/jetons"

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let actif = true
    // jeton d'accès expiré ? il est d'abord renouvelé avec le jeton de rafraîchissement
    assurerSession("equipe").then((ok) => {
      if (!actif) return
      if (!ok) {
        effacerSession("equipe")
        router.push("/login")
        setLoading(false)
        return
      }
      const charge = lireJetonStaff()

    // chaque rôle reste dans son espace (voir src/lib/role.ts)
      const redirection = redirectionSiInterdit(roleDepuisJeton(charge), pathname ?? "")
      if (redirection) {
        router.replace(redirection)
        return
      }

      setIsAuthenticated(true)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}