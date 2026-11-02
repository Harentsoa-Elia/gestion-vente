"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus, Loader2, QrCode, X } from "lucide-react"
import { urlMedia } from "@/lib/media"
import { cn } from "@/utils"

/*
 * Fond d'image des billets : choisi par tarif (organisateur) ou par type d'événement (administrateur).
 * Le PDF garde un voile blanc léger (55 %) derrière le texte et un carré blanc derrière le QR code :
 * n'importe quelle image convient, le billet reste lisible et scannable.
 */

const TYPES = "image/jpeg,image/png,image/webp"

/** Vignette + boutons "Ajouter / Changer" et "Retirer". */
export function ChoixFond({
  url,
  libelle,
  onChanger,
  compact,
}: {
  url: string | null | undefined
  /** pour l'accessibilité : "fond des billets VIP" */
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
          <span className="absolute inset-0 flex items-center justify-center bg-gw-surface/70 dark:bg-black/50">
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
          className="rounded-full p-1 text-gw-texte-doux hover:bg-gw-fond hover:text-gw-rose-action dark:text-white/55 dark:hover:bg-white/10"
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

/** Aperçu d'un billet imprimé (style "billet de concert"), avec ou sans fond : même disposition que le PDF. */
export function ApercuBillet({
  fond,
  evenement,
  dateIso,
  lieu,
  tarif,
  prix,
  porteur,
  className,
}: {
  fond: string | null | undefined
  evenement: string
  dateIso: string
  lieu?: string | null
  tarif: string
  prix: string
  porteur: string
  className?: string
}) {
  const image = urlMedia(fond)
  const d = new Date(dateIso)
  const mois = d.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3).toUpperCase()
  const heure = `${d.getFullYear()} - ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`
  return (
    <div
      className={cn("@container relative aspect-[63/44] w-full overflow-hidden rounded-md bg-[#2A1A5E] text-white shadow-sm", className)}
      style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {/* voile nuit sur l'image, ou halo violet sans image */}
      {image ? (
        <span aria-hidden className="absolute inset-0 bg-[#2A1A5E]/55" />
      ) : (
        <span aria-hidden className="absolute -top-[36%] left-[41%] aspect-square w-[48%] rounded-full bg-gw-violet/35" />
      )}
      <span aria-hidden className="absolute inset-x-0 top-0 flex h-[2.7%]">
        <span className="w-[65%] bg-gw-violet" />
        <span className="w-[35%] bg-gw-rose-action" />
      </span>

      <div className="absolute top-[9.5%] bottom-[9.5%] left-[6.3%] right-[44%] flex flex-col">
        <div className="flex items-start gap-[3cqw]">
          <span className="flex aspect-[9/10] w-[14.3cqw] shrink-0 flex-col items-center justify-center rounded-[1.6cqw] bg-gw-rose-action">
            <span className="text-[6.6cqw] leading-none font-bold">{d.getDate()}</span>
            <span className="mt-[0.6cqw] text-[2.9cqw] leading-none font-bold">{mois}</span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[3.3cqw] font-bold">
              guichet<span className="text-[#D9D2FF]">web</span>
            </span>
            <span className="block truncate text-[3.1cqw] text-[#D9D2FF]">{heure}</span>
            {lieu && <span className="block truncate text-[3.1cqw] text-[#D9D2FF]">{lieu}</span>}
          </span>
        </div>
        <span className="mt-[3cqw] line-clamp-2 text-[4.6cqw] leading-tight font-bold">{evenement}</span>
        <span className="mt-auto truncate text-[2.8cqw] font-bold tracking-[0.12em] text-[#D9D2FF] uppercase">{tarif}</span>
        <span className="truncate text-[5.6cqw] leading-tight font-bold">{prix}</span>
        <span className="truncate text-[2.9cqw] text-[#D9D2FF]">{porteur}</span>
      </div>

      {/* panneau QR code, blanc opaque */}
      <div className="absolute top-[9.5%] bottom-[9.5%] right-[4.8%] flex w-[32.5%] flex-col items-center rounded-[2cqw] bg-white px-[2cqw] pt-[2.6cqw] text-[#2A1A5E]">
        <QrCode className="aspect-square h-auto w-[86%]" strokeWidth={1.2} aria-hidden />
        <span className="mt-[0.8cqw] text-[2.9cqw] font-bold">BHL-...</span>
        <span className="mt-auto pb-[2cqw] text-[2.5cqw] text-gw-texte-doux">Une seule entrée</span>
      </div>
    </div>
  )
}
