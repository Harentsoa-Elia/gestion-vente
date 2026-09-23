"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AppHeader } from "@/components/app-header"
import { PublicHeader } from "@/components/public-header"
import { usePathname } from "next/navigation"
import { isPublicRoute } from "@/utils"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const isStaffLoginPage = pathname === "/login"
  const isPublic = isPublicRoute(pathname)
  // Les pages /organisateur/* fournissent leur propre navigation complete
  // (barre laterale), donc on n'affiche jamais le AppHeader du haut dessus.
  const isSidebarSection = pathname.startsWith("/organisateur")

  return (
    <html lang="fr">
      <body className={inter.className}>
        <style jsx global>{`
          @media print {
            header {
              display: none !important;
            }
            main {
              padding: 0 !important;
              margin: 0 !important;
            }
            body,
            html {
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
          }
        `}</style>

        {/*
          IMPORTANT : AppHeader (staff) contient sa propre logique de
          redirection vers /login si aucun token staff n'est present.
          On ne le monte donc JAMAIS sur les routes publiques, sinon un
          visiteur ou un participant sans compte staff serait redirige
          de force vers la page de connexion staff.
        */}
        {isPublic && <PublicHeader />}
        {!isPublic && !isStaffLoginPage && !isSidebarSection && <AppHeader />}

        {/* Pas de padding sur les pages de login, ni sur les pages a barre laterale (qui gerent leur propre mise en page pleine hauteur) */}
        <main className={isStaffLoginPage || isSidebarSection ? "pt-0" : "pt-[55px]"}>{children}</main>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}