"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { Statistiques } from "@/components/organisateur/statistiques"

export default function StatistiquesPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <Statistiques />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
