"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { jetonValide, lireJetonStaff, redirectionSiInterdit, roleDepuisJeton } from "@/lib/role"

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const charge = lireJetonStaff()
    if (!jetonValide(charge)) {
      localStorage.removeItem("access_token")
      router.push("/login")
      setLoading(false)
      return
    }

    // chaque rôle reste dans son espace (voir src/lib/role.ts)
    const redirection = redirectionSiInterdit(roleDepuisJeton(charge), pathname ?? "")
    if (redirection) {
      router.replace(redirection)
      return
    }

    setIsAuthenticated(true)
    setLoading(false)
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