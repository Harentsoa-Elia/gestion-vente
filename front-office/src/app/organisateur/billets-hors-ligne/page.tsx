"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { BilletsHorsLigne } from "@/components/organisateur/billets-hors-ligne"

export default function BilletsHorsLignePage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <BilletsHorsLigne />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
