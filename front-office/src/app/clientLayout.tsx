"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AppHeader } from "@/components/app-header"
import { usePathname } from "next/navigation"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

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

        {!isLoginPage && <AppHeader />}

        {/* Fix: no padding on login page */}
        <main className={isLoginPage ? "pt-0" : "pt-[55px]"}>{children}</main>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
