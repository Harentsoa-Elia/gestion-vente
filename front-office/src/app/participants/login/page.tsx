"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginParticipant, saveParticipantToken } from "@/services/participantService"
import { toast } from "sonner"
import Link from "next/link"

function ParticipantLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await loginParticipant({ email, mot_de_passe: motDePasse })
      saveParticipantToken(result.access_token)
      toast.success("Connexion reussie.")
      router.push(redirectTo)
    } catch (err: any) {
      toast.error(err.message || "Email ou mot de passe incorrect.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Connexion</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90">
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
          <p className="text-sm text-center text-gray-500">
            Pas encore de compte ?{" "}
            <Link href="/participants/signup" className="text-[#3B82F6] font-medium">
              S'inscrire
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ParticipantLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <ParticipantLoginForm />
      </Suspense>
    </div>
  )
}