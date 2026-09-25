"use client"

import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import { ImagePlus, Loader2, RefreshCw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/utils"
import { TYPES_IMAGE_ACCEPTES, urlMedia, verifierFichierImage } from "@/lib/media"

/*
 * Espaces image de l'organisateur :
 * - ZoneImage : grande zone (affiche d'un événement) ; glisser-déposer ou clic pour choisir,
 *   aperçu, boutons Remplacer / Retirer ;
 * - VignetteImage : petite vignette cliquable (visuel d'une proposition dans une liste).
 * L'envoi et le retrait sont délégués au parent (appels API) ; ces composants gèrent le choix
 * du fichier, sa vérification et l'état « en cours ».
 */

interface PropsCommunes {
  /** Image actuelle (/media/... renvoyé par l'API), null si aucune */
  image: string | null | undefined
  onEnvoyer: (fichier: File) => Promise<void>
  onRetirer: () => Promise<void>
}

function useEnvoiImage({ onEnvoyer, onRetirer }: Omit<PropsCommunes, "image">) {
  const [occupe, setOccupe] = useState<"envoi" | "retrait" | null>(null)
  const champ = useRef<HTMLInputElement>(null)

  const envoyer = async (fichier: File | undefined) => {
    if (!fichier) return
    const erreur = verifierFichierImage(fichier)
    if (erreur) {
      toast.error(erreur)
      return
    }
    setOccupe("envoi")
    try {
      await onEnvoyer(fichier)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'image n'a pas été enregistrée.")
    } finally {
      setOccupe(null)
      if (champ.current) champ.current.value = ""
    }
  }

  const retirer = async () => {
    setOccupe("retrait")
    try {
      await onRetirer()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'image n'a pas été retirée.")
    } finally {
      setOccupe(null)
    }
  }

  return { occupe, champ, envoyer, retirer, choisir: () => champ.current?.click() }
}

/** Grande zone d'image, ex. affiche de l'événement. */
export function ZoneImage({
  image,
  onEnvoyer,
  onRetirer,
  titre,
  aide,
  className,
}: PropsCommunes & { titre: string; aide?: string; className?: string }) {
  const { occupe, champ, envoyer, retirer, choisir } = useEnvoiImage({ onEnvoyer, onRetirer })
  const [survol, setSurvol] = useState(false)
  const idChamp = useId()
  const url = urlMedia(image)

  // aperçu immédiat du fichier choisi pendant l'envoi
  const [apercu, setApercu] = useState<string | null>(null)
  useEffect(() => () => void (apercu && URL.revokeObjectURL(apercu)), [apercu])

  const envoyerAvecApercu = async (fichier: File | undefined) => {
    if (fichier && !verifierFichierImage(fichier)) setApercu(URL.createObjectURL(fichier))
    await envoyer(fichier)
    setApercu(null)
  }

  const deposer = (e: DragEvent) => {
    e.preventDefault()
    setSurvol(false)
    if (!occupe) envoyerAvecApercu(e.dataTransfer.files?.[0])
  }

  const affichee = apercu ?? url

  return (
    <div className={className}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-titre text-base font-semibold">{titre}</h3>
          {aide && <p className="text-xs text-gw-texte-doux dark:text-white/60">{aide}</p>}
        </div>
        {url && !occupe && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={choisir}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gw-violet hover:bg-gw-fond dark:text-gw-lavande dark:hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Remplacer
            </button>
            <button
              type="button"
              onClick={retirer}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gw-texte-doux hover:bg-gw-fond hover:text-red-600 dark:text-white/60 dark:hover:bg-white/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Retirer
            </button>
          </div>
        )}
      </div>

      <input
        ref={champ}
        id={idChamp}
        type="file"
        accept={TYPES_IMAGE_ACCEPTES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => envoyerAvecApercu(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={choisir}
        disabled={!!occupe}
        onDragOver={(e) => {
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        aria-label={url ? `${titre} : remplacer l'image` : `${titre} : ajouter une image`}
        className={cn(
          "group relative block aspect-[2/1] w-full overflow-hidden rounded-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
          affichee
            ? "bg-gw-nuit"
            : "border-2 border-dashed border-gw-lavande bg-gw-fond hover:border-gw-violet dark:border-white/20 dark:bg-white/5",
          survol && "border-gw-violet bg-gw-lavande/40 ring-4 ring-gw-violet/20",
        )}
      >
        {affichee ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={affichee} alt="" className={cn("h-full w-full object-cover", occupe && "opacity-60")} />
            {!occupe && (
              <span className="absolute inset-0 flex items-center justify-center bg-gw-nuit/0 text-sm font-semibold text-white opacity-0 transition group-hover:bg-gw-nuit/45 group-hover:opacity-100">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Changer l&apos;image
              </span>
            )}
          </>
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white">
              <ImagePlus className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-gw-nuit dark:text-white">Glissez une image ici ou cliquez pour la choisir</span>
            <span className="text-xs text-gw-texte-doux dark:text-white/55">JPEG, PNG ou WebP · 8 Mo maximum · format paysage conseillé</span>
          </span>
        )}
        {occupe && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-gw-nuit/40 text-sm font-semibold text-white">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {occupe === "envoi" ? "Envoi de l'image…" : "Retrait…"}
          </span>
        )}
      </button>
    </div>
  )
}

/** Petite vignette cliquable, ex. visuel d'une proposition. */
export function VignetteImage({ image, onEnvoyer, onRetirer, libelle }: PropsCommunes & { libelle: string }) {
  const { occupe, champ, envoyer, retirer, choisir } = useEnvoiImage({ onEnvoyer, onRetirer })
  const url = urlMedia(image)

  return (
    <span className="group/vignette relative shrink-0">
      <input
        ref={champ}
        type="file"
        accept={TYPES_IMAGE_ACCEPTES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => envoyer(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={choisir}
        disabled={!!occupe}
        title={url ? "Changer l'image" : "Ajouter une image"}
        aria-label={url ? `Changer l'image de ${libelle}` : `Ajouter une image pour ${libelle}`}
        className={cn(
          "grid h-12 w-12 place-items-center overflow-hidden rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
          url
            ? "bg-gw-nuit"
            : "border-2 border-dashed border-gw-lavande bg-white text-gw-violet hover:border-gw-violet dark:border-white/20 dark:bg-white/5 dark:text-gw-lavande",
        )}
      >
        {occupe ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", url && "text-white")} aria-hidden />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5" aria-hidden />
        )}
      </button>
      {url && !occupe && (
        <button
          type="button"
          onClick={retirer}
          aria-label={`Retirer l'image de ${libelle}`}
          title="Retirer l'image"
          className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-gw-texte-doux opacity-0 shadow ring-1 ring-gw-bordure transition group-hover/vignette:opacity-100 hover:text-red-600 focus-visible:opacity-100 dark:bg-gw-carte-sombre dark:ring-white/15"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </span>
  )
}
