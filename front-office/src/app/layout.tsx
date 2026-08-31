import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./clientLayout"
import "./globals.css" // Import globals.css at the top of the file

export const metadata: Metadata = {
  title: "Concert Ticket Manager",
  description: "Manage concert configurations, generate tickets, and scan QR codes.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientLayout>{children}</ClientLayout>
}
