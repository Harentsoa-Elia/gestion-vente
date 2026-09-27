"use client"

import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { AdminEvenements } from "@/components/admin/admin-evenements"

// la protection (compte administrateur) est assurée par app/admin/layout.tsx
export default function AdminEvenementsPage() {
  return (
    <OrganisateurSidebarLayout espace="admin">
      <AdminEvenements />
    </OrganisateurSidebarLayout>
  )
}
