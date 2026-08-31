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
          // User is authenticated, redirect to home
          router.push("/")
        }
      } catch (error) {
        // Invalid token, stay on login page
        localStorage.removeItem("access_token")
      }
    }
  }, [router])

  const handleLoginSuccess = (token: string) => {
    // Redirect to home page after successful login
    router.push("/")
  }

  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}
