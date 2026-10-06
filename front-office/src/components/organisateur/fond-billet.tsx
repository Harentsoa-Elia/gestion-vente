"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus, Loader2, QrCode, X } from "lucide-react"
import { urlMedia } from "@/lib/media"
import { cn } from "@/utils"

/*
 * Fond d'image des billets : choisi par tarif (organisateur) ou par type d'événement (administrateur).
 * Le PDF garde un voile blanc derrière le texte et un carré blanc derrière le QR code :
 * n'importe quelle image convient, le billet reste lisible et scannable.
 */

const TYPES = "image/jpeg,image/png,image/webp"

/** Vignette + boutons « Ajouter / Changer » et « Retirer ». */
export function ChoixFond({
  url,
  libelle,
  onChanger,
  compact,
}: {
  url: string | null | undefined
  /** pour l'accessibilité : « fond des billets VIP » */
  libelle: string
  onChanger: (fichier: File | null) => Promise<void>
  compact?: boolean
}) {
  const champ = useRef<HTMLInputElement>(null)
  const [envoi, setEnvoi] = useState(false)
  const image = urlMedia(url)

  const changer = async (fichier: File | null) => {
    setEnvoi(true)
    try {
      await onChanger(fichier)
      toast.success(fichier ? "Fond enregistré : il s'applique aux prochains billets imprimés ou téléchargés." : "Fond retiré.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le fond n'a pas été enregistré.")
    } finally {
      setEnvoi(false)
      if (champ.current) champ.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={envoi}
        title={image ? "Changer le fond" : "Ajouter un fond"}
        aria-label={image ? `Changer le ${libelle}` : `Ajouter un ${libelle}`}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gw-bordure bg-gw-fond text-gw-violet transition-colors hover:border-gw-violet dark:border-gw-bordure-sombre dark:bg-white/5 dark:text-gw-lavande",
          compact ? "h-8 w-12" : "h-10 w-16",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-4 w-4" aria-hidden />
        )}
        {envoi && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          </span>
        )}
      </button>
      {image && !envoi && (
        <button
          type="button"
          onClick={() => changer(null)}
          aria-label={`Retirer le ${libelle}`}
          title="Retirer le fond"
          className="rounded-full p-1 text-gw-texte-doux hover:bg-gw-fond hover:text-red-600 dark:text-white/55 dark:hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <input
        ref={champ}
        type="file"
        accept={TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) changer(f)
        }}
      />
    </div>
  )
}

/** Aperçu d'un billet imprimé (format planche), avec ou sans fond : même disposition que le PDF. */
export function ApercuBillet({
  fond,
  evenement,
  date,
  tarif,
  prix,
  porteur,
  className,
}: {
  fond: string | null | undefined
  evenement: string
  date: string
  tarif: string
  prix: string
  porteur: string
  className?: string
}) {
  const image = urlMedia(fond)
  return (
    <div
      className={cn("relative aspect-[63/44] w-full overflow-hidden rounded-md border border-dashed border-gw-lavande bg-white text-gw-nuit shadow-sm", className)}
      style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-[3.5%]">
        <span className="block h-[65%] bg-gw-violet" />
        <span className="block h-[35%] bg-gw-rose-action" />
      </span>
      <div
        className={cn(
          "absolute top-[5%] bottom-[5%] left-[5%] right-[46%] flex flex-col rounded-[3px] px-[3%] py-[2.5%]",
          image && "bg-white/85",
        )}
      >
        <span className="text-[9px] font-bold text-gw-rose-action">guichetweb</span>
        <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight font-bold">{evenement}</span>
        <span className="mt-1 truncate text-[8px] text-gw-texte-doux">{date}</span>
        <span className="mt-auto truncate text-[10px] font-bold">{tarif}</span>
        <span className="truncate text-[10px] font-bold text-gw-violet">{prix}</span>
        <span className="truncate text-[8px] text-gw-texte-doux">{porteur}</span>
      </div>
      <div className="absolute top-[8%] right-[3.5%] flex w-[40%] flex-col items-center rounded-[3px] bg-white p-[2%]">
        <QrCode className="aspect-square h-auto w-full text-gw-nuit" strokeWidth={1.2} aria-hidden />
        <span className="mt-0.5 font-mono text-[7px] font-bold">BHL-…</span>
      </div>
    </div>
  )
}
