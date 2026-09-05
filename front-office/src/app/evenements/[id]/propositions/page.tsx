"use client"

import { useParams } from "next/navigation"
import AuthWrapper from "@/components/auth-wrapper"
import PropositionsList from "@/components/propositions-list"

function PropositionsContent() {
  const params = useParams()
  const evenementId = Number(params.id)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Propositions et interactions - Evenement #{evenementId}
        </h1>
        <PropositionsList evenementId={evenementId} />
      </div>
    </div>
  )
}

export default function PropositionsPage() {
  return (
    <AuthWrapper>
      <PropositionsContent />qs
    </AuthWrapper>
  )
}