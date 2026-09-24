"use client"

import { useParams } from "next/navigation"
import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurEvenementDetail } from "@/components/organisateur-evenement-detail"

export default function OrganisateurEvenementDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurEvenementDetail key={id} evenementId={Number(id)} />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
