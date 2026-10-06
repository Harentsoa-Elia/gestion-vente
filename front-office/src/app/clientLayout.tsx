"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { variablesPolices } from "@/components/accueil/fonts"
import { usePathname } from "next/navigation"
import { isPublicRoute } from "@/utils"
import { installerRafraichissement } from "@/lib/jetons"

// rafraîchissement automatique des jetons : installé avant le premier appel à l'API
if (typeof window !== "undefined") installerRafraichissement()

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const isPublic = isPublicRoute(pathname)

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

        {/* Les espaces organisateur et admin (/organisateur, /admin) ont leur barre latérale,
            la page /login n'a pas d'en-tête : seules les pages publiques ont l'en-tête et le pied de page. */}
        {isPublic && <PublicHeader />}

        <main>{children}</main>
        {isPublic && <PublicFooter />}

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}