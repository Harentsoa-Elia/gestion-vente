"use client"

import { Suspense } from "react"
import { MotDePasseOublie } from "@/components/auth/mot-de-passe-oublie"

export default function MotDePasseOubliePage() {
  return (
    <Suspense fallback={null}>
      <MotDePasseOublie espace="participant" />
    </Suspense>
  )
}
