"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurEvenements } from "@/components/organisateur-evenements"

export default function OrganisateurEvenementsPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurEvenements />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
