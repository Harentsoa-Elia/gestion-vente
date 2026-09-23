"use client"

import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { OrganisateurReservations } from "@/components/organisateur-reservations"

export default function OrganisateurReservationsPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <OrganisateurReservations />
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}