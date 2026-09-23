"use client"

import { cloneElement, isValidElement, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CalendarRange,
  Ticket,
  Users,
  Wallet,
  BarChart3,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Ticket as LogoIcon,
} from "lucide-react"
import { logout } from "@/services/auth.service"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  disponible: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/organisateur/dashboard", label: "Dashboard", icon: LayoutDashboard, disponible: true },
  { href: "/organisateur/evenements", label: "Mes evenements", icon: CalendarRange, disponible: false },
  { href: "/organisateur/reservations", label: "Reservations", icon: Ticket, disponible: true },
  { href: "/organisateur/participants", label: "Participants", icon: Users, disponible: true },
  { href: "/organisateur/paiements", label: "Paiements", icon: Wallet, disponible: true },
  { href: "/organisateur/statistiques", label: "Statistiques", icon: BarChart3, disponible: false },
  { href: "/organisateur/intelligence-decisionnelle", label: "Recommandations", icon: Sparkles, disponible: true },
]

interface OrganisateurSidebarLayoutProps {
  children: React.ReactNode
}

export function OrganisateurSidebarLayout({ children }: OrganisateurSidebarLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("organisateur_dark_mode")
    setDarkMode(saved === "true")
    setMounted(true)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem("organisateur_dark_mode", String(next))
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  if (!mounted) return null

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0F172A]">
        {/* Barre laterale */}
        <aside className="w-64 shrink-0 bg-white dark:bg-[#1E293B] border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200 dark:border-gray-700">
            <LogoIcon className="w-5 h-5 text-[#3B82F6]" />
            <span className="font-bold text-[#0F172A] dark:text-white">EventPlace</span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, disponible }) => {
              const active = pathname === href
              if (!disponible) {
                return (
                  <div
                    key={href}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      Bientot
                    </span>
                  </div>
                )
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#3B82F6] text-white"
                      : "text-[#0F172A] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#0F172A] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? "Mode clair" : "Mode sombre"}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Deconnexion
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto">
  {isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ darkMode?: boolean }>, { darkMode })
    : children}
</main>
      </div>
    </div>
  )
}