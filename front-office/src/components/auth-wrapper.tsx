"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const currentTime = Date.now() / 1000

        if (payload.expires > currentTime) {
          const isAdmin = payload.concert_id === 0
          const isOrganisateurRoute = pathname?.startsWith("/organisateur")

          if (isAdmin && isOrganisateurRoute) {
            router.push("/dashboard")
            return
          }

          setIsAuthenticated(true)
        } else {
          localStorage.removeItem("access_token")
          router.push("/login")
        }
      } catch (error) {
        localStorage.removeItem("access_token")
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
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