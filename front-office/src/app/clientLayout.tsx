"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AppHeader } from "@/components/app-header"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { variablesPolices } from "@/components/accueil/fonts"
import { usePathname } from "next/navigation"
import { isPublicRoute } from "@/utils"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  // /login et ses sous-pages (ex. /login/mot-de-passe-oublie) : pas d'en-tête, accessibles sans compte
  const isStaffLoginPage = pathname === "/login" || pathname.startsWith("/login/")
  const isPublic = isPublicRoute(pathname)
  // Les pages /organisateur/* fournissent leur propre navigation complete
  // (barre laterale), donc on n'affiche jamais le AppHeader du haut dessus.
  const isSidebarSection = pathname.startsWith("/organisateur")

  return (
    <html lang="fr">
      {/* suppressHydrationWarning : certaines extensions de navigateur (ex. TinaMind) ajoutent
          des attributs à <body> avant le chargement de React. Sans cette option, Next.js
          signale une erreur d'hydratation qui ne vient pas du code. Ne s'applique qu'à <body>. */}
      <body className={`${inter.className} ${variablesPolices}`} suppressHydrationWarning>
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

        {/* Pas de padding sur les pages de login, ni sur les pages a barre laterale (qui gerent leur propre mise en page pleine hauteur).
            Pas de padding non plus sur les pages publiques : PublicHeader est "sticky", il occupe deja sa place dans le flux. */}
        <main className={isStaffLoginPage || isSidebarSection || isPublic ? "pt-0" : "pt-[55px]"}>{children}</main>
        {isPublic && <PublicFooter />}

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}