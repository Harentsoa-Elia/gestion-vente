"use client"

import { Suspense } from "react"
import { MotDePasseOublie } from "@/components/auth/mot-de-passe-oublie"

export default function MotDePasseOublieEquipePage() {
  return (
    <Suspense fallback={null}>
      <MotDePasseOublie espace="equipe" />
    </Suspense>
  )
}
