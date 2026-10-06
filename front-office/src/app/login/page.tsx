"use client"

import LoginForm from "@/components/login-form"
import { useRouter } from "next/navigation"
import { accueilSelonRole, lireJetonStaff, roleDepuisJeton } from "@/lib/role"
import { useRedirectionSiConnecte } from "@/lib/session"

export default function LoginPage() {
  const router = useRouter()
  // Déjà connecté : on va directement à l'espace du rôle, sans afficher le formulaire
  const afficher = useRedirectionSiConnecte("equipe")

  const handleLoginSuccess = () => {
    // Après connexion : administrateur -> /admin, organisateur -> /organisateur/dashboard
    router.push(accueilSelonRole(roleDepuisJeton(lireJetonStaff())))
  }

  if (!afficher) return <div className="min-h-screen bg-gw-fond" />
  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}
