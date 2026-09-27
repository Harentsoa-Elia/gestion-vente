"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { ControleEntrees } from "@/components/organisateur/controle-entrees"

export default function ControleEntreesPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <ControleEntrees />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
