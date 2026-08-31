"use client"

import type React from "react"
import { AppHeader } from "@/components/app-header"

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Global print styles to hide header and remove main padding */}
      <style jsx global>{`
        @media print {
          header {
            /* Targets the AppHeader component */
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
            overflow: hidden !important; /* Prevent scrollbars on print */
          }
        }
      `}</style>
      <AppHeader />
      <main className="">{children}</main>
    </>
  )
}
