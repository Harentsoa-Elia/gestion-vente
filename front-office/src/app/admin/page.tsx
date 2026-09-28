"use client"

import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { VueEnsemble } from "@/components/admin/vue-ensemble"

// la protection (compte administrateur) est assurée par app/admin/layout.tsx
export default function AdminAccueilPage() {
  return (
    <OrganisateurSidebarLayout espace="admin">
      <VueEnsemble />
    </OrganisateurSidebarLayout>
  )
}
