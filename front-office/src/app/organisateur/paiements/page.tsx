"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurPaiements } from "@/components/organisateur-paiements"

export default function OrganisateurPaiementsPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurPaiements />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}