"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, User, LogOut, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getParticipantToken,
  clearParticipantToken,
  fetchParticipantMe,
  logoutParticipant,
} from "@/services/participantService"

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/evenements", label: "Evenements" },
]

export function PublicHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [loadingParticipant, setLoadingParticipant] = useState(true)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const token = getParticipantToken()
    if (!token) {
      setLoadingParticipant(false)
      return
    }

    fetchParticipantMe()
      .then((participant) => {
        setParticipantName(`${participant.prenom} ${participant.nom}`.trim())
      })
      .catch(() => {
        clearParticipantToken()
        setParticipantName(null)
      })
      .finally(() => setLoadingParticipant(false))
  }, [isMounted])

   const handleLogout = async () => {
    try {
      await logoutParticipant()
    } catch {
      // le token est peut-etre deja expire/invalide, on nettoie quand meme localement
    }
    clearParticipantToken()
    setParticipantName(null)
    router.push("/")
  }

  if (!isMounted) return null

  return (
    <header className="bg-[#0F172A] text-white shadow-md sticky top-0 left-0 w-full z-50">
      <div className="max-w-6xl mx-auto py-4 px-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Ticket className="w-5 h-5 text-[#3B82F6]" />
          EventPlace
        </Link>

        <Button
          variant="ghost"
          className="sm:hidden text-white hover:bg-white/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="w-6 h-6" />
        </Button>

        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className={
                pathname === href
                  ? "text-white bg-white/10"
                  : "text-white hover:bg-white/10"
              }
            >
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2">
          {loadingParticipant ? null : participantName ? (
            <>
              <Button asChild variant="ghost" className="text-white hover:bg-white/10 gap-2">
                <Link href="/participants/mes-reservations">
                  <User className="w-4 h-4" />
                  {participantName}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/10 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Deconnexion
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                <Link href="/participants/login">Connexion</Link>
              </Button>
              <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white">
                <Link href="/participants/signup">Inscription</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden px-4 pb-4 space-y-1 bg-[#0F172A]/95 border-t border-white/10">
          {NAV_LINKS.map(({ href, label }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10"
            >
              <Link href={href}>{label}</Link>
            </Button>
          ))}
          <div className="pt-2 border-t border-white/10">
            {participantName ? (
              <>
                <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
                  <Link href="/participants/mes-reservations">{participantName}</Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-white hover:bg-white/10"
                >
                  Deconnexion
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
                  <Link href="/participants/login">Connexion</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
                  <Link href="/participants/signup">Inscription</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}