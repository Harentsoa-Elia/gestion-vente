"use client"

import { cloneElement, isValidElement, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  CalendarRange,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  Ticket,
  Users,
  Vote,
  Wallet,
  X,
} from "lucide-react"
import { logout } from "@/services/auth.service"
import { Logo } from "@/components/marque/logo"
import { cn } from "@/utils"

/*
 * Mise en page de l'espace organisateur.
 * - Barre latérale en dégradé violet → rose (palette guichetweb). L'onglet actif prend
 *   la couleur du contenu et s'y raccorde par deux arrondis creusés (classe .gw-onglet-actif).
 * - Thème clair ou sombre, mémorisé dans le navigateur (clé organisateur_dark_mode),
 *   transmis aux pages via la prop darkMode (comme avant) et via la classe .dark.
 * - Sur mobile, la barre latérale s'ouvre en tiroir depuis un bouton « Menu ».
 */

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  disponible: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/organisateur/dashboard", label: "Tableau de bord", icon: LayoutDashboard, disponible: true },
  { href: "/organisateur/evenements", label: "Mes événements", icon: CalendarRange, disponible: false },
  { href: "/organisateur/reservations", label: "Réservations", icon: Ticket, disponible: true },
  { href: "/organisateur/participants", label: "Participants", icon: Users, disponible: true },
  { href: "/organisateur/paiements", label: "Paiements", icon: Wallet, disponible: true },
  { href: "/organisateur/statistiques", label: "Statistiques", icon: BarChart3, disponible: false },
  { href: "/organisateur/intelligence-decisionnelle", label: "Recommandations", icon: Sparkles, disponible: false },
]

interface OrganisateurSidebarLayoutProps {
  children: React.ReactNode
}

function BarreLaterale({
  pathname,
  darkMode,
  onBasculerTheme,
  onDeconnexion,
  onNaviguer,
}: {
  pathname: string
  darkMode: boolean
  onBasculerTheme: () => void
  onDeconnexion: () => void
  onNaviguer?: () => void
}) {
  return (
    <div className="flex h-full flex-col text-white">
      <div className="px-7 pt-7 pb-6">
        <Logo ton="clair" />
        <p className="mt-1 text-xs text-white/70">Espace organisateur</p>
      </div>

      <div className="px-5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
        >
          Voir le site public
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gw-violet">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      </div>

      <nav aria-label="Espace organisateur" className="mt-6 flex-1 space-y-1 pl-5">
        {NAV_ITEMS.map(({ href, label, icon: Icone, disponible }) => {
          const actif = pathname === href
          if (!disponible) {
            return (
              <div
                key={href}
                aria-disabled
                className="flex cursor-not-allowed items-center justify-between gap-3 rounded-l-full py-3 pr-5 pl-4 text-sm text-white/45"
              >
                <span className="flex items-center gap-3">
                  <Icone className="h-[18px] w-[18px]" aria-hidden />
                  {label}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">Bientôt</span>
              </div>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              onClick={onNaviguer}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-l-full py-3 pr-5 pl-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white",
                actif
                  ? "gw-onglet-actif bg-[var(--gw-contenu)] font-semibold text-gw-violet dark:text-white"
                  : "text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icone className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 px-5 pt-4 pb-6">
        {/* carte d'appel, à la place du « Go Pro » du modèle */}
        <Link
          href="/#avis"
          target="_blank"
          className="block rounded-2xl bg-white/12 p-4 transition-colors hover:bg-white/20"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gw-rose-action">
            <Vote className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-titre mt-3 text-base font-semibold leading-tight">Ce que vote votre public</p>
          <p className="mt-1 text-xs text-white/75">Voyez vos propositions telles que le public les découvre.</p>
        </Link>

        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          onClick={onBasculerTheme}
          className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
        >
          <span className="flex items-center gap-3">
            {darkMode ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
            Mode sombre
          </span>
          <span className={cn("relative h-5 w-9 rounded-full transition-colors", darkMode ? "bg-white" : "bg-white/30")}>
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full transition-all",
                darkMode ? "left-[18px] bg-gw-violet" : "left-0.5 bg-white",
              )}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={onDeconnexion}
          className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  )
}

export function OrganisateurSidebarLayout({ children }: OrganisateurSidebarLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tiroirOuvert, setTiroirOuvert] = useState(false)

  useEffect(() => {
    setDarkMode(localStorage.getItem("organisateur_dark_mode") === "true")
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!tiroirOuvert) return
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setTiroirOuvert(false)
    window.addEventListener("keydown", echap)
    return () => window.removeEventListener("keydown", echap)
  }, [tiroirOuvert])

  const basculerTheme = () => {
    const suivant = !darkMode
    setDarkMode(suivant)
    localStorage.setItem("organisateur_dark_mode", String(suivant))
  }

  const deconnexion = async () => {
    await logout()
    router.push("/login")
  }

  if (!mounted) return null

  const fondBarre = darkMode
    ? "bg-[linear-gradient(170deg,#2B2360_0%,#1E1A3C_55%,#15122B_100%)]"
    : "bg-[linear-gradient(170deg,#7B6CF0_0%,#6C5CE7_35%,#A23AA6_75%,#C92A7A_100%)]"

  const barre = (
    <BarreLaterale
      pathname={pathname}
      darkMode={darkMode}
      onBasculerTheme={basculerTheme}
      onDeconnexion={deconnexion}
      onNaviguer={() => setTiroirOuvert(false)}
    />
  )

  return (
    <div className={cn("gw-orga", darkMode && "dark")}>
      <div className={cn("flex min-h-screen", fondBarre)}>
        {/* barre latérale : fixe sur grand écran */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto lg:block">{barre}</aside>

        {/* tiroir sur mobile */}
        {tiroirOuvert && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button
              type="button"
              aria-label="Fermer le menu"
              className="absolute inset-0 bg-black/50"
              onClick={() => setTiroirOuvert(false)}
            />
            <aside className={cn("relative h-full w-72 overflow-y-auto", fondBarre)}>
              <button
                type="button"
                onClick={() => setTiroirOuvert(false)}
                aria-label="Fermer le menu"
                className="absolute top-6 right-4 rounded-full p-2 text-white hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
              {barre}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 bg-[var(--gw-contenu)] text-gw-nuit lg:my-3 lg:mr-3 lg:rounded-[2rem] dark:text-white">
          <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
            <Logo ton={darkMode ? "clair" : "sombre"} />
            <button
              type="button"
              onClick={() => setTiroirOuvert(true)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Menu className="h-5 w-5" aria-hidden />
              Menu
            </button>
          </div>
          {isValidElement(children)
            ? cloneElement(children as React.ReactElement<{ darkMode?: boolean }>, { darkMode })
            : children}
        </main>
      </div>
    </div>
  )
}
