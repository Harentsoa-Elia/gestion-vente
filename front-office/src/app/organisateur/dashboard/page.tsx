"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurDashboard } from "@/components/organisateur-dashboard"

export default function OrganisateurDashboardPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-[#F8FAFC]">
        <OrganisateurDashboard />
      </div>
    </AuthWrapper>
  )
}