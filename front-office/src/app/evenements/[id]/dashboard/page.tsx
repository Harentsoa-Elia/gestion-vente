"use client"

import { useParams } from "next/navigation"
import AuthWrapper from "@/components/auth-wrapper"
import EvenementDashboard from "@/components/evenement-dashboard"

function DashboardContent() {
  const params = useParams()
  const evenementId = Number(params.id)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Dashboard - Evenement #{evenementId}
        </h1>
        <EvenementDashboard evenementId={evenementId} />
      </div>
    </div>
  )
}

export default function EvenementDashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  )
}