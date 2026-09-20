"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createInteraction } from "@/services"
import type { InteractionType, PropositionAvecScore } from "@/types"
import { toast } from "sonner"
import { MessageCircle } from "lucide-react"

interface PropositionCardProps {
  proposition: PropositionAvecScore
  onInteractionCreated?: () => void
}

const REACTIONS: { type: InteractionType; emoji: string; label: string }[] = [
  { type: "LIKE", emoji: "👍", label: "J'aime" },
  { type: "JADORE", emoji: "😍", label: "J'adore" },
  { type: "WAOUH", emoji: "😮", label: "Waouh" },
  { type: "FAVORI", emoji: "⭐", label: "Favori" },
]

export default function PropositionCard({ proposition, onInteractionCreated }: PropositionCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState("")
  const [showCommentInput, setShowCommentInput] = useState(false)

  const envoyerInteraction = async (type: InteractionType, contenu: string | null = null) => {
    setLoading(type)
    try {
      await createInteraction({
        type_interaction: type,
        contenu,
        proposition_id: proposition.id,
      })
      toast.success("Interaction enregistree.")
      setCommentaire("")
      setShowCommentInput(false)
      onInteractionCreated?.()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{proposition.libelle}</span>
          <span className="text-sm font-normal text-gray-500">Score : {proposition.score}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map(({ type, emoji, label }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => envoyerInteraction(type)}
              className="flex items-center gap-1"
            >
              <span>{emoji}</span>
              {loading === type ? "..." : label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null}
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            Commenter
          </Button>
        </div>

        {showCommentInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Votre commentaire..."
              className="flex-1 h-9 px-3 border rounded-md text-sm"
            />
            <Button
              size="sm"
              disabled={loading !== null || !commentaire.trim()}
              onClick={() => envoyerInteraction("COMMENTAIRE", commentaire)}
            >
              Envoyer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}