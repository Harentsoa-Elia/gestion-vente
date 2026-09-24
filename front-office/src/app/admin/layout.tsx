"use client"

import AuthWrapper from "@/components/auth-wrapper"

/**
 * Toutes les pages /admin exigent un compte staff connecté. AuthWrapper renvoie
 * l'organisateur vers son espace (voir src/lib/role.ts) : seul l'administrateur
 * reste ici. Le backend contrôle aussi les droits (exiger_admin).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthWrapper>{children}</AuthWrapper>
}
