"use client"

import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { AdminReferentiel } from "@/components/admin/admin-referentiel"

export default function AdminReferentielPage() {
  return (
    <OrganisateurSidebarLayout espace="admin">
      <AdminReferentiel />
    </OrganisateurSidebarLayout>
  )
}
