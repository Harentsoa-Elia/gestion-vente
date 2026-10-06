"use client"

import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { AdminFacturation } from "@/components/admin/admin-facturation"

export default function AdminFacturationPage() {
  return (
    <OrganisateurSidebarLayout espace="admin">
      <AdminFacturation />
    </OrganisateurSidebarLayout>
  )
}
