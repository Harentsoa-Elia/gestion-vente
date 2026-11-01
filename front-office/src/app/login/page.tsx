"use client"

import LoginForm from "@/components/login-form"
import { useRouter } from "next/navigation"
import { accueilSelonRole, lireJetonStaff, roleDepuisJeton } from "@/lib/role"
import { useRedirectionSiConnecte } from "@/lib/session"
import { InterrupteurTheme } from "@/components/interrupteur-theme"
import { useModeNuit } from "@/lib/mode-nuit"
import { centreDe, changerThemeAnime } from "@/lib/transition-theme"

export default function LoginPage() {
  const router = useRouter()
  // Déjà connecté : on va directement à l'espace du rôle, sans afficher le formulaire
  const afficher = useRedirectionSiConnecte("equipe")
  // pas d'en-tête sur cette page : l'interrupteur jour / nuit est placé en haut à droite
  const { nuit, basculer } = useModeNuit()

  const handleLoginSuccess = () => {
    // Après connexion : administrateur -> /admin, organisateur -> /organisateur/dashboard
    router.push(accueilSelonRole(roleDepuisJeton(lireJetonStaff())))
  }

  if (!afficher) return <div className="min-h-screen bg-gw-fond" />
  return (
    <>
      <div className="fixed top-4 right-4 z-40 sm:top-6 sm:right-6">
        <InterrupteurTheme nuit={nuit} onBasculer={(e) => changerThemeAnime(basculer, centreDe(e.currentTarget))} />
      </div>
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    </>
  )
}
