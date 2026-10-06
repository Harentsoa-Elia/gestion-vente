"use client"

import { useState } from "react"
import { urlMedia } from "@/lib/media"
import { cn } from "@/utils"

/** Photo de profil du participant, ou ses initiales sur le dégradé guichetweb s'il n'en a pas. */
export function AvatarParticipant({
  prenom,
  nom,
  avatar,
  className,
}: {
  prenom: string
  nom: string
  avatar?: string | null
  /** taille et arrondi : ex. « h-8 w-8 text-xs » */
  className?: string
}) {
  const [erreur, setErreur] = useState(false)
  const image = !erreur ? urlMedia(avatar) : null
  const initiales = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?"
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] font-bold text-white",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" onError={() => setErreur(true)} />
      ) : (
        initiales
      )}
    </span>
  )
}
