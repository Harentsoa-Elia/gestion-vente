"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurRecommandations } from "@/components/organisateur-recommandations"

export default function OrganisateurRecommandationsPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurRecommandations />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
