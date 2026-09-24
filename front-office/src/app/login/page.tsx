"use client"

import LoginForm from "@/components/login-form"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { accueilSelonRole, jetonValide, lireJetonStaff, roleDepuisJeton } from "@/lib/role"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Déjà connecté : on envoie directement vers l'espace qui correspond au rôle
    const charge = lireJetonStaff()
    if (jetonValide(charge)) {
      router.push(accueilSelonRole(roleDepuisJeton(charge)))
    } else if (charge) {
      localStorage.removeItem("access_token")
    }
  }, [router])

  const handleLoginSuccess = () => {
    // Après connexion : administrateur -> /dashboard, organisateur -> /organisateur/dashboard
    router.push(accueilSelonRole(roleDepuisJeton(lireJetonStaff())))
  }

  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}
