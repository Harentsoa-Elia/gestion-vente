"use client"

import { useState, useRef, useEffect } from "react"
import type { ElementType } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createInteraction } from "@/services"
import type { InteractionType, PropositionAvecScore } from "@/types"
import { toast } from "sonner"
import { ThumbsUp, Heart, Star, MessageCircle } from "lucide-react"
import { WaouhFace } from "@/components/ui/WaouhFace"

interface PropositionCardProps {
  proposition: PropositionAvecScore
  onInteractionCreated?: () => void
}

const REACTIONS: {
  type: InteractionType
  icon: ElementType
  label: string
  bgColor: string
  labelColor: string
}[] = [
  { type: "LIKE", icon: ThumbsUp, label: "J'aime", bgColor: "#3B82F6", labelColor: "#3B82F6" },
  { type: "JADORE", icon: Heart, label: "J'adore", bgColor: "#EF4444", labelColor: "#EF4444" },
  { type: "WAOUH", icon: WaouhFace, label: "Waouh", bgColor: "transparent", labelColor: "#D97706" },
  { type: "FAVORI", icon: Star, label: "Favori", bgColor: "#EAB308", labelColor: "#EAB308" },
]

export default function PropositionCard({ proposition, onInteractionCreated }: PropositionCardProps) {
  const [loading, setLoading] = useState<InteractionType | null>(null)
  const [activeReaction, setActiveReaction] = useState<InteractionType | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [justBounced, setJustBounced] = useState(false)
  const [commentaire, setCommentaire] = useState("")
  const [showCommentInput, setShowCommentInput] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!justBounced) return
    const t = setTimeout(() => setJustBounced(false), 350)
    return () => clearTimeout(t)
  }, [justBounced])

  const envoyerInteraction = async (type: InteractionType, contenu: string | null = null) => {
    setLoading(type)
    try {
      await createInteraction({
        type_interaction: type,
        contenu,
        proposition_id: proposition.id,
      })
      toast.success("Interaction enregistree.")
      if (type !== "COMMENTAIRE") {
        setActiveReaction(type)
        setJustBounced(true)
      }
      setCommentaire("")
      setShowCommentInput(false)
      setPickerOpen(false)
      onInteractionCreated?.()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setLoading(null)
    }
  }

  const openPicker = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setPickerOpen(true)
  }

  const scheduleClosePicker = () => {
    closeTimer.current = setTimeout(() => setPickerOpen(false), 200)
  }

  const current = REACTIONS.find((r) => r.type === activeReaction)
  const MainIcon = current?.icon ?? ThumbsUp

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{proposition.libelle}</span>
          <span className="text-sm font-normal text-gray-500">Score : {proposition.score}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="relative"
            onMouseEnter={openPicker}
            onMouseLeave={scheduleClosePicker}
          >
            {pickerOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white border rounded-full shadow-lg px-2 py-1.5 z-10"
                onMouseEnter={openPicker}
                onMouseLeave={scheduleClosePicker}
              >
                {REACTIONS.map(({ type, icon: Icon, label, bgColor }, index) => (
                  <button
                    key={type}
                    type="button"
                    title={label}
                    disabled={loading !== null}
                    onClick={() => envoyerInteraction(type)}
                    className="animate-reaction-pop w-9 h-9 flex items-center justify-center rounded-full transition-transform hover:scale-125 hover:-translate-y-1 disabled:opacity-50"
                    style={{
                      backgroundColor: bgColor === "transparent" ? "transparent" : bgColor,
                      animationDelay: `${index * 40}ms`,
                    }}
                  >
                    {type === "WAOUH" ? (
                      <Icon size={28} />
                    ) : (
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => envoyerInteraction(activeReaction ?? "LIKE")}
              className="flex items-center gap-1.5"
              style={current ? { color: current.labelColor, borderColor: current.labelColor } : undefined}
            >
              <MainIcon
                className={`w-4 h-4 ${justBounced ? "animate-reaction-bounce" : ""}`}
                style={current && current.type !== "WAOUH" ? { color: current.labelColor } : undefined}
              />
              {loading && loading === (activeReaction ?? "LIKE") ? "..." : current?.label ?? "Reagir"}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null}
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1.5"
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