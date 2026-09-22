"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { signupParticipant, saveParticipantToken } from "@/services/participantService"
import { toast } from "sonner"
import type { Genre } from "@/types"

export default function ParticipantSignupPage() {
  const router = useRouter()
  const [nom, setNom] = useState("")
  const [prenom, setPrenom] = useState("")
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [genre, setGenre] = useState<Genre | "">("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dateNaissance || !genre) {
      toast.error("La date de naissance et le genre sont obligatoires.")
      return
    }

    setLoading(true)
    try {
      const result = await signupParticipant({
        nom,
        prenom,
        email,
        mot_de_passe: motDePasse,
        date_naissance: dateNaissance,
        genre,
      })
      saveParticipantToken(result.access_token)
      toast.success("Inscription reussie. Bienvenue !")
      router.push("/")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Creer un compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prenom</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date_naissance">Date de naissance</Label>
                <Input
                  id="date_naissance"
                  type="date"
                  value={dateNaissance}
                  onChange={(e) => setDateNaissance(e.target.value)}
                  required
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="genre">Genre</Label>
                <Select value={genre} onValueChange={(v) => setGenre(v as Genre)} required>
                  <SelectTrigger id="genre" className="w-full">
                    <SelectValue placeholder="Selectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculin">Masculin</SelectItem>
                    <SelectItem value="Feminin">Feminin</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}