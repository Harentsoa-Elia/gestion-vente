"use client"

import { Suspense } from "react"
import AuthWrapper from "@/components/auth-wrapper"
import { OrganisateurSidebarLayout } from "@/components/organisateur-sidebar-layout"
import { Impression } from "@/components/organisateur/impression"

export default function ImpressionPage() {
  return (
    <AuthWrapper>
      <OrganisateurSidebarLayout>
        <Suspense>
          <Impression />
        </Suspense>
      </OrganisateurSidebarLayout>
    </AuthWrapper>
  )
}
