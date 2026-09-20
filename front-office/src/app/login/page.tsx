"use client"

import LoginForm from "@/components/login-form"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem("access_token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const currentTime = Date.now() / 1000

        if (payload.expires > currentTime) {
          // User is authenticated, redirect to dashboard.
          // (avant, "/" redirigeait lui-meme vers "/dashboard" ; ce n'est
          // plus le cas depuis que "/" est devenu l'accueil public du site,
          // donc on pointe directement vers /dashboard ici.)
          router.push("/dashboard")
        }
      } catch (error) {
        // Invalid token, stay on login page
        localStorage.removeItem("access_token")
      }
    }
  }, [router])

  const handleLoginSuccess = (token: string) => {
    // Redirect to dashboard after successful login (voir commentaire ci-dessus)
    router.push("/dashboard")
  }

  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}