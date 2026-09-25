"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { KeyRound, Lock, Mail, User, UserPlus } from "lucide-react"
import { API_BASE_URL } from "@/services/apiConfig"
import { BoutonAuth, CadreAuth, ChampAuth, LienPied, MessageErreur } from "@/components/auth/cadre-auth"

/*
 * Connexion de l'équipe (organisateurs et administrateurs), page /login.
 * Onglets « Connexion » / « Inscription » : même page, le formulaire change.
 * La redirection après connexion est décidée par la page (selon le rôle).
 */

interface LoginFormProps {
  onLoginSuccess: (token: string) => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // retour de « mot de passe oublié » : l'adresse est préremplie (/login?email=…)
  useEffect(() => {
    const adresse = new URLSearchParams(window.location.search).get("email")
    if (adresse) setEmail(adresse)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const appeler = async (endpoint: string, payload: object, erreurParDefaut: string) => {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : erreurParDefaut)
      return data
    }

    try {
      // /signup crée le compte sans renvoyer de jeton : on se connecte juste après
      if (!isLogin) await appeler("/signup", { fullname: fullName, email, password }, "L'inscription a échoué.")
      const data = await appeler("/login", { email, password }, "Email ou mot de passe incorrect.")
      if (!data.access_token) throw new Error("La connexion a échoué.")

      localStorage.setItem("access_token", data.access_token)
      onLoginSuccess(data.access_token)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Le serveur ne répond pas. Vérifiez que l'API est démarrée."
          : err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
      )
    } finally {
      setLoading(false)
    }
  }

  const changerMode = (connexion: boolean) => {
    if (connexion === isLogin) return
    setIsLogin(connexion)
    setError("")
    setPassword("")
    setFullName("")
  }

  return (
    <CadreAuth
      onglets={[
        { libelle: "Connexion", actif: isLogin, onClick: () => changerMode(true) },
        { libelle: "Inscription", actif: !isLogin, onClick: () => changerMode(false) },
      ]}
      icone={isLogin ? User : UserPlus}
      surtitre="Espace organisateur"
      titre={isLogin ? "Connexion" : "Créer un compte"}
      sousTitre={
        isLogin
          ? "Gérez vos événements, vos ventes et les votes du public."
          : "Un compte pour préparer vos événements et suivre vos ventes."
      }
      pied={
        <>
          <span>Vous souhaitez acheter des billets ?</span>
          <LienPied href="/participants/login">Espace participant</LienPied>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
        {!isLogin && (
          <ChampAuth
            libelle="Nom complet"
            icone={User}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex. Rakoto Jean"
            autoComplete="name"
            required
          />
        )}
        <ChampAuth
          libelle="Adresse e-mail"
          icone={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.mg"
          autoComplete="email"
          required
        />
        <ChampAuth
          libelle="Mot de passe"
          icone={isLogin ? Lock : KeyRound}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={isLogin ? undefined : 6}
          required
        />
        {isLogin && (
          <p className="-mt-3 text-right">
            <Link
              href={email ? `/login/mot-de-passe-oublie?email=${encodeURIComponent(email)}` : "/login/mot-de-passe-oublie"}
              className="text-xs font-semibold text-gw-violet hover:text-gw-rose-action hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        )}

        <MessageErreur>{error}</MessageErreur>

        <div className="flex justify-center pt-1">
          <BoutonAuth type="submit" chargement={loading} className="w-full sm:w-auto sm:min-w-[200px]">
            {isLogin ? (loading ? "Connexion…" : "Se connecter") : loading ? "Création…" : "Créer mon compte"}
          </BoutonAuth>
        </div>
      </form>
    </CadreAuth>
  )
}
