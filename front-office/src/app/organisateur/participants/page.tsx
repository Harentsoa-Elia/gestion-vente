"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurParticipants } from "@/components/organisateur-participants"

export default function OrganisateurParticipantsPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurParticipants />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}