"use client"

import { Suspense } from "react"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { AdminUtilisateurs } from "@/components/admin/admin-utilisateurs"

export default function AdminUtilisateursPage() {
  return (
    <OrganisateurSidebarLayout espace="admin">
      <Suspense>
        <AdminUtilisateurs />
      </Suspense>
    </OrganisateurSidebarLayout>
  )
}
